(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./fase-item") : root.FASE_ITEM_ATIVIDADE);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) Object.assign(root, api);
})(typeof globalThis !== "undefined" ? globalThis : this, function (faseItem) {
  "use strict";

  const TIPOS_BT = ["Prédios Públicos Gerais", "Prédios Públicos de Saúde sem IT-Médico", "Prédios Públicos de Saúde com IT-Médico", "Prédios Privados Gerais", "Prédios Privados Pequenos (<200m²)"];
  const projetos = [
    ["CFTV", "PRJ-CFTV", "CFTV", []],
    ["Cabeamento", "PRJ-CAB", "Cabeamento", []],
    ["Telefonia", "PRJ-TEF", "Telefonia", []],
    ["Elétrico Baixa Tensão", "PRJ-ELE", "Projeto Elétrico Baixa Tensão", ["Projeto Elétrico Baixa Tensão", "Projetos Elétricos de Baixa Tensão", "Projetos Eléticos de Baixa Tensão"]],
    ["Iluminação Externa", "PRJ-ILUX", "Projeto de Iluminação Externa", ["Projeto Elétrico de Iluminação Externa", "Projetos Elétricos de Iluminação Externa", "ILUX"]],
    ["SPDA", "PRJ-SPDA", "Projeto de SPDA", []],
    ["Subestação", "PRJ-SUB", "Projeto de Subestação", []],
    ["Alimentador", "PRJ-ALI", "Projeto Elétrico de Alimentadores", ["Alimentadores", "Projeto de Alimentadores", "Projetos Elétricos de Alimentadores", "ALI"]],
    ["Mapa Chave/Situação", "", "Mapa Chave/Situação", []],
    ["Sonorização", "PRJ-SOM", "Sonorização", []],
    ["Solar", "PRJ-FOT", "Solar", ["Fotovoltaico"]],
    ["Automação", "PRJ-ATM", "Automação", []],
    ["Lógica", "PRJ-LOG", "Projeto de Lógica Estruturada", []],
    ["SDAI", "PRJ-SDAI", "SDAI", []],
    ["Média Tensão", "", "Média Tensão", []]
  ].map(([projeto, codigoProjeto, bucket, aliases]) => ({ projeto, codigoProjeto, bucket, aliasesProjeto: [...aliases, codigoProjeto].filter(Boolean) }));

  function normalizarChavePlanner(valor) {
    return String(valor ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—−]/g, "-").replace(/\s+/g, " ").toLowerCase();
  }
  function obterProjetoPlanner(valor) {
    const chave = normalizarChavePlanner(valor);
    return projetos.find((meta) => [meta.projeto, ...meta.aliasesProjeto].some((nome) => normalizarChavePlanner(nome) === chave)) || null;
  }
  function normalizarProjetoPlanner(valor) { return normalizarChavePlanner(obterProjetoPlanner(valor)?.projeto || valor); }

  const PLANNER_MODELOS = projetos.flatMap((meta) => {
    const tipos = meta.projeto === "Elétrico Baixa Tensão" ? TIPOS_BT : ["Tipo não definido"];
    return tipos.map((tipo) => ({ ...meta, aliasesProjeto: [...meta.aliasesProjeto], tipo, etapas: faseItem.taxonomiaPlannerCompleta(meta.projeto) }));
  });
  function localizarModeloPlanner(projetoInformado, tipoInformado, modelos = PLANNER_MODELOS) {
    const projetoNormalizado = normalizarProjetoPlanner(projetoInformado);
    const tipoNormalizado = normalizarChavePlanner(tipoInformado || "Tipo não definido");
    return modelos.find((modelo) => normalizarProjetoPlanner(modelo.projeto) === projetoNormalizado && normalizarChavePlanner(modelo.tipo) === tipoNormalizado) || null;
  }
  function obterBucketModeloPlanner(projeto, codigoProjeto = "") {
    return obterProjetoPlanner(projeto)?.bucket || obterProjetoPlanner(codigoProjeto)?.bucket || "";
  }
  function obterCodigoProjetoPlanner(projeto) { return obterProjetoPlanner(projeto)?.codigoProjeto || ""; }
  return { PLANNER_MODELOS, PROJETOS_PLANNER: projetos, normalizarChavePlanner, normalizarProjetoPlanner, obterProjetoPlanner, localizarModeloPlanner, obterBucketModeloPlanner, obterCodigoProjetoPlanner };
});