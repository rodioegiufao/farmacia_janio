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

inicializarAdmin();

async function inicializarAdmin() {
  cadastroForm.addEventListener("submit", cadastrarUsuario);
  btnLogout.addEventListener("click", sair);
  btnPerfil?.addEventListener("click", abrirPerfil);
  userMenuTrigger.addEventListener("click", alternarMenuUsuario);
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
        <label>Senha atual <small>(necessária para trocar a senha)</small><input type="password" id="profileSenhaAtual" autocomplete="current-password"></label>
        <label>Nova senha<input type="password" id="profileNovaSenha" autocomplete="new-password" minlength="6"></label>
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
  return modal;
}

async function abrirPerfil() {
  const data = await fetch(AUTH_URL).then(validarResposta);
  const modal = garantirModalPerfil();
  document.getElementById("profileNome").value = data.user?.nome || "";
  document.getElementById("profileUsuario").value = data.user?.usuario || "";
  document.getElementById("profileSenhaAtual").value = "";
  document.getElementById("profileNovaSenha").value = "";
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
      </article>
    `).join("");
  } catch (erro) {
    usuariosLista.innerHTML = `<p class="help-text">${escapeHtml(erro.message)}</p>`;
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
