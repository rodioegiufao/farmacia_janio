const AUTH_URL = "/api/auth";
const USUARIOS_URL = "/api/usuarios";

const adminPanel = document.getElementById("adminPanel");
const accessDeniedPanel = document.getElementById("accessDeniedPanel");
const cadastroForm = document.getElementById("cadastroForm");
const usuariosLista = document.getElementById("usuariosLista");
const btnLogout = document.getElementById("btnLogout");
const usuarioLogado = document.getElementById("usuarioLogado");

inicializarAdmin();

async function inicializarAdmin() {
  cadastroForm.addEventListener("submit", cadastrarUsuario);
  btnLogout.addEventListener("click", sair);
  initThemeSelector();
  await verificarAcessoAdmin();
}

async function verificarAcessoAdmin() {
  try {
    const data = await fetch(AUTH_URL).then(validarResposta);
    const user = data.user;
    const adminLogado = user?.perfil === "admin";

    usuarioLogado.textContent = user ? `${user.nome} (${user.perfil})` : "";
    btnLogout.hidden = !user;
    adminPanel.hidden = !adminLogado;
    accessDeniedPanel.hidden = adminLogado;

    if (adminLogado) await carregarUsuarios();
  } catch (_erro) {
    usuarioLogado.textContent = "";
    btnLogout.hidden = true;
    adminPanel.hidden = true;
    accessDeniedPanel.hidden = false;
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