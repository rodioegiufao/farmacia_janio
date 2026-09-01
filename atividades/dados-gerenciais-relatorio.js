(function (root, factory) {
  const agrupamento = root?.ATIVIDADE_AGRUPAMENTO || (typeof require === "function" ? require("./atividade-agrupamento") : null);
  const classificacoes = root?.CLASSIFICACOES_ATIVIDADE || (typeof require === "function" ? require("./classificacoes") : null);
  const api = factory(agrupamento, classificacoes);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DADOS_GERENCIAIS_RELATORIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (AGRUPAMENTO, CLASSIFICACOES) {
  "use strict";
  const STATUS = ["Atrasado", "Em progresso", "Pausado", "Finalizado"];
  const limpar = (valor, fallback) => String(valor || fallback || "").trim();
  const horasRegistro = (a = {}) => CLASSIFICACOES.horasAtividade(a);
  const ordenar = (itens) => [...itens].sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "pt-BR"));
  const arredondar = (valor) => Number(Number(valor || 0).toFixed(2));
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
    const colaboradores = horasPorColaborador.map(({ label: nome, valor: horas }) => {
      const itens = porColaborador.filter((a) => limpar(a.colaborador) === nome);
      const concluidas = itens.filter((a) => limpar(a.status).toLowerCase() === "finalizado").length;
      return { nome, atividades: itens.length, lancamentos: itens.reduce((s, a) => s + Number(a.quantidadeRegistros || 1), 0), horas,
        frentes: new Set(itens.map(frente)).size, finalizadas: concluidas,
        atrasadas: itens.filter((a) => limpar(a.status).toLowerCase() === "atrasado").length,
        conclusao: itens.length ? Math.round(concluidas * 100 / itens.length) : 0 };
    });
    return {
      totalAtividades: total,
      horasTotais: arredondar(registros.reduce((s, a) => s + horasRegistro(a), 0)), colaboradores,
      horasPorColaborador, atividadesPorColaborador,
      horasPorFrente, atividadesPorFrente,
      topHorasPorFrente: horasPorFrente.slice(0, 10).map((x) => ({ ...x, labelVisual: formatarLabelFrenteRelatorio(x.label) })),
      topAtividadesPorFrente: atividadesPorFrente.slice(0, 10).map((x) => ({ ...x, labelVisual: formatarLabelFrenteRelatorio(x.label) })),
      atividadesPorDisciplina: agregar(consolidadas, (a) => a.projeto || "Não informada"),
      status, quantidadeStatus: Object.fromEntries(status.map((x) => [x.label, x.valor])), statusLegenda: status.filter((x) => x.valor > 0), percentualFinalizadas: total ? Math.round(finalizadas * 100 / total) : 0
    };
  }
  return { construirDadosGerenciaisRelatorio, formatarLabelFrenteRelatorio, horasRegistro };
});