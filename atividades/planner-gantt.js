(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PLANNER_GANTT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DIA_MS = 86400000;
  function dataCivilIso(data) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`; }
  function dataCivil(valor) { const m = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return dataCivilIso(d) === valor ? d : null; }
  function obterIntervaloRealAtividade(atividade) {
    if (!atividade?.data_inicio || !atividade?.hora_inicio || !atividade?.data_termino || !atividade?.hora_termino) return null;
    const inicio = new Date(`${atividade.data_inicio}T${atividade.hora_inicio}`), fim = new Date(`${atividade.data_termino}T${atividade.hora_termino}`);
    const minutos = Math.round((fim - inicio) / 60000);
    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fim.getTime()) || !Number.isFinite(minutos) || minutos <= 0) return null;
    return { inicio, fim, minutos, dataInicio: dataCivilIso(inicio), dataFim: dataCivilIso(fim), atividade };
  }
  function obterAtividadesValidasGantt(item) { return (item?.atividadesVinculadas || []).map(obterIntervaloRealAtividade).filter(Boolean); }
  function agruparAtividadesGanttPorDia(atividades) {
    const grupos = new Map();
    atividades.forEach((entrada) => {
      const intervalo = entrada?.inicio ? entrada : obterIntervaloRealAtividade(entrada); if (!intervalo) return;
      const chave = intervalo.dataInicio, grupo = grupos.get(chave) || { data: chave, dataFim: chave, minutos: 0, quantidade: 0, colaboradores: [], atividades: [] };
      if (intervalo.dataFim > grupo.dataFim) grupo.dataFim = intervalo.dataFim;
      grupo.minutos += intervalo.minutos; grupo.quantidade += 1;
      const nome = intervalo.atividade.colaborador; if (nome && !grupo.colaboradores.includes(nome)) grupo.colaboradores.push(nome);
      grupo.atividades.push(intervalo.atividade); grupos.set(chave, grupo);
    });
    return [...grupos.values()].sort((a, b) => a.data.localeCompare(b.data));
  }
  function obterIntervaloGlobalGantt(checklists) {
    let inicio = null, fim = null;
    (checklists || []).forEach((c) => (c.itens || []).forEach((i) => obterAtividadesValidasGantt(i).forEach((x) => { if (!inicio || x.inicio < inicio) inicio = x.inicio; if (!fim || x.fim > fim) fim = x.fim; })));
    return inicio ? { inicio: dataCivilIso(inicio), fim: dataCivilIso(fim) } : null;
  }
  function construirEstruturaGantt(checklists, { ocultarSemAtividade = true } = {}) {
    const obras = new Map();
    (checklists || []).forEach((checklist) => {
      const itens = (checklist.itens || []).map((item) => ({ ...item, segmentosGantt: agruparAtividadesGanttPorDia(obterAtividadesValidasGantt(item)) })).filter((item) => !ocultarSemAtividade || item.segmentosGantt.length);
      if (!itens.length && ocultarSemAtividade) return;
      const chave = checklist.obraId || checklist.obra || "Sem obra", obra = obras.get(chave) || { id: chave, nome: checklist.obra || "Sem obra", projetos: [] }, fases = new Map();
      itens.forEach((item) => { const nome = item.etapa || "Outros"; if (!fases.has(nome)) fases.set(nome, { id: `${checklist.id}:${nome}`, nome, itens: [], minutos: 0 }); const fase = fases.get(nome); fase.itens.push({ ...item, checklistId: checklist.id }); fase.minutos += Number(item.minutosRegistrados) || 0; });
      obra.projetos.push({ id: checklist.id, nome: checklist.nomeTarefa || checklist.projeto || "Projeto", projeto: checklist.projeto, minutos: itens.reduce((s, i) => s + (Number(i.minutosRegistrados) || 0), 0), fases: [...fases.values()] }); obras.set(chave, obra);
    });
    return [...obras.values()];
  }
  function listarDias(inicio, fim) { const a = dataCivil(inicio), b = dataCivil(fim), dias = []; if (!a || !b || b < a) return dias; for (let d = a; d <= b; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) dias.push(dataCivilIso(d)); return dias; }
  function diferencaDias(inicio, fim) { const a = dataCivil(inicio), b = dataCivil(fim); return a && b ? Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DIA_MS) : 0; }
  return { obterIntervaloRealAtividade, obterAtividadesValidasGantt, agruparAtividadesGanttPorDia, obterIntervaloGlobalGantt, construirEstruturaGantt, listarDias, diferencaDias, dataCivilIso };
});
