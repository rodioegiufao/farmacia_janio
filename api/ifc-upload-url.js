const path = require("path");
const { randomUUID } = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_BUCKET = "ifc-conversions"; // Crie este bucket no Supabase Storage; pode ser privado.

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sanitizeStorageFileName(fileName) {
  const base = path.basename(String(fileName || "modelo.ifc"));
  const withoutAccents = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const safeName = withoutAccents
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return safeName || "modelo.ifc";
}

function buildStoragePathParts(fileName) {
  const safeName = sanitizeStorageFileName(fileName);

  if (!safeName.toLowerCase().endsWith(".ifc")) {
    throw new Error("Envie um arquivo com extensão .ifc.");
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const id = randomUUID().replace(/-/g, "");

  return { safeName, today, id };
}

function buildStoragePath(fileName) {
  const { safeName, today, id } = buildStoragePathParts(fileName);
  return { safeName, storagePath: `uploads/${today}/${id}_${safeName}` };
}

function buildFlatStoragePath(fileName) {
  const { safeName, today, id } = buildStoragePathParts(fileName);
  return { safeName, storagePath: `uploads_${today}_${id}_${safeName}` };
}

async function createSignedUploadUrlWithFallback(supabase, bucket, fileName) {
  const primary = buildStoragePath(fileName);

  console.log("[ifc-upload-url] bucket:", bucket);
  console.log("[ifc-upload-url] safeName:", primary.safeName);
  console.log("[ifc-upload-url] storagePath:", primary.storagePath);
  console.log("[ifc-upload-url] SUPABASE_URL existe:", Boolean(process.env.SUPABASE_URL));
  console.log("[ifc-upload-url] SERVICE_ROLE existe:", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(primary.storagePath);

  if (!error) {
    return { data, storagePath: primary.storagePath, safeName: primary.safeName };
  }

  console.error("[ifc-upload-url] Erro Supabase:", {
    message: error.message,
    storagePath: primary.storagePath,
    bucket
  });

  console.warn("[ifc-upload-url] Falha com path com subpastas. Tentando path plano.", {
    primaryPath: primary.storagePath,
    error: error.message
  });

  const flat = buildFlatStoragePath(fileName);
  console.log("[ifc-upload-url] safeName:", flat.safeName);
  console.log("[ifc-upload-url] storagePath:", flat.storagePath);

  const retry = await supabase.storage.from(bucket).createSignedUploadUrl(flat.storagePath);

  if (retry.error) {
    console.error("[ifc-upload-url] Erro Supabase no fallback:", {
      message: retry.error.message,
      storagePath: flat.storagePath,
      bucket
    });

    throw new Error(
      `Não foi possível criar URL assinada de upload. Path 1: ${primary.storagePath}. Erro 1: ${error.message}. Path 2: ${flat.storagePath}. Erro 2: ${retry.error.message}`
    );
  }

  return { data: retry.data, storagePath: flat.storagePath, safeName: flat.safeName };
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
    const supabase = getSupabaseClient();
    const { data, storagePath } = await createSignedUploadUrlWithFallback(supabase, SUPABASE_BUCKET, body.fileName);

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
