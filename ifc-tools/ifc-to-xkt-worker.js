// Conversão IFC → XKT dentro do navegador (Web Worker), sem servidor e sem Supabase.
// Usa os mesmos módulos do convert2xkt oficial da xeokit (xeokit-convert 1.3.2 + web-ifc 0.0.70).
import { XKTModel, parseIFCIntoXKTModel, writeXKTModelToArrayBuffer } from "./xeokit-convert-ifc.min.js";

const WEB_IFC_BASE = "https://cdn.jsdelivr.net/npm/web-ifc@0.0.70/";
let webIfcPromise = null;

function loadWebIfc() {
  webIfcPromise ||= import(`${WEB_IFC_BASE}web-ifc-api.js`).then((WebIFC) => {
    // O parser cria o IfcAPI sozinho; esta classe garante que o .wasm venha sempre da CDN (caminho absoluto).
    class IfcAPI extends WebIFC.IfcAPI {
      constructor() {
        super();
        super.SetWasmPath(WEB_IFC_BASE, true);
      }
      SetWasmPath() {
        super.SetWasmPath(WEB_IFC_BASE, true);
      }
    }
    return { ...WebIFC, IfcAPI };
  }).catch((error) => {
    webIfcPromise = null;
    throw error;
  });
  return webIfcPromise;
}

const send = (message, transfer = []) => self.postMessage(message, transfer);

self.onmessage = async ({ data }) => {
  if (data?.type !== "convert") return;
  const startedAt = performance.now();
  try {
    send({ type: "progress", percent: 10, message: "Carregando o leitor de IFC..." });
    const WebIFC = await loadWebIfc();

    send({ type: "progress", percent: 25, message: "Lendo a geometria do IFC (pode levar alguns segundos)..." });
    const stats = {};
    const xktModel = new XKTModel({ minTileSize: 200 });
    await parseIFCIntoXKTModel({
      WebIFC,
      data: data.buffer,
      xktModel,
      wasmPath: WEB_IFC_BASE,
      includeTypes: data.includeTypes || undefined,
      excludeTypes: data.excludeTypes || undefined,
      stats,
      log: () => {}
    });

    send({ type: "progress", percent: 75, message: "Montando o XKT..." });
    xktModel.createDefaultMetaObjects();
    await xktModel.finalize();

    send({ type: "progress", percent: 90, message: "Gravando o arquivo..." });
    const xkt = writeXKTModelToArrayBuffer(xktModel, null, stats, { zip: false });

    send({
      type: "done",
      xkt,
      stats: {
        objects: stats.numObjects || 0,
        triangles: stats.numTriangles || 0,
        propertySets: stats.numPropertySets || 0,
        seconds: (performance.now() - startedAt) / 1000
      }
    }, [xkt]);
  } catch (error) {
    send({ type: "error", message: String(error?.message || error || "Erro desconhecido na conversão.") });
  }
};
