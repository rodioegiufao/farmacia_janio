(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATIVIDADE_SEMANAL_ORDENACAO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PESO_PRIORIDADE = { P3: 0, P2: 1, P1: 2, P0: 3 };

  function extrairDataEntrega(valor) {
    const texto = String(valor || "");
    const correspondencia = texto.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!correspondencia) return null;

    const dia = Number(correspondencia[1]);
    const mes = Number(correspondencia[2]);
    const ano = Number(correspondencia[3]);
    const data = new Date(Date.UTC(ano, mes - 1, dia));

    if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
    return data.getTime();
  }

  function compararAtividadesSemanais(a = {}, b = {}) {
    const prioridadeA = PESO_PRIORIDADE[String(a.prioridade || "").toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
    const prioridadeB = PESO_PRIORIDADE[String(b.prioridade || "").toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

    const entregaA = extrairDataEntrega(a.entregas);
    const entregaB = extrairDataEntrega(b.entregas);
    if (entregaA !== null && entregaB !== null && entregaA !== entregaB) return entregaA - entregaB;
    if (entregaA !== null && entregaB === null) return -1;
    if (entregaA === null && entregaB !== null) return 1;

    return String(a.atividade || "").localeCompare(String(b.atividade || ""), "pt-BR", {
      numeric: true,
      sensitivity: "base"
    });
  }

  function ordenarAtividadesSemanais(lista = []) {
    return [...lista].sort(compararAtividadesSemanais);
  }

  return { extrairDataEntrega, compararAtividadesSemanais, ordenarAtividadesSemanais };
});