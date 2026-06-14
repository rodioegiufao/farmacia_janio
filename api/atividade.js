const SUPABASE_TABLE = "atividades_colaboradores";

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
  criadoEm: "criado_em"
};

function sendJson(res, statusCode, payload) {
  res
    .status(statusCode)
    .setHeader("Content-Type", "application/json; charset=utf-8")
    .send(JSON.stringify(payload));
}

function parseRequestBody(req) {
  if (!req?.body) return {};
  if (typeof req.body === "object") return req.body;

  try {
    return JSON.parse(req.body);
  } catch (_error) {
    return {};
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas na Vercel.");
  }

  return {
    baseUrl: `${url.replace(/\/$/, "")}/rest/v1/${SUPABASE_TABLE}`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }
  };
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

async function supabaseRequest(path = "", options = {}) {
  const { baseUrl, headers } = getSupabaseConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || "Erro ao acessar o Supabase.";
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

module.exports = async function atividadesHandler(req, res) {
  try {
    if (req.method === "GET") {
      const data = await supabaseRequest("?select=*&order=criado_em.desc");
      sendJson(res, 200, Array.isArray(data) ? data.map(fromDatabaseRecord) : []);
      return;
    }

    if (req.method === "POST") {
      const body = parseRequestBody(req);
      const data = await supabaseRequest("", {
        method: "POST",
        body: JSON.stringify(toDatabaseRecord(body))
      });
      sendJson(res, 201, fromDatabaseRecord(data[0] || {}));
      return;
    }

    if (req.method === "PUT") {
      const body = parseRequestBody(req);
      if (!body.id) {
        sendJson(res, 400, { error: "ID da atividade não informado." });
        return;
      }

      const data = await supabaseRequest(`?id=eq.${encodeURIComponent(body.id)}`, {
        method: "PATCH",
        body: JSON.stringify(toDatabaseRecord(body))
      });
      sendJson(res, 200, fromDatabaseRecord(data[0] || {}));
      return;
    }

    if (req.method === "DELETE") {
      const id = typeof req.query?.id === "string" ? req.query.id : "";
      const all = req.query?.all === "true";

      if (!id && !all) {
        sendJson(res, 400, { error: "Informe o ID da atividade ou use all=true para apagar tudo." });
        return;
      }

      const filter = all ? "?id=not.is.null" : `?id=eq.${encodeURIComponent(id)}`;
      await supabaseRequest(filter, { method: "DELETE" });
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
  } catch (error) {
    console.error("Erro na API de atividades:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao processar atividades." });
  }
};