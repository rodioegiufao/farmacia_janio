const assert = require("node:assert/strict");
const { fases, itensPorFase, valorFinal, prepararEdicao } = require("./fase-item");

assert.deepEqual(fases, ["Lançamento", "Distribuição", "Plotagem", "Estudos", "Compatibilização", "Outros"]);
assert.deepEqual(itensPorFase.Distribuição, ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Cabo PP", "Outros"]);
assert.ok(itensPorFase.Estudos.includes("NBR-5410"));
assert.ok(itensPorFase.Compatibilização.includes("Arquitetura"));
assert.equal(valorFinal("Distribuição", ""), "Distribuição");
assert.equal(valorFinal("Outros", "  Levantamento  "), "Levantamento");
assert.equal(valorFinal("Outros", "  Canaleta  "), "Canaleta");
assert.deepEqual(prepararEdicao("Distribuição", "Eletrocalha"), { faseSelecionada: "Distribuição", faseOutro: "", itemSelecionado: "Eletrocalha", itemOutro: "", itensDisponiveis: itensPorFase.Distribuição });
assert.deepEqual(prepararEdicao("Distribuição", "Canaleta"), { faseSelecionada: "Distribuição", faseOutro: "", itemSelecionado: "Outros", itemOutro: "Canaleta", itensDisponiveis: itensPorFase.Distribuição });
assert.deepEqual(prepararEdicao("Levantamento", "Conferência existente"), { faseSelecionada: "Outros", faseOutro: "Levantamento", itemSelecionado: "Outros", itemOutro: "Conferência existente", itensDisponiveis: itensPorFase.Outros });
assert.deepEqual(prepararEdicao(null, null), { faseSelecionada: "", faseOutro: "", itemSelecionado: "", itemOutro: "", itensDisponiveis: [] });
console.log("Testes de Fase e Item das atividades: OK");
