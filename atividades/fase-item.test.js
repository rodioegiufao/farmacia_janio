const assert = require("node:assert/strict");
const api = require("./fase-item");

assert.deepEqual(api.obterProjetosComFaseItem(), ["CFTV", "Cabeamento", "Telefonia", "Elétrico Baixa Tensão", "Iluminação Externa", "SPDA", "Subestação", "Alimentador", "Mapa Chave/Situação", "Sonorização", "Solar", "Automação", "Lógica", "SDAI", "Média Tensão"]);
api.obterProjetosComFaseItem().forEach((projeto) => assert.equal(api.projetoExigeFaseItem(projeto), true));
["", "Site", "Todos", "Outros"].forEach((projeto) => assert.equal(api.projetoExigeFaseItem(projeto), false));

assert.deepEqual(api.obterFasesDoProjeto("CFTV"), ["Estudos", "Lançamento", "Distribuição", "Circuitos", "Plotagem", "Compatibilização", "Documentos", "Outros"]);
assert.deepEqual(api.obterItensDoProjetoFase("CFTV", "Lançamento"), ["Câmeras Bullet", "Câmeras Dome", "Câmera IP/Wi-fi", "Switch", "Patch Panel", "Conectores", "Rack", "NVR/DVR", "Outros"]);
assert.deepEqual(api.obterItensDoProjetoFase("SPDA", "Distribuição"), ["Caixas de Passagem", "Hastes de aterramento", "Minicaptor", "Captor Franklin", "Re-bar", "Outros"]);
assert.ok(!api.obterFasesDoProjeto("SPDA").includes("Circuitos"));
assert.deepEqual(api.obterFasesDoProjeto("Subestação"), ["Estudos", "Análise de Projeto", "Desenhos", "Distribuição", "Plotagem", "Compatibilização", "Documentos", "Outros"]);
assert.deepEqual(api.obterFasesDoProjeto("Mapa Chave/Situação"), ["Análise de Projeto", "Desenhos", "Distribuição", "Plotagem", "Documentos", "Outros"]);
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

console.log("fase-item: 31 grupos de assertions passaram");