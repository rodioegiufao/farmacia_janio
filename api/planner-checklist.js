const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const { parseRequestBody, requireUser, sendJson, supabaseRequest } = require("./_auth");

const SUPABASE_TABLE = "planner_checklists";
const SHEET_NAME = "Descricionado";
const EXCEL_CANDIDATES = [
  path.join(process.cwd(), "Check-list Geral.xlsx"),
  path.join(process.cwd(), "atividades", "Check-list Geral.xlsx"),
  path.join(process.cwd(), "Check-list Geral.xlsm")
];

let cachedTemplates = null;

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

async function readWorkbookTemplates() {
  if (cachedTemplates) return cachedTemplates;
  const workbookPath = EXCEL_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!workbookPath) {
    cachedTemplates = [];
    return cachedTemplates;
  }

  const zip = await JSZip.loadAsync(fs.readFileSync(workbookPath));
  const workbookXml = await zip.file("xl/workbook.xml").async("string");
  const workbookRels = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const sheetMatch = [...workbookXml.matchAll(/<sheet[^>]+>/g)].find((match) => new RegExp(`name=["']${SHEET_NAME}["']`).test(match[0]));
  if (!sheetMatch) return [];

  const relId = sheetMatch[0].match(/r:id=["']([^"']+)/)?.[1];
  const relMatch = [...workbookRels.matchAll(/<Relationship[^>]+>/g)].find((match) => {
    const id = match[0].match(/Id=["\']([^"\']+)/)?.[1];
    return id === relId;
  });
  const target = relMatch?.[0].match(/Target=["']([^"']+)/)?.[1];
  if (!target) return [];

  const sharedFile = zip.file("xl/sharedStrings.xml");
  const sharedStrings = sharedFile ? [...(await sharedFile.async("string")).matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => decodeXml([...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join(""))) : [];
  const normalizedTarget = target.replace(/^\//, "");
  const sheetPath = normalizedTarget.startsWith("xl/") ? normalizedTarget : path.posix.join("xl", normalizedTarget);
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

  let lastProjeto = "";
  let lastTipo = "";
  let lastEtapa = "";
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
    if (!stage) {
      stage = { etapa, atividades: [] };
      group.etapas.push(stage);
    }
    stage.atividades.push(atividade);
  });

  cachedTemplates = [...groups.values()];
  return cachedTemplates;
}

function buildProjectCode(project) {
  const normalized = String(project || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("eletr")) return "PRJ-ELE";
  return `PRJ-${String(project || "GER").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "GER"}`;
}

function buildTasks(template) {
  return (template?.etapas || []).flatMap((stage) => stage.atividades.map((activity) => ({ etapa: stage.etapa, texto: `${stage.etapa} de ${activity}`, concluida: false })));
}

function fromDatabaseRecord(record) {
  return {
    id: record.id,
    obra: record.obra || "",
    projeto: record.projeto || "",
    tipo: record.tipo || "",
    codigoProjeto: record.codigo_projeto || buildProjectCode(record.projeto),
    titulo: record.titulo || `${record.codigo_projeto || buildProjectCode(record.projeto)} - ${record.tipo}`,
    responsavel: record.responsavel || "",
    prioridade: record.prioridade || "",
    dataPrevista: record.data_prevista || "",
    observacoes: record.observacoes || "",
    tarefas: Array.isArray(record.tarefas) ? record.tarefas : [],
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
      const data = await supabaseRequest(SUPABASE_TABLE, "?select=*&order=criado_em.desc");
      sendJson(res, 200, { modelos: templates, checklists: Array.isArray(data) ? data.map(fromDatabaseRecord) : [] });
      return;
    }

    if (req.method === "POST") {
      const body = parseRequestBody(req);
      if (!body.obra || !body.projeto || !body.tipo) {
        sendJson(res, 400, { error: "Nome da obra, projeto e tipo são obrigatórios." });
        return;
      }
      const template = templates.find((item) => item.projeto === body.projeto && item.tipo === body.tipo);
      if (!template) {
        sendJson(res, 404, { error: "Projeto + Tipo não encontrado na aba Descricionado da planilha." });
        return;
      }
      const codigoProjeto = template.codigoProjeto || buildProjectCode(body.projeto);
      const record = {
        obra: body.obra,
        projeto: body.projeto,
        tipo: body.tipo,
        codigo_projeto: codigoProjeto,
        titulo: `${codigoProjeto} - ${String(body.tipo).toUpperCase()}`,
        responsavel: body.responsavel || null,
        prioridade: body.prioridade || "P0",
        data_prevista: body.dataPrevista || null,
        observacoes: body.observacoes || null,
        tarefas: buildTasks(template),
        criado_por: user.id,
        criado_por_nome: user.nome
      };
      const data = await supabaseRequest(SUPABASE_TABLE, "", { method: "POST", body: JSON.stringify(record) });
      sendJson(res, 201, fromDatabaseRecord(data[0] || {}));
      return;
    }

    if (req.method === "PUT") {
      const body = parseRequestBody(req);
      if (!body.id || !Array.isArray(body.tarefas)) {
        sendJson(res, 400, { error: "Informe o ID e a lista de tarefas do checklist." });
        return;
      }
      const data = await supabaseRequest(SUPABASE_TABLE, `?id=eq.${encodeURIComponent(body.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ tarefas: body.tarefas, atualizado_em: new Date().toISOString() })
      });
      if (!Array.isArray(data) || !data.length) {
        sendJson(res, 404, { error: "Checklist não encontrado." });
        return;
      }
      sendJson(res, 200, fromDatabaseRecord(data[0] || {}));
      return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
  } catch (error) {
    console.error("Erro na API do Planner:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao processar o Planner." });
  }
};
