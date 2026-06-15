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

  function inicializarMenuUsuario() {
    const userMenu = document.getElementById("userMenu");
    const userMenuTrigger = document.getElementById("userMenuTrigger");
    const btnLogout = document.getElementById("btnLogout");
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
      if (event.key === "Escape") fecharMenuUsuario();
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
