const AUTH_URL = "/api/auth";
const USUARIOS_URL = "/api/usuarios";

const adminPanel = document.getElementById("adminPanel");
const accessDeniedPanel = document.getElementById("accessDeniedPanel");
const cadastroForm = document.getElementById("cadastroForm");
const usuariosLista = document.getElementById("usuariosLista");
const btnLogout = document.getElementById("btnLogout");
const btnPerfil = document.getElementById("btnPerfil");
const userMenu = document.getElementById("userMenu");
const userMenuTrigger = document.getElementById("userMenuTrigger");
const userMenuPanel = document.getElementById("userMenuPanel");
const usuarioIniciais = document.getElementById("usuarioIniciais");
const usuarioIniciaisMenu = document.getElementById("usuarioIniciaisMenu");
const usuarioLogado = document.getElementById("usuarioLogado");
const usuarioPerfil = document.getElementById("usuarioPerfil");
const adminLink = document.getElementById("adminLink");
const passwordModal = document.getElementById("passwordModal");
const passwordForm = document.getElementById("passwordForm");

inicializarAdmin();

async function inicializarAdmin() {
  cadastroForm.addEventListener("submit", cadastrarUsuario);
  btnLogout.addEventListener("click", sair);
  btnPerfil?.addEventListener("click", abrirPerfil);
  userMenuTrigger.addEventListener("click", alternarMenuUsuario);
  usuariosLista.addEventListener("click", tratarAcaoUsuario);
  passwordForm.addEventListener("submit", salvarNovaSenha);
  document.getElementById("passwordModalClose").addEventListener("click", fecharModalSenha);
  document.getElementById("passwordCancel").addEventListener("click", fecharModalSenha);
  passwordModal.addEventListener("click", (event) => { if (event.target === passwordModal) fecharModalSenha(); });
  document.addEventListener("click", fecharMenuUsuarioAoClicarFora);
  document.addEventListener("keydown", fecharMenuUsuarioComTeclado);
  initThemeSelector();
  await verificarAcessoAdmin();
}

async function verificarAcessoAdmin() {
  try {
    const data = await fetch(AUTH_URL).then(validarResposta);
    const user = data.user;
    const adminLogado = user?.perfil === "admin";

    aplicarUsuarioNoMenu(user);
    adminPanel.hidden = !adminLogado;
    accessDeniedPanel.hidden = adminLogado;

    if (adminLogado) await carregarUsuarios();
  } catch (_erro) {
    aplicarUsuarioNoMenu(null);
    adminPanel.hidden = true;
    accessDeniedPanel.hidden = false;
  }
}

function aplicarUsuarioNoMenu(user) {
  const adminLogado = user?.perfil === "admin";
  userMenu.hidden = !user;
  adminLink.hidden = !adminLogado;
  usuarioLogado.textContent = user?.nome || "";
  usuarioPerfil.textContent = user?.perfil || "";
  const iniciais = obterIniciais(user?.nome);
  usuarioIniciais.textContent = iniciais;
  usuarioIniciaisMenu.textContent = iniciais;
  if (!user) fecharMenuUsuario();
}

function obterIniciais(nome) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return "?";

  const primeira = partes[0][0] || "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] || "");
  return `${primeira}${ultima}`.toUpperCase();
}

function alternarMenuUsuario(event) {
  event.stopPropagation();
  const abrir = userMenuPanel.hidden;
  userMenuPanel.hidden = !abrir;
  userMenuTrigger.setAttribute("aria-expanded", String(abrir));
}

function fecharMenuUsuario() {
  userMenuPanel.hidden = true;
  userMenuTrigger.setAttribute("aria-expanded", "false");
}

function fecharMenuUsuarioAoClicarFora(event) {
  if (userMenu.hidden || userMenu.contains(event.target)) return;
  fecharMenuUsuario();
}

function fecharMenuUsuarioComTeclado(event) {
  if (event.key === "Escape") {
    fecharMenuUsuario();
    fecharModalPerfil();
    fecharModalSenha();
  }
}


function garantirModalPerfil() {
  let modal = document.getElementById("profileModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "profileModal";
  modal.className = "profile-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
      <button type="button" class="profile-modal-close" id="profileModalClose" aria-label="Fechar perfil">×</button>
      <h2 id="profileModalTitle">Perfil</h2>
      <p class="profile-modal-help">Atualize seu nome, login ou senha. Deixe a nova senha em branco se não quiser alterá-la.</p>
      <form id="profileForm" class="profile-form">
        <label>Nome<input type="text" id="profileNome" required></label>
        <label>Login<input type="text" id="profileUsuario" autocomplete="username" required></label>
        <label>Senha atual <small>(necessária para trocar a senha)</small><span class="profile-password-field"><input type="password" id="profileSenhaAtual" autocomplete="current-password"><button type="button" class="profile-password-toggle" data-target="profileSenhaAtual" aria-label="Mostrar senha atual" aria-pressed="false">👁</button></span></label>
        <label>Nova senha<span class="profile-password-field"><input type="password" id="profileNovaSenha" autocomplete="new-password" minlength="6"><button type="button" class="profile-password-toggle" data-target="profileNovaSenha" aria-label="Mostrar nova senha" aria-pressed="false">👁</button></span></label>
        <div class="profile-modal-actions">
          <button type="button" id="profileCancel">Cancelar</button>
          <button type="submit">Salvar perfil</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => { if (event.target === modal) fecharModalPerfil(); });
  document.getElementById("profileModalClose")?.addEventListener("click", fecharModalPerfil);
  document.getElementById("profileCancel")?.addEventListener("click", fecharModalPerfil);
  document.getElementById("profileForm")?.addEventListener("submit", salvarPerfil);
  modal.querySelectorAll(".profile-password-toggle").forEach((button) => {
    button.addEventListener("click", alternarVisibilidadeSenhaPerfil);
  });
  return modal;
}
function obterIconeSenhaPerfil(estaVisivel) {
  return estaVisivel
    ? `<svg class="profile-password-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5c5.05 0 8.63 4.06 10 7-1.37 2.94-4.95 7-10 7S3.37 14.94 2 12c1.37-2.94 4.95-7 10-7Zm0 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><circle cx="12" cy="12" r="2.15"/></svg>`
    : `<svg class="profile-password-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3.28 2 18.72 18.72-1.28 1.28-3.3-3.3A10.7 10.7 0 0 1 12 20C6.95 20 3.37 15.94 2 13c.7-1.49 2.01-3.28 3.8-4.71L2 4.49 3.28 2Zm6.22 9.43a3 3 0 0 0 3.91 3.91L9.5 11.43Zm2.5-6.43c5.05 0 8.63 4.06 10 7a13.53 13.53 0 0 1-3.1 4.17l-2.84-2.84A4 4 0 0 0 10.67 7.94L8.85 6.12A10.1 10.1 0 0 1 12 5Z"/></svg>`;
}

function atualizarBotaoSenhaPerfil(button, estaVisivel) {
  button.setAttribute("aria-pressed", String(estaVisivel));
  button.setAttribute("aria-label", `${estaVisivel ? "Ocultar" : "Mostrar"} ${button.dataset.target === "profileSenhaAtual" ? "senha atual" : "nova senha"}`);
  button.innerHTML = obterIconeSenhaPerfil(estaVisivel);
}
function alternarVisibilidadeSenhaPerfil(event) {
  const button = event.currentTarget;
  const input = document.getElementById(button.dataset.target);
  if (!input) return;
  const mostrarSenha = input.type === "password";
  input.type = mostrarSenha ? "text" : "password";
  atualizarBotaoSenhaPerfil(button, false);
}

function redefinirVisibilidadeSenhasPerfil() {
  document.querySelectorAll("#profileSenhaAtual, #profileNovaSenha").forEach((input) => { input.type = "password"; });
  document.querySelectorAll(".profile-password-toggle").forEach((button) => {
    atualizarBotaoSenhaPerfil(button, false);
  });
}
async function abrirPerfil() {
  const data = await fetch(AUTH_URL).then(validarResposta);
  const modal = garantirModalPerfil();
  document.getElementById("profileNome").value = data.user?.nome || "";
  document.getElementById("profileUsuario").value = data.user?.usuario || "";
  document.getElementById("profileSenhaAtual").value = "";
  document.getElementById("profileNovaSenha").value = "";
  redefinirVisibilidadeSenhasPerfil();
  fecharMenuUsuario();
  modal.hidden = false;
  document.getElementById("profileNome")?.focus();
}

function fecharModalPerfil() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.hidden = true;
}

async function salvarPerfil(event) {
  event.preventDefault();
  try {
    const data = await fetch(AUTH_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: document.getElementById("profileNome").value,
        usuario: document.getElementById("profileUsuario").value,
        senhaAtual: document.getElementById("profileSenhaAtual").value,
        novaSenha: document.getElementById("profileNovaSenha").value
      })
    }).then(validarResposta);
    aplicarUsuarioNoMenu(data.user);
    fecharModalPerfil();
    alert("Perfil atualizado com sucesso.");
  } catch (erro) {
    alert(`Não foi possível atualizar o perfil: ${erro.message}`);
  }
}

async function cadastrarUsuario(event) {
  event.preventDefault();
  try {
    const data = await fetch(USUARIOS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: document.getElementById("cadastroNome").value,
        usuario: document.getElementById("cadastroUsuario").value,
        senha: document.getElementById("cadastroSenha").value,
        perfil: document.getElementById("cadastroPerfil").value
      })
    }).then(validarResposta);

    cadastroForm.reset();
    alert(`Usuário ${data.nome} cadastrado com sucesso.`);
    await carregarUsuarios();
  } catch (erro) {
    alert(`Não foi possível cadastrar: ${erro.message}`);
  }
}

async function carregarUsuarios() {
  try {
    const usuarios = await fetch(USUARIOS_URL).then(validarResposta);
    usuariosLista.innerHTML = usuarios.map((user) => `
      <article class="user-card">
        <strong>${escapeHtml(user.nome)}</strong>
        <span>Usuário: ${escapeHtml(user.usuario)}</span>
        <span>Perfil: ${escapeHtml(user.perfil)}</span>
        <span>Status: ${user.ativo ? "Ativo" : "Inativo"}</span>
        <button type="button" class="user-password-button" data-user-id="${escapeHtml(user.id)}" data-user-name="${escapeHtml(user.nome)}">
          <i class="fa-solid fa-key" aria-hidden="true"></i>
          Alterar senha
        </button>
      </article>
    `).join("");
  } catch (erro) {
    usuariosLista.innerHTML = `<p class="help-text">${escapeHtml(erro.message)}</p>`;
  }
}
function tratarAcaoUsuario(event) {
  const button = event.target.closest(".user-password-button");
  if (!button) return;

  passwordForm.reset();
  document.getElementById("passwordUserId").value = button.dataset.userId;
  document.getElementById("passwordUserName").textContent = button.dataset.userName;
  passwordModal.hidden = false;
  document.getElementById("passwordNew").focus();
}

function fecharModalSenha() {
  passwordModal.hidden = true;
  passwordForm.reset();
}

async function salvarNovaSenha(event) {
  event.preventDefault();
  const senha = document.getElementById("passwordNew").value;
  const confirmacao = document.getElementById("passwordConfirm").value;

  if (senha !== confirmacao) {
    alert("As senhas informadas não coincidem.");
    return;
  }

  try {
    const data = await fetch(USUARIOS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: document.getElementById("passwordUserId").value,
        senha
      })
    }).then(validarResposta);

    fecharModalSenha();
    alert(`Senha de ${data.nome} alterada com sucesso.`);
  } catch (erro) {
    alert(`Não foi possível alterar a senha: ${erro.message}`);
  }
}
async function sair() {
  await fetch(AUTH_URL, { method: "DELETE" }).catch(() => null);
  window.location.href = "/atividades/";
}

async function validarResposta(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Erro inesperado na comunicação com o servidor.");
  }
  return data;
}

function escapeHtml(valor) {
  return String(valor || "").replace(/[&<>'"]/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[caractere]);
}

function initThemeSelector() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  const html = document.documentElement;
  const savedTheme = localStorage.getItem("theme") || "dark";
  html.setAttribute("data-theme", savedTheme);
  themeToggle.checked = savedTheme === "light";

  themeToggle.addEventListener("change", function () {
    const theme = this.checked ? "light" : "dark";
    html.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  });
}
