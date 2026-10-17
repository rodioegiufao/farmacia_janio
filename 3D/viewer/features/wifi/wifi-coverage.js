// Cobertura Wi-Fi: painel, leitura das paredes da arquitetura e mapa de calor no piso.
// Carregado sob demanda pelo viewer-authenticated.js (somente perfis com permissão).

import {
    Mesh,
    ReadableGeometry,
    PhongMaterial,
    Texture
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.107/dist/xeokit-sdk.min.es.js";
import { extractEntityGeometry } from "../clash/xkt-geometry.js";
import {
    AP_MODELS,
    TX_POWER_PRESETS,
    OBSTACLE_IFC_TYPES,
    FLOOR_IFC_TYPES,
    OBSTACLE_LOSS_DB,
    PROPAGATION,
    SIGNAL_LEVELS,
    NO_SIGNAL_COLOR,
    NO_SIGNAL_LABEL,
    getAccessPointModelId,
    classifyObstacle,
    getEirpDbm,
    sliceObstacles,
    segmentsBounds,
    computeSignalGrid,
    colorForSignal,
    summarizeSignalGrid,
    buildFloorMask
} from "./wifi-coverage-core.js";

const WALL_TYPES = new Set(["IfcWall", "IfcWallStandardCase", "IfcWallElementedCase"]);
const HEATMAP_MARGIN = 3;          // metros além das paredes
const HEATMAP_LIFT = 0.10;         // altura do mapa acima da base das paredes, quando não há laje (m)
const SLAB_LIFT = 0.02;            // altura do mapa acima da face superior da laje (m)
const MAX_GRID_CELLS = 250000;

const STYLE = `
#wifiCoveragePanel{position:fixed;top:80px;right:20px;width:360px;max-width:calc(100% - 40px);max-height:calc(100vh - 110px);overflow:auto;background:rgba(33,33,33,.92);color:#f7f7f7;padding:14px;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,.35);z-index:300001;font-family:Arial,sans-serif;font-size:13px;backdrop-filter:blur(6px)}
#wifiCoveragePanel[hidden]{display:none}
#wifiCoveragePanel .wifi-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
#wifiCoveragePanel .wifi-title{font-size:16px;font-weight:700}
#wifiCoveragePanel .wifi-subtitle{font-size:12px;opacity:.75}
#wifiCoveragePanel .wifi-close{background:none;border:0;color:#fff;font-size:18px;cursor:pointer}
#wifiCoveragePanel label{display:block;margin:8px 0 3px;font-size:12px;opacity:.85}
#wifiCoveragePanel .wifi-check{display:flex;align-items:center;gap:6px;margin-top:10px;opacity:1}
#wifiCoveragePanel select{width:100%;padding:7px;border-radius:6px;border:1px solid #444;background:#111;color:#fff}
#wifiCoveragePanel .wifi-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#wifiCoveragePanel .wifi-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:8px;margin-top:8px;font-size:12px;line-height:1.5}
#wifiCoveragePanel .wifi-actions{display:flex;gap:8px;margin-top:12px}
#wifiCoveragePanel .wifi-actions button{flex:1;padding:9px;border:0;border-radius:6px;font-weight:700;cursor:pointer}
#wifiCoveragePanel .wifi-run{background:#16a34a;color:#fff}
#wifiCoveragePanel .wifi-run:disabled{opacity:.5;cursor:wait}
#wifiCoveragePanel .wifi-off{background:#3f3f46;color:#fff}
#wifiCoveragePanel .wifi-status{margin-top:10px;font-size:12px;min-height:16px}
#wifiCoveragePanel progress{width:100%;margin-top:6px}
#wifiCoveragePanel .wifi-legend div{display:flex;align-items:center;gap:8px;margin:3px 0}
#wifiCoveragePanel .wifi-legend span{display:inline-block;width:14px;height:14px;border-radius:3px;flex:none}
#wifiCoveragePanel .wifi-ap-list{list-style:none;margin:4px 0 0;padding:0;max-height:120px;overflow:auto}
#wifiCoveragePanel .wifi-ap-list button{width:100%;text-align:left;background:none;border:0;color:#cfe;padding:3px 0;cursor:pointer;font-size:12px}
#wifiCoveragePanel .wifi-ap-list button:hover{text-decoration:underline}
`;

export function createWifiCoverageFeature({
    viewer,
    xktLoader,
    getModelIds,
    getModelSources,
    resolveSceneObjectId = () => null,
    requestRenderFrame = () => {},
    onVisibilityChange = () => {}
}) {
    const scene = viewer.scene;
    const metaObjects = () => viewer.metaScene?.metaObjects || {};
    const archGeometryCache = new Map(); // archModelId -> { obstacles: [...], slabs: [...] }

    let heatmap = null;                // { mesh, geometry, material, texture }
    let visibilitySnapshot = null;
    let running = false;
    let cancelRequested = false;
    let enabled = true;

    // -----------------------------------------------------------------------
    // UI
    // -----------------------------------------------------------------------
    if (!document.getElementById("wifiCoverageStyle")) {
        const style = document.createElement("style");
        style.id = "wifiCoverageStyle";
        style.textContent = STYLE;
        document.head.appendChild(style);
    }

    const toolbarButton = document.createElement("button");
    toolbarButton.id = "btnWifiCoverage";
    toolbarButton.type = "button";
    toolbarButton.className = "tool-button";
    toolbarButton.title = "Cobertura Wi-Fi";
    toolbarButton.innerHTML = `<span style="font-size: 1.2em;">📶</span>\n            Wi-Fi`;
    const helpButton = document.getElementById("btnHelp");
    const toolbar = helpButton?.parentElement || document.getElementById("btnMaterialsPanel")?.parentElement;
    if (helpButton) toolbar.insertBefore(toolbarButton, helpButton); else toolbar?.appendChild(toolbarButton);

    const panel = document.createElement("div");
    panel.id = "wifiCoveragePanel";
    panel.hidden = true;
    panel.innerHTML = `
        <div class="wifi-header">
            <div>
                <div class="wifi-title">Cobertura Wi-Fi</div>
                <div class="wifi-subtitle">Estimativa de sinal dos access points</div>
            </div>
            <button type="button" class="wifi-close" aria-label="Fechar painel">✕</button>
        </div>
        <label for="wifiArchModel">IFC da arquitetura (paredes)</label>
        <select id="wifiArchModel"></select>
        <label for="wifiStorey">Pavimento</label>
        <select id="wifiStorey"></select>
        <label for="wifiApModel">Modelo do access point</label>
        <select id="wifiApModel"></select>
        <div class="wifi-row">
            <div><label for="wifiBand">Banda</label><select id="wifiBand"></select></div>
            <div><label for="wifiPower">Potência</label><select id="wifiPower"></select></div>
        </div>
        <label for="wifiResolution">Resolução do mapa</label>
        <select id="wifiResolution">
            <option value="0.5">0,5 m (detalhado)</option>
            <option value="1">1 m (rápido)</option>
        </select>
        <label class="wifi-check"><input type="checkbox" id="wifiClipFloor" checked> Recortar o mapa no piso (IfcSlab)</label>
        <div class="wifi-card" id="wifiModelSpec"></div>
        <div class="wifi-card"><div id="wifiApSummary"></div><ul class="wifi-ap-list" id="wifiApList"></ul></div>
        <div class="wifi-actions">
            <button type="button" class="wifi-run" id="wifiRun">Rodar sinal</button>
            <button type="button" class="wifi-off" id="wifiOff">Desligar</button>
        </div>
        <div class="wifi-status" id="wifiStatus"></div>
        <progress id="wifiProgress" max="1" value="0" hidden></progress>
        <div class="wifi-card wifi-legend" id="wifiLegend"></div>
    `;
    document.body.appendChild(panel);

    const $ = (selector) => panel.querySelector(selector);
    const archSelect = $("#wifiArchModel");
    const storeySelect = $("#wifiStorey");
    const apModelSelect = $("#wifiApModel");
    const bandSelect = $("#wifiBand");
    const powerSelect = $("#wifiPower");
    const resolutionSelect = $("#wifiResolution");
    const clipFloorCheckbox = $("#wifiClipFloor");
    const statusElement = $("#wifiStatus");
    const progressElement = $("#wifiProgress");
    const runButton = $("#wifiRun");

    const addOption = (select, value, text) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    };

    Object.values(AP_MODELS).forEach((model) => addOption(apModelSelect, model.id, model.label));
    Object.entries(TX_POWER_PRESETS).forEach(([key, preset]) => addOption(powerSelect, key, preset.label));

    function refreshBandOptions() {
        const model = AP_MODELS[apModelSelect.value];
        const previous = bandSelect.value;
        bandSelect.innerHTML = "";
        Object.entries(model?.bands || {}).forEach(([key, band]) => addOption(bandSelect, key, band.label));
        if (previous && model?.bands?.[previous]) bandSelect.value = previous;
        renderModelSpec();
    }

    function renderModelSpec() {
        const model = AP_MODELS[apModelSelect.value];
        const band = model?.bands?.[bandSelect.value];
        if (!model || !band) { $("#wifiModelSpec").textContent = ""; return; }
        const eirp = getEirpDbm(model.id, bandSelect.value, powerSelect.value);
        $("#wifiModelSpec").innerHTML = `
            <b>${model.label}</b><br>
            Potência máx.: ${band.txPowerDbm} dBm • Ganho: ${String(band.antennaGainDbi).replace(".", ",")} dBi<br>
            EIRP usada: ${String(eirp).replace(".", ",")} dBm • Taxa: ${band.throughput}<br>
            MIMO: ${model.mimo} • Clientes: ${model.maxClients}`;
    }

    function renderLegend() {
        const swatch = (rgb) => `<span style="background:rgb(${rgb.join(",")})"></span>`;
        $("#wifiLegend").innerHTML =
            SIGNAL_LEVELS.map((level) => `<div>${swatch(level.color)}${level.label}</div>`).join("") +
            `<div>${swatch(NO_SIGNAL_COLOR)}${NO_SIGNAL_LABEL}</div>`;
    }

    function setStatus(text, progress = null) {
        statusElement.textContent = text;
        progressElement.hidden = progress === null;
        if (progress !== null) progressElement.value = progress;
    }

    // -----------------------------------------------------------------------
    // Leitura do modelo
    // -----------------------------------------------------------------------
    const modelIdOf = (objectId) => String(objectId).split("#")[0];

    function sceneEntityFor(metaObjectId) {
        return scene.objects[metaObjectId] || scene.objects[resolveSceneObjectId(metaObjectId)] || null;
    }

    function findAccessPoints() {
        const result = [];
        for (const metaObject of Object.values(metaObjects())) {
            const modelId = getAccessPointModelId(metaObject);
            if (!modelId) continue;
            const entity = sceneEntityFor(metaObject.id);
            if (!entity?.aabb) continue;
            const a = entity.aabb;
            result.push({
                id: metaObject.id,
                name: metaObject.name || metaObject.id,
                sourceModelId: entity.model?.id || modelIdOf(metaObject.id),
                apModelId: modelId,
                aabb: Array.from(a),
                x: (a[0] + a[3]) / 2,
                y: (a[1] + a[4]) / 2,
                z: (a[2] + a[5]) / 2
            });
        }
        return result;
    }

    function getArchStoreys(archModelId) {
        const storeys = [];
        for (const metaObject of Object.values(metaObjects())) {
            if (metaObject?.type !== "IfcBuildingStorey" || modelIdOf(metaObject.id) !== archModelId) continue;
            const subtree = typeof metaObject.getObjectIDsInSubtree === "function"
                ? metaObject.getObjectIDsInSubtree()
                : [metaObject.id];
            let floorY = Infinity, ceilingY = -Infinity, wallCount = 0;
            const sceneIds = [];
            for (const id of subtree) {
                const entity = sceneEntityFor(id);
                if (!entity) continue;
                sceneIds.push(entity.id);
                if (!WALL_TYPES.has(metaObjects()[id]?.type) || !entity.aabb) continue;
                wallCount++;
                floorY = Math.min(floorY, entity.aabb[1]);
                ceilingY = Math.max(ceilingY, entity.aabb[4]);
            }
            if (!wallCount) continue;
            storeys.push({ id: metaObject.id, name: metaObject.name || metaObject.id, floorY, ceilingY, sceneIds });
        }
        return storeys.sort((a, b) => a.floorY - b.floorY);
    }

    const GEOMETRY_TYPES = [...Object.keys(OBSTACLE_IFC_TYPES), ...FLOOR_IFC_TYPES];
    const FLOOR_TYPE_SET = new Set(FLOOR_IFC_TYPES);

    async function loadArchGeometry(archModelId) {
        if (archGeometryCache.has(archModelId)) return archGeometryCache.get(archModelId);

        const liveModel = scene.models[archModelId];
        const transform = {
            position: liveModel?.position ? Array.from(liveModel.position) : [0, 0, 0],
            rotation: liveModel?.rotation ? Array.from(liveModel.rotation) : [0, 0, 0]
        };
        const isWanted = (entity) => GEOMETRY_TYPES.includes(metaObjects()[entity.id]?.type);
        const extract = (entities) => entities
            .map((entity) => extractEntityGeometry(entity, { modelId: archModelId, transform, metaObjects: metaObjects() }))
            .filter(Boolean);

        // 1) tenta ler direto do modelo carregado (funciona se já houver geometria legível em cache)
        const liveEntities = Object.values(scene.objects).filter((entity) => entity.model?.id === archModelId && isWanted(entity));
        let geometries = extract(liveEntities);

        // 2) senão, abre uma cópia invisível só com paredes/portas/janelas/pilares, lê a geometria e descarta
        if (!geometries.length && liveEntities.length) {
            const src = getModelSources().find((model) => model.id === archModelId)?.src;
            if (!src) throw new Error(`Arquivo do modelo ${archModelId} não encontrado.`);
            setStatus("Lendo paredes e lajes da arquitetura…", 0);
            const tempId = `__wifi_${archModelId}_${Date.now()}`;
            const tempModel = xktLoader.load({
                id: tempId,
                src,
                globalizeObjectIds: true,
                readableGeometryEnabled: true,
                includeTypes: GEOMETRY_TYPES,
                visible: false,
                pickable: false,
                edges: false,
                saoEnabled: false,
                dtxEnabled: false
            });
            try {
                await new Promise((resolve, reject) => {
                    tempModel.on("loaded", resolve);
                    tempModel.on("error", reject);
                });
                if (liveModel?.position) tempModel.position = Array.from(liveModel.position);
                if (liveModel?.rotation) tempModel.rotation = Array.from(liveModel.rotation);
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                geometries = extract(Object.values(scene.objects).filter((entity) => entity.model?.id === tempId));
            } finally {
                tempModel.destroy();
            }
        }

        const obstacles = [];
        const slabs = [];
        for (const geometry of geometries) {
            const liveId = `${archModelId}#${geometry.objectId}`;
            const meta = metaObjects()[liveId] || { type: geometry.type, name: geometry.name };
            const item = { id: liveId, aabb: geometry.aabb, positions: geometry.positions, indices: geometry.indices };
            if (FLOOR_TYPE_SET.has(meta.type)) {
                slabs.push(item);
            } else {
                obstacles.push({ ...item, kind: classifyObstacle(meta) || "masonry" });
            }
        }
        const result = { obstacles, slabs };
        archGeometryCache.set(archModelId, result);
        return result;
    }

    // -----------------------------------------------------------------------
    // Visibilidade: só a arquitetura do pavimento + os APs desse pavimento
    // -----------------------------------------------------------------------
    function isolateForCoverage(storey, apModelIds, extraIds = []) {
        if (!visibilitySnapshot) visibilitySnapshot = scene.visibleObjectIds.slice();
        const minY = storey.floorY - 0.3;
        const maxY = storey.ceilingY + 0.8;
        const show = new Set(storey.sceneIds);
        extraIds.forEach((id) => { if (scene.objects[id]) show.add(id); });

        for (const entity of Object.values(scene.objects)) {
            if (!apModelIds.has(entity.model?.id) || !entity.aabb) continue;
            const centerY = (entity.aabb[1] + entity.aabb[4]) / 2;
            if (centerY >= minY && centerY <= maxY) show.add(entity.id);
        }

        scene.setObjectsVisible(scene.objectIds, false);
        scene.setObjectsXRayed(scene.objectIds, false);
        scene.setObjectsVisible(Array.from(show), true);
        onVisibilityChange();
    }

    function restoreVisibility() {
        if (!visibilitySnapshot) return;
        scene.setObjectsVisible(scene.objectIds, false);
        scene.setObjectsVisible(visibilitySnapshot.filter((id) => scene.objects[id]), true);
        visibilitySnapshot = null;
        onVisibilityChange();
    }

    // -----------------------------------------------------------------------
    // Mapa de calor
    // -----------------------------------------------------------------------
    function destroyHeatmap() {
        if (!heatmap) return;
        heatmap.mesh.destroy();
        heatmap.geometry.destroy();
        heatmap.material.destroy();
        heatmap.texture.destroy();
        heatmap = null;
        requestRenderFrame();
    }

    function drawHeatmap({ grid, cols, rows }, bounds, cellSize, y, mask = null) {
        destroyHeatmap();

        const canvas = document.createElement("canvas");
        canvas.width = cols;
        canvas.height = rows;
        const context = canvas.getContext("2d");
        const image = context.createImageData(cols, rows);
        for (let i = 0; i < grid.length; i++) {
            const [r, g, b] = colorForSignal(grid[i]);
            image.data[i * 4] = r;
            image.data[i * 4 + 1] = g;
            image.data[i * 4 + 2] = b;
            image.data[i * 4 + 3] = 255;
        }
        context.putImageData(image, 0, 0);

        // Linha 0 do canvas = minZ (v = 0); flipY desligado para manter essa correspondência.
        // A textura cobre exatamente cols × rows células, a partir de minX/minZ.
        const minX = bounds[0], minZ = bounds[1];
        const width = cols * cellSize, depth = rows * cellSize;
        const origin = [minX + width / 2, y, minZ + depth / 2];

        // Um retângulo por trecho contínuo de células (por linha). Sem máscara, um retângulo só.
        const positions = [], normals = [], uv = [], indices = [];
        const addQuad = (x0, z0, x1, z1) => {
            const base = positions.length / 3;
            for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
                positions.push(x - origin[0], 0, z - origin[2]);
                normals.push(0, 1, 0);
                uv.push((x - minX) / width, (z - minZ) / depth);
            }
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        };
        if (mask) {
            for (let row = 0; row < rows; row++) {
                let start = -1;
                for (let col = 0; col <= cols; col++) {
                    const inside = col < cols && mask[row * cols + col];
                    if (inside && start < 0) start = col;
                    if (!inside && start >= 0) {
                        addQuad(minX + start * cellSize, minZ + row * cellSize, minX + col * cellSize, minZ + (row + 1) * cellSize);
                        start = -1;
                    }
                }
            }
        } else {
            addQuad(minX, minZ, minX + width, minZ + depth);
        }

        const texture = new Texture(scene, { src: canvas.toDataURL("image/png"), flipY: false });
        const geometry = new ReadableGeometry(scene, { primitive: "triangles", positions, normals, uv, indices });
        const material = new PhongMaterial(scene, {
            diffuse: [0, 0, 0],
            ambient: [0, 0, 0],
            specular: [0, 0, 0],
            emissive: [1, 1, 1],
            emissiveMap: texture,
            alpha: 0.75,
            alphaMode: "blend",
            backfaces: true
        });
        const mesh = new Mesh(scene, {
            isObject: false,
            origin,
            geometry,
            material,
            pickable: false,
            collidable: false,
            clippable: true
        });
        heatmap = { mesh, geometry, material, texture };
        requestRenderFrame();
    }

    // -----------------------------------------------------------------------
    // Execução
    // -----------------------------------------------------------------------
    function refreshModelOptions() {
        const previous = archSelect.value;
        archSelect.innerHTML = "";
        const ids = getModelIds().filter((id) => !String(id).startsWith("__"));
        ids.forEach((id) => addOption(archSelect, id, id));
        archSelect.value = ids.includes(previous) ? previous : (ids.find((id) => /ARQ/i.test(id)) || ids[0] || "");
        refreshStoreyOptions();
    }

    let storeysCache = [];
    function refreshStoreyOptions() {
        const previous = storeySelect.value;
        storeySelect.innerHTML = "";
        storeysCache = archSelect.value ? getArchStoreys(archSelect.value) : [];
        storeysCache.forEach((storey) => addOption(storeySelect, storey.id, storey.name));
        if (storeysCache.some((storey) => storey.id === previous)) storeySelect.value = previous;
        if (!storeysCache.length) addOption(storeySelect, "", "Nenhum pavimento com paredes neste IFC");
        refreshAccessPointList();
    }

    function getAccessPointsForStorey(storey) {
        if (!storey) return [];
        const archModelId = archSelect.value;
        return findAccessPoints().filter((ap) =>
            ap.sourceModelId !== archModelId &&
            ap.y >= storey.floorY - 0.5 &&
            ap.y <= storey.ceilingY + 0.8
        );
    }

    function refreshAccessPointList() {
        const storey = storeysCache.find((item) => item.id === storeySelect.value);
        const aps = getAccessPointsForStorey(storey);
        const total = findAccessPoints().length;
        $("#wifiApSummary").innerHTML = `<b>${aps.length}</b> access point(s) neste pavimento • ${total} no projeto`;
        const list = $("#wifiApList");
        list.innerHTML = "";
        aps.forEach((ap, index) => {
            const item = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = `AP ${index + 1} • ${ap.sourceModelId} • ${ap.name}`;
            button.onclick = () => viewer.cameraFlight.flyTo({ aabb: ap.aabb, duration: 0.6 });
            item.appendChild(button);
            list.appendChild(item);
        });
    }

    async function run() {
        if (running || !enabled) return;
        const archModelId = archSelect.value;
        const storey = storeysCache.find((item) => item.id === storeySelect.value);
        const apModelId = apModelSelect.value;
        const band = bandSelect.value;
        const bandData = AP_MODELS[apModelId]?.bands?.[band];

        if (!archModelId || !storey) { setStatus("Selecione o IFC da arquitetura e o pavimento."); return; }
        const accessPoints = getAccessPointsForStorey(storey);
        if (!accessPoints.length) { setStatus("Nenhum access point encontrado neste pavimento."); return; }

        running = true;
        cancelRequested = false;
        runButton.disabled = true;
        try {
            const { obstacles, slabs } = await loadArchGeometry(archModelId);
            if (cancelRequested) return;
            if (!obstacles.length) { setStatus("Não foi possível ler as paredes deste IFC."); return; }

            const receiverY = storey.floorY + PROPAGATION.receiverHeight;
            const slice = sliceObstacles(obstacles, receiverY);
            if (!slice.owners.length) { setStatus("Nenhuma parede corta a altura de 1,2 m neste pavimento."); return; }

            const wallBounds = segmentsBounds(slice.coords);
            const bounds = [
                Math.min(wallBounds[0], ...accessPoints.map((ap) => ap.x)) - HEATMAP_MARGIN,
                Math.min(wallBounds[1], ...accessPoints.map((ap) => ap.z)) - HEATMAP_MARGIN,
                Math.max(wallBounds[2], ...accessPoints.map((ap) => ap.x)) + HEATMAP_MARGIN,
                Math.max(wallBounds[3], ...accessPoints.map((ap) => ap.z)) + HEATMAP_MARGIN
            ];
            let cellSize = Number(resolutionSelect.value) || 0.5;
            const area = (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]);
            if (area / (cellSize * cellSize) > MAX_GRID_CELLS) cellSize = Math.sqrt(area / MAX_GRID_CELLS);

            // Lajes do pavimento: ficam visíveis junto com as paredes
            const floorSlabs = slabs.filter((slab) => slab.aabb[4] >= storey.floorY - 0.5 && slab.aabb[1] <= storey.floorY + 0.6);
            isolateForCoverage(storey, new Set(accessPoints.map((ap) => ap.sourceModelId)), floorSlabs.map((slab) => slab.id));
            setStatus(`Calculando sinal de ${accessPoints.length} AP(s)…`, 0);

            const result = await computeSignalGrid({
                accessPoints,
                obstacleSlice: slice,
                obstacleKinds: obstacles.map((obstacle) => obstacle.kind),
                band,
                eirpDbm: getEirpDbm(apModelId, band, powerSelect.value),
                freqMHz: bandData.freqMHz,
                bounds,
                cellSize,
                receiverY,
                shouldCancel: () => cancelRequested,
                onProgress: (value) => setStatus(`Calculando sinal de ${accessPoints.length} AP(s)…`, value)
            });
            if (!result || cancelRequested) return;

            let mask = null;
            let heatmapY = storey.floorY + HEATMAP_LIFT;
            let floorNote = "";
            if (floorSlabs.length) {
                const floor = buildFloorMask(floorSlabs, { bounds, cellSize, cols: result.cols, rows: result.rows, floorY: storey.floorY });
                if (floor.topY !== null) heatmapY = floor.topY + SLAB_LIFT;
                if (clipFloorCheckbox.checked) {
                    if (floor.count) mask = floor.mask;
                    else floorNote = " • Lajes sem face horizontal no nível do piso; mapa sem recorte.";
                }
            } else if (clipFloorCheckbox.checked) {
                floorNote = " • Nenhuma IfcSlab encontrada neste pavimento; mapa sem recorte.";
            }

            drawHeatmap(result, bounds, cellSize, heatmapY, mask);
            viewer.cameraFlight.flyTo({
                aabb: [bounds[0], storey.floorY, bounds[1], bounds[2], storey.ceilingY, bounds[3]],
                duration: 0.8
            });

            const summary = summarizeSignalGrid(result.grid, mask);
            const fmt = (value) => value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
            const areaText = mask
                ? `${fmt(summary.goodPercent)}% do piso ≥ −67 dBm (${fmt(summary.cellCount * cellSize * cellSize)} m²)`
                : `${fmt(summary.goodPercent)}% da área ≥ −67 dBm (inclui a margem externa)`;
            setStatus(`${storey.name} • ${bandData.label} • ${accessPoints.length} AP(s) • ${areaText}${floorNote}`);
        } catch (error) {
            console.error("[wifi] Falha no cálculo de cobertura:", error);
            setStatus(`Erro: ${error.message || error}`);
        } finally {
            running = false;
            runButton.disabled = false;
        }
    }

    function turnOff() {
        cancelRequested = true;
        destroyHeatmap();
        restoreVisibility();
        setStatus("");
    }

    function openPanel() {
        refreshModelOptions();
        panel.hidden = false;
        toolbarButton.classList.add("active");
    }

    function closePanel() {
        panel.hidden = true;
        toolbarButton.classList.remove("active");
    }

    toolbarButton.addEventListener("click", () => {
        if (!enabled) return;
        if (panel.hidden) openPanel(); else closePanel();
    });
    $(".wifi-close").addEventListener("click", closePanel);
    archSelect.addEventListener("change", refreshStoreyOptions);
    storeySelect.addEventListener("change", refreshAccessPointList);
    apModelSelect.addEventListener("change", refreshBandOptions);
    bandSelect.addEventListener("change", renderModelSpec);
    powerSelect.addEventListener("change", renderModelSpec);
    runButton.addEventListener("click", run);
    $("#wifiOff").addEventListener("click", turnOff);

    refreshBandOptions();
    renderLegend();

    return {
        enable() {
            enabled = true;
            toolbarButton.hidden = false;
        },
        disable() {
            enabled = false;
            turnOff();
            closePanel();
            toolbarButton.hidden = true;
        },
        clearCache(modelId) {
            if (modelId) archGeometryCache.delete(modelId); else archGeometryCache.clear();
        }
    };
}
