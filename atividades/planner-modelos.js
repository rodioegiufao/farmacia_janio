(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PLANNER_MODELOS = api.PLANNER_MODELOS;
  root.normalizarChavePlanner = api.normalizarChavePlanner;
  root.normalizarProjetoPlanner = api.normalizarProjetoPlanner;
  root.localizarModeloPlanner = api.localizarModeloPlanner;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const projeto = "Projetos Elétricos de Baixa Tensão";
  const aliasesProjeto = ["Projetos Eléticos de Baixa Tensão"];
  const codigoProjeto = "PRJ-ELE";
  const base = {
    lancamento: ["Pontos e Iluminação", "Tomadas de Uso Geral", "Tomadas de Uso Específico", "Pontos de Emergência", "Pontos de Climatização", "Pontos de Exaustão"],
    distribuicao: ["Eletrocalhas", "Perfilados", "Cabos PP", "Eletrodutos", "Pontos de Conexão"],
    plotagem: ["Iluminação", "Tomadas de Uso Geral", "Tomadas de Uso Específico", "Emergência", "Climatização", "Exaustão"],
    compatibilizacao: ["Eletrico com outras disciplinas"],
    estudos: ["NBR-5413 e ABNT NBR 8995-1", "NBR-5410", "Livros Mamede", "Manual de Plotagem"]
  };
  const etapas = (alteracoes = {}) => [
    { etapa: "Lançamento", estagios: alteracoes.lancamento || base.lancamento },
    { etapa: "Distribuição", estagios: alteracoes.distribuicao || base.distribuicao },
    { etapa: "Plotagem", estagios: alteracoes.plotagem || base.plotagem },
    { etapa: "Compatibilização", estagios: base.compatibilizacao },
    { etapa: "Estudos", estagios: alteracoes.estudos || base.estudos }
  ];
  const modelo = (tipo, alteracoes) => ({ projeto, aliasesProjeto: [...aliasesProjeto], codigoProjeto, tipo, etapas: etapas(alteracoes) });
  const PLANNER_MODELOS = [
    modelo("Prédios Públicos Gerais"),
    modelo("Prédios Públicos de Saúde sem IT-Médico", { estudos: ["RDC/SOMASUS", ...base.estudos] }),
    modelo("Prédios Públicos de Saúde com IT-Médico", {
      lancamento: [...base.lancamento, "Pontos de IT-médico"],
      plotagem: [...base.plotagem, "IT-médico"],
      estudos: ["RDC/SOMASUS", ...base.estudos]
    }),
    modelo("Prédios Privados Gerais", {
      distribuicao: ["Eletrocalhas, Perfilados, Cabos PP e Eltrodutos", "Pontos de Conexão"]
    }),
    modelo("Prédios Privados Pequenos (<200m²)", {
      distribuicao: ["Eletrodutos", "Pontos de Conexão"],
      plotagem: ["Iluminação", "Tomadas de Uso Geral, específico, emergência, climatização"]
    })
  ];

  function normalizarChavePlanner(valor) {
    return String(valor ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-").replace(/\s+/g, " ").toLowerCase();
  }
  function normalizarProjetoPlanner(valor) {
    const normalizado = normalizarChavePlanner(valor);
    const aliases = {
      "projetos eleticos de baixa tensao": "projetos eletricos de baixa tensao",
      "projetos eletricos de baixa tensao": "projetos eletricos de baixa tensao"
    };
    return aliases[normalizado] || normalizado;
  }
  function localizarModeloPlanner(projetoInformado, tipoInformado, modelos = PLANNER_MODELOS) {
    const projetoNormalizado = normalizarProjetoPlanner(projetoInformado);
    const tipoNormalizado = normalizarChavePlanner(tipoInformado);
    return modelos.find((item) => normalizarProjetoPlanner(item.projeto) === projetoNormalizado
      && normalizarChavePlanner(item.tipo) === tipoNormalizado) || null;
  }
  return { PLANNER_MODELOS, normalizarChavePlanner, normalizarProjetoPlanner, localizarModeloPlanner };
});