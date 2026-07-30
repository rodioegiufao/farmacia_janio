(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATIVIDADE_AGRUPAMENTO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizarCampoAgrupamento(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ");
  }

  function normalizarNomeObra(valor) {
    return normalizarCampoAgrupamento(valor);
  }

  function obterIdentidadeEtapaAtividade(atividade = {}) {
    const etapa = normalizarCampoAgrupamento(atividade.etapa);
    if (etapa) return `etapa:${etapa}`;
    const trabalho = normalizarCampoAgrupamento(atividade.trabalhos);
    if (trabalho) return `sem-etapa:${trabalho}`;
    return `registro:${atividade.id || "sem-id"}`;
  }

  function obterChaveAtividadeConsolidada(atividade = {}) {
    const identidadeObra = atividade.obraId || `legado:${normalizarNomeObra(atividade.obra)}`;
    const projeto = normalizarCampoAgrupamento(atividade.projeto);
    return `${identidadeObra}|${projeto}|${obterIdentidadeEtapaAtividade(atividade)}`;
  }

  function obterData(atividade, termino = false) {
    const data = termino ? atividade.dataTermino || atividade.data_termino : atividade.dataInicio || atividade.data_inicio;
    const hora = termino ? atividade.horaTermino || atividade.hora_termino : atividade.horaInicio || atividade.hora_inicio;
    if (!data) return null;
    const valor = new Date(`${data}${hora ? `T${hora}` : "T00:00:00"}`);
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  function calcularHorasRegistro(atividade = {}) {
    const inicio = obterData(atividade);
    const fim = obterData(atividade, true);
    if (inicio && fim && fim > inicio) return (fim - inicio) / 36e5;
    const horas = Number(atividade.horas);
    return Number.isFinite(horas) ? horas : 0;
  }

  function obterStatusConsolidado(registros = []) {
    const status = registros.map((item) => normalizarCampoAgrupamento(item.status));
    if (status.length && status.every((item) => item === "finalizado")) return "Finalizado";
    if (status.includes("atrasado")) return "Atrasado";
    if (status.includes("em progresso")) return "Em progresso";
    if (status.includes("pausado")) return "Pausado";
    const recente = [...registros].sort((a, b) => (obterData(b, true)?.getTime() || obterData(b)?.getTime() || 0) - (obterData(a, true)?.getTime() || obterData(a)?.getTime() || 0))[0];
    return recente?.status || "";
  }

  function obterPrioridadeConsolidada(registros = []) {
    const pesos = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return registros.reduce((maior, item) => {
      const prioridade = String(item.prioridade || "").toUpperCase();
      return prioridade in pesos && (maior === "" || pesos[prioridade] > pesos[maior]) ? prioridade : maior;
    }, "");
  }

  function valoresUnicos(registros, campo) {
    const mapa = new Map();
    registros.forEach((item) => {
      const valor = String(item[campo] || "").trim();
      const chave = normalizarCampoAgrupamento(valor);
      if (chave && !mapa.has(chave)) mapa.set(chave, valor);
    });
    return [...mapa.values()];
  }

  function consolidarGrupo(registros, chave) {
    const primeiroValor = (campo) => registros.find((item) => item[campo])?.[campo] || "";
    const inicios = registros.map((item) => obterData(item)).filter(Boolean);
    const terminos = registros.map((item) => obterData(item, true)).filter(Boolean);
    const trabalhos = valoresUnicos(registros, "trabalhos");
    const colaboradores = valoresUnicos(registros, "colaborador");
    return {
      consolidada: true,
      chaveConsolidada: chave,
      obraId: primeiroValor("obraId"),
      obraCodigo: primeiroValor("obraCodigo"),
      obra: primeiroValor("obra"),
      projeto: primeiroValor("projeto"),
      etapa: primeiroValor("etapa"),
      quantidadeRegistros: registros.length,
      registrosIds: registros.map((item) => item.id).filter(Boolean),
      trabalhos,
      colaboradores,
      colaborador: colaboradores.join(" e "),
      horasConsolidadas: registros.reduce((soma, item) => soma + calcularHorasRegistro(item), 0),
      status: obterStatusConsolidado(registros),
      prioridade: obterPrioridadeConsolidada(registros),
      dataInicioMaisAntiga: inicios.length ? new Date(Math.min(...inicios)).toISOString() : "",
      dataTerminoMaisRecente: terminos.length ? new Date(Math.max(...terminos)).toISOString() : "",
      dataInicio: primeiroValor("dataInicio"),
      dataTermino: primeiroValor("dataTermino"),
      registros
    };
  }

  function consolidarAtividades(lista = []) {
    const grupos = new Map();
    lista.forEach((atividade) => {
      const chave = obterChaveAtividadeConsolidada(atividade);
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(atividade);
    });
    return [...grupos].map(([chave, registros]) => consolidarGrupo(registros, chave));
  }

  function consolidarAtividadesPorColaborador(lista = []) {
    const grupos = new Map();
    lista.forEach((atividade) => {
      const colaborador = String(atividade.colaborador || "Sem colaborador").trim();
      const chave = `${normalizarCampoAgrupamento(colaborador)}|${obterChaveAtividadeConsolidada(atividade)}`;
      if (!grupos.has(chave)) grupos.set(chave, { colaborador, registros: [] });
      grupos.get(chave).registros.push(atividade);
    });
    return [...grupos].map(([chave, grupo]) => ({
      ...consolidarGrupo(grupo.registros, chave),
      colaborador: grupo.colaborador,
      colaboradores: [grupo.colaborador]
    }));
  }

  return {
    normalizarCampoAgrupamento,
    normalizarNomeObra,
    obterIdentidadeEtapaAtividade,
    obterChaveAtividadeConsolidada,
    obterStatusConsolidado,
    obterPrioridadeConsolidada,
    consolidarAtividades,
    consolidarAtividadesPorColaborador
  };
});