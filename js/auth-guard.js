(function () {
  const AUTH_URL = "/api/auth";
  const PROTECTED_PATHS = ["/viabilidade", "/Memorial", "/alimentador", "/carimbo"];

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não foi possível validar o login.");
    return data;
  }

  async function getCurrentUser() {
    try {
      const data = await requestJson(AUTH_URL, { credentials: "same-origin" });
      return data.user || null;
    } catch (_error) {
      return null;
    }
  }

  function redirectToHomeLogin() {
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/?login=necessario&redirect=${encodeURIComponent(redirect)}`);
  }

  function isProtectedPath() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return PROTECTED_PATHS.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`));
  }

  function obterIniciais(nome) {
    const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "?";
    const primeira = partes[0][0] || "";
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] || "");
    return `${primeira}${ultima}`.toUpperCase();
  }

  function fecharMenuUsuario() {
    const userMenuTrigger = document.getElementById("userMenuTrigger");
    const userMenuPanel = document.getElementById("userMenuPanel");
    if (!userMenuTrigger || !userMenuPanel) return;
    userMenuPanel.hidden = true;
    userMenuTrigger.setAttribute("aria-expanded", "false");
  }

  function aplicarUsuarioNoMenu(user) {
    const userMenu = document.getElementById("userMenu");
    if (!userMenu) return;

    const iniciais = obterIniciais(user?.nome);
    userMenu.hidden = !user;
    document.getElementById("adminLink")?.toggleAttribute("hidden", user?.perfil !== "admin");
    if (document.getElementById("usuarioLogado")) document.getElementById("usuarioLogado").textContent = user?.nome || "";
    if (document.getElementById("usuarioPerfil")) document.getElementById("usuarioPerfil").textContent = user?.perfil || "";
    if (document.getElementById("usuarioIniciais")) document.getElementById("usuarioIniciais").textContent = iniciais;
    if (document.getElementById("usuarioIniciaisMenu")) document.getElementById("usuarioIniciaisMenu").textContent = iniciais;
    if (!user) fecharMenuUsuario();
  }


  function ensureProfileModal() {
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
          <label>Nome
            <input type="text" id="profileNome" required>
          </label>
          <label>Login
            <input type="text" id="profileUsuario" autocomplete="username" required>
          </label>
          <label>Senha atual <small>(necessária para trocar a senha)</small>
            <input type="password" id="profileSenhaAtual" autocomplete="current-password">
          </label>
          <label>Nova senha
            <input type="password" id="profileNovaSenha" autocomplete="new-password" minlength="6">
          </label>
          <div class="profile-modal-actions">
            <button type="button" id="profileCancel">Cancelar</button>
            <button type="submit">Salvar perfil</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => { if (event.target === modal) closeProfileModal(); });
    document.getElementById("profileModalClose")?.addEventListener("click", closeProfileModal);
    document.getElementById("profileCancel")?.addEventListener("click", closeProfileModal);
    document.getElementById("profileForm")?.addEventListener("submit", saveProfile);
    return modal;
  }

  function openProfileModal(user) {
    const modal = ensureProfileModal();
    document.getElementById("profileNome").value = user?.nome || "";
    document.getElementById("profileUsuario").value = user?.usuario || "";
    document.getElementById("profileSenhaAtual").value = "";
    document.getElementById("profileNovaSenha").value = "";
    modal.hidden = false;
    document.getElementById("profileNome")?.focus();
  }

  function closeProfileModal() {
    const modal = document.getElementById("profileModal");
    if (modal) modal.hidden = true;
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const data = await requestJson(AUTH_URL, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: document.getElementById("profileNome").value,
          usuario: document.getElementById("profileUsuario").value,
          senhaAtual: document.getElementById("profileSenhaAtual").value,
          novaSenha: document.getElementById("profileNovaSenha").value
        })
      });
      aplicarUsuarioNoMenu(data.user);
      closeProfileModal();
      alert("Perfil atualizado com sucesso.");
    } catch (error) {
      alert(error.message || "Não foi possível atualizar o perfil.");
    }
  }

  function inicializarMenuUsuario() {
    const userMenu = document.getElementById("userMenu");
    const userMenuTrigger = document.getElementById("userMenuTrigger");
    const btnLogout = document.getElementById("btnLogout");
    const btnPerfil = document.getElementById("btnPerfil");
    if (!userMenu || !userMenuTrigger) return;

    userMenuTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const userMenuPanel = document.getElementById("userMenuPanel");
      if (!userMenuPanel) return;
      const abrir = userMenuPanel.hidden;
      userMenuPanel.hidden = !abrir;
      userMenuTrigger.setAttribute("aria-expanded", String(abrir));
    });

    document.addEventListener("click", (event) => {
      if (userMenu.hidden || userMenu.contains(event.target)) return;
      fecharMenuUsuario();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        fecharMenuUsuario();
        closeProfileModal();
      }
    });

    btnPerfil?.addEventListener("click", async () => {
      const user = await getCurrentUser();
      if (!user) return;
      fecharMenuUsuario();
      openProfileModal(user);
    });

    btnLogout?.addEventListener("click", async () => {
      await requestJson(AUTH_URL, { method: "DELETE", credentials: "same-origin" }).catch(() => null);
      aplicarUsuarioNoMenu(null);
      window.location.href = "/";
    });

    getCurrentUser().then(aplicarUsuarioNoMenu);
  }

  async function protectCurrentPage() {
    if (!isProtectedPath()) return;
    const user = await getCurrentUser();
    aplicarUsuarioNoMenu(user);
    if (!user) redirectToHomeLogin();
  }

  window.SiteAuth = { getCurrentUser, requestJson, redirectToHomeLogin, aplicarUsuarioNoMenu };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarMenuUsuario);
  } else {
    inicializarMenuUsuario();
  }

  protectCurrentPage();
})();
