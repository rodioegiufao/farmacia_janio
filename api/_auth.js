const crypto = require("crypto");

const USERS_TABLE = "usuarios_setor";

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
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

function normalizeSupabaseRestUrl(rawUrl) {
  const parsedUrl = new URL(rawUrl);
  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
  const restIndex = pathSegments.findIndex((segment, index) => segment === "rest" && pathSegments[index + 1] === "v1");

  parsedUrl.pathname = restIndex >= 0
    ? `/${pathSegments.slice(0, restIndex + 2).join("/")}`
    : `${parsedUrl.pathname.replace(/\/$/, "")}/rest/v1`;
  parsedUrl.search = "";
  parsedUrl.hash = "";

  return parsedUrl.toString().replace(/\/$/, "");
}

function getSupabaseConfig(table) {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas na Vercel.");
  }

  return {
    baseUrl: `${normalizeSupabaseRestUrl(url)}/${table}`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }
  };
}

async function supabaseRequest(table, path = "", options = {}) {
  const { baseUrl, headers } = getSupabaseConfig(table);
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

function requireAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("A variável AUTH_SECRET precisa estar configurada na Vercel.");
  return secret;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [algorithm, salt, expectedHash] = String(passwordHash || "").split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHash) return false;

  const actualHash = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === actualHash.length && crypto.timingSafeEqual(expected, actualHash);
}

function base64UrlEncode(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(value) {
  return crypto.createHmac("sha256", requireAuthSecret()).update(value).digest("base64url");
}

function createSessionCookie(user) {
  const maxAge = 60 * 60 * 12;
  const payload = base64UrlEncode({
    id: user.id,
    nome: user.nome,
    usuario: user.usuario,
    perfil: user.perfil,
    exp: Date.now() + maxAge * 1000
  });
  return `atividade_session=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return "atividade_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0";
}

function getCookie(req, name) {
  const cookies = String(req.headers?.cookie || "").split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const found = cookies.find((cookie) => cookie.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}

function getSessionUser(req) {
  const cookie = getCookie(req, "atividade_session");
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature || signature !== sign(payload)) return null;

  const user = base64UrlDecode(payload);
  if (!user?.id || !user?.exp || user.exp < Date.now()) return null;
  return user;
}

async function requireUser(req) {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    const error = new Error("Faça login para continuar.");
    error.statusCode = 401;
    throw error;
  }

  const users = await supabaseRequest(USERS_TABLE, `?id=eq.${encodeURIComponent(sessionUser.id)}&ativo=eq.true&select=id,nome,usuario,perfil`);
  const user = Array.isArray(users) ? users[0] : null;
  if (!user) {
    const error = new Error("Sessão inválida ou usuário desativado.");
    error.statusCode = 401;
    throw error;
  }
  return user;
}

async function countUsers() {
  const users = await supabaseRequest(USERS_TABLE, "?select=id", { headers: { Prefer: "count=exact" } });
  return Array.isArray(users) ? users.length : 0;
}

module.exports = {
  USERS_TABLE,
  clearSessionCookie,
  countUsers,
  createSessionCookie,
  hashPassword,
  parseRequestBody,
  requireUser,
  sendJson,
  supabaseRequest,
  verifyPassword
};