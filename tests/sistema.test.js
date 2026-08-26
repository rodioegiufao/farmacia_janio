"use strict";

// ========================================================
// IMPORTS E HELPERS DE TESTE
// ========================================================

const assert = require("node:assert/strict");

const ESTADO_GLOBAL = ["fetch", "window", "document", "Date"];

async function executarGrupo(nome, teste) {
  const globais = new Map(ESTADO_GLOBAL.map((chave) => [chave, {
    existe: Object.prototype.hasOwnProperty.call(global, chave),
    valor: global[chave]
  }]));
  const ambiente = { ...process.env };
  const consoleOriginal = { log: console.log, warn: console.warn, error: console.error };

  try {
    await teste();
    console.log(`✓ ${nome}`);
  } catch (erro) {
    console.error(`✗ ${nome}`);
    throw erro;
  } finally {
    for (const [chave, estado] of globais) {
      if (estado.existe) global[chave] = estado.valor;
      else delete global[chave];
    }
    for (const chave of Object.keys(process.env)) {
      if (!(chave in ambiente)) delete process.env[chave];
    }
    Object.assign(process.env, ambiente);
    Object.assign(console, consoleOriginal);
  }
}

// ========================================================
// TESTES — ATIVIDADES API
// Origem: api/atividades.test.js
// ========================================================

async function testarAtividadesApi() {
const { _test } = require("../api/atividades");

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
assert.deepEqual(_test.validarClassificacoes({ projeto: "Site", classificacoes: [] }), []);
assert.throws(() => _test.validarClassificacoes({ projeto: "CFTV", classificacoes: [] }), /Selecione pelo menos/);
const unicaApi = _test.validarClassificacoes({ projeto: "CFTV", dataInicio: "2026-08-20", horaInicio: "08:00", dataTermino: "2026-08-20", horaTermino: "09:29", classificacoes: [{ fase: "Estudos", item: "ABNT NBR 5410", minutosDedicados: 1 }] });
assert.equal(unicaApi[0].minutosDedicados, 89, "a API deve atribuir toda a duração à classificação única");
assert.throws(() => _test.validarClassificacoes({ projeto: "CFTV", dataInicio: "2026-08-20", horaInicio: "08:00", dataTermino: "2026-08-20", horaTermino: "10:00", classificacoes: [{ fase: "Estudos", item: "A", minutosDedicados: 50 }, { fase: "Estudos", item: "B", minutosDedicados: 50 }] }), /rateio \(100 min\)/);

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

await (async () => {
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

})();
}

// ========================================================
// TESTES — AGRUPAMENTO DE ATIVIDADES
// Origem: atividades/atividade-agrupamento.test.js
// ========================================================

async function testarAgrupamentoAtividades() {
const {
  normalizarCampoAgrupamento,
  consolidarAtividades,
  consolidarAtividadesPorColaborador
} = require("../atividades/atividade-agrupamento");

function registro(sobrescritas = {}) {
  return {
    id: Math.random().toString(36),
    obraId: "obra-1",
    obraCodigo: "OBR-000001",
    obra: "IPER",
    projeto: "Elétrico",
    etapa: "Lançamento",
    trabalhos: "Pontos de iluminação",
    colaborador: "Rodrigo",
    status: "Finalizado",
    prioridade: "P1",
    dataInicio: "2026-07-01",
    horaInicio: "08:00",
    dataTermino: "2026-07-01",
    horaTermino: "10:00",
    ...sobrescritas
  };
}

assert.equal(normalizarCampoAgrupamento(" LANÇAMENTO "), "lancamento");

const mesmaAtividade = consolidarAtividades([
  registro({ id: "1" }),
  registro({ id: "2", obra: "iper", trabalhos: "Tomadas", horaInicio: "14:00", horaTermino: "17:00" }),
  registro({ id: "3", obra: "Íper", trabalhos: "Climatização", horaInicio: "17:00", horaTermino: "18:00" })
]);
assert.equal(mesmaAtividade.length, 1);
assert.equal(mesmaAtividade[0].horasConsolidadas, 6);
assert.equal(mesmaAtividade[0].quantidadeRegistros, 3);
assert.equal(mesmaAtividade[0].trabalhos.length, 3);

assert.equal(consolidarAtividades([registro(), registro({ etapa: "Distribuição" })]).length, 2);
assert.equal(consolidarAtividades([registro(), registro({ projeto: "CFTV" })]).length, 2);
assert.equal(consolidarAtividades([registro(), registro({ obraId: "obra-2", obra: "HGR" })]).length, 2);
assert.equal(consolidarAtividades([registro({ etapa: "", trabalhos: "Tomadas" }), registro({ etapa: "", trabalhos: "Iluminação" })]).length, 2);

assert.equal(consolidarAtividades([registro(), registro({ status: "Em progresso" })])[0].status, "Em progresso");
assert.equal(consolidarAtividades([registro(), registro({ status: "Atrasado" })])[0].status, "Atrasado");
assert.equal(consolidarAtividades([registro(), registro()])[0].status, "Finalizado");
assert.equal(consolidarAtividades([registro({ prioridade: "P1" }), registro({ prioridade: "P3" }), registro({ prioridade: "P2" })])[0].prioridade, "P3");

const porColaborador = consolidarAtividadesPorColaborador([
  registro({ id: "r1", horaInicio: "08:00", horaTermino: "10:00" }),
  registro({ id: "r2", horaInicio: "10:00", horaTermino: "13:00" }),
  registro({ id: "b1", colaborador: "Bruno", horaInicio: "13:00", horaTermino: "16:00" })
]);
assert.equal(porColaborador.length, 2);
assert.equal(porColaborador.find((item) => item.colaborador === "Rodrigo").horasConsolidadas, 5);
assert.equal(porColaborador.find((item) => item.colaborador === "Bruno").horasConsolidadas, 3);
}

// ========================================================
// TESTES — FASE E ITEM
// Origem: atividades/fase-item.test.js
// ========================================================

async function testarFaseItem() {
const fs = require("node:fs");
const api = require("../atividades/fase-item");

assert.deepEqual(api.obterProjetosComFaseItem(), ["CFTV", "Cabeamento", "Telefonia", "Elétrico Baixa Tensão", "Iluminação Externa", "SPDA", "Subestação", "Alimentador", "Mapa Chave/Situação", "Sonorização", "Solar", "Automação", "Lógica", "SDAI", "Média Tensão"]);
api.obterProjetosComFaseItem().forEach((projeto) => assert.equal(api.projetoExigeFaseItem(projeto), true));
["", "Site", "Todos", "Outros"].forEach((projeto) => assert.equal(api.projetoExigeFaseItem(projeto), false));

assert.deepEqual(api.obterFasesDoProjeto("CFTV"), ["Estudos", "Lançamento", "Distribuição", "Circuitos", "Plotagem", "Compatibilização", "Documentos", "Fiscalização", "Outros"]);
assert.deepEqual(api.obterItensDoProjetoFase("CFTV", "Lançamento"), ["Câmeras Bullet", "Câmeras Dome", "Câmera IP/Wi-fi", "Switch", "Patch Panel", "Conectores", "Rack", "NVR/DVR", "Outros"]);
assert.deepEqual(api.obterItensDoProjetoFase("SPDA", "Distribuição"), ["Caixas de Passagem", "Hastes de aterramento", "Minicaptor", "Captor Franklin", "Re-bar", "Outros"]);
assert.ok(!api.obterFasesDoProjeto("SPDA").includes("Circuitos"));
assert.deepEqual(api.obterFasesDoProjeto("Subestação"), ["Estudos", "Análise de Projeto", "Desenhos", "Distribuição", "Plotagem", "Compatibilização", "Documentos", "Fiscalização", "Outros"]);
assert.deepEqual(api.obterFasesDoProjeto("Mapa Chave/Situação"), ["Análise de Projeto", "Desenhos", "Distribuição", "Plotagem", "Documentos", "Fiscalização", "Outros"]);
api.obterProjetosComFaseItem().forEach((projeto) => {
  assert.ok(api.obterFasesDoProjeto(projeto).includes("Fiscalização"));
  assert.deepEqual(api.obterItensDoProjetoFase(projeto, "Fiscalização"), ["ART", "Relatório", "Quadros", "Cabos", "Outros"]);
});
assert.deepEqual(api.obterItensDoProjetoFase("Subestação", "Documentos"), ["Memorial", "Relatório", "Viabilidade", "Outros"]);
assert.deepEqual(api.obterItensDoProjetoFase("Solar", "Documentos"), ["Memorial", "Relatório", "Viabilidade", "Outros"]);
assert.deepEqual(api.obterItensDoProjetoFase("SDAI", "Lançamento"), ["Central de Alarme de Incêndio", "Detector de Fumaça", "Detector de Temperatura", "Detector de Térmicos", "Acionadores", "Sinalizador", "Fonte Auxiliar", "Outros"]);
assert.deepEqual(api.obterItensDoProjetoFase("Média Tensão", "Circuitos"), ["Dimensionar", "Nomear", "Numerar", "Renumerar", "Diagrama Unifilar Geral", "Outros"]);
assert.equal(api.obterItensDoProjetoFase("Lógica", "Estudos").filter((item) => item === "ABNT NBR 16264").length, 1);

assert.equal(api.valorFinal("Outros", "  Levantamento  "), "Levantamento");
assert.equal(api.valorFinalMultiplos(["Eletrocalha", "Outros"], " Canaleta "), "Eletrocalha · Canaleta");
assert.deepEqual(api.separarItens("Eletrocalha · Leito"), ["Eletrocalha", "Leito"]);
const legado = api.prepararEdicao("Elétrico Baixa Tensão", "Distribuição", "Eletrocalha · Cabo PP");
assert.equal(legado.faseSelecionada, "Distribuição");
assert.deepEqual(legado.itensSelecionados, ["Eletrocalha", "Outros"]);
assert.equal(legado.itemOutro, "Cabo PP");
const faseLegada = api.prepararEdicao("CFTV", "Levantamento", "Conferência existente");
assert.equal(faseLegada.faseSelecionada, "Outros");
assert.equal(faseLegada.faseOutro, "Levantamento");
assert.equal(faseLegada.itemOutro, "Conferência existente");
assert.deepEqual(api.taxonomiaPlannerCompleta("SDAI")[1], { etapa: "Lançamento", estagios: ["Central de Alarme de Incêndio", "Detector de Fumaça", "Detector de Temperatura", "Detector de Térmicos", "Acionadores", "Sinalizador", "Fonte Auxiliar"] });
assert.equal(api.taxonomiaPlannerCompleta("CFTV").some((grupo) => grupo.estagios.includes("Iluminação")), false);
const classificacoes = require("../atividades/classificacoes");
const atividadeMultipla = { dataInicio:"2026-08-20",horaInicio:"08:00",dataTermino:"2026-08-20",horaTermino:"14:00",classificacoes:[
  { fase:"Distribuição",item:"Eletrocalha",minutosDedicados:180 },
  { fase:"Distribuição",item:"Leito",minutosDedicados:60 },
  { fase:"Plotagem",item:"Iluminação",minutosDedicados:120 }
] };
assert.equal(classificacoes.duracaoAtividadeMinutos(atividadeMultipla), 360);
assert.equal(classificacoes.validarRateio(classificacoes.obterClassificacoesAtividade(atividadeMultipla), 360).valido, true);
assert.deepEqual(classificacoes.dividirIgualmente(360, 3), [120,120,120]);
assert.deepEqual(classificacoes.dividirIgualmente(301, 3), [101,100,100]);
assert.notEqual(classificacoes.chaveClassificacao("Lançamento","Iluminação"), classificacoes.chaveClassificacao("Plotagem","Iluminação"));
assert.deepEqual(classificacoes.obterClassificacoesAtividade({ fase:"Distribuição",item:"Eletrocalha",data_inicio:"2026-08-20",hora_inicio:"08:00",data_termino:"2026-08-20",hora_termino:"12:00" })[0].minutosDedicados,240);
const itemPersonalizado = "ABNT NBR ISO/CIE 8995-1";
const personalizadoFrontend = classificacoes.normalizarClassificacao({
  fase: "Estudos", item: itemPersonalizado, itemOutro: true, minutosDedicados: 89
});
assert.equal(personalizadoFrontend.item, itemPersonalizado);
assert.equal(personalizadoFrontend.itemOutro, true);
assert.equal(personalizadoFrontend.minutosDedicados, 89);
assert.notEqual(personalizadoFrontend.item, "true");

const personalizadoBanco = classificacoes.normalizarClassificacao({
  fase: "Estudos", item: itemPersonalizado, item_outro: itemPersonalizado, minutos_dedicados: 89
});
assert.equal(personalizadoBanco.item, itemPersonalizado);
assert.equal(personalizadoBanco.itemOutro, true);
assert.equal(personalizadoBanco.minutosDedicados, 89);
assert.equal(personalizadoFrontend.chave, personalizadoBanco.chave);
assert.equal(new Map([personalizadoFrontend, personalizadoBanco].map((c) => [c.chave, c])).size, 1);
assert.equal(classificacoes.validarRateio([personalizadoFrontend], 89).valido, true);
const automatico = classificacoes.aplicarRegraRateio([{ fase: "Estudos", item: "ABNT NBR 5410", minutosDedicados: 0 }], 89, true);
assert.equal(automatico.classificacoes[0].minutosDedicados, 89);
assert.equal(automatico.valido, true);
assert.equal(classificacoes.aplicarRegraRateio([], 240, false).valido, true);
assert.equal(classificacoes.aplicarRegraRateio([], 240, true).motivo, "classificacao_ausente");
assert.equal(classificacoes.deveMostrarRateio({ exigeClassificacao: true, classificacoes: [{}, {}], duracaoMinutos: 120 }), true);
assert.equal(classificacoes.deveMostrarRateio({ exigeClassificacao: true, classificacoes: [{}], duracaoMinutos: 120 }), false);
assert.equal(classificacoes.deveMostrarRateio({ exigeClassificacao: true, classificacoes: [{}, {}], duracaoMinutos: 0 }), false);
const fonteClassificacoesUi = fs.readFileSync(require.resolve("../atividades/classificacoes-ui.js"), "utf8");
assert.match(fonteClassificacoesUi, /function resetarClassificacoesAtividade\(\)/, "a UI deve possuir um reset central das classificações");
assert.match(fonteClassificacoesUi, /fases\.clear\(\);\s*estado\.clear\(\);\s*personalizados = 0;/, "o reset deve limpar fases, itens, rateios e IDs temporários na fonte de verdade");
assert.match(fonteClassificacoesUi, /limpar: resetarClassificacoesAtividade/, "as entradas públicas devem reutilizar o mesmo reset");

const fonteFormulario = fs.readFileSync(require.resolve("../atividades/script.js"), "utf8");
assert.match(fonteFormulario, /atividadeParaPlanner = JSON\.parse[\s\S]*?await tratarResultadoPlanner\(atividadeParaPlanner\);[\s\S]*?resetarFormularioAtividade/, "o reset deve ocorrer após o save e após o Planner consumir uma cópia da atividade salva");
assert.match(fonteFormulario, /function resetarFormularioAtividade[\s\S]*?ATIVIDADE_CLASSIFICACOES_UI\?\.resetarClassificacoesAtividade\(\)/, "o formulário deve delegar ao reset central da feature");
const itemNormal = classificacoes.normalizarClassificacao({
  fase: "Estudos", item: "ABNT NBR 5410", itemOutro: false, minutosDedicados: 30
});
assert.equal(itemNormal.item, "ABNT NBR 5410");
assert.equal(itemNormal.itemOutro, false);

// Defesa contra a regressão de tipagem: booleanos não viram nomes textuais.
assert.equal(classificacoes.normalizarClassificacao({ fase: "Estudos", item: true, itemOutro: true }).item, "");
}

// ========================================================
// TESTES — PLANNER MODELOS
// Origem: atividades/planner-modelos.test.js
// ========================================================

async function testarPlannerModelos() {
const planner = require("../atividades/planner-modelos");

assert.deepEqual(planner.TIPOS_EDIFICACAO_PLANNER, [
  "Prédios Públicos Gerais",
  "Prédios Públicos de Saúde sem IT-Médico",
  "Prédios Públicos de Saúde com IT-Médico",
  "Prédios Privados Gerais",
  "Prédios Privados Pequenos (<200m²)"
]);

planner.TIPOS_EDIFICACAO_PLANNER.forEach((tipo) => {
  assert.ok(planner.localizarModeloPlanner("Elétrico Baixa Tensão", tipo));
});

assert.equal(planner.obterCodigoProjetoPlanner("Mapa Chave/Situação"), "PRJ-SIT");
assert.equal(planner.obterCodigoProjetoPlanner("Média Tensão"), "PRJ-ELET");
assert.deepEqual(planner.obterCodigosProjetoPlanner("Lógica"), ["PRJ-CFTV", "PRJ-CAB"]);
}

// ========================================================
// TESTES — PLANNER SYNC
// Origem: api/planner-sync.test.js
// ========================================================

async function testarPlannerSync() {
const sync = require("../api/_planner-sync");

assert.equal(sync.ehProjetoBaixaTensao("PRJ-ELE"), true);
assert.equal(sync.obterCodigoProjetoDaAtividade("Elétrico Baixa Tensão"), "PRJ-ELE");
[["CFTV", "PRJ-CFTV"], ["SDAI", "PRJ-SDAI"], ["SPDA", "PRJ-SPDA"], ["Telefonia", "PRJ-TEF"]].forEach(([projeto, codigo]) => {
  assert.equal(sync.projetoExigeFaseItem(projeto), true);
  assert.equal(sync.obterCodigoProjetoDaAtividade(projeto), codigo);
});
assert.equal(sync.obterCodigoProjetoDaAtividade("Site"), "");
assert.equal(sync.gerarChavePlanner("obra-1", "PRJ-SDAI"), "obra-1::PRJ-SDAI");
assert.equal(sync.gerarChaveItemPlanner("Distribuição", "Eletrocalhas"), "distribuicao::eletrocalha");
assert.equal(sync.gerarChaveItemPlanner("Distribuição", "Eletrocalha"), "distribuicao::eletrocalha");
assert.equal(sync.normalizarItemPlanner("Tomadas de Uso Específico"), "tomada de uso especifico");
assert.deepEqual(sync.itensDaAtividade({ item: "Eletrocalha · Leito · Perfilado" }), ["Eletrocalha", "Leito", "Perfilado"]);
assert.equal(sync.minutosDaAtividade({ data_inicio: "2026-08-14", hora_inicio: "08:00", data_termino: "2026-08-14", hora_termino: "11:57" }), 237);
assert.equal(sync.minutosDaAtividade({ data_inicio: "2026-08-14", hora_inicio: "12:00", data_termino: "2026-08-14", hora_termino: "11:00" }), 0);
const atividadeRateada = (id, minutos, classificacoes) => ({ id, data_inicio: "2026-08-14", hora_inicio: "08:00", data_termino: "2026-08-14", hora_termino: `${String(8 + Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`, atividade_classificacoes: classificacoes });
const vinculo = (atividade, itemId, etapa, item) => ({ atividade, item_id: itemId, item: { etapa, atividade: item } });
const agregar = (atividade, classificacoes) => sync.agregarVinculosPlanner(classificacoes.map(([id, fase, item]) => vinculo(atividade, id, fase, item)));

const unica = atividadeRateada("rateio-1", 120, [{ fase: "Lançamento", item: "Iluminação", minutos_dedicados: 120 }]);
assert.equal(agregar(unica, [["iluminacao", "Lançamento", "Iluminação"]]).get("iluminacao").minutosRegistrados, 120, "uma classificação usa seus minutos dedicados");

const duas = atividadeRateada("rateio-2", 151, [{ fase: "Lançamento", item: "Iluminação", minutos_dedicados: 16 }, { fase: "Lançamento", item: "Tomadas de Uso Específico", minutos_dedicados: 135 }]);
const duasAgregadas = agregar(duas, [["iluminacao", "Lançamento", "Iluminação"], ["tue", "Lançamento", "Tomada de Uso Específico"]]);
assert.equal(duasAgregadas.get("iluminacao").minutosRegistrados, 16);
assert.equal(duasAgregadas.get("tue").minutosRegistrados, 135);
assert.equal([...duasAgregadas.values()].reduce((s, item) => s + item.minutosRegistrados, 0), 151, "o Planner não duplica a duração integral entre itens");
assert.equal(duasAgregadas.get("iluminacao").atividades[0].minutosRateados, 16, "o detalhe recebe os minutos do vínculo");

const tres = atividadeRateada("rateio-3", 240, [{ fase: "Lançamento", item: "Iluminação", minutos_dedicados: 60 }, { fase: "Lançamento", item: "TUE", minutos_dedicados: 120 }, { fase: "Distribuição", item: "Perfilado", minutos_dedicados: 60 }]);
const tresAgregadas = agregar(tres, [["luz", "Lançamento", "Iluminação"], ["tue", "Lançamento", "TUE"], ["perfil", "Distribuição", "Perfilado"]]);
assert.equal(tresAgregadas.get("luz").minutosRegistrados + tresAgregadas.get("tue").minutosRegistrados, 180);
assert.equal(tresAgregadas.get("perfil").minutosRegistrados, 60);

const legadoPlanner = { id: "legado", data_inicio: "2026-08-14", hora_inicio: "08:00", data_termino: "2026-08-14", hora_termino: "10:00", atividade_classificacoes: [] };
assert.equal(agregar(legadoPlanner, [["legado-item", "", ""]]).get("legado-item").minutosRegistrados, 120, "atividade sem classificação preserva a duração integral");

const editada = atividadeRateada("rateio-editado", 180, [{ fase: "Lançamento", item: "Iluminação", minutos_dedicados: 90 }, { fase: "Lançamento", item: "TUE", minutos_dedicados: 90 }]);
const editadaAgregada = agregar(editada, [["luz", "Lançamento", "Iluminação"], ["tue", "Lançamento", "TUE"], ["perfil", "Distribuição", "Perfilado"]]);
assert.deepEqual([editadaAgregada.get("luz").minutosRegistrados, editadaAgregada.get("tue").minutosRegistrados], [90, 90], "uma edição substitui o rateio anterior");
assert.equal(editadaAgregada.has("perfil"), false, "classificação removida não contribui por meio de vínculo obsoleto");
}

// ========================================================
// TESTES — PLANNER CHECKLIST
// Origem: api/planner-checklist.test.js
// ========================================================

async function testarPlannerChecklist() {
const { _test } = require("../api/planner-checklist");
assert.doesNotThrow(() => _test.requireAdmin({ perfil: "admin" }));
assert.throws(() => _test.requireAdmin({ perfil: "colaborador" }), (erro) => erro.statusCode === 403);
}

// ========================================================
// TESTES — GANTT
// Origem: atividades/planner-gantt.test.js
// ========================================================

async function testarGantt() {
const gantt = require("../atividades/planner-gantt");
let sequencia = 0;
const atividade = (dia, inicio="08:00", fim="10:00", colaborador="Rodrigo", termino=dia, id=`a${++sequencia}`) => ({ id, data_inicio:dia, hora_inicio:inicio, data_termino:termino, hora_termino:fim, colaborador });
const item = (id, etapa, atividadesVinculadas) => ({ id, etapa, estagio:id, atividadesVinculadas });

assert.equal(gantt.obterIntervaloRealAtividade(atividade("2026-08-18","08:00","12:00")).minutos,240);
assert.equal(gantt.obterIntervaloRealAtividade(atividade("2026-08-20","08:00","12:00","R","2026-08-18")),null);
assert.equal(gantt.obterNumeroSemanaIso("2026-08-01"),31,"agosto inicia na semana ISO correta");
assert.equal(gantt.obterNumeroSemanaIso("2026-08-31"),36,"a troca para setembro recalcula o agrupamento semanal");
assert.equal(gantt.obterNumeroSemanaIso("2027-01-01"),53,"a semana ISO atravessa corretamente a mudança de ano");
assert.equal(gantt.obterNumeroSemanaIso("2027-01-04"),1,"a primeira segunda-feira inicia a semana 1");
  assert.equal(gantt.obterNumeroSemanaDomingo("2026-08-01"),31,"o sábado permanece na semana anterior");
assert.equal(gantt.obterNumeroSemanaDomingo("2026-08-02"),32,"o domingo inicia a nova semana do Gantt");
assert.equal(gantt.obterNumeroSemanaDomingo("2026-08-08"),32,"a semana do Gantt termina no sábado");
assert.equal(gantt.obterNumeroSemanaDomingo("2026-08-09"),33,"o domingo seguinte inicia outra semana");
const compartilhada=atividade("2026-08-03","08:00","10:00","Bruno");
const checklists=[
 {id:"p1",obraId:"o1",obra:"FIOCRUZ",projeto:"Elétrico",itens:[item("A","Fase A",[compartilhada,atividade("2026-08-08")]),item("B","Fase A",[atividade("2026-08-04")])]},
 {id:"p2",obraId:"o1",obra:"FIOCRUZ",projeto:"SPDA",itens:[item("C","Fase B",[atividade("2026-08-10")]),item("D","Fase B",[compartilhada])]}
];
const estrutura=gantt.construirEstruturaGantt(checklists,{periodo:{inicio:"2026-08-01",fim:"2026-08-31"}}), obra=estrutura[0], projeto=obra.projetos[0], fase=projeto.fases[0];
assert.deepEqual(fase.segmentosGantt.map(s=>s.data),["2026-08-03","2026-08-04","2026-08-08"],"a fase não inventa continuidade");
assert.deepEqual(projeto.segmentosGantt.map(s=>s.data),["2026-08-03","2026-08-04","2026-08-08"]);
assert.deepEqual(obra.segmentosGantt.map(s=>s.data),["2026-08-03","2026-08-04","2026-08-08","2026-08-10"]);
assert.equal(obra.metricas.minutosNoPeriodo,480,"atividade vinculada em dois projetos é deduplicada na obra");

const historico=[atividade("2026-07-01","08:00","04:00","A","2026-07-02"),atividade("2026-08-01","08:00","18:00")];
const metricas=gantt.calcularMetricasTemporais(historico,{inicio:"2026-08-01",fim:"2026-08-31"});
assert.equal(metricas.minutosNoPeriodo,600);assert.equal(metricas.minutosAcumulados,1800);
const dias=gantt.calcularMetricasTemporais([atividade("2026-08-01","08:00","10:00"),atividade("2026-08-01","14:00","18:00"),atividade("2026-08-03","08:00","12:00")]);
assert.equal(dias.diasAtivos,2);assert.equal(dias.diasJanela,3,"janela usa dias civis e contagem inclusiva");
const lacuna=gantt.calcularMetricasTemporais([atividade("2026-08-01"),atividade("2026-08-02"),atividade("2026-08-08")]);
assert.deepEqual(lacuna.maiorLacuna,{dias:5,inicio:"2026-08-02",fim:"2026-08-08"});
const cadencia=gantt.calcularMetricasTemporais([1,2,3,4,10].map(d=>atividade(`2026-08-${String(d).padStart(2,"0")}`)));
assert.equal(cadencia.diasJanela,10);assert.equal(cadencia.cadencia,.5);assert.equal(cadencia.colaboradores.length,1);
const faseParalela=fase.segmentosGantt.find(s=>s.data==="2026-08-03");assert.equal(faseParalela.itens.length,1);
const recolhidos=new Set([`fase:${fase.id}`]);
assert.ok(gantt.filtrarLinhasHierarquia(estrutura,{modo:"analitico",recolhidos}).includes(fase));
assert.ok(!gantt.filtrarLinhasHierarquia(estrutura,{modo:"analitico",recolhidos}).includes(fase.itens[0]));
assert.ok(!gantt.filtrarLinhasHierarquia(estrutura,{modo:"sintetico"}).some(n=>n.tipo==="item"));
assert.ok(gantt.filtrarLinhasHierarquia(estrutura,{modo:"analitico"}).some(n=>n.tipo==="item"));
const atividadesFase=gantt.obterAtividadesDoNivelGantt({node:fase,periodo:{inicio:"2026-08-01",fim:"2026-08-05"}});
assert.deepEqual(atividadesFase.map(a=>a.data_inicio),["2026-08-04","2026-08-03"],"o drill-down respeita período e ordena do mais recente");
assert.equal(gantt.obterAtividadesDoNivelGantt({node:obra,periodo:{inicio:"2026-08-01",fim:"2026-08-31"}}).filter(a=>a.id===compartilhada.id).length,1,"atividade repetida é exibida uma vez");
assert.deepEqual(gantt.obterAtividadesDoNivelGantt({node:obra,periodo:{inicio:"2026-08-01",fim:"2026-08-31"},filtros:{responsavel:"Bruno"}}).map(a=>a.id),[compartilhada.id],"o drill-down respeita responsável");
const semId={...atividade("2026-08-12","08:00","10:00","Bruno"),id:null};
const legado={intervalos:[semId,{...semId}]};
assert.equal(gantt.obterAtividadesDoNivelGantt({node:legado}).length,1,"registros legados sem id usam identidade estável");
const rateadaGantt={id:"rateada-gantt",data_inicio:"2026-08-14",hora_inicio:"08:00",data_termino:"2026-08-14",hora_termino:"10:31",colaborador:"R"};
const estruturaRateada=gantt.construirEstruturaGantt([{id:"p-rateio",obraId:"o-rateio",obra:"OBRA RATEIO",projeto:"Elétrico",itens:[
  item("luz","Lançamento",[{...rateadaGantt,plannerItemId:"luz",minutosRateados:16}]),
  item("tue","Lançamento",[{...rateadaGantt,plannerItemId:"tue",minutosRateados:135}])
]}]);
const obraRateada=estruturaRateada[0],faseRateada=obraRateada.projetos[0].fases[0];
assert.deepEqual(faseRateada.itens.map((x)=>x.metricas.minutosNoPeriodo),[16,135],"itens do Gantt exibem valores quantitativos rateados");
assert.equal(faseRateada.metricas.minutosNoPeriodo,151);
assert.equal(obraRateada.metricas.minutosNoPeriodo,151,"fase, projeto e obra somam as parcelas sem duplicação");
assert.equal(faseRateada.itens[0].intervalos[0].fim-faseRateada.itens[0].intervalos[0].inicio,151*60000,"o intervalo cronológico original não é encurtado pelo rateio");
}

// ========================================================
// TESTES — GANTT DO RELATÓRIO
// Origem: atividades/planner-gantt-relatorio.test.js
// ========================================================

async function testarGanttRelatorio() {
const relatorio = require("../atividades/planner-gantt-relatorio");
const engine = require("../atividades/planner-gantt");
const atividade = (id, dia, obra = "FIOCRUZ") => ({ id, obra, projeto: "Elétrico", etapa: "Lançamento", data_inicio: dia, hora_inicio: "08:00", data_termino: dia, hora_termino: "10:00" });
const todas = [atividade("15", "2026-08-15"), atividade("18", "2026-08-18"), atividade("20", "2026-08-20"), atividade("25", "2026-08-25"), atividade("tce", "2026-08-20", "TCE")];
const checklists = [
  { id: "p1", obraId: "o1", obra: "FIOCRUZ", projeto: "Elétrico", itens: [{ id: "i1", etapa: "Lançamento", atividadesVinculadas: todas.slice(0, 4) }] },
  { id: "p2", obraId: "o2", obra: "TCE", projeto: "CFTV", itens: [{ id: "i2", etapa: "Plotagem", atividadesVinculadas: [todas[4]] }] }
];
const original = JSON.stringify(checklists), periodo = { inicio: "2026-08-17", fim: "2026-08-22" };
const dados = relatorio.prepararEstrutura({ checklists, atividadesPermitidas: [todas[1], todas[2]], periodo });
assert.equal(JSON.stringify(checklists), original, "o Planner visível deve permanecer imutável");
assert.equal(dados.estrutura.length, 1, "deve respeitar a população filtrada do relatório");
assert.deepEqual(dados.dias, ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"]);
const linhas = engine.filtrarLinhasHierarquia(dados.estrutura, { modo: "sintetico" });
assert.ok(!linhas.some((linha) => linha.tipo === "item"), "a visão executiva não mostra itens");
assert.deepEqual(linhas.find((linha) => linha.tipo === "fase").segmentosPeriodo.map((s) => s.data), ["2026-08-18", "2026-08-20"], "dias sem execução não viram barra contínua");
assert.equal(linhas.find((linha) => linha.tipo === "obra").metricas.minutosNoPeriodo, 240);
assert.equal(linhas.find((linha) => linha.tipo === "projeto").metricas.minutosNoPeriodo, 240);
assert.equal(linhas.find((linha) => linha.tipo === "fase").metricas.minutosNoPeriodo, 240);
assert.equal(relatorio.formatarHoras(330), "5,50 h");
const duplicada = relatorio.prepararEstrutura({ checklists: [{ ...checklists[0], itens: [{ ...checklists[0].itens[0], atividadesVinculadas: [todas[1], todas[1]] }] }], atividadesPermitidas: [todas[1]], periodo });
assert.equal(engine.filtrarLinhasHierarquia(duplicada.estrutura, { modo: "sintetico" }).find((x) => x.tipo === "fase").metricas.minutosNoPeriodo, 120, "a atividade não pode duplicar horas no mesmo nível");
assert.equal(relatorio.prepararEstrutura({ checklists, atividadesPermitidas: [], periodo }).estrutura.length, 0);
}

// ========================================================
// TESTES — DASHBOARD
// Origem: atividades/dashboard-classificacao.test.js
// ========================================================

async function testarDashboard() {
const api = require("../atividades/dashboard-classificacao");
const registro = (obra, projeto, fase, item, horas) => ({ obra, projeto, fase, item, horas });
const calcular = (atividade) => atividade.horas;
const soma = (categorias) => categorias.reduce((total, categoria) => total + categoria.horas, 0);

const fases = api.agruparHorasPorFaseDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "", 4),
  registro("IPER", "Elétrico Baixa Tensão", "Distribuição", "", 6),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Lançamento", "", 3),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "", "", 5)
], calcular);
assert.equal(fases.categorias.find((item) => item.fase === "Distribuição").horas, 10, "a mesma fase e projeto deve somar entre obras");
assert.equal(fases.categorias.find((item) => item.fase === "Lançamento").horas, 3);
assert.equal(fases.horasSemFase, 5);
assert.equal(soma(fases.categorias) + fases.horasSemFase, fases.totalHoras);
assert.equal(api.obterLabelFaseDashboard(fases.categorias[0], false), "Distribuição");
const fasesComNaoAplicavel = api.agruparHorasPorFaseDashboard([registro("FIOCRUZ", "Site", "", "", 8), registro("FIOCRUZ", "CFTV", "Estudos", "ABNT NBR 5410", 2)], calcular);
assert.equal(fasesComNaoAplicavel.totalHoras, 2, "projetos não classificáveis não participam de Horas por Fase");
assert.equal(fasesComNaoAplicavel.horasSemFase, 0);

const projetos = api.agruparHorasPorFaseDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "", 10),
  registro("FIOCRUZ", "CFTV", "Distribuição", "", 5)
], calcular);
assert.equal(projetos.categorias.length, 2, "a mesma fase em projetos diferentes não deve ser misturada");
assert.equal(api.obterLabelFaseDashboard(projetos.categorias[0], true), "Elétrico Baixa Tensão → Distribuição");

const itens = api.agruparHorasPorItemDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha", 6),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha · Leito", 8),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "A · B · C", 9),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Lançamento", "Iluminação", 4),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Plotagem", "Iluminação", 6),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "", 7)
], calcular);
assert.equal(itens.categorias.find((item) => item.item === "Eletrocalha").horas, 10);
assert.equal(itens.categorias.find((item) => item.item === "Leito").horas, 4);
["A", "B", "C"].forEach((nome) => assert.equal(itens.categorias.find((item) => item.item === nome).horas, 3));
assert.equal(itens.categorias.filter((item) => item.item === "Iluminação").length, 2, "o mesmo item em fases diferentes deve gerar categorias diferentes");
assert.equal(itens.categorias.find((item) => item.fase === "Lançamento" && item.item === "Iluminação").horas, 4);
assert.equal(itens.categorias.find((item) => item.fase === "Plotagem" && item.item === "Iluminação").horas, 6);
assert.equal(api.obterLabelItemDashboard(itens.categorias.find((item) => item.fase === "Lançamento" && item.item === "Iluminação"), false), "Lançamento → Iluminação");
assert.equal(itens.horasSemItem, 7);
assert.ok(Math.abs(soma(itens.categorias) + itens.horasSemItem - itens.totalHoras) < 1e-10, "o rateio deve conservar todas as horas");
const rateio = api.agruparHorasPorItemDashboard([registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha · Leito · Perfilado", 9)], calcular);
assert.deepEqual(rateio.categorias.map((item) => item.horas), [3, 3, 3]);

const mesmoItem = api.agruparHorasPorItemDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha", 2),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Lançamento", "Eletrocalha", 3)
], calcular);
assert.equal(mesmoItem.categorias.length, 2);
assert.equal(api.obterLabelItemDashboard(mesmoItem.categorias[0], true), "Elétrico Baixa Tensão → Distribuição → Eletrocalha");
const quinze = Array.from({ length: 15 }, (_, indice) => ({ chave: `Categoria ${indice}`, horas: indice + 1 }));
const top = api.ordenarTopHorasDashboard(quinze, 10);
assert.equal(top.categorias.length, 10);
assert.equal(top.totalCategorias, 15);
assert.deepEqual(top.categorias.map((item) => item.horas), [15, 14, 13, 12, 11, 10, 9, 8, 7, 6]);
assert.deepEqual(api.ordenarTopHorasDashboard([{ chave: "B", horas: 2 }, { chave: "A", horas: 2 }]).categorias.map((item) => item.chave), ["A", "B"]);
assert.deepEqual(api.obterRegistrosDetalhadosDashboard([{ registros: [{ id: 1 }, { id: 2 }] }, { id: 3 }]).map((item) => item.id), [1, 2, 3]);
}

// ========================================================
// TESTES — DADOS GERENCIAIS
// Origem: atividades/dados-gerenciais-relatorio.test.js
// ========================================================

async function testarDadosGerenciais() {
const api = require("../atividades/dados-gerenciais-relatorio");
const registro = (id, colaborador, horas, obra = "FIOCRUZ", projeto = "Elétrico Baixa Tensão", status = "Finalizado") => ({ id, colaborador, horas, obraCodigo: "OBR-000015", obra, projeto, etapa: id, status });
const dados = api.construirDadosGerenciaisRelatorio([registro("a", "Bruno", 25.85), registro("b", "Geovanna", 24.83), registro("c", "Hellen", 24.38), registro("d", "Rodrigo", 14.28, "MATERNIDADE", "SPDA", "Em progresso")]);
assert.deepEqual(dados.horasPorColaborador.map((x) => x.label), ["Bruno", "Geovanna", "Hellen", "Rodrigo"]);
assert.deepEqual(dados.horasPorColaborador.map((x) => x.valor), [25.85, 24.83, 24.38, 14.28]);
assert.deepEqual(dados.atividadesPorColaborador.map((x) => x.valor), [1, 1, 1, 1]);
assert.equal(api.formatarLabelFrenteRelatorio("OBR-000015 — FIOCRUZ — Elétrico Baixa Tensão"), "FIOCRUZ · Elétrico BT");
assert.equal(dados.percentualFinalizadas, 75);
assert.deepEqual(dados.statusLegenda.map((x) => x.label), ["Em progresso", "Finalizado"]);
assert.equal(dados.status.length, 4);
const dezenove = api.construirDadosGerenciaisRelatorio(Array.from({ length: 19 }, (_, i) => registro(`s${i}`, "Equipe", 1, "Obra", "SPDA", i === 18 ? "Em progresso" : "Finalizado")));
assert.equal(dezenove.percentualFinalizadas, 95);
const treze = Array.from({ length: 13 }, (_, i) => registro(`top${i}`, "Pessoa", i + 17, `Obra ${i}`, "SPDA"));
const top = api.construirDadosGerenciaisRelatorio(treze).topHorasPorFrente;
assert.equal(top.length, 10); assert.ok(top.every((x, i) => !i || top[i - 1].valor >= x.valor));
}

// ========================================================
// TESTES — GRÁFICOS DO RELATÓRIO
// Origem: atividades/graficos-relatorio.test.js
// ========================================================

async function testarGraficosRelatorio() {
global.document = { createElement: () => ({ style: {} }) };
assert.doesNotThrow(() => require("../atividades/graficos-relatorio"), "o módulo deve importar sem ReferenceError");
const graficos = require("../atividades/graficos-relatorio");
const canvas = graficos.canvasRelatorio(1200, 600);
assert.equal(canvas.width, 2400);
assert.equal(canvas.height, 1200);
assert.equal(graficos.CONFIG_GRAFICO_RELATORIO.fundo, "#ffffff");
assert.ok(graficos.CONFIG_GRAFICO_RELATORIO.fontLabel >= 32);
assert.ok(graficos.CONFIG_GRAFICO_RELATORIO.fontValue >= 36);
assert.ok(graficos.CONFIG_GRAFICO_RELATORIO.paddingDireita >= 150);
assert.ok(graficos.calcularAlturaGrafico(12) > graficos.calcularAlturaGrafico(4));
assert.equal(graficos.formatarHoras(25.85), "25,85 h");
assert.deepEqual(graficos.NIVEIS_EXPORTACAO.map((x) => [x.largura, x.qualidade]), [[1400, .94], [1200, .92], [1100, .9]]);

const payloadApi = require("../atividades/payload-relatorio");
assert.deepEqual(payloadApi.compactarAtividadeParaRelatorio({ id: "rateada", classificacoes: [{ fase: "Lançamento", item: "Iluminação", minutosDedicados: 16 }], campoNaoUsado: true }).classificacoes, [{ fase: "Lançamento", item: "Iluminação", minutosDedicados: 16 }], "o payload do relatório preserva o rateio oficial");
const sinteticas = Array.from({ length: 1000 }, (_, i) => ({ id: i, obraId: `o${i % 20}`, obraCodigo: `OBR-${String(i % 20).padStart(6, "0")}`, obra: `Obra ${i % 20}`, projeto: `Projeto ${i % 50}`, fase: `Fase ${i % 5}`, item: `Item ${i % 8}`, colaborador: i % 2 ? "Bruno" : "Geovanna", trabalhos: "Descrição necessária", observacoes: "Observação necessária", dataInicio: "2026-08-03", horaInicio: "08:00", dataTermino: "2026-08-03", horaTermino: "09:00", status: "Finalizado", prioridade: "P1", campoNaoUsado: "x".repeat(2000) }));
const imagens = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`g${i}`, { imagem: `data:image/png;base64,${"A".repeat(200000)}` }]));
const anterior = { atividades: sinteticas, historicoAtividades: sinteticas, dadosGerenciais: sinteticas, graficos: imagens, gantt: { obras: [] }, periodoRelatorio: { dataInicio: "2026-08-01", dataFim: "2026-08-31" } };
const otimizado = payloadApi.montarPayloadCompacto({ ...anterior, historicoAtividades: undefined, dadosGerenciais: undefined });
const antes = payloadApi.calcularTamanhoPayloadRelatorio(anterior), depois = payloadApi.calcularTamanhoPayloadRelatorio(otimizado);
assert.ok(depois.total < payloadApi.MAX_PAYLOAD_RELATORIO_BYTES);
assert.ok(depois.total < antes.total * .35, "o DTO mensal deve remover histórico, derivados e campos alheios");
assert.equal(payloadApi.obterModoRelatorio({ dataInicio: "2026-08-01", dataFim: "2026-08-14" }), "semanal");
assert.equal(payloadApi.obterModoRelatorio({ dataInicio: "2026-08-01", dataFim: "2026-08-31" }), "mensal");
assert.equal(payloadApi.obterModoRelatorio({ dataInicio: "2026-08-01", dataFim: "2026-09-10" }), "longo");
console.log(`  Payload sintético: antes ${(antes.total / 1048576).toFixed(2)} MB; depois ${(depois.total / 1048576).toFixed(2)} MB; redução ${((1 - depois.total / antes.total) * 100).toFixed(1)}%`);
}

// ========================================================
// TESTES — FICHA DE OBRA
// Origem: api/obra-ficha.test.js
// ========================================================

async function testarFichaObra() {
const { chaveProjeto, completudeFicha, exigirAdmin, numeroOpcional, statusFicha, validarFicha } = require("../api/_obra-ficha");
assert.throws(() => exigirAdmin({ perfil: "colaborador" }), (error) => error.statusCode === 403);
assert.doesNotThrow(() => exigirAdmin({ perfil: "admin" }));
assert.equal(statusFicha(null), "cadastro_minimo");
assert.equal(statusFicha({ caracterizacao_nao_aplicavel: true }), "nao_aplicavel");
const caracteristica = { categoria_registro: "empreendimento", natureza: "publico", benchmark_status: "incluir" };
const tipologias = [{ segmento: "Saúde", tipologia: "Hospital", principal: true }];
assert.equal(statusFicha(caracteristica, tipologias, [{ intervencao: "Reforma" }]), "caracterizada");
assert.equal(statusFicha(caracteristica, tipologias, []), "parcial");
assert.equal(numeroOpcional(""), null); assert.equal(numeroOpcional("0"), 0);
assert.throws(() => numeroOpcional(-1), /não negativos/); assert.throws(() => numeroOpcional(1.5, true), /inteiros/);
assert.equal(chaveProjeto("Elétrico Baixa Tensão"), "eletrico-baixa-tensao");
const ficha = validarFicha({ categoriaRegistro: "empreendimento", natureza: "publico", areaIntervencao: "8700", areaExternaIntervencao: "", pavimentosAcima: "5", benchmarkStatus: "incluir", tipologias, intervencoes: ["Reforma", "Ampliação"], projetos: [{ projeto: "SPDA" }, { projeto: "SPDA" }] });
assert.equal(ficha.caracteristica.area_intervencao, 8700); assert.equal(ficha.caracteristica.area_externa_intervencao, null); assert.equal(ficha.projetos.length, 1); assert.equal(ficha.intervencoes.length, 2);
assert.throws(() => validarFicha({ benchmarkStatus: "excluir" }), /motivo/); assert.throws(() => validarFicha({ benchmarkStatus: "incluir", caracterizacaoNaoAplicavel: true }), /não pode integrar/);
assert.equal(completudeFicha(caracteristica, tipologias, [{ intervencao: "Reforma" }], [{ projeto: "SPDA" }]) > 0, true);

}
// ========================================================
// TESTES — CENTRAL DE GESTÃO
// ========================================================
async function testarCentralGestao() {
const G = require("../api/_gestao");
const atividade = (id, data, horas, extra = {}) => ({ id, obra_id: "o1", data_inicio: data, hora_inicio: "08:00", data_termino: data, hora_termino: `${String(8 + horas).padStart(2, "0")}:00`, ...extra });
assert.equal(G.calcularUltimaMovimentacao([atividade("1", "2026-08-01", 1), atividade("2", "2026-08-05", 1), atividade("3", "2026-08-12", 1)]), "2026-08-12");
assert.equal(G.diferencaDias("2026-08-10", "2026-08-20"), 10);
const cobertura = G.calcularCoberturaPlanner([atividade("1", "2026-08-10", 8), atividade("2", "2026-08-10", 2)], new Set(["1"]));
assert.equal(cobertura.cobertura, 80);
assert.equal(G.calcularCoberturaPlanner([], new Set()).cobertura, null);
const duplicada = atividade("1", "2026-08-10", 4, { fase: "Fase", item: "Item" });
assert.equal(G.calcularCoberturaPlanner([duplicada, duplicada], new Set(["1"])).horasPlanner, 4);
const pendencias = G.obterPendenciasFicha({ categoria_registro: "empreendimento", natureza: "publico", benchmark_status: "nao_avaliado" }, [{ segmento: "Saúde", tipologia: "Hospital", principal: true }], [{ intervencao: "Reforma" }], []);
assert.deepEqual(pendencias.map((p) => p.campo), ["area_intervencao", "pavimentos", "projetos", "benchmark", "observacoes"]);
assert.deepEqual(G.obterPendenciasFicha({ caracterizacao_nao_aplicavel: true }), []);
assert.deepEqual(G.compararProjetosDetectadosCadastrados(["BT", "SPDA", "CFTV"], ["BT", "SPDA"]).pendentes.map((p) => p.projeto), ["CFTV"]);
const alerta = G.construirAlertasGestao({ id: "o1", nome: "TCE", ativo: true, diasSemMovimentacao: 8, coberturaPlanner: 90, projetosPendentes: [], projetosCadastrados: 1, pendenciasFicha: [], benchmarkPendente: false, completude: 100 });
assert.equal(alerta[0].tipo, "SEM_MOVIMENTACAO"); assert.match(alerta[0].mensagem, /Sem movimentação/); assert.doesNotMatch(alerta[0].mensagem, /atras/i);
const qualidade = G.calcularQualidadeDados([atividade("1", "2026-08-10", 8, { projeto: "CFTV", fase: "F", item: "I" }), atividade("2", "2026-08-10", 2, { projeto: "CFTV", fase: "F" }), atividade("3", "2026-08-10", 5, { projeto: "Site" })], [], new Set(["1"]));
assert.equal(qualidade.fase, 100); assert.equal(qualidade.item, 80); assert.equal(qualidade.planner, 80);
assert.equal(qualidade.totalClassificavel, 10);
}

// ========================================================
// TESTES — RELATÓRIO WORD
// Origem: api/gerar-relatorio-word.test.js
// ========================================================

async function testarRelatorioWord() {
const fs = require("fs");
const os = require("os");
const path = require("path");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const { _test } = require("../api/gerar-relatorio-word");

const templatePath = path.resolve(__dirname, "..", "atividades", "template", "Relatorio.docx");
const productionTemplatePath = path.resolve(process.cwd(), "atividades", "template", "Relatorio.docx");
assert.equal(templatePath, productionTemplatePath, "o teste deve usar exatamente o template do endpoint");
const novoZip = () => new PizZip(fs.readFileSync(templatePath));
const periodo = { tipo: "semanal", rotulo: "Semana 30", dataInicio: "2026-07-19", dataFim: "2026-07-25", ano: "2026" };
const textoLongo = `Descrição técnica integral ${"sem qualquer corte no conteúdo registrado ".repeat(15)}fim do lançamento.`;
const registros = [
  { id: "1", obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: textoLongo, observacoes: "Primeira observação\ncom nova linha.", colaborador: "Hellen", dataInicio: "2026-07-19", horaInicio: "08:00:00", dataTermino: "2026-07-19", horaTermino: "10:00:00", criadoEm: "2026-07-19T12:00:00Z", status: "Atrasado", prioridade: "P2" },
  { id: "2", obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: "Texto deliberadamente repetido.", observacoes: "Segunda observação.", colaborador: "Bruno", dataInicio: "2026-07-20", horaInicio: "13:00", dataTermino: "2026-07-20", horaTermino: "16:30", criadoEm: "2026-07-20T17:00:00Z", status: "Em progresso", prioridade: "P1" },
  { id: "3", obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: "Texto deliberadamente repetido.", observacoes: "Projeto ainda incompleto por ausência da potência das bombas. Também solicitei um shaft no superior.", colaborador: "Hellen", dataInicio: "2026-07-21", horaInicio: "08:30", dataTermino: "2026-07-21", horaTermino: "11:00", criadoEm: "2026-07-21T12:00:00Z", status: "Finalizado", prioridade: "P2" }
];
const [atividade] = require("../atividades/atividade-agrupamento").consolidarAtividades(registros);
const mensais = Array.from({ length: 10 }, (_, i) => ({ ...registros[0], id: `m${i}`, obraCodigo: "OBR-000015", obra: "FIOCRUZ", projeto: "Elétrico BT", fase: "Distribuição", item: "Eletrocalha", colaborador: i < 8 ? "Bruno" : "Geovanna", dataInicio: ["2026-08-03", "2026-08-08", "2026-08-22"][i % 3], dataTermino: ["2026-08-03", "2026-08-08", "2026-08-22"][i % 3], horaInicio: "08:00", horaTermino: "09:00", status: i === 9 ? "Em progresso" : "Finalizado" }));
const gruposMensais = _test.consolidarFrentesAnexoMensal(mensais);
assert.equal(gruposMensais.length, 1); assert.equal(gruposMensais[0].quantidade, 10); assert.equal(gruposMensais[0].horas, 10);
assert.deepEqual(gruposMensais[0].colaboradores, ["Bruno", "Geovanna"]); assert.equal(gruposMensais[0].primeira, "2026-08-03"); assert.equal(gruposMensais[0].ultima, "2026-08-22");
const xmlMensal = _test.gerarAnexoConsolidado([...mensais, { ...mensais[0], id: "sem-classificacao", fase: "", etapa: "", item: "" }]);
assert.match(xmlMensal, /Modo de apresentação: consolidado/); assert.match(xmlMensal, /Atividades não classificadas/); assert.equal((xmlMensal.match(/Eletrocalha/g) || []).length, 1);
assert.equal(_test.obterModoRelatorio({ dataInicio: "2026-08-01", dataFim: "2026-08-31" }), "mensal");
assert.equal(_test.formatarCompetenciaRelatorio(periodo), "JULHO/2026");
assert.equal(_test.formatarCompetenciaRelatorio({ ...periodo, dataInicio: "2026-07-27", dataFim: "2026-08-02" }), "JULHO/2026 — AGOSTO/2026");
assert.equal(_test.formatarCompetenciaRelatorio({ ...periodo, dataInicio: "2026-12-28", dataFim: "2027-01-03" }), "DEZEMBRO/2026 — JANEIRO/2027");
assert.equal(_test.formatarCompetenciaRelatorio({ tipo: "anual", dataInicio: "2026-01-01", dataFim: "2026-12-31" }), "2026");
{
  const paragrafos = _test.MARCADORES_XML_BRUTO.map((marcador) => marcador === "KKKK"
    ? "<w:p><w:pPr><w:jc w:val=\"both\"/></w:pPr><w:r><w:t>[</w:t></w:r><w:r><w:t>KKKK</w:t></w:r><w:r><w:t>]</w:t></w:r></w:p>"
    : `<w:p><w:r><w:t>[${marcador}]</w:t></w:r></w:p>`).join("");
  const zip = new PizZip();
  zip.file("word/document.xml", `<w:document><w:body>${paragrafos}</w:body></w:document>`);
  _test.prepararTemplateParaGraficos(zip);
  const xml = zip.file("word/document.xml").asText();
  assert.match(xml, /<w:p><w:pPr><w:jc w:val="both"\/><\/w:pPr><w:r><w:t>\[@KKKK\]<\/w:t><\/w:r><\/w:p>/);
  assert.doesNotMatch(xml, /<w:t>\[<\/w:t>|<w:t>KKKK<\/w:t>|<w:t>\]<\/w:t>/);
}

let xmlFinal;
{
  const zip = novoZip();
  _test.prepararTemplateParaGraficos(zip);
  assert.match(zip.file("word/document.xml").asText(), /\[@KKKK\]/, "o template real deve reconhecer KKKK como XML bruto");
  assert.match(zip.file("word/document.xml").asText(), /\[@LLLL\]/, "o template real deve reconhecer LLLL como XML bruto");
  const dados = _test.montarDadosRelatorio({ atividades: registros, atividadesSemanais: [], periodoRelatorio: periodo, graficos: {} }, zip);
  assert.equal(dados.PERIODO_RELATORIO, "JULHO/2026");
  assert.equal(dados.COMPETENCIA_RELATORIO, "JULHO/2026");
  assert.equal(dados.ROTULO_PERIODO_RELATORIO, "SEMANA 30");
  assert.match(dados.BBBB, /<w:jc w:val="both"\/>/);
  assert.match(dados.BBBB, /<w:ind w:firstLine="567"\/>/);
  assert.match(dados.BBBB, /<w:widowControl\/>/);
  assert.match(dados.JJJJ, /<w:jc w:val="both"\/>/);
  assert.match(dados.JJJJ, /Pontos de atenção:/);
  assert.doesNotMatch(dados.BBBB + dados.CCCC + dados.JJJJ, /w:firstLine="709"/);
  assert.doesNotMatch(dados.JJJJ, /ANEXO A/);
  assert.match(dados.KKKK, /^<w:tbl>/);
  const documento = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true });
  documento.render(dados);
  xmlFinal = _test.validarDocumentoFinal(documento);
  assert.doesNotMatch(xmlFinal, /&lt;w:tbl&gt;/);
  assert.doesNotMatch(xmlFinal, /\[KKKK\]/);
  assert.doesNotMatch(xmlFinal, /\[@KKKK\]/);
  assert.doesNotMatch(xmlFinal, /<w:t\b[^>]*>[\s\S]*?&lt;w:/, "não deve existir OpenXML como texto");
  const indiceTitulo = xmlFinal.lastIndexOf("ANEXO A — DETALHAMENTO DAS FRENTES DE TRABALHO");
  const indiceTabela = xmlFinal.indexOf("<w:tbl>", indiceTitulo);
  assert.ok(indiceTitulo >= 0, "o título do Anexo deve existir");
  assert.ok(indiceTabela > indiceTitulo, "uma tabela real deve existir depois do título do Anexo");
  const xmlAnexo = dados.KKKK;
  assert.equal((xmlAnexo.match(/<w:tr>/g) || []).length, 8, "o Anexo deve ter quatro linhas de identificação, cabeçalho e três lançamentos");
  assert.match(xmlAnexo, /<w:tblHeader\/>/, "o cabeçalho deve repetir em páginas seguintes");
  assert.match(xmlAnexo, /<w:shd w:fill="1F4E78"\/>/, "o cabeçalho deve ser azul");
  assert.match(xmlAnexo, /OBR-000023/);
  assert.match(xmlFinal, /<w:pgSz w:w="11906" w:h="16838"[^>]*\/>/, "o novo template deve preservar a página A4 retrato do Anexo B");
  const outputPath = path.join(os.tmpdir(), "relatorio-semana-30.docx");
  fs.writeFileSync(outputPath, documento.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }));
}

{
  const zip = novoZip();
  _test.prepararTemplateParaGraficos(zip);
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3mG7WQAAAABJRU5ErkJggg==";
  const ganttTabular = { periodo: { inicio: "2026-07-20", fim: "2026-07-26" }, totalHoras: 8,
    obras: [{ id: "o1", codigo: "OBR-000023", nome: "FIOCRUZ", horas: 8, diasAtivos: 2, dias: ["2026-07-20", "2026-07-22"], linha: { nivel: "obra", nome: "FIOCRUZ", horas: 8, dias: ["2026-07-20", "2026-07-22"] }, projetos: [{ linha: { nivel: "projeto", nome: "Elétrico", horas: 8, dias: ["2026-07-20", "2026-07-22"] }, fases: [{ nivel: "fase", nome: "Lançamento", horas: 8, dias: ["2026-07-20", "2026-07-22"] }] }] }] };
  const dados = _test.montarDadosRelatorio({ atividades: registros, atividadesSemanais: [], periodoRelatorio: periodo, graficos: { status: png }, gantt: ganttTabular }, zip);
  const documento = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true });
  documento.render(dados); const xml = _test.validarDocumentoFinal(documento);
  assert.equal(documento.getZip().file("word/media/relatorio-gantt.png"), null, "o Gantt não deve criar PNG");
  assert.ok(documento.getZip().file("word/media/relatorio-grafico-1.png"), "os gráficos gerenciais devem ser preservados");
  assert.doesNotMatch(documento.getZip().file("word/_rels/document.xml.rels").asText(), /rIdRelGantt/);
  assert.match(xml, /SÍNTESE TEMPORAL/); assert.match(xml, /<w:tblHeader\/>/); assert.match(xml, /<w:cantSplit\/>/);
  assert.match(xml, /<w:tblLayout w:type="fixed"\/>/); assert.match(xml, /w:fill="286D9F"/);
  assert.doesNotMatch(xml, /\[@?LLLL\]/);
}
{
  const zip = novoZip(); _test.prepararTemplateParaGraficos(zip);
  const jpeg = "data:image/jpeg;base64,/9j/2Q==";
  const periodoMensal = { tipo: "mensal", rotulo: "Agosto 2026", dataInicio: "2026-08-01", dataFim: "2026-08-31", ano: "2026" };
  const dados = _test.montarDadosRelatorio({ atividades: mensais, atividadesSemanais: [], periodoRelatorio: periodoMensal, graficos: { status: { imagem: jpeg, largura: 1400, altura: 800 } } }, zip);
  assert.match(dados.KKKK, /consolidado por frente de trabalho/); assert.equal((dados.KKKK.match(/Eletrocalha/g) || []).length, 1); assert.match(dados.KKKK, />10</);
  assert.ok(zip.file("word/media/relatorio-grafico-1.jpg")); assert.equal(zip.file("word/media/relatorio-grafico-1.png"), null);
  assert.match(zip.file("[Content_Types].xml").asText(), /Extension="jpg" ContentType="image\/jpeg"/);
  assert.match(zip.file("word/_rels/document.xml.rels").asText(), /relatorio-grafico-1\.jpg/);
  assert.equal(require("../atividades/dados-gerenciais-relatorio").construirDadosGerenciaisRelatorio(mensais).horasTotais, 10, "a consolidação visual não altera as horas oficiais");
}
{
  const { gerarGanttTabelaXml, periodosTemporais, aplicarPaisagemUltimaSecao, calcularCoberturaGantt, formatarTituloObraAnexoGantt } = require("../api/_relatorio-gantt");
  assert.equal(calcularCoberturaGantt(100, 40), 40);
  assert.equal(formatarTituloObraAnexoGantt(1, "— OBR-000026 —", "Posto de gasolina"), "B.1 — OBR-000026 — Posto de gasolina");
  const obra = { nome: "OBRA TESTE", horas: 5.5, dias: ["2026-08-18", "2026-08-20"], linha: { nivel: "obra", nome: "OBRA TESTE", horas: 5.5, dias: ["2026-08-18", "2026-08-20"] }, projetos: [{ linha: { nivel: "projeto", nome: "Projeto", horas: 5.5, dias: ["2026-08-18", "2026-08-20"] }, fases: [{ nivel: "fase", nome: "Fase", horas: 4, dias: ["2026-08-18"] }] }] };
  const semanal = gerarGanttTabelaXml({ periodo: { inicio: "2026-08-16", fim: "2026-08-22" }, totalHoras: 5.5, obras: [obra] });
  assert.equal(semanal.paisagem, false); assert.equal((semanal.xml.match(/<w:gridCol w:w=/g) || []).length, 12);
  assert.match(semanal.xml, /5,50 h/); assert.match(semanal.xml, /4,00 h/); assert.match(semanal.xml, /w:fill="F3F5F7"/);
  assert.equal((semanal.xml.match(/w:fill="286D9F"/g) || []).length, 5, "18 e 20 ficam ativos sem preencher o dia 19");
  const quatorze = gerarGanttTabelaXml({ periodo: { inicio: "2026-08-01", fim: "2026-08-14" }, obras: [obra] }); assert.equal(quatorze.paisagem, false);
  const quinze = gerarGanttTabelaXml({ periodo: { inicio: "2026-08-01", fim: "2026-08-15" }, obras: [obra] }); assert.equal(quinze.paisagem, true);
  const mensal = gerarGanttTabelaXml({ periodo: { inicio: "2026-08-01", fim: "2026-08-31" }, obras: [obra] }); assert.equal(mensal.paisagem, true); assert.equal((mensal.xml.match(/<w:gridCol w:w=/g) || []).length, 36);
  assert.equal(periodosTemporais({ inicio: "2026-02-01", fim: "2026-02-28" })[0].dias.length, 28);
  const longo = periodosTemporais({ inicio: "2026-08-20", fim: "2026-09-10" }); assert.deepEqual(longo.map((x) => [x.dias[0], x.dias.at(-1)]), [["2026-08-20", "2026-08-31"], ["2026-09-01", "2026-09-10"]]);
  const orientado = aplicarPaisagemUltimaSecao('<w:document><w:body><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>');
  assert.match(orientado, /w:orient="landscape"/); assert.match(mensal.xml, /<w:pgSz w:w="11906" w:h="16838"\/>/, "a quebra preserva retrato nas páginas anteriores");
  const muitas = Array.from({ length: 20 }, (_, i) => ({ ...obra, nome: `OBRA ${i + 1}` })); const xmlMuitas = gerarGanttTabelaXml({ periodo: { inicio: "2026-08-01", fim: "2026-08-31" }, obras: muitas }).xml;
  assert.equal((xmlMuitas.match(/B\.\d+ —/g) || []).length, 20); assert.ok((xmlMuitas.match(/<w:cantSplit\/>/g) || []).length >= 80);
}
{
  const zip = novoZip(); _test.prepararTemplateParaGraficos(zip);
  const dados = _test.montarDadosRelatorio({ atividades: registros, atividadesSemanais: [], periodoRelatorio: periodo }, zip);
  assert.match(dados.LLLL, /Não foram identificadas atividades com intervalo válido/);
  const documento = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true });
  documento.render(dados); assert.doesNotMatch(_test.validarDocumentoFinal(documento), /\[@?LLLL\]/);
}

{
  const documentoQuebrado = {
    getZip: () => ({ file: () => ({ asText: () => "ANEXO A — DETALHAMENTO DAS FRENTES DE TRABALHO<w:t>&lt;w:tbl&gt;</w:t>" }) })
  };
  assert.throws(() => _test.validarDocumentoFinal(documentoQuebrado), /texto escapado/, "a publicação deve falhar quando a tabela estiver escapada");
}

const tabela = _test.criarTabelaXml(["Indicador", "Resultado"], [["Atividades", 1]], { colunas: [{ largura: 2800 }, { largura: 1500, alinhamento: "center", noWrap: true }] });
assert.doesNotMatch(tabela, /tcFitText/);
assert.match(tabela, /<w:vAlign w:val="center"\/>/);
assert.match(tabela, /<w:jc w:val="center"\/>/);
assert.match(tabela, /<w:tcBorders>/);
assert.match(tabela, /<w:top w:val="single"/);
assert.match(tabela, /<w:left w:val="single"/);
assert.match(tabela, /<w:bottom w:val="single"/);
assert.match(tabela, /<w:right w:val="single"/);
assert.match(tabela, /<w:tblCellSpacing w:w="0" w:type="dxa"\/>/);

const grupos = _test.agruparLancamentosParaAnexo(registros, [atividade]);
assert.equal(grupos.length, 1);
assert.equal(grupos[0].registros.length, 3);
const anexo = _test.gerarAnexoDetalhado(registros, [atividade]);
assert.equal((anexo.match(/<w:tr>/g) || []).length, 8);
assert.equal((anexo.match(/Texto deliberadamente repetido\./g) || []).length, 2);
assert.match(anexo, new RegExp(textoLongo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(anexo, /Descrição técnica integral[^<]*…/);
assert.match(anexo, /Primeira observação/);
assert.match(anexo, /<w:br\/>/);
assert.match(anexo, />2 h</);
assert.match(anexo, />3,5 h</);
assert.match(anexo, />2,5 h</);
assert.doesNotMatch(anexo, />8 h<\/w:t>[\s\S]*>8 h<\/w:t>/);
assert.match(anexo, /<w:noWrap\/>/);
assert.equal((anexo.match(/<w:tblW w:w="13750" w:type="dxa"\/>/g) || []).length, 2);
const frentesRateadas = _test.consolidarFrentesAnexoMensal([{ ...registros[0], classificacoes: [{ fase: "Lançamento", item: "Iluminação", minutosDedicados: 16 }, { fase: "Lançamento", item: "TUE", minutosDedicados: 135 }] }]);
assert.deepEqual(frentesRateadas.map((frente) => [frente.item, frente.horas]), [["Iluminação", Number((16 / 60).toFixed(2))], ["TUE", 2.25]], "o anexo mensal consolida cada Fase/Item pelos minutos rateados");
assert.ok(anexo.includes('<w:gridCol w:w="4800"/>'));
assert.ok(anexo.includes('<w:gridCol w:w="4600"/>'));
assert.ok(anexo.includes('<w:shd w:fill="1F4E78"/>'));
assert.ok(anexo.includes('<w:shd w:fill="EAF2F8"/>'));
assert.ok(anexo.includes('<w:color w:val="FFFFFF"/>'));
assert.ok(anexo.includes("<w:keepNext/>"));
assert.match(anexo, /w:line="200" w:lineRule="exact"/);
assert.equal(_test.formatarIntervaloHorarioRelatorio(registros[0]), "08:00–10:00");
assert.equal(_test.formatarIntervaloHorarioRelatorio({ horaInicio: "08:00:00" }), "08:00–—");
assert.equal(_test.formatarIntervaloHorarioRelatorio({}), "—");

const desempenho = _test.gerarDesempenhoColaboradores([atividade]);
assert.match(desempenho, />1<\/w:t>/);
assert.match(desempenho, />3<\/w:t>/);
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z"), "22/07/2026");
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z", { incluirHora: true }), "22/07/2026 às 07:48");
assert.equal(_test.calcularDiasAtraso(atividade, "2026-07-25"), 0);
assert.equal(_test.calcularDiasAtraso({ ...atividade, prazo: "2026-07-24" }, "2026-07-25"), 1);
assert.equal(_test.formatarPeriodoEmFrase(periodo), "Durante a Semana 30");
assert.equal(_test.formatarHorasRelatorio(5.5), "5,50 h");
assert.equal(_test.sanitizarTextoGerencial("Todos os projetos entregues!."), "Todos os projetos entregues.");
const invalida = _test.verificarConsistencia([{ obra:"SOW", projeto:"ART", colaborador:"Rodrigo", dataInicio:"2026-08-17", horaInicio:"15:19", dataTermino:"2026-08-17", horaTermino:"10:25", horas:0 }], periodo, { horasTotais:0, horasPorColaborador:[], horasPorFrente:[] });
assert.equal(invalida.contagens.intervalosInvalidos, 1);
assert.equal(invalida.contagens.duracoesSuspeitas, 1);
assert.match(_test.gerarAtividadesSemana([{ semana:"Semana 30", atividade:"Teste!.", prioridade:"P1", entregas:"Hoje" }], {}, periodo), /<w:t[^>]*>Atividade<\/w:t>/);
assert.doesNotMatch(_test.gerarAtividadesSemana([{ semana:"Semana 30", atividade:"Teste", prioridade:"P1", entregas:"Hoje" }], {}, periodo), />Semana<\/w:t>/);
const zipSettings = novoZip(); _test.prepararTemplateParaGraficos(zipSettings); const settings = zipSettings.file("word/settings.xml").asText(); assert.match(settings, /<w:updateFields w:val="true"\/>/);
const templateXml = novoZip().file("word/document.xml").asText(); assert.match(templateXml, /TOC \\o &quot;1-3&quot;|TOC \\o "1-3"/);
}

// ========================================================
// EXECUÇÃO
// ========================================================

async function main() {
  const grupos = [
    ["Atividades API", testarAtividadesApi],
    ["Agrupamento de atividades", testarAgrupamentoAtividades],
    ["Fase e Item", testarFaseItem],
    ["Planner Modelos", testarPlannerModelos],
    ["Planner Sync", testarPlannerSync],
    ["Planner Checklist", testarPlannerChecklist],
    ["Gantt", testarGantt],
    ["Gantt do relatório", testarGanttRelatorio],
    ["Dashboard", testarDashboard],
    ["Dados gerenciais", testarDadosGerenciais],
    ["Gráficos do relatório", testarGraficosRelatorio],
    ["Ficha de obra", testarFichaObra],
    ["Central de Gestão", testarCentralGestao],
    ["Relatório Word", testarRelatorioWord],
  ];

  for (const [nome, teste] of grupos) {
    await executarGrupo(nome, teste);
  }

  console.log("\n-----------------------------------");
  console.log(`${grupos.length} conjuntos de testes concluídos.`);
  console.log("Todos os testes passaram.");
  console.log("-----------------------------------");
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
