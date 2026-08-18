(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FASE_ITEM_ATIVIDADE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Fonte canônica da classificação usada pelo formulário e pelo Planner.
  const taxonomiaPorProjeto = {
    "CFTV": {
      "Estudos": ["ABNT NBR IEC 62676", "ABNT NBR 16264", "ABNT NBR 5410", "ABNT NBR 14565"],
      "Lançamento": ["Câmeras Bullet", "Câmeras Dome", "Câmera IP/Wi-fi", "Switch", "Patch Panel", "Conectores", "Rack", "NVR/DVR"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["CFTV"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "Cabeamento", "Telefonia"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Cabeamento": {
      "Estudos": ["ABNT NBR 14565", "ABNT NBR 16455", "ABNT NBR 16264", "ABNT NBR 5410"],
      "Lançamento": ["Tomada RJ45", "Acess Point", "Wi-fi", "Switch", "Patch Panel", "Conectores", "Rack"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Cabeamento"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "CFTV", "Telefonia"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Telefonia": {
      "Estudos": ["ABNT NBR 14565", "ABNT NBR 16455", "ABNT NBR 16264", "ABNT NBR 5410"],
      "Lançamento": ["Tomada RJ45", "Tomada RJ11", "Switch", "Patch Panel", "Conectores", "Rack"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Telefonia"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "CFTV", "Cabeamento"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Elétrico Baixa Tensão": {
      "Estudos": ["ABNT NBR 5410", "ABNT NBR 5419", "NR 10", "ABNT NBR 13534", "RDC nº 50 da ANVISA", "SOMASUS", "NR 35"],
      "Lançamento": ["Iluminação", "Tomadas de Uso Geral", "Tomadas de Uso Específico", "Iluminação de Emergência", "Climatização", "Exaustão", "IT-médico", "Quadro de distribuição", "Nobreak"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Iluminação", "Iluminação de Emergência", "Tomadas", "Tomadas de Uso Geral", "Tomadas de Uso Específico", "Climatização", "Exaustão", "Climatização e Exaustão"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "CFTV", "Cabeamento", "Telefonia"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Iluminação Externa": {
      "Estudos": ["ABNT NBR 5410", "ABNT NBR 5419", "NR 10", "NR 35"],
      "Lançamento": ["Arandela", "Poste", "Spot"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa", "Caixas de Passagem"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Iluminação Externa"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "Elétrico", "CFTV", "Cabeamento", "Telefonia"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "SPDA": {
      "Estudos": ["ABNT NBR 5410", "ABNT NBR 5419", "NR 10", "NR 35"],
      "Lançamento": ["Malha de Captação", "Malha de Aterramento", "Spot"],
      "Distribuição": ["Caixas de Passagem", "Hastes de aterramento", "Minicaptor", "Captor Franklin", "Re-bar"],
      "Plotagem": ["SPDA"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "Elétrico", "Iluminação Externa", "CFTV", "Cabeamento", "Telefonia"],
      "Documentos": ["Memorial", "Gerenciamento de risco", "Relatório"]
    },
    "Subestação": {
      "Estudos": ["ABNT NBR 5410", "ABNT NBR 14039", "ABNT NBR 15751", "ABNT NBR 7117", "MPN-DC-01/NDEE-01", "NR 10", "NR 35"],
      "Análise de Projeto": ["Elétrico", "Alimentadores", "Iluminação Externa"],
      "Desenhos": ["Cortes", "Diagrama Unifilar", "Planta Baixar", "Mapa Chave"],
      "Distribuição": ["Vergalhão", "Poste", "Caixa", "Conector", "Disjuntor", "Gerador", "Transformador", "TC/TP"],
      "Plotagem": ["Subestação"],
      "Compatibilização": ["Estrutural", "Arquitetura"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Alimentador": {
      "Estudos": ["ABNT NBR 5410", "ABNT NBR 5419", "ABNT NBR 14039", "NR 10", "NR 35"],
      "Lançamento": ["Quadro de distribuição", "Quadro Geral de Baixa Tensão", "Nobreak"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Alimentador", "Alimentador 220V", "Alimentador 380V"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "CFTV", "Cabeamento", "Iluminação Externa", "Telefonia"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Mapa Chave/Situação": {
      "Análise de Projeto": ["Localização do Projeto"],
      "Desenhos": ["Mapa Chave", "Situação"],
      "Distribuição": ["Vergalhão", "Poste", "Caixa", "Conector", "Disjuntor", "Gerador", "Transformador", "TC/TP"],
      "Plotagem": ["Mapa Chave", "Situação"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Sonorização": {
      "Estudos": ["ABNT NBR 10151", "ABNT NBR 10152"],
      "Lançamento": ["Caixa de som", "Mesa de som", "Microfone", "Gerenciador de sistemas (DSP)", "Direct Box (DI)", "Rack"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Sonorização"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "CFTV", "Telefonia"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Solar": {
      "Estudos": ["ABNT NBR 16690", "ABNT NBR 16274", "ABNT NBR 5410", "ABNT NBR 14039", "REN 1.000/2021", "PRODIST (Módulo 3)", "ABNT NBR 5419 (Partes 1 a 4)"],
      "Lançamento": ["Painel Fotovoltaico", "Inversor", "Quadro CC", "Quadro CA"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Sonorização"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "CFTV", "Telefonia", "SPDA"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Automação": {
      "Estudos": ["ABNT NBR ISO 13849 / IEC 62061", "ISA-88 (IEC 61512)", "ISA-95 (IEC 62264", "IEC 61131-3", "ISO/IEC 14543", "BACnet (ISO 16484-5)", "IEC 62443", "NR-12"],
      "Lançamento": ["Pontos"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Automação"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão", "CFTV", "Telefonia", "SPDA"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Lógica": {
      "Estudos": ["ABNT NBR 14565", "ABNT NBR 16455", "ABNT NBR 16264", "ABNT NBR 5410", "ABNT NBR IEC 62676", "ABNT NBR 16264"],
      "Lançamento": ["Câmeras Bullet", "Câmeras Dome", "Câmera IP/Wi-fi", "Tomada RJ45", "Tomada RJ11", "NVR/DVR", "Acess Point", "Wi-fi", "Switch", "Patch Panel", "Conectores", "Rack"],
      "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Eletroduto PEAD", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["Cabeamento", "CFTV", "Telefonia"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "SDAI": {
      "Estudos": ["ABNT NBR 17240", "ABNT NBR 5410", "ABNT NBR 11836", "ABNT NBR ISO 7240", "ABNT NBR IEC 62676", "Instruções Técnicas do Corpo de Bombeiros (ITs/NTs)"],
      "Lançamento": ["Central de Alarme de Incêndio", "Detector de Fumaça", "Detector de Temperatura", "Detector de Térmicos", "Acionadores", "Sinalizador", "Fonte Auxiliar"],
      "Distribuição": ["Eletrocalha", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar"],
      "Plotagem": ["SDAI"],
      "Compatibilização": ["Estrutural", "Arquitetura", "Elétrico", "Hidráulico", "Sanitário", "Climatização", "Exaustão"],
      "Documentos": ["Memorial", "Relatório"]
    },
    "Média Tensão": {
      "Estudos": ["ABNT NBR 14039", "ABNT NBR 5410", "ABNT NBR 15688", "Normas Técnicas das Concessionárias", "ABNT NBR 5419", "Instruções Técnicas do Corpo de Bombeiros (ITs/NTs)"],
      "Lançamento": ["Central de Alarme de Incêndio", "Detector de Fumaça", "Detector de Temperatura", "Detector de Térmicos", "Acionadores", "Sinalizador", "Fonte Auxiliar"],
      "Distribuição": ["Eletrocalha", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Conduletes", "Saídas e Base Fixa"],
      "Circuitos": ["Dimensionar", "Nomear", "Numerar", "Renumerar", "Diagrama Unifilar Geral"],
      "Plotagem": ["Média Tensão", "Eletrificação Rural"],
      "Documentos": ["Memorial", "Relatório"]
    }
  };
  const projetosComFaseItem = Object.freeze(Object.keys(taxonomiaPorProjeto));
  const obterProjetosComFaseItem = () => [...projetosComFaseItem];
  const projetoExigeFaseItem = (projeto) => Object.prototype.hasOwnProperty.call(taxonomiaPorProjeto, String(projeto || ""));
  const obterFasesDoProjeto = (projeto) => projetoExigeFaseItem(projeto) ? [...Object.keys(taxonomiaPorProjeto[projeto]), "Outros"] : [];
  function obterItensDoProjetoFase(projeto, fase) {
    if (!projetoExigeFaseItem(projeto)) return [];
    if (fase === "Outros") return ["Outros"];
    const itens = taxonomiaPorProjeto[projeto][fase];
    return Array.isArray(itens) ? [...new Set(itens), "Outros"] : [];
  }
  function valorFinal(valorSelecionado, valorOutro) {
    return valorSelecionado === "Outros" ? String(valorOutro || "").trim() : String(valorSelecionado || "");
  }
  const separarItens = (valor) => String(valor || "").split(" · ").map((item) => item.trim()).filter(Boolean);
  function valorFinalMultiplos(valoresSelecionados, valorOutro) {
    const itens = Array.from(valoresSelecionados || []).filter((item) => item && item !== "Outros");
    const outro = String(valorOutro || "").trim();
    if (outro) itens.push(...separarItens(outro));
    return [...new Set(itens)].join(" · ");
  }
  function prepararEdicao(projeto, faseSalva, itemSalvo) {
    const suportado = projetoExigeFaseItem(projeto);
    const fase = String(faseSalva || "");
    const itens = separarItens(itemSalvo);
    const fasesDisponiveis = obterFasesDoProjeto(projeto);
    const fasePadrao = suportado && fasesDisponiveis.includes(fase) && fase !== "Outros";
    const faseSelecionada = fase ? (fasePadrao ? fase : "Outros") : "";
    const itensDisponiveis = fasePadrao ? obterItensDoProjetoFase(projeto, fase) : (faseSelecionada ? ["Outros"] : []);
    const itensPadrao = itens.filter((item) => itensDisponiveis.includes(item) && item !== "Outros");
    const itensOutros = itens.filter((item) => !itensDisponiveis.includes(item) || item === "Outros");
    return { projetoSuportado: suportado, fasesDisponiveis, faseSelecionada, faseOutro: fase && !fasePadrao ? fase : "", itensSelecionados: [...itensPadrao, ...(itensOutros.length ? ["Outros"] : [])], itemOutro: itensOutros.filter((item) => item !== "Outros").join(" · "), itensDisponiveis };
  }
  function taxonomiaPlannerCompleta(projeto) {
    if (!projetoExigeFaseItem(projeto)) return [];
    return Object.keys(taxonomiaPorProjeto[projeto]).map((fase) => ({ etapa: fase, estagios: obterItensDoProjetoFase(projeto, fase).filter((item) => item !== "Outros") }));
  }
  return { taxonomiaPorProjeto, projetosComFaseItem, obterProjetosComFaseItem, obterFasesDoProjeto, obterItensDoProjetoFase, projetoExigeFaseItem, valorFinal, valorFinalMultiplos, separarItens, prepararEdicao, taxonomiaPlannerCompleta };
});
