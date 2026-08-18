(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FASE_ITEM_ATIVIDADE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const fases = ["Lançamento", "Distribuição", "Plotagem", "Estudos", "Compatibilização", "Circuitos", "Outros"];
  const projetosComFaseItem = [
    "CFTV", "Cabeamento", "Telefonia", "Elétrico Baixa Tensão", "Iluminação Externa",
    "SPDA", "Subestação", "Alimentador", "Mapa Chave/Situação", "Sonorização", "Solar",
    "Automação", "Lógica", "Média Tensão"
  ];
  const itensPorFase = {
    "Lançamento": ["Iluminação", "Tomadas de Uso Geral", "Tomada de Uso Específico", "Climatização", "Exaustão", "IT-médico", "roteador", "rack", "quadro", "Access Point", "Tomada RJ45", "Tomada RJ11", "Outros"],
    "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Cabo PP", "Outros"],
    "Plotagem": ["Iluminação", "Tomadas", "Emergência", "Climatização", "Exaustão", "IT-médico", "Cabeamento Estruturado", "CFTV", "Lógica", "Solar", "Telefonia", "SPDA", "Subestação", "Alimentador", "Iluminação externa", "Sonorização", "Automação", "Média Tensão", "Outros"],
    "Estudos": ["NBR-5410", "NBR-5413", "NBR ISO-8995-1", "Outros"],
    "Compatibilização": ["Estrutural", "Arquitetura", "Hidráulico", "Sanitário", "Outros"],
    "Circuitos": ["Nomear", "Renumerar", "Numerar", "Dimensionamento"],
    "Outros": ["Outros"]
  };
  function valorFinal(valorSelecionado, valorOutro) {
    return valorSelecionado === "Outros" ? String(valorOutro || "").trim() : String(valorSelecionado || "");
  }
  function projetoExigeFaseItem(projeto) {
    return projetosComFaseItem.includes(String(projeto || ""));
  }
  function separarItens(valor) {
    return String(valor || "").split(" · ").map((item) => item.trim()).filter(Boolean);
  }
  function valorFinalMultiplos(valoresSelecionados, valorOutro) {
    const itens = Array.from(valoresSelecionados || []).filter((item) => item && item !== "Outros");
    const outro = String(valorOutro || "").trim();
    if (outro) itens.push(outro);
    return [...new Set(itens)].join(" · ");
  }
  function prepararEdicao(faseSalva, itemSalvo) {
    const fase = String(faseSalva || "");
    const itens = separarItens(itemSalvo);
    const fasePadrao = fases.includes(fase) && fase !== "Outros";
    const faseSelecionada = fase ? (fasePadrao ? fase : "Outros") : "";
    const itensDisponiveis = itensPorFase[faseSelecionada] || [];
    const itensPadrao = itens.filter((item) => itensDisponiveis.includes(item) && item !== "Outros");
    const itensOutros = itens.filter((item) => !itensDisponiveis.includes(item) || item === "Outros");
    return {
      faseSelecionada,
      faseOutro: fase && !fasePadrao ? fase : "",
      itensSelecionados: [...itensPadrao, ...(itensOutros.length ? ["Outros"] : [])],
      itemOutro: itensOutros.filter((item) => item !== "Outros").join(" · "),
      itensDisponiveis
    };
  }
  function taxonomiaPlannerCompleta() {
    return fases.filter((fase) => fase !== "Outros").map((fase) => ({
      etapa: fase,
      estagios: (itensPorFase[fase] || []).filter((item) => item !== "Outros")
    }));
  }
  return { fases, projetosComFaseItem, itensPorFase, projetoExigeFaseItem, valorFinal, valorFinalMultiplos, separarItens, prepararEdicao, taxonomiaPlannerCompleta };
});
