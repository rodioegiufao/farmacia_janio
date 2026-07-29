(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PLANNER_MODELOS = api.PLANNER_MODELOS;
  root.normalizarChavePlanner = api.normalizarChavePlanner;
  root.normalizarProjetoPlanner = api.normalizarProjetoPlanner;
  root.localizarModeloPlanner = api.localizarModeloPlanner;
  root.obterBucketModeloPlanner = api.obterBucketModeloPlanner;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PROJETO_BAIXA_TENSAO = {
    projeto: "Projetos Elétricos de Baixa Tensão",
    aliasesProjeto: ["Projetos Eléticos de Baixa Tensão"],
    codigoProjeto: "PRJ-ELE",
    bucket: "Projeto Elétrico Baixa Tensão"
  };
  const PROJETO_ALIMENTADORES = {
    projeto: "Projetos Elétricos de Alimentadores",
    aliasesProjeto: [
      "Projetos Elétricos de Alimentadores",
      "Projetos Eléticos de Alimentadores",
      "Projeto Elétrico de Alimentadores",
      "Projeto de Alimentadores",
      "Alimentadores",
      "Alimentador",
      "ALI",
      "PRJ-ALI"
    ],
    codigoProjeto: "PRJ-ALI",
    bucket: "Projeto Elétrico de Alimentadores"
  };
  const PROJETO_ILUX = {
    projeto: "Projetos Elétricos de Iluminação Externa",
    aliasesProjeto: [
      "Projetos Elétricos de Iluminação Externa",
      "Projetos Eléticos de Iluminação Externa",
      "Projeto Elétrico de Iluminação Externa",
      "Projeto de Iluminação Externa",
      "Iluminação Externa",
      "ILUX",
      "PRJ-ILUX"
    ],
    codigoProjeto: "PRJ-ILUX",
    bucket: "Projeto de Iluminação Externa"
  };
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
  const criarModeloBaixaTensao = (tipo, alteracoes) => ({
    ...PROJETO_BAIXA_TENSAO,
    aliasesProjeto: [...PROJETO_BAIXA_TENSAO.aliasesProjeto],
    tipo,
    etapas: etapas(alteracoes)
  });

  const etapasAlimentador = [
    { etapa: "Lançamento", estagios: ["Quadros existentes", "Quadros novos", "Criação de peças e itens do QGBT", "Pontos de Emergência", "Pontos de Climatização", "Pontos de Exaustão"] },
    { etapa: "Distribuição", estagios: ["Eletrocalhas", "Perfilados", "Caixas de passagens", "Eletrodutos", "Pontos de Conexão"] },
    { etapa: "Plotagem", estagios: ["Alimentador"] },
    { etapa: "Compatibilização", estagios: ["Alimentador com outras disciplinas"] },
    { etapa: "Estudos", estagios: ["NBR-14039", "NBR-5410", "Livros Mamede", "Manual de Plotagem"] }
  ];
  const etapasIlux = [
    { etapa: "Lançamento", estagios: ["Pontos de iluminação externa", "Aprovação do Salomão/Rodrigo", "Locação do quadro"] },
    { etapa: "Distribuição", estagios: ["Eletrocalhas", "Perfilados", "Caixas de passagens", "Eletrodutos", "Pontos de Conexão"] },
    { etapa: "Plotagem", estagios: ["Iluminação Externa"] },
    { etapa: "Compatibilização", estagios: ["Iluminação externa com outras disciplinas"] },
    { etapa: "Estudos", estagios: ["NBR-5101", "NBR-5410", "NBR-5413 e ABNT NBR 8995-1", "Livros Mamede", "Manual de Plotagem"] }
  ];
  const criarModeloDisciplina = (projeto, tipo, grupos) => ({
    ...projeto,
    aliasesProjeto: [...projeto.aliasesProjeto],
    tipo,
    etapas: grupos.map((grupo) => ({ etapa: grupo.etapa, estagios: [...grupo.estagios] }))
  });
  const criarModeloAlimentador = (tipo) => criarModeloDisciplina(PROJETO_ALIMENTADORES, tipo, etapasAlimentador);
  const criarModeloIlux = (tipo) => criarModeloDisciplina(PROJETO_ILUX, tipo, etapasIlux);
  const PLANNER_MODELOS = [
    criarModeloBaixaTensao("Prédios Públicos Gerais"),
    criarModeloBaixaTensao("Prédios Públicos de Saúde sem IT-Médico", { estudos: ["RDC/SOMASUS", ...base.estudos] }),
    criarModeloBaixaTensao("Prédios Públicos de Saúde com IT-Médico", {
      lancamento: [...base.lancamento, "Pontos de IT-médico"],
      plotagem: [...base.plotagem, "IT-médico"],
      estudos: ["RDC/SOMASUS", ...base.estudos]
    }),
    criarModeloBaixaTensao("Prédios Privados Gerais", {
      distribuicao: ["Eletrocalhas, Perfilados, Cabos PP e Eltrodutos", "Pontos de Conexão"]
    }),
    criarModeloBaixaTensao("Prédios Privados Pequenos (<200m²)", {
      distribuicao: ["Eletrodutos", "Pontos de Conexão"],
      plotagem: ["Iluminação", "Tomadas de Uso Geral, específico, emergência, climatização"]
    }),
    criarModeloAlimentador("Prédios Públicos Gerais"),
    criarModeloAlimentador("Prédios Privados Gerais"),
    criarModeloIlux("Prédios Públicos Gerais"),
    criarModeloIlux("Prédios Privados Gerais")
  ];

  function normalizarChavePlanner(valor) {
    return String(valor ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-").replace(/\s+/g, " ").toLowerCase();
  }
  function normalizarProjetoPlanner(valor) {
    const normalizado = normalizarChavePlanner(valor);
    for (const projeto of [PROJETO_BAIXA_TENSAO, PROJETO_ALIMENTADORES, PROJETO_ILUX]) {
      const nomes = [projeto.projeto, ...projeto.aliasesProjeto].map(normalizarChavePlanner);
      if (nomes.includes(normalizado)) return normalizarChavePlanner(projeto.projeto);
    }
    return normalizado;
  }
  function localizarModeloPlanner(projetoInformado, tipoInformado, modelos = PLANNER_MODELOS) {
    const projetoNormalizado = normalizarProjetoPlanner(projetoInformado);
    const tipoNormalizado = normalizarChavePlanner(tipoInformado);
    return modelos.find((modelo) => {
      const projetosDoModelo = [modelo.projeto, ...(modelo.aliasesProjeto || [])]
        .map(normalizarProjetoPlanner);
      return projetosDoModelo.includes(projetoNormalizado)
        && normalizarChavePlanner(modelo.tipo) === tipoNormalizado;
    }) || null;
  }
  function obterBucketModeloPlanner(projeto, codigoProjeto = "", modelos = PLANNER_MODELOS) {
    const chaves = [projeto, codigoProjeto].map(normalizarProjetoPlanner).filter(Boolean);
    return modelos.find((modelo) => chaves.includes(normalizarProjetoPlanner(modelo.projeto)))?.bucket || "";
  }
  return { PLANNER_MODELOS, normalizarChavePlanner, normalizarProjetoPlanner, localizarModeloPlanner, obterBucketModeloPlanner };
});