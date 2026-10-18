// Núcleo de cálculo da cobertura de câmeras (DORI + linha de visão).
// Não depende do xeokit, para poder ser testado isoladamente.

import { normalizeItemLabel, iterateMetaObjectTexts, SegmentGrid } from "./wifi-coverage-core.js";

// ---------------------------------------------------------------------------
// Catálogo de câmeras (dados do datasheet do fabricante)
// ---------------------------------------------------------------------------
export const CAMERA_MODELS = Object.freeze({
    "VIP-1230-D-G5": Object.freeze({
        id: "VIP-1230-D-G5",
        label: "Intelbras VIP 1230 D G5 (dome 2,8 mm)",
        resolution: "1920 × 1080 (2 MP)",
        focal: "2,8 mm",
        hFovDeg: 101,
        vFovDeg: 54,
        irRangeM: 30,
        // Distâncias DORI informadas pela Intelbras no datasheet (m)
        dori: Object.freeze({ identify: 4.6, recognize: 9.1, observe: 18.2, detect: 45.5 })
    })
});

// Itens do projeto classificados como câmera.
export const CAMERA_RULES = Object.freeze([
    Object.freeze({ match: "S.O.S CFTV e Segurança - CFTV - IP/POE - Câmera de Segurança tipo Dome 90° IP66", modelId: "VIP-1230-D-G5" })
]);

// Regra principal: "Nome" do conjunto "Identificação_Elemento" contendo "câmera"/"camera".
export const CAMERA_NAME_RULE = Object.freeze({
    psetName: "Identificação_Elemento",
    propertyName: "Nome",
    keywords: Object.freeze(["camera"]),   // comparado sem acento: cobre "câmera" e "camera"
    modelId: "VIP-1230-D-G5"
});

export const CAMERA_SETTINGS = Object.freeze({
    targetHeight: 1.6,     // altura do rosto de uma pessoa acima do piso (m) — referência do DORI
    maxTiltDeg: 89,        // 90° (olhando reto para baixo) deixa a orientação indefinida
    wallClearance: 0.35    // o raio de visão começa um pouco à frente da câmera (câmeras junto à parede)
});

// Obstáculos que bloqueiam a visão. Vidro (janelas, pele de vidro) não bloqueia.
export const CAMERA_BLOCKING_KINDS = Object.freeze(new Set(["masonry", "drywall", "concrete", "door"]));

const DORI_COLORS = Object.freeze({
    identify: [30, 64, 175],
    recognize: [37, 99, 235],
    observe: [96, 165, 250],
    detect: [191, 219, 254]
});

/** Faixas para o mapa: valor da célula = −distância (maior = mais perto = melhor). */
export function getCameraLevels(modelId) {
    const dori = CAMERA_MODELS[modelId]?.dori;
    if (!dori) return [];
    const m = (value) => String(value).replace(".", ",");
    return [
        { min: -dori.identify, color: DORI_COLORS.identify, label: `Identificar • até ${m(dori.identify)} m` },
        { min: -dori.recognize, color: DORI_COLORS.recognize, label: `Reconhecer • até ${m(dori.recognize)} m` },
        { min: -dori.observe, color: DORI_COLORS.observe, label: `Observar • até ${m(dori.observe)} m` },
        { min: -dori.detect, color: DORI_COLORS.detect, label: `Detectar • até ${m(dori.detect)} m` }
    ];
}

// Normalização mais tolerante para nomes de itens: ignora pontuação no início ("." de ".S.O.S")
// e trata "º" (ordinal) como "°" (grau).
function normalizeLoose(value) {
    return normalizeItemLabel(String(value ?? "").replace(/º/g, "°")).replace(/^[^a-z0-9]+/, "");
}

const NORMALIZED_CAMERA_RULES = CAMERA_RULES.map((rule) => ({ ...rule, normalized: normalizeLoose(rule.match) }));
const NAME_RULE_PSET = normalizeItemLabel(CAMERA_NAME_RULE.psetName);
const NAME_RULE_PROPERTY = normalizeItemLabel(CAMERA_NAME_RULE.propertyName);

/** Retorna o id do modelo de câmera quando o objeto é uma câmera, ou null. */
export function getCameraModelId(metaObject) {
    // 1) Identificação_Elemento › Nome contém "câmera"
    for (const pset of metaObject?.propertySets || []) {
        if (normalizeItemLabel(pset?.name) !== NAME_RULE_PSET) continue;
        for (const prop of pset.properties || []) {
            if (normalizeItemLabel(prop?.name) !== NAME_RULE_PROPERTY) continue;
            const value = normalizeItemLabel(prop?.value);
            if (CAMERA_NAME_RULE.keywords.some((keyword) => value.includes(keyword))) return CAMERA_NAME_RULE.modelId;
        }
    }

    // 2) Item associado com o nome da peça
    for (const text of iterateMetaObjectTexts(metaObject)) {
        const normalized = normalizeLoose(text);
        const rule = NORMALIZED_CAMERA_RULES.find((candidate) => candidate.normalized === normalized);
        if (rule) return rule.modelId;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Mira
// ---------------------------------------------------------------------------
const DEG = Math.PI / 180;

/** Azimute e inclinação para o centro da imagem cair no ponto clicado. Y para cima. */
export function aimFromTarget(camera, target) {
    const dx = target.x - camera.x;
    const dz = target.z - camera.z;
    const dy = camera.y - target.y;
    const horizontal = Math.hypot(dx, dz);
    if (horizontal < 1e-6) return null;
    const azimuthDeg = ((Math.atan2(dz, dx) / DEG) + 360) % 360;
    const tiltDeg = Math.min(CAMERA_SETTINGS.maxTiltDeg, Math.max(0, Math.atan2(dy, horizontal) / DEG));
    return { azimuthDeg, tiltDeg };
}

/** Base da câmera: f = frente, r = direita, u = cima da imagem (horizonte nivelado). */
export function cameraBasis(azimuthDeg, tiltDeg) {
    const a = azimuthDeg * DEG;
    const t = Math.min(CAMERA_SETTINGS.maxTiltDeg, tiltDeg) * DEG;
    const f = [Math.cos(t) * Math.cos(a), -Math.sin(t), Math.cos(t) * Math.sin(a)];
    const rLength = Math.hypot(f[2], f[0]) || 1;
    const r = [-f[2] / rLength, 0, f[0] / rLength];
    const u = [
        r[1] * f[2] - r[2] * f[1],
        r[2] * f[0] - r[0] * f[2],
        r[0] * f[1] - r[1] * f[0]
    ];
    return { f, r, u };
}

/** Pontos das 4 arestas do cone, até o piso ou até a distância máxima. */
export function frustumEdgePoints(camera, model, floorY, maxDistance) {
    const { f, r, u } = cameraBasis(camera.azimuthDeg, camera.tiltDeg);
    const th = Math.tan((model.hFovDeg / 2) * DEG);
    const tv = Math.tan((model.vFovDeg / 2) * DEG);
    const points = [];
    for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
        const d = [0, 1, 2].map((i) => f[i] + sx * th * r[i] + sy * tv * u[i]);
        const length = Math.hypot(d[0], d[1], d[2]);
        d[0] /= length; d[1] /= length; d[2] /= length;
        let distance = maxDistance;
        if (d[1] < -1e-6) distance = Math.min(distance, (camera.y - floorY) / -d[1]);
        points.push([camera.x + d[0] * distance, camera.y + d[1] * distance, camera.z + d[2] * distance]);
    }
    return points;
}

// ---------------------------------------------------------------------------
// Mapa DORI
// ---------------------------------------------------------------------------
/**
 * Para cada célula (pessoa em pé, rosto a targetY), verifica se alguma câmera a vê:
 * dentro do campo de visão, dentro da distância de detecção e sem parede no caminho.
 * grid = −(distância até a câmera mais próxima que vê o ponto);
 * visibility = fração (0–1) de 4 sub-amostras da célula vistas por alguma câmera (bordas suaves).
 */
export async function computeCameraGrid({
    cameras,
    obstacleSlice,
    obstacleKinds,
    bounds,
    cellSize,
    targetY,
    nightMode = false,
    shouldCancel = () => false,
    onProgress = () => {},
    yieldEveryMs = 30
}) {
    const cols = Math.max(1, Math.ceil((bounds[2] - bounds[0]) / cellSize));
    const rows = Math.max(1, Math.ceil((bounds[3] - bounds[1]) / cellSize));
    const grid = new Float32Array(cols * rows);
    const visibility = new Float32Array(cols * rows);
    const SUB = [-0.25, 0.25];
    const segmentGrid = new SegmentGrid(obstacleSlice, bounds, 1);
    const blocks = Float32Array.from(obstacleKinds, (kind) => (CAMERA_BLOCKING_KINDS.has(kind) ? 1 : 0));

    const prepared = cameras.map((camera) => {
        const model = CAMERA_MODELS[camera.modelId];
        const basis = cameraBasis(camera.azimuthDeg, camera.tiltDeg);
        const horizontal = Math.hypot(basis.f[0], basis.f[2]) || 1;
        const maxRange = nightMode ? Math.min(model.dori.detect, model.irRangeM) : model.dori.detect;
        return {
            ...camera,
            basis,
            tanH: Math.tan((model.hFovDeg / 2) * DEG),
            tanV: Math.tan((model.vFovDeg / 2) * DEG),
            maxRange,
            startX: camera.x + (basis.f[0] / horizontal) * CAMERA_SETTINGS.wallClearance,
            startZ: camera.z + (basis.f[2] / horizontal) * CAMERA_SETTINGS.wallClearance
        };
    });

    // Distância da câmera mais próxima que vê o ponto (x, z), ou Infinity
    const seenDistance = (x, z, limit = Infinity) => {
        let best = limit;
        for (const camera of prepared) {
            const vx = x - camera.x, vy = targetY - camera.y, vz = z - camera.z;
            const distance = Math.sqrt(vx * vx + vy * vy + vz * vz);
            if (distance >= best || distance > camera.maxRange) continue;

            const { f, r, u } = camera.basis;
            const forward = vx * f[0] + vy * f[1] + vz * f[2];
            if (forward <= 0) continue;
            const right = vx * r[0] + vy * r[1] + vz * r[2];
            const up = vx * u[0] + vy * u[1] + vz * u[2];
            if (Math.abs(right) > camera.tanH * forward || Math.abs(up) > camera.tanV * forward) continue;

            if (segmentGrid.lossAlong(camera.startX, camera.startZ, x, z, blocks) > 0) continue;
            best = distance;
        }
        return best;
    };

    let lastYield = performance.now();
    for (let row = 0; row < rows; row++) {
        const z = bounds[1] + (row + 0.5) * cellSize;
        for (let col = 0; col < cols; col++) {
            const x = bounds[0] + (col + 0.5) * cellSize;
            const index = row * cols + col;

            let nearest = Infinity;
            for (const camera of prepared) {
                const d = Math.hypot(x - camera.x, targetY - camera.y, z - camera.z);
                if (d < nearest) nearest = d;
            }

            const center = seenDistance(x, z);
            let seen = 0;
            let best = center;
            for (const ox of SUB) {
                for (const oz of SUB) {
                    const d = seenDistance(x + ox * cellSize, z + oz * cellSize);
                    if (Number.isFinite(d)) {
                        seen++;
                        if (!Number.isFinite(best)) best = d;
                    }
                }
            }

            visibility[index] = seen / 4;
            grid[index] = -(Number.isFinite(best) ? best : (Number.isFinite(nearest) ? nearest : 1000));
        }

        if (performance.now() - lastYield > yieldEveryMs) {
            if (shouldCancel()) return null;
            onProgress((row + 1) / rows);
            await new Promise((resolve) => setTimeout(resolve, 0));
            lastYield = performance.now();
        }
    }
    onProgress(1);
    return { grid, visibility, cols, rows };
}

/** Área (m²) vista em cada nível DORI, opcionalmente só sobre o piso. */
export function summarizeCameraGrid({ grid, visibility }, modelId, cellSize, mask = null) {
    const dori = CAMERA_MODELS[modelId].dori;
    const cellArea = cellSize * cellSize;
    const result = { identify: 0, recognize: 0, observe: 0, detect: 0, floor: 0 };
    for (let i = 0; i < grid.length; i++) {
        if (mask && !mask[i]) continue;
        result.floor += cellArea;
        if (visibility[i] < 0.5) continue;
        const distance = -grid[i];
        if (distance <= dori.identify) result.identify += cellArea;
        if (distance <= dori.recognize) result.recognize += cellArea;
        if (distance <= dori.observe) result.observe += cellArea;
        if (distance <= dori.detect) result.detect += cellArea;
    }
    return result;
}
