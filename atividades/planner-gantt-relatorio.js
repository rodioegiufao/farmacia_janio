(function (root, factory) {
  const engine = root?.PLANNER_GANTT || (typeof require === "function" ? require("./planner-gantt") : null);
  const api = factory(engine);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PLANNER_GANTT_RELATORIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (PLANNER_GANTT) {
  "use strict";

  const formatarHoras = (minutos) => `${(Number(minutos || 0) / 60).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
  const normalizar = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const valor = (atividade, camel, snake) => atividade?.[camel] ?? atividade?.[snake] ?? "";
  function chaveLegada(atividade) {
    return ["dataInicio:data_inicio", "horaInicio:hora_inicio", "dataTermino:data_termino", "horaTermino:hora_termino", "colaborador:colaborador", "obraId:obra_id", "projeto:projeto", "etapa:etapa"]
      .map((campos) => { const [camel, snake] = campos.split(":"); return normalizar(valor(atividade, camel, snake)); }).join("|");
  }
  function estaPermitida(atividade, ids, legadas) {
    const id = atividade?.id;
    return id !== undefined && id !== null && String(id) !== "" ? ids.has(String(id)) : legadas.has(chaveLegada(atividade));
  }
  function normalizarAtividade(atividade) {
    return { ...atividade,
      data_inicio: valor(atividade, "dataInicio", "data_inicio"), hora_inicio: valor(atividade, "horaInicio", "hora_inicio"),
      data_termino: valor(atividade, "dataTermino", "data_termino"), hora_termino: valor(atividade, "horaTermino", "hora_termino") };
  }
  function filtrarChecklistsParaRelatorio(checklists, atividadesPermitidas, periodo) {
    const permitidas = atividadesPermitidas || [];
    const ids = new Set(permitidas.map((a) => a?.id).filter((id) => id !== undefined && id !== null && String(id) !== "").map(String));
    const legadas = new Set(permitidas.filter((a) => a?.id === undefined || a?.id === null || String(a.id) === "").map(chaveLegada));
    return (checklists || []).map((checklist) => ({ ...checklist, itens: (checklist.itens || []).map((item) => {
      const atividadesVinculadas = (item.atividadesVinculadas || []).filter((a) => estaPermitida(a, ids, legadas)).map(normalizarAtividade)
        .filter((a) => PLANNER_GANTT.atividadeEstaNoPeriodo(a, periodo));
      return { ...item, atividadesVinculadas };
    }).filter((item) => item.atividadesVinculadas.length) })).filter((checklist) => checklist.itens.length);
  }
  function prepararEstrutura({ checklists, atividadesPermitidas, periodo }) {
    const filtrados = filtrarChecklistsParaRelatorio(checklists, atividadesPermitidas, periodo);
    const estrutura = PLANNER_GANTT.construirEstruturaGantt(filtrados, { ocultarSemAtividade: true, periodo });
    const dias = PLANNER_GANTT.listarDias(periodo?.inicio, periodo?.fim);
    const diasDoNo = (no) => [...new Set((no.segmentosPeriodo || []).flatMap((segmento) => {
      const inicio = segmento.data < periodo.inicio ? periodo.inicio : segmento.data;
      const fim = segmento.dataFim > periodo.fim ? periodo.fim : segmento.dataFim;
      return PLANNER_GANTT.listarDias(inicio, fim);
    }))].sort();
    const linha = (no) => ({ nivel: no.tipo, id: no.id, nome: no.nome, horas: Number(no.metricas?.minutosNoPeriodo || 0) / 60, dias: diasDoNo(no) });
    const obras = estrutura.map((obra) => ({
      id: obra.id, codigo: obra.codigo || filtrados.find((c) => String(c.obraId || c.obra) === String(obra.id))?.obraCodigo || "",
      nome: obra.nome, horas: Number(obra.metricas?.minutosNoPeriodo || 0) / 60, diasAtivos: diasDoNo(obra).length,
      dias: diasDoNo(obra), linha: linha(obra), projetos: obra.projetos.filter((p) => p.metricas?.diasAtivos).map((projeto) => ({
        id: projeto.id, nome: projeto.nome, linha: linha(projeto),
        fases: (projeto.fases || projeto.filhos || []).filter((f) => f.metricas?.diasAtivos).map((fase) => linha(fase))
      }))
    }));
    return { checklists: filtrados, estrutura, dias, periodo: { inicio: periodo?.inicio, fim: periodo?.fim }, obras };
  }
  function prepararEstruturaTabular(opcoes) {
    const dados = prepararEstrutura(opcoes);
    const horasTotaisRelatorio = Number(opcoes.horasTotais || 0);
    const horasRepresentadasGantt = Number(dados.obras.reduce((soma, obra) => soma + Number(obra.horas || 0), 0).toFixed(2));
    return { possuiDados: Boolean(dados.obras.length && dados.dias.length), periodo: dados.periodo,
      totalHoras: horasTotaisRelatorio, horasTotaisRelatorio, horasRepresentadasGantt,
      coberturaGantt: horasTotaisRelatorio ? Number((horasRepresentadasGantt / horasTotaisRelatorio * 100).toFixed(1)) : 0, obras: dados.obras };
  }
  return { filtrarChecklistsParaRelatorio, prepararEstrutura, prepararEstruturaTabular, formatarHoras };
});