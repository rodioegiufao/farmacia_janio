(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FASE_ITEM_ATIVIDADE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const fases = ["Lançamento", "Distribuição", "Plotagem", "Estudos", "Compatibilização", "Outros"];
  const itensPorFase = {
    "Lançamento": ["Iluminação", "Tomadas de Uso Geral", "Tomada de Uso Específico", "Climatização", "Exaustão", "IT-médico", "roteador", "rack", "quadro", "Access Point", "Tomada RJ45", "Tomada RJ11", "Outros"],
    "Distribuição": ["Eletrocalha", "Leito", "Perfilado", "Eletroduto Flexível", "Eletroduto FG", "Cabo PP", "Outros"],
    "Plotagem": ["Iluminação", "Tomadas", "Emergência", "Climatização", "Exaustão", "IT-médico", "Cabeamento Estruturado", "CFTV", "Lógica", "Solar", "Telefonia", "SPDA", "Subestação", "Alimentador", "Iluminação externa", "Sonorização", "Automação", "Média Tensão", "Outros"],
    "Estudos": ["NBR-5410", "NBR-5413", "NBR ISO-8995-1", "Outros"],
    "Compatibilização": ["Estrutural", "Arquitetura", "Hidráulico", "Sanitário", "Outros"],
    "Outros": ["Outros"]
  };
  function valorFinal(valorSelecionado, valorOutro) {
    return valorSelecionado === "Outros" ? String(valorOutro || "").trim() : String(valorSelecionado || "");
  }
  function prepararEdicao(faseSalva, itemSalvo) {
    const fase = String(faseSalva || "");
    const item = String(itemSalvo || "");
    const fasePadrao = fases.includes(fase) && fase !== "Outros";
    const faseSelecionada = fase ? (fasePadrao ? fase : "Outros") : "";
    const itensDisponiveis = itensPorFase[faseSelecionada] || [];
    const itemPadrao = itensDisponiveis.includes(item) && item !== "Outros";
    return {
      faseSelecionada,
      faseOutro: fase && !fasePadrao ? fase : "",
      itemSelecionado: item ? (itemPadrao ? item : "Outros") : "",
      itemOutro: item && !itemPadrao ? item : "",
      itensDisponiveis
    };
  }
  return { fases, itensPorFase, valorFinal, prepararEdicao };
});
