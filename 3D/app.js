// Bootstrap mínimo: autentica antes de baixar qualquer implementação do visualizador.
const AUTH_TIMEOUT_MS = 4000;

async function checkAuthentication() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
    try {
        const response = await fetch("/api/auth", {
            credentials: "same-origin",
            signal: controller.signal,
            headers: { Accept: "application/json" }
        });
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.user || null;
    } catch (error) {
        console.warn("Autenticação indisponível; iniciando visualização pública segura.", error);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

function loadClassicScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
    });
}

async function start() {
    const user = await checkAuthentication();
    if (!user) {
        const { startPublicViewer } = await import("./viewer/viewer-public.js");
        startPublicViewer();
        return;
    }

    window.__VIEWER_AUTH_USER__ = user;
    await loadClassicScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
    await import("./viewer/viewer-authenticated.js");
    loadClassicScript("/3D/user-badge.js");

    if (document.body?.dataset?.project === "ifc_upload") {
        await loadClassicScript("https://cdn.jsdelivr.net/pyodide/v0.28.0a3/full/pyodide.js");
        await import("./ifc_upload.js");
    }
}

start().catch(async (error) => {
    console.error("Falha ao iniciar o visualizador; usando modo público.", error);
    if (!window.__VIEWER_AUTH_USER__) {
        const { startPublicViewer } = await import("./viewer/viewer-public.js");
        startPublicViewer();
    }
});