const path = require("path");
const { randomUUID } = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_BUCKET = "ifc-conversions"; // Crie este bucket no Supabase Storage; pode ser privado.

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function safeBaseName(fileName) {
  return path.basename(String(fileName || "modelo.ifc")).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString("utf8");
      if (raw.length > 1024 * 1024) {
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

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel para assinar uploads IFC.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

module.exports = async function ifcUploadUrlHandler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Método não permitido. Use POST." });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const safeName = safeBaseName(body.fileName);

    if (!safeName.toLowerCase().endsWith(".ifc")) {
      sendJson(res, 400, { error: "Envie um arquivo com extensão .ifc." });
      return;
    }

    const datePrefix = new Date().toISOString().slice(0, 10);
    const storagePath = `uploads/${datePrefix}/${randomUUID()}-${safeName}`;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUploadUrl(storagePath);

    if (error) {
      throw new Error(`Não foi possível criar URL assinada de upload: ${error.message}`);
    }

    sendJson(res, 200, {
      storagePath,
      signedUploadUrl: data.signedUrl,
      token: data.token
    });
  } catch (error) {
    console.error("[ifc-upload-url] Erro detalhado:", error);
    sendJson(res, 500, { error: error.message || "Falha ao criar URL assinada de upload." });
  }
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};