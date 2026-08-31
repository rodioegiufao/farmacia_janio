const assert = require("node:assert/strict");
const fs = require("node:fs");

process.env.AUTH_SECRET = "client-profile-test-secret";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

const {
  createSessionCookie,
  normalizeUserProfile,
  require3DUser,
  requireInternalUser,
  USER_PROFILES,
  VALID_PROFILES
} = require("../api/_auth");

async function main() {
  assert.deepEqual(VALID_PROFILES, ["admin", "colaborador", "cliente"]);
  assert.equal(normalizeUserProfile(" Cliente "), "cliente", "cliente não pode ser convertido em colaborador");
  assert.equal(normalizeUserProfile("desconhecido"), "colaborador");

  const cliente = { id: "cliente-id", nome: "Cliente", usuario: "cliente", perfil: USER_PROFILES.CLIENT };
  const cookie = createSessionCookie(cliente).split(";")[0];
  const req = { headers: { cookie } };
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([cliente]) });
  try {
    assert.equal((await require3DUser(req)).perfil, "cliente", "cliente deve acessar APIs autenticadas do 3D");
    await assert.rejects(requireInternalUser(req), (error) => error.statusCode === 403 && error.message === "Seu perfil não possui acesso a este recurso.");
  } finally {
    global.fetch = originalFetch;
  }

  for (const endpoint of ["atividades.js", "atividades-semanais.js", "planner-checklist.js", "obras.js", "gerar-memorando-word.js"]) {
    assert.match(fs.readFileSync(`api/${endpoint}`, "utf8"), /requireInternalUser\(req\)/, `${endpoint} deve bloquear cliente`);
  }
  assert.match(fs.readFileSync("api/share-models.js", "utf8"), /await require3DUser\(req\)/);
  const app = fs.readFileSync("3D/app.js", "utf8");
  assert.match(app, /window\.__VIEWER_AUTH_USER__ = user[\s\S]*viewer-authenticated\.js/);
  assert.match(fs.readFileSync("3D/viewer/viewer-authenticated.js", "utf8"), /if \(window\.__VIEWER_AUTH_USER__\)/);
  console.log("client profile authorization: ok");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });