const {
  USERS_TABLE,
  clearSessionCookie,
  createSessionCookie,
  parseRequestBody,
  requireUser,
  sendJson,
  supabaseRequest,
  verifyPassword
} = require("./_auth");

module.exports = async function authHandler(req, res) {
  try {
    if (req.method === "GET") {
      const user = await requireUser(req);
      sendJson(res, 200, { user });
      return;
    }

    if (req.method === "POST") {
      const { usuario, senha } = parseRequestBody(req);
      if (!usuario || !senha) {
        sendJson(res, 400, { error: "Informe usuário e senha." });
        return;
      }

      const users = await supabaseRequest(
        USERS_TABLE,
        `?usuario=eq.${encodeURIComponent(String(usuario).trim().toLowerCase())}&ativo=eq.true&select=id,nome,usuario,senha_hash,perfil`
      );
      const user = Array.isArray(users) ? users[0] : null;

      if (!user || !verifyPassword(senha, user.senha_hash)) {
        sendJson(res, 401, { error: "Usuário ou senha inválidos." });
        return;
      }

      const publicUser = { id: user.id, nome: user.nome, usuario: user.usuario, perfil: user.perfil };
      sendJson(res, 200, { user: publicUser }, { "Set-Cookie": createSessionCookie(publicUser) });
      return;
    }

    if (req.method === "DELETE") {
      sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
      return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
  } catch (error) {
    console.error("Erro na API de autenticação:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao processar autenticação." });
  }
};