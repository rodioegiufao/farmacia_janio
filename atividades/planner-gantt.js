(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PLANNER_GANTT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  
  const DIA_MS = 86400000;
  function dataCivilIso(data) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`; }
  function dataCivil(valor) { const m = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return dataCivilIso(d) === valor ? d : null; }
  function diferencaDias(inicio, fim) { const a = dataCivil(inicio), b = dataCivil(fim); return a && b ? Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DIA_MS) : 0; }
  function obterNumeroSemanaIso(entrada) {
    const data = entrada instanceof Date ? entrada : dataCivil(entrada);
    if (!data || !Number.isFinite(data.getTime())) return null;
    const dataUtc = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
    const diaSemana = dataUtc.getUTCDay() || 7;
    dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - diaSemana);
    const inicioAno = new Date(Date.UTC(dataUtc.getUTCFullYear(), 0, 1));
    return Math.ceil((((dataUtc - inicioAno) / DIA_MS) + 1) / 7);
  }
  function obterNumeroSemanaDomingo(entrada) {
    const data = entrada instanceof Date ? new Date(entrada.getFullYear(), entrada.getMonth(), entrada.getDate()) : dataCivil(entrada);
    if (!data || !Number.isFinite(data.getTime())) return null;
    data.setDate(data.getDate() + 1);
    return obterNumeroSemanaIso(data);
  }
  function listarDias(inicio, fim) { const a = dataCivil(inicio), b = dataCivil(fim), dias = []; if (!a || !b || b < a) return dias; for (let d = a; d <= b; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) dias.push(dataCivilIso(d)); return dias; }
  function obterIntervaloRealAtividade(atividade) {
    if (!atividade?.data_inicio || !atividade?.hora_inicio || !atividade?.data_termino || !atividade?.hora_termino) return null;
    const inicio = new Date(`${atividade.data_inicio}T${atividade.hora_inicio}`), fim = new Date(`${atividade.data_termino}T${atividade.hora_termino}`);
    const minutos = Math.round((fim - inicio) / 60000);
    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fim.getTime()) || !Number.isFinite(minutos) || minutos <= 0) return null;
    const minutosRateados = Number(atividade.minutosRateados);
    const minutosDedicados = Number.isFinite(minutosRateados) && minutosRateados >= 0 ? minutosRateados : minutos;
    return { inicio, fim, minutos, minutosDedicados, dataInicio: dataCivilIso(inicio), dataFim: dataCivilIso(fim), atividade };
  }
  function obterAtividadesValidasGantt(item) { return (item?.atividadesVinculadas || []).map(obterIntervaloRealAtividade).filter(Boolean); }
  function identidadeAtividade(intervalo) {
    const a = intervalo.atividade || {};
    const id = String(a.id || [a.data_inicio, a.hora_inicio, a.data_termino, a.hora_termino, a.colaborador, a.usuario_id, a.descricao].join("|"));
    return a.plannerItemId ? `${id}::${a.plannerItemId}` : id;
  }
  function deduplicarIntervalos(intervalos) {
    const unicos = new Map();
    (intervalos || []).forEach((entrada) => { const intervalo = entrada?.inicio ? entrada : obterIntervaloRealAtividade(entrada); if (intervalo && !unicos.has(identidadeAtividade(intervalo))) unicos.set(identidadeAtividade(intervalo), intervalo); });
    return [...unicos.values()];
  }
  function correspondeFiltrosAtividade(atividade, filtros = {}) {
    const responsavel = atividade?.colaborador || atividade?.colaborador_nome || "";
    return (!filtros.responsavel || responsavel === filtros.responsavel)
      && (!filtros.status || atividade?.status === filtros.status)
      && (!filtros.prioridade || atividade?.prioridade === filtros.prioridade);
  }
  function obterAtividadesDoNivelGantt({ node, periodo = null, filtros = {} } = {}) {
    if (!node) return [];
    return deduplicarIntervalos(node.intervalos || [])
      .filter((intervalo) => atividadeEstaNoPeriodo(intervalo, periodo) && correspondeFiltrosAtividade(intervalo.atividade, filtros))
      .sort((a, b) => b.inicio - a.inicio)
      .map((intervalo) => intervalo.atividade);
  }
  function agruparAtividadesGanttPorDia(atividades, metadados = new Map()) {
    const grupos = new Map();
    deduplicarIntervalos(atividades).forEach((intervalo) => {
      const chave = intervalo.dataInicio;
      const grupo = grupos.get(chave) || { data: chave, dataFim: chave, minutos: 0, quantidade: 0, colaboradores: [], atividades: [], itens: [], colaboradoresHoras: {} };
      if (intervalo.dataFim > grupo.dataFim) grupo.dataFim = intervalo.dataFim;
      grupo.minutos += intervalo.minutosDedicados; grupo.quantidade += 1;
      const nome = intervalo.atividade.colaborador || intervalo.atividade.colaborador_nome;
      if (nome && !grupo.colaboradores.includes(nome)) grupo.colaboradores.push(nome);
      if (nome) grupo.colaboradoresHoras[nome] = (grupo.colaboradoresHoras[nome] || 0) + intervalo.minutosDedicados;
      const meta = metadados.get(identidadeAtividade(intervalo));
      (meta?.itens || []).forEach((item) => { if (!grupo.itens.some((existente) => existente.id === item.id)) grupo.itens.push(item); });
      grupo.atividades.push(intervalo.atividade); grupos.set(chave, grupo);
    });
    return [...grupos.values()].sort((a, b) => a.data.localeCompare(b.data));
  }
  function atividadeEstaNoPeriodo(entrada, periodo) {
    const x = entrada?.inicio ? entrada : obterIntervaloRealAtividade(entrada);
    return Boolean(x && (!periodo?.inicio || x.dataFim >= periodo.inicio) && (!periodo?.fim || x.dataInicio <= periodo.fim));
  }
  function segmentoEstaNoPeriodo(segmento, periodo) { return Boolean(segmento && (!periodo?.inicio || segmento.dataFim >= periodo.inicio) && (!periodo?.fim || segmento.data <= periodo.fim)); }
  function intervalosNoPeriodo(intervalos, periodo) {
    return deduplicarIntervalos(intervalos).filter((x) => atividadeEstaNoPeriodo(x, periodo)).map((x) => {
      if (!periodo?.inicio && !periodo?.fim) return x;
      const limiteInicio = periodo.inicio ? new Date(`${periodo.inicio}T00:00:00`) : x.inicio;
      const limiteFim = periodo.fim ? new Date(new Date(`${periodo.fim}T00:00:00`).getFullYear(), new Date(`${periodo.fim}T00:00:00`).getMonth(), new Date(`${periodo.fim}T00:00:00`).getDate() + 1) : x.fim;
      const inicio = x.inicio > limiteInicio ? x.inicio : limiteInicio, fim = x.fim < limiteFim ? x.fim : limiteFim;
      return { ...x, inicio, fim, minutos: Math.round((fim - inicio) / 60000), dataInicio: dataCivilIso(inicio), dataFim: dataCivilIso(fim) };
    }).filter((x) => x.minutos > 0);
  }
  function calcularMaiorLacuna(diasAtivos) {
    const dias = [...new Set(diasAtivos || [])].sort(); let diasSemMovimentacao = 0, inicio = null, fim = null;
    for (let i = 1; i < dias.length; i += 1) { const lacuna = Math.max(0, diferencaDias(dias[i - 1], dias[i]) - 1); if (lacuna > diasSemMovimentacao) { diasSemMovimentacao = lacuna; inicio = dias[i - 1]; fim = dias[i]; } }
    return { dias: diasSemMovimentacao, inicio, fim };
  }
  function calcularMetricasTemporais(intervalos, periodo) {
    const acumulados = deduplicarIntervalos(intervalos), filtrados = intervalosNoPeriodo(acumulados, periodo);
    const segmentos = agruparAtividadesGanttPorDia(filtrados), dias = segmentos.map((s) => s.data);
    const primeiraMovimentacao = dias[0] || null, ultimaMovimentacao = dias.at(-1) || null;
    const diasJanela = primeiraMovimentacao ? diferencaDias(primeiraMovimentacao, ultimaMovimentacao) + 1 : 0;
    const colaboradores = [...new Set(filtrados.map((x) => x.atividade.colaborador || x.atividade.colaborador_nome).filter(Boolean))];
    return { minutosNoPeriodo: filtrados.reduce((s, x) => s + x.minutosDedicados, 0), minutosAcumulados: acumulados.reduce((s, x) => s + x.minutosDedicados, 0), diasAtivos: dias.length, primeiraMovimentacao, ultimaMovimentacao, diasJanela, cadencia: diasJanela ? dias.length / diasJanela : 0, maiorLacuna: calcularMaiorLacuna(dias), colaboradores, segmentos };
  }
  function criarNo(tipo, id, nome, intervalos, periodo, filhos = []) {
    const unicos = deduplicarIntervalos(intervalos), metricas = calcularMetricasTemporais(unicos, periodo);
    const itensMovimentados = tipo === "item" ? (metricas.diasAtivos ? 1 : 0) : filhos.filter((f) => f.metricas.diasAtivos > 0).length;
    const segmentosGantt = agruparAtividadesGanttPorDia(unicos), segmentosPeriodo = metricas.segmentos;
    if (tipo !== "item") [segmentosGantt, segmentosPeriodo].forEach((segmentos) => segmentos.forEach((segmento) => {
      segmento.itens = filhos.filter((filho) => filho.segmentosGantt.some((s) => s.data === segmento.data)).map((filho) => ({ id: filho.id, nome: filho.nome }));
    }));
    return { tipo, id, nome, filhos, intervalos: unicos, segmentosGantt, segmentosPeriodo, metricas: { ...metricas, itensMovimentados } };
  }
  function construirEstruturaGantt(checklists, { ocultarSemAtividade = true, periodo = null, filtrosAtividade = {} } = {}) {
    const obras = new Map();
    (checklists || []).forEach((checklist) => {
      const itensPorFase = new Map();
      (checklist.itens || []).forEach((item) => {
        const intervalos = obterAtividadesValidasGantt(item).filter((intervalo) => correspondeFiltrosAtividade(intervalo.atividade, filtrosAtividade)), no = { ...criarNo("item", item.id, item.estagio || item.atividade || item.texto || "Item", intervalos, periodo), ...item, checklistId: checklist.id };
        if (ocultarSemAtividade && !no.metricas.diasAtivos) return;
        const faseNome = item.etapa || "Outros"; if (!itensPorFase.has(faseNome)) itensPorFase.set(faseNome, []); itensPorFase.get(faseNome).push(no);
      });
      const fases = [...itensPorFase].map(([nome, itens]) => ({ ...criarNo("fase", `${checklist.id}:${nome}`, nome, itens.flatMap((i) => i.intervalos), periodo, itens), itens }));
      if (ocultarSemAtividade && !fases.length) return;
      const projeto = { ...criarNo("projeto", checklist.id, checklist.nomeTarefa || checklist.projeto || "Projeto", fases.flatMap((f) => f.intervalos), periodo, fases), fases };
      projeto.projeto = checklist.projeto;
      const chave = checklist.obraId || checklist.obra || "Sem obra";
      if (!obras.has(chave)) obras.set(chave, { id: chave, nome: checklist.obra || "Sem obra", projetos: [] });
      obras.get(chave).projetos.push(projeto);
    });
    return [...obras.values()].map((obra) => ({ ...criarNo("obra", obra.id, obra.nome, obra.projetos.flatMap((p) => p.intervalos), periodo, obra.projetos), projetos: obra.projetos }));
  }
  function obterIntervaloGlobalGantt(checklists) {
    const todos = deduplicarIntervalos((checklists || []).flatMap((c) => (c.itens || []).flatMap(obterAtividadesValidasGantt)));
    if (!todos.length) return null; return { inicio: todos.reduce((m, x) => x.dataInicio < m ? x.dataInicio : m, todos[0].dataInicio), fim: todos.reduce((m, x) => x.dataFim > m ? x.dataFim : m, todos[0].dataFim) };
  }
  function filtrarLinhasHierarquia(estrutura, { modo = "sintetico", recolhidos = new Set() } = {}) {
    const linhas = [];
    (estrutura || []).forEach((obra) => { linhas.push(obra); if (recolhidos.has(`obra:${obra.id}`)) return; obra.projetos.forEach((projeto) => { linhas.push(projeto); if (recolhidos.has(`projeto:${projeto.id}`)) return; projeto.filhos.forEach((fase) => { linhas.push(fase); if (modo === "analitico" && !recolhidos.has(`fase:${fase.id}`)) linhas.push(...fase.filhos); }); }); });
    return linhas;
  }
  return { obterIntervaloRealAtividade, obterAtividadesValidasGantt, obterAtividadesDoNivelGantt, correspondeFiltrosAtividade, agruparAtividadesGanttPorDia, obterIntervaloGlobalGantt, construirEstruturaGantt, calcularMetricasTemporais, calcularMaiorLacuna, atividadeEstaNoPeriodo, segmentoEstaNoPeriodo, intervalosNoPeriodo, filtrarLinhasHierarquia, deduplicarIntervalos, listarDias, diferencaDias, dataCivilIso, obterNumeroSemanaIso, obterNumeroSemanaDomingo };
});
