const assert = require("node:assert/strict");
const sync = require("./_planner-sync");

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
console.log("planner-sync: 17 assertions passaram");