export function setupEletrodutoAssociationExportShortcut({ viewer, setSearchStatus } = {}) {
    if (!viewer) {
        return;
    }

    document.addEventListener("keydown", async (event) => {
        const key = event.key?.toLowerCase();
        const isShortcut = event.ctrlKey && event.shiftKey && key === "e";

        if (!isShortcut || event.repeat || isEditableTarget(event.target)) {
            return;
        }

        event.preventDefault();

        try {
            const rows = collectEletrodutoRows(viewer);
            if (!rows.length) {
                notify(setSearchStatus, "Nenhum eletroduto dos tipos IfcCableCarrierSegment/IfcFlowSegment foi encontrado para exportação.", true);
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

function collectEletrodutoRows(viewer) {
    const metaObjects = Object.values(viewer?.metaScene?.metaObjects || {});
    const targetTypes = new Set(["ifccablecarriersegment", "ifcflowsegment"]);

    return metaObjects
        .filter((metaObject) => targetTypes.has(normalizeLabel(metaObject?.type)))
        .map((metaObject) => {
            const associatedItems = getAssociatedItemsText(metaObject);
            return {
                ifcName: String(metaObject?.name || metaObject?.id || "Sem nome"),
                ifcType: String(metaObject?.type || "Sem tipo"),
                associatedItems,
                status: associatedItems ? "OK" : "NÃO OK"
            };
        });
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

function downloadRowsAsExcel(rows) {
    const excelRows = rows
        .map(
            (row) => `
        <Row ss:StyleID="${row.status === "OK" ? "OkRow" : "NotOkRow"}">
            <Cell><Data ss:Type="String">${escapeXml(row.ifcName)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.ifcType)}</Data></Cell>
            <Cell><Data ss:Type="String">${escapeXml(row.associatedItems || "Sem itens associados")}</Data></Cell>
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
                <Cell><Data ss:Type="String">Nome IFC</Data></Cell>
                <Cell><Data ss:Type="String">Tipo IFC</Data></Cell>
                <Cell><Data ss:Type="String">AltoQi_QiBuilder-Itens_Associados</Data></Cell>
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
