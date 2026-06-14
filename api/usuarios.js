const {
  USERS_TABLE,
  countUsers,
  hashPassword,
  parseRequestBody,
  requireUser,
  sendJson,
  supabaseRequest
} = require("./_auth");

function sanitizeUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    usuario: user.usuario,
    perfil: user.perfil,
    ativo: user.ativo
  };
}

module.exports = async function usuariosHandler(req, res) {
  try {
    if (req.method === "GET") {
      const currentUser = await requireUser(req);
      if (currentUser.perfil !== "admin") {
        sendJson(res, 403, { error: "Apenas administradores podem listar usuários." });
        return;
      }

      const users = await supabaseRequest(USERS_TABLE, "?select=id,nome,usuario,perfil,ativo&order=nome.asc");
      sendJson(res, 200, Array.isArray(users) ? users.map(sanitizeUser) : []);
      return;
    }

    if (req.method === "POST") {
      const body = parseRequestBody(req);
      const nome = String(body.nome || "").trim();
      const usuario = String(body.usuario || "").trim().toLowerCase();
      const senha = String(body.senha || "");
      const usersCount = await countUsers();
      let perfil = usersCount === 0 ? "admin" : "colaborador";

      if (!nome || !usuario || senha.length < 6) {
        sendJson(res, 400, { error: "Informe nome, usuário e uma senha com pelo menos 6 caracteres." });
        return;
      }

      if (usersCount > 0) {
        const currentUser = await requireUser(req);
        if (currentUser.perfil !== "admin") {
          sendJson(res, 403, { error: "Apenas administradores podem cadastrar novos usuários." });
          return;
        }
        perfil = body.perfil === "admin" ? "admin" : "colaborador";
      }

      const data = await supabaseRequest(USERS_TABLE, "", {
        method: "POST",
        body: JSON.stringify({ nome, usuario, senha_hash: hashPassword(senha), perfil, ativo: true })
      });

      sendJson(res, 201, sanitizeUser(data[0] || {}));
      return;
    }

    sendJson(res, 405, { error: "Método não suportado." });
  } catch (error) {
    console.error("Erro na API de usuários:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao processar usuários." });
  }
};