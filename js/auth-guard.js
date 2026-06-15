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

  async function protectCurrentPage() {
    if (!isProtectedPath()) return;
    const user = await getCurrentUser();
    if (!user) redirectToHomeLogin();
  }

  window.SiteAuth = {
    getCurrentUser,
    requestJson,
    redirectToHomeLogin
  };

  protectCurrentPage();
})();