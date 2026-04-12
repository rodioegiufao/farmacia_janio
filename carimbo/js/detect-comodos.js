diff --git a/api/detect-comodos.js b/api/detect-comodos.js
new file mode 100644
index 0000000000000000000000000000000000000000..ebbb318cc335ac725650f7ad511a5a05a95b7024
--- /dev/null
+++ b/api/detect-comodos.js
@@ -0,0 +1,47 @@
+module.exports = async function handler(req, res) {
+    if (req.method !== 'POST') {
+        res.setHeader('Allow', 'POST');
+        return res.status(405).json({ error: 'Método não permitido.' });
+    }
+
+    const apiKey = process.env.ROBOFLOW_API_KEY;
+    if (!apiKey) {
+        return res.status(500).json({
+            error: 'ROBOFLOW_API_KEY não configurada no ambiente do servidor.'
+        });
+    }
+
+    try {
+        const { image, model = 'comodos', version = 9, confidence = 45 } = req.body || {};
+        if (!image || typeof image !== 'string' || !image.includes(',')) {
+            return res.status(400).json({ error: 'Campo "image" inválido.' });
+        }
+
+        const base64Image = image.split(',')[1];
+        const confidenceInt = Number.isFinite(Number(confidence)) ? Number(confidence) : 45;
+        const url = `https://detect.roboflow.com/${encodeURIComponent(model)}/${encodeURIComponent(version)}?api_key=${encodeURIComponent(apiKey)}&confidence=${encodeURIComponent(confidenceInt)}`;
+
+        const rfResponse = await fetch(url, {
+            method: 'POST',
+            headers: {
+                'Content-Type': 'application/x-www-form-urlencoded'
+            },
+            body: base64Image
+        });
+
+        const data = await rfResponse.json();
+        if (!rfResponse.ok) {
+            return res.status(rfResponse.status).json({
+                error: 'Falha ao consultar Roboflow.',
+                details: data
+            });
+        }
+
+        return res.status(200).json(data);
+    } catch (error) {
+        return res.status(500).json({
+            error: 'Erro inesperado na detecção de cômodos.',
+            details: error?.message || String(error)
+        });
+    }
+};
