const { parseRequestBody, requireUser, sendJson, supabaseRequest } = require("./_auth");

const SUPABASE_TABLE = "atividades_colaboradores";

const COLABORADORES = ["Rodrigo", "Hellen", "Bruno", "Estagiário"];

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

module.exports = async function atividadesHandler(req, res) {
  try {
    if (req.method === "GET") {
      const user = await requireUser(req);
      const data = await supabaseRequest(SUPABASE_TABLE, "?select=*&order=criado_em.desc");
      sendJson(res, 200, Array.isArray(data) ? data.map(fromDatabaseRecord) : []);
      return;
    }

    if (req.method === "POST") {
      const user = await requireUser(req);
      const body = parseRequestBody(req);
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
      sendJson(res, 201, fromDatabaseRecord(data[0] || {}));
      return;
    }

    if (req.method === "PUT") {
      const user = await requireUser(req);
      const body = parseRequestBody(req);
      if (!body.id) {
        sendJson(res, 400, { error: "ID da atividade não informado." });
        return;
      }

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

      const record = toDatabaseRecord(body);
      enforceCollaboratorPermission(record, user);
      delete record.usuario_id;
      delete record.criado_por_nome;
      const data = await supabaseRequest(SUPABASE_TABLE, `?id=eq.${encodeURIComponent(body.id)}`, {
        method: "PATCH",
        body: JSON.stringify(record)
      });
      sendJson(res, 200, fromDatabaseRecord(data[0] || {}));
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
