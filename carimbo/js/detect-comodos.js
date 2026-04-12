// Serviço de detecção de cômodos.
// Quando `ROBOFLOW_CONFIG.useBackend` estiver ativo, delega para /api/detect-comodos
// para evitar exposição da chave privada no navegador.
(function inicializarServicoDeteccaoComodos() {
    function obterBackendUrl(cfg = {}) {
        return cfg.backendEndpoint || '/api/detect-comodos';
    }

    function validarImagemBase64(image) {
        if (!image || typeof image !== 'string' || !image.includes(',')) {
            throw new Error('Imagem inválida para detecção de cômodos.');
        }
    }

    async function chamarBackend(payload, cfg) {
        const url = obterBackendUrl(cfg);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data?.error || `Backend retornou HTTP ${response.status}.`);
        }

        return data;
    }

    async function chamarRoboflowDireto(payload, cfg) {
        const apiKey = cfg.apiKey || null;
        if (!apiKey || apiKey.startsWith('rf_x')) {
            throw new Error('ROBOFLOW_CONFIG.apiKey (privada) não configurada para detectar cômodos.');
        }

        const base64Image = payload.image.split(',')[1];
        const url = `https://detect.roboflow.com/${encodeURIComponent(payload.model)}/${encodeURIComponent(payload.version)}?api_key=${encodeURIComponent(apiKey)}&confidence=${encodeURIComponent(payload.confidence)}`;
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), payload.timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: base64Image,
                signal: controller.signal
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || `Roboflow retornou HTTP ${response.status}.`);
            }

            return data;
        } finally {
            clearTimeout(timerId);
        }
    }

    async function detectarComodos(payload = {}) {
        const cfg = window.ROBOFLOW_CONFIG || {};
        const requestPayload = {
            image: payload.image,
            model: payload.model || cfg.model || 'comodos',
            version: payload.version || cfg.version || 9,
            confidence: payload.confidence ?? Math.round((cfg.confidenceMin ?? 0.45) * 100),
            timeoutMs: payload.timeoutMs ?? cfg.inferenceTimeoutMs ?? 30000,
            pageNum: payload.pageNum ?? null
        };

        validarImagemBase64(requestPayload.image);

        if (cfg.useBackend) {
            return chamarBackend(requestPayload, cfg);
        }

        return chamarRoboflowDireto(requestPayload, cfg);
    }

    window.detectarComodosServico = detectarComodos;
})();
