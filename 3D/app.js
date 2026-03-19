// app.js Rodrigo Damasceno - 2026

import {
    Viewer,
    LocaleService,
    XKTLoaderPlugin,
    WebIFCLoaderPlugin,
    IFCOpenShellLoaderPlugin,
    AngleMeasurementsPlugin,
    AngleMeasurementsMouseControl,
    DistanceMeasurementsPlugin,
    DistanceMeasurementsMouseControl,
    ContextMenu,
    PointerLens,
    NavCubePlugin,
    TreeViewPlugin,
    SectionPlanesPlugin,
    LineSet,
    buildGridGeometry
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.107/dist/xeokit-sdk.min.es.js";

import {
    downloadMaterialsAsExcel,
    loadAssociationDefinitionsFromExcel,
    loadAssociaUnitsFromExcel
} from "./excel-export.js";
//import { setupAnnotations } from "./annotations.js";

const { jsPDF } = window.jspdf;

let treeView;
let modelIsolateController;
let sectionPlanesPlugin;
let horizontalSectionPlane;
let sectionPlaneEnabled = false;
let horizontalPlaneControl;
let lastPickedEntity = null; // NOVO: Variável para rastrear a entidade selecionada
let lastSelectedEntity = null; // NOVO: Guarda a entidade selecionada pelo duplo clique
let lastCollisionResults = [];
let lastCollisionModelId = null;
const ACCESS_PASSWORD = "ribeiro2026";
const ACCESS_STORAGE_KEY = "farmacia_access_granted";
let explicitLinearMaterials = new Set();
let explicitLinearMaterialsLoadPromise = null
let activeProjectKey = null;

function detectViewerCompatibility() {
    const tempCanvas = document.createElement("canvas");
    const supportsWebGL2 = !!tempCanvas.getContext("webgl2");
    const supportsWebGL =
        supportsWebGL2 ||
        !!tempCanvas.getContext("webgl") ||
        !!tempCanvas.getContext("experimental-webgl");

    const isTouchDevice =
        window.matchMedia?.("(pointer: coarse)")?.matches ||
        /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || "");

    const lowMemoryDevice =
        typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
    const lowCpuDevice =
        typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;

    const useCompatibilityMode =
        !supportsWebGL2 ||
        lowMemoryDevice ||
        lowCpuDevice;

    const reasons = [];

    if (!supportsWebGL) {
        reasons.push("WebGL indisponível");
    } else if (!supportsWebGL2) {
        reasons.push("WebGL2 indisponível");
    }

    if (isTouchDevice) {
        reasons.push("dispositivo touch");
    }

    if (lowMemoryDevice) {
        reasons.push("memória reduzida");
    }

    if (lowCpuDevice) {
        reasons.push("CPU reduzida");
    }
    
    const enableDataTextures = supportsWebGL2 && !useCompatibilityMode;
    const enableNavCube = supportsWebGL2 && !isTouchDevice;

    return {
        supportsWebGL,
        supportsWebGL2,
        isTouchDevice,
        useCompatibilityMode,
        disableSAO: useCompatibilityMode,
        disableEdges: useCompatibilityMode,
        enableDataTextures,
        enableNavCube,
        reasons
    };
}

const viewerCompatibility = detectViewerCompatibility();

// -----------------------------------------------------------------------------
// 1. Configuração do Viewer e Redimensionamento (100% da tela)
// -----------------------------------------------------------------------------

const viewer = new Viewer({

    canvasId: "meuCanvas",
    transparent: false,
    saoEnabled: !viewerCompatibility.disableSAO,
    edgesEnabled: !viewerCompatibility.disableEdges,
    pbrEnabled: false,
    dtxEnabled: viewerCompatibility.enableDataTextures,
    backgroundColor: [0.72, 0.77, 0.82],
    
    // CONFIGURAÇÃO DE LOCALIZAÇÃO (NavCube em Português)
    localeService: new LocaleService({
        messages: {
            "pt": { // Português
                "NavCube": {
                    "front": "Frente",
                    "back": "Trás",
                    "top": "Topo",
                    "bottom": "Baixo",
                    "left": "Esquerda",
                    "right": "Direita"
                }
            }
        },
        locale: "pt" // Define o idioma padrão como Português
     })
});

if (!viewerCompatibility.supportsWebGL) {
    console.error("Este dispositivo não oferece suporte a WebGL, necessário para abrir os modelos 3D.");
} else if (viewerCompatibility.useCompatibilityMode) {
    console.warn(
        `Modo de compatibilidade 3D ativado (${viewerCompatibility.reasons.join(", ")}). ` +
        "SAO, realce de arestas e shaders mais pesados foram reduzidos para evitar falhas em celulares/tablets."
    );
}

// Ajusta a cor do destaque (highlight) para azul
const { highlightMaterial } = viewer.scene;
highlightMaterial.color = [0, 0, 0];
highlightMaterial.edgeColor = [0, 0, 0];

function createGroundGrid() {
    const gridGeometry = buildGridGeometry({
        size: 100,
        divisions: 100
    });

    new LineSet(viewer.scene, {
        id: "groundGrid",
        positions: gridGeometry.positions,
        indices: gridGeometry.indices,
        color: [0.6, 0.6, 0.6],
        opacity: 0.35,
        clippable: false,
        collidable: false
    });
}

createGroundGrid();
loadExplicitLinearMaterialsFromExcel();

// -----------------------------------------------------------------------------
// 1.1 Anotações fixas
// -----------------------------------------------------------------------------

//setupAnnotations(viewer, { requestRenderFrame, focusObjectById });

/**
 * Configura o painel de ajuda e atalhos de teclado.
 */
function setupHelpPanel() {
    if (!helpPanel || !helpPanelToggleButton || !closeHelpPanelButton) {
        return;
    }

    const togglePanel = (forceState) => {
        const shouldOpen = typeof forceState === "boolean" ? forceState : helpPanel.hidden;
        helpPanel.hidden = !shouldOpen;
        helpPanelToggleButton.classList.toggle("active", shouldOpen);
        helpPanelToggleButton.setAttribute("aria-pressed", shouldOpen ? "true" : "false");
    };

    helpPanelToggleButton.addEventListener("click", () => togglePanel());
    closeHelpPanelButton.addEventListener("click", () => togglePanel(false));
}
function setupAccessGate() {
    if (!accessGate || !accessForm || !accessInput) {
        return;
    }

    const modelSelectionOverlay = document.getElementById("modelSelection");
    const accessToggleButton = document.getElementById("accessGateToggle");

    if (sessionStorage.getItem(ACCESS_STORAGE_KEY) === "true") {
        accessGate.hidden = true;
        if (modelSelectionOverlay) {
            modelSelectionOverlay.hidden = false;
        }
        return;
    }

    accessGate.hidden = false;
    if (modelSelectionOverlay) {
        modelSelectionOverlay.hidden = true;
    }
    accessInput.focus();

    accessInput.addEventListener("input", () => {
        setAccessMessage("");
    });

    if (accessToggleButton) {
        accessToggleButton.addEventListener("click", () => {
            const isVisible = accessInput.type === "text";
            accessInput.type = isVisible ? "password" : "text";
            accessToggleButton.classList.toggle("is-visible", !isVisible);
            accessToggleButton.setAttribute("aria-pressed", (!isVisible).toString());
            accessToggleButton.setAttribute("aria-label", !isVisible ? "Ocultar senha" : "Mostrar senha");
            accessInput.focus();
        });
    }

    accessForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const password = accessInput.value.trim();

        if (password === ACCESS_PASSWORD) {
            sessionStorage.setItem(ACCESS_STORAGE_KEY, "true");
            accessGate.hidden = true;
            accessInput.value = "";
            setAccessMessage("");
            if (modelSelectionOverlay) {
                modelSelectionOverlay.hidden = false;
            }
            return;
        }

        setAccessMessage("Senha incorreta. Tente novamente.", true);
        accessInput.focus();
        accessInput.select();
    });
}

function setAccessMessage(message, isError = false) {
    if (!accessMessage) {
        return;
    }

    accessMessage.textContent = message;
    accessMessage.style.color = isError ? "#ff9b9b" : "#b4f5c2";
}
function setupTransformPanelControls() {
    if (!transformPanel || !transformPanelToggleButton || !closeTransformPanelButton) {
        return;
    }

    const togglePanel = (forceState) => {
        const shouldOpen = typeof forceState === "boolean" ? forceState : transformPanel.hidden;
        transformPanel.hidden = !shouldOpen;
        transformPanelToggleButton.classList.toggle("active", shouldOpen);
        transformPanelToggleButton.setAttribute("aria-pressed", shouldOpen ? "true" : "false");

        if (shouldOpen && transformModelSelect) {
            const currentModelId = transformModelSelect.value || transformModelSelect.options[0]?.value;
            if (currentModelId) {
                syncTransformInputs(currentModelId);
            }
        }
    };

    transformPanelToggleButton.addEventListener("click", () => togglePanel());
    closeTransformPanelButton.addEventListener("click", () => togglePanel(false));

    togglePanel(false);
}


function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize();

// -----------------------------------------------------------------------------
// 2. Carregamento dos Modelos e Ajuste da Câmera
// -----------------------------------------------------------------------------

const xktDataSource = {
    getXKT(src, ok, error) {
        const resolvedSrc = normalizeBlobUrl(src);

        fetch(resolvedSrc)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Falha HTTP ${response.status} ao baixar XKT.`);
                }
                return response.arrayBuffer();
            })
            .then((arrayBuffer) => ok(arrayBuffer))
            .catch((fetchError) => {
                if (typeof error === "function") {
                    error(fetchError?.message || fetchError);
                }
            });
    }
};

const xktLoader = new XKTLoaderPlugin(viewer, {
    dataSource: xktDataSource
});
let ifcLoader = null;
let ifcOpenShellLoader = null;
let pyodideSetupPromise = null;

const IFC_OPEN_SHELL_WHEEL_URL = "https://ifcopenshell.github.io/wasm-wheels/ifcopenshell-0.8.3+34a1bc6-cp313-cp313-emscripten_4_0_9_wasm32.whl";

function normalizeBlobUrl(src) {
    if (typeof src !== "string") {
        return src;
    }

    return src.startsWith("blob:") ? src.split("?")[0] : src;
}

const ifcUploadDataSource = {
    getIFC(src, ok, error) {
        const resolvedSrc = normalizeBlobUrl(src);

        fetch(resolvedSrc)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Falha HTTP ${response.status} ao baixar IFC.`);
                }
                return response.arrayBuffer();
            })
            .then((arrayBuffer) => ok(arrayBuffer))
            .catch((fetchError) => {
                if (typeof error === "function") {
                    error(fetchError?.message || fetchError);
                }
            });
    }
};

function resolveIfcLoadMethod(loaderInstance) {
    if (!loaderInstance) {
        return null;
    }

    const supportedMethods = [
        "load",
        "loadModel",
        "loadIfc",
        "loadIFC",
        "loadModelFromFile",
        "loadModelFromIfc"
    ];

    const firstSupportedMethod = supportedMethods.find((methodName) => typeof loaderInstance[methodName] === "function");
    if (firstSupportedMethod) {
        return firstSupportedMethod;
    }

    let currentPrototype = loaderInstance;
    while (currentPrototype) {
        const dynamicMethod = Object.getOwnPropertyNames(currentPrototype).find((methodName) => {
            if (methodName === "constructor") {
                return false;
            }

            if (!/load|ifc/i.test(methodName)) {
                return false;
            }

            return typeof loaderInstance[methodName] === "function";
        });

        if (dynamicMethod) {
            return dynamicMethod;
        }

        currentPrototype = Object.getPrototypeOf(currentPrototype);
    }

    return null;
}

async function setupIfcOpenShellRuntime() {
    if (pyodideSetupPromise) {
        return pyodideSetupPromise;
    }

    pyodideSetupPromise = (async () => {
        if (typeof window.loadPyodide !== "function") {
            throw new Error("Pyodide não está disponível na página.");
        }

        viewer.scene.canvas.spinner.processes++;

        try {
            const pyodide = await window.loadPyodide({});

            await pyodide.loadPackage("micropip");
            await pyodide.loadPackage("numpy");
            await pyodide.loadPackage("shapely");

            const micropip = pyodide.pyimport("micropip");

            await micropip.install("typing-extensions");
            await micropip.install(IFC_OPEN_SHELL_WHEEL_URL);

            const ifcopenshell = pyodide.pyimport("ifcopenshell");
            const ifcopenshellGeom = pyodide.pyimport("ifcopenshell.geom");
            const settings = ifcopenshellGeom.settings();

            settings.set(settings.WELD_VERTICES, false);

            return {
                pyodide,
                ifcopenshell,
                ifcopenshellGeom,
                settings
            };
        } finally {
            viewer.scene.canvas.spinner.processes = Math.max(0, viewer.scene.canvas.spinner.processes - 1);
        }
    })().catch((error) => {
        pyodideSetupPromise = null;
        throw error;
    });

    return pyodideSetupPromise;
}

async function getIfcOpenShellLoader() {
    if (ifcOpenShellLoader) {
        return ifcOpenShellLoader;
    }

    const { ifcopenshell, ifcopenshellGeom } = await setupIfcOpenShellRuntime();

    ifcOpenShellLoader = new IFCOpenShellLoaderPlugin(viewer, {
        ifcopenshell,
        ifcopenshell_geom: ifcopenshellGeom
    });

    return ifcOpenShellLoader;
}

async function createIfcLoaderWithFallbacks() {
    const wasmPaths = [
        "https://cdn.jsdelivr.net/npm/web-ifc@0.0.57/",
        "https://cdn.jsdelivr.net/npm/web-ifc@0.0.44/"
    ];

    const configureWasmPath = (loader, wasmPath) => {
        const configCandidates = [
            () => loader?.setWasmPath?.(wasmPath),
            () => loader?.setWasmDir?.(wasmPath),
            () => loader?.setWebIFCPath?.(wasmPath),
            () => loader?.ifcManager?.setWasmPath?.(wasmPath),
            () => loader?.ifcManager?.setWasmPath?.(wasmPath, true),
            () => loader?.ifcManager?.setWasmPath?.(wasmPath, false)
        ];

        for (const tryConfigure of configCandidates) {
            try {
                tryConfigure();
                return true;
            } catch (error) {
                // Continua tentando outras assinaturas entre versões do xeokit/web-ifc.
            }
        }

        return false;
    };

    let lastError = null;

    for (const wasmPath of wasmPaths) {
        try {
            const loader = new WebIFCLoaderPlugin(viewer, {
                dataSource: ifcUploadDataSource,
                wasmPath,
                wasmDir: wasmPath,
                webIfc: { wasmPath },
                WebIFC: { wasmPath },
                webIFC: { wasmPath }
            });

            configureWasmPath(loader, wasmPath);

            return loader;
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`Não foi possível inicializar o WebIFCLoaderPlugin. ${lastError?.message || ""}`.trim());
}

async function getIfcLoader() {
    if (ifcLoader) {
        return ifcLoader;
    }

    if (typeof WebIFCLoaderPlugin !== "function") {
        return null;
    }

    try {
        ifcLoader = await createIfcLoaderWithFallbacks();
    } catch (error) {
        console.error("Falha ao inicializar carregador IFC:", error);
        ifcLoader = null;
    }

    return ifcLoader;
}
let modelsLoadedCount = 0;
let expectedModels = 0;
let defaultModelChecksDone = 0;
let currentModels = [];
let lastMaterialsResults = [];
let materialsAllResults = [];
let materialsSearchQuery = "";
let activeMaterialFilter = null;
let webBudgetPanel = null;
let webBudgetRowsContainer = null;
let webBudgetSummary = null;
let webBudgetSourceCacheRef = null;
let webBudgetAssociationsPromise = null;
let activeWebBudgetSelection = null;
let activeCollisionSelection = null;
const rotationShortcutKey = "j";
const rotatedEntityAliases = new Map();
const hiddenOriginalEntityIds = new Set();
const loadedModels = new Map();
const originalTransforms = new Map();
let currentModelTransforms = {};

const accessGate = document.getElementById("accessGate");
const accessForm = document.getElementById("accessGateForm");
const accessInput = document.getElementById("accessGatePassword");
const accessMessage = document.getElementById("accessGateMessage");
const helpPanel = document.getElementById("helpPanel");
const helpPanelToggleButton = document.getElementById("btnHelp");
const closeHelpPanelButton = document.getElementById("closeHelpPanel");
const treeViewContainer = document.getElementById("treeViewContainer");
const treeViewContent = document.getElementById("treeViewContent");
const closeTreeViewButton = document.getElementById("closeTreeView");
const toggleTreeViewSelectionButton = document.getElementById("toggleTreeViewSelection");
const toggleTreeViewButton = document.getElementById("btnToggleTree");
const transformPanel = document.getElementById("transformPanel");
const transformPanelToggleButton = document.getElementById("btnTransformPanel");
const closeTransformPanelButton = document.getElementById("closeTransformPanel");
const transformModelSelect = document.getElementById("transformModelSelect");
const offsetXInput = document.getElementById("offsetX");
const offsetYInput = document.getElementById("offsetY");
const offsetZInput = document.getElementById("offsetZ");
const rotationYInput = document.getElementById("rotationY");
const applyTransformButton = document.getElementById("applyTransformButton");
const resetTransformButton = document.getElementById("resetTransformButton");
const collisionPanel = document.getElementById("collisionPanel");
const collisionPanelToggleButton = document.getElementById("btnCollisionPanel");
const closeCollisionPanelButton = document.getElementById("closeCollisionPanel");
const collisionModelASelect = document.getElementById("collisionModelA");
const collisionRadiusInput = document.getElementById("collisionRadius");
const runCollisionCheckButton = document.getElementById("runCollisionCheck");
const downloadCollisionPdfButton = document.getElementById("downloadCollisionPdf");
const collisionSummary = document.getElementById("collisionSummary");
const collisionResultsList = document.getElementById("collisionResults");
const materialsPanel = document.getElementById("materialsPanel");
const materialsPanelToggleButton = document.getElementById("btnMaterialsPanel");
const closeMaterialsPanelButton = document.getElementById("closeMaterialsPanel");
const generateMaterialsButton = document.getElementById("generateMaterialsList");
const downloadMaterialsExcelButton = document.getElementById("downloadMaterialsExcel");
const materialsSummary = document.getElementById("materialsSummary");
const materialsResultsList = document.getElementById("materialsResults");
const materialsSearchInput = document.getElementById("materialsSearchInput");
const materialsSearchButton = document.getElementById("materialsSearchButton");
const materialsIdsPanel = document.getElementById("materialsIdsPanel");
const materialsIdsSummary = document.getElementById("materialsIdsSummary");
const materialsIdsList = document.getElementById("materialsIdsList");
const searchBar = document.getElementById("searchBar");
const searchInput = document.getElementById("searchIdInput");
const searchButton = document.getElementById("btnSearchId");
const closeSearchBarButton = document.getElementById("closeSearchBar");
const searchToggleButton = document.getElementById("btnSearchToggle");
const searchFeedback = document.getElementById("searchFeedback");
let searchResultsList = document.getElementById("searchResultsList");
const budgetPanel = document.getElementById("budgetPanel");
const budgetPanelToggleButton = document.getElementById("btnBudget");
const closeBudgetPanelButton = document.getElementById("closeBudgetPanel");
const budgetStatus = document.getElementById("budgetStatus");
const budgetTable = document.getElementById("budgetTable");
const budgetTableBody = document.getElementById("budgetTableBody");
const budgetTableLoadedProjects = new Set();

setupAccessGate();
setupHelpPanel();
setupTransformPanelControls();
setupCollisionPanelControls();
setupMaterialsPanelControls();
setupSearchControls();
setupDraggablePanels();
/**
 * Reseta a visibilidade de todos os objetos e remove qualquer destaque ou raio-x.
 */
function resetModelVisibility() {
    if (modelIsolateController) {
        // Volta a exibir todos os objetos
        modelIsolateController.setObjectsVisible(getAllObjectIds(), true);
        // Remove X-ray
        modelIsolateController.setObjectsXRayed(getAllObjectIds(), false);
        // Remove destaque
        modelIsolateController.setObjectsHighlighted(getAllObjectIds(), false);
        // Centraliza a câmera no modelo inteiro
        viewer.cameraFlight.jumpTo(viewer.scene);
    }
    lastPickedEntity = null; // Garante que a referência de seleção também seja limpa.
    clearSelection(false); // Limpa o estado visual do botão "Limpar Seleção"
}

function requestRenderFrame() {
    if (viewer.scene.requestRender) {
        viewer.scene.requestRender();
    } else if (viewer.scene.setDirty) {
        viewer.scene.setDirty();
    }
}

function parseNumber(value, fallback = 0) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getCollisionRadiusMeters() {
    const radiusMm = parseNumber(collisionRadiusInput?.value, 0);
    return Math.max(0, radiusMm) / 1000;
}

function normalizeCollisionRadiusInput() {
    if (!collisionRadiusInput) {
        return 0;
    }

    const radiusMm = Math.max(0, parseNumber(collisionRadiusInput.value, 0));
    collisionRadiusInput.value = `${radiusMm}`;
    return radiusMm;
}

function buildCollisionSummary(collisionsCount, overlapTolerance) {
    const toleranceMm = Math.round(Math.max(0, overlapTolerance) * 1000);

    if (toleranceMm > 0) {
        return `${collisionsCount} objeto(s) com colisão (raio mínimo ${toleranceMm} mm).`;
    }

    return `${collisionsCount} objeto(s) com colisão.`;
}

function getAllObjectIds() {
    if (!modelIsolateController) {
        return [];
    }

    const ids = [];

    if (Array.isArray(modelIsolateController?.objectIds)) {
        ids.push(...modelIsolateController.objectIds);
    }

    if (!ids.length && modelIsolateController?.objects && typeof modelIsolateController.objects === "object") {
        ids.push(...Object.keys(modelIsolateController.objects));
    }

    if (!ids.length && typeof modelIsolateController?.getObjectsIds === "function") {
        ids.push(...(modelIsolateController.getObjectsIds() || []));
    }

    if (!ids.length && typeof modelIsolateController?.getObjectIds === "function") {
        ids.push(...(modelIsolateController.getObjectIds() || []));
    }

    const unique = new Set(ids.filter((id) => !hiddenOriginalEntityIds.has(id)));
    for (const aliasId of rotatedEntityAliases.keys()) {
        unique.add(aliasId);
    }

    return Array.from(unique);
}

function resolveEntityById(id) {
    if (!id) {
        return null;
    }

    const aliasEntry = rotatedEntityAliases.get(id);
    if (aliasEntry?.entity) {
        return aliasEntry.entity;
    }

    return viewer.scene.objects?.[id] || null;
}

function findSourceIdByEntity(entity) {
    if (!entity?.id) {
        return null;
    }

    for (const [aliasId, aliasEntry] of rotatedEntityAliases.entries()) {
        if (aliasEntry.entity === entity) {
            return aliasEntry.sourceId || aliasId;
        }
    }

    return entity.id;
}

function getNextCloneId(sourceId) {
    let index = 1;
    let cloneId = `${sourceId}-${index}`;

    while (rotatedEntityAliases.has(cloneId) || viewer.scene.objects?.[cloneId]) {
        index += 1;
        cloneId = `${sourceId}-${index}`;
    }

    return cloneId;
}

function rotateEntityWithCloneAlias(sourceId) {
    const requestedId = String(sourceId || "").trim();
    const baseAliasEntry = rotatedEntityAliases.get(requestedId);
    const normalizedSourceId = baseAliasEntry?.sourceId || requestedId;
    const entity = resolveEntityById(requestedId);

    if (!entity?.isObject) {
        setSearchStatus(`Não foi possível rotacionar: peça ${normalizedSourceId} não encontrada.`, true);
        return null;
    }

    const cloneId = getNextCloneId(normalizedSourceId);
    const entityRotation = Array.isArray(entity.rotation)
        ? [...entity.rotation]
        : (ArrayBuffer.isView(entity.rotation) ? Array.from(entity.rotation) : [0, 0, 0]);
    const currentRotation = [
        entityRotation[0] ?? 0,
        entityRotation[1] ?? 0,
        entityRotation[2] ?? 0
    ];

    // Aplicação da transformação linear de rotação em 90º no eixo Y.
    currentRotation[1] = ((currentRotation[1] + 90) % 360 + 360) % 360;

    entity.rotation = currentRotation;
    entity.visible = true;

    rotatedEntityAliases.set(cloneId, {
        entity,
        sourceId: normalizedSourceId,
        copiedProperties: {
            visible: entity.visible,
            colorize: Array.isArray(entity.colorize) ? [...entity.colorize] : entity.colorize,
            opacity: entity.opacity,
            rotation: currentRotation
        }
    });

    hiddenOriginalEntityIds.add(normalizedSourceId);
    lastSelectedEntity = entity;
    requestRenderFrame();

    setSearchStatus(`Rotação aplicada: ${normalizedSourceId} ocultado e alias ${cloneId} criado.`);
    return cloneId;
}

function resolveRotationTargetId() {
    const selectedSourceId = findSourceIdByEntity(lastSelectedEntity);
    if (selectedSourceId) {
        return selectedSourceId;
    }

    if (lastEntity?.isObject) {
        const hoveredSourceId = findSourceIdByEntity(lastEntity);
        if (hoveredSourceId) {
            return hoveredSourceId;
        }
    }

    const typedId = searchInput?.value?.trim();
    if (typedId && resolveEntityById(typedId)?.isObject) {
        return typedId;
    }

    return null;
}

function ensureModelOption(modelId) {
    if (!transformModelSelect) {
        return;
    }

    const alreadyExists = Array.from(transformModelSelect.options).some((option) => option.value === modelId);
    if (!alreadyExists) {
        const option = document.createElement("option");
        option.value = modelId;
        option.textContent = modelId;
        transformModelSelect.appendChild(option);
    }
}

function syncTransformInputs(modelId) {
    if (!transformModelSelect) {
        return;
    }

    const model = loadedModels.get(modelId);
    if (!model) {
        return;
    }

    const position = model.position || [0, 0, 0];
    const rotation = model.rotation || [0, 0, 0];

    if (offsetXInput) offsetXInput.value = position[0];
    if (offsetYInput) offsetYInput.value = position[1];
    if (offsetZInput) offsetZInput.value = position[2];
    if (rotationYInput) rotationYInput.value = rotation[1];
}

function registerModelTransform(model) {
    loadedModels.set(model.id, model);

    if (!originalTransforms.has(model.id)) {
        originalTransforms.set(model.id, {
            position: model.position ? [...model.position] : [0, 0, 0],
            rotation: model.rotation ? [...model.rotation] : [0, 0, 0]
        });
    }

    ensureModelOption(model.id);
    ensureCollisionOptions(model.id);

    if (transformModelSelect && !transformModelSelect.value) {
        transformModelSelect.value = model.id;
    }

    setDefaultCollisionSelection();

    if (transformModelSelect) {
        syncTransformInputs(transformModelSelect.value);
    }
}
function applyTransformFromUI() {
    if (!transformModelSelect) {
        return;
    }

    const modelId = transformModelSelect.value;
    const model = loadedModels.get(modelId);

    if (!model) {
        alert("Nenhum modelo carregado para ajustar.");
        return;
    }

    const newPosition = [
        parseNumber(offsetXInput?.value),
        parseNumber(offsetYInput?.value),
        parseNumber(offsetZInput?.value)
    ];

    const newRotation = model.rotation ? [...model.rotation] : [0, 0, 0];
    newRotation[1] = parseNumber(rotationYInput?.value);

    model.position = newPosition;
    model.rotation = newRotation;

    requestRenderFrame();
}

function resetTransformFromUI() {
    if (!transformModelSelect) {
        return;
    }

    const modelId = transformModelSelect.value;
    const model = loadedModels.get(modelId);
    const original = originalTransforms.get(modelId);

    if (!model || !original) {
        return;
    }

    model.position = [...original.position];
    model.rotation = [...original.rotation];

    syncTransformInputs(modelId);
    requestRenderFrame();
}

function ensureCollisionOptions(modelId) {
    if (!collisionModelASelect) {
        return;
    }

    const exists = Array.from(collisionModelASelect.options).some((option) => option.value === modelId);
    if (!exists) {
        const option = document.createElement("option");
        option.value = modelId;
        option.textContent = modelId;
        collisionModelASelect.appendChild(option);
    }
}

function setDefaultCollisionSelection() {
    if (!collisionModelASelect) {
        return;
    }

    if (!collisionModelASelect.value && collisionModelASelect.options.length > 0) {
        collisionModelASelect.value = collisionModelASelect.options[0].value;
    }
}

function setupCollisionPanelControls() {
    if (!collisionPanel || !collisionSummary || !collisionResultsList) {
        return;
    }

    const togglePanel = (forceState) => {
        const shouldOpen = typeof forceState === "boolean" ? forceState : collisionPanel.hidden;
        collisionPanel.hidden = !shouldOpen;
        collisionPanelToggleButton?.classList.toggle("active", shouldOpen);
    };

    collisionPanelToggleButton?.addEventListener("click", () => togglePanel());
    closeCollisionPanelButton?.addEventListener("click", () => togglePanel(false));

    runCollisionCheckButton?.addEventListener("click", () => {
        const modelId = collisionModelASelect?.value;
        findAndRenderCollisions(modelId);
    });

    collisionRadiusInput?.addEventListener("input", () => {
        normalizeCollisionRadiusInput();
    });

    downloadCollisionPdfButton?.addEventListener("click", async () => {
        const originalLabel = downloadCollisionPdfButton.textContent;
        downloadCollisionPdfButton.disabled = true;
        downloadCollisionPdfButton.textContent = "Gerando relatório...";

        try {
            await downloadCollisionsAsPdf();
        } finally {
            downloadCollisionPdfButton.textContent = originalLabel;
            updateCollisionDownloadButton();
        }
    });

    updateCollisionDownloadButton();
}

function setupMaterialsPanelControls() {
    if (!materialsPanel || !materialsSummary || !materialsResultsList) {
        return;
    }

    const togglePanel = (forceState) => {
        const shouldOpen = typeof forceState === "boolean" ? forceState : materialsPanel.hidden;
        materialsPanel.hidden = !shouldOpen;
        materialsPanelToggleButton?.classList.toggle("active", shouldOpen);
        if (!shouldOpen) {
            resetMaterialsIdsPanel();
        }
    };

    materialsPanelToggleButton?.addEventListener("click", () => togglePanel());
    closeMaterialsPanelButton?.addEventListener("click", () => togglePanel(false));

    generateMaterialsButton?.addEventListener("click", () => {
        generateAndRenderMaterialsList();
        resetMaterialsIdsPanel();
    });
    materialsSearchButton?.addEventListener("click", () => {
        applyMaterialsSearch();
    });
    materialsSearchInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyMaterialsSearch();
        }
    });
    downloadMaterialsExcelButton?.addEventListener("click", () => {
        downloadMaterialsAsExcel(lastMaterialsResults, normalizeSearchText);
    });

    updateMaterialsDownloadButton();
}

function updateMaterialsDownloadButton() {
    if (!downloadMaterialsExcelButton) {
        return;
    }

    downloadMaterialsExcelButton.disabled = !lastMaterialsResults.length;
}

function resetMaterialsIdsPanel() {
    if (!materialsIdsPanel || !materialsIdsSummary || !materialsIdsList) {
        return;
    }

    materialsIdsPanel.hidden = true;
    materialsIdsSummary.textContent = "";
    materialsIdsList.innerHTML = "";
}

function renderMaterialsIdsList(materialName) {
    if (!materialsIdsPanel || !materialsIdsSummary || !materialsIdsList) {
        return;
    }

    materialsIdsPanel.hidden = false;
    materialsIdsList.innerHTML = "";

    if (!materialName) {
        materialsIdsSummary.textContent = "Selecione um material na lista para visualizar os IDs associados.";
        return;
    }

    const ids = findMaterialObjectIds(materialName);
    if (!ids.length) {
        materialsIdsSummary.textContent = `Nenhum ID encontrado para "${materialName}".`;
        return;
    }

    materialsIdsSummary.textContent = `${ids.length} ID(s) encontrados para "${materialName}". Clique em um ID para focar no modelo.`;

    ids.forEach((id) => {
        const li = document.createElement("li");
        li.className = "materials-id-item";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "materials-id-button";
        button.textContent = id;
        button.addEventListener("click", () => {
            focusObjectById(id);
        });
        li.appendChild(button);
        materialsIdsList.appendChild(li);
    });
}

function hidePanelElement(panelElement, toggleButton) {
    if (!panelElement) {
        return;
    }

    if (typeof panelElement.hidden === "boolean") {
        panelElement.hidden = true;
    }

    toggleButton?.classList.remove("active");
    toggleButton?.setAttribute("aria-pressed", "false");
}

function hideHelpPanel() {
    hidePanelElement(helpPanel, helpPanelToggleButton);
}

function hideTransformPanel() {
    hidePanelElement(transformPanel, transformPanelToggleButton);
}

function hideCollisionPanel() {
    hidePanelElement(collisionPanel, collisionPanelToggleButton);
    clearCollisionSelection();
}

function hideMaterialsPanel() {
    hidePanelElement(materialsPanel, materialsPanelToggleButton);
    resetMaterialsIdsPanel();
}

function hideWebBudgetPanel() {
    if (!webBudgetPanel) {
        return;
    }

    webBudgetPanel.hidden = true;
}

function getWebBudgetMinimizedStorageKey() {
    return `webBudgetPanelMinimized:${window.location.pathname}`;
}

function setWebBudgetMinimizedState(minimized) {
    if (!webBudgetPanel) {
        return;
    }

    webBudgetPanel.classList.toggle("is-minimized", minimized);
    const minimizeButton = webBudgetPanel.querySelector("#toggleWebBudgetPanelMinimize");
    minimizeButton?.setAttribute("aria-expanded", minimized ? "false" : "true");
    minimizeButton?.setAttribute("aria-label", minimized ? "Expandir orçamento web" : "Minimizar orçamento web");
    if (minimizeButton) {
        minimizeButton.textContent = minimized ? "▢" : "—";
    }
    window.localStorage?.setItem(getWebBudgetMinimizedStorageKey(), minimized ? "1" : "0");
}

async function ensureWebBudgetAssociationsLoaded() {
    if (!webBudgetAssociationsPromise) {
        webBudgetAssociationsPromise = loadAssociationDefinitionsFromExcel({ excelPath: "./base_de_dados.xlsx" })
            .catch((error) => {
                webBudgetAssociationsPromise = null;
                throw error;
            });
    }

    return webBudgetAssociationsPromise;
}
function hideBudgetPanel() {
    hidePanelElement(budgetPanel, budgetPanelToggleButton);
}

function hideTreeViewPanel() {
    if (!treeViewContainer || treeViewContainer.style.display === "none") {
        return;
    }

    treeViewContainer.style.display = "none";
}

function closePanelsOnEscape() {
    hideHelpPanel();
    hideTransformPanel();
    hideCollisionPanel();
    hideMaterialsPanel();
    hideWebBudgetPanel();
    hideBudgetPanel();
    hideTreeViewPanel();
    closeSearchBar();
}

function ensureWebBudgetPanel() {
    if (webBudgetPanel) {
        return webBudgetPanel;
    }

    const panel = document.createElement("div");
    panel.id = "webBudgetPanel";
    panel.hidden = true;
    panel.innerHTML = `
        <div class="web-budget-header">
            <div>
                <div class="web-budget-title">Orçamento web (Z)</div>
                <div class="web-budget-subtitle">Visualização em tabela da lista total de materiais</div>
            </div>
            <div class="web-budget-actions">
                <button id="toggleWebBudgetPanelMinimize" type="button" aria-label="Minimizar orçamento web" aria-expanded="true">—</button>
                <button id="closeWebBudgetPanel" type="button" aria-label="Fechar orçamento web">✕</button>
            </div>
        </div>
        <div class="web-budget-content">
            <p id="webBudgetSummary" class="web-budget-summary"></p>
            <div class="web-budget-table-wrapper" aria-label="Tabela de orçamento web">
                <table class="web-budget-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Base</th>
                            <th>Descrição</th>
                            <th>Unidade</th>
                            <th>Quantidade</th>
                        </tr>
                    </thead>
                    <tbody id="webBudgetRows"></tbody>
                </table>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    webBudgetPanel = panel;
    webBudgetRowsContainer = panel.querySelector("#webBudgetRows");
    webBudgetSummary = panel.querySelector("#webBudgetSummary");

    panel.querySelector("#closeWebBudgetPanel")?.addEventListener("click", () => {
        hideWebBudgetPanel();
    });
    panel.querySelector("#toggleWebBudgetPanelMinimize")?.addEventListener("click", () => {
        const shouldMinimize = !panel.classList.contains("is-minimized");
        setWebBudgetMinimizedState(shouldMinimize);
    });

    const shouldStartMinimized = window.localStorage?.getItem(getWebBudgetMinimizedStorageKey()) === "1";
    setWebBudgetMinimizedState(shouldStartMinimized);

    setupDraggablePanel({
        panel,
        storageKey: `webBudgetPanelPosition:${window.location.pathname}`,
        handleSelector: ".web-budget-header",
        ignoreSelectors: "input, button, textarea, select, a, .web-budget-table-wrapper, .web-budget-table-wrapper *"
    });
    return panel;
}

function renderWebBudgetRows(materials) {
    if (!webBudgetRowsContainer || !webBudgetSummary) {
        return;
    }

    webBudgetRowsContainer.innerHTML = "";

    if (!materials.length) {
        webBudgetSummary.textContent = "Nenhum item para exibir.";
        return;
    }

    webBudgetSummary.textContent = `${materials.length} associação(ões) da planilha web. Itens separados por modelo XKT.`;

    const fragment = document.createDocumentFragment();
    let currentGroupModel = null;
    materials.forEach((item) => {
        if (item.modelId !== currentGroupModel) {
            currentGroupModel = item.modelId;
            const groupRow = document.createElement("tr");
            groupRow.className = "web-budget-group-row";
            const groupCell = document.createElement("td");
            groupCell.colSpan = 5;
            groupCell.textContent = `${formatModelLabel(item.modelId)}:`;
            groupRow.appendChild(groupCell);
            fragment.appendChild(groupRow);
        }
        const sourceMaterialNames = Array.isArray(item.sourceMaterialNames) && item.sourceMaterialNames.length
            ? item.sourceMaterialNames
            : [item.name];
        const ids = Array.from(new Set(
            sourceMaterialNames
                .flatMap((materialName) => findMaterialObjectIds(materialName, { activeOnly: false }))
                .filter((id) => getObjectMetaModelId(id) === item.modelId)
        ));
        const tr = document.createElement("tr");
        tr.setAttribute("role", "button");
        tr.setAttribute("tabindex", "0");
        tr.title = `Localizar ${item.descricao} no modelo`;
        tr.innerHTML = `
            <td>${item.codigo || "-"}</td>
            <td>${item.base || "-"}</td>
            <td>${item.descricao}</td>
            <td>${item.unidade || "-"}</td>
            <td class="numeric">${formatMaterialQuantity(item.quantidade)}</td>
        `;

        const handleRowSelection = () => {
            activeMaterialFilter = sourceMaterialNames.length === 1 ? sourceMaterialNames[0] : item.descricao;
            activeWebBudgetSelection = {
                modelId: item.modelId,
                materialNames: sourceMaterialNames,
                descricao: item.descricao
            };
            isolateMaterialsByNames(sourceMaterialNames, { modelId: item.modelId });
            updateMaterialsActiveItem();
            if (sourceMaterialNames.length === 1) {
                renderMaterialsIdsList(sourceMaterialNames[0]);
            } else {
                resetMaterialsIdsPanel();
                if (materialsIdsSummary) {
                    materialsIdsSummary.textContent = `${item.descricao} (${formatModelLabel(item.modelId)}): ${ids.length} ID(s) vinculados em ${sourceMaterialNames.length} item(ns) associado(s).`;
                }
            }
            webBudgetSummary.textContent = `${formatModelLabel(item.modelId)} · ${item.descricao}: ${formatMaterialQuantity(item.quantidade)} ${item.unidade || "unid."}. Itens localizados no modelo.`;
        };

        tr.addEventListener("click", handleRowSelection);
        tr.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleRowSelection();
            }
        });

        fragment.appendChild(tr);
    });

    webBudgetRowsContainer.appendChild(fragment);
}

function formatModelLabel(modelId) {
    if (!modelId) {
        return "Modelo não identificado";
    }

    const normalizedModelId = String(modelId).replace(/_/g, "-");

    const modelBudgetLabels = {
        "IFC-ALI": "CIRCUITO ALIMENTADOR",
        "IFC-ELE": "INSTALAÇÕES ELÉTRICAS DE BAIXA TENSÃO",
        "IFC-ILUX": "ILUMINAÇÃO EXTERNA",
        "IFC-LOG": "CABEAMENTO ESTRUTURADO E CFTV",
        "IFC-LOG-TEF": "CABEAMENTO ESTRUTURADO, CFTV E TELEFONIA",
        "IFC-TEF": "TELEFONIA",
        "IFC-SPDA": "SISTEMA DE PROTEÇÃO CONTRA DESCARGAS ATMOSFÉRICAS - SPDA",
        "IFC-SDAI": "SISTEMA DE DETECÇÃO E ALARME DE INCÊNDIO",
        "IFC-SUB": "SUBESTAÇÃO AÉREA",
        "IFC-FOT": "SISTEMA FOTOVOLTAICO",
        "IFC-HID": "INSTALAÇÕES HIDRÁULICAS"
    };

    return modelBudgetLabels[normalizedModelId] || normalizedModelId;
}

function buildWebBudgetMaterials(materials, associationDefinitions) {
    if (!Array.isArray(materials) || !materials.length || !Array.isArray(associationDefinitions) || !associationDefinitions.length) {
        return [];
    }

    const itemsByDescription = materials.reduce((acc, item) => {
        const normalizedName = normalizeSearchText(item.name || "").replace(/\s+/g, " ");
        if (!normalizedName) {
            return acc;
        }

        const current = acc.get(normalizedName) || {
            quantity: 0,
            unitLabel: "",
            sourceMaterialNames: [],
            quantityByModel: new Map()
        };

        if (!(current.quantityByModel instanceof Map)) {
            current.quantityByModel = new Map(Object.entries(current.quantityByModel || {}));
        }

        current.quantity += Number(item.quantity) || 0;
        if (!current.unitLabel && item.unitLabel) {
            current.unitLabel = item.unitLabel;
        }
        if (item.name && !current.sourceMaterialNames.includes(item.name)) {
            current.sourceMaterialNames.push(item.name);
        }

        const itemModelEntries = item.quantityByModel instanceof Map
            ? item.quantityByModel.entries()
            : Object.entries(item.quantityByModel || {});
        for (const [modelId, modelQuantityRaw] of itemModelEntries) {
            const modelQuantity = Number(modelQuantityRaw) || 0;
            if (!modelId || modelQuantity <= 0) {
                continue;
            }

            const previous = current.quantityByModel.get(modelId) || 0;
            current.quantityByModel.set(modelId, previous + modelQuantity);
        }

        acc.set(normalizedName, current);
        return acc;
    }, new Map());

    const aggregated = new Map();

    associationDefinitions.forEach((association) => {
        const normalizedDescription = normalizeSearchText(association?.itemDescricao || "").replace(/\s+/g, " ");
        if (!normalizedDescription) {
            return;
        }

        const matchData = itemsByDescription.get(normalizedDescription);
        const quantity = matchData?.quantity || 0;
        if (quantity <= 0) {
            return;
        }

        const modelEntries = matchData?.quantityByModel?.entries?.() || [];
        for (const [modelId, modelQuantityRaw] of modelEntries) {
            const modelQuantity = Number(modelQuantityRaw) || 0;
            if (!modelId || modelQuantity <= 0) {
                continue;
            }
            const baseKey = association?.codigo
                ? `codigo:${association.codigo}`
                : `descricao:${association?.descricao || ""}|${association?.base || ""}|${association?.unidade || ""}`;
            const key = `${modelId}|${baseKey}`;

            const current = aggregated.get(key) || {
                modelId,
                codigo: association?.codigo || "",
                base: association?.base || "",
                descricao: association?.descricao || association?.itemDescricao || "",
                unidade: association?.unidade || matchData?.unitLabel || "",
                quantidade: 0,
                sourceMaterialNames: []
            };

            current.quantidade += modelQuantity;
            matchData?.sourceMaterialNames?.forEach((materialName) => {
                if (!current.sourceMaterialNames.includes(materialName)) {
                    current.sourceMaterialNames.push(materialName);
                }
            });

            aggregated.set(key, current);
        }
    });

    return Array.from(aggregated.values()).sort(
        (a, b) => a.modelId.localeCompare(b.modelId, "pt-BR")
            || b.quantidade - a.quantidade
            || a.descricao.localeCompare(b.descricao, "pt-BR")
    );
}
async function openWebBudgetPanel() {
    ensureWebBudgetPanel();

    if (!materialsAllResults.length) {
        materialsSummary.textContent = 'Para abrir o orçamento web com Z, clique em "Gerar lista" primeiro.';
        return false;
    }

    if (webBudgetSourceCacheRef !== materialsAllResults) {
        let webBudgetMaterials = [];

        try {
            const associations = await ensureWebBudgetAssociationsLoaded();
            webBudgetMaterials = buildWebBudgetMaterials(materialsAllResults, associations);
        } catch (error) {
            console.warn("Não foi possível carregar as associações para montar o orçamento web.", error);
        }

        renderWebBudgetRows(webBudgetMaterials);
        webBudgetSourceCacheRef = materialsAllResults;
    }

    webBudgetPanel.hidden = false;
    return true;
}

function setSearchStatus(message, isError = false) {
    if (!searchFeedback) {
        return;
    }

    searchFeedback.textContent = message;
    searchFeedback.dataset.state = isError ? "error" : "success";
}

function clearSearchResults() {
    if (!searchResultsList) {
        return;
    }

    searchResultsList.innerHTML = "";
    searchResultsList.hidden = true;
}

function ensureSearchResultsList() {
    if (!searchBar || searchResultsList) {
        return;
    }

    searchResultsList = document.createElement("ul");
    searchResultsList.id = "searchResultsList";
    searchResultsList.className = "search-results-list";
    searchResultsList.hidden = true;
    searchBar.appendChild(searchResultsList);
}

function findObjectsByName(query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
        return [];
    }

    const activeObjectIds = new Set(getAllObjectIds());
    const metaObjects = viewer.metaScene?.metaObjects || {};
    const matches = [];

    for (const objectId of activeObjectIds) {
        const aliasEntry = rotatedEntityAliases.get(objectId);
        const metaObject = aliasEntry ? metaObjects[aliasEntry.sourceId] : metaObjects[objectId];
        if (!metaObject) {
            continue;
        }

        const normalizedName = normalizeSearchText(metaObject.name || "");
        if (!normalizedName.includes(normalizedQuery)) {
            continue;
        }

        matches.push({
            id: objectId,
            name: metaObject.name || "Sem nome",
            ifcModelId: metaObject?.metaModel?.id || "IFC não identificado"
        });
    }

    return matches.sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id, "pt-BR"));
}

function renderSearchResults(matches) {
    ensureSearchResultsList();

    if (!searchResultsList) {
        return;
    }

    searchResultsList.innerHTML = "";
    searchResultsList.hidden = !matches.length;

    matches.forEach((match) => {
        const listItem = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-result-item";
        button.innerHTML = `
            <span class="search-result-id">${match.id}</span>
            <span class="search-result-name">${match.name}</span>
            <span class="search-result-ifc">${match.ifcModelId}</span>
        `;

        button.addEventListener("click", () => {
            const found = focusObjectById(match.id);
            if (found) {
                setSearchStatus(`Peça ${match.id} (${match.ifcModelId}) isolada com destaque.`);
            }
        });

        listItem.appendChild(button);
        searchResultsList.appendChild(listItem);
    });
}

function openSearchBar() {
    if (!searchBar) {
        return;
    }

    searchBar.hidden = false;

    if (searchToggleButton) {
        searchToggleButton.classList.add("active");
        searchToggleButton.setAttribute("aria-pressed", "true");
    }

    if (searchInput) {
        searchInput.focus();
        searchInput.select?.();
    }
}

function closeSearchBar() {
    if (!searchBar) {
        return;
    }

    searchBar.hidden = true;

    if (searchToggleButton) {
        searchToggleButton.classList.remove("active");
        searchToggleButton.setAttribute("aria-pressed", "false");
    }
}

function toggleSearchBar(forceOpen) {
    if (!searchBar) {
        return;
    }

    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : searchBar.hidden;

    if (shouldOpen) {
        openSearchBar();
        return;
    }

    closeSearchBar();
}

function focusObjectById(objectId, { animate = true, xrayOthers = true } = {}) {
    if (!modelIsolateController || !objectId) {
        return false;
    }

    const targetId = String(objectId).trim();
    const allIds = getAllObjectIds();

    if (!allIds.includes(targetId)) {
        return false;
    }

    const aliasEntry = rotatedEntityAliases.get(targetId);
    const sceneTargetId = aliasEntry?.sourceId || targetId;

    modelIsolateController.setObjectsVisible(allIds, true);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    if (xrayOthers && allIds.length) {
        modelIsolateController.setObjectsXRayed(allIds, true);
    } else {
        modelIsolateController.setObjectsXRayed(allIds, false);
    }

    modelIsolateController.setObjectsXRayed([sceneTargetId], false);
    modelIsolateController.setObjectsHighlighted([sceneTargetId], true);

    const entity = resolveEntityById(targetId);
    if (entity) {
        lastSelectedEntity = entity;
    }

    const aabb = viewer.scene.getAABB(sceneTargetId);
    if (aabb) {
        if (animate) {
            viewer.cameraFlight.flyTo({ aabb, duration: 0.6 });
        } else {
            viewer.cameraFlight.jumpTo({ aabb });
        }
    }

    requestRenderFrame();

    if (entity && document.getElementById("propertyPanel")) {
        showMaterialProperties(entity);
    }

    return true;
}

function setupSearchControls() {
    if (!searchInput || !searchButton) {
        return;
    }

    if (searchToggleButton && searchBar) {
        searchToggleButton.addEventListener("click", () => toggleSearchBar());
    }

    closeSearchBarButton?.addEventListener("click", () => toggleSearchBar(false));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && searchBar && !searchBar.hidden) {
            toggleSearchBar(false);
        }
    });

    const runSearch = () => {
        const rawId = searchInput.value.trim();

        if (!rawId) {
            clearSearchResults();
            setSearchStatus("Digite o ID ou o nome da peça para buscar.", true);
            return;
        }

        if (!modelIsolateController || !getAllObjectIds().length) {
            clearSearchResults();
            setSearchStatus("Carregue um modelo antes de buscar uma peça.", true);
            return;
        }

        const found = focusObjectById(rawId);

        if (found) {
            clearSearchResults();
            setSearchStatus(`Peça ${rawId} isolada com destaque.`);
        } else {
            const matchesByName = findObjectsByName(rawId);

            if (!matchesByName.length) {
                clearSearchResults();
                setSearchStatus(`Nenhuma peça com ID ou nome "${rawId}" foi encontrada nos modelos carregados.`, true);
                return;
            }

            if (matchesByName.length === 1) {
                const [singleMatch] = matchesByName;
                focusObjectById(singleMatch.id);
                clearSearchResults();
                setSearchStatus(`1 peça encontrada por nome: ${singleMatch.id} (${singleMatch.ifcModelId}).`);
                return;
            }

            const ifcModels = [...new Set(matchesByName.map((item) => item.ifcModelId))];
            renderSearchResults(matchesByName);
            setSearchStatus(
                `${matchesByName.length} peças encontradas por nome em ${ifcModels.length} IFC(s): ${ifcModels.join(", ")}. Selecione uma peça na lista abaixo.`
            );
        }
    };

    searchButton.addEventListener("click", runSearch);
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            runSearch();
        }
    });
}

function setupDraggablePanel({
    panel,
    storageKey,
    ignoreSelectors = "",
    handleSelector = ""
}) {
    if (!panel) {
        return;
    }

    panel.classList.add("draggable-panel");

    const storedPosition = window.localStorage?.getItem(storageKey);
    if (storedPosition) {
        try {
            const { left, top } = JSON.parse(storedPosition);
            if (Number.isFinite(left) && Number.isFinite(top)) {
                panel.style.left = `${left}px`;
                panel.style.top = `${top}px`;
                panel.style.right = "auto";
                panel.style.bottom = "auto";
            }
        } catch (error) {
            console.warn(`Não foi possível restaurar a posição de ${panel.id}.`, error);
        }
    }

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let dragging = false;

    const handlePointerMove = (event) => {
        if (!dragging) {
            return;
        }

        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;
        const rect = panel.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width - 8;
        const maxTop = window.innerHeight - rect.height - 8;

        const nextLeft = clamp(startLeft + deltaX, 8, Math.max(8, maxLeft));
        const nextTop = clamp(startTop + deltaY, 8, Math.max(8, maxTop));

        panel.style.left = `${nextLeft}px`;
        panel.style.top = `${nextTop}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
    };

    const stopDrag = () => {
        if (!dragging) {
            return;
        }

        dragging = false;
        panel.classList.remove("is-dragging");
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopDrag);
        window.removeEventListener("pointercancel", stopDrag);

        const rect = panel.getBoundingClientRect();
        window.localStorage?.setItem(
            storageKey,
            JSON.stringify({ left: rect.left, top: rect.top })
        );
    };

    panel.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
            return;
        }

        if (handleSelector && !event.target.closest(handleSelector)) {
            return;
        }

        if (ignoreSelectors && event.target.closest(ignoreSelectors)) {
            return;
        }

        event.preventDefault();
        const rect = panel.getBoundingClientRect();
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        panel.classList.add("is-dragging");
        panel.setPointerCapture?.(event.pointerId);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", stopDrag);
        window.addEventListener("pointercancel", stopDrag);
    });
}

function setupDraggablePanels() {
    const pathname = window.location.pathname;

    setupDraggablePanel({
        panel: searchBar,
        storageKey: `searchBarPosition:${pathname}`,
        ignoreSelectors: "input, button, textarea, select"
    });

    setupDraggablePanel({
        panel: treeViewContainer,
        storageKey: `treeViewPosition:${pathname}`,
        ignoreSelectors: "input, button, textarea, select, a, .xeokit-tree-view-item, .xeokit-tree-view-item-toggle, .xeokit-tree-view-item-title"
    });

    setupDraggablePanel({
        panel: helpPanel,
        storageKey: `helpPanelPosition:${pathname}`,
        ignoreSelectors: "input, button, textarea, select, a"
    });

    setupDraggablePanel({
        panel: transformPanel,
        storageKey: `transformPanelPosition:${pathname}`,
        ignoreSelectors: "input, button, textarea, select, a"
    });

    setupDraggablePanel({
        panel: collisionPanel,
        storageKey: `collisionPanelPosition:${pathname}`,
        ignoreSelectors: "input, button, textarea, select, a"
    });

    setupDraggablePanel({
        panel: materialsPanel,
        storageKey: `materialsPanelPosition:${pathname}`,
        ignoreSelectors: "input, button, textarea, select, a, .materials-results, .materials-results *, .materials-ids-panel, .materials-ids-panel *"
    });
    setupDraggablePanel({
        panel: budgetPanel,
        storageKey: `budgetPanelPosition:${pathname}`,
        ignoreSelectors: "input, button, textarea, select, a, iframe"
    });
}

function finalizeInitialSetup() {
    setTimeout(() => {
        viewer.cameraFlight.jumpTo(viewer.scene);
        console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
        setMeasurementMode('none');
        setupModelIsolateController();
    }, 300);
}

function maybeFinalizeInitialization() {
    if (defaultModelChecksDone === currentModels.length && modelsLoadedCount >= expectedModels) {
        finalizeInitialSetup();
    }
}

function adjustCameraOnLoad() {
    modelsLoadedCount++;
    maybeFinalizeInitialization();
}

async function loadDefaultModel({ id, src }) {
    try {
        const response = await fetch(src, { method: "HEAD" });
        defaultModelChecksDone++;

        if (!response.ok) {
            console.warn(`⚠️ Modelo padrão ignorado: ${src} não está disponível (status ${response.status}).`);
            maybeFinalizeInitialization();
            return;
        }

        expectedModels++;

        const model = xktLoader.load({
            id,
            src,
            edges: !viewerCompatibility.disableEdges,
            dtxEnabled: viewerCompatibility.enableDataTextures
        });

        model.on("loaded", () => {
            const transform = currentModelTransforms[id];

            if (transform?.position) {
                model.position = [...transform.position];
            }

            if (transform?.rotation) {
                model.rotation = [...transform.rotation];
            }

            //if (id === "IFC_ARQ") {
                //model.xrayed = true;
            //}

            adjustCameraOnLoad();
            registerModelTransform(model);
        });
        model.on("error", (err) => {
            console.error(`Erro ao carregar ${src}:`, err);
            adjustCameraOnLoad();
        });
    } catch (error) {
        defaultModelChecksDone++;
        console.warn(`⚠️ Não foi possível verificar o modelo ${src}:`, error);
        maybeFinalizeInitialization();
    }
}

const IPER_MODELS = [
    { id: "IFC_ELE", src: "/3D/iper/modelo-01.xkt" },
    { id: "IFC_LOG", src: "/3D/iper/modelo-02.xkt" },
    { id: "IFC_HID", src: "/3D/iper/modelo-03.xkt" },
    { id: "IFC_ALI", src: "/3D/iper/modelo-04.xkt" },
    { id: "IFC_EST", src: "/3D/iper/modelo-05.xkt" },
    { id: "IFC_ARQ", src: "/3D/iper/modelo-06.xkt" },
    { id: "IFC_PLU", src: "/3D/iper/modelo-07.xkt" },
    { id: "IFC_SAN", src: "/3D/iper/modelo-08.xkt" },
    { id: "IFC_INC", src: "/3D/iper/modelo-09.xkt" },
    { id: "IFC_EST_SQD", src: "/3D/iper/modelo-10.xkt" },
    { id: "IFC_EST_SUB", src: "/3D/iper/modelo-11.xkt" },
    { id: "IFC_EST_CT", src: "/3D/iper/modelo-12.xkt" },
    { id: "IFC_EST_MR", src: "/3D/iper/modelo-13.xkt" },
    { id: "IFC_EST_MRC", src: "/3D/iper/modelo-14.xkt" },
    { id: "IFC_FOT", src: "/3D/iper/modelo-15.xkt" },
    { id: "IFC_EMT_ESC", src: "/3D/iper/modelo-16.xkt" },
    { id: "IFC_EMT_COB", src: "/3D/iper/modelo-17.xkt" },
    { id: "IFC_CLI", src: "/3D/iper/modelo-18.xkt" },
    { id: "IFC_SPDA", src: "/3D/iper/modelo-19.xkt" },
    { id: "IFC_SUB", src: "/3D/iper/modelo-20.xkt" },
    { id: "IFC_ILUX", src: "/3D/iper/modelo-21.xkt" },
    { id: "IFC_TEF", src: "/3D/iper/modelo-22.xkt" },
    { id: "IFC_SDAI", src: "/3D/iper/modelo-23.xkt" },
];

const FARMACIA_MODELS = [
    { id: "IFC_LOG_TEF", src: "/3D/drogaria/modelo-05.xkt" },
    { id: "IFC_ELE", src: "/3D/drogaria/modelo-04.xkt" },
    //{ id: "IFC_ILUX", src: "/3D/drogaria/modelo-02.xkt" },
    { id: "IFC_EST", src: "/3D/drogaria/modelo-06.xkt" },
    { id: "IFC_SAN", src: "/3D/drogaria/modelo-08.xkt" },
    { id: "IFC_PLU", src: "/3D/drogaria/modelo-07.xkt" },
    { id: "IFC_ARQ", src: "/3D/drogaria/modelo-09.xkt" },
    { id: "IFC_FOT", src: "/3D/drogaria/modelo-03.xkt" },
    { id: "IFC_ALI", src: "/3D/drogaria/modelo-01.xkt" },
    { id: "IFC_CLI", src: "/3D/drogaria/modelo-10.xkt" },
    { id: "IFC_HID", src: "/3D/drogaria/modelo-11.xkt" },
    { id: "IFC_INC", src: "/3D/drogaria/modelo-12.xkt" },
    { id: "IFC_EXA", src: "/3D/drogaria/modelo-13.xkt" },
];

const POLICLINICA_MODELS = [
    { id: "IFC_EST_PP", src: "/3D/policlinica/modelo-01.xkt" },
    { id: "IFC_ELE_T_220", src: "/3D/policlinica/modelo-02.xkt" },
    { id: "IFC_PLU", src: "/3D/policlinica/modelo-03.xkt" },
    { id: "IFC_HID", src: "/3D/policlinica/modelo-04.xkt" },
    { id: "IFC_SAN", src: "/3D/policlinica/modelo-05.xkt" },
    { id: "IFC_ELE_S_220", src: "/3D/policlinica/modelo-06.xkt" },
    { id: "IFC_ITM", src: "/3D/policlinica/modelo-07.xkt" },
    { id: "IFC_ELE_A_220", src: "/3D/policlinica/modelo-08.xkt" },
    { id: "IFC_LOG", src: "/3D/policlinica/modelo-09.xkt" },
    { id: "IFC_TEF", src: "/3D/policlinica/modelo-10.xkt" },
    { id: "IFC_ALI_220", src: "/3D/policlinica/modelo-11.xkt" },
    { id: "IFC_ALI_380", src: "/3D/policlinica/modelo-12.xkt" },
    { id: "IFC_IRRI", src: "/3D/policlinica/modelo-13.xkt" },
];

const CANAA_MODELS = [  
    { id: "IFC_ELE", src: "/3D/esc_canaa/modelo-01.xkt" }, 
    { id: "IFC_ILUX", src: "/3D/esc_canaa/modelo-02.xkt" },
    { id: "IFC_LOG", src: "/3D/esc_canaa/modelo-03.xkt" },
    { id: "IFC_ALI", src: "/3D/esc_canaa/modelo-04.xkt" },
    { id: "IFC_INC", src: "/3D/esc_canaa/modelo-05.xkt" },
    { id: "IFC_EST_PP", src: "/3D/esc_canaa/modelo-06.xkt" },    
    { id: "IFC_SUB", src: "/3D/esc_canaa/modelo-07.xkt" },
    { id: "IFC_CLI", src: "/3D/esc_canaa/modelo-08.xkt" },
    { id: "IFC_ILU", src: "/3D/esc_canaa/modelo-09.xkt" },
    { id: "IFC_SPDA", src: "/3D/esc_canaa/modelo-10.xkt" },
    { id: "IFC_HID", src: "/3D/esc_canaa/modelo-11.xkt" },
    { id: "IFC_SAN", src: "/3D/esc_canaa/modelo-12.xkt" },
    { id: "IFC_EXA", src: "/3D/esc_canaa/modelo-13.xkt" },
    { id: "IFC_ARQ", src: "/3D/esc_canaa/modelo-14.xkt" },
    { id: "IFC_PLU", src: "/3D/esc_canaa/modelo-15.xkt" },
    { id: "IFC_EST_EMT", src: "/3D/esc_canaa/modelo-16.xkt" },
    { id: "IFC_SDAI", src: "/3D/esc_canaa/modelo-17.xkt" },
    { id: "IFC_GLP", src: "/3D/esc_canaa/modelo-18.xkt" },
    { id: "IFC_IRRI", src: "/3D/esc_canaa/modelo-19.xkt" },
  ];

const SEBRAE_RR_MODELS = [
    { id: "IFC_ALI", src: "/3D/sebrae-rr/modelo-01.xkt" },
];

const defaultModels = [
    { id: "IFC_LOG_TEF", src: "/3D/lacen/modelo-01.xkt" },
    { id: "IFC_ELE", src: "/3D/lacen/modelo-02.xkt" },
    { id: "IFC_SPDA", src: "/3D/lacen/modelo-03.xkt" },
    { id: "IFC_ECX", src: "/3D/lacen/modelo-04.xkt" },
    { id: "IFC_ILUX", src: "/3D/lacen/modelo-05.xkt" },
    { id: "IFC_EST", src: "/3D/lacen/modelo-06.xkt" },
    { id: "IFC_SAN", src: "/3D/lacen/modelo-07.xkt" },
    { id: "IFC_INC", src: "/3D/lacen/modelo-08.xkt" },
    { id: "IFC_HID", src: "/3D/lacen/modelo-09.xkt" },
    { id: "IFC_PLU", src: "/3D/lacen/modelo-10.xkt" },
    { id: "IFC_GLP", src: "/3D/lacen/modelo-11.xkt" },
    //{ id: "IFC_ARQ", src: "/3D/lacen/modelo-12.xkt" },
    { id: "IFC_EST_SUB", src: "/3D/lacen/modelo-13.xkt" },
    { id: "IFC_CLI_DUT", src: "/3D/lacen/modelo-14.xkt" },
    { id: "IFC_EXA", src: "/3D/lacen/modelo-15.xkt" },
    { id: "IFC_CLI", src: "/3D/lacen/modelo-16.xkt" },
    { id: "IFC_EST_CT", src: "/3D/lacen/modelo-17.xkt" },
    { id: "IFC_ALI_220", src: "/3D/lacen/modelo-18.xkt" },
    { id: "IFC_ALI_380", src: "/3D/lacen/modelo-19.xkt" },
];

const IPER_MODEL_TRANSFORMS = {
    IFC_EST: { position: [-8.789, 0.4, 22.5] },
    IFC_SPDA: { position: [0.15, 0, -0.2], rotation: [0, 90, 0] },
    IFC_LOG: { position: [0.16, 0, -0.19], rotation: [0, 90, 0] },
    IFC_TEF: { position: [0.16, 0, -0.19], rotation: [0, 90, 0] },
    IFC_ELE: { position: [0.16, 0, -0.19] },
    IFC_SAN: { position: [0.2, 0, 13.9], rotation: [0, 90, 0] },
    IFC_SUB: { position: [2.74, -0.28, 2.65], rotation: [0, 96.1, 0] },
    IFC_INC: { position: [0.15, 0, 13.9], rotation: [0, 90, 0] },
    IFC_HID: { position: [0.15, 0, 13.9], rotation: [0, 90, 0] },
    IFC_PLU: { position: [0.15, 0, 13.9], rotation: [0, 90, 0] },
    IFC_FOT: { position: [0, 0, 13.9], rotation: [0, 90, 0]},
    IFC_CLI: { position: [0.16, 0, -0.2], rotation: [0, 90, 0]  },
    IFC_ALI: { position: [0.15, 0, -0.17] },
    IFC_EST_SQD: { position: [18.655, -0.658, -15.215] },
    IFC_EST_SUB: { position: [27.7, -0.58, -22.4], rotation: [0, -84.1, 0] },
    IFC_EST_CT: { position: [-15.15, 1.44, -16.47], rotation: [0, 90, 0]  },
    IFC_EST_MR: { position: [35.25, 0, 20.2], rotation: [0, 90, 0]  },
    IFC_EST_MRC: { position: [-23, 0.35, 28.88] },
    IFC_EMT_ESC: { position: [0.14, 0.35, -0.15], rotation: [0, 90, 0]  },
    IFC_EMT_COB: { position: [0.14, 0, -0.15], rotation: [0, 90, 0]  },
    //IFC_ILUX: { position: [-14, 0, 0]},
    IFC_ARQ: { position: [0.16, 0, -0.19], rotation: [0, 90, 0]  },
    IFC_SDAI: { position: [0.16, 0, -0.19] },
};

const FARMACIA_MODEL_TRANSFORMS = {
    IFC_EST: { position: [2.22, 0.1, 2.61] },
    IFC_SAN: { position: [14.09, 0, 0] },
    IFC_HID: { position: [0, 0.1, 0] },
    //IFC_INC: { position: [14.09, 0, 0] },
    IFC_ILUX: { position: [14.09, 0, 0] },
    IFC_ALI: { position: [14.09, 0, 0] },
    IFC_FOT: { position: [14.09, 0, 0] },
    IFC_ARQ: { position: [14.09, 0, 0] },
    IFC_CLI: { position: [14.09, 0, 0] },
    //IFC_EXA: { position: [14.09, 0, 0] },
    IFC_ELE: { position: [14.09, 0, 0] },
    IFC_LOG_TEF: { position: [14.09, 0, 0] },
};

const POLICLINICA_MODEL_TRANSFORMS = {
    IFC_EST_PP: { position: [-80, 0.4, 50] },
    IFC_ELE_T_220: { position: [-78, 0, 40] },
    IFC_PLU: { position: [-78, 0, 40] },
    IFC_HID: { position: [-78, 0, 40] , rotation: [0, -45, 0] },
    IFC_ELE_S_220: { position: [-78, 0, 40], rotation: [0, -45, 0]  },
    IFC_ITM: { position: [-78, 0, 40] },
    IFC_ELE_A_220: { position: [-78, 0, 40], rotation: [0, -45, 0] },
    IFC_SAN: { position: [-78, 0, 40] },
    IFC_LOG: { position: [-78, 0, 40] },
    IFC_TEF: { position: [-78, 0, 40] },
    IFC_ALI_220: { position: [-78, 0, 40] },
    IFC_ALI_380: { position: [-78, 0, 40] },
    IFC_IRRI: { position: [-78, 0, 40], rotation: [0, -45, 0] },
};

const CANAA_MODEL_TRANSFORMS = {
    IFC_EST_PP: { position: [48.212, 0.385, -36.8995]},
    IFC_SAN: { position: [-0.03,-0.1, 0] },
    //IFC_PLU: { position: [0, 0, 0], rotation: [0, 180, 0] },
    IFC_ARQ: { position: [48.25, 0, -36.8695]},
    IFC_EST_EMT: { position: [48.212, 0.075, -36.8995], rotation: [0, 180, 0]},
};

const SEBRAE_RR_MODEL_TRANSFORMS = {
    IFC_ALI: { position: [15, 0, 50] },
};

const DEFAULT_MODEL_TRANSFORMS = {
    IFC_ILUX: { position: [-14.08, 0, 0] },
    IFC_EST: { position: [-62.3, 0.4, 35.2] },
    IFC_LOG_TEF: { position: [-14.08, 0, 0] },
    IFC_ECX: { position: [-14.08, 0, 0] },
    IFC_SAN: { position: [-1, 0, -14.1] },
    IFC_INC: { position: [-1, 0, -14.1] },
    IFC_HID: { position: [-1, 0, -14.1] },
    IFC_PLU: { position: [13.03, 0, -14.05] },
    IFC_GLP: { position: [13.03, 0, -14.05] },
    //IFC_ARQ: { position: [13.03, 0, -14.05], rotation: [0, 90, 0]  },
    IFC_EST_SUB: { position: [-41.57, 0.4, 15.5], rotation: [0, 90, 0] },
    IFC_CLI_DUT: { position: [13, 0, 0], rotation: [0, 90, 0] },
    IFC_EXA: { position: [13.03, 0, -14.05] },
    IFC_CLI: { position: [-0.5, 0, -14.05] },
    IFC_EST_CT: { position: [-54, 0, -5.3] },
    IFC_ALI_220: { position: [-14.08, 0, 0] },
    IFC_ALI_380: { position: [-14.08, 0, 0] },
};

function loadModelGroup(models, transforms) {
    currentModels = models;
    currentModelTransforms = transforms;
    modelsLoadedCount = 0;
    expectedModels = 0;
    defaultModelChecksDone = 0;

    currentModels.forEach(loadDefaultModel);
}

const modelSelectionOverlay = document.getElementById("modelSelection");
const selectIperModelsButton = document.getElementById("selectIperModels");
const selectPoliclinicaModelsButton = document.getElementById("selectPoliclinicaModels");
const selectFarmaciaModelsButton = document.getElementById("selectFarmaciaModels");
const selectLacenModelsButton = document.getElementById("selectLacenModels");
const selectCanaaModelsButton = document.getElementById("selectCanaaModels");
const selectPublicProject = document.getElementById("selectPublicProject");
const selectPrivateProject = document.getElementById("selectPrivateProject");
const projectFromDataset = document.body?.dataset?.project;
const ifcUploadInput = document.getElementById("ifcUploadInput");
const ifcUploadStatus = document.getElementById("ifcUploadStatus");

const PROJECT_CONFIGS = {
    iper: { models: IPER_MODELS, transforms: IPER_MODEL_TRANSFORMS },
    lacen: { models: defaultModels, transforms: DEFAULT_MODEL_TRANSFORMS },
    policlinica: { models: POLICLINICA_MODELS, transforms: POLICLINICA_MODEL_TRANSFORMS },
    farmacia: { models: FARMACIA_MODELS, transforms: FARMACIA_MODEL_TRANSFORMS },
    esc_canaa: { models: CANAA_MODELS, transforms: CANAA_MODEL_TRANSFORMS },
    sebrae_rr: { models: SEBRAE_RR_MODELS, transforms: SEBRAE_RR_MODEL_TRANSFORMS },
};

const PROJECT_ROUTES = {
    iper: "/3D/iper",
    lacen: "/3D/lacen",
    policlinica: "/3D/policlinica",
    farmacia: "/3D/farmacia",
    esc_canaa: "/3D/esc_canaa",
    sebrae_rr: "/3D/sebrae-rr",
};

const PROJECT_BUDGET_DATA_URLS = {
    esc_canaa: "/3D/budget_rows.json",
};

const BUDGET_COLUMN_COUNT = 10;
const BUDGET_NUMBER_COLUMNS = new Set([5, 6, 7, 8, 9]);
const budgetAssociationsByCode = new Map();
const budgetAssociationsByDescription = new Map();

function parseBudgetNumber(rawValue) {
    const rawText = String(rawValue || "").trim();
    const normalized = rawText
        .replace(/\s+/g, "")
        .replace(/[^0-9,.-]/g, "");

    if (!normalized) {
        return NaN;
    }

    if (normalized.includes(",") && normalized.includes(".")) {
        return Number.parseFloat(normalized.replace(/\./g, "").replace(",", "."));
    }

    if (normalized.includes(",")) {
        return Number.parseFloat(normalized.replace(",", "."));
    }

    return Number.parseFloat(normalized);
}

function formatBudgetNumber(value) {
    if (!Number.isFinite(value)) {
        return "";
    }

    return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function computeBudgetTotalIfNeeded(rowValues) {
    if (rowValues[8]) {
        return rowValues;
    }

    const quantity = parseBudgetNumber(rowValues[5]);
    const unitWithBdi = parseBudgetNumber(rowValues[7]);
    const unitValue = parseBudgetNumber(rowValues[6]);
    const unitToUse = Number.isFinite(unitWithBdi) ? unitWithBdi : unitValue;

    if (!Number.isFinite(quantity) || !Number.isFinite(unitToUse)) {
        return rowValues;
    }

    const updatedRow = [...rowValues];
    updatedRow[8] = formatBudgetNumber(quantity * unitToUse);
    return updatedRow;
}

function normalizeCompositionCode(rawCode) {
    const cleaned = String(rawCode || "").trim().toLowerCase();
    if (!cleaned) {
        return "";
    }

    const directDigits = cleaned.replace(/[^0-9]/g, "");
    if (directDigits) {
        return directDigits;
    }

    return cleaned.replace(/\s+/g, " ");
}

async function ensureBudgetAssociationsLoaded() {
    if (budgetAssociationsByCode.size > 0 || budgetAssociationsByDescription.size > 0) {
        return;
    }

    const associations = await loadAssociationDefinitionsFromExcel({ excelPath: "./base_de_dados.xlsx" });

    associations.forEach((association) => {
        const normalizedCode = normalizeCompositionCode(association.codigo);
        const normalizedDescription = normalizeSearchText(association.descricao).replace(/\s+/g, " ");
        const normalizedItemDescription = normalizeMaterialName(association.itemDescricao);

        if (!normalizedItemDescription) {
            return;
        }

        if (normalizedCode) {
            if (!budgetAssociationsByCode.has(normalizedCode)) {
                budgetAssociationsByCode.set(normalizedCode, new Set());
            }

            budgetAssociationsByCode.get(normalizedCode).add(normalizedItemDescription);
        }

        if (normalizedDescription) {
            if (!budgetAssociationsByDescription.has(normalizedDescription)) {
                budgetAssociationsByDescription.set(normalizedDescription, new Set());
            }

            budgetAssociationsByDescription.get(normalizedDescription).add(normalizedItemDescription);
        }
    });
}

function getAssociatedMaterialsByBudgetReference({ code = "", description = "" } = {}) {
    const associatedItems = new Set();

    const normalizedCode = normalizeCompositionCode(code);
    if (normalizedCode && budgetAssociationsByCode.has(normalizedCode)) {
        budgetAssociationsByCode.get(normalizedCode).forEach((item) => associatedItems.add(item));
    }

    const normalizedDescription = normalizeSearchText(description).replace(/\s+/g, " ");
    if (normalizedDescription) {
        if (budgetAssociationsByDescription.has(normalizedDescription)) {
            budgetAssociationsByDescription.get(normalizedDescription).forEach((item) => associatedItems.add(item));
        } else {
            budgetAssociationsByDescription.forEach((items, descriptionKey) => {
                if (descriptionKey.includes(normalizedDescription) || normalizedDescription.includes(descriptionKey)) {
                    items.forEach((item) => associatedItems.add(item));
                }
            });
        }
    }

    return Array.from(associatedItems);
}

function isolateBudgetComposition({ code = "", description = "" } = {}) {
    const associatedItems = getAssociatedMaterialsByBudgetReference({ code, description });
    if (!associatedItems.length) {
        return false;
    }

    const objectIds = new Set();

    associatedItems.forEach((itemName) => {
        const ids = findMaterialObjectIds(itemName);
        ids.forEach((id) => objectIds.add(id));
    });

    if (!objectIds.size || !modelIsolateController) {
        return false;
    }

    const idsToFocus = Array.from(objectIds);
    const allIds = getAllObjectIds();

    modelIsolateController.setObjectsVisible(allIds, false);
    modelIsolateController.setObjectsXRayed(allIds, false);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    modelIsolateController.setObjectsVisible(idsToFocus, true);
    modelIsolateController.setObjectsHighlighted(idsToFocus, true);

    const combinedAABB = mergeAABBs(idsToFocus.map((id) => viewer.scene.getAABB(id)));
    if (combinedAABB) {
        viewer.cameraFlight.flyTo({ aabb: combinedAABB, duration: 0.6 });
    }

    requestRenderFrame();
    return true;
}

function openMaterialsPanelAndFilterByBudgetReference({ code = "", description = "" } = {}) {
    if (!materialsPanel) {
        return [];
    }

    if (!materialsAllResults.length) {
        generateAndRenderMaterialsList();
    }

    const associatedMaterials = getAssociatedMaterialsByBudgetReference({ code, description });
    if (!associatedMaterials.length) {
        return [];
    }

    materialsPanel.hidden = false;
    materialsPanelToggleButton?.classList.add("active");
    if (materialsSearchInput) {
        materialsSearchInput.value = description || code;
    }
    applyMaterialsSearch({ skipAssociationsLoad: true });
    return associatedMaterials;
}


function setBudgetStatus(message, isError = false) {
    if (!budgetStatus) {
        return;
    }

    budgetStatus.hidden = !message;
    budgetStatus.textContent = message || "";
    budgetStatus.style.color = isError ? "#ffb4b4" : "#cfd8dc";
}

function clearBudgetTable() {
    if (budgetTableBody) {
        budgetTableBody.innerHTML = "";
    }

    if (budgetTable) {
        budgetTable.hidden = true;
    }
}

function getBudgetRowClass(itemValue, hasDescription, hasCode) {
    const isSection = itemValue && /^\d+(\.\d+)?$/.test(itemValue) && hasDescription && !hasCode;
    return isSection ? "section-row" : "data-row";
}

async function renderProjectBudgetTable(projectKey) {
    const budgetDataUrl = PROJECT_BUDGET_DATA_URLS[projectKey];
    if (!budgetDataUrl || !budgetTableBody || !budgetTable) {
        return false;
    }

    try {
        setBudgetStatus("Carregando orçamento...");
        clearBudgetTable();
        await ensureBudgetAssociationsLoaded();

        const response = await fetch(budgetDataUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Não foi possível carregar os dados do orçamento (status ${response.status}).`);
        }
        const budgetRows = await response.json();
        if (!Array.isArray(budgetRows)) {
            throw new Error("Formato inválido dos dados de orçamento.");
        }

        const fragment = document.createDocumentFragment();
        for (const row of budgetRows) {
            const normalized = computeBudgetTotalIfNeeded(
                Array.from({ length: BUDGET_COLUMN_COUNT }, (_, colIndex) => String(row?.[colIndex] || "").trim())
            );

            const hasAnyValue = normalized.some((value) => value);
            if (!hasAnyValue) {
                continue;
            }

            const [item, codigo, , descricao] = normalized;
            const codeKey = normalizeCompositionCode(codigo);
            const descriptionKey = normalizeSearchText(descricao).replace(/\s+/g, " ");
            const hasAssociations =
                (codeKey && budgetAssociationsByCode.has(codeKey)) ||
                (descriptionKey && budgetAssociationsByDescription.has(descriptionKey));
            const tr = document.createElement("tr");
            tr.className = getBudgetRowClass(item, Boolean(descricao), Boolean(codigo));

             normalized.forEach((value, index) => {
                const td = document.createElement("td");
                td.textContent = value;

                if (hasAssociations && (index === 1 || index === 3)) {
                    td.classList.add("budget-code-clickable");
                    td.setAttribute("role", "button");
                    td.setAttribute("tabindex", "0");
                    td.title = "Clique para pesquisar os itens desta composição na base e localizar no modelo";

                    const handleCompositionClick = async () => {
                        await ensureBudgetAssociationsLoaded();

                        const associatedMaterials = openMaterialsPanelAndFilterByBudgetReference({
                            code: codigo,
                            description: descricao
                        });
                        if (!associatedMaterials.length) {
                            setBudgetStatus(`Composição ${codigo || descricao} sem itens associados na base para pesquisa.`, true);
                            return;
                        }

                        const isolated = isolateBudgetComposition({ code: codigo, description: descricao });
                        if (!isolated) {
                            setBudgetStatus(
                                `Composição ${codigo || descricao}: associações carregadas. Clique no item associado na lista de materiais para localizar no modelo.`,
                                true
                            );
                         return;
                        }
                        setBudgetStatus(
                            `Composição ${codigo || descricao}: itens associados localizados. Você pode clicar em qualquer item associado na lista de materiais.`
                        );
                    };

                    td.addEventListener("click", handleCompositionClick);
                    td.addEventListener("keydown", (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleCompositionClick();
                        }
                    });
                }

                if (BUDGET_NUMBER_COLUMNS.has(index)) {
                    td.classList.add("numeric");
                }
                tr.appendChild(td);
            });

            fragment.appendChild(tr);
        }

        budgetTableBody.appendChild(fragment);
        budgetTable.hidden = false;
        setBudgetStatus("");
        return true;
    } catch (error) {
        console.error("Erro ao carregar orçamento:", error);
        clearBudgetTable();
        setBudgetStatus(`Erro ao carregar orçamento: ${error.message}`, true);
        return false;
    }
}

function openProjectBudget(projectKey = activeProjectKey) {
    const budgetDataUrl = PROJECT_BUDGET_DATA_URLS[projectKey];

    if (!budgetPanel || !budgetDataUrl) {
        return false;
    }

    if (!budgetTableLoadedProjects.has(projectKey)) {
        renderProjectBudgetTable(projectKey).then((loaded) => {
            if (loaded) {
                budgetTableLoadedProjects.add(projectKey);
            }
        });
    } else {
        setBudgetStatus("");
        if (budgetTable) {
            budgetTable.hidden = false;
        }
    }

    budgetPanel.hidden = false;
    budgetPanelToggleButton?.classList.add("active");
    budgetPanelToggleButton?.setAttribute("aria-pressed", "true");
    return true;
}

function updateProjectUrl(projectKey, { replace = false } = {}) {
    const route = PROJECT_ROUTES[projectKey];
    if (!route || !window?.history?.pushState) {
        return;
    }

    if (window.location.pathname === route) {
        return;
    }

    if (replace) {
        window.history.replaceState({}, "", route);
        return;
    }

    window.history.pushState({}, "", route);
}

function handleModelSelection(models, transforms, projectKey, { replaceUrl = false } = {}) {
    activeProjectKey = projectKey;

    if (modelSelectionOverlay) {
        modelSelectionOverlay.hidden = true;
    }
    clearAllLoadedModels();
    resetModelVisibility();
    loadModelGroup(models, transforms);
    updateProjectUrl(projectKey, { replace: replaceUrl });
    setIfcUploadStatus("");
    requestRenderFrame();
}
function handleProjectSelectChange(event) {
    const projectKey = event.target.value;
    if (!projectKey || !PROJECT_CONFIGS[projectKey]) {
        return;
    }

    const { models, transforms } = PROJECT_CONFIGS[projectKey];
    handleModelSelection(models, transforms, projectKey);
}

function clearAllLoadedModels() {
    loadedModels.forEach((model) => {
        if (typeof model.destroy === "function") {
            model.destroy();
        }
    });

    loadedModels.clear();
    originalTransforms.clear();
    currentModels = [];
    currentModelTransforms = {};
}

function setIfcUploadStatus(message, isError = false) {
    if (!ifcUploadStatus) {
        return;
    }

    ifcUploadStatus.textContent = message;
    ifcUploadStatus.style.color = isError ? "#fecaca" : "#cbd5e1";
}

let uploadModelSequence = 0;

function buildUploadModelId(prefix) {
    uploadModelSequence += 1;
    return `${prefix}_${Date.now()}_${uploadModelSequence}`;
}

function finalizeUploadedModelLoad(model, { modelId, fileName, formatLabel, objectUrl = null, totalFiles = 1, loadedFilesRef = { count: 0 } }) {
    if (!model || typeof model.on !== "function") {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        setIfcUploadStatus(`Formato de resposta inesperado ao carregar ${formatLabel}.`, true);
        return;
    }

    model.on("loaded", () => {
        currentModels = [...currentModels, { id: modelId, src: fileName }];
        registerModelTransform(model);
        adjustCameraOnLoad();
        viewer.cameraFlight.jumpTo(viewer.scene);
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        loadedFilesRef.count += 1;
        const loadedCount = loadedFilesRef.count;
        const statusMessage = totalFiles > 1
            ? `${loadedCount}/${totalFiles} arquivo(s) carregado(s). Último: ${fileName}.`
            : `${formatLabel} carregado: ${fileName}.`;
        setIfcUploadStatus(statusMessage);
    });

    model.on("error", (error) => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
        setIfcUploadStatus(`Falha ao carregar ${fileName}.`, true);
        console.error(`Erro ao carregar ${formatLabel}:`, error);
    });
}

async function loadIfcUpload(file, uploadContext = {}) {
    const modelId = buildUploadModelId("IFC_UPLOAD");
    const baseIfcLoadOptions = {
        id: modelId,
        cacheBuster: false,
        edges: !viewerCompatibility.disableEdges,
        loadMetadata: true,
        loadMetadataPropertySets: true,
        excludeTypes: ["IfcSpace", "IfcOpeningElement"],
        origin: [0, 0, 0],
        position: [0, 0, 0],
        dtxEnabled: viewerCompatibility.enableDataTextures
    };

    const [fileText, fileArrayBuffer] = await Promise.all([
        file.text(),
        file.arrayBuffer()
    ]);

    const tryLoadWithResolvedMethod = async (loader) => {
        const loadMethod = resolveIfcLoadMethod(loader);

        if (!loadMethod) {
            throw new Error("Não foi possível identificar o método de carregamento IFC.");
        }

        const attempts = [
            async () => loader[loadMethod]({
                ...baseIfcLoadOptions,
                text: fileText
            }),
            async () => loader[loadMethod]({
                ...baseIfcLoadOptions,
                data: fileArrayBuffer
            }),
            async () => loader[loadMethod](fileText, {
                ...baseIfcLoadOptions
            }),
            async () => loader[loadMethod](fileArrayBuffer, {
                ...baseIfcLoadOptions
            })
        ];

        const errors = [];

        for (const attempt of attempts) {
            try {
                const result = await attempt();
                return typeof result?.then === "function" ? await result : result;
            } catch (error) {
                errors.push(error);
            }
        }
        const lastError = errors[errors.length - 1];
        throw new Error(lastError?.message || errors[0]?.message || "Falha desconhecida ao carregar IFC.");
    };

    try {
        let model = null;
        let ifcOpenShellError = null;

        try {
            const openShellLoader = await getIfcOpenShellLoader();
            model = await tryLoadWithResolvedMethod(openShellLoader);
        } catch (error) {
            ifcOpenShellError = error;
            console.warn("Falha ao carregar IFC com IFCOpenShellLoaderPlugin. Tentando WebIFCLoaderPlugin.", error);
        }

        if (!model) {
            const webIfcLoader = await getIfcLoader();

            if (!webIfcLoader) {
                throw ifcOpenShellError || new Error("Carregador IFC indisponível no momento.");
            }

            model = await tryLoadWithResolvedMethod(webIfcLoader);
        }

        finalizeUploadedModelLoad(model, {
            ...uploadContext,
            modelId,
            fileName: file.name,
            formatLabel: "IFC"
        });
    } catch (error) {
        setIfcUploadStatus(`Falha ao iniciar o carregamento do IFC: ${error?.message || error}.`, true);
        console.error("Erro ao iniciar carregamento IFC:", error);
    }
}

function loadXktUpload(file, uploadContext = {}) {
    const objectUrl = URL.createObjectURL(file);
    const modelId = buildUploadModelId("XKT_UPLOAD");

    let model;

    try {
        model = xktLoader.load({
            id: modelId,
            src: normalizeBlobUrl(objectUrl),
            cacheBuster: false,
            edges: !viewerCompatibility.disableEdges,
            dtxEnabled: viewerCompatibility.enableDataTextures
        });
    } catch (error) {
        URL.revokeObjectURL(objectUrl);
        setIfcUploadStatus(`Falha ao iniciar o carregamento do XKT: ${error?.message || error}.`, true);
        console.error("Erro ao iniciar carregamento XKT:", error);
        return;
    }

    finalizeUploadedModelLoad(model, {
        ...uploadContext,
        modelId,
        fileName: file.name,
        formatLabel: "XKT",
        objectUrl
    });
}

function setupIfcUploadInput() {
    if (!ifcUploadInput) {
        return;
    }

    ifcUploadInput.addEventListener("change", async () => {
        const files = Array.from(ifcUploadInput.files || []);

        if (!files.length) {
            return;
        }

        const invalidFile = files.find((file) => {
            const lowerCaseFileName = file.name.toLowerCase();
            return !lowerCaseFileName.endsWith(".xkt") && !lowerCaseFileName.endsWith(".ifc");
        });

        if (invalidFile) {
            setIfcUploadStatus("Arquivo inválido. Selecione apenas arquivos .xkt ou .ifc.", true);
            return;
        }

        expectedModels += files.length;
        defaultModelChecksDone += files.length;

        const loadedFilesRef = { count: 0 };
        const uploadContext = {
            totalFiles: files.length,
            loadedFilesRef
        };

        setIfcUploadStatus(
            files.length > 1
                ? `Adicionando ${files.length} arquivos ao cenário...`
                : `Adicionando ${files[0].name} ao cenário...`
        );

        for (const file of files) {
            const lowerCaseFileName = file.name.toLowerCase();

            if (lowerCaseFileName.endsWith(".ifc")) {
                await loadIfcUpload(file, uploadContext);
                continue;
            }

            loadXktUpload(file, uploadContext);
        }

        ifcUploadInput.value = "";
    });
}

if (selectIperModelsButton) {
    selectIperModelsButton.addEventListener("click", () => {
        handleModelSelection(IPER_MODELS, IPER_MODEL_TRANSFORMS, "iper");
    });
}

if (selectPoliclinicaModelsButton) {
    selectPoliclinicaModelsButton.addEventListener("click", () => {
        handleModelSelection(POLICLINICA_MODELS, POLICLINICA_MODEL_TRANSFORMS, "policlinica");
    });
}

if (selectFarmaciaModelsButton) {
    selectFarmaciaModelsButton.addEventListener("click", () => {
        handleModelSelection(FARMACIA_MODELS, FARMACIA_MODEL_TRANSFORMS, "farmacia");
    });
}

if (selectLacenModelsButton) {
    selectLacenModelsButton.addEventListener("click", () => {
        handleModelSelection(defaultModels, DEFAULT_MODEL_TRANSFORMS, "lacen");
    });
}

if (selectCanaaModelsButton) {
    selectCanaaModelsButton.addEventListener("click", () => {
        handleModelSelection(CANAA_MODELS, CANAA_MODEL_TRANSFORMS, "esc_canaa");
    });
}

if (selectPublicProject) {
    selectPublicProject.addEventListener("change", handleProjectSelectChange);
}

if (selectPrivateProject) {
    selectPrivateProject.addEventListener("change", handleProjectSelectChange);
}

if (projectFromDataset && PROJECT_CONFIGS[projectFromDataset]) {
    const { models, transforms } = PROJECT_CONFIGS[projectFromDataset];
    handleModelSelection(models, transforms, projectFromDataset, { replaceUrl: true });
}

setupIfcUploadInput();

if (transformModelSelect) {
    transformModelSelect.addEventListener("change", (event) => syncTransformInputs(event.target.value));
}

if (applyTransformButton) {
    applyTransformButton.addEventListener("click", applyTransformFromUI);
}

if (resetTransformButton) {
    resetTransformButton.addEventListener("click", resetTransformFromUI);
}

// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca (MANTIDO)
// -----------------------------------------------------------------------------

const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, { zIndex: 100000 });
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
angleMeasurementsMouseControl.deactivate(); 

const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer, { zIndex: 100000 });
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer),
    snapping: true
});
distanceMeasurementsMouseControl.deactivate();

// -----------------------------------------------------------------------------
// Suporte a toque para medições (ângulo e distância)
// -----------------------------------------------------------------------------
// Os controles de medição originais funcionam apenas com eventos de mouse.
// Para tablets e celulares, convertemos eventos de toque em eventos de mouse
// equivalentes, garantindo que as ferramentas de medir funcionem via toque.
(function enableTouchForMeasurements() {
    const canvasElement = viewer.scene.canvas.canvas;
    let touchActive = false;

    const dispatchMouseEvent = (type, touch) => {
        const eventInit = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            bubbles: true,
            cancelable: true
        };
        canvasElement.dispatchEvent(new MouseEvent(type, eventInit));
    };

    canvasElement.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) {
            return;
        }

        touchActive = true;
        const touch = event.touches[0];
        dispatchMouseEvent('mousemove', touch);
        dispatchMouseEvent('mousedown', touch);
        event.preventDefault();
    }, { passive: false });

    canvasElement.addEventListener('touchmove', (event) => {
        if (!touchActive || event.touches.length !== 1) {
            return;
        }

        dispatchMouseEvent('mousemove', event.touches[0]);
        event.preventDefault();
    }, { passive: false });

    canvasElement.addEventListener('touchend', (event) => {
        if (!touchActive) {
            return;
        }

        const touch = event.changedTouches[0];
        dispatchMouseEvent('mouseup', touch);
        dispatchMouseEvent('click', touch);
        touchActive = false;
        event.preventDefault();
    }, { passive: false });

    canvasElement.addEventListener('touchcancel', () => {
        if (!touchActive) {
            return;
        }

        dispatchMouseEvent('mouseup', { clientX: 0, clientY: 0, screenX: 0, screenY: 0 });
        touchActive = false;
    });
})();
// -----------------------------------------------------------------------------
// Função utilitária: Limpa qualquer seleção, destaque ou estado de botão ativo
// -----------------------------------------------------------------------------
function clearSelection(removeButtonHighlight = true) {
    try {
        // Remove seleção de qualquer entidade
        if (viewer.scene && viewer.scene.selectedObjectIds) {
            viewer.scene.setObjectsSelected(viewer.scene.selectedObjectIds, false);
        }

        // Limpa a referência da última seleção
        lastSelectedEntity = null;

        // Remove destaque visual (highlight)
        if (viewer.scene && viewer.scene.highlightedObjectIds) {
            viewer.scene.setObjectsHighlighted(viewer.scene.highlightedObjectIds, false);
        }

        // Opcionalmente remove destaque do botão ativo
        if (removeButtonHighlight) {
            document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
        }
    } catch (e) {
        console.warn("⚠️ clearSelection(): falhou ao limpar seleção:", e);
    }
}

function selectEntity(entity) {
    if (!entity || !entity.isObject) {
        return;
    }

    // Remove seleções anteriores e marca a nova entidade
    clearSelection(false);
    entity.selected = true;
    lastSelectedEntity = entity;

    if (document.getElementById("propertyPanel")) {
        showMaterialProperties(entity);
    }
}
function setMeasurementMode(mode, clickedButton) {
    angleMeasurementsMouseControl.deactivate();
    distanceMeasurementsMouseControl.deactivate();
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));

    if (mode === 'angle') {
        angleMeasurementsMouseControl.activate();
    } else if (mode === 'distance') {
        distanceMeasurementsMouseControl.activate();
    }

    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    angleMeasurementsMouseControl.reset();
    distanceMeasurementsMouseControl.reset();

    // Garante que o modo de seleção seja desativado ao iniciar uma medição
    clearSelection(false);
}

window.setMeasurementMode = setMeasurementMode;

function getModelObjectIds(modelId) {
    const ids = [];

    // Tenta usar a lista de objetos do modelo (quando disponível)
    const model = loadedModels.get(modelId);
    if (model?.objectIds?.length) {
        return [...model.objectIds];
    }

    // Fallback: filtra metaObjects pelo metaModel associado
    const metaObjects = viewer.metaScene?.metaObjects || {};
    for (const [objectId, metaObject] of Object.entries(metaObjects)) {
        if (metaObject?.metaModel?.id === modelId) {
            ids.push(objectId);
        }
    }
    return ids;
}

function getObjectMetaModelId(objectId) {
    const metaObjects = viewer.metaScene?.metaObjects || {};
    const metaObject = metaObjects[objectId];

    return metaObject?.metaModel?.id || null;
}

function intersectsAABB(aabbA, aabbB, overlapTolerance = 0) {
    if (!aabbA || !aabbB) {
        return false;
    }

    const overlapX = Math.min(aabbA[3], aabbB[3]) - Math.max(aabbA[0], aabbB[0]);
    const overlapY = Math.min(aabbA[4], aabbB[4]) - Math.max(aabbA[1], aabbB[1]);
    const overlapZ = Math.min(aabbA[5], aabbB[5]) - Math.max(aabbA[2], aabbB[2]);

    if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
        return false;
    }

    if (overlapTolerance <= 0) {
        return true;
    }

    return overlapX >= overlapTolerance && overlapY >= overlapTolerance && overlapZ >= overlapTolerance;
}
function mergeAABBs(aabbs) {
    const valid = aabbs.filter(Boolean);

    if (!valid.length) {
        return null;
    }

    const minX = Math.min(...valid.map((aabb) => aabb[0]));
    const minY = Math.min(...valid.map((aabb) => aabb[1]));
    const minZ = Math.min(...valid.map((aabb) => aabb[2]));
    const maxX = Math.max(...valid.map((aabb) => aabb[3]));
    const maxY = Math.max(...valid.map((aabb) => aabb[4]));
    const maxZ = Math.max(...valid.map((aabb) => aabb[5]));
    
    return [minX, minY, minZ, maxX, maxY, maxZ];
}

function getCameraPose() {
    const { eye, look, up } = viewer.camera || {};

    if (!eye || !look || !up) {
        return null;
    }

    return {
        eye: [...eye],
        look: [...look],
        up: [...up]
    };
}

function restoreCameraPose(pose) {
    if (!pose) {
        return;
    }

    viewer.cameraFlight.jumpTo({
        eye: pose.eye,
        look: pose.look,
        up: pose.up
    });
}

function waitForRender(ms = 180) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toArraySafe(list) {
    if (!list) {
        return [];
    }

    if (Array.isArray(list)) {
        return [...list];
    }

    if (typeof list[Symbol.iterator] === "function") {
        return [...list];
    }

    return [];
}

function captureSceneRenderState() {
    const scene = viewer?.scene;

    if (!scene) {
        return null;
    }

    return {
        visible: toArraySafe(scene.visibleObjectIds),
        xrayed: toArraySafe(scene.xrayedObjectIds),
        highlighted: toArraySafe(scene.highlightedObjectIds)
    };
}

function restoreSceneRenderState(state) {
    const scene = viewer?.scene;

    if (!scene || !state) {
        return;
    }

    const applyState = (current, target, setter) => {
        if (!setter) {
            return;
        }

        const currentIds = toArraySafe(current);
        const targetIds = toArraySafe(target);
        const unionIds = [...new Set([...currentIds, ...targetIds])];

        if (unionIds.length) {
            setter(unionIds, false);
        }

        if (targetIds.length) {
            setter(targetIds, true);
        }
    };

    applyState(scene.visibleObjectIds, state.visible, scene.setObjectsVisible?.bind(scene));
    applyState(scene.xrayedObjectIds, state.xrayed, scene.setObjectsXRayed?.bind(scene));
    applyState(scene.highlightedObjectIds, state.highlighted, scene.setObjectsHighlighted?.bind(scene));
}

/**
 * Snapshot LEVE:
 * - Faz downscale para reduzir pixels
 * - Exporta como JPEG com qualidade ajustável
 * - Mantém a imagem grande no PDF (em mm), mas leve (em px)
 */
function getCanvasSnapshot({
    maxWidthPx = 900,          // ↓ quanto menor, mais leve (700~1200 bom)
    mimeType = "image/jpeg",   // JPEG é muito mais leve que PNG
    quality = 0.55             // 0.35~0.70 (quanto menor, mais leve)
} = {}) {
    const canvas = document.getElementById("meuCanvas");
    if (!canvas) return null;

    const srcCanvas = canvas;
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;

    if (!srcW || !srcH) return null;

    // Escala para reduzir resolução
    const scale = Math.min(1, maxWidthPx / srcW);
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    // Canvas temporário reduzido
    const tmp = document.createElement("canvas");
    tmp.width = dstW;
    tmp.height = dstH;

    const ctx = tmp.getContext("2d", { alpha: false });

    // Melhora a aparência ao reduzir
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);

    // Exporta como JPEG comprimido
    return tmp.toDataURL(mimeType, quality);
}

async function captureSnapshotsForCollisions(collisions) {
    const originalPose = getCameraPose();
    const originalRenderState = captureSceneRenderState();
    const canvas = document.getElementById("meuCanvas");
    const canvasAspect =
        canvas?.width && canvas?.height ? canvas.width / canvas.height : 1.6;

    const snapshots = [];

    for (const { objectId, collidingWith } of collisions) {
        const isolationApplied = applyCollisionIsolation(objectId, collidingWith, { animate: false });

        if (!isolationApplied) {
            snapshots.push({ dataUrl: null, aspect: canvasAspect });
            continue;
        }

        requestRenderFrame();
        await waitForRender(220); // um pouco maior pra garantir render antes do print

        snapshots.push({
            dataUrl: getCanvasSnapshot({
                maxWidthPx: 900,          // ajuste aqui (700 = mais leve, 1200 = mais qualidade)
                mimeType: "image/jpeg",
                quality: 0.55             // ajuste aqui (0.45 = mais leve, 0.65 = melhor)
            }),
            aspect: canvasAspect
        });
    }

    if (originalRenderState) {
        restoreSceneRenderState(originalRenderState);
        requestRenderFrame();
    }

    if (originalPose) {
        restoreCameraPose(originalPose);
        requestRenderFrame();
    }

    return snapshots;
}

function applyCollisionIsolation(objectAId, collidingIds, { animate = true } = {}) {
    if (!modelIsolateController) {
        return false;
    }

    const idsToFocus = [objectAId, ...collidingIds];
    const allIds = getAllObjectIds();
    const otherIds = allIds.filter((id) => !idsToFocus.includes(id));
    // Limpa estados anteriores e oculta tudo para isolar apenas o grupo em colisão
    modelIsolateController.setObjectsVisible(allIds, false);
    modelIsolateController.setObjectsXRayed(allIds, false);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    // Mostra apenas os elementos em conflito e remove o X-ray deles
    modelIsolateController.setObjectsVisible(idsToFocus, true);
    modelIsolateController.setObjectsXRayed(idsToFocus, false);
    viewer.scene.setObjectsHighlighted(idsToFocus, true);

    if (otherIds.length) {
        modelIsolateController.setObjectsHighlighted(otherIds, false);
    }

    const combinedAABB = mergeAABBs(idsToFocus.map((id) => viewer.scene.getAABB(id)));

    if (combinedAABB) {
        if (animate) {
            viewer.cameraFlight.flyTo({ aabb: combinedAABB, duration: 0.6 });
        } else {
            viewer.cameraFlight.jumpTo({ aabb: combinedAABB });
        }
    }

    requestRenderFrame();

    return Boolean(combinedAABB);
}

function isolateCollisionGroup(objectAId, collidingIds) {
    applyCollisionIsolation(objectAId, collidingIds, { animate: true });
}

function updateCollisionDownloadButton() {
    if (!downloadCollisionPdfButton) {
        return;
    }

    const hasCollisions = lastCollisionResults.length > 0;
    downloadCollisionPdfButton.disabled = !hasCollisions;
    downloadCollisionPdfButton.title = hasCollisions
        ? "Baixar relatório em PDF"
        : "Nenhuma colisão encontrada para exportar";
}

function setCollisionState(collisions, modelId) {
    lastCollisionResults = collisions;
    lastCollisionModelId = collisions.length ? modelId : null;
    updateCollisionDownloadButton();
}

function updateCollisionActiveItem() {
    if (!collisionResultsList) {
        return;
    }

    Array.from(collisionResultsList.children).forEach((item) => {
        if (!(item instanceof HTMLElement)) {
            return;
        }

        const itemId = item.dataset.collisionId;
        item.classList.toggle(
            "is-active",
            Boolean(activeCollisionSelection && itemId === activeCollisionSelection.objectId)
        );
    });
}

function setActiveCollisionSelection(objectId, collidingWith) {
    activeCollisionSelection = { objectId, collidingWith };
    updateCollisionActiveItem();
}

function clearCollisionSelection() {
    activeCollisionSelection = null;
    updateCollisionActiveItem();
}

function formatIfcPropertyValue(value) {
    if (value === null || value === undefined) {
        return "(vazio)";
    }

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }

    return String(value);
}

function resolveMetaObject(entityId) {
    if (!entityId) {
        return null;
    }

    const metaObjects = viewer.metaScene?.metaObjects;
    if (!metaObjects) {
        return null;
    }

    if (metaObjects[entityId]) {
        return metaObjects[entityId];
    }

    const rawId = String(entityId);
    const candidateIds = new Set([rawId]);

    ["#", "/", ":"].forEach((separator) => {
        if (!rawId.includes(separator)) {
            return;
        }

        const parts = rawId.split(separator);
        const suffix = parts[parts.length - 1];
        if (suffix) {
            candidateIds.add(suffix);
        }
    });

    for (const candidateId of candidateIds) {
        if (metaObjects[candidateId]) {
            return metaObjects[candidateId];
        }
    }

    const normalizedCandidates = new Set(Array.from(candidateIds, (id) => id.toLowerCase()));

    for (const [id, metaObject] of Object.entries(metaObjects)) {
        const normalizedId = id.toLowerCase();
        if (normalizedCandidates.has(normalizedId)) {
            return metaObject;
        }

        for (const candidateId of normalizedCandidates) {
            if (
                normalizedId.endsWith(`#${candidateId}`) ||
                normalizedId.endsWith(`/${candidateId}`) ||
                normalizedId.endsWith(`:${candidateId}`)
            ) {
                return metaObject;
            }
        }
    }

    return null;
}
function getMetaObjectParent(metaObject) {
    if (!metaObject) {
        return null;
    }

    if (typeof metaObject.parent === "string") {
        return resolveMetaObject(metaObject.parent);
    }

    if (metaObject.parent?.id) {
        return metaObject.parent;
    }

    if (metaObject.parentId) {
        return resolveMetaObject(metaObject.parentId);
    }

    return null;
}

function getMetaObjectChildren(metaObject) {
    if (!metaObject) {
        return [];
    }

    const entries = [];

    if (Array.isArray(metaObject.children)) {
        entries.push(...metaObject.children);
    }

    if (Array.isArray(metaObject.childrenIds)) {
        entries.push(...metaObject.childrenIds);
    }

    const children = [];
    const seenIds = new Set();

    for (const entry of entries) {
        const child = typeof entry === "string" ? resolveMetaObject(entry) : entry;
        if (!child?.id || seenIds.has(child.id)) {
            continue;
        }

        seenIds.add(child.id);
        children.push(child);
    }

    return children;
}

function traverseMetaObjectSubtree(metaObject, visitor) {
    if (!metaObject || typeof visitor !== "function") {
        return;
    }

    const stack = [metaObject];
    const visited = new Set();

    while (stack.length) {
        const current = stack.pop();
        if (!current?.id || visited.has(current.id)) {
            continue;
        }

        visited.add(current.id);
        visitor(current);

        const children = getMetaObjectChildren(current);
        for (let i = children.length - 1; i >= 0; i--) {
            stack.push(children[i]);
        }
    }
}

function isSceneObjectId(objectId) {
    return Boolean(resolveEntityById(objectId));
}

function metaObjectBelongsToStorey(metaObject, storeyId) {
    if (!metaObject?.id || !storeyId) {
        return false;
    }

    let current = metaObject;
    const visited = new Set();

    while (current?.id && !visited.has(current.id)) {
        if (current.id === storeyId) {
            return true;
        }

        visited.add(current.id);
        current = getMetaObjectParent(current);
    }

    return false;
}

function getObjectsByStorey(storeyId) {
    const storeyMetaObject = resolveMetaObject(storeyId);
    if (!storeyMetaObject) {
        return [];
    }

    const ids = new Set();

    if (typeof viewer.scene.getObjectsInSubtree === "function") {
        const subtreeIds = viewer.scene.getObjectsInSubtree(storeyMetaObject.id) || [];
        subtreeIds.forEach((id) => {
            if (isSceneObjectId(id)) {
                ids.add(id);
            }
        });
    }

    traverseMetaObjectSubtree(storeyMetaObject, (metaObject) => {
        if (isSceneObjectId(metaObject.id)) {
            ids.add(metaObject.id);
        }
    });

    const allMetaObjects = viewer.metaScene?.metaObjects || {};
    for (const metaObject of Object.values(allMetaObjects)) {
        if (!metaObject?.id || !isSceneObjectId(metaObject.id)) {
            continue;
        }

        if (metaObjectBelongsToStorey(metaObject, storeyMetaObject.id)) {
            ids.add(metaObject.id);
        }
    }

    return Array.from(ids);
}

function getClassesFromObjects(objectIds) {
    const classIds = new Set();

    objectIds.forEach((objectId) => {
        const metaObject = resolveMetaObject(objectId);
        const classId = metaObject?.type;
        if (classId) {
            classIds.add(classId);
        }
    });

    return Array.from(classIds);
}

function expandHierarchy(objectIds) {
    const expandedIds = new Set();

    objectIds.forEach((objectId) => {
        const metaObject = resolveMetaObject(objectId);
        if (!metaObject) {
            if (isSceneObjectId(objectId)) {
                expandedIds.add(objectId);
            }
            return;
        }

        traverseMetaObjectSubtree(metaObject, (childMetaObject) => {
            if (isSceneObjectId(childMetaObject.id)) {
                expandedIds.add(childMetaObject.id);
            }
        });
    });

    return Array.from(expandedIds);
}

function getAllEntitiesFromStorey(storeyId) {
    const objectIds = getObjectsByStorey(storeyId);
    const expandedObjectIds = expandHierarchy(objectIds);
    const classIds = getClassesFromObjects(expandedObjectIds);

    return {
        objectIds: expandedObjectIds,
        classIds
    };
}

function getObjectIdsByType(type) {
    if (!type) {
        return [];
    }

    if (typeof viewer.metaScene?.getObjectIDsByType === "function") {
        return viewer.metaScene.getObjectIDsByType(type) || [];
    }

    const metaObjects = viewer.metaScene?.metaObjects || {};
    const ids = [];

    for (const metaObject of Object.values(metaObjects)) {
        if (metaObject?.type === type && metaObject?.id) {
            ids.push(metaObject.id);
        }
    }

    return ids;
}

function isolateStorey(storeyId) {
    const storeyMetaObject = resolveMetaObject(storeyId);
    if (!storeyMetaObject) {
        return false;
    }

    const { objectIds, classIds } = getAllEntitiesFromStorey(storeyMetaObject.id);
    const idsToFocus = new Set(objectIds);

    classIds.forEach((classId) => {
        getObjectIdsByType(classId).forEach((objectId) => {
            const metaObject = resolveMetaObject(objectId);
            if (metaObjectBelongsToStorey(metaObject, storeyMetaObject.id) && isSceneObjectId(objectId)) {
                idsToFocus.add(objectId);
            }
        });
    });

    const idsToShow = Array.from(idsToFocus);
    if (!idsToShow.length) {
        return false;
    }

    const allIds = getAllObjectIds();
    modelIsolateController.setObjectsVisible(allIds, false);
    modelIsolateController.setObjectsXRayed(allIds, false);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    modelIsolateController.setObjectsVisible(idsToShow, true);
    modelIsolateController.setObjectsXRayed(idsToShow, false);
    viewer.scene.setObjectsHighlighted(idsToShow, true);

    const combinedAABB = mergeAABBs(idsToShow.map((id) => viewer.scene.getAABB(id)));
    if (combinedAABB) {
        viewer.cameraFlight.flyTo({
            aabb: combinedAABB,
            duration: 0.6
        });
    }

    clearSelection();
    requestRenderFrame();
    return true;
}

function buildIfcPropertiesLines(doc, objectId, maxWidth) {
    const metaObject = resolveMetaObject(objectId);
    if (!metaObject) {
        return ["Propriedades IFC: metadados não encontrados para este objeto."];
    }

    const { propertySets } = metaObject;
    if (!propertySets?.length) {
        return ["Propriedades IFC: nenhum conjunto de propriedades disponível."];
    }

    const lines = ["Propriedades IFC:"];

    propertySets.forEach((pset) => {
        const setName = pset.name || pset.id || "Conjunto sem nome";
        lines.push(`- ${setName}`);

        if (pset.properties?.length) {
            pset.properties.forEach((prop) => {
                const key = prop.name || prop.id || "Propriedade";
                const value = formatIfcPropertyValue(prop.value);
                const propertyText = `  • ${key}: ${value}`;
                const wrappedLines = doc.splitTextToSize(propertyText, maxWidth);
                lines.push(...wrappedLines);
            });
        } else {
            lines.push("  • Nenhuma propriedade listada.");
        }
    });

    return lines;
}

function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}

function parseIfcMeasureLiteral(value) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    const match = normalized.match(/^([A-Z0-9_]+)\s*\(([-+]?\d+(?:[.,]\d+)?)\)$/i);
    if (!match) {
        return null;
    }

    const parsedValue = Number.parseFloat(match[2].replace(",", "."));
    if (!Number.isFinite(parsedValue)) {
        return null;
    }

    return {
        type: match[1].toUpperCase(),
        value: parsedValue
    };
}

function extractNumericPropertyValue(value) {
    if (isFiniteNumber(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsedMeasure = parseIfcMeasureLiteral(value);
        if (parsedMeasure) {
            return parsedMeasure.value;
        }

        const normalized = value.replace(",", ".").trim();
        const parsed = Number.parseFloat(normalized);
        if (Number.isFinite(parsed)) {
            return parsed;
        }

        const firstNumberMatch = normalized.match(/[-+]?\d+(?:\.\d+)?/);
        if (firstNumberMatch) {
            const firstNumber = Number.parseFloat(firstNumberMatch[0]);
            if (Number.isFinite(firstNumber)) {
                return firstNumber;
            }
        }

        return null;
    }

    if (value && typeof value === "object") {
        const candidates = [value.value, value.amount, value.nominalValue, value.rawValue];
        for (const candidate of candidates) {
            if (isFiniteNumber(candidate)) {
                return candidate;
            }
            if (typeof candidate === "string") {
                const parsedMeasure = parseIfcMeasureLiteral(candidate);
                if (parsedMeasure) {
                    return parsedMeasure.value;
                }

                const parsed = Number.parseFloat(candidate.replace(",", ".").trim());
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
    }

    return null;
}

function isIfcLengthMeasure(value) {
    if (!value) {
        return false;
    }

    if (typeof value === "string") {
        const parsedMeasure = parseIfcMeasureLiteral(value);
        return parsedMeasure ? parsedMeasure.type === "IFCLENGTHMEASURE" : value.toUpperCase().includes("IFCLENGTHMEASURE");
    }

    if (typeof value === "object") {
        const nestedValues = [value.value, value.amount, value.nominalValue, value.rawValue];
        for (const nestedValue of nestedValues) {
            if (typeof nestedValue === "string") {
                const parsedMeasure = parseIfcMeasureLiteral(nestedValue);
                if (parsedMeasure?.type === "IFCLENGTHMEASURE") {
                    return true;
                }
            }
        }

        const typeCandidates = [value.type, value.valueType, value.dataType, value.constructor?.name];
        return typeCandidates.some((candidate) =>
            typeof candidate === "string" && candidate.toUpperCase().includes("IFCLENGTHMEASURE")
        );
    }

    return false;
}

function normalizeMaterialDescription(value) {
    return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function loadExplicitLinearMaterialsFromExcel() {
    if (explicitLinearMaterialsLoadPromise) {
        return explicitLinearMaterialsLoadPromise;
    }

    explicitLinearMaterialsLoadPromise = (async () => {
        try {
            const associaRows = await loadAssociaUnitsFromExcel({ excelPath: "./base_de_dados.xlsx" });
            const linearDescriptions = associaRows
                .filter((row) => String(row.unidade || "").trim().toLowerCase() === "m")
                .map((row) => normalizeMaterialDescription(row.descricao));
            explicitLinearMaterials = new Set(linearDescriptions);
        } catch (error) {
            console.warn("Não foi possível carregar as unidades do Excel.", error);
        }
    })();

    return explicitLinearMaterialsLoadPromise;
}

function normalizeQuantityByIfcType(prop, numericValue) {
    if (numericValue === null) {
        return { quantity: null, unitLabel: "item(ns)" };
    }

    const normalizedName = normalizeMaterialDescription(prop?.name || prop?.id || "");

    const compactName = normalizedName.replace(/[^a-z0-9]/g, "");

    const linearMaterialKeywords = ["utp"];

    const linearMaterialCompactKeywords = ["cfoi"];

    const isLinearMaterial = linearMaterialKeywords
        .some((keyword) => normalizedName.includes(keyword));

    const isStructuredCableCategory = linearMaterialCompactKeywords
        .some((keyword) => compactName.includes(keyword));

    const isExplicitLinearMaterial = explicitLinearMaterials.has(normalizedName);

    if (isIfcLengthMeasure(prop?.value) || isLinearMaterial || isStructuredCableCategory || isExplicitLinearMaterial) {
        return {
            quantity: numericValue / 100, // converte de cm para metros
            unitLabel: "metro(s)"
        };
    }

    return {
        quantity: numericValue,
        unitLabel: "item(ns)"
    };
}

function formatMaterialQuantity(quantity) {
    if (!Number.isFinite(quantity)) {
        return "0";
    }

    if (Math.abs(quantity - Math.round(quantity)) < 1e-9) {
        return String(Math.round(quantity));
    }

    return quantity.toFixed(2).replace(/\.00$/, "");
}

function normalizeMaterialName(name) {
    return (name || "").trim().toLowerCase();
}

function normalizeMaterialComparisonText(value) {
    return normalizeSearchText(value).replace(/\s+/g, " ").trim();
}

function normalizeMaterialCompactText(value) {
    return normalizeMaterialComparisonText(value).replace(/[^a-z0-9]/g, "");
}

function materialNamesMatch(referenceName, candidateName) {
    const normalizedReference = normalizeMaterialComparisonText(referenceName);
    const normalizedCandidate = normalizeMaterialComparisonText(candidateName);

    if (!normalizedReference || !normalizedCandidate) {
        return false;
    }

    if (normalizedReference === normalizedCandidate) {
        return true;
    }

    const compactReference = normalizeMaterialCompactText(normalizedReference);
    const compactCandidate = normalizeMaterialCompactText(normalizedCandidate);

    if (compactReference && compactReference === compactCandidate) {
        return true;
    }

    if (compactReference.length >= 10 && compactCandidate.includes(compactReference)) {
        return true;
    }

    if (compactCandidate.length >= 10 && compactReference.includes(compactCandidate)) {
        return true;
    }

    return false;
}

function normalizeSearchText(value) {
    return (value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function isMaterialPropertySet(pset) {
    const normalizedSetName = normalizeSearchText(pset?.name || pset?.id || "");
    if (!normalizedSetName) {
        return false;
    }

    return [
        "itens_associados",
        "itens associados",
        "associated items",
        "materiais",
        "materials",
        "material"
    ].some((token) => normalizedSetName.includes(token));
}

function normalizeMaterialToken(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return normalizeMaterialName(value);
    }

    if (typeof value === "object") {
        const candidates = [value.value, value.amount, value.nominalValue, value.rawValue, value.label, value.name];
        for (const candidate of candidates) {
            if (typeof candidate === "string") {
                return normalizeMaterialName(candidate);
            }
        }
    }

    return "";
}

function getActiveObjectIdSet() {
    const scene = viewer?.scene;
    const visibleIds = toArraySafe(scene?.visibleObjectIds);
    if (visibleIds.length) {
        return new Set(visibleIds);
    }

    return new Set(getAllObjectIds());
}

function findMaterialObjectIds(materialName, { activeOnly = true } = {}) {
    const targetName = normalizeMaterialName(materialName);
    if (!targetName) {
        return [];
    }

    const allMetaObjects = viewer.metaScene?.metaObjects || {};
    const ids = [];
    const activeIds = activeOnly ? getActiveObjectIdSet() : null;

    for (const metaObject of Object.values(allMetaObjects)) {
        if (activeIds && metaObject?.id && !activeIds.has(metaObject.id)) {
            continue;
        }
        const propertySets = metaObject?.propertySets;
        if (!Array.isArray(propertySets)) {
            continue;
        }

        let hasMaterial = false;
        for (const pset of propertySets) {
            if (!Array.isArray(pset?.properties)) {
                continue;
            }

            if (!isMaterialPropertySet(pset)) {
                continue;
            }


            for (const prop of pset.properties) {
                const name = (prop?.name || prop?.id || "").trim();
                if (!name) {
                    continue;
                }

                const normalizedValue = normalizeMaterialToken(prop?.value);

                if (materialNamesMatch(targetName, name) || materialNamesMatch(targetName, normalizedValue)) {
                    hasMaterial = true;
                    break;
                }
            }

            if (hasMaterial) {
                break;
            }
        }

        if (hasMaterial && metaObject.id) {
            ids.push(metaObject.id);
        }
    }

    return ids;
}

function updateMaterialsActiveItem() {
    if (!materialsResultsList) {
        return;
    }

    Array.from(materialsResultsList.children).forEach((item) => {
        if (!(item instanceof HTMLElement)) {
            return;
        }

        const itemName = item.dataset.materialName;
        item.classList.toggle("is-active", Boolean(activeMaterialFilter && itemName === activeMaterialFilter));
    });
}

function clearMaterialIsolation() {
    activeMaterialFilter = null;
    activeWebBudgetSelection = null;
    resetModelVisibility();
    updateMaterialsActiveItem();
    resetMaterialsIdsPanel();
}

function isolateMaterialByName(materialName) {
    if (!modelIsolateController) {
        return;
    }

    const idsToFocus = findMaterialObjectIds(materialName);
    if (!idsToFocus.length) {
        return;
    }

    const allIds = getAllObjectIds();
    const otherIds = allIds.filter((id) => !idsToFocus.includes(id));

    modelIsolateController.setObjectsVisible(allIds, true);
    modelIsolateController.setObjectsXRayed(allIds, true);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    modelIsolateController.setObjectsVisible(idsToFocus, true);
    modelIsolateController.setObjectsXRayed(idsToFocus, false);
    viewer.scene.setObjectsHighlighted(idsToFocus, true);

    if (otherIds.length) {
        modelIsolateController.setObjectsHighlighted(otherIds, false);
    }

    const combinedAABB = mergeAABBs(idsToFocus.map((id) => viewer.scene.getAABB(id)));
    if (combinedAABB) {
        viewer.cameraFlight.flyTo({ aabb: combinedAABB, duration: 0.6 });
    }

    requestRenderFrame();
}

function isolateMaterialsByNames(materialNames, { modelId = null } = {}) {
    if (!Array.isArray(materialNames) || !materialNames.length) {
        return;
    }

    const idsToFocus = Array.from(new Set(materialNames
        .flatMap((materialName) => findMaterialObjectIds(materialName, { activeOnly: false }))
        .filter((id) => !modelId || getObjectMetaModelId(id) === modelId)));
    if (!idsToFocus.length) {
        return;
    }

    const allIds = getAllObjectIds();
    const otherIds = allIds.filter((id) => !idsToFocus.includes(id));

    modelIsolateController.setObjectsVisible(allIds, true);
    modelIsolateController.setObjectsXRayed(allIds, true);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    modelIsolateController.setObjectsVisible(idsToFocus, true);
    modelIsolateController.setObjectsXRayed(idsToFocus, false);
    viewer.scene.setObjectsHighlighted(idsToFocus, true);

    if (otherIds.length) {
        modelIsolateController.setObjectsHighlighted(otherIds, false);
    }

    const combinedAABB = mergeAABBs(idsToFocus.map((id) => viewer.scene.getAABB(id)));
    if (combinedAABB) {
        viewer.cameraFlight.flyTo({ aabb: combinedAABB, duration: 0.6 });
    }

    requestRenderFrame();
}

function isolateAssociatedItemsByName(materialName) {
    if (!modelIsolateController) {
        return;
    }

    const idsToFocus = findMaterialObjectIds(materialName);
    if (!idsToFocus.length) {
        return;
    }

    const allIds = getAllObjectIds();
    const otherIds = allIds.filter((id) => !idsToFocus.includes(id));

    modelIsolateController.setObjectsVisible(allIds, false);
    modelIsolateController.setObjectsXRayed(allIds, false);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    modelIsolateController.setObjectsVisible(idsToFocus, true);
    modelIsolateController.setObjectsHighlighted(idsToFocus, true);

    if (otherIds.length) {
        modelIsolateController.setObjectsHighlighted(otherIds, false);
    }

    const combinedAABB = mergeAABBs(idsToFocus.map((id) => viewer.scene.getAABB(id)));
    if (combinedAABB) {
        viewer.cameraFlight.flyTo({ aabb: combinedAABB, duration: 0.6 });
    }

    requestRenderFrame();
}

function isolateAssociatedItemsByNames(materialNames, { modelId = null } = {}) {
    if (!modelIsolateController || !Array.isArray(materialNames) || !materialNames.length) {
        return false;
    }

    const idsToFocus = Array.from(new Set(materialNames
        .flatMap((materialName) => findMaterialObjectIds(materialName, { activeOnly: false }))
        .filter((id) => !modelId || getObjectMetaModelId(id) === modelId)));

    if (!idsToFocus.length) {
        return false;
    }

    const allIds = getAllObjectIds();
    const otherIds = allIds.filter((id) => !idsToFocus.includes(id));

    modelIsolateController.setObjectsVisible(allIds, false);
    modelIsolateController.setObjectsXRayed(allIds, false);
    modelIsolateController.setObjectsHighlighted(allIds, false);

    modelIsolateController.setObjectsVisible(idsToFocus, true);
    modelIsolateController.setObjectsHighlighted(idsToFocus, true);

    if (otherIds.length) {
        modelIsolateController.setObjectsHighlighted(otherIds, false);
    }

    const combinedAABB = mergeAABBs(idsToFocus.map((id) => viewer.scene.getAABB(id)));
    if (combinedAABB) {
        viewer.cameraFlight.flyTo({ aabb: combinedAABB, duration: 0.6 });
    }

    requestRenderFrame();
    return true;
}

function isolateActiveWebBudgetSelection() {
    if (!activeWebBudgetSelection) {
        return false;
    }

    return isolateAssociatedItemsByNames(activeWebBudgetSelection.materialNames, {
        modelId: activeWebBudgetSelection.modelId
    });
}

function collectQuantitativeMaterials() {
    const totals = new Map();
    const allMetaObjects = viewer.metaScene?.metaObjects || {};
    const activeIds = getActiveObjectIdSet();

    for (const metaObject of Object.values(allMetaObjects)) {
        if (metaObject?.id && !activeIds.has(metaObject.id)) {
            continue;
        }
        const propertySets = metaObject?.propertySets;
        if (!Array.isArray(propertySets)) {
            continue;
        }

        for (const pset of propertySets) {
            if (!Array.isArray(pset?.properties)) {
                continue;
            }

            if (!isMaterialPropertySet(pset)) {
                continue;
            }

            for (const prop of pset.properties) {
                const name = (prop?.name || prop?.id || "").trim();
                if (!name) {
                    continue;
                }

                const numericValue = extractNumericPropertyValue(prop?.value);
                const normalized = normalizeQuantityByIfcType(prop, numericValue);

                if (normalized.quantity === null) {
                    continue;
                }

                if (normalized.quantity <= 0) {
                    continue;
                }

                const aggregationKey = `${name}__${normalized.unitLabel}`;
                const current = totals.get(aggregationKey) || {
                    name,
                    quantity: 0,
                    unitLabel: normalized.unitLabel,
                    quantityByModel: new Map()
                };

                current.quantity += normalized.quantity;

                const modelId = metaObject?.metaModel?.id || null;
                if (modelId) {
                    const previous = current.quantityByModel.get(modelId) || 0;
                    current.quantityByModel.set(modelId, previous + normalized.quantity);
                }

                totals.set(aggregationKey, current);
            }
        }
    }

    return Array.from(totals.values())
        .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, "pt-BR"));
}

function renderMaterialsResults(items, options = {}) {
    if (!materialsSummary || !materialsResultsList) {
        return;
    }

    const totalCount = Number.isFinite(options.totalCount) ? options.totalCount : items.length;
    const query = options.query || "";

    if (!items.length) {
        lastMaterialsResults = [];
        updateMaterialsDownloadButton();
        if (totalCount > 0 && query) {
            materialsSummary.textContent = `Nenhum material encontrado para "${query}".`;
        } else {
            materialsSummary.textContent = "Nenhuma propriedade quantitativa encontrada nos modelos carregados.";
        }
        materialsResultsList.innerHTML = "";
        resetMaterialsIdsPanel();
        return;
    }

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const allInMeters = items.length > 0 && items.every((item) => item.unitLabel === "metro(s)");
    const totalUnit = allInMeters ? "metro(s)" : "item(ns)";
    const baseSummary = `${items.length} material(is) consolidado(s)`;
    const filterHint = query && totalCount !== items.length ? ` de ${totalCount} (filtro: "${query}")` : "";
    materialsSummary.textContent = `${baseSummary}${filterHint}. Clique em um material para isolar no modelo (clique novamente para limpar).`;
    lastMaterialsResults = items;
    updateMaterialsDownloadButton()

    materialsResultsList.innerHTML = "";

    items.forEach((item) => {
        const li = document.createElement("li");
        li.className = "materials-result-item";
        li.dataset.materialName = item.name;
        li.setAttribute("role", "button");
        li.setAttribute("tabindex", "0");
        li.setAttribute("title", "Clique para isolar os elementos com este material");
        li.innerHTML = `
            <span class="materials-result-name">${item.name}</span>
            <span class="materials-result-quantity">${formatMaterialQuantity(item.quantity)} ${item.unitLabel}</span>
        `;
        const handleMaterialClick = () => {
            if (activeMaterialFilter === item.name) {
                clearMaterialIsolation();
                return;
            }

            activeMaterialFilter = item.name;
            isolateMaterialByName(item.name);
            updateMaterialsActiveItem();
            if (materialsIdsPanel && !materialsIdsPanel.hidden) {
                renderMaterialsIdsList(item.name);
            }
        };
        li.addEventListener("click", handleMaterialClick);
        li.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleMaterialClick();
            }
        });
        materialsResultsList.appendChild(li);
    });

    updateMaterialsActiveItem();
}

function generateAndRenderMaterialsList() {
    const items = collectQuantitativeMaterials();
    materialsAllResults = items;
    materialsSearchQuery = "";
    if (materialsSearchInput) {
        materialsSearchInput.value = "";
    }
    renderMaterialsResults(items, { totalCount: items.length, query: "" });
}

async function applyMaterialsSearch({ skipAssociationsLoad = false } = {}) {
    if (!materialsSummary || !materialsResultsList) {
        return;
    }

    if (!skipAssociationsLoad) {
        try {
            await ensureBudgetAssociationsLoaded();
        } catch (error) {
            console.warn("Não foi possível carregar as associações para pesquisa por código.", error);
        }
    }

    const rawQuery = materialsSearchInput?.value || "";
    const normalizedQuery = normalizeSearchText(rawQuery);
    materialsSearchQuery = rawQuery;

    let filteredItems = normalizedQuery
        ? materialsAllResults.filter((item) => normalizeSearchText(item.name).includes(normalizedQuery))
        : materialsAllResults;

    if (normalizedQuery) {
        const associatedMaterials = getAssociatedMaterialsByBudgetReference({ code: rawQuery, description: rawQuery });
        if (associatedMaterials.length) {
            filteredItems = materialsAllResults.filter((item) =>
                associatedMaterials.some((associatedName) => materialNamesMatch(associatedName, item.name))
            );
        }
    }

    if (activeMaterialFilter && !filteredItems.some((item) => item.name === activeMaterialFilter)) {
        clearMaterialIsolation();
    }

    renderMaterialsResults(filteredItems, { totalCount: materialsAllResults.length, query: rawQuery.trim() });
}

function getCollisionPosition(objectId) {
    const aabb = viewer.scene.getAABB(objectId);

    if (!aabb) {
        return null;
    }

    const center = [
        (aabb[0] + aabb[3]) / 2,
        (aabb[1] + aabb[4]) / 2,
        (aabb[2] + aabb[5]) / 2
    ];

    return center.map((value) => Number.isFinite(value) ? Number(value.toFixed(3)) : 0);
}

async function downloadCollisionsAsPdf() {

    if (!lastCollisionResults.length) {
        return;
    }

    // ✅ compressão do PDF
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

    const snapshots = await captureSnapshotsForCollisions(lastCollisionResults);

    doc.setFontSize(16);
    doc.text("Relatório de colisões", 14, 20);

    doc.setFontSize(12);
    doc.text(`Modelo analisado: ${lastCollisionModelId ?? "-"}`, 14, 30);
    doc.text(`Total de colisões: ${lastCollisionResults.length}`, 14, 38);

    let cursorY = 50;

    const leftMargin = 14;
    const topMargin = 20;
    const maxWidth = 180;
    const lineHeight = 5;
    const spacingAfterItem = 6;

    // Altura útil aproximada no A4 (em mm)
    const pageHeightLimit = 280;

    // ✅ imagem MAIOR no PDF (mm) sem aumentar o peso (px)
    const defaultImageWidth = 140; // 120~160 fica ótimo

    lastCollisionResults.forEach(({ objectId, collidingWith }, index) => {
        const titleText = `${index + 1}. Objeto ${objectId}`;
        const description = `Colide com: ${collidingWith.join(", ")}`;
        const snapshot = snapshots[index];

        const imageAspect = snapshot?.aspect || 1.6;
        const imageHeight = snapshot?.dataUrl ? defaultImageWidth / imageAspect : 0;

        const descriptionLines = doc.splitTextToSize(description, maxWidth);
        const propertyLines = buildIfcPropertiesLines(doc, objectId, maxWidth);

        const itemHeight =
            lineHeight +
            descriptionLines.length * lineHeight +
            propertyLines.length * lineHeight +
            (snapshot?.dataUrl && propertyLines.length ? spacingAfterItem : 0) +
            (snapshot?.dataUrl ? imageHeight : 0) +
            spacingAfterItem;

        // Quebra de página
        if (cursorY + itemHeight > pageHeightLimit) {
            doc.addPage();
            cursorY = topMargin;

            // opcional: repetir cabeçalho (se quiser, descomente)
            // doc.setFontSize(10);
            // doc.text(`Relatório de colisões - Modelo: ${lastCollisionModelId ?? "-"}`, leftMargin, 12);
        }
        doc.setFontSize(12);
        doc.text(titleText, leftMargin, cursorY);
        cursorY += lineHeight;

        doc.setFontSize(10);
        doc.text(descriptionLines, leftMargin, cursorY, { maxWidth });
        cursorY += descriptionLines.length * lineHeight;

        if (propertyLines.length) {
            doc.text(propertyLines, leftMargin, cursorY, { maxWidth });
            cursorY += propertyLines.length * lineHeight;

            if (snapshot?.dataUrl) {
                cursorY += spacingAfterItem;
            }
        }

        if (snapshot?.dataUrl) {
            // ✅ JPEG + FAST (mais leve e rápido)
            doc.addImage(
                snapshot.dataUrl,
                "JPEG",
                leftMargin,
                cursorY,
                defaultImageWidth,
                imageHeight,
                undefined,
                "FAST"
            );
            cursorY += imageHeight;
        }

        cursorY += spacingAfterItem;
    });

    // Bloco final com resumo estruturado das colisões
    const structuredSummary = lastCollisionResults.map(({ objectId, collidingWith }, index) => {
        const position = getCollisionPosition(objectId);
        const positionText = position ? `[${position.join(", ")}]` : "[]";
        const collisionsText = collidingWith.join(", ");

        return `{ id: "P${index + 1}", position: ${positionText}, code: "${objectId}", collision: "${collisionsText}" },`;
    });

    doc.addPage();
    doc.setFontSize(12);
    doc.text("Resumo de colisões (formato estruturado)", leftMargin, topMargin);
    doc.setFontSize(10);
    doc.text(structuredSummary, leftMargin, topMargin + lineHeight, { maxWidth });

    doc.save("colisoes.pdf");
}

function renderCollisionResults(collisions) {
    collisionResultsList.innerHTML = "";
    clearCollisionSelection();

    if (!collisions.length) {
        const emptyItem = document.createElement("li");
        emptyItem.textContent = "Nenhuma colisão encontrada.";
        emptyItem.classList.add("collision-summary");
        collisionResultsList.appendChild(emptyItem);
        return;
    }

    collisions.forEach(({ objectId, collidingWith }, index) => {
        const item = document.createElement("li");
        item.classList.add("collision-result-item");
        item.dataset.collisionId = objectId;
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.setAttribute("title", "Clique para selecionar a colisão");

        const title = document.createElement("div");
        title.classList.add("collision-result-title");
        title.textContent = `#${index + 1}: Objeto ${objectId}`;

        const list = document.createElement("div");
        list.classList.add("collision-result-list");
        list.textContent = "Colisão detectada com outro modelo.";

        const actions = document.createElement("div");
        actions.classList.add("collision-result-actions");

        const focusBtn = document.createElement("button");
        focusBtn.type = "button";
        focusBtn.textContent = "Isolar colisão";
        focusBtn.classList.add("collision-focus-btn");
        focusBtn.addEventListener("click", () => {
            setActiveCollisionSelection(objectId, collidingWith);
            isolateCollisionGroup(objectId, collidingWith);
        });

        const handleCollisionSelect = () => {
            setActiveCollisionSelection(objectId, collidingWith);
        };

        item.addEventListener("click", handleCollisionSelect);
        item.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleCollisionSelect();
            }
        });

        actions.appendChild(focusBtn);
        item.append(title, list, actions);
        collisionResultsList.appendChild(item);
    });
}

function findAndRenderCollisions(modelId) {
    normalizeCollisionRadiusInput();

    if (!modelId) {
        collisionSummary.textContent = "Selecione um modelo para iniciar a análise.";
        collisionResultsList.innerHTML = "";
        setCollisionState([], null);
        return;
    }

    const activeIds = getActiveObjectIdSet();
    const objects = getModelObjectIds(modelId).filter((id) => activeIds.has(id));
    const targetIds = new Set(objects);
    const externalObjects = getAllObjectIds().filter((id) =>
        activeIds.has(id) && !targetIds.has(id) && getObjectMetaModelId(id) !== modelId);

    if (!objects.length) {
        collisionSummary.textContent = "Nenhum objeto ativo encontrado no modelo selecionado.";
        collisionResultsList.innerHTML = "";
        setCollisionState([], null);
        return;
    }

    if (!externalObjects.length) {
        collisionSummary.textContent = "Nenhum outro objeto ativo em modelos diferentes para comparar colisões.";
        collisionResultsList.innerHTML = "";
        setCollisionState([], null);
        return;
    }

    const collisionsMap = new Map();

    const addCollision = (base, target) => {
        if (!collisionsMap.has(base)) {
            collisionsMap.set(base, new Set());
        }
        collisionsMap.get(base).add(target);
    };
    
    const overlapTolerance = getCollisionRadiusMeters();

    for (let i = 0; i < objects.length; i++) {
        const objectA = objects[i];
        const aabbA = viewer.scene.getAABB(objectA);

        if (!aabbA) {
            continue;
        }

        for (let j = 0; j < externalObjects.length; j++) {
            const objectB = externalObjects[j];
            const aabbB = viewer.scene.getAABB(objectB);

            if (aabbB && intersectsAABB(aabbA, aabbB, overlapTolerance)) {
                addCollision(objectA, objectB);
            }
        }
    }

    const collisions = Array.from(collisionsMap.entries()).map(([objectId, set]) => ({
        objectId,
        collidingWith: Array.from(set)
    }));

    collisionSummary.textContent = buildCollisionSummary(collisions.length, overlapTolerance);
    setCollisionState(collisions, modelId);
    renderCollisionResults(collisions);
}

document.addEventListener("keydown", (event) => {
    const key = event.key?.toLowerCase();

    // Evita atalhos quando o usuário está digitando em inputs ou textareas
    const isTyping = ["INPUT", "TEXTAREA"].includes(event.target?.nodeName) || event.target?.isContentEditable;
    if (isTyping && key !== "escape") {
        return;
    }

    if (key === "escape") {
        setMeasurementMode("none");
        closePropertyPanel();
        closePanelsOnEscape();
        return;
    }

    if (key === "z" && materialsPanel && !materialsPanel.hidden) {
        event.preventDefault();
        openWebBudgetPanel();
        return;
    }
    
    if (key === "r") {
        resetXRay();
        return;
    }

    if (key === "m") {
        showAllEntities();
        return;
    }

    if (key === "l") {
        if (materialsPanel) {
            materialsPanel.hidden = false;
            materialsPanelToggleButton?.classList.add("active");
            generateAndRenderMaterialsList();
        }
        return;
    }
    if (key === "t") {
        if (materialsPanel) {
            materialsPanel.hidden = false;
            materialsPanelToggleButton?.classList.add("active");
        }
        renderMaterialsIdsList(activeMaterialFilter);
        return;
    }
     if (key === "k") {
        if (activeMaterialFilter) {
            isolateAssociatedItemsByName(activeMaterialFilter);
            updateMaterialsActiveItem();
        }
        return;
    }

    if (key === "7") {
        if (isolateActiveWebBudgetSelection()) {
            const { modelId, descricao } = activeWebBudgetSelection;
            if (webBudgetSummary) {
                webBudgetSummary.textContent = `${formatModelLabel(modelId)} · ${descricao}: isolamento por modelo XKT aplicado.`;
            }
        }
        return;
    }

    if (key === rotationShortcutKey) {
        const selectedSourceId = resolveRotationTargetId();
       
        if (!selectedSourceId) {
            setSearchStatus("Selecione uma peça (duplo clique), deixe o cursor sobre ela ou informe o ID na busca antes de usar o atalho J.", true);
            return;
        }

        rotateEntityWithCloneAlias(selectedSourceId);
        return;
    }
    // Atalhos de entidade: requerem uma seleção prévia (duplo clique)
    if (!lastSelectedEntity) {
        return;
    }
    // Atalhos de entidade: requerem uma seleção prévia (duplo clique)
    if (!lastSelectedEntity) {
        return;
    }

    if (key === "i") {
        isolateEntity(lastSelectedEntity);
    } else if (key === "p") {
        showMaterialProperties(lastSelectedEntity);
    } else if (key === "o" && activeProjectKey !== "esc_canaa") {
        hideEntity(lastSelectedEntity);
    }
});

if (budgetPanelToggleButton) {
    budgetPanelToggleButton.addEventListener("click", () => {
        if (budgetPanel?.hidden) {
            openProjectBudget();
            return;
        }

        hideBudgetPanel();
    });
}

closeBudgetPanelButton?.addEventListener("click", () => {
    hideBudgetPanel();
});
// -----------------------------------------------------------------------------
// 4. Menu de Contexto (Deletar Medição) (MANTIDO)
// -----------------------------------------------------------------------------

const contextMenu = new ContextMenu({
    items: [
        [
            {
                title: "Deletar Medição",
                doAction: function (context) {
                    context.measurement.destroy();
                }
            }
        ]
    ]
});

function setupMeasurementEvents(plugin) {
    plugin.on("contextMenu", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        contextMenu.context = { measurement: measurement };
        contextMenu.show(e.event.clientX, e.event.clientY);
        e.event.preventDefault();
    });

    plugin.on("mouseOver", (e) => {
        (e.angleMeasurement || e.distanceMeasurement).setHighlighted(true);
    });

    plugin.on("mouseLeave", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        if (!contextMenu.shown || contextMenu.context.measurement.id !== measurement.id) {
            measurement.setHighlighted(false);
        }
    });
}

setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);

// -----------------------------------------------------------------------------
// 5. Cubo de Navegação (NavCube) (MANTIDO)
// -----------------------------------------------------------------------------

if (viewerCompatibility.enableNavCube) {
    new NavCubePlugin(viewer, {
        canvasId: "myNavCubeCanvas",
        visible: true,
        size: 150,
        alignment: "bottomRight",
        bottomMargin: 20,
        rightMargin: 20
    });
} else {
    const navCubeCanvas = document.getElementById("myNavCubeCanvas");

    if (navCubeCanvas) {
        navCubeCanvas.style.display = "none";
    }
}

// -----------------------------------------------------------------------------
// 6. TreeViewPlugin e Lógica de Isolamento (MANTIDO)
// -----------------------------------------------------------------------------

function setupModelIsolateController() {

    if (!treeViewContainer) {
        return;
    }

    treeView = new TreeViewPlugin(viewer, {
        containerElement: treeViewContent ?? treeViewContainer,
        hierarchy: "containment",
        autoExpandDepth: 0
    });

    setupTreeViewFilter();
    setupTreeViewSelectionControls();

    modelIsolateController = viewer.scene;

    // Ouve o evento de "seleção" no TreeView
    treeView.on("nodeClicked", (event) => {
        const entityId = event.entityId;
        const metaObject = resolveMetaObject(entityId);

        if (metaObject?.type === "IfcBuildingStorey" && isolateStorey(metaObject.id)) {
            return;
        }
        // Verifica se há alguma entidade associada ao nó
        if (entityId && viewer.scene.getObjectsInSubtree(entityId).length > 0) {
            
            const subtreeIds = viewer.scene.getObjectsInSubtree(entityId);

            // Mantém o comportamento existente para nós que não são pavimentos.
            modelIsolateController.setObjectsXRayed(getAllObjectIds(), true);
            modelIsolateController.setObjectsXRayed(subtreeIds, false);
            modelIsolateController.isolate(subtreeIds);

            viewer.cameraFlight.flyTo({
                aabb: viewer.scene.getAABB(entityId),
                duration: 0.5
            });
            
            clearSelection();

        } else {
            // Se o usuário clicar em um nó que não contém objetos (como o nó raiz do projeto ou um item folha)
            // Apenas reseta a visibilidade.
            resetModelVisibility();
        }
    });
}

function setupTreeViewFilter() {
    const container = treeViewContent ?? treeViewContainer;

    if (!container) {
        return;
    }

    const getRootTitle = (item) => {
        let current = item;
        let parent = current.parentElement?.closest(".xeokit-tree-view-item");

        while (parent) {
            current = parent;
            parent = current.parentElement?.closest(".xeokit-tree-view-item");
        }

        return current
            ?.querySelector(".xeokit-tree-view-item-title")
            ?.textContent?.trim();
    };

    const applyFilter = () => {
        const items = Array.from(container.querySelectorAll(".xeokit-tree-view-item"));
        if (items.length === 0) {
            return;
        }
        const buildingItems = items.filter((item) => {
            const titleEl = item.querySelector(".xeokit-tree-view-item-title");
            return titleEl?.textContent?.trim() === "IfcBuilding";
        });

        if (buildingItems.length === 0) {
            return;
        }

        const allowedItems = new Set();

        const allowWithAncestorsAndDescendants = (item) => {
            let current = item;
            while (current && current.classList?.contains("xeokit-tree-view-item")) {
                allowedItems.add(current);
                current = current.parentElement?.closest(".xeokit-tree-view-item");
            }

            item.querySelectorAll(".xeokit-tree-view-item").forEach((child) => {
                allowedItems.add(child);
            });
        };

        buildingItems.forEach((item) => {
            allowWithAncestorsAndDescendants(item);

            const buildingTitleEl = item.querySelector(".xeokit-tree-view-item-title");
            const rootTitle = getRootTitle(item);

            if (buildingTitleEl && rootTitle) {
                buildingTitleEl.textContent = rootTitle;
            }
        });

        items.forEach((item) => {
            const shouldShow = allowedItems.has(item);
            const titleText = item
                .querySelector(".xeokit-tree-view-item-title")
                ?.textContent?.trim();
            const rootTitle = getRootTitle(item);

            const hideIFCARQStorey =
                rootTitle === "IFC_ARQ" && titleText === "IfcBuildingStorey";

            item.style.display = shouldShow && !hideIFCARQStorey ? "" : "none";
        });
    };
    const observer = new MutationObserver(applyFilter);
    observer.observe(container, { childList: true, subtree: true });

    applyFilter();

    container.dataset.treeFilterAttached = "true";
}

function setupTreeViewSelectionControls() {
    if (!toggleTreeViewSelectionButton) {
        return;
    }

    const container = treeViewContent ?? treeViewContainer;

    if (!container) {
        return;
    }

    const getCheckboxes = () => {
        const treeRoot = container.classList.contains("xeokit-tree-view")
            ? container
            : container.querySelector(".xeokit-tree-view") ?? container;

        return Array.from(treeRoot.querySelectorAll("input[type=\"checkbox\"]"));
    };

    let architectureDefaultApplied = false;

    const uncheckArchitectureByDefault = () => {
        if (architectureDefaultApplied) {
            return;
        }

        const architectureCheckbox = getCheckboxes().find((checkbox) => {
            const item = checkbox.closest(".xeokit-tree-view-item");
            const title = item
                ?.querySelector(".xeokit-tree-view-item-title")
                ?.textContent
                ?.trim();

            return title === "IFC_ARQ";
        });

        if (!architectureCheckbox) {
            return;
        }

        if (architectureCheckbox.checked) {
            architectureCheckbox.click();
        }

        architectureDefaultApplied = true;
    };

    const updateButtonLabel = () => {
        const checkboxes = getCheckboxes();
        const hasItems = checkboxes.length > 0;
        const allChecked = hasItems && checkboxes.every((checkbox) => checkbox.checked);

        toggleTreeViewSelectionButton.disabled = !hasItems;
        toggleTreeViewSelectionButton.textContent = allChecked ? "Deselecionar todos" : "Selecionar todos";
    };

    const toggleAllSelections = () => {
        const checkboxes = getCheckboxes();
        if (checkboxes.length === 0) {
            return;
        }

        const shouldCheck = !checkboxes.every((checkbox) => checkbox.checked);
        checkboxes.forEach((checkbox) => {
            if (checkbox.checked !== shouldCheck) {
                checkbox.click();
            }
        });

        updateButtonLabel();
    };

    toggleTreeViewSelectionButton.addEventListener("click", toggleAllSelections);

    container.addEventListener("change", (event) => {
        if (event.target?.matches("input[type=\"checkbox\"]")) {
            updateButtonLabel();
        }
    });

    uncheckArchitectureByDefault();
    updateButtonLabel();

    const selectionObserver = new MutationObserver(() => {
        uncheckArchitectureByDefault();
        updateButtonLabel();
    });
    selectionObserver.observe(container, { childList: true, subtree: true });
}
/**
 * Alterna a visibilidade do contêiner do TreeView sem alterar o estado atual de visibilidade.
 */
function toggleTreeView(button) {
    if (!treeViewContainer) {
        return;
    }

    if (treeViewContainer.style.display === 'block') {
        treeViewContainer.style.display = 'none';
        button?.classList.remove('active');
    } else {
        treeViewContainer.style.display = 'block';
        button?.classList.add('active');
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.toggleTreeView = toggleTreeView;
window.resetModelVisibility = resetModelVisibility;

closeTreeViewButton?.addEventListener("click", () => {
    toggleTreeView(toggleTreeViewButton);
});

// -----------------------------------------------------------------------------
// 7. Plano de Corte (Section Plane) - VERSÃO ESTÁVEL (MANTIDO)
// -----------------------------------------------------------------------------
// ... setupSectionPlane (função que não é mais usada, mas mantida por segurança) ...

function toggleSectionPlane(button) {
    const scene = viewer.scene;

    if (!sectionPlanesPlugin) {
        sectionPlanesPlugin = new SectionPlanesPlugin(viewer);
    }

    // --- DESATIVAR ---
    if (sectionPlaneEnabled) {
        sectionPlaneEnabled = false;

        if (horizontalSectionPlane) {
            horizontalSectionPlane.active = false;

            if (horizontalSectionPlane.control) {
                try {
                    viewer.input.removeCanvasElement(horizontalSectionPlane.control.canvas);
                } catch (e) {}

                horizontalSectionPlane.control.destroy();
                horizontalSectionPlane.control = null;
            }

            // Remove o plano para que o gizmo e a geometria desapareçam
            horizontalSectionPlane.destroy();
            horizontalSectionPlane = null;
        }

        scene.sectionPlanes.active = false;
        
        // alguns builds deixam o gizmo em viewer.input._activeCanvasElements
        if (viewer.input && viewer.input._activeCanvasElements) {
            viewer.input._activeCanvasElements.clear?.();
        }

        viewer.scene.render(); // força re-render
        button.classList.remove("active");
        viewer.cameraFlight.flyTo(scene);
        return;
    }

    // --- ATIVAR ---
    const aabb = scene.getAABB();
    const modelCenterY = (aabb[1] + aabb[4]) / 2;

    if (!horizontalSectionPlane) {
        horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
            id: "horizontalPlane",
            pos: [0, modelCenterY, 0],
            dir: [0, -1, 0],
            active: true
        });
    } else {
        horizontalSectionPlane.pos = [0, modelCenterY, 0];
        horizontalSectionPlane.dir = [0, -1, 0];
        horizontalSectionPlane.active = true;
    }

    scene.sectionPlanes.active = true;
    sectionPlaneEnabled = true;

    if (horizontalSectionPlane.control) {
        try {
            viewer.input.removeCanvasElement(horizontalSectionPlane.control.canvas);
        } catch (e) {}

        horizontalSectionPlane.control.destroy();
        horizontalSectionPlane.control = null;
    }

    horizontalSectionPlane.control = sectionPlanesPlugin.showControl(horizontalSectionPlane.id);

    button.classList.add("active");

    viewer.cameraFlight.flyTo({
        aabb: scene.aabb,
        duration: 0.5
    });
}

window.toggleSectionPlane = toggleSectionPlane;

// -----------------------------------------------------------------------------
// 8. Destaque de Entidades ao Passar o Mouse (Hover Highlight)
// -----------------------------------------------------------------------------

let lastEntity = null;

// Monitora o movimento do mouse sobre o canvas
viewer.scene.input.on("mousemove", function (coords) {
    
    const hit = viewer.scene.pick({
        canvasPos: coords
    });

    if (hit && hit.entity && hit.entity.isObject) {

        // Se for um novo objeto, troca o destaque
        if (!lastEntity || hit.entity.id !== lastEntity.id) {

            if (lastEntity) {
                lastEntity.highlighted = false;
            }

            lastEntity = hit.entity;
            hit.entity.highlighted = true;
        }

    } else {
        // Saiu de qualquer entidade: remove o highlight
        if (lastEntity) {
            lastEntity.highlighted = false;
            lastEntity = null;
        }
    }
});

// -----------------------------------------------------------------------------
// 8.1 Seleção por Duplo Clique
// -----------------------------------------------------------------------------

viewer.cameraControl.on("doublePicked", (pickResult) => {
    const entity = pickResult?.entity;

    if (entity && entity.isObject) {
        selectEntity(entity);
    }
});

viewer.cameraControl.on("doublePickedNothing", () => {
    clearSelection();
});

// -----------------------------------------------------------------------------
// 9. Menu de Contexto (Propriedades + Visibilidade + X-Ray) - VERSÃO FINAL
// -----------------------------------------------------------------------------

// Desabilita o pan com o botão direito (para permitir o menu)
viewer.cameraControl.panRightClick = false;

function resetXRay() {
    const scene = viewer.scene;

    if (!scene || scene.numXRayedObjects === 0) {
        return;
    }

    scene.setObjectsXRayed(scene.xrayedObjectIds, false);
}

function hideEntity(entity) {
    if (!entity?.isObject) {
        return;
    }

    entity.visible = false;
}

function collectEntityMaterialTokens(entity) {
    const metaObject = resolveMetaObject(entity?.id);
    if (!metaObject?.propertySets?.length) {
        return [];
    }

    const ignoredTokens = new Set([
        "material",
        "materials",
        "materiais",
        "itens associados",
        "itens_associados",
        "associated items"
    ]);

    const tokens = new Set();

    for (const pset of metaObject.propertySets) {
        if (!isMaterialPropertySet(pset) || !Array.isArray(pset?.properties)) {
            continue;
        }

        for (const prop of pset.properties) {
            const normalizedName = normalizeMaterialName(prop?.name || prop?.id || "");
            const normalizedValue = normalizeMaterialToken(prop?.value);

            if (normalizedName && !ignoredTokens.has(normalizedName)) {
                tokens.add(normalizedName);
            }

            if (normalizedValue && !ignoredTokens.has(normalizedValue)) {
                tokens.add(normalizedValue);
            }
        }
    }

    return Array.from(tokens);
}

function hideSimilarEntities(entity) {
    const scene = viewer.scene;

    if (!scene || !entity?.isObject) {
        return;
    }

    const visibleIds = new Set(toArraySafe(scene.visibleObjectIds));
    const tokens = collectEntityMaterialTokens(entity);
    const idsToHide = new Set();

    for (const token of tokens) {
        const matchingIds = findMaterialObjectIds(token, { activeOnly: false });
        for (const id of matchingIds) {
            if (visibleIds.has(id)) {
                idsToHide.add(id);
            }
        }
    }

    if (entity.id && visibleIds.has(entity.id)) {
        idsToHide.add(entity.id);
    }

    if (!idsToHide.size) {
        return;
    }

    scene.setObjectsSelected(scene.selectedObjectIds, false);
    scene.setObjectsVisible(Array.from(idsToHide), false);
}

function isolateSimilarEntities(entity) {
    const scene = viewer.scene;

    if (!scene || !entity?.isObject) {
        return;
    }

    const tokens = collectEntityMaterialTokens(entity);
    const idsToShow = new Set();

    for (const token of tokens) {
        const matchingIds = findMaterialObjectIds(token, { activeOnly: false });
        for (const id of matchingIds) {
            idsToShow.add(id);
        }
    }

    if (entity.id) {
        idsToShow.add(entity.id);
    }

    if (!idsToShow.size) {
        return;
    }

    scene.setObjectsVisible(scene.objectIds, false);
    scene.setObjectsXRayed(scene.xrayedObjectIds, false);
    scene.setObjectsSelected(scene.selectedObjectIds, false);
    scene.setObjectsVisible(Array.from(idsToShow), true);
}

function isolateEntity(entity) {
    const scene = viewer.scene;
    const metaObject = resolveMetaObject(entity?.id);

    if (!scene || !entity?.isObject || !metaObject) {
        return;
    }

    scene.setObjectsVisible(scene.visibleObjectIds, false);
    scene.setObjectsXRayed(scene.xrayedObjectIds, false);
    scene.setObjectsSelected(scene.selectedObjectIds, false);

    metaObject.withMetaObjectsInSubtree((mo) => {
        const currentEntity = scene.objects[mo.id];
        if (currentEntity) {
            currentEntity.visible = true;
        }
    });
}

function showAllEntities() {
    const scene = viewer.scene;

    if (!scene) {
        return;
    }

    scene.setObjectsVisible(scene.objectIds, true);
    scene.setObjectsXRayed(scene.xrayedObjectIds, false);
    scene.setObjectsSelected(scene.selectedObjectIds, false);
}

function closePropertyPanel() {
    const painel = document.getElementById("propertyPanel");
    if (painel) {
        painel.remove();
    }
}

function showMaterialProperties(entity) {
    if (!entity?.id) {
        alert("Nenhuma entidade selecionada.");
        return;
    }
    const metaObject = resolveMetaObject(entity.id);

    if (!metaObject) {
        alert("Não há informações de metadados disponíveis para este objeto.");
        return;
    }

    let propriedades = `<div class="property-panel-meta">`;
    propriedades += `<div><span class="property-label">ID:</span> ${metaObject.id}</div>`;
    propriedades += `<div><span class="property-label">Tipo:</span> ${metaObject.type || "N/A"}</div>`;
    if (metaObject.name) {
        propriedades += `<div><span class="property-label">Nome:</span> ${metaObject.name}</div>`;
    }

    const aabb = viewer.scene.getAABB(entity.id);
    if (aabb) {
        const centerX = ((aabb[0] + aabb[3]) / 2).toFixed(3);
        const centerY = ((aabb[1] + aabb[4]) / 2).toFixed(3);
        const centerZ = ((aabb[2] + aabb[5]) / 2).toFixed(3);
        propriedades += `
            <div class="property-panel-coordinates">
                <div class="property-label">Coordenadas (centro):</div>
                <div class="property-panel-coordinates-values">X: ${centerX} &nbsp; Y: ${centerY} &nbsp; Z: ${centerZ}</div>
            </div>
        `;
    }
    propriedades += `</div>`;

    // --- Varre todos os conjuntos de propriedades IFC ---
    if (metaObject.propertySets && metaObject.propertySets.length > 0) {
        for (const pset of metaObject.propertySets) {
            propriedades += `<div class="property-panel-section">`;
            propriedades += `<div class="property-panel-section-title">${pset.name}</div>`;
            if (pset.properties && pset.properties.length > 0) {
                propriedades += "<table class='property-panel-table'>";
                for (const prop of pset.properties) {
                    const key = prop.name || prop.id;
                    const val = prop.value !== undefined ? prop.value : "(vazio)";
                    propriedades += `<tr><td class="property-panel-key">${key}</td><td class="property-panel-value">${val}</td></tr>`;
                }
                propriedades += "</table>";
            }
            propriedades += `</div>`;
        }
    } else {
        propriedades += `<div class="property-panel-empty">Nenhum conjunto de propriedades encontrado.</div>`;
    }

    // --- Cria ou atualiza o painel flutuante ---
    let painel = document.getElementById("propertyPanel");
    if (!painel) {
        painel = document.createElement("div");
        painel.id = "propertyPanel";
        painel.classList.add("property-panel");
        document.body.appendChild(painel);
    }

    // 🟢 Adiciona botão X para fechar
    painel.innerHTML = `
        <div class="property-panel-header">
            <div class="property-panel-title">
                <h3>Propriedades IFC</h3>
                <span class="property-panel-subtitle">Metadados do objeto selecionado</span>
            </div>
            <button id="closePropertyPanel"
                class="property-panel-close"
                title="Fechar painel">
                ✖
            </button>
        </div>
        <div class="property-panel-body">
            ${propriedades}
        </div>
    `;

    // 🟢 Evento do botão X
    document.getElementById("closePropertyPanel").onclick = closePropertyPanel;

    setupDraggablePanel({
        panel: painel,
        storageKey: `propertyPanelPosition:${window.location.pathname}`,
        ignoreSelectors: "button, a, input, textarea, select, table, td, th",
        handleSelector: ".property-panel-header"
    });
}

// Cria o menu de contexto
const materialContextMenu = new ContextMenu({
    enabled: true,
    items: [
        [
            {
                title: "Propriedades do Material",
                doAction: function (context) {
                    showMaterialProperties(context.entity);
                }
            }
        ],
        [
            {
                title: "Ocultar",
                getEnabled: (context) => context.entity.visible,
                doAction: (context) => {
                    hideEntity(context.entity);
                }
            },
            {
                title: "Ocultar Similares",
                getEnabled: (context) => context.entity.visible,
                doAction: (context) => {
                    hideSimilarEntities(context.entity);
                }
            },
            {
                title: "Isolar Similares",
                doAction: (context) => {
                    isolateSimilarEntities(context.entity);
                }
            },
            {
                title: "Isolar",
                doAction: (context) => {
                    isolateEntity(context.entity);
                }
            },
            {
                title: "Ocultar Todos",
                getEnabled: (context) => context.viewer.scene.numVisibleObjects > 0,
                doAction: (context) => {
                    context.viewer.scene.setObjectsVisible(context.viewer.scene.visibleObjectIds, false);
                }
            },
            {
                title: "Mostrar Todos",
                getEnabled: (context) => {
                    const scene = context.viewer.scene;
                    return scene.numVisibleObjects < scene.numObjects;
                },
                doAction: showAllEntities
            }
        ],
        [
            {
                title: "Aplicar X-Ray",
                getEnabled: (context) => !context.entity.xrayed,
                doAction: (context) => {
                    context.entity.xrayed = true;
                }
            },
            {
                title: "Remover X-Ray",
                getEnabled: (context) => context.entity.xrayed,
                doAction: (context) => {
                    context.entity.xrayed = false;
                }
            },
            {
                title: "X-Ray em Outros",
                doAction: (context) => {
                    const scene = context.viewer.scene;
                    const entity = context.entity;
                    const metaObject = resolveMetaObject(entity.id);
                    if (!metaObject) return;
                    scene.setObjectsVisible(scene.objectIds, true);
                    scene.setObjectsXRayed(scene.objectIds, true);
                    metaObject.withMetaObjectsInSubtree((mo) => {
                        const e = scene.objects[mo.id];
                        if (e) e.xrayed = false;
                    });
                }
            },
            {
                title: "Redefinir X-Ray",
                getEnabled: (context) => context.viewer.scene.numXRayedObjects > 0,
                doAction: (context) => {
                    context.viewer.scene.setObjectsXRayed(context.viewer.scene.xrayedObjectIds, false);
                }
            }
        ]
    ]
});

function showEntityContextMenu(pageX, pageY) {
    const canvasPos = [pageX, pageY];
    const hit = viewer.scene.pick({ canvasPos });

    if (hit && hit.entity && hit.entity.isObject) {
        materialContextMenu.context = { viewer, entity: hit.entity };
        materialContextMenu.show(pageX, pageY);
    }
}

// Captura o evento de clique direito no canvas
viewer.scene.canvas.canvas.addEventListener('contextmenu', (event) => {
    showEntityContextMenu(event.pageX, event.pageY);
    event.preventDefault();
});

// Suporte a toque: abre o menu ao manter o dedo pressionado sobre o objeto
(() => {
    const canvasElement = viewer.scene.canvas.canvas;
    const longPressDuration = 600;
    const moveThreshold = 10;
    let touchTimeout = null;
    let touchStartPos = null;
    let menuOpened = false;

    const clearTouch = () => {
        if (touchTimeout) {
            clearTimeout(touchTimeout);
            touchTimeout = null;
        }
        touchStartPos = null;
        menuOpened = false;
    };

    canvasElement.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) {
            clearTouch();
            return;
        }

        const touch = event.touches[0];
        touchStartPos = { x: touch.pageX, y: touch.pageY };
        menuOpened = false;

        touchTimeout = setTimeout(() => {
            menuOpened = true;
            showEntityContextMenu(touchStartPos.x, touchStartPos.y);
        }, longPressDuration);
    }, { passive: true });

    canvasElement.addEventListener('touchmove', (event) => {
        if (!touchStartPos || event.touches.length !== 1) {
            clearTouch();
            return;
        }

        const touch = event.touches[0];
        const dx = touch.pageX - touchStartPos.x;
        const dy = touch.pageY - touchStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) {
            clearTouch();
        }
    }, { passive: true });

    const endTouch = (event) => {
        if (menuOpened) {
            event.preventDefault();
        }
        clearTouch();
    };

    canvasElement.addEventListener('touchend', endTouch, { passive: false });
    canvasElement.addEventListener('touchcancel', clearTouch, { passive: true });

})();
