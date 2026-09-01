(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PAYLOAD_RELATORIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MAX_PAYLOAD_RELATORIO_BYTES = 3.5 * 1024 * 1024;
  const CAMPOS_ATIVIDADE = ["id", "obraId", "obra_id", "obraCodigo", "obra_codigo", "obra", "projeto", "etapa", "fase", "item", "classificacoes", "atividade_classificacoes", "colaborador", "trabalhos", "prioridade", "status", "dataInicio", "data_inicio", "horaInicio", "hora_inicio", "dataTermino", "data_termino", "horaTermino", "hora_termino", "dataPrevista", "data_prevista", "prazo", "entrega", "entregaPrevista", "horas", "duracao_horas", "horas_trabalhadas", "duracao", "criadoEm", "criado_em", "observacoes"];
  const CAMPOS_SEMANAIS = ["id", "semana", "atividade", "descricao", "prioridade", "entregas", "entrega"];
  function diasInclusivos(periodo = {}) { const inicio = new Date(`${periodo.dataInicio || periodo.inicio || ""}T12:00:00Z`), fim = new Date(`${periodo.dataFim || periodo.fim || ""}T12:00:00Z`); return Number.isFinite(inicio.getTime()) && Number.isFinite(fim.getTime()) && fim >= inicio ? Math.floor((fim - inicio) / 864e5) + 1 : 0; }
  function obterModoRelatorio(periodo) { const dias = diasInclusivos(periodo); return dias <= 14 ? "semanal" : dias <= 31 ? "mensal" : "longo"; }
  function selecionar(objeto, campos) { const dto = {}; campos.forEach((campo) => { if (objeto?.[campo] !== undefined && objeto[campo] !== null && objeto[campo] !== "") dto[campo] = objeto[campo]; }); return dto; }
  function compactarAtividadeParaRelatorio(atividade) { return selecionar(atividade, CAMPOS_ATIVIDADE); }
  function bytesJson(valor) { const json = JSON.stringify(valor ?? null); return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(json).byteLength : Buffer.byteLength(json, "utf8"); }
  function calcularTamanhoPayloadRelatorio(payload = {}, { log = false } = {}) {
    const secoes = ["atividades", "historicoAtividades", "atividadesSemanais", "graficos", "gantt", "dadosGerenciais"];
    const componentes = Object.fromEntries(secoes.map((nome) => [nome, bytesJson(payload[nome] ?? null)]));
    componentes.outros = bytesJson(Object.fromEntries(Object.entries(payload).filter(([nome]) => !secoes.includes(nome))));
    const total = bytesJson(payload);
    if (log && typeof console !== "undefined") { console.groupCollapsed?.("Tamanho do payload do relatório"); Object.entries({ ...componentes, TOTAL: total }).forEach(([nome, bytes]) => console.info(`${nome}: ${bytes} bytes | ${(bytes / 1024).toFixed(1)} KB | ${(bytes / 1048576).toFixed(2)} MB`)); console.groupEnd?.(); }
    return { total, componentes };
  }
  function montarPayloadCompacto(payload = {}) { return { ...payload, atividades: (payload.atividades || []).map(compactarAtividadeParaRelatorio), atividadesSemanais: (payload.atividadesSemanais || []).map((a) => selecionar(a, CAMPOS_SEMANAIS)), historicoAtividades: undefined, dadosGerenciais: undefined }; }
  return { MAX_PAYLOAD_RELATORIO_BYTES, diasInclusivos, obterModoRelatorio, compactarAtividadeParaRelatorio, calcularTamanhoPayloadRelatorio, montarPayloadCompacto };
});