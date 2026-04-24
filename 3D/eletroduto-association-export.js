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
            const { uniqueGauges, totalOccurrences } = extractCableGaugeSummary(associatedItems);
            const operatingVoltages = extractOperatingVoltages(associatedItems);
            const { ifcCode, ifcName } = splitIfcCodeAndName(metaObject);
            const identificationType = getIdentificationElementType(metaObject);
            const isTubulacao = isTubulacaoType(identificationType);
            return {
                ifcCode,
                ifcName,
                ifcType: String(metaObject?.type || "Sem tipo"),
                isTubulacao: isTubulacao ? "Sim" : "Não",
                associatedItems,
                cableGauges: uniqueGauges.join(" | "),
                cableGaugeCount: totalOccurrences,
                operatingVoltages: operatingVoltages.join(" | "),
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

function getIdentificationElementType(metaObject) {
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

    const tipoProperty = propertySet.properties.find((prop) => {
        const propName = normalizeLabel(prop?.name || prop?.id || "");
        return propName === "tipo" || propName === "type";
    });

    return normalizeLabel(formatIfcPropertyValue(tipoProperty?.value));
}

const TUBULACAO_KEYWORDS = ["eletroduto", "perfilado", "eletrocalha"];

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
            <Cell><Data ss:Type="String">${escapeXml(row.operatingVoltages || "-")}</Data></Cell>
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
                <Cell><Data ss:Type="String">Tensão(ões) de trabalho</Data></Cell>
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
