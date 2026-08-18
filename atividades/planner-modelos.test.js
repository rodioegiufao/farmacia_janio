const assert = require("node:assert/strict");
const planner = require("./planner-modelos");

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

console.log("planner-modelos: todos os tipos de edificação estão definidos");