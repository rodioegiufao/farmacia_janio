// Serviço de detecção de luminárias.
// Quando `ROBOFLOW_LUMINARIAS_CONFIG.useBackend` estiver ativo, delega para /api/detect-luminarias
// para evitar exposição da chave privada no navegador.
(function inicializarServicoDeteccaoLuminarias() {
    function obterBackendUrl(cfg = {}) {
        const fallback = '/api/detect-luminarias';
        const endpoint = (cfg.backendEndpoint || '').trim();

        if (!endpoint) {
            return fallback;
        }

        if (endpoint.endsWith('.js')) {
            console.warn(`⚠️ backendEndpoint inválido (${endpoint}). Usando ${fallback}.`);
            return fallback;
        }

        return endpoint;
    }

    function validarImagemBase64(image) {
        if (!image || typeof image !== 'string' || !image.includes(',')) {
            throw new Error('Imagem inválida para detecção de luminárias.');
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

        const rawBody = await response.text();
        let data = {};

        if (rawBody) {
            try {
                data = JSON.parse(rawBody);
            } catch (error) {
                data = { error: rawBody.trim() };
            }
        }

        if (!response.ok) {
            throw new Error(data?.error || `Backend retornou HTTP ${response.status}.`);
        }

        return data;
    }

    function obterChaveRoboflow(cfg = {}) {
        const chavePrivada = cfg.apiKey || null;
        const chavePublica = cfg.publishableKey || null;

        return chavePrivada || chavePublica;
    }

    async function chamarRoboflowDireto(payload, cfg) {
        const apiKey = obterChaveRoboflow(cfg);
        if (!apiKey) {
            throw new Error('Configure ROBOFLOW_LUMINARIAS_CONFIG.apiKey ou publishableKey para detectar luminárias.');
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

    async function detectarLuminarias(payload = {}) {
        const cfg = window.ROBOFLOW_LUMINARIAS_CONFIG || {};
        const requestPayload = {
            image: payload.image,
            model: payload.model || cfg.model || 'luminarias-n8sqp',
            version: payload.version || cfg.version || 1,
            confidence: payload.confidence ?? Math.round((cfg.confidenceMin ?? 0.45) * 100),
            timeoutMs: payload.timeoutMs ?? cfg.inferenceTimeoutMs ?? 30000,
            pageNum: payload.pageNum ?? null
        };

        validarImagemBase64(requestPayload.image);

        if (cfg.useBackend) {
            try {
                return await chamarBackend(requestPayload, cfg);
            } catch (error) {
                const mensagemErro = String(error?.message || '');
                const chaveFallback = obterChaveRoboflow(cfg);
                const backendBloqueado = /HTTP 401|HTTP 403|HTTP 404/i.test(mensagemErro);

                if (backendBloqueado && chaveFallback) {
                    console.warn(`⚠️ Falha no backend de luminárias (${mensagemErro}). Tentando Roboflow direto.`);
                    return chamarRoboflowDireto(requestPayload, cfg);
                }

                throw error;
            }
        }

        return chamarRoboflowDireto(requestPayload, cfg);
    }

    window.detectarLuminariasServico = detectarLuminarias;
})();
