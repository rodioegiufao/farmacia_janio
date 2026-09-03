(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATIVIDADE_TEMPO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function obterIntervaloAtividade(atividade = {}) {
    if (!atividade.dataInicio || !atividade.horaInicio || !atividade.dataTermino || !atividade.horaTermino) return null;
    const inicio = new Date(`${atividade.dataInicio}T${atividade.horaInicio}`);
    const fim = new Date(`${atividade.dataTermino}T${atividade.horaTermino}`);
    return Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio ? null : { inicio, fim };
  }
  function calcularHorasAtividade(atividade) {
    if (atividade?.consolidada && Number.isFinite(Number(atividade.horasConsolidadas))) return Number(atividade.horasConsolidadas);
    const intervalo = obterIntervaloAtividade(atividade);
    return intervalo ? (intervalo.fim - intervalo.inicio) / 36e5 : 0;
  }
  function calcularHorasTrabalhadas(lista = []) {
    return lista.reduce((total, atividade) => total + calcularHorasAtividade(atividade), 0);
  }
  function formatarHoras(horas) {
    const valor = Number.isFinite(horas) ? horas : 0;
    return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}h`;
  }
  return { obterIntervaloAtividade, calcularHorasAtividade, calcularHorasTrabalhadas, formatarHoras };
});