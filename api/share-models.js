const SHARE_TTL_MS = 60 * 60 * 1000;
const STORE = globalThis.__ifcShareStore || new Map();
globalThis.__ifcShareStore = STORE;

function parseRequestBody(req) {
    if (!req?.body) {
        return {};
    }

    if (typeof req.body === "string") {
        try {
            return JSON.parse(req.body);
        } catch (_error) {
            return {};
        }
    }

    if (typeof req.body === "object") {
        return req.body;
    }

    return {};
}

function cleanupExpiredShares() {
    const now = Date.now();
    for (const [shareCode, shareData] of STORE.entries()) {
        const expiresAtMs = Date.parse(shareData?.expiresAt || "");
        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) {
            STORE.delete(shareCode);
        }
    }
}

function buildShareCode() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `share-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sendJson(res, statusCode, payload) {
    res
        .status(statusCode)
        .setHeader("Content-Type", "application/json; charset=utf-8")
        .send(JSON.stringify(payload));
}

function resolveRequestOrigin(req) {
    if (typeof req.headers?.origin === "string" && req.headers.origin.trim()) {
        return req.headers.origin;
    }

    const proto = req.headers?.["x-forwarded-proto"] || "https";
    const host = req.headers?.host || "";
    return host ? `${proto}://${host}` : "";
}

module.exports = function shareModelsHandler(req, res) {
    cleanupExpiredShares();

    if (req.method === "POST") {
        const body = parseRequestBody(req);
        const files = Array.isArray(body?.files) ? body.files : [];

        if (!files.length) {
            sendJson(res, 400, { error: "Nenhum arquivo recebido para compartilhar." });
            return;
        }

        const normalizedFiles = files
            .map((file) => ({
                name: typeof file?.name === "string" ? file.name : "modelo-compartilhado.ifc",
                type:
                    typeof file?.type === "string" && file.type.trim()
                        ? file.type
                        : "application/octet-stream",
                encoding: file?.encoding === "gzip+base64" ? "gzip+base64" : "base64",
                contentBase64: typeof file?.contentBase64 === "string" ? file.contentBase64 : ""
            }))
            .filter((file) => file.contentBase64.length > 0);

        if (!normalizedFiles.length) {
            sendJson(res, 400, { error: "Arquivos inválidos para compartilhamento." });
            return;
        }

        const shareCode = buildShareCode();
        const expiresAt = new Date(Date.now() + SHARE_TTL_MS).toISOString();

        STORE.set(shareCode, {
            files: normalizedFiles,
            createdAt: new Date().toISOString(),
            expiresAt
        });

        sendJson(res, 201, {
            shareCode,
            shareLink: `${resolveRequestOrigin(req)}/3D/ifc_upload?share=${encodeURIComponent(shareCode)}`,
            expiresAt
        });
        return;
    }

    if (req.method === "GET") {
        const shareCode = typeof req.query?.share === "string" ? req.query.share : "";
        if (!shareCode) {
            sendJson(res, 400, { error: "Código de compartilhamento não informado." });
            return;
        }

        const shareData = STORE.get(shareCode);
        if (!shareData) {
            sendJson(res, 404, { error: "Compartilhamento não encontrado." });
            return;
        }

        sendJson(res, 200, {
            files: shareData.files,
            expiresAt: shareData.expiresAt
        });
        return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
};
