// Serviço de detecção de cômodos (front-end)
// Mantido em carimbo/js conforme organização do projeto.
(function inicializarServicoDeteccaoComodos() {
    async function detectarComodos(payload = {}) {
        const cfg = window.ROBOFLOW_CONFIG || {};
        const {
            image,
            model = cfg.model || 'comodos',
            version = cfg.version || 9,
            confidence = Math.round((cfg.confidenceMin ?? 0.45) * 100),
            timeoutMs = cfg.inferenceTimeoutMs ?? 30000
        } = payload;

        if (!image || typeof image !== 'string' || !image.includes(',')) {
            throw new Error('Imagem inválida para detecção de cômodos.');
        }

        const apiKey = cfg.apiKey || null;
        if (!apiKey || apiKey.startsWith('rf_x')) {
            throw new Error('ROBOFLOW_CONFIG.apiKey (privada) não configurada para detectar cômodos.');
        }

        const base64Image = image.split(',')[1];
        const url = `https://detect.roboflow.com/${encodeURIComponent(model)}/${encodeURIComponent(version)}?api_key=${encodeURIComponent(apiKey)}&confidence=${encodeURIComponent(confidence)}`;
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), timeoutMs);

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

    window.detectarComodosServico = detectarComodos;
})();
