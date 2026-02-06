export function downloadMaterialsAsExcel(items, normalizeSearchText) {
    if (!Array.isArray(items) || !items.length) {
        return;
    }

    const rows = items.map((item) => `
        <Row>
            <Cell><Data ss:Type="String">${sanitizeSpreadsheetCell(item.name)}</Data></Cell>
            <Cell><Data ss:Type="Number">${Number.isFinite(item.quantity) ? item.quantity : 0}</Data></Cell>
            <Cell><Data ss:Type="String">${sanitizeSpreadsheetCell(item.unitLabel)}</Data></Cell>
        </Row>
    `).join("");

    const associationDefinitions = [
        {
            codigo: "96985",
            base: "SINAPI",
            descricao: "HASTE DE ATERRAMENTO, DIÂMETRO 5/8\", COM 3 METROS - FORNECIMENTO E INSTALAÇÃO. AF_08/2023",
            unidade: "UN",
            itemDescricao: "Aterramento - Haste de aterramento - cobreada - 5/8\" x 2,40m"
        },
        {
            codigo: "104753",
            base: "SINAPI",
            descricao: "CONECTOR SPLIT-BOLT, PARA SPDA, PARA CABOS ATÉ 50 MM2 - FORNECIMENTO E INSTALAÇÃO. AF_08/2023",
            unidade: "UN",
            itemDescricao: "Aterramento - Conector tipo \"U\" - 5/8\""
        },
        {
            codigo: "981111",
            base: "SINAPI",
            descricao: "CAIXA DE INSPEÇÃO PARA ATERRAMENTO, CIRCULAR, EM POLIETILENO, DIÂMETRO INTERNO = 0,3 M. AF_12/2020",
            unidade: "UN",
            itemDescricao: "Aterramento - Caixa de inspeção - Polipropileno - Ø300x400mm"
        }
    ];

    const associationRows = associationDefinitions.map((association) => `
        <Row>
            <Cell><Data ss:Type="String">${sanitizeSpreadsheetCell(association.codigo)}</Data></Cell>
            <Cell><Data ss:Type="String">${sanitizeSpreadsheetCell(association.base)}</Data></Cell>
            <Cell><Data ss:Type="String">${sanitizeSpreadsheetCell(association.descricao)}</Data></Cell>
            <Cell><Data ss:Type="String">${sanitizeSpreadsheetCell(association.unidade)}</Data></Cell>
            <Cell><Data ss:Type="Number">${getMaterialQuantityByDescription(items, association.itemDescricao, normalizeSearchText)}</Data></Cell>
        </Row>
    `).join("");

    const spreadsheetXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
    <Worksheet ss:Name="Materiais">
        <Table>
            <Row>
                <Cell><Data ss:Type="String">Descrição</Data></Cell>
                <Cell><Data ss:Type="String">Quantidade</Data></Cell>
                <Cell><Data ss:Type="String">Unidade</Data></Cell>
            </Row>
            ${rows}
        </Table>
    </Worksheet>
    <Worksheet ss:Name="Associacoes">
        <Table>
            <Row>
                <Cell><Data ss:Type="String">CÓDIGO</Data></Cell>
                <Cell><Data ss:Type="String">BASE</Data></Cell>
                <Cell><Data ss:Type="String">DESCRIÇÃO</Data></Cell>
                <Cell><Data ss:Type="String">UNIDADE</Data></Cell>
                <Cell><Data ss:Type="String">QUANTIDADE</Data></Cell>
            </Row>
            ${associationRows}
        </Table>
    </Worksheet>
</Workbook>`;

    const blob = new Blob([spreadsheetXml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    link.href = url;
    link.download = `lista_materiais_${dateStamp}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function sanitizeSpreadsheetCell(value) {
    const text = String(value ?? "");
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function getMaterialQuantityByDescription(items, description, normalizeSearchText) {
    const normalizedDescription = normalizeSearchText(description);
    const match = items.find((item) =>
        normalizeSearchText(item.name) === normalizedDescription);
    return Number.isFinite(match?.quantity) ? match.quantity : 0;
}