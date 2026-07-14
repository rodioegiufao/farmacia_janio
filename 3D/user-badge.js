(function () {
    const AUTH_URL = "/api/auth";
    let usuarioAtual = null;

    function obterIniciais(nome) {
        const partes = String(nome || "").trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return "?";
        const primeira = partes[0][0] || "";
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] || "");
        return `${primeira}${ultima}`.toUpperCase();
    }

    async function requestJson(url, options) {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o perfil.");
        return data;
    }

    async function obterUsuarioAtual() {
        try {
            const data = await requestJson(AUTH_URL, { credentials: "same-origin" });
            return data.user || null;
        } catch (_error) {
            return null;
        }
    }

    function getProfilePasswordIcon(isVisible) {
        return isVisible
            ? `<svg class="viewer-profile-password-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5c5.05 0 8.63 4.06 10 7-1.37 2.94-4.95 7-10 7S3.37 14.94 2 12c1.37-2.94 4.95-7 10-7Zm0 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><circle cx="12" cy="12" r="2.15"/></svg>`
            : `<svg class="viewer-profile-password-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3.28 2 18.72 18.72-1.28 1.28-3.3-3.3A10.7 10.7 0 0 1 12 20C6.95 20 3.37 15.94 2 13c.7-1.49 2.01-3.28 3.8-4.71L2 4.49 3.28 2Zm6.22 9.43a3 3 0 0 0 3.91 3.91L9.5 11.43Zm2.5-6.43c5.05 0 8.63 4.06 10 7a13.53 13.53 0 0 1-3.1 4.17l-2.84-2.84A4 4 0 0 0 10.67 7.94L8.85 6.12A10.1 10.1 0 0 1 12 5Z"/></svg>`;
    }

    function updateProfilePasswordToggle(button, isVisible) {
        const label = button.dataset.target === "viewerProfileSenhaAtual" ? "senha atual" : "nova senha";
        button.setAttribute("aria-pressed", String(isVisible));
        button.setAttribute("aria-label", `${isVisible ? "Ocultar" : "Mostrar"} ${label}`);
        button.innerHTML = getProfilePasswordIcon(isVisible);
    }

    function toggleProfilePasswordVisibility(event) {
        const button = event.currentTarget;
        const input = document.getElementById(button.dataset.target);
        if (!input) return;
        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";
        updateProfilePasswordToggle(button, showPassword);
    }

    function resetProfilePasswordVisibility() {
        document.querySelectorAll("#viewerProfileSenhaAtual, #viewerProfileNovaSenha").forEach((input) => { input.type = "password"; });
        document.querySelectorAll(".viewer-profile-password-toggle").forEach((button) => updateProfilePasswordToggle(button, false));
    }

    function fecharPerfil() {
        const modal = document.getElementById("viewerProfileModal");
        if (modal) modal.hidden = true;
    }

    function atualizarBolinha(user) {
        usuarioAtual = user || usuarioAtual;
        const badge = document.querySelector(".viewer-user-badge");
        if (!badge) return;
        badge.textContent = obterIniciais(user?.nome);
        badge.setAttribute("aria-label", `Abrir perfil de ${user?.nome || "usuário"}`);
    }

    async function salvarPerfil(event) {
        event.preventDefault();
        try {
            const data = await requestJson(AUTH_URL, {
                method: "PUT",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: document.getElementById("viewerProfileNome").value,
                    usuario: document.getElementById("viewerProfileUsuario").value,
                    senhaAtual: document.getElementById("viewerProfileSenhaAtual").value,
                    novaSenha: document.getElementById("viewerProfileNovaSenha").value
                })
            });
            atualizarBolinha(data.user);
            fecharPerfil();
            alert("Perfil atualizado com sucesso.");
        } catch (error) {
            alert(error.message || "Não foi possível atualizar o perfil.");
        }
    }

    function garantirModalPerfil() {
        let modal = document.getElementById("viewerProfileModal");
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "viewerProfileModal";
        modal.className = "viewer-profile-modal";
        modal.hidden = true;
        modal.innerHTML = `
            <div class="viewer-profile-card" role="dialog" aria-modal="true" aria-labelledby="viewerProfileTitle">
                <button type="button" class="viewer-profile-close" id="viewerProfileClose" aria-label="Fechar perfil">×</button>
                <h2 id="viewerProfileTitle">Perfil</h2>
                <p class="viewer-profile-help">Atualize seu nome, login ou senha. Deixe a nova senha em branco se não quiser alterá-la.</p>
                <form id="viewerProfileForm" class="viewer-profile-form">
                    <label>Nome
                        <input type="text" id="viewerProfileNome" required>
                    </label>
                    <label>Login
                        <input type="text" id="viewerProfileUsuario" autocomplete="username" required>
                    </label>
                    <label>Senha atual <small>(necessária para trocar a senha)</small>
                        <span class="viewer-profile-password-field">
                            <input type="password" id="viewerProfileSenhaAtual" autocomplete="current-password">
                            <button type="button" class="viewer-profile-password-toggle" data-target="viewerProfileSenhaAtual" aria-label="Mostrar senha atual" aria-pressed="false"></button>
                        </span>
                    </label>
                    <label>Nova senha
                        <span class="viewer-profile-password-field">
                            <input type="password" id="viewerProfileNovaSenha" autocomplete="new-password" minlength="6">
                            <button type="button" class="viewer-profile-password-toggle" data-target="viewerProfileNovaSenha" aria-label="Mostrar nova senha" aria-pressed="false"></button>
                        </span>
                    </label>
                    <div class="viewer-profile-actions">
                        <button type="button" id="viewerProfileCancel">Cancelar</button>
                        <button type="submit">Salvar perfil</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener("click", (event) => { if (event.target === modal) fecharPerfil(); });
        document.getElementById("viewerProfileClose")?.addEventListener("click", fecharPerfil);
        document.getElementById("viewerProfileCancel")?.addEventListener("click", fecharPerfil);
        document.getElementById("viewerProfileForm")?.addEventListener("submit", salvarPerfil);
        modal.querySelectorAll(".viewer-profile-password-toggle").forEach((button) => {
            updateProfilePasswordToggle(button, false);
            button.addEventListener("click", toggleProfilePasswordVisibility);
        });
        return modal;
    }

    function abrirPerfil(user) {
        const modal = garantirModalPerfil();
        document.getElementById("viewerProfileNome").value = user?.nome || "";
        document.getElementById("viewerProfileUsuario").value = user?.usuario || "";
        document.getElementById("viewerProfileSenhaAtual").value = "";
        document.getElementById("viewerProfileNovaSenha").value = "";
        resetProfilePasswordVisibility();
        modal.hidden = false;
        document.getElementById("viewerProfileNome")?.focus();
    }

    function criarBolinhaUsuario(user) {
        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "viewer-user-badge";
        badge.setAttribute("aria-label", `Abrir perfil de ${user.nome || "usuário"}`);
        badge.title = "Abrir perfil";
        badge.textContent = obterIniciais(user.nome);
        badge.addEventListener("click", () => abrirPerfil(usuarioAtual || user));
        return badge;
    }

    async function inicializarBolinhaUsuario() {
        const user = await obterUsuarioAtual();
        if (!user) return;
        usuarioAtual = user;

        document.querySelector(".viewer-user-badge")?.remove();
        document.body.appendChild(criarBolinhaUsuario(user));
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") fecharPerfil();
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inicializarBolinhaUsuario);
    } else {
        inicializarBolinhaUsuario();
    }
})();
