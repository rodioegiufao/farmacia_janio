const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const MIN_SUSPICIOUS_XKT_SIZE_BYTES = 50 * 1024;
const LARGE_IFC_SIZE_BYTES = 500 * 1024;
const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function safeBaseName(fileName) {
  return path.basename(String(fileName || "modelo.ifc")).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getUploadedFile(files) {
  const candidate = files?.file || files?.ifc || files?.upload || Object.values(files || {})[0];
  return Array.isArray(candidate) ? candidate[0] : candidate;
}

function parseMultipartForm(req) {
  return new Promise((resolve, reject) => {
    let formidableModule;
    try {
      formidableModule = require("formidable");
    } catch (error) {
      reject(new Error("Dependência 'formidable' não instalada. Execute npm install."));
      return;
    }

    const createForm = formidableModule.formidable || formidableModule.default || formidableModule;
    const form = createForm({
      keepExtensions: true,
      maxFileSize: MAX_UPLOAD_SIZE_BYTES,
      multiples: false,
      uploadDir: os.tmpdir()
    });

    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ fields, files });
    });
  });
}

function findConvertCommand() {
  const localBin = path.join(process.cwd(), "node_modules", ".bin");
  const candidates = [
    { command: path.join(localBin, "xeokit-convert"), args: [] },
    { command: path.join(localBin, "convert2xkt"), args: [] },
    { command: process.execPath, args: [path.join(process.cwd(), "node_modules", "@xeokit", "xeokit-convert", "convert2xkt.js")] }
  ];

  return candidates.find((candidate) => fs.existsSync(candidate.command) || candidate.command === process.execPath) || candidates[0];
}

function convertIfcToXkt(inputIfcPath, outputXktPath) {
  return new Promise((resolve, reject) => {
    const converter = findConvertCommand();
    const args = [...converter.args, "-s", inputIfcPath, "-o", outputXktPath];
    const startedAt = Date.now();
    let stdout = "";
    let stderr = "";

    console.log(`[ifc-to-xkt] Usando conversor: ${converter.command} ${args.join(" ")}`);

    const proc = spawn(converter.command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      console.log(`[ifc-to-xkt] ${chunk.toString().trim()}`);
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      console.error(`[ifc-to-xkt] ${chunk.toString().trim()}`);
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      const elapsedMs = Date.now() - startedAt;
      console.log(`[ifc-to-xkt] Tempo de conversão: ${elapsedMs}ms`);

      if (code !== 0) {
        reject(new Error(`convert2xkt finalizou com código ${code}. ${stderr || stdout || "Sem detalhes."}`));
        return;
      }

      resolve({ elapsedMs, stdout, stderr });
    });
  });
}

function cleanup(paths) {
  paths.forEach((filePath) => {
    if (!filePath) return;
    fs.promises.unlink(filePath).catch(() => {});
  });
}

async function ifcToXktHandler(req, res) {
  let uploadedPath = null;
  let inputIfcPath = null;
  let outputXktPath = null;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Método não permitido. Use POST com multipart/form-data." });
    return;
  }

  try {
    const { files } = await parseMultipartForm(req);
    const file = getUploadedFile(files);

    if (!file) {
      sendJson(res, 400, { error: "Nenhum arquivo IFC foi enviado." });
      return;
    }

    uploadedPath = file.filepath || file.path;
    const originalName = safeBaseName(file.originalFilename || file.name || "modelo.ifc");

    if (!originalName.toLowerCase().endsWith(".ifc")) {
      sendJson(res, 400, { error: "Envie um arquivo com extensão .ifc." });
      return;
    }

    const uniquePrefix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    inputIfcPath = path.join(os.tmpdir(), `${uniquePrefix}-${originalName}`);
    outputXktPath = path.join(os.tmpdir(), `${uniquePrefix}-${originalName.replace(/\.ifc$/i, ".xkt")}`);

    await fs.promises.rename(uploadedPath, inputIfcPath);
    uploadedPath = null;

    const ifcSize = (await fs.promises.stat(inputIfcPath)).size;
    console.log(`[ifc-to-xkt] Tamanho do IFC: ${ifcSize} bytes`);

    await convertIfcToXkt(inputIfcPath, outputXktPath);

    if (!fs.existsSync(outputXktPath)) {
      throw new Error("A conversão terminou, mas o arquivo XKT não foi criado.");
    }

    const xktSize = (await fs.promises.stat(outputXktPath)).size;
    console.log(`[ifc-to-xkt] Tamanho do XKT: ${xktSize} bytes`);

    if (xktSize === 0) {
      throw new Error("O XKT gerado ficou com 0 bytes. A conversão falhou.");
    }

    if (ifcSize > LARGE_IFC_SIZE_BYTES && xktSize < MIN_SUSPICIOUS_XKT_SIZE_BYTES) {
      throw new Error("O XKT gerado ficou muito pequeno em relação ao IFC. A conversão provavelmente falhou.");
    }

    const downloadName = path.basename(outputXktPath).replace(`${uniquePrefix}-`, "");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename=\"${downloadName}\"`);
    res.setHeader("Content-Length", String(xktSize));

    const stream = fs.createReadStream(outputXktPath);
    stream.on("close", () => cleanup([inputIfcPath, outputXktPath]));
    stream.on("error", (error) => {
      console.error("[ifc-to-xkt] Erro ao enviar XKT", error);
      cleanup([inputIfcPath, outputXktPath]);
      if (!res.headersSent) sendJson(res, 500, { error: "Erro ao enviar o arquivo XKT gerado." });
    });
    stream.pipe(res);
  } catch (error) {
    console.error("[ifc-to-xkt] Erro detalhado:", error);
    cleanup([uploadedPath, inputIfcPath, outputXktPath]);
    sendJson(res, error.statusCode || 500, { error: error.message || "Falha ao converter IFC para XKT." });
  }
}

module.exports = ifcToXktHandler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};