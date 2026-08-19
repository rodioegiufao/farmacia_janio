(function (root, factory) {
  const agrupamento = root?.ATIVIDADE_AGRUPAMENTO || (typeof require === "function" ? require("./atividade-agrupamento") : null);
  const api = factory(agrupamento);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DADOS_GERENCIAIS_RELATORIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (AGRUPAMENTO) {
  "use strict";
  const STATUS = ["Atrasado", "Em progresso", "Pausado", "Finalizado"];
  const limpar = (valor, fallback) => String(valor || fallback || "").trim();
  const horasRegistro = (a = {}) => {
    const di = a.dataInicio || a.data_inicio, hi = a.horaInicio || a.hora_inicio;
    const df = a.dataTermino || a.data_termino, hf = a.horaTermino || a.hora_termino;
    const inicio = di && hi ? new Date(`${di}T${hi}`) : null, fim = df && hf ? new Date(`${df}T${hf}`) : null;
    if (inicio && fim && Number.isFinite(inicio.getTime()) && Number.isFinite(fim.getTime()) && fim > inicio) return (fim - inicio) / 36e5;
    return Number(a.horas) || 0;
  };
  const ordenar = (itens) => [...itens].sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "pt-BR"));
  function agregar(lista, obterLabel, obterValor = () => 1) {
    const mapa = new Map();
    lista.forEach((item) => { const label = limpar(obterLabel(item), "Não informado"); mapa.set(label, (mapa.get(label) || 0) + obterValor(item)); });
    return ordenar([...mapa].map(([label, valor]) => ({ label, valor: Number(valor.toFixed(2)) })));
  }
  function formatarLabelFrenteRelatorio(label) {
    const partes = String(label || "").split(/\s+[—–-]\s+/).map((p) => p.trim()).filter(Boolean);
    if (/^OBR-\d+$/i.test(partes[0] || "")) partes.shift();
    return partes.map((parte, i) => i ? parte.replace(/Elétrico Baixa Tensão/gi, "Elétrico BT") : parte).join(" · ");
  }
  function construirDadosGerenciaisRelatorio(registros = []) {
    if (!AGRUPAMENTO) throw new Error("Módulo de agrupamento indisponível.");
    const consolidadas = AGRUPAMENTO.consolidarAtividades(registros);
    const porColaborador = AGRUPAMENTO.consolidarAtividadesPorColaborador(registros);
    const frente = (a) => `${a.obraCodigo ? `${a.obraCodigo} — ` : ""}${limpar(a.obra, "Obra não informada")} — ${limpar(a.projeto, "Projeto não informado")}`;
    const horasPorColaborador = agregar(porColaborador, (a) => a.colaborador, (a) => Number(a.horasConsolidadas) || 0);
    const atividadesPorColaborador = agregar(porColaborador, (a) => a.colaborador);
    const horasPorFrente = agregar(consolidadas, frente, (a) => Number(a.horasConsolidadas) || 0);
    const atividadesPorFrente = agregar(consolidadas, frente);
    const status = STATUS.map((label) => ({ label, valor: consolidadas.filter((a) => limpar(a.status).toLowerCase() === label.toLowerCase()).length }));
    const total = consolidadas.length, finalizadas = status.find((x) => x.label === "Finalizado").valor;
    return {
      totalAtividades: total,
      horasTotais: Number(registros.reduce((s, a) => s + horasRegistro(a), 0).toFixed(2)),
      horasPorColaborador, atividadesPorColaborador,
      horasPorFrente, atividadesPorFrente,
      topHorasPorFrente: horasPorFrente.slice(0, 10).map((x) => ({ ...x, labelVisual: formatarLabelFrenteRelatorio(x.label) })),
      topAtividadesPorFrente: atividadesPorFrente.slice(0, 10).map((x) => ({ ...x, labelVisual: formatarLabelFrenteRelatorio(x.label) })),
      atividadesPorDisciplina: agregar(consolidadas, (a) => a.projeto || "Não informada"),
      status, statusLegenda: status.filter((x) => x.valor > 0), percentualFinalizadas: total ? Math.round(finalizadas * 100 / total) : 0
    };
  }
  return { construirDadosGerenciaisRelatorio, formatarLabelFrenteRelatorio, horasRegistro };
});