diff --git a/carimbo/js/detect-plantas.js b/carimbo/js/detect-plantas.js
new file mode 100644
index 0000000000000000000000000000000000000000..7233ce9449f076e23f6102010f76f8938dbe8564
--- /dev/null
+++ b/carimbo/js/detect-plantas.js
@@ -0,0 +1,108 @@
+// Serviço de detecção de plantas.
+// Quando `ROBOFLOW_PLANTAS_CONFIG.useBackend` estiver ativo, delega para /api/detect-plantas
+// para evitar exposição da chave privada no navegador.
+(function inicializarServicoDeteccaoPlantas() {
+    function obterBackendUrl(cfg = {}) {
+        const fallback = '/api/detect-plantas';
+        const endpoint = (cfg.backendEndpoint || '').trim();
+
+        if (!endpoint) {
+            return fallback;
+        }
+
+        if (endpoint.endsWith('.js')) {
+            console.warn(`⚠️ backendEndpoint inválido (${endpoint}). Usando ${fallback}.`);
+            return fallback;
+        }
+
+        return endpoint;
+    }
+
+    function validarImagemBase64(image) {
+        if (!image || typeof image !== 'string' || !image.includes(',')) {
+            throw new Error('Imagem inválida para detecção de plantas.');
+        }
+    }
+
+    async function chamarBackend(payload, cfg) {
+        const url = obterBackendUrl(cfg);
+        const response = await fetch(url, {
+            method: 'POST',
+            headers: {
+                'Content-Type': 'application/json'
+            },
+            body: JSON.stringify(payload)
+        });
+
+        const rawBody = await response.text();
+        let data = {};
+
+        if (rawBody) {
+            try {
+                data = JSON.parse(rawBody);
+            } catch (error) {
+                data = { error: rawBody.trim() };
+            }
+        }
+
+        if (!response.ok) {
+            throw new Error(data?.error || `Backend retornou HTTP ${response.status}.`);
+        }
+
+        return data;
+    }
+
+    async function chamarRoboflowDireto(payload, cfg) {
+        const apiKey = cfg.apiKey || null;
+        if (!apiKey || apiKey.startsWith('rf_x')) {
+            throw new Error('ROBOFLOW_PLANTAS_CONFIG.apiKey (privada) não configurada para detectar plantas.');
+        }
+
+        const base64Image = payload.image.split(',')[1];
+        const url = `https://detect.roboflow.com/${encodeURIComponent(payload.model)}/${encodeURIComponent(payload.version)}?api_key=${encodeURIComponent(apiKey)}&confidence=${encodeURIComponent(payload.confidence)}`;
+        const controller = new AbortController();
+        const timerId = setTimeout(() => controller.abort(), payload.timeoutMs);
+
+        try {
+            const response = await fetch(url, {
+                method: 'POST',
+                headers: {
+                    'Content-Type': 'application/x-www-form-urlencoded'
+                },
+                body: base64Image,
+                signal: controller.signal
+            });
+
+            const data = await response.json();
+            if (!response.ok) {
+                throw new Error(data?.error || `Roboflow retornou HTTP ${response.status}.`);
+            }
+
+            return data;
+        } finally {
+            clearTimeout(timerId);
+        }
+    }
+
+    async function detectarPlantas(payload = {}) {
+        const cfg = window.ROBOFLOW_PLANTAS_CONFIG || {};
+        const requestPayload = {
+            image: payload.image,
+            model: payload.model || cfg.model || 'plantas-4eu8q',
+            version: payload.version || cfg.version || 2,
+            confidence: payload.confidence ?? Math.round((cfg.confidenceMin ?? 0.55) * 100),
+            timeoutMs: payload.timeoutMs ?? cfg.inferenceTimeoutMs ?? 30000,
+            pageNum: payload.pageNum ?? null
+        };
+
+        validarImagemBase64(requestPayload.image);
+
+        if (cfg.useBackend) {
+            return chamarBackend(requestPayload, cfg);
+        }
+
+        return chamarRoboflowDireto(requestPayload, cfg);
+    }
+
+    window.detectarPlantasServico = detectarPlantas;
+})();
