import { createViewerCore } from "./viewer-core.js";

function buildPresentationInterface(core) {
    document.body.classList.add("viewer-public-mode");
    const toolbar = document.getElementById("toolbar");
    if (toolbar) {
        toolbar.innerHTML = "";
        toolbar.setAttribute("aria-label", "Disciplinas do projeto");
        const heading = document.createElement("div");
        heading.className = "public-viewer-heading";
        heading.innerHTML = `<strong>${core.config.name}</strong><span>Modo apresentação</span>`;
        toolbar.append(heading);
        core.models.forEach((model, id) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "public-discipline active";
            button.setAttribute("aria-pressed", "true");
            button.textContent = id.replaceAll("_", " ");
            button.addEventListener("click", () => {
                model.visible = !model.visible;
                button.classList.toggle("active", model.visible);
                button.setAttribute("aria-pressed", String(model.visible));
            });
            toolbar.append(button);
        });
        const login = document.createElement("a");
        login.className = "public-login-link";
        login.href = "/login";
        login.textContent = "Entrar na área técnica";
        toolbar.append(login);
    }
}

export function startPublicViewer() {
    const core = createViewerCore();
    buildPresentationInterface(core);
    core.viewer.scene.input.on("mouseclicked", (coords) => {
        const pick = core.viewer.scene.pick({ canvasPos: coords, pickSurface: true });
        if (!pick?.entity) return;
        core.viewer.scene.setObjectsSelected(core.viewer.scene.selectedObjectIds, false);
        pick.entity.selected = true;
    });
    return core;
}