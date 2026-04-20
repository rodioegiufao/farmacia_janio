import {
    WebIFCLoaderPlugin,
    IFCOpenShellLoaderPlugin
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.107/dist/xeokit-sdk.min.es.js";

const bridge = window.ifcUploadBridge;

if (!bridge) {
    console.warn("ifcUploadBridge não encontrado. Upload IFC/XKT não foi inicializado.");
} else {
    const ifcUploadInput = document.getElementById("ifcUploadInput");
    const ifcUploadDropzone = document.querySelector(".ifc-upload-dropzone");

    let ifcLoader = null;
    let ifcOpenShellLoader = null;
    let pyodideSetupPromise = null;
    let uploadModelSequence = 0;

    const IFC_OPEN_SHELL_WHEEL_URL = "https://ifcopenshell.github.io/wasm-wheels/ifcopenshell-0.8.3+34a1bc6-cp313-cp313-emscripten_4_0_9_wasm32.whl";

    const ifcUploadDataSource = {
        getIFC(src, ok, error) {
            const resolvedSrc = bridge.normalizeBlobUrl(src);

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

        const supportedMethods = ["load", "loadModel", "loadIfc", "loadIFC", "loadModelFromFile", "loadModelFromIfc"];
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

            bridge.viewer.scene.canvas.spinner.processes++;

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
                bridge.viewer.scene.canvas.spinner.processes = Math.max(0, bridge.viewer.scene.canvas.spinner.processes - 1);
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

        ifcOpenShellLoader = new IFCOpenShellLoaderPlugin({
            viewer: bridge.viewer,
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
                } catch (_error) {
                    // Continua tentando outras assinaturas entre versões do xeokit/web-ifc.
                }
            }

            return false;
        };

        let lastError = null;

        for (const wasmPath of wasmPaths) {
            try {
                const loader = new WebIFCLoaderPlugin({
                    viewer: bridge.viewer,
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

    function buildUploadModelId(prefix) {
        uploadModelSequence += 1;
        return `${prefix}_${Date.now()}_${uploadModelSequence}`;
    }

    function finalizeUploadedModelLoad(model, { modelId, fileName, formatLabel, objectUrl = null, totalFiles = 1, loadedFilesRef = { count: 0 } }) {
        if (!model || typeof model.on !== "function") {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            bridge.setUploadStatus(`Formato de resposta inesperado ao carregar ${formatLabel}.`, true);
            return;
        }

        model.on("loaded", () => {
            bridge.addUploadedModelRecord(modelId, fileName);
            bridge.applyModelRenderProfile(model);
            bridge.registerModelTransform(model);
            bridge.adjustCameraOnLoad();
            bridge.viewer.cameraFlight.jumpTo(bridge.viewer.scene);
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            loadedFilesRef.count += 1;
            const loadedCount = loadedFilesRef.count;
            const statusMessage = totalFiles > 1
                ? `${loadedCount}/${totalFiles} arquivo(s) carregado(s). Último: ${fileName}.`
                : `${formatLabel} carregado: ${fileName}.`;
            bridge.setUploadStatus(statusMessage);
        });

        model.on("error", (error) => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            bridge.setUploadStatus(`Falha ao carregar ${fileName}.`, true);
            console.error(`Erro ao carregar ${formatLabel}:`, error);
        });
    }

    async function loadIfcUpload(file, uploadContext = {}) {
        const modelId = buildUploadModelId("IFC_UPLOAD");
        const renderProfile = bridge.getDefaultRenderProfile();
        const performanceModeEnabled = bridge.getPerformanceModeEnabled();

        const baseIfcLoadOptions = {
            id: modelId,
            cacheBuster: false,
            edges: performanceModeEnabled ? false : renderProfile.edgesEnabled,
            loadMetadata: true,
            loadMetadataPropertySets: true,
            excludeTypes: ["IfcSpace", "IfcOpeningElement"],
            origin: [0, 0, 0],
            position: [0, 0, 0],
            saoEnabled: performanceModeEnabled ? false : renderProfile.saoEnabled,
            dtxEnabled: bridge.viewerCompatibility.enableDataTextures
        };

        const [fileText, fileArrayBuffer] = await Promise.all([file.text(), file.arrayBuffer()]);

        const tryLoadWithResolvedMethod = async (loader) => {
            const loadMethod = resolveIfcLoadMethod(loader);

            if (!loadMethod) {
                throw new Error("Não foi possível identificar o método de carregamento IFC.");
            }

            const attempts = [
                async () => loader[loadMethod]({ ...baseIfcLoadOptions, text: fileText }),
                async () => loader[loadMethod]({ ...baseIfcLoadOptions, data: fileArrayBuffer }),
                async () => loader[loadMethod](fileText, { ...baseIfcLoadOptions }),
                async () => loader[loadMethod](fileArrayBuffer, { ...baseIfcLoadOptions })
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
            bridge.setUploadStatus(`Falha ao iniciar o carregamento do IFC: ${error?.message || error}.`, true);
            console.error("Erro ao iniciar carregamento IFC:", error);
        }
    }

    function loadXktUpload(file, uploadContext = {}) {
        const objectUrl = URL.createObjectURL(file);
        const modelId = buildUploadModelId("XKT_UPLOAD");

        const renderProfile = bridge.getDefaultRenderProfile();
        const performanceModeEnabled = bridge.getPerformanceModeEnabled();

        let model;

        try {
            model = bridge.xktLoader.load({
                id: modelId,
                src: bridge.normalizeBlobUrl(objectUrl),
                cacheBuster: false,
                edges: performanceModeEnabled ? false : renderProfile.edgesEnabled,
                saoEnabled: performanceModeEnabled ? false : renderProfile.saoEnabled,
                dtxEnabled: bridge.viewerCompatibility.enableDataTextures
            });
        } catch (error) {
            URL.revokeObjectURL(objectUrl);
            bridge.setUploadStatus(`Falha ao iniciar o carregamento do XKT: ${error?.message || error}.`, true);
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

        const handleSelectedFiles = async (fileList) => {
            const files = Array.from(fileList || []);

            if (!files.length) {
                return;
            }

            const invalidFile = files.find((file) => {
                const lowerCaseFileName = file.name.toLowerCase();
                return !lowerCaseFileName.endsWith(".xkt") && !lowerCaseFileName.endsWith(".ifc");
            });

            if (invalidFile) {
                bridge.setUploadStatus("Arquivo inválido. Selecione apenas arquivos .xkt ou .ifc.", true);
                return;
            }

            bridge.updateExpectedModels(files.length);

            const loadedFilesRef = { count: 0 };
            const uploadContext = {
                totalFiles: files.length,
                loadedFilesRef
            };

            bridge.setUploadStatus(
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
        };

        ifcUploadInput.addEventListener("change", async () => {
            await handleSelectedFiles(ifcUploadInput.files);
        });

        if (!ifcUploadDropzone) {
            return;
        }

        const preventDropDefaults = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };

        ifcUploadDropzone.addEventListener("dragenter", (event) => {
            preventDropDefaults(event);
            ifcUploadDropzone.classList.add("is-dragover");
        });

        ifcUploadDropzone.addEventListener("dragover", (event) => {
            preventDropDefaults(event);
            ifcUploadDropzone.classList.add("is-dragover");
        });

        ifcUploadDropzone.addEventListener("dragleave", (event) => {
            preventDropDefaults(event);

            if (!ifcUploadDropzone.contains(event.relatedTarget)) {
                ifcUploadDropzone.classList.remove("is-dragover");
            }
        });

        ifcUploadDropzone.addEventListener("drop", async (event) => {
            preventDropDefaults(event);
            ifcUploadDropzone.classList.remove("is-dragover");
            await handleSelectedFiles(event.dataTransfer?.files);
        });
    }

    setupIfcUploadInput();
}
