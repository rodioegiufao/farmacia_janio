const { createClient } = require("@supabase/supabase-js");

const SUPABASE_BUCKET = "ifc-conversions";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function normalizeSupabaseProjectUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    return String(value || "").trim();
  }
}

function getSupabaseClient() {
  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.SUPABASE_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel para gerar URLs assinadas de upload.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function safeStorageFileName(fileName) {
  const base = String(fileName || "modelo.ifc").split(/[\\/]/).pop();
  const safeName = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!safeName || !safeName.toLowerCase().endsWith(".ifc")) {
    throw new Error("Envie um arquivo com extensão .ifc.");
  }

  return safeName;
}

function createUploadPath(fileName) {
  const safeName = safeStorageFileName(fileName);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const id = `${Date.now()}${Math.random().toString(16).slice(2)}`.replace(/[^a-zA-Z0-9]/g, "");

  return `uploads/${today}/${id}_${safeName}`;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
      if (raw.length > 32 * 1024) {
        reject(new Error("JSON da requisição é grande demais."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

async function ensureBucketExists(supabase) {
  const { data: bucket, error: getError } = await supabase.storage.getBucket(SUPABASE_BUCKET);

  if (bucket) {
    return;
  }

  if (getError && !/not found|does not exist|bucket not found/i.test(getError.message || "")) {
    throw new Error(`Não foi possível verificar o bucket ${SUPABASE_BUCKET}: ${getError.message}`);
  }

  const { error: createError } = await supabase.storage.createBucket(SUPABASE_BUCKET, {
    public: false,
    fileSizeLimit: "250MB"
  });

  if (createError && !/already exists/i.test(createError.message || "")) {
    throw new Error(`Não foi possível criar o bucket ${SUPABASE_BUCKET}: ${createError.message}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { ok: false, error: "Método não permitido." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const path = createUploadPath(body.fileName);
    const supabase = getSupabaseClient();

    await ensureBucketExists(supabase);

    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUploadUrl(path);

    if (error) {
      throw new Error(`Não foi possível gerar URL assinada de upload: ${error.message}`);
    }

    sendJson(res, 200, {
      ok: true,
      bucket: SUPABASE_BUCKET,
      path: data.path || path,
      token: data.token,
      signedUrl: data.signedUrl
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "Falha ao preparar upload IFC." });
  }
};