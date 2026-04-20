import {
    WebIFCLoaderPlugin,
    IFCOpenShellLoaderPlugin
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@2.6.107/dist/xeokit-sdk.min.es.js";

const bridge = window.ifcUploadBridge;

if (!bridge) {
    console.warn("ifcUploadBridge não encontrado. Upload IFC/XKT não foi inicializado.");
} else {
    const ifcUploadInput = document.getElementById("ifcUploadInput");
    const ifcUploadPanel = document.getElementById("ifcUploadPanel");
    const ifcUploadIntro = document.getElementById("ifcUploadIntro");
    const ifcUploadDropzone = document.querySelector(".ifc-upload-dropzone");
    const shareButton = document.getElementById("btnShareUploadLink");
    const sharePanel = document.getElementById("shareUploadPanel");
    const closeSharePanelButton = document.getElementById("closeShareUploadPanel");
    const shareLinkInput = document.getElementById("shareUploadLinkInput");
    const shareCodeElement = document.getElementById("shareUploadCode");
    const copyShareLinkButton = document.getElementById("copyShareUploadLink");
    const addMoreFilesButton = document.getElementById("addMoreIfcFiles");
    const shareApiEndpoint = "/api/share-models";
    const shareableFiles = [];
    const shareableFileKeys = new Set();
    let processSelectedFiles = async () => {};

    let ifcLoader = null;
    let ifcOpenShellLoader = null;
    let pyodideSetupPromise = null;
    let uploadModelSequence = 0;
    let isUploadInProgress = false;

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

        ifcOpenShellLoader = new IFCOpenShellLoaderPlugin(bridge.viewer, {
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
                const loader = new WebIFCLoaderPlugin(bridge.viewer, {
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

    function setUploadInputEnabled(isEnabled) {
        if (!ifcUploadInput) {
            return;
        }

        ifcUploadInput.disabled = !isEnabled;

        if (ifcUploadDropzone) {
            ifcUploadDropzone.classList.toggle("is-disabled", !isEnabled);
            ifcUploadDropzone.setAttribute("aria-disabled", String(!isEnabled));
        }
    }

    function hideUploadPanel() {
        if (ifcUploadPanel) {
            ifcUploadPanel.hidden = true;
        }

        document.body.classList.remove("ifc-upload-active");
    }

    function hideUploadIntro() {
        if (ifcUploadIntro) {
            ifcUploadIntro.hidden = true;
        }
    }

    function finalizeUploadBatch(uploadContext = {}, { succeeded = false, fileName = "" } = {}) {
        const {
            totalFiles = 1,
            completedFilesRef = { count: 0 },
            successfulFilesRef = { count: 0 },
            onBatchComplete = null
        } = uploadContext;

        completedFilesRef.count += 1;
        if (succeeded) {
            successfulFilesRef.count += 1;
        }

        if (completedFilesRef.count < totalFiles) {
            return;
        }

        const successfulFiles = successfulFilesRef.count;

        if (successfulFiles > 0) {
            hideUploadPanel();
            bridge.setUploadStatus(
                totalFiles > 1
                    ? `Upload concluído com ${successfulFiles}/${totalFiles} arquivo(s) carregado(s).`
                    : `Upload concluído: ${fileName}.`
            );
            if (typeof onBatchComplete === "function") {
                onBatchComplete({ hasSuccess: true });
            }
            return;
        }

        setUploadInputEnabled(true);
        bridge.setUploadStatus("Nenhum arquivo foi carregado. Tente novamente.", true);
        if (typeof onBatchComplete === "function") {
            onBatchComplete({ hasSuccess: false });
        }
    }

    function buildShareableFileKey(file) {
        const lastModified = Number.isFinite(file.lastModified) ? file.lastModified : 0;
        return `${file.name}::${file.size}::${lastModified}`;
    }

    function registerShareableFiles(files = []) {
        files.forEach((file) => {
            const key = buildShareableFileKey(file);
            if (shareableFileKeys.has(key)) {
                return;
            }

            shareableFileKeys.add(key);
            shareableFiles.push(file);
        });
    }

    const MAX_SHARE_REQUEST_BYTES = 4 * 1024 * 1024;

    function arrayBufferToBase64(arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 0x8000;
        let binary = "";

        for (let index = 0; index < bytes.length; index += chunkSize) {
            const chunk = bytes.subarray(index, index + chunkSize);
            binary += String.fromCharCode(...chunk);
        }

        return btoa(binary);
    }

    async function compressArrayBufferWithGzip(arrayBuffer) {
        if (typeof CompressionStream !== "function") {
            return null;
        }

        const compressionStream = new CompressionStream("gzip");
        const writer = compressionStream.writable.getWriter();
        writer.write(new Uint8Array(arrayBuffer));
        writer.close();

        const compressedResponse = new Response(compressionStream.readable);
        return compressedResponse.arrayBuffer();
    }

    async function decompressGzipBase64(base64Content) {
        const compressedBytes = base64ToUint8Array(base64Content || "");

        if (typeof DecompressionStream !== "function") {
            throw new Error("Seu navegador não suporta descompressão GZIP para abrir esse compartilhamento.");
        }

        const decompressionStream = new DecompressionStream("gzip");
        const writer = decompressionStream.writable.getWriter();
        writer.write(compressedBytes);
        writer.close();

        const decompressedResponse = new Response(decompressionStream.readable);
        const decompressedBuffer = await decompressedResponse.arrayBuffer();
        return new Uint8Array(decompressedBuffer);
    }

    function base64ToUint8Array(base64Content) {
        const binary = atob(base64Content);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }

    function sanitizeShareCode(rawShareCode) {
        if (typeof rawShareCode !== "string") {
            return "";
        }

        let shareCode = rawShareCode.trim();
        if (!shareCode) {
            return "";
        }

        shareCode = shareCode.replace(/^[\["'(]+/, "").replace(/[\]"')]+$/, "");
        shareCode = shareCode.replace(/[.,;!?]+$/, "");

        return shareCode;
    }

    async function createShareSnapshot(files = []) {
        const serializedFiles = await Promise.all(
            files.map(async (file) => {
                const fileBuffer = await file.arrayBuffer();
                const compressedBuffer = await compressArrayBufferWithGzip(fileBuffer);
                const shouldUseCompression =
                    compressedBuffer && compressedBuffer.byteLength > 0 && compressedBuffer.byteLength < fileBuffer.byteLength;

                return {
                    name: file.name,
                    type: file.type || "application/octet-stream",
                    encoding: shouldUseCompression ? "gzip+base64" : "base64",
                    contentBase64: arrayBufferToBase64(shouldUseCompression ? compressedBuffer : fileBuffer)
                };
            })
        );

        const payloadBody = JSON.stringify({ files: serializedFiles });
        const payloadSize = new TextEncoder().encode(payloadBody).length;

        if (payloadSize > MAX_SHARE_REQUEST_BYTES) {
            const payloadSizeMb = (payloadSize / (1024 * 1024)).toFixed(2);
            throw new Error(
                `Os arquivos selecionados geram ${payloadSizeMb} MB no link e excedem o limite permitido. Remova alguns arquivos e tente novamente.`
            );
        }

        const response = await fetch(shareApiEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: payloadBody
        });

        if (!response.ok) {
            throw new Error(`Falha HTTP ${response.status} ao gerar link compartilhável.`);
        }

        const payload = await response.json();
        if (!payload?.shareCode || !payload?.shareLink || !payload?.expiresAt) {
            throw new Error("Resposta inválida ao gerar compartilhamento.");
        }

        return payload;
    }

    async function loadModelsFromShareCode(shareCode) {
        const response = await fetch(`${shareApiEndpoint}?share=${encodeURIComponent(shareCode)}`);

        if (response.status === 404) {
            bridge.setUploadStatus("Link compartilhado expirado ou não encontrado. Gere um novo link no dispositivo original.", true);
            return;
        }

        if (!response.ok) {
            throw new Error(`Falha HTTP ${response.status} ao recuperar modelos compartilhados.`);
        }

        const payload = await response.json();
        const sharedFiles = Array.isArray(payload?.files) ? payload.files : [];

        if (!sharedFiles.length) {
            bridge.setUploadStatus("Esse link não possui modelos anexados.", true);
            return;
        }

        const restoredFiles = await Promise.all(
            sharedFiles.map(async (sharedFile) => {
                const encoding = sharedFile?.encoding === "gzip+base64" ? "gzip+base64" : "base64";
                const fileBytes =
                    encoding === "gzip+base64"
                        ? await decompressGzipBase64(sharedFile.contentBase64 || "")
                        : base64ToUint8Array(sharedFile.contentBase64 || "");

                return new File([fileBytes], sharedFile.name || "modelo-compartilhado.ifc", {
                    type: sharedFile.type || "application/octet-stream"
                });
            })
        );

        registerShareableFiles(restoredFiles);
        bridge.setUploadStatus(`Carregando ${restoredFiles.length} arquivo(s) compartilhado(s)...`);
        await processSelectedFiles(restoredFiles);
    }

    async function tryLoadSharedModelsFromUrl() {
        const currentUrl = new URL(window.location.href);
        const rawShareCode = currentUrl.searchParams.get("share");
        const shareCode = sanitizeShareCode(rawShareCode);

        if (!shareCode) {
            return;
        }

        try {
            await loadModelsFromShareCode(shareCode);
        } catch (error) {
            console.error("Falha ao carregar modelos compartilhados:", error);
            bridge.setUploadStatus(`Não foi possível carregar o compartilhamento: ${error?.message || error}.`, true);
        }
    }

    function setupSharePanel() {
        if (!shareButton || !sharePanel || !shareLinkInput || !shareCodeElement) {
            return;
        }

        const setPanelState = (open) => {
            sharePanel.hidden = !open;
            shareButton.classList.toggle("active", open);
            shareButton.setAttribute("aria-expanded", open ? "true" : "false");
        };

        shareButton.addEventListener("click", async () => {
            if (isUploadInProgress) {
                bridge.setUploadStatus("Aguarde o término do upload para gerar um link temporário.");
                return;
            }

            if (!shareableFiles.length) {
                bridge.setUploadStatus("Adicione pelo menos um modelo antes de compartilhar.", true);
                setPanelState(true);
                shareLinkInput.value = "";
                shareCodeElement.textContent = "Nenhum modelo disponível para compartilhar.";
                return;
            }

            shareCodeElement.textContent = "Gerando link temporário...";
            setPanelState(true);

            try {
                const { shareCode, shareLink, expiresAt } = await createShareSnapshot(shareableFiles);
                shareLinkInput.value = shareLink;
                shareCodeElement.textContent = `Código: ${shareCode} • expira em ${new Date(expiresAt).toLocaleString("pt-BR")}`;
                bridge.setUploadStatus("Link temporário gerado com os modelos anexados.");
            } catch (error) {
                console.error("Falha ao gerar link compartilhável:", error);
                shareLinkInput.value = "";
                shareCodeElement.textContent = "Não foi possível gerar o link temporário.";
                bridge.setUploadStatus(`Erro ao gerar link: ${error?.message || error}.`, true);
            }
        });

        closeSharePanelButton?.addEventListener("click", () => setPanelState(false));

        copyShareLinkButton?.addEventListener("click", async () => {
            const linkValue = shareLinkInput.value.trim();
            if (!linkValue) {
                return;
            }

            try {
                await navigator.clipboard.writeText(linkValue);
                bridge.setUploadStatus("Link temporário copiado para a área de transferência.");
            } catch (_error) {
                shareLinkInput.focus();
                shareLinkInput.select();
                bridge.setUploadStatus("Não foi possível copiar automaticamente. Use Ctrl+C para copiar.");
            }
        });
    }

    function finalizeUploadedModelLoad(model, uploadContext = {}) {
        const {
            modelId,
            fileName,
            formatLabel,
            objectUrl = null,
            totalFiles = 1,
            loadedFilesRef = { count: 0 }
        } = uploadContext;

        if (!model || typeof model.on !== "function") {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            bridge.setUploadStatus(`Formato de resposta inesperado ao carregar ${formatLabel}.`, true);
            finalizeUploadBatch(uploadContext, { succeeded: false, fileName });
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
            finalizeUploadBatch(uploadContext, { succeeded: true, fileName });
        });

        model.on("error", (error) => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            bridge.setUploadStatus(`Falha ao carregar ${fileName}.`, true);
            console.error(`Erro ao carregar ${formatLabel}:`, error);
            finalizeUploadBatch(uploadContext, { succeeded: false, fileName });
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
            finalizeUploadBatch(uploadContext, { succeeded: false, fileName: file.name });
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
            finalizeUploadBatch(uploadContext, { succeeded: false, fileName: file.name });
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

        const openFilePicker = () => {
            if (!ifcUploadInput || isUploadInProgress) {
                return;
            }

            ifcUploadInput.click();
        };

        processSelectedFiles = async (fileList) => {
            const files = Array.from(fileList || []);

            if (!files.length) {
                return;
            }

            if (isUploadInProgress) {
                bridge.setUploadStatus("Um upload já está em andamento. Aguarde terminar para adicionar novos modelos.", true);
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

            registerShareableFiles(files);
            bridge.updateExpectedModels(files.length);

            const loadedFilesRef = { count: 0 };
            const completedFilesRef = { count: 0 };
            const successfulFilesRef = { count: 0 };
            const uploadContext = {
                totalFiles: files.length,
                loadedFilesRef,
                completedFilesRef,
                successfulFilesRef,
                onBatchComplete: () => {
                    isUploadInProgress = false;
                    setUploadInputEnabled(true);
                }
            };

            isUploadInProgress = true;
            setUploadInputEnabled(false);
            hideUploadIntro();
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

        addMoreFilesButton?.addEventListener("click", openFilePicker);

        ifcUploadInput.addEventListener("change", async () => {
            await processSelectedFiles(ifcUploadInput.files);
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

            if (isUploadInProgress) {
                bridge.setUploadStatus("Um upload já está em andamento. Aguarde terminar para adicionar novos modelos.", true);
                return;
            }

            await processSelectedFiles(event.dataTransfer?.files);
        });
    }

    setupSharePanel();
    setupIfcUploadInput();
    tryLoadSharedModelsFromUrl();
    document.body.classList.add("ifc-upload-active");
}
