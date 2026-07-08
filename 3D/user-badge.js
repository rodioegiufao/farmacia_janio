(function () {
    const AUTH_URL = "/api/auth";

    function obterIniciais(nome) {
        const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return "?";
        const primeira = partes[0][0] || "";
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] || "");
        return `${primeira}${ultima}`.toUpperCase();
    }

    async function obterUsuarioAtual() {
        try {
            const response = await fetch(AUTH_URL, { credentials: "same-origin" });
            if (!response.ok) return null;
            const data = await response.json().catch(() => ({}));
            return data.user || null;
        } catch (_error) {
            return null;
        }
    }

    function criarBolinhaUsuario(user) {
        const badge = document.createElement("div");
        badge.className = "viewer-user-badge";
        badge.setAttribute("aria-label", `Usuário logado: ${user.nome || "usuário"}`);
        badge.textContent = obterIniciais(user.nome);
        return badge;
    }

    async function inicializarBolinhaUsuario() {
        const user = await obterUsuarioAtual();
        if (!user) return;

        document.querySelector(".viewer-user-badge")?.remove();
        document.body.appendChild(criarBolinhaUsuario(user));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializarBolinhaUsuario);
    } else {
        inicializarBolinhaUsuario();
    }
})();
