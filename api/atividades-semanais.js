const { parseRequestBody, requireUser, sendJson, supabaseRequest } = require("./_auth");

const SUPABASE_TABLE = "atividades_semanais";

const FIELD_TO_COLUMN = {
  id: "id",
  semana: "semana",
  atividade: "atividade",
  descricao: "descricao",
  criadoEm: "criado_em",
  atualizadoEm: "atualizado_em"
};

function toDatabaseRecord(weeklyActivity) {
  return Object.entries(FIELD_TO_COLUMN).reduce((record, [field, column]) => {
    if (Object.prototype.hasOwnProperty.call(weeklyActivity, field)) {
      record[column] = weeklyActivity[field] || null;
    }
    return record;
  }, {});
}

function fromDatabaseRecord(record) {
  return Object.entries(FIELD_TO_COLUMN).reduce((weeklyActivity, [field, column]) => {
    weeklyActivity[field] = record[column] ?? "";
    return weeklyActivity;
  }, {});
}

function requireAdmin(user) {
  if (user?.perfil === "admin") return;

  const error = new Error("Apenas administradores podem cadastrar, editar ou excluir atividades semanais.");
  error.statusCode = 403;
  throw error;
}

function validateRequiredFields(record) {
  if (!record.semana || !record.atividade) {
    const error = new Error("Semana e atividade são campos obrigatórios.");
    error.statusCode = 400;
    throw error;
  }
}

module.exports = async function atividadesSemanaisHandler(req, res) {
  try {
    if (req.method === "GET") {
      await requireUser(req);
      const data = await supabaseRequest(SUPABASE_TABLE, "?select=*&order=criado_em.desc");
      sendJson(res, 200, Array.isArray(data) ? data.map(fromDatabaseRecord) : []);
      return;
    }

    if (req.method === "POST") {
      const user = await requireUser(req);
      requireAdmin(user);
      const body = parseRequestBody(req);
      const record = toDatabaseRecord(body);
      delete record.atualizado_em;
      validateRequiredFields(record);

      const data = await supabaseRequest(SUPABASE_TABLE, "", {
        method: "POST",
        body: JSON.stringify(record)
      });
      sendJson(res, 201, fromDatabaseRecord(data[0] || {}));
      return;
    }

    if (req.method === "PUT") {
      const user = await requireUser(req);
      requireAdmin(user);
      const body = parseRequestBody(req);
      if (!body.id) {
        sendJson(res, 400, { error: "ID da atividade semanal não informado." });
        return;
      }

      const record = toDatabaseRecord(body);
      delete record.id;
      delete record.criado_em;
      delete record.atualizado_em;
      validateRequiredFields(record);

      const data = await supabaseRequest(SUPABASE_TABLE, `?id=eq.${encodeURIComponent(body.id)}`, {
        method: "PATCH",
        body: JSON.stringify(record)
      });
      if (!Array.isArray(data) || !data.length) {
        sendJson(res, 404, { error: "Atividade semanal não encontrada." });
        return;
      }
      sendJson(res, 200, fromDatabaseRecord(data[0] || {}));
      return;
    }

    if (req.method === "DELETE") {
      const user = await requireUser(req);
      requireAdmin(user);
      const id = typeof req.query?.id === "string" ? req.query.id : "";
      if (!id) {
        sendJson(res, 400, { error: "Informe o ID da atividade semanal." });
        return;
      }

      await supabaseRequest(SUPABASE_TABLE, `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
  } catch (error) {
    console.error("Erro na API de atividades semanais:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao processar atividades semanais." });
  }
};
