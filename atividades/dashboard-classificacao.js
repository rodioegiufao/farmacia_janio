(function (root, factory) {
  const faseItem = typeof module === "object" && module.exports ? require("./fase-item") : root?.FASE_ITEM_ATIVIDADE;
  const api = factory(faseItem);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DASHBOARD_CLASSIFICACAO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (faseItem) {
  "use strict";
  const separarItens = faseItem?.separarItens;
  const limpar = (valor) => String(valor || "").trim();
  const chave = (...partes) => partes.map(limpar).join("\u001f");
  const obterProjeto = (registro) => limpar(registro.projeto) || "Projeto não informado";

  function obterRegistrosDetalhadosDashboard(lista = []) {
    return lista.flatMap((atividade) => Array.isArray(atividade.registros) ? atividade.registros : [atividade]);
  }
  function agruparHorasPorFaseDashboard(registros = [], calcularHoras = () => 0) {
    const mapa = new Map();
    let horasSemFase = 0;
    let totalHoras = 0;
    registros.forEach((registro) => {
      const horas = Number(calcularHoras(registro));
      if (!Number.isFinite(horas) || horas <= 0) return;
      totalHoras += horas;
      const projeto = obterProjeto(registro);
      const fase = limpar(registro.fase);
      if (!fase) { horasSemFase += horas; return; }
      const id = chave(projeto, fase);
      const atual = mapa.get(id) || { chave: id, projeto, fase, horas: 0 };
      atual.horas += horas;
      mapa.set(id, atual);
    });
    return { categorias: [...mapa.values()], horasSemFase, totalHorasClassificadas: totalHoras - horasSemFase, totalHoras };
  }
  function agruparHorasPorItemDashboard(registros = [], calcularHoras = () => 0) {
    if (typeof separarItens !== "function") throw new Error("separarItens() não está disponível.");
    const mapa = new Map();
    let horasSemItem = 0;
    let totalHoras = 0;
    registros.forEach((registro) => {
      const horas = Number(calcularHoras(registro));
      if (!Number.isFinite(horas) || horas <= 0) return;
      totalHoras += horas;
      const itens = separarItens(registro.item);
      if (!itens.length) { horasSemItem += horas; return; }
      const projeto = obterProjeto(registro);
      const fase = limpar(registro.fase) || "Fase não informada";
      const horasRateadas = horas / itens.length;
      itens.forEach((item) => {
        const id = chave(projeto, fase, item);
        const atual = mapa.get(id) || { chave: id, projeto, fase, item, horas: 0 };
        atual.horas += horasRateadas;
        mapa.set(id, atual);
      });
    });
    return { categorias: [...mapa.values()], horasSemItem, totalHorasClassificadas: totalHoras - horasSemItem, totalHoras };
  }
  function obterLabelFaseDashboard(categoria, multiplosProjetos) {
    return multiplosProjetos ? `${categoria.projeto} → ${categoria.fase}` : categoria.fase;
  }
  function obterLabelItemDashboard(categoria, multiplosProjetos) {
    return multiplosProjetos
      ? `${categoria.projeto} → ${categoria.fase} → ${categoria.item}`
      : `${categoria.fase} → ${categoria.item}`;
  }
  function ordenarTopHorasDashboard(categorias = [], limite = 10, obterLabel = (item) => item.chave) {
    const ordenadas = [...categorias].sort((a, b) => b.horas - a.horas || obterLabel(a).localeCompare(obterLabel(b), "pt-BR"));
    return { categorias: ordenadas.slice(0, limite), totalCategorias: ordenadas.length };
  }
  return { obterRegistrosDetalhadosDashboard, agruparHorasPorFaseDashboard, agruparHorasPorItemDashboard, obterLabelFaseDashboard, obterLabelItemDashboard, ordenarTopHorasDashboard };
});
