const assert = require("assert");
const { ehProjetoBaixaTensao, gerarChaveItemPlanner, gerarChavePlanner, itensDaAtividade, minutosDaAtividade, normalizarItemPlanner, obterCodigoProjetoDaAtividade } = require("./_planner-sync");

["Elétrico Baixa Tensão", "Projeto Elétrico Baixa Tensão", "Projetos Elétricos de Baixa Tensão", "Projetos Eléticos de Baixa Tensão", "PRJ-ELE"].forEach((alias) => {
  assert.strictEqual(ehProjetoBaixaTensao(alias), true, alias);
  assert.strictEqual(obterCodigoProjetoDaAtividade(alias), "PRJ-ELE");
});
assert.strictEqual(ehProjetoBaixaTensao("CFTV"), false);
assert.strictEqual(gerarChavePlanner("obra-1", "PRJ-ELE"), "obra-1::PRJ-ELE");
assert.strictEqual(gerarChaveItemPlanner("Distribuição", "Eletrocalhas"), "distribuicao::eletrocalha");
assert.strictEqual(gerarChaveItemPlanner("Distribuição", "Eletrocalha"), "distribuicao::eletrocalha");
assert.strictEqual(normalizarItemPlanner("Tomadas de Uso Específico"), "tomada de uso especifico");
assert.deepStrictEqual(itensDaAtividade({ item: "Eletrocalha · Leito · Perfilado" }), ["Eletrocalha", "Leito", "Perfilado"]);
assert.strictEqual(minutosDaAtividade({ data_inicio: "2026-08-14", hora_inicio: "08:00", data_termino: "2026-08-14", hora_termino: "11:57" }), 237);
assert.strictEqual(minutosDaAtividade({ data_inicio: "2026-08-14", hora_inicio: "12:00", data_termino: "2026-08-14", hora_termino: "11:00" }), 0);
console.log("planner-sync: 18 assertions passed");