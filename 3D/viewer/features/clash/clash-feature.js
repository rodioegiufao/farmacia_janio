import { adjacentClashIndex, filterClashResults, groupClashResults, resolveIfcGuidToSceneObjectId, serializeClashViewpoint, transformClashPointToViewerCoordinates } from "./clash-core.js";
import { runIfcClashAnalysis } from "./clash-api.js";

const STATUS_LABELS = { new: "Novo", reviewing: "Em análise", accepted: "Aceito", resolved: "Resolvido", ignored: "Ignorado" };
let sdkPromise;
const loadBCFSDK = () => sdkPromise ||= import("https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.107/dist/xeokit-sdk.min.es.js");

function download(name, content, type) {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([content], { type }));
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
}

export function createClashFeature({ viewer, panel, models, transforms, getAllObjectIds, requestRenderFrame, jsPDF }) {
    let results = [];
    let visibleResults = [];
    let activeIndex = -1;
    let marker = null;
    let bcfPlugin = null;
    let isolated = false;

    panel.innerHTML = `
      <div class="collision-panel-header"><div><div class="collision-panel-title">⚡ Compatibilização BIM</div><div class="collision-panel-subtitle">IfcOpenShell / IfcClash • XKT para visualização</div></div><button id="closeCollisionPanel" type="button" aria-label="Fechar painel">✕</button></div>
      <label class="collision-label">Preset<select id="clashPreset"><option value="">Seleção manual</option><option value="IFC_EST|IFC_HID">Estrutura × Hidráulica</option><option value="IFC_EST|IFC_ELE">Estrutura × Elétrica</option><option value="IFC_EST|IFC_CLI">Estrutura × Climatização</option><option value="IFC_ARQ|IFC_HID">Arquitetura × Instalações</option></select></label>
      <div class="clash-groups"><label class="collision-label">Grupo A<select id="collisionModelA"></select></label><span>×</span><label class="collision-label">Grupo B<select id="collisionModelB"></select></label></div>
      <label class="collision-label">Tipo<select id="clashMode"><option value="intersection">Interferência física</option><option value="clearance">Folga</option></select></label>
      <label class="collision-label">Tolerância (m)<input id="collisionRadius" type="number" min="0" max="10" step="0.001" value="0.010"></label>
      <button type="button" id="runCollisionCheck">Executar análise</button>
      <p id="collisionSummary" class="collision-summary" role="status">Selecione dois modelos com IFC original.</p>
      <div class="clash-filters"><input id="clashSearch" type="search" placeholder="Buscar nome, GUID, classe ou modelo"><select id="clashStatus"><option value="pending">Pendentes</option><option value="all">Todos os status</option><option value="resolved">Resolvidos</option></select></div>
      <div id="clashNavigation" class="clash-navigation" hidden><button data-nav="-1">←</button><strong id="clashCounter">0 / 0</strong><button data-nav="1">→</button></div>
      <div id="clashDetail"></div><div id="collisionResults" class="collision-results" aria-live="polite"></div>
      <div class="collision-actions"><button id="downloadCollisionPdf" disabled>Baixar PDF</button><button id="exportAllBcf" disabled>Exportar viewpoints</button></div>`;

    const $ = (selector) => panel.querySelector(selector);
    const setA = $("#collisionModelA"); const setB = $("#collisionModelB"); const summary = $("#collisionSummary");
    const optionModels = models().map((model) => ({ ...model, transform: transforms()[model.id] || model.transform || {} }));
    optionModels.forEach((model) => [setA, setB].forEach((select) => {
        const option = document.createElement("option"); option.value = model.id;
        option.textContent = `${model.label || model.id}${model.ifcSrc ? "" : " — sem IFC"}`; option.disabled = !model.ifcSrc; select.append(option);
    }));
    if (setB.options.length > 1) setB.selectedIndex = 1;

    const selectedModel = (select) => optionModels.find((model) => model.id === select.value);
    const sceneIds = (clash) => [resolveIfcGuidToSceneObjectId(clash.objectA.guid, clash.objectA.modelId, viewer.scene), resolveIfcGuidToSceneObjectId(clash.objectB.guid, clash.objectB.modelId, viewer.scene)];
    const restore = () => {
        const ids = getAllObjectIds();
        viewer.scene.setObjectsVisible(ids, true); viewer.scene.setObjectsXRayed(ids, false); viewer.scene.setObjectsHighlighted(ids, false); viewer.scene.setObjectsSelected(ids, false);
        isolated = false; marker?.destroy?.(); marker = null; requestRenderFrame();
    };
    const combinedAABB = (ids) => viewer.scene.getAABB(ids.filter(Boolean));

    async function showClash(index, mode = "focus") {
        if (!visibleResults.length) return;
        activeIndex = Math.max(0, Math.min(index, visibleResults.length - 1));
        const clash = visibleResults[activeIndex]; const ids = sceneIds(clash);
        restore();
        if (ids.some((id) => !id)) summary.textContent = "GUID não localizado no XKT. Verifique a preservação de GlobalId na conversão.";
        const valid = ids.filter(Boolean);
        viewer.scene.setObjectsVisible(valid, true); viewer.scene.setObjectsHighlighted(ids[0] ? [ids[0]] : [], true); viewer.scene.setObjectsSelected(ids[1] ? [ids[1]] : [], true);
        if (mode === "isolate") { viewer.scene.setObjectsVisible(getAllObjectIds(), false); viewer.scene.setObjectsVisible(valid, true); isolated = true; }
        if (mode === "context") { viewer.scene.setObjectsXRayed(getAllObjectIds(), true); viewer.scene.setObjectsXRayed(valid, false); }
        if (valid.length) viewer.cameraFlight.flyTo({ aabb: combinedAABB(valid), duration: 0.6 });
        const model = selectedModel(setA); const worldPos = transformClashPointToViewerCoordinates(clash.position, model?.transform);
        const { Marker } = await loadBCFSDK();
        marker = new Marker(viewer.scene, { worldPos, occludable: true });
        render(); requestRenderFrame();
    }

    async function exportViewpoint(clash) {
        const { BCFViewpointsPlugin } = await loadBCFSDK();
        bcfPlugin ||= new BCFViewpointsPlugin(viewer);
        const viewpoint = bcfPlugin.getViewpoint({ spacesVisible: false, openingsVisible: false });
        download(`${clash.id}.bcfv`, JSON.stringify(serializeClashViewpoint(clash, viewpoint), null, 2), "application/json");
    }

    function applyFilters() {
        const statusMode = $("#clashStatus").value;
        const statuses = statusMode === "all" ? Object.keys(STATUS_LABELS) : statusMode === "resolved" ? ["resolved"] : ["new", "reviewing", "accepted"];
        visibleResults = filterClashResults(results, { query: $("#clashSearch").value, statuses });
        activeIndex = visibleResults.length ? Math.min(Math.max(activeIndex, 0), visibleResults.length - 1) : -1; render();
    }

    function render() {
        const list = $("#collisionResults"); list.innerHTML = "";
        const groups = groupClashResults(visibleResults);
        groups.forEach((clashes, label) => {
            const group = document.createElement("details"); group.open = true;
            const heading = document.createElement("summary"); heading.textContent = `${label} — ${clashes.length}`; group.append(heading);
            clashes.forEach((clash) => { const button = document.createElement("button"); button.className = "collision-result-item"; button.textContent = `${clash.objectA.type} × ${clash.objectB.type} • ${STATUS_LABELS[clash.status]}`; button.onclick = () => showClash(visibleResults.indexOf(clash)); group.append(button); });
            list.append(group);
        });
        if (!visibleResults.length) list.textContent = results.length ? "Nenhum resultado corresponde aos filtros." : "✓ Nenhuma interferência encontrada";
        $("#clashNavigation").hidden = !visibleResults.length; $("#clashCounter").textContent = `${activeIndex + 1} / ${visibleResults.length}`;
        $("#downloadCollisionPdf").disabled = !results.length; $("#exportAllBcf").disabled = !results.length;
        const clash = visibleResults[activeIndex]; const detail = $("#clashDetail");
        detail.innerHTML = clash ? `<article class="clash-detail"><b>Interferência ${activeIndex + 1} de ${visibleResults.length}</b><p><strong>${clash.setA}</strong><br>${clash.objectA.name}<br><small>${clash.objectA.type} • ${clash.objectA.guid}</small></p><div>×</div><p><strong>${clash.setB}</strong><br>${clash.objectB.name}<br><small>${clash.objectB.type} • ${clash.objectB.guid}</small></p><p>Profundidade: ${clash.distance == null ? "não informada" : `${Math.round(clash.distance * 1000)} mm`}</p><div class="collision-actions"><button data-action="focus">Visualizar</button><button data-action="isolate">Isolar</button><button data-action="context">Contexto</button><button data-action="bcf">BCF Viewpoint</button></div><label>Status <select data-action="status">${Object.entries(STATUS_LABELS).map(([value,label]) => `<option value="${value}"${clash.status === value ? " selected" : ""}>${label}</option>`).join("")}</select></label></article>` : "";
        detail.querySelector('[data-action="focus"]')?.addEventListener("click", () => showClash(activeIndex));
        detail.querySelector('[data-action="isolate"]')?.addEventListener("click", () => showClash(activeIndex, "isolate"));
        detail.querySelector('[data-action="context"]')?.addEventListener("click", () => showClash(activeIndex, "context"));
        detail.querySelector('[data-action="bcf"]')?.addEventListener("click", () => exportViewpoint(clash));
        detail.querySelector('[data-action="status"]')?.addEventListener("change", (event) => { clash.status = event.target.value; applyFilters(); });
    }

    $("#runCollisionCheck").onclick = async () => {
        const a = selectedModel(setA); const b = selectedModel(setB);
        if (!a?.ifcSrc || !b?.ifcSrc) { summary.textContent = "IFC original não disponível para este modelo. Adicione ifcSrc ao project-config."; return; }
        summary.textContent = "Enviando referências IFCs… Preparando geometrias…"; $("#runCollisionCheck").disabled = true;
        try {
            summary.textContent = "Executando análise IfcClash…";
            results = await runIfcClashAnalysis({ setA: { modelId: a.id, label: a.label, ifcSrc: a.ifcSrc }, setB: { modelId: b.id, label: b.label, ifcSrc: b.ifcSrc }, tolerance: Number($("#collisionRadius").value), mode: $("#clashMode").value });
            activeIndex = results.length ? 0 : -1; applyFilters(); summary.textContent = results.length ? `Análise concluída. ${results.length} interferências encontradas.` : "✓ Nenhuma interferência encontrada";
        } catch (error) { console.error("[clash]", error); summary.textContent = "Não foi possível executar a compatibilização. Detalhes técnicos disponíveis no console."; }
        finally { $("#runCollisionCheck").disabled = false; }
    };
    $("#clashPreset").onchange = (event) => { const [a,b] = event.target.value.split("|"); if (a) setA.value = a; if (b) setB.value = b; };
    $("#clashSearch").oninput = applyFilters; $("#clashStatus").onchange = applyFilters;
    panel.querySelectorAll("[data-nav]").forEach((button) => button.onclick = () => showClash(adjacentClashIndex(activeIndex, visibleResults.length, Number(button.dataset.nav))));
    $("#downloadCollisionPdf").onclick = () => { const doc = new jsPDF(); doc.text("Relatório de Compatibilização BIM", 14, 16); results.forEach((c,i) => doc.text(`${i+1}. ${c.objectA.modelId}/${c.objectA.type}/${c.objectA.guid} x ${c.objectB.modelId}/${c.objectB.type}/${c.objectB.guid} - ${STATUS_LABELS[c.status]}`, 14, 28 + i * 7)); doc.save("compatibilizacao-bim.pdf"); };
    $("#exportAllBcf").onclick = async () => { for (const clash of results) await exportViewpoint(clash); };
    $("#closeCollisionPanel").onclick = () => { panel.hidden = true; restore(); };
    render();
    return { destroy: restore, getResults: () => results, isIsolated: () => isolated };
}