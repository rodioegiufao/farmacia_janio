export function setupEletrodutoAssociationExportShortcut({ viewer, setSearchStatus } = {}) {
    if (!viewer) {
        return;
    }

    document.addEventListener("keydown", async (event) => {
        const isShortcut = isEletrodutoShortcut(event);

        if (!isShortcut || event.repeat || isEditableTarget(event.target)) {
            return;
        }

        event.preventDefault();

        try {
            const shouldDownload = await requestEletrodutoDownloadConfirmation();
            if (!shouldDownload) {
                notify(setSearchStatus, "Download do relatório de s cancelado.", false);
                return;
            }

            const rows = collectEletrodutoRows(viewer);
            if (!rows.length) {
                notify(setSearchStatus, "Nenhum eletroduto com palavras-chave (0,6/1kV, 1,8KV, 450/750V, UTP-5e) foi encontrado para exportação.", true);
                return;
            }

            downloadRowsAsExcel(rows);
            notify(setSearchStatus, `Relatório gerado com ${rows.length} eletroduto(s).`, false);
        } catch (error) {
            console.error("Falha ao exportar relatório de eletrodutos:", error);
            notify(setSearchStatus, "Não foi possível gerar o relatório de eletrodutos.", true);
        }
    });
}

function requestEletrodutoDownloadConfirmation() {
    return new Promise((resolve) => {
        const existingDialog = document.getElementById("eletroduto-download-confirmation");
        if (existingDialog) {
            existingDialog.remove();
        }

        const overlay = document.createElement("div");
        overlay.id = "eletroduto-download-confirmation";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(7, 12, 25, 0.6);
            backdrop-filter: blur(2px);
            z-index: 10000;
            padding: 16px;
        `;

        const panel = document.createElement("div");
        panel.style.cssText = `
            width: min(420px, calc(100vw - 32px));
            background: rgba(20, 24, 39, 0.96);
            border: 1px solid rgba(148, 163, 184, 0.35);
            border-radius: 12px;
            box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
            color: #f8fafc;
            padding: 20px;
            font-family: inherit;
        `;

        const title = document.createElement("h3");
        title.textContent = "Baixar análise completa";
        title.style.cssText = "margin: 0 0 10px; font-size: 1.05rem;";

        const message = document.createElement("p");
        message.textContent = "Deseja baixar uma análise completa dos eletrodutos?";
        message.style.cssText = "margin: 0; color: #dbe3f3; line-height: 1.45;";

        const actions = document.createElement("div");
        actions.style.cssText = "display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px;";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Cancelar";
        cancelButton.style.cssText = `
            border: 1px solid rgba(148, 163, 184, 0.4);
            background: rgba(148, 163, 184, 0.18);
            color: #f8fafc;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
        `;

        const confirmButton = document.createElement("button");
        confirmButton.type = "button";
        confirmButton.textContent = "Baixar";
        confirmButton.style.cssText = `
            border: 1px solid rgba(56, 189, 248, 0.45);
            background: linear-gradient(135deg, #2563eb, #0ea5e9);
            color: #f8fafc;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
            font-weight: 600;
        `;

        const closeDialog = (result) => {
            overlay.remove();
            document.removeEventListener("keydown", handleEscape);
            resolve(Boolean(result));
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeDialog(false);
            }
        };

        cancelButton.addEventListener("click", () => closeDialog(false));
        confirmButton.addEventListener("click", () => closeDialog(true));
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeDialog(false);
            }
        });

        document.addEventListener("keydown", handleEscape);

        actions.appendChild(cancelButton);
        actions.appendChild(confirmButton);
        panel.appendChild(title);
        panel.appendChild(message);
        panel.appendChild(actions);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        confirmButton.focus();
    });
}

function isEletrodutoShortcut(event) {
    const key = String(event?.key || "").toLowerCase();
    const code = String(event?.code || "").toLowerCase();

    return key === "8" ||
        code === "digit8" ||
        code === "numpad8";
}

function collectEletrodutoRows(viewer) {
    const metaObjects = Object.values(viewer?.metaScene?.metaObjects || {});
    const targetTypes = new Set(["ifccablecarriersegment", "ifcflowsegment"]);

    return metaObjects
        .filter((metaObject) => targetTypes.has(normalizeLabel(metaObject?.type)))
        .map((metaObject) => {
            const associatedItems = getAssociatedItemsText(metaObject);
            const infrastructureLength = getInfrastructureLength(metaObject);
            const {
                uniqueGauges,
                totalCableOccurrences,
                quantitiesByGauge
            } = extractCableGaugeQuantitiesByInfrastructureLength(associatedItems, infrastructureLength);
            const operatingVoltages = extractOperatingVoltages(associatedItems);
            const realCableQuantity = calculateRealCableQuantity(metaObject);
            const cableOccupancyAreaMm2 = calculateCableOccupancyAreaByEletroduto(associatedItems, infrastructureLength);
            const internalInfrastructureAreaMm2 = calculateInternalInfrastructureArea(metaObject, realCableQuantity);
            const { ifcCode, ifcName } = splitIfcCodeAndName(metaObject);
            const identificationClassOrType = getIdentificationElementClassOrType(metaObject);
            const isTubulacao = isTubulacaoType(identificationClassOrType);
            return {
                ifcCode,
                ifcName,
                ifcType: String(metaObject?.type || "Sem tipo"),
                isTubulacao: isTubulacao ? "Sim" : "Não",
                associatedItems,
                cableGauges: uniqueGauges.join(" | "),
                cableGaugeCount: totalCableOccurrences,
                cableQuantitiesByGauge: quantitiesByGauge,
                realCableQuantity,
                operatingVoltages: operatingVoltages.join(" | "),
                cableOccupancyAreaMm2,
                internalInfrastructureAreaMm2,
                status: associatedItems ? "OK" : "NÃO OK"
            };
        })
        .filter((row) => hasRequiredKeyword(row.associatedItems));
}

const REQUIRED_ASSOCIATED_ITEM_KEYWORDS = [
    "0,6/1kV",
    "1,8KV",
    "450/750V",
    "UTP-5e"
];

const CABLE_OUTER_DIAMETER_MM_BY_VOLTAGE_AND_GAUGE = {
    "0,6/1kv": {
        "1,5": 4.8,
        "2,5": 5.2,
        "4": 5.7,
        "6": 6.3,
        "10": 7.4,
        "16": 9,
        "25": 10.3,
        "35": 12.4,
        "50": 13.8,
        "70": 15.7,
        "95": 17.6,
        "120": 19.2,
        "150": 21.8,
        "185": 23.6,
        "240": 26.6,
        "300": 30.6
    },
    "450/750v": {
        "1,5": 2.9,
        "2,5": 3.5,
        "4": 4,
        "6": 4.6,
        "10": 5.9,
        "16": 7.5,
        "25": 8.6,
        "35": 10.6,
        "50": 12,
        "70": 13.7,
        "95": 15.8
    }
};

function hasRequiredKeyword(associatedItemsText) {
    const normalizedAssociatedItems = normalizeLabel(associatedItemsText);
    if (!normalizedAssociatedItems) {
        return false;
    }

    return REQUIRED_ASSOCIATED_ITEM_KEYWORDS.some((keyword) =>
        normalizedAssociatedItems.includes(normalizeLabel(keyword))
    );
}

function getAssociatedItemsText(metaObject) {
    const pset = getPropertySetByName(metaObject, "AltoQi_QiBuilder-Itens_Associados");
    if (!pset || !Array.isArray(pset.properties)) {
        return "";
    }

    const values = pset.properties
        .map((prop) => {
            const propName = String(prop?.name || prop?.id || "").trim();
            const propValue = formatIfcPropertyValue(prop?.value).trim();
            const combined = [propName, propValue].filter(Boolean).join(": ");
            return combined;
        })
        .filter(Boolean);

    return values.join(" | ");
}

function getIdentificationElementClassOrType(metaObject) {
    const identificationSetNames = [
        "Identificação_Elemento",
        "Identificacao_Elemento",
        "Identificação Elemento",
        "Identificacao Elemento"
    ];
    const propertySet = getPropertySetByNames(metaObject, identificationSetNames);
    if (!propertySet || !Array.isArray(propertySet.properties)) {
        return "";
    }

    const classeProperty = propertySet.properties.find((prop) => {
        const propName = normalizeLabel(prop?.name || prop?.id || "");
        return propName === "classe" || propName === "class";
    });

    if (classeProperty) {
        return normalizeLabel(formatIfcPropertyValue(classeProperty?.value));
    }

    const tipoProperty = propertySet.properties.find((prop) => {
        const propName = normalizeLabel(prop?.name || prop?.id || "");
        return propName === "tipo" || propName === "type";
    });

    return normalizeLabel(formatIfcPropertyValue(tipoProperty?.value));
}

const TUBULACAO_KEYWORDS = ["eletroduto", "perfilado", "eletrocalha"];
const INFRASTRUCTURE_ASSOCIATED_ITEM_PATTERNS = [
    "eletrocalha furada tipo u pre-galv. quen - eletrocalha perfurada tipo u",
    "eletroduto pvc flexivel - eletroduto leve",
    "perfilados perfurados - galvanizados a fogo",
    "sinapi - metros - eletroduto flexivel"
].map((pattern) => normalizeLabel(pattern));

function isTubulacaoType(identificationType) {
    const normalizedType = normalizeLabel(identificationType);
    if (!normalizedType) {
        return false;
    }

    return TUBULACAO_KEYWORDS.some((keyword) => normalizedType.includes(keyword));
}

function getPropertySetByName(metaObject, targetName) {
    if (!metaObject?.propertySets?.length) {
        return null;
    }

    const normalizedTarget = normalizeLabel(targetName);
    return (
        metaObject.propertySets.find((propertySet) => {
            const propertySetName = propertySet?.name || propertySet?.id || "";
            return normalizeLabel(propertySetName) === normalizedTarget;
        }) || null
    );
}

function getPropertySetByNames(metaObject, targetNames = []) {
    if (!Array.isArray(targetNames) || !targetNames.length) {
        return null;
    }

    for (const targetName of targetNames) {
        const propertySet = getPropertySetByName(metaObject, targetName);
        if (propertySet) {
            return propertySet;
        }
    }

    return null;
}

function formatIfcPropertyValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => formatIfcPropertyValue(item)).filter(Boolean).join(", ");
    }

    if (typeof value === "object") {
        const candidates = [value.value, value.nominalValue, value.rawValue, value.label, value.name];
        for (const candidate of candidates) {
            const formatted = formatIfcPropertyValue(candidate);
            if (formatted) {
                return formatted;
            }
        }

        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    return String(value);
}

function normalizeLabel(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function extractCableGauges(text) {
    const source = String(text || "");
    if (!source) {
        return [];
    }

    const matches = source.match(/\d+(?:[.,]\d+)?\s*mm(?:\^?2|²)/gi) || [];
    return matches.map((value) =>
        value
            .replace(/\s+/g, " ")
            .replace(/mm\^?2\b/gi, "mm²")
            .trim()
    );
}

function extractCableGaugeSummary(text) {
    const matches = extractCableGauges(text);
    const uniqueGauges = Array.from(new Set(matches));

    return {
        uniqueGauges,
        totalOccurrences: matches.length
   };
}

function extractCableGaugeQuantitiesByInfrastructureLength(associatedItemsText, infrastructureLength) {
    const source = String(associatedItemsText || "");
    if (!source) {
        return {
            uniqueGauges: [],
            totalCableOccurrences: 0,
            quantitiesByGauge: {}
        };
    }

    const quantitiesByGauge = {};
    const gaugeOrder = [];

    source
        .split("|")
        .map((chunk) => String(chunk || "").trim())
        .filter(Boolean)
        .forEach((chunk) => {
            const gauges = extractCableGauges(chunk);
            if (!gauges.length) {
                return;
            }

            const associatedLength = parseAssociatedLengthFromChunk(chunk);
            const cableQuantity = calculateCableQuantityByLength({
                associatedLength,
                infrastructureLength
            });

            gauges.forEach((gauge) => {
                if (!Object.prototype.hasOwnProperty.call(quantitiesByGauge, gauge)) {
                    quantitiesByGauge[gauge] = 0;
                    gaugeOrder.push(gauge);
                }
                quantitiesByGauge[gauge] += cableQuantity;
            });
        });

    const totalCableOccurrences = Object.values(quantitiesByGauge)
        .reduce((sum, quantity) => sum + quantity, 0);

    return {
        uniqueGauges: gaugeOrder,
        totalCableOccurrences,
        quantitiesByGauge
    };
}

function splitIfcCodeAndName(metaObject) {
    const rawName = String(metaObject?.name || "").trim();
    const fallbackName = String(metaObject?.name || metaObject?.id || "Sem nome");
    const explicitCode = getIfcCodeProperty(metaObject);

    if (explicitCode) {
        return {
            ifcCode: explicitCode,
            ifcName: rawName || fallbackName
        };
    }

    const match = rawName.match(/^(\d+(?:[.\-/]\d+)*)(?:\s*[-:|]\s*|\s+)(.+)$/);
    if (match) {
        return {
            ifcCode: match[1],
            ifcName: match[2].trim() || fallbackName
        };
    }

    return {
        ifcCode: String(metaObject?.id || "-"),
        ifcName: fallbackName
    };
}

function getIfcCodeProperty(metaObject) {
    const propertySets = Array.isArray(metaObject?.propertySets) ? metaObject.propertySets : [];
    for (const set of propertySets) {
        const props = Array.isArray(set?.properties) ? set.properties : [];
        for (const prop of props) {
            const propName = normalizeLabel(prop?.name || prop?.id || "");
            if (propName === "codigo" || propName === "code") {
                const value = formatIfcPropertyValue(prop?.value).trim();
                if (value) {
                    return value;
                }
            }
        }
    }

    return "";
}

function extractOperatingVoltages(text) {
    const normalizedText = normalizeLabel(text);
    if (!normalizedText) {
        return [];
    }

    return REQUIRED_ASSOCIATED_ITEM_KEYWORDS.filter((keyword) =>
        normalizedText.includes(normalizeLabel(keyword))
    );
}

function calculateCableOccupancyAreaByEletroduto(associatedItemsText, infrastructureLength) {
    const source = String(associatedItemsText || "");
    if (!source) {
        return 0;
    }

    const normalizedSource = normalizeLabel(source);
    const fallbackVoltageClass = getVoltageClassFromText(normalizedSource);
    const totalAreaByChunk = source
        .split("|")
        .map((chunk) => String(chunk || "").trim())
        .filter(Boolean)
        .reduce((sum, chunk) => {
            const chunkArea = calculateCableOccupancyAreaFromChunk({
                chunk,
                infrastructureLength,
                fallbackVoltageClass
            });
            return sum + chunkArea;
        }, 0);

    if (totalAreaByChunk > 0) {
        return roundToTwoDecimals(totalAreaByChunk);
    }

    if (!fallbackVoltageClass) {
        return 0;
    }

    const totalAreaByFallback = extractCableGauges(source).reduce((sum, gauge) => {
        const area = getCableAreaByGaugeAndVoltage(gauge, fallbackVoltageClass);
        return sum + area;
    }, 0);

    return roundToTwoDecimals(totalAreaByFallback);
}

function calculateInternalInfrastructureArea(metaObject, cableQuantity = 1) {
    const validCableQuantity = Number.isFinite(cableQuantity) && cableQuantity > 0
        ? cableQuantity
        : 1;
    const altoQiBuilderSet = getPropertySetByName(metaObject, "AltoQi_Builder");
    const internalDiameterProperty = findPropertyByNames(
        altoQiBuilderSet,
        ["Diâmetro interno", "Diametro interno", "Internal diameter"]
    );
    const internalDiameterValue = formatIfcPropertyValue(internalDiameterProperty?.value).trim();
    const internalDiameterMm = convertInternalDiameterToMillimeters({
        rawDiameterValue: internalDiameterValue,
        nominalDiameterValue: getNominalDiameterValue(altoQiBuilderSet)
    });

    if (Number.isFinite(internalDiameterMm) && internalDiameterMm > 0) {
        const internalAreaByCable = (Math.PI * internalDiameterMm * internalDiameterMm) / 4;
        return roundToTwoDecimals(internalAreaByCable * validCableQuantity);
    }

    const baseProperty = findPropertyByNames(altoQiBuilderSet, ["Base"]);
    const heightProperty = findPropertyByNames(altoQiBuilderSet, ["Altura", "Height"]);
    const baseCentimeters = parseLocalizedNumber(formatIfcPropertyValue(baseProperty?.value).trim());
    const heightCentimeters = parseLocalizedNumber(formatIfcPropertyValue(heightProperty?.value).trim());

    if (!Number.isFinite(baseCentimeters) || !Number.isFinite(heightCentimeters) || baseCentimeters <= 0 || heightCentimeters <= 0) {
        return 0;
    }

    const baseMillimeters = baseCentimeters * 10;
    const heightMillimeters = heightCentimeters * 10;
    return roundToTwoDecimals(baseMillimeters * heightMillimeters * validCableQuantity);
}

function getNominalDiameterValue(propertySet) {
    const nominalDiameterProperty = findPropertyByNames(
        propertySet,
        ["Diâmetro", "Diametro", "Nominal diameter"]
    );

    return formatIfcPropertyValue(nominalDiameterProperty?.value).trim();
}

function findPropertyByNames(propertySet, propertyNames = []) {
    if (!propertySet || !Array.isArray(propertySet.properties) || !propertyNames.length) {
        return null;
    }

    const normalizedPropertyNames = new Set(propertyNames.map((name) => normalizeLabel(name)));
    return propertySet.properties.find((property) =>
        normalizedPropertyNames.has(normalizeLabel(property?.name || property?.id || ""))
    ) || null;
}

function convertInternalDiameterToMillimeters({ rawDiameterValue, nominalDiameterValue }) {
    const normalizedRaw = normalizeLabel(rawDiameterValue);
    const numericDiameter = parseLocalizedNumber(rawDiameterValue);
    if (!Number.isFinite(numericDiameter)) {
        return 0;
    }

    if (normalizedRaw.includes("mm")) {
        return numericDiameter;
    }

    if (normalizedRaw.includes("cm")) {
        return numericDiameter * 10;
    }

    if (normalizedRaw.includes("\"") || normalizedRaw.includes("pol")) {
        return numericDiameter * 25.4;
    }

    if (normalizeLabel(nominalDiameterValue).includes("\"")) {
        return numericDiameter * 10;
    }

    if (numericDiameter > 50) {
        return numericDiameter;
    }

    return numericDiameter * 10;
}

function parseLocalizedNumber(value) {
    const source = String(value || "");
    const numericMatch = source.match(/-?\d+(?:[.,]\d+)?/);
    if (!numericMatch) {
        return Number.NaN;
    }

    const normalized = numericMatch[0].replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function calculateRealCableQuantity(metaObject) {
    const infrastructureLength = getInfrastructureLength(metaObject);
    if (!Number.isFinite(infrastructureLength) || infrastructureLength <= 0) {
        return 1;
    }

    const associatedItemsSet = getPropertySetByName(metaObject, "AltoQi_QiBuilder-Itens_Associados");
    if (!associatedItemsSet || !Array.isArray(associatedItemsSet.properties)) {
        return 1;
    }

    const validRatios = associatedItemsSet.properties
        .filter((property) => {
            const propertyName = normalizeLabel(property?.name || property?.id || "");
            return INFRASTRUCTURE_ASSOCIATED_ITEM_PATTERNS.some((pattern) => propertyName.includes(pattern));
        })
        .map((property) => parseLocalizedNumber(formatIfcPropertyValue(property?.value).trim()))
        .filter((value) => Number.isFinite(value) && value >= infrastructureLength)
        .map((associatedLength) => {
            if (Math.abs(associatedLength - infrastructureLength) < 1e-6) {
                return 1;
            }

            return associatedLength / infrastructureLength;
        });

    if (validRatios.length) {
        return roundToTwoDecimals(Math.max(...validRatios));
    }

    for (const property of associatedItemsSet.properties) {
        const propertyName = normalizeLabel(property?.name || property?.id || "");
        const hasTubulacaoKeyword = TUBULACAO_KEYWORDS.some((keyword) =>
            propertyName.includes(normalizeLabel(keyword))
        );

        if (!hasTubulacaoKeyword) {
            continue;
        }

        const associatedLength = parseLocalizedNumber(formatIfcPropertyValue(property?.value).trim());
        if (!Number.isFinite(associatedLength) || associatedLength <= infrastructureLength) {
            continue;
        }

        return roundToTwoDecimals(associatedLength / infrastructureLength);
    }

    return 1;
}

function getInfrastructureLength(metaObject) {
    const altoQiBuilderSet = getPropertySetByName(metaObject, "AltoQi_Builder");
    const lengthProperty = findPropertyByNames(
        altoQiBuilderSet,
        ["Comprimento", "Length"]
    );
    const parsedLength = parseLocalizedNumber(formatIfcPropertyValue(lengthProperty?.value).trim());
    return Number.isFinite(parsedLength) ? parsedLength : 0;
}

function hasLengthUnitInPropertyName(propertyName) {
    const normalizedName = normalizeLabel(propertyName);
    if (!normalizedName) {
        return false;
    }

    return /\bmetros?\b/.test(normalizedName) ||
        /\bmm\b/.test(normalizedName) ||
        /\bm\b/.test(normalizedName);
}

function calculateCableOccupancyAreaFromChunk({ chunk, infrastructureLength, fallbackVoltageClass = "" }) {
    const voltageClass = getVoltageClassFromText(chunk) || fallbackVoltageClass;
    if (!voltageClass) {
        return 0;
    }

    const associatedLength = parseAssociatedLengthFromChunk(chunk);
    const cableQuantity = calculateCableQuantityByLength({
        associatedLength,
        infrastructureLength
    });

    return extractCableGauges(chunk).reduce((sum, gauge) => {
        const cableArea = getCableAreaByGaugeAndVoltage(gauge, voltageClass);
        return sum + (cableArea * cableQuantity);
    }, 0);
}

function parseAssociatedLengthFromChunk(chunk) {
    const source = String(chunk || "");
    if (!source) {
        return Number.NaN;
    }

    const colonSections = source.split(":");
    if (colonSections.length > 1) {
        const trailingSection = colonSections[colonSections.length - 1];
        const parsedTrailing = parseLocalizedNumber(trailingSection);
        if (Number.isFinite(parsedTrailing)) {
            return parsedTrailing;
        }
    }

    const numericMatches = Array.from(source.matchAll(/-?\d+(?:[.,]\d+)?/g));
    if (!numericMatches.length) {
        return Number.NaN;
    }

    const lastNumericValue = numericMatches[numericMatches.length - 1]?.[0] || "";
    return parseLocalizedNumber(lastNumericValue);
}

function calculateCableQuantityByLength({ associatedLength, infrastructureLength, tolerance = 0.01 }) {
    if (!Number.isFinite(associatedLength) || associatedLength <= 0) {
        return 1;
    }

    if (!Number.isFinite(infrastructureLength) || infrastructureLength <= 0) {
        return 1;
    }

    const ratio = associatedLength / infrastructureLength;
    const nearestInteger = Math.round(ratio);
    if (nearestInteger >= 1 && Math.abs(ratio - nearestInteger) <= tolerance) {
        return nearestInteger;
    }

    return 1;
}

function getVoltageClassFromText(text) {
    const normalized = normalizeLabel(text);

    if (normalized.includes("0,6/1kv") || normalized.includes("0.6/1kv")) {
        return "0,6/1kv";
    }

    if (normalized.includes("450/750v")) {
        return "450/750v";
    }

    return "";
}

function getCableAreaByGaugeAndVoltage(gaugeLabel, voltageClass) {
    const normalizedGauge = normalizeGaugeKey(gaugeLabel);
    const outerDiameter = CABLE_OUTER_DIAMETER_MM_BY_VOLTAGE_AND_GAUGE?.[voltageClass]?.[normalizedGauge];
    if (!outerDiameter) {
        return 0;
    }

    return (Math.PI * outerDiameter * outerDiameter) / 4;
}

function normalizeGaugeKey(gaugeLabel) {
    const numericMatch = String(gaugeLabel || "").match(/\d+(?:[.,]\d+)?/);
    if (!numericMatch) {
        return "";
    }

    return numericMatch[0].replace(".", ",");
}

function roundToTwoDecimals(value) {
    return Number(value.toFixed(2));
}

function downloadRowsAsExcel(rows) {
    const excelRows = rows
        .map(
            (row) => `
        <Row ss:StyleID="${row.status === "OK" ? "OkRow" : "NotOkRow"}">
            <Cell><Data ss:Type="String">${escapeXml(row.ifcCode || "-")}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.ifcName)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.ifcType)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.isTubulacao)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.associatedItems || "Sem itens associados")}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.cableGauges || "-")}</Data></Cell>
            <Cell><Data ss:Type="Number">${row.cableGaugeCount || 0}</Data></Cell>
            <Cell><Data ss:Type="Number">${row.realCableQuantity || 0}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.operatingVoltages || "-")}</Data></Cell>
            <Cell><Data ss:Type="Number">${row.cableOccupancyAreaMm2 || 0}</Data></Cell>
            <Cell><Data ss:Type="Number">${row.internalInfrastructureAreaMm2 || 0}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.status)}</Data></Cell>
        </Row>`
        )
        .join("");

    const spreadsheetXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
    <Styles>
        <Style ss:ID="Header">
            <Font ss:Bold="1" />
            <Interior ss:Color="#D9E1F2" ss:Pattern="Solid" />
        </Style>
        <Style ss:ID="OkRow">
            <Interior ss:Color="#E2F0D9" ss:Pattern="Solid" />
        </Style>
        <Style ss:ID="NotOkRow">
            <Interior ss:Color="#FCE4D6" ss:Pattern="Solid" />
        </Style>
    </Styles>
    <Worksheet ss:Name="Eletrodutos">
        <Table>
            <Row ss:StyleID="Header">
                <Cell><Data ss:Type="String">Código IFC</Data></Cell>
                <Cell><Data ss:Type="String">Nome IFC</Data></Cell>
                <Cell><Data ss:Type="String">Tipo IFC</Data></Cell>
                <Cell><Data ss:Type="String">Tubulação</Data></Cell>
                <Cell><Data ss:Type="String">AltoQi_QiBuilder-Itens_Associados</Data></Cell>
                <Cell><Data ss:Type="String">Bitola(s) dos cabos</Data></Cell>
                <Cell><Data ss:Type="String">Qtd. de ocorrências de bitola(s)</Data></Cell>
                <Cell><Data ss:Type="String">Qtd. de cabos</Data></Cell>
                <Cell><Data ss:Type="String">Tensão(ões) de trabalho</Data></Cell>
                <Cell><Data ss:Type="String">Área ocupada por cabos (mm²)</Data></Cell>
                <Cell><Data ss:Type="String">Área interna da infraestrutura (mm²)</Data></Cell>
                <Cell><Data ss:Type="String">Status</Data></Cell>
            </Row>
            ${excelRows}
        </Table>
    </Worksheet>
</Workbook>`;

    const blob = new Blob([spreadsheetXml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    link.href = url;
    link.download = `eletrodutos_associados_${timestamp}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function isEditableTarget(target) {
    return target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
}

function notify(setSearchStatus, message, isError) {
    if (typeof setSearchStatus === "function") {
        setSearchStatus(message, Boolean(isError));
        return;
    }

    if (isError) {
        console.warn(message);
    } else {
        console.info(message);
    }
}
