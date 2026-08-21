(function (root, factory) {
  const faseItem = typeof module === "object" && module.exports ? require("./fase-item") : root?.FASE_ITEM_ATIVIDADE;
  const api = factory(faseItem);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DASHBOARD_CLASSIFICACAO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (faseItem) {
  "use strict";
  const separarItens = faseItem?.separarItens;
  const classificacoesApi = typeof module === "object" && module.exports ? require("./classificacoes") : globalThis.CLASSIFICACOES_ATIVIDADE;
  const limpar = (valor) => String(valor || "").trim();
  const chave = (...partes) => partes.map(limpar).join("\u001f");
  const obterProjeto = (registro) => limpar(registro.projeto) || "Projeto não informado";
  const classificavel = (registro) => Boolean(faseItem?.projetoExigeFaseItem?.(registro?.projeto));

  function obterRegistrosDetalhadosDashboard(lista = []) {
    return lista.flatMap((atividade) => Array.isArray(atividade.registros) ? atividade.registros : [atividade]);
  }
  function agruparHorasPorFaseDashboard(registros = [], calcularHoras = () => 0) {
    const mapa = new Map();
    let horasSemFase = 0;
    let totalHoras = 0;
    registros.forEach((registro) => {
      if (!classificavel(registro)) return;
      const horas = Number(calcularHoras(registro));
      if (!Number.isFinite(horas) || horas <= 0) return;
      totalHoras += horas;
      const novas = classificacoesApi.obterClassificacoesAtividade(registro);
      if (Array.isArray(registro.classificacoes) && novas.length) {
        novas.forEach((c) => { const id = chave(obterProjeto(registro), c.fase), atual = mapa.get(id) || { chave: id, projeto: obterProjeto(registro), fase: c.fase, horas: 0 }; atual.horas += c.minutosDedicados / 60; mapa.set(id, atual); });
        return;
      }
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
      if (!classificavel(registro)) return;
      const horas = Number(calcularHoras(registro));
      if (!Number.isFinite(horas) || horas <= 0) return;
      totalHoras += horas;
      const novas = classificacoesApi.obterClassificacoesAtividade(registro);
      if (Array.isArray(registro.classificacoes) && novas.length) {
        novas.forEach((c) => { const id = chave(obterProjeto(registro), c.fase, c.item), atual = mapa.get(id) || { chave: id, projeto: obterProjeto(registro), fase: c.fase, item: c.item, horas: 0 }; atual.horas += c.minutosDedicados / 60; mapa.set(id, atual); });
        return;
      }
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