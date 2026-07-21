(function (global) {
    'use strict';

    const SECOES = [
        ['Pavimentos da estrutura', 'pavimentos'], ['Dados da alimentação elétrica', 'alimentacao'],
        ['Fatores de demanda', 'fatoresDemanda'], ['Quadros e proteções', 'quadrosProtecao'],
        ['Critérios de queda de tensão', 'quedaTensao'], ['Temperatura e fatores de correção', 'temperatura'],
        ['Pontos elétricos e composição das cargas', 'pontosEletricos'],
        ['Condutores e critérios de dimensionamento', 'condutores'], ['Quadros de carga', 'quadrosCarga']
    ];

    function limpar(value) {
        return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    }

    function esc(value) {
        return limpar(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function paragrafo(texto, estilo, options = {}) {
        const pPr = [estilo ? `<w:pStyle w:val="${estilo}"/>` : '', options.pageBreakBefore ? '<w:pageBreakBefore/>' : '',
            options.keepNext ? '<w:keepNext/>' : '', options.justify ? '<w:jc w:val="both"/>' : ''].join('');
        const rPr = options.bold ? '<w:b/>' : '';
        return `<w:p><w:pPr>${pPr}<w:spacing w:after="120"/></w:pPr><w:r><w:rPr>${rPr}<w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${esc(texto)}</w:t></w:r></w:p>`;
    }

    function ehNumero(texto) {
        return /^\s*[-+]?\d[\d.,%°º²³VAWkKmM/ Δ-]*\s*$/.test(texto || '');
    }

    function propriedadesCelula(cell, continuation) {
        return `<w:tcPr><w:tcW w:w="0" w:type="auto"/>${cell.colspan > 1 ? `<w:gridSpan w:val="${cell.colspan}"/>` : ''}${cell.rowspan > 1 ? '<w:vMerge w:val="restart"/>' : continuation ? '<w:vMerge/>' : ''}<w:tcMar><w:top w:w="50" w:type="dxa"/><w:left w:w="50" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="50" w:type="dxa"/></w:tcMar></w:tcPr>`;
    }

    function tabela(tabelaModelo) {
        if (!tabelaModelo?.linhas?.length) return '';
        const colunas = tabelaModelo.colunas || 1;
        const pendentes = Array(colunas).fill(0);
        const rows = tabelaModelo.linhas.map((row, rowIndex) => {
            let column = 0;
            let cellIndex = 0;
            const cells = [];
            while (column < colunas) {
                if (pendentes[column] > 0) {
                    cells.push(`<w:tc>${propriedadesCelula({ colspan: 1 }, true)}<w:p/></w:tc>`);
                    pendentes[column] -= 1;
                    column += 1;
                    continue;
                }
                const cell = row.celulas[cellIndex++];
                if (!cell) { column += 1; continue; }
                for (let offset = 0; offset < cell.colspan; offset += 1) if (cell.rowspan > 1) pendentes[column + offset] = cell.rowspan - 1;
                const align = ehNumero(cell.texto) ? 'right' : 'left';
                const bold = rowIndex === 0 || cell.cabecalho;
                cells.push(`<w:tc>${propriedadesCelula(cell, false)}<w:p><w:pPr><w:keepLines/><w:jc w:val="${align}"/></w:pPr><w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${colunas > 8 ? 16 : 18}"/><w:szCs w:val="${colunas > 8 ? 16 : 18}"/><w:color w:val="000000"/></w:rPr><w:t>${esc(cell.texto)}</w:t></w:r></w:p></w:tc>`);
                column += cell.colspan;
            }
            return `<w:tr><w:trPr>${rowIndex === 0 ? '<w:tblHeader/>' : ''}<w:cantSplit/></w:trPr>${cells.join('')}</w:tr>`;
        });
        const xml = `<w:tbl><w:tblPr><w:tblW w:w="100" w:type="pct"/><w:jc w:val="center"/><w:tblLayout w:type="autofit"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders></w:tblPr>${rows.join('')}</w:tbl>`;
        if (colunas <= 10) return xml;
        const portrait = '<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:pPr></w:p>';
        const landscape = '<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:pPr></w:p>';
        return `${portrait}${xml}${landscape}`;
    }

    function blocos(valor) {
        if (!valor) return [];
        if (Array.isArray(valor)) return valor;
        return [{ titulo: '', paragrafos: valor.paragrafos || [], tabelas: valor.tabelas || [] }];
    }

    function renderBlocos(valor) {
        return blocos(valor).map((bloco) => [
            bloco.titulo ? paragrafo(bloco.titulo, 'Ttulo3', { keepNext: true }) : '',
            ...(bloco.paragrafos || []).map((text) => paragrafo(text, '', { justify: true })),
            ...(bloco.tabelas || []).map(tabela)
        ].join('')).join('');
    }

    function tabelaResumo(registros) {
        if (!registros.length) return '';
        const headers = registros[0].cabecalhos || [];
        const indices = headers.map((_, i) => i).filter((i) => registros.some((r) => (r.valores?.[i] || '').trim()));
        const model = { colunas: indices.length, linhas: [{ celulas: indices.map((i) => ({ texto: headers[i], colspan: 1, rowspan: 1, cabecalho: true })) }] };
        registros.forEach((registro) => model.linhas.push({ celulas: indices.map((i) => ({ texto: registro.valores[i] || '', colspan: 1, rowspan: 1 })) }));
        return tabela(model);
    }

    function criarXml(modelo, detalhado) {
        const partes = [paragrafo('MEMORIAL DE CÁLCULO', 'Ttulo1', { pageBreakBefore: true, keepNext: true })];
        SECOES.forEach(([titulo, campo]) => {
            const conteudo = renderBlocos(modelo[campo]);
            if (conteudo) partes.push(paragrafo(titulo, 'Ttulo2', { keepNext: true }), conteudo);
        });
        partes.push(paragrafo('Relatório resumido de dimensionamento', 'Ttulo2', { keepNext: true }));
        const relatorio = modelo.relatorioDimensionamento || {};
        if (relatorio.quadros?.length) partes.push(paragrafo('Resumo dos quadros', 'Ttulo3', { keepNext: true }), tabelaResumo(relatorio.quadros));
        const circuitosPorQuadro = Object.groupBy ? Object.groupBy(relatorio.circuitos || [], (item) => item.quadro || 'Circuitos') : (relatorio.circuitos || []).reduce((acc, item) => ((acc[item.quadro || 'Circuitos'] ||= []).push(item), acc), {});
        Object.entries(circuitosPorQuadro).forEach(([quadro, registros]) => partes.push(paragrafo(quadro, 'Ttulo3', { keepNext: true }), tabelaResumo(registros)));
        if (!relatorio.quadros?.length && !relatorio.circuitos?.length) partes.push(paragrafo('Não foram encontradas tabelas consolidadas no relatório importado.', '', { justify: true }));
        if (detalhado && relatorio.secoes?.length) {
            partes.push(paragrafo('Relatório detalhado de circuitos', 'Ttulo2', { pageBreakBefore: true, keepNext: true }));
            partes.push(renderBlocos(relatorio.secoes));
        }
        return partes.join('');
    }

    function textoDoParagrafo(xml) {
        return xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }

    function inserirNoDocumento(zip, modelo, options = {}) {
        const file = zip.file('word/document.xml');
        if (!file) throw new Error('O template não contém word/document.xml.');
        let xml = file.asText();
        const memorial = criarXml(modelo, Boolean(options.detalhado));
        const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
        let pos = -1;
        for (let i = paragraphs.length - 1; i >= 0; i -= 1) {
            if (/CREA/i.test(textoDoParagrafo(paragraphs[i][0]))) {
                pos = paragraphs[Math.max(0, i - 1)].index;
                break;
            }
        }
        if (pos < 0) pos = xml.lastIndexOf('<w:sectPr');
        if (pos < 0) pos = xml.lastIndexOf('</w:body>');
        if (pos < 0) throw new Error('Não foi possível localizar o ponto de inserção no DOCX.');
        xml = `${xml.slice(0, pos)}${memorial}${xml.slice(pos)}`;
        new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror') && (() => { throw new Error('O XML gerado para o memorial de cálculo é inválido.'); })();
        zip.file('word/document.xml', xml);
    }

    global.DocxMemorialCalculo = { inserirNoDocumento, criarXml, tabela, esc };
})(window);