const { parseRequestBody, requireUser, sendJson, supabaseRequest } = require("./_auth");
const { enriquecerRegistroComObra, resolverOuCriarObra } = require("./_obras");

const SUPABASE_TABLE = "atividades_colaboradores";

const COLABORADORES = ["Rodrigo", "Hellen", "Bruno", "Rian", "Geovanna"];

function isValidActivityDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validateActivityDates(activity) {
  const dateFields = [
    ["dataPrevista", "data prevista"],
    ["dataInicio", "data de início"],
    ["dataTermino", "data de término"]
  ];

  dateFields.forEach(([field, label]) => {
    if (activity[field] && !isValidActivityDate(activity[field])) {
      const error = new Error(`A ${label} deve ser uma data válida com ano de 4 dígitos.`);
      error.statusCode = 400;
      throw error;
    }
  });

  if (activity.dataInicio && activity.dataTermino && activity.dataTermino < activity.dataInicio) {
    const error = new Error("A data de término deve ser maior ou igual à data de início.");
    error.statusCode = 400;
    throw error;
  }
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function collaboratorForUser(user) {
  const normalizedName = normalizeText(user?.nome);
  return COLABORADORES.find((collaborator) => {
    const normalizedCollaborator = normalizeText(collaborator);
    return normalizedName === normalizedCollaborator
      || normalizedName.startsWith(`${normalizedCollaborator} `)
      || normalizedName.includes(normalizedCollaborator);
  }) || user?.nome || "";
}

function enforceCollaboratorPermission(record, user) {
  if (user.perfil === "admin") return;

  const allowedCollaborator = collaboratorForUser(user);
  if (record.colaborador && record.colaborador !== allowedCollaborator) {
    const error = new Error("Você só pode preencher atividades para o seu próprio colaborador.");
    error.statusCode = 403;
    throw error;
  }

  record.colaborador = allowedCollaborator;
}

const FIELD_TO_COLUMN = {
  id: "id",
  colaborador: "colaborador",
  obra: "obra",
  obraId: "obra_id",
  prioridade: "prioridade",
  projeto: "projeto",
  trabalhos: "trabalhos",
  etapa: "etapa",
  dataInicio: "data_inicio",
  horaInicio: "hora_inicio",
  dataTermino: "data_termino",
  horaTermino: "hora_termino",
  dataPrevista: "data_prevista",
  status: "status",
  observacoes: "observacoes",
  criadoEm: "criado_em",
  usuarioId: "usuario_id",
  criadoPorNome: "criado_por_nome"
};

function getActivityInterval(activity) {
  if (!activity.data_inicio || !activity.hora_inicio || !activity.data_termino || !activity.hora_termino) return null;

  const start = new Date(`${activity.data_inicio}T${activity.hora_inicio}`);
  const end = new Date(`${activity.data_termino}T${activity.hora_termino}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

  return { start, end };
}

async function ensureNoScheduleOverlap(record) {
  const interval = getActivityInterval(record);
  if (!interval || !record.colaborador) return;

  const query = `?colaborador=eq.${encodeURIComponent(record.colaborador)}&select=id,trabalhos,data_inicio,hora_inicio,data_termino,hora_termino`;
  const existingRecords = await supabaseRequest(SUPABASE_TABLE, query);
  const conflict = (Array.isArray(existingRecords) ? existingRecords : []).find((existing) => {
    if (existing.id === record.id) return false;
    const existingInterval = getActivityInterval(existing);
    if (!existingInterval) return false;
    return interval.start < existingInterval.end && interval.end > existingInterval.start;
  });

  if (conflict) {
    const error = new Error(`O colaborador já possui atividade no período informado: ${conflict.trabalhos || conflict.id}.`);
    error.statusCode = 409;
    throw error;
  }
}

function toDatabaseRecord(activity) {
  return Object.entries(FIELD_TO_COLUMN).reduce((record, [field, column]) => {
    if (Object.prototype.hasOwnProperty.call(activity, field)) {
      record[column] = activity[field] || null;
    }
    return record;
  }, {});
}

function fromDatabaseRecord(record) {
  return Object.entries(FIELD_TO_COLUMN).reduce((activity, [field, column]) => {
    activity[field] = record[column] ?? "";
    return activity;
  }, {});
}

async function fromDatabaseRecordComObra(record) {
  const enriched = await enriquecerRegistroComObra(record);
  return { ...fromDatabaseRecord(enriched), obraId: enriched.obra_id || "", obraCodigo: enriched.obraCodigo || "", obra: enriched.obra || "" };
}
function filtroAtividadesRelacionadas(record) {
  const campos = [
    ["colaborador", record.colaborador],
    [record.obra_id ? "obra_id" : "obra", record.obra_id || record.obra],
    ["projeto", record.projeto],
    ["etapa", record.etapa]
  ];

  if (campos.some(([, valor]) => !String(valor || "").trim())) return "";
  return `?${campos.map(([campo, valor]) => `${campo}=eq.${encodeURIComponent(valor)}`).join("&")}`;
}

async function finalizarAtividadesRelacionadas(record) {
  if (normalizeText(record.status) !== "finalizado") return [];
  const filtro = filtroAtividadesRelacionadas(record);
  if (!filtro) return [];

  return supabaseRequest(SUPABASE_TABLE, `${filtro}&status=neq.Finalizado`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Finalizado" })
  });
}
module.exports = async function atividadesHandler(req, res) {
  try {
    if (req.method === "GET") {
      const user = await requireUser(req);
      const data = await supabaseRequest(SUPABASE_TABLE, "?select=*&order=criado_em.desc");
      sendJson(res, 200, Array.isArray(data) ? await Promise.all(data.map(fromDatabaseRecordComObra)) : []);
      return;
    }

    if (req.method === "POST") {
      const user = await requireUser(req);
      const body = parseRequestBody(req);
      validateActivityDates(body);
      const obra = await resolverOuCriarObra({ obraId: body.obraId, nomeObra: body.obra, usuarioId: user.id });
      body.obraId = obra.id;
      body.obra = obra.nome;
      const record = toDatabaseRecord(body);
      record.usuario_id = user.id;
      record.criado_por_nome = user.nome;
      enforceCollaboratorPermission(record, user);
      record.colaborador = record.colaborador || user.nome;
      await ensureNoScheduleOverlap(record);
      const data = await supabaseRequest(SUPABASE_TABLE, "", {
        method: "POST",
        body: JSON.stringify(record)
      });
      await finalizarAtividadesRelacionadas(record);
      sendJson(res, 201, { ...fromDatabaseRecord(data[0] || {}), obraId: obra.id, obraCodigo: obra.codigo, obra: obra.nome });
      return;
    }

    if (req.method === "PUT") {
      const user = await requireUser(req);
      const body = parseRequestBody(req);
      if (!body.id) {
        sendJson(res, 400, { error: "ID da atividade não informado." });
        return;
      }

      validateActivityDates(body);

      const atuais = await supabaseRequest(SUPABASE_TABLE, `?id=eq.${encodeURIComponent(body.id)}&select=id,usuario_id`);
      const atual = Array.isArray(atuais) ? atuais[0] : null;
      if (!atual) {
        sendJson(res, 404, { error: "Atividade não encontrada." });
        return;
      }
      if (user.perfil !== "admin" && atual.usuario_id !== user.id) {
        sendJson(res, 403, { error: "Você só pode editar atividades criadas por você." });
        return;
      }

      const obra = await resolverOuCriarObra({ obraId: body.obraId, nomeObra: body.obra, usuarioId: user.id });
      body.obraId = obra.id;
      body.obra = obra.nome;
      const record = toDatabaseRecord(body);
      enforceCollaboratorPermission(record, user);
      delete record.usuario_id;
      delete record.criado_por_nome;
      const data = await supabaseRequest(SUPABASE_TABLE, `?id=eq.${encodeURIComponent(body.id)}`, {
        method: "PATCH",
      });
      await finalizarAtividadesRelacionadas(record);
      sendJson(res, 200, { ...fromDatabaseRecord(data[0] || {}), obraId: obra.id, obraCodigo: obra.codigo, obra: obra.nome });
      return;
    }

    if (req.method === "DELETE") {
      const user = await requireUser(req);
      const id = typeof req.query?.id === "string" ? req.query.id : "";
      const all = req.query?.all === "true";

      if (!id && !all) {
        sendJson(res, 400, { error: "Informe o ID da atividade ou use all=true para apagar tudo." });
        return;
      }

      if (all && user.perfil !== "admin") {
        sendJson(res, 403, { error: "Apenas administradores podem limpar todos os registros." });
        return;
      }

      if (!all) {
        const atuais = await supabaseRequest(SUPABASE_TABLE, `?id=eq.${encodeURIComponent(id)}&select=id,usuario_id`);
        const atual = Array.isArray(atuais) ? atuais[0] : null;
        if (!atual) {
          sendJson(res, 404, { error: "Atividade não encontrada." });
          return;
        }
        if (user.perfil !== "admin" && atual.usuario_id !== user.id) {
          sendJson(res, 403, { error: "Você só pode excluir atividades criadas por você." });
          return;
        }
      }

      const filter = all ? "?id=not.is.null" : `?id=eq.${encodeURIComponent(id)}`;
      await supabaseRequest(SUPABASE_TABLE, filter, { method: "DELETE" });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
  } catch (error) {
    console.error("Erro na API de atividades:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao processar atividades." });
  }
};
module.exports._test = { filtroAtividadesRelacionadas };
