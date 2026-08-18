const assert = require("node:assert/strict");
const { _test } = require("./atividades");

assert.equal(
  _test.filtroAtividadesRelacionadas({
    colaborador: "Hellen",
    obra_id: "obra-1",
    obra: "Nome antigo",
    projeto: "Elétrico & SPDA",
    etapa: "Projeto executivo"
  }),
  "?colaborador=eq.Hellen&obra_id=eq.obra-1&projeto=eq.El%C3%A9trico%20%26%20SPDA&etapa=eq.Projeto%20executivo"
);

assert.equal(_test.filtroAtividadesRelacionadas({ colaborador: "Hellen" }), "");

assert.deepEqual(
  _test.activityUpdateOptions({ id: "atividade-1", status: "Finalizado" }),
  {
    method: "PATCH",
    body: JSON.stringify({ id: "atividade-1", status: "Finalizado" })
  }
);

assert.deepEqual(
  _test.toDatabaseRecord({ id: "atividade-1", fase: "Distribuição", item: "Eletrocalha" }),
  { id: "atividade-1", fase: "Distribuição", item: "Eletrocalha" }
);
assert.equal(_test.fromDatabaseRecord({ fase: "Estudos", item: "NBR-5410" }).fase, "Estudos");
assert.equal(_test.fromDatabaseRecord({ fase: "Estudos", item: "NBR-5410" }).item, "NBR-5410");
assert.equal(_test.fromDatabaseRecord({}).fase, "");
assert.equal(_test.fromDatabaseRecord({}).item, "");

const base = {
  id: "00000000-0000-0000-0000-000000000001",
  colaborador: "Bruno",
  obra_id: "10000000-0000-0000-0000-000000000001",
  obra: "FIOCRUZ",
  projeto: "Elétrico Baixa Tensão",
  etapa: "QI Builder",
  fase: "Distribuição",
  item: "Eletrocalha",
  status: "Finalizado"
};

assert.equal(_test.possuiValor("   "), false);
assert.equal(_test.classificarAtividadeParaFinalizacao(base), "estruturada");
assert.equal(_test.classificarAtividadeParaFinalizacao({ fase: null, item: "" }), "legada");
assert.equal(_test.classificarAtividadeParaFinalizacao({ fase: "Distribuição", item: null }), "incompleta");
assert.equal(_test.classificarAtividadeParaFinalizacao({ fase: null, item: "Eletrocalha" }), "incompleta");

assert.equal(_test.atividadeEstruturadaEquivalente(base, { fase: "Distribuicao", item: "Eletrocalha" }), true);
assert.equal(_test.atividadeEstruturadaEquivalente(base, { fase: "Lançamento", item: "Eletrocalha" }), false);
assert.equal(_test.atividadeEstruturadaEquivalente(base, { fase: "Distribuição", item: "Leito" }), false);
assert.equal(_test.atividadeEstruturadaEquivalente(
  { ...base, item: "Eletrocalha · Leito" },
  { fase: "Distribuição", item: "Leito · Eletrocalha" }
), true);
assert.equal(_test.atividadeEstruturadaEquivalente(
  { ...base, item: "Eletrocalha · Leito" },
  { fase: "Distribuição", item: "Eletrocalha" }
), false);

async function executarFinalizacao(record, candidates, links = []) {
  const calls = [];
  const request = async (table, query, options) => {
    calls.push({ table, query, options });
    if (options?.method === "PATCH") return [{ ok: true }];
    if (table === "atividades_colaboradores") return candidates;
    if (query.includes(`atividade_id=eq.${record.id}`)) {
      return links.filter((link) => link.atividade_id === record.id);
    }
    return links.filter((link) => candidates.some((candidate) => candidate.id === link.atividade_id));
  };
  const result = await _test.finalizarAtividadesRelacionadas(record, request);
  return { calls, result };
}

(async () => {
  const same = { id: "00000000-0000-0000-0000-000000000002", fase: "Distribuição", item: "Eletrocalha" };
  let execution = await executarFinalizacao(base, [same]);
  assert.equal(execution.calls.filter((call) => call.options?.method === "PATCH").length, 1);
  assert.match(execution.calls.at(-1).query, new RegExp(same.id));

  execution = await executarFinalizacao(base, [
    { id: "phase", fase: "Lançamento", item: "Eletrocalha" },
    { id: "item", fase: "Distribuição", item: "Leito" },
    { id: "legacy", fase: null, item: null }
  ]);
  assert.equal(execution.calls.some((call) => call.options?.method === "PATCH"), false);

  const legacy = { ...base, id: "legacy-source", fase: " ", item: null };
  execution = await executarFinalizacao(legacy, [
    { id: "legacy-related", fase: null, item: "" },
    { id: "structured-related", fase: "Distribuição", item: "Eletrocalha" }
  ]);
  assert.match(execution.calls.at(-1).query, /legacy-related/);
  assert.doesNotMatch(execution.calls.at(-1).query, /structured-related/);

  const originalWarn = console.warn;
  console.warn = () => {};
  execution = await executarFinalizacao({ ...base, fase: "Distribuição", item: null }, [same]);
  assert.equal(execution.calls.length, 0);
  execution = await executarFinalizacao({ ...base, fase: null, item: "Eletrocalha" }, [same]);
  assert.equal(execution.calls.length, 0);
  console.warn = originalWarn;

  const plannerSource = { ...base, id: "00000000-0000-0000-0000-000000000010", item: "Texto antigo" };
  const plannerSame = { id: "00000000-0000-0000-0000-000000000011", fase: "Outra fase textual", item: "Outro texto" };
  const plannerSubset = { id: "00000000-0000-0000-0000-000000000012", fase: "Distribuição", item: "Eletrocalha" };
  const plannerLinks = [
    { atividade_id: plannerSource.id, item_id: "item-a" },
    { atividade_id: plannerSource.id, item_id: "item-b" },
    { atividade_id: plannerSame.id, item_id: "item-b" },
    { atividade_id: plannerSame.id, item_id: "item-a" },
    { atividade_id: plannerSame.id, item_id: "item-a" },
    { atividade_id: plannerSubset.id, item_id: "item-a" }
  ];
  execution = await executarFinalizacao(plannerSource, [plannerSame, plannerSubset, plannerSame], plannerLinks);
  const patchCalls = execution.calls.filter((call) => call.options?.method === "PATCH");
  assert.equal(patchCalls.length, 1, "a atualização em lote não deve duplicar nem causar recursão");
  assert.match(patchCalls[0].query, new RegExp(plannerSame.id));
  assert.doesNotMatch(patchCalls[0].query, new RegExp(plannerSubset.id));
  assert.equal(execution.calls.filter((call) => call.table === "atividade_planner_itens").length, 2, "os vínculos dos candidatos devem ser carregados em lote");

  execution = await executarFinalizacao(base, []);
  assert.match(execution.calls[0].query, /colaborador=eq.Bruno/);
  assert.match(execution.calls[0].query, /obra_id=eq.10000000-/);
  assert.match(execution.calls[0].query, /projeto=eq.El%C3%A9trico/);
  assert.match(execution.calls[0].query, /etapa=eq.QI%20Builder/);

  console.log("Testes de atualização e cascata de finalização passaram.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
