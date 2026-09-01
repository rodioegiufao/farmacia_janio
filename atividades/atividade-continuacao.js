(function (root, factory) {
  const classificacoes = root?.CLASSIFICACOES_ATIVIDADE || (typeof require === "function" ? require("./classificacoes") : null);
  const api = factory(classificacoes);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATIVIDADE_CONTINUACAO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (CLASSIFICACOES) {
  "use strict";
  const copiarClassificacoes = (atividade) => CLASSIFICACOES.obterClassificacoesAtividade(atividade).map((item) => ({
    fase: item.fase, item: item.item, itemOutro: item.itemOutro, minutosDedicados: 0
  }));
  function prepararContinuacaoAtividade(atividade = {}, { dataAtual = "", colaborador = "", statusInicial = "Em progresso" } = {}) {
    return {
      colaborador: colaborador || atividade.colaborador || "",
      obra: atividade.obra || "", obraId: atividade.obraId || atividade.obra_id || "",
      prioridade: atividade.prioridade || "", projeto: atividade.projeto || "",
      fase: atividade.fase || "", item: atividade.item || "", classificacoes: copiarClassificacoes(atividade),
      etapa: atividade.etapa || "", dataPrevista: "",
      dataInicio: dataAtual, horaInicio: "", dataTermino: "", horaTermino: "",
      trabalhos: "", observacoes: "", status: statusInicial
    };
  }
  return { prepararContinuacaoAtividade };
});