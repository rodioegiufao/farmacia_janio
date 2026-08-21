(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CLASSIFICACOES_ATIVIDADE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const texto = (v) => String(v ?? "").trim();
  const chaveClassificacao = (fase, item) => `${texto(fase).normalize("NFC")}::${texto(item).normalize("NFC")}`;
  // Convenção: item = nome real; itemOutro = booleano da UI/domínio;
  // item_outro = texto persistido do item personalizado (ou null).
  function duracaoAtividadeMinutos(a = {}) {
    const di = a.dataInicio || a.data_inicio, hi = a.horaInicio || a.hora_inicio;
    const df = a.dataTermino || a.data_termino, hf = a.horaTermino || a.hora_termino;
    if (!di || !hi || !df || !hf) return 0;
    const inicio = Date.parse(`${di}T${hi}`), fim = Date.parse(`${df}T${hf}`);
    return Number.isFinite(inicio) && Number.isFinite(fim) && fim > inicio ? Math.round((fim - inicio) / 60000) : 0;
  }
  function normalizarClassificacao(c = {}) {
    const fase = texto(c.fase);
    const itemOutroTexto = typeof c.item_outro === "string" ? texto(c.item_outro) : "";
    // Campos booleanos nunca participam da escolha do nome da classificação.
    const item = itemOutroTexto || (typeof c.item === "string" ? texto(c.item) : "");
    const itemOutro = Boolean(itemOutroTexto) || c.itemOutro === true;
    const minutosDedicados = Number(c.minutos_dedicados ?? c.minutosDedicados ?? 0);
    return { id: c.id || "", fase, item, itemOutro, minutosDedicados: Number.isInteger(minutosDedicados) && minutosDedicados >= 0 ? minutosDedicados : 0, chave: chaveClassificacao(fase, item) };
  }
  function obterClassificacoesAtividade(atividade = {}) {
    const novas = atividade.classificacoes || atividade.atividade_classificacoes;
    if (Array.isArray(novas) && novas.length) return novas.map(normalizarClassificacao).filter((c) => c.fase && c.item);
    const fase = texto(atividade.fase), itens = texto(atividade.item).split(" · ").map(texto).filter(Boolean);
    if (!fase || !itens.length) return [];
    const total = duracaoAtividadeMinutos(atividade), base = Math.floor(total / itens.length), resto = total % itens.length;
    return itens.map((item, i) => normalizarClassificacao({ fase, item, minutosDedicados: base + (i < resto ? 1 : 0) }));
  }
  function dividirIgualmente(total, quantidade) {
    total = Math.max(0, Math.trunc(Number(total) || 0)); quantidade = Math.max(0, Math.trunc(Number(quantidade) || 0));
    if (!quantidade) return [];
    const base = Math.floor(total / quantidade), resto = total % quantidade;
    return Array.from({ length: quantidade }, (_, i) => base + (i < resto ? 1 : 0));
  }
  function validarRateio(classificacoes, total) {
    const distribuido = classificacoes.reduce((s, c) => s + normalizarClassificacao(c).minutosDedicados, 0);
    return { valido: classificacoes.length > 0 && total > 0 && distribuido === total, distribuido, restante: total - distribuido };
  }
  function aplicarRegraRateio(classificacoes = [], total = 0, exigeClassificacao = true) {
    const lista = classificacoes.map(normalizarClassificacao);
    if (!exigeClassificacao) return { classificacoes: [], valido: true, motivo: "nao_aplicavel", distribuido: 0, restante: total };
    if (!lista.length) return { classificacoes: lista, valido: false, motivo: "classificacao_ausente", distribuido: 0, restante: total };
    if (lista.length === 1) lista[0].minutosDedicados = Math.max(0, Math.trunc(Number(total) || 0));
    const rateio = validarRateio(lista, total);
    return { classificacoes: lista, ...rateio, motivo: lista.length === 1 ? "automatico" : (rateio.valido ? "rateio_valido" : "rateio_invalido") };
  }
  const deveMostrarRateio = ({ exigeClassificacao, classificacoes = [], duracaoMinutos = 0 } = {}) => Boolean(exigeClassificacao && classificacoes.length > 1 && duracaoMinutos > 0);
  return { aplicarRegraRateio, chaveClassificacao, deveMostrarRateio, dividirIgualmente, duracaoAtividadeMinutos, normalizarClassificacao, obterClassificacoesAtividade, validarRateio };
});