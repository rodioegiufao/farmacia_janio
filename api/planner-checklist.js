const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const { parseRequestBody, requireUser, sendJson, supabaseRequest } = require("./_auth");

const CHECKLISTS_TABLE = "planner_checklists";
const ITEMS_TABLE = "planner_checklist_itens";
const SHEET_NAME = "Descricionado";
const EXCEL_CANDIDATES = [
  path.join(process.cwd(), "Check-list Geral.xlsx"),
  path.join(process.cwd(), "atividades", "Check-list Geral.xlsx"),
  path.join(process.cwd(), "Check-list Geral.xlsm")
];

let cachedTemplates = null;
function requireAdmin(user) {
  if (user?.perfil === "admin") return;
  const error = new Error("Apenas administradores podem criar, editar ou excluir tarefas do Planner.");
  error.statusCode = 403;
  throw error;
}
function xmlText(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1] : "";
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function columnIndex(cellRef) {
  const letters = String(cellRef || "").match(/[A-Z]+/)?.[0] || "";
  return letters.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}
function buildProjectCode(project) {
  const normalized = String(project || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("eletr")) return "PRJ-ELE";
  return `PRJ-${String(project || "GER").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "GER"}`;
}

function formatChecklistText(etapa, atividade) {
  const e = String(etapa || "").trim();
  const a = String(atividade || "").trim();
  const n = e.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (n === "lancamento") return `Lançamento dos/das ${a}`;
  if (n === "distribuicao") return `Distribuição de/dos/das ${a}`;
  if (n === "plotagem") return `Finalização da Plotagem de ${a}`;
  if (n === "compatibilizacao") return `Compatibilização — ${a}`;
  if (n === "estudos" || n === "estudo") return `Estudo de ${a}`;
  return `${e} — ${a}`;
}
async function readWorkbookTemplates() {
  if (cachedTemplates) return cachedTemplates;
  const workbookPath = EXCEL_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!workbookPath) return (cachedTemplates = []);
  const zip = await JSZip.loadAsync(fs.readFileSync(workbookPath));
  const workbookXml = await zip.file("xl/workbook.xml").async("string");
  const workbookRels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const sheetMatch = [...workbookXml.matchAll(/<sheet[^>]+>/g)].find((match) => new RegExp(`name=["']${SHEET_NAME}["']`).test(match[0]));
  if (!sheetMatch) return [];

  const relId = sheetMatch[0].match(/r:id=["']([^"']+)/)?.[1];
  const relMatch = [...workbookRels.matchAll(/<Relationship[^>]+>/g)].find((match) => match[0].match(/Id=["']([^"']+)/)?.[1] === relId);
  const target = relMatch?.[0].match(/Target=["']([^"']+)/)?.[1];
  if (!target) return [];

  const sharedFile = zip.file("xl/sharedStrings.xml");
  const sharedStrings = sharedFile ? [...(await sharedFile.async("string")).matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => decodeXml([...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(""))) : [];
  const sheetPath = target.replace(/^\//, "").startsWith("xl/") ? target.replace(/^\//, "") : path.posix.join("xl", target);
  const sheetXml = await zip.file(sheetPath).async("string");

  const rows = [...sheetXml.matchAll(/<row[^>]*>[\s\S]*?<\/row>/g)].map((rowMatch) => {
    const values = [];
    [...rowMatch[0].matchAll(/<c[^>]*r=["']([^"']+)["'][^>]*>[\s\S]*?<\/c>/g)].forEach((cellMatch) => {
      const cellXml = cellMatch[0];
      const value = xmlText(cellXml, "v") || xmlText(cellXml, "t");
      const type = cellXml.match(/t=["']([^"']+)/)?.[1];
      values[columnIndex(cellMatch[1])] = type === "s" ? sharedStrings[Number(value)] || "" : decodeXml(value);
    });
    return values;
  });

  let lastProjeto = "", lastTipo = "", lastEtapa = "";
  const groups = new Map();
  rows.slice(1).forEach((row) => {
    const projeto = String(row[0] || "").trim() || lastProjeto;
    const tipo = String(row[1] || "").trim() || lastTipo;
    const etapa = String(row[2] || "").trim() || lastEtapa;
    const atividade = String(row[3] || "").trim();
    if (projeto) lastProjeto = projeto;
    if (tipo) lastTipo = tipo;
    if (etapa) lastEtapa = etapa;
    if (!projeto || !tipo || !etapa || !atividade) return;
    const key = `${projeto}|||${tipo}`;
    if (!groups.has(key)) groups.set(key, { projeto, tipo, codigoProjeto: buildProjectCode(projeto), etapas: [] });
    const group = groups.get(key);
    let stage = group.etapas.find((item) => item.etapa === etapa);
    if (!stage) group.etapas.push((stage = { etapa, atividades: [] }));
    stage.atividades.push(atividade);
  });
  return (cachedTemplates = [...groups.values()]);
}

function templateToItems(template, checklistId) {
  let ordem = 0;
  return (template?.etapas || []).flatMap((stage) => stage.atividades.map((atividade) => ({
    checklist_id: checklistId,
    etapa: stage.etapa,
    atividade,
    texto: formatChecklistText(stage.etapa, atividade),
    ordem: ordem++
  })));
}

function mapItem(record) {
  return {
    id: record.id,
    checklistId: record.checklist_id,
    etapa: record.etapa || "",
    atividade: record.atividade || "",
    texto: record.texto || "",
    ordem: record.ordem || 0,
    concluido: Boolean(record.concluido),
    concluidoEm: record.concluido_em || "",
    concluidoPor: record.concluido_por || "",
    concluidoPorNome: record.concluido_por_nome || ""
  };
}

function fromDatabaseRecord(record) {
  return {
    id: record.id,
    obra: record.obra || "",
    nomeTarefa: record.nome_tarefa || record.titulo || "",
    projeto: record.projeto || "",
    tipo: record.tipo || "",
    codigoProjeto: record.codigo_projeto || buildProjectCode(record.projeto),
    status: record.status || "Não iniciado",
    prioridade: record.prioridade || "Média",
    dataInicio: record.data_inicio || "",
    dataConclusao: record.data_conclusao || record.data_prevista || "",
    bucket: record.bucket || "Outros",
    responsavel: record.responsavel || "",
    anotacoes: record.anotacoes || record.observacoes || "",
    itens: (record.planner_checklist_itens || record.itens || []).map(mapItem).sort((a, b) => a.ordem - b.ordem),
    criadoPor: record.criado_por || "",
    criadoPorNome: record.criado_por_nome || "",
    criadoEm: record.criado_em || "",
    atualizadoEm: record.atualizado_em || ""
  };
}

module.exports = async function plannerChecklistHandler(req, res) {
  try {
    const user = await requireUser(req);
    const templates = await readWorkbookTemplates();

    if (req.method === "GET") {
      const data = await supabaseRequest(CHECKLISTS_TABLE, "?select=*,planner_checklist_itens(*)&order=criado_em.desc");
      sendJson(res, 200, { modelos: templates, checklists: Array.isArray(data) ? data.map(fromDatabaseRecord) : [] });
      return;
    }

    if (req.method === "POST") {
      requireAdmin(user);
      const body = parseRequestBody(req);
      if (!body.obra || !body.nomeTarefa || !body.projeto || !body.tipo) return sendJson(res, 400, { error: "Nome da obra, nome da tarefa, projeto e tipo são obrigatórios." });
      const template = templates.find((item) => item.projeto === body.projeto && item.tipo === body.tipo);
      if (!template) return sendJson(res, 404, { error: "Projeto + Tipo não encontrado na aba Descricionado da planilha." });
      const codigoProjeto = template.codigoProjeto || buildProjectCode(body.projeto);
      const checklistRows = await supabaseRequest(CHECKLISTS_TABLE, "", { method: "POST", body: JSON.stringify({
        obra: body.obra, nome_tarefa: body.nomeTarefa, projeto: body.projeto, tipo: body.tipo, codigo_projeto: codigoProjeto,
        status: body.status || "Não iniciado", prioridade: body.prioridade || "Média", data_inicio: body.dataInicio || null,
        data_conclusao: body.dataConclusao || null, bucket: body.bucket || "Outros", responsavel: body.responsavel || null,
        anotacoes: body.anotacoes || null, criado_por: user.id, criado_por_nome: user.nome
      }) });
      const checklist = checklistRows[0];
      const itens = templateToItems(template, checklist.id);
      const itemRows = itens.length ? await supabaseRequest(ITEMS_TABLE, "", { method: "POST", body: JSON.stringify(itens) }) : [];
      sendJson(res, 201, fromDatabaseRecord({ ...checklist, planner_checklist_itens: itemRows }));
      return;
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = parseRequestBody(req);
      if (body.itemId) {
        const concluido = Boolean(body.concluido);
        const rows = await supabaseRequest(ITEMS_TABLE, `?id=eq.${encodeURIComponent(body.itemId)}`, { method: "PATCH", body: JSON.stringify({
          concluido, concluido_em: concluido ? new Date().toISOString() : null, concluido_por: concluido ? user.id : null,
          concluido_por_nome: concluido ? user.nome : null, atualizado_em: new Date().toISOString()
        }) });
        return sendJson(res, 200, { item: mapItem(rows[0] || {}) });
      }
      requireAdmin(user);
      if (!body.id) return sendJson(res, 400, { error: "Informe o ID da tarefa." });
      const patch = {};
      [["nomeTarefa", "nome_tarefa"], ["status", "status"], ["prioridade", "prioridade"], ["dataInicio", "data_inicio"], ["dataConclusao", "data_conclusao"], ["bucket", "bucket"], ["responsavel", "responsavel"], ["anotacoes", "anotacoes"]].forEach(([from, to]) => {
        if (Object.prototype.hasOwnProperty.call(body, from)) patch[to] = body[from] || null;
      });
      patch.atualizado_em = new Date().toISOString();
      const rows = await supabaseRequest(CHECKLISTS_TABLE, `?id=eq.${encodeURIComponent(body.id)}&select=*,planner_checklist_itens(*)`, { method: "PATCH", body: JSON.stringify(patch) });
      if (!Array.isArray(rows) || !rows.length) return sendJson(res, 404, { error: "Checklist não encontrado." });
      sendJson(res, 200, fromDatabaseRecord(rows[0]));
      return;
    }
    if (req.method === "DELETE") {
      requireAdmin(user);
      const id = new URL(req.url, "http://localhost").searchParams.get("id") || parseRequestBody(req).id;
      if (!id) return sendJson(res, 400, { error: "Informe o ID da tarefa." });
      await supabaseRequest(CHECKLISTS_TABLE, `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
  } catch (error) {
    console.error("Erro na API do Planner:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao processar o Planner." });
  }
};
