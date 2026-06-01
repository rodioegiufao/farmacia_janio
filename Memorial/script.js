const TEMPLATE_URL = '/Memorial/templates/MEM-DESCRITIVO-ELÉTRICO.docx';
const TEMPLATE_NAME = 'MEM-DESCRITIVO-ELÉTRICO';
const MEMORIAL_DATABASE_URL = '/Memorial/base_de_dados_memorial.xlsx';
const TOMADAS_PLACEHOLDER = '__MEMORIAL_TOMADAS_SELECIONADAS__';

const MESES_PT_BR = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
];

let documentosGerados = [];
let dadosProcessados = {};
let materiaisTomada = [];

document.addEventListener('DOMContentLoaded', function() {
    initThemeSelector();
    setupDefaultDatePlaceholders();
    checkTemplate();
    setupEventListeners();
    setupAutomaticIsolationVoltages();
    carregarMateriaisTomada();
});

function setupDefaultDatePlaceholders() {
    const hoje = new Date();
    const mesAtual = MESES_PT_BR[hoje.getMonth()].toUpperCase();
    const anoAtual = hoje.getFullYear().toString();
    const mesAtualInput = document.getElementById('mes_atual');
    const anoAtualInput = document.getElementById('ano_atual');

    if (mesAtualInput) mesAtualInput.value = mesAtual;
    if (anoAtualInput) anoAtualInput.value = anoAtual;

    dadosProcessados.MES_ATUAL = mesAtual;
    dadosProcessados.ANO_ATUAL = anoAtual;
}

async function checkTemplate() {
    const statusElement = document.getElementById('template-status');

    try {
        const response = await fetch(TEMPLATE_URL, { method: 'HEAD' });

        if (response.ok) {
            statusElement.innerHTML = `
                <p><i class="fas fa-check-circle" style="color: #27ae60;"></i>
                Template encontrado!</p>
                <small>Pronto para gerar o memorial em Word</small>
            `;
        } else {
            statusElement.innerHTML = `
                <p><i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i>
                Template não encontrado</p>
                <small>Verifique se o arquivo está em /Memorial/templates/</small>
            `;
        }
    } catch (error) {
        statusElement.innerHTML = `
            <p><i class="fas fa-times-circle" style="color: #e74c3c;"></i>
            Erro ao verificar template</p>
            <small>Verifique o console para detalhes</small>
        `;
        console.error('Erro ao verificar template:', error);
    }
}

const TENSAO_ISOLAMENTO_POR_ISOLACAO = {
    'PVC': '450/750V',
    'XLPE/EPR': '600/1000V'
};

const CAMPOS_ISOLAMENTO_AUTOMATICO = [
    { isolacaoId: 'isolacao_iluminacao', isolamentoId: 'isolamento_iluminacao' },
    { isolacaoId: 'isolacao_tomadas', isolamentoId: 'isolamento_tomadas' },
    { isolacaoId: 'isolacao_climatizacao', isolamentoId: 'isolamento_climatizacao' },
    { isolacaoId: 'isolacao_exaustao', isolamentoId: 'isolamento_exaustao' },
    { isolacaoId: 'isolacao_emergencia', isolamentoId: 'isolamento_emergencia' }
];

function setupAutomaticIsolationVoltages() {
    CAMPOS_ISOLAMENTO_AUTOMATICO.forEach(({ isolacaoId, isolamentoId }) => {
        const isolacao = document.getElementById(isolacaoId);
        const isolamento = document.getElementById(isolamentoId);

        if (!isolacao || !isolamento) return;

        updateIsolationVoltage(isolacao, isolamento);
        isolacao.addEventListener('change', () => updateIsolationVoltage(isolacao, isolamento));
    });
}

function atualizarTensoesIsolamentoAutomaticas() {
    CAMPOS_ISOLAMENTO_AUTOMATICO.forEach(({ isolacaoId, isolamentoId }) => {
        const isolacao = document.getElementById(isolacaoId);
        const isolamento = document.getElementById(isolamentoId);

        if (!isolacao || !isolamento) return;

        updateIsolationVoltage(isolacao, isolamento);
    });
}

function updateIsolationVoltage(isolacao, isolamento) {
    isolamento.value = TENSAO_ISOLAMENTO_POR_ISOLACAO[isolacao.value] || '';
}

async function carregarMateriaisTomada() {
    const container = document.getElementById('tomadas-material-options');
    if (!container) return;

    try {
        materiaisTomada = await carregarMateriaisDaPlanilhaTomada();
        renderizarOpcoesMateriaisTomada();
    } catch (error) {
        console.error('Erro ao carregar materiais de tomada:', error);
        container.innerHTML = `
            <p class="material-options-status">
                <i class="fas fa-exclamation-triangle"></i>
                Não foi possível carregar a base de tomadas. Verifique o arquivo base_de_dados_memorial.xlsx.
            </p>
        `;
    }
}

async function carregarMateriaisDaPlanilhaTomada() {
    const response = await fetch(MEMORIAL_DATABASE_URL);
    if (!response.ok) {
        throw new Error(`Base de dados não encontrada: ${MEMORIAL_DATABASE_URL}`);
    }

    const workbookBuffer = await response.arrayBuffer();
    const workbookZip = await JSZip.loadAsync(workbookBuffer);
    const parser = new DOMParser();
    const sharedStrings = await lerSharedStrings(workbookZip, parser);
    const sheetPath = await obterCaminhoDaPlanilha(workbookZip, parser, 'tomada');
    const imageByMetadataIndex = await mapearImagensRichValue(workbookZip, parser);
    const sheetXml = await workbookZip.file(sheetPath).async('text');
    const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
    const rows = Array.from(sheetDoc.getElementsByTagNameNS('*', 'row'));
    const materiais = [];

    for (const row of rows) {
        const rowNumber = Number(row.getAttribute('r'));
        if (!rowNumber || rowNumber < 2) continue;

        const cells = Array.from(row.getElementsByTagNameNS('*', 'c'));
        const cellsByColumn = cells.reduce((map, cell) => {
            const column = (cell.getAttribute('r') || '').replace(/[0-9]/g, '');
            map[column] = cell;
            return map;
        }, {});

        const nome = lerValorCelula(cellsByColumn.A, sharedStrings).trim();
        if (!nome) continue;

        const descricao = lerValorCelula(cellsByColumn.B, sharedStrings).trim();
        const nomeImagem = lerValorCelula(cellsByColumn.D, sharedStrings).trim();
        const vm = cellsByColumn.C?.getAttribute('vm');
        const imageInfo = vm ? imageByMetadataIndex.get(Number(vm) - 1) : null;
        let imageData = null;

        if (imageInfo?.path && workbookZip.file(imageInfo.path)) {
            imageData = await workbookZip.file(imageInfo.path).async('uint8array');
        }

        materiais.push({
            id: `tomada-${rowNumber}`,
            rowNumber,
            nome,
            descricao,
            nomeImagem,
            imagePath: imageInfo?.path || '',
            imageExtension: imageInfo?.extension || 'png',
            imageContentType: imageInfo?.contentType || 'image/png',
            imageData
        });
    }

    return materiais;
}

async function lerSharedStrings(workbookZip, parser) {
    const file = workbookZip.file('xl/sharedStrings.xml');
    if (!file) return [];

    const xml = await file.async('text');
    const doc = parser.parseFromString(xml, 'application/xml');
    return Array.from(doc.getElementsByTagNameNS('*', 'si')).map((item) => item.textContent || '');
}

async function obterCaminhoDaPlanilha(workbookZip, parser, sheetName) {
    const workbookXml = await workbookZip.file('xl/workbook.xml').async('text');
    const workbookDoc = parser.parseFromString(workbookXml, 'application/xml');
    const sheet = Array.from(workbookDoc.getElementsByTagNameNS('*', 'sheet'))
        .find((item) => item.getAttribute('name') === sheetName);

    if (!sheet) throw new Error(`Planilha não encontrada: ${sheetName}`);

    const relationId = sheet.getAttribute('r:id');
    const relsXml = await workbookZip.file('xl/_rels/workbook.xml.rels').async('text');
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const relationship = Array.from(relsDoc.getElementsByTagNameNS('*', 'Relationship'))
        .find((item) => item.getAttribute('Id') === relationId);

    if (!relationship) throw new Error(`Relacionamento da planilha não encontrado: ${sheetName}`);

    return normalizarCaminhoZip('xl/' + relationship.getAttribute('Target'));
}

async function mapearImagensRichValue(workbookZip, parser) {
    const result = new Map();
    const richValueRelFile = workbookZip.file('xl/richData/richValueRel.xml');
    const richValueRelRelsFile = workbookZip.file('xl/richData/_rels/richValueRel.xml.rels');
    const richValueFile = workbookZip.file('xl/richData/rdrichvalue.xml');
    if (!richValueRelFile || !richValueRelRelsFile || !richValueFile) return result;

    const relXml = await richValueRelFile.async('text');
    const relDoc = parser.parseFromString(relXml, 'application/xml');
    const relIdsByIndex = Array.from(relDoc.getElementsByTagNameNS('*', 'rel')).map((rel) => rel.getAttribute('r:id'));

    const relsXml = await richValueRelRelsFile.async('text');
    const relsDoc = parser.parseFromString(relsXml, 'application/xml');
    const imageTargetsById = new Map(Array.from(relsDoc.getElementsByTagNameNS('*', 'Relationship')).map((rel) => {
        const rawTarget = rel.getAttribute('Target') || '';
        const path = normalizarCaminhoZip('xl/richData/' + rawTarget);
        return [rel.getAttribute('Id'), path];
    }));

    const richValueXml = await richValueFile.async('text');
    const richValueDoc = parser.parseFromString(richValueXml, 'application/xml');
    Array.from(richValueDoc.getElementsByTagNameNS('*', 'rv')).forEach((rv, metadataIndex) => {
        const values = Array.from(rv.getElementsByTagNameNS('*', 'v')).map((value) => Number(value.textContent || 0));
        const relIndex = values[0];
        const relId = relIdsByIndex[relIndex];
        const path = imageTargetsById.get(relId);
        if (!path) return;

        const extension = (path.split('.').pop() || 'png').toLowerCase().replace('jpg', 'jpeg');
        result.set(metadataIndex, {
            path,
            extension,
            contentType: `image/${extension}`
        });
    });

    return result;
}

function normalizarCaminhoZip(path) {
    const parts = [];
    path.split('/').forEach((part) => {
        if (!part || part === '.') return;
        if (part === '..') parts.pop();
        else parts.push(part);
    });
    return parts.join('/');
}

function lerValorCelula(cell, sharedStrings) {
    if (!cell) return '';

    const value = cell.getElementsByTagNameNS('*', 'v')[0]?.textContent || '';
    if (cell.getAttribute('t') === 's') {
        return sharedStrings[Number(value)] || '';
    }

    return value;
}

function renderizarOpcoesMateriaisTomada() {
    const container = document.getElementById('tomadas-material-options');
    if (!container) return;

    if (!materiaisTomada.length) {
        container.innerHTML = '<p class="material-options-status">Nenhum material encontrado na aba tomada.</p>';
        return;
    }

    container.innerHTML = materiaisTomada.map((material, index) => `
        <label class="material-option">
            <input type="checkbox" name="materiais_tomada" value="${escapeHtml(material.id)}">
            <span>
                <strong>${escapeHtml(material.nome)}</strong>
                <span>${escapeHtml(material.nomeImagem || 'Imagem sem legenda')}</span>
            </span>
        </label>
    `).join('');
}

function obterMateriaisTomadaSelecionados() {
    const selectedIds = Array.from(document.querySelectorAll('input[name="materiais_tomada"]:checked')).map((input) => input.value);
    return selectedIds
        .map((id) => materiaisTomada.find((material) => material.id === id))
        .filter(Boolean);
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setupEventListeners() {
    const form = document.getElementById('document-form');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            processarFormulario();
        });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (form) form.reset();
            atualizarTensoesIsolamentoAutomaticas();
            documentosGerados = [];
            dadosProcessados = {};
            setupDefaultDatePlaceholders();
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) resultsSection.classList.add('hidden');
        });
    }

    const copyBtn = document.getElementById('copy-data-btn');
    if (copyBtn) copyBtn.addEventListener('click', copiarDados);

    const downloadIndividualBtn = document.getElementById('download-individual-btn');
    if (downloadIndividualBtn) {
        downloadIndividualBtn.addEventListener('click', () => {
            alert('Para abrir a pasta de downloads, verifique sua pasta padrão de downloads.');
        });
    }
}

async function processarFormulario() {
    if (!validarFormulario()) return;

    if (!document.getElementById('gerar_memorial_eletrico').checked) {
        alert('Selecione o memorial descritivo elétrico para gerar.');
        return;
    }

    showLoading(true);

    try {
        const dados = coletarDadosFormulario();
        await gerarDocumentoWord(dados);
        exibirResultados();
    } catch (error) {
        console.error('Erro ao processar memorial:', error);
        alert('Erro ao gerar o memorial. Verifique o console para detalhes.');
    } finally {
        showLoading(false);
    }
}

function validarFormulario() {
    const camposObrigatorios = [
        'numero_art',
        'responsavel',
        'nome_projeto',
        'mes_atual',
        'ano_atual',
        'tensao_secundaria',
        'engenheiro',
        'crea',
        'email',
        'telefone',
        'isolamento_iluminacao',
        'bitola_iluminacao',
        'isolacao_iluminacao',
        'isolamento_tomadas',
        'bitola_tomadas',
        'isolacao_tomadas',
        'isolamento_climatizacao',
        'bitola_climatizacao',
        'isolacao_climatizacao',
        'isolamento_exaustao',
        'bitola_exaustao',
        'isolacao_exaustao',
        'isolamento_emergencia',
        'bitola_emergencia',
        'isolacao_emergencia'
    ];

    for (const campoId of camposObrigatorios) {
        const campo = document.getElementById(campoId);
        if (!campo || !campo.value.trim()) {
            const labelText = campo?.closest('.form-group')?.querySelector('label')?.textContent.replace('*', '').trim() || campoId;
            alert(`Por favor, preencha o campo obrigatório: ${labelText}`);
            if (campo) campo.focus();
            return false;
        }
    }

    if (!obterMateriaisTomadaSelecionados().length) {
        alert('Por favor, selecione pelo menos um material de tomada.');
        document.getElementById('tomadas-material-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    return true;
}

function coletarDadosFormulario() {
    const tomadasSelecionadas = obterMateriaisTomadaSelecionados();
    const dados = {
        YYYY: getValue('numero_art'),
        MMMM: getValue('responsavel'),
        MES_ATUAL: getValue('mes_atual'),
        ANO_ATUAL: getValue('ano_atual'),
        XXYY: getValue('engenheiro'),
        AAAA: getValue('crea'),
        BBBB: getValue('email'),
        CCCC: getValue('telefone'),
        DDDD: getValue('tensao_secundaria'),
        EEEE: getValue('isolamento_iluminacao'),
        FFFF: getValue('bitola_iluminacao'),
        GGGG: getValue('isolacao_iluminacao'),
        EEEA: getValue('isolamento_tomadas'),
        FFFA: getValue('bitola_tomadas'),
        GGGA: getValue('isolacao_tomadas'),
        EEEB: getValue('isolamento_climatizacao'),
        FFFB: getValue('bitola_climatizacao'),
        GGGB: getValue('isolacao_climatizacao'),
        EEEC: getValue('isolamento_exaustao'),
        FFFC: getValue('bitola_exaustao'),
        GGGC: getValue('isolacao_exaustao'),
        EEED: getValue('isolamento_emergencia'),
        FFFD: getValue('bitola_emergencia'),
        GGGD: getValue('isolacao_emergencia'),
        HHHH: getValue('nome_projeto'),
        IIII: TOMADAS_PLACEHOLDER,
        TOMADAS_SELECIONADAS: tomadasSelecionadas.map((material) => material.nome).join(', '),

        // Placeholders existentes no template que não foram solicitados como inputs nesta tela.
        // Mantê-los vazios evita a exibição de valores indefinidos no documento gerado.
        XXXX: '',
        ZXXZ: '',
        ZXZX: ''
    };

    Object.defineProperty(dados, '__tomadasSelecionadas', {
        value: tomadasSelecionadas,
        enumerable: false
    });

    dadosProcessados = { ...dados };
    return dados;
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

async function gerarDocumentoWord(dados) {
    documentosGerados = [];

    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) {
        throw new Error(`Template não encontrado: ${TEMPLATE_URL}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const docxContent = await processarTemplateWord(arrayBuffer, dados);
    const nomeProjeto = (dados.HHHH || 'memorial_descritivo_eletrico').replace(/[^a-z0-9]/gi, '_').toLowerCase();

    documentosGerados.push({
        nome: 'Memorial Descritivo Elétrico',
        nomeArquivo: `${TEMPLATE_NAME} - ${nomeProjeto}.docx`,
        conteudo: docxContent,
        tipo: 'memorial_descritivo_eletrico'
    });
}

async function processarTemplateWord(arrayBuffer, dados) {
    try {
        const zip = new PizZip(arrayBuffer);
        const doc = new docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
                start: '[',
                end: ']'
            },
            nullGetter: () => ''
        });

        doc.setData(dados);
        doc.render();

        const renderedZip = doc.getZip();
        await inserirMateriaisTomadaNoDocumento(renderedZip, dados.__tomadasSelecionadas || []);

        return renderedZip.generate({
            type: 'arraybuffer',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE'
        });
    } catch (error) {
        console.error('Erro ao processar template Word:', error);
        if (error.properties) {
            console.log('Descrição do erro:', error.properties.explanation);
            console.log('Erro na tag:', error.properties.xtag);
        }
        throw new Error('Falha ao gerar o documento Word com Docxtemplater.');
    }
}

async function inserirMateriaisTomadaNoDocumento(zip, materiaisSelecionados) {
    const documentFile = zip.file('word/document.xml');
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!documentFile || !relsFile) return;

    let documentXml = lerArquivoZipComoTexto(documentFile);
    if (!documentXml.includes(TOMADAS_PLACEHOLDER)) return;

    let relsXml = relsFile.asText();
    let nextRelationId = obterProximoRelationId(relsXml);
    let nextDocPrId = obterProximoDocPrId(documentXml);
    const paragraphXmlList = [];

    if (!materiaisSelecionados.length) {
        paragraphXmlList.push(criarParagrafoTexto('Nenhum material de tomada selecionado.'));
    }

    materiaisSelecionados.forEach((material, index) => {
        paragraphXmlList.push(criarParagrafoTexto(material.descricao, { firstLine: true, justify: true }));

        if (material.imageData) {
            const imageExtension = normalizarExtensaoImagem(material.imageExtension);
            const imageFileName = `memorial_tomada_${index + 1}.${imageExtension}`;
            const relationId = `rId${nextRelationId++}`;
            const docPrId = nextDocPrId++;

            zip.file(`word/media/${imageFileName}`, converterImagemParaArrayBuffer(material.imageData));
            relsXml = adicionarRelacionamentoImagem(relsXml, relationId, imageFileName);
            contentTypesXml = garantirContentTypeImagem(contentTypesXml, imageExtension, material.imageContentType);
            paragraphXmlList.push(criarParagrafoImagem(relationId, material.nomeImagem || material.nome, docPrId));
        } else {
            paragraphXmlList.push(criarParagrafoTexto('Imagem não encontrada na base de dados.', { center: true, italic: true }));
        }

        if (material.nomeImagem) {
            paragraphXmlList.push(criarParagrafoTexto(material.nomeImagem, { center: true, italic: true }));
        }
    });

    const replacementXml = paragraphXmlList.join('');
    const markerRegex = new RegExp(`<w:p(?:(?!<w:p)[\\s\\S])*?${escapeRegExp(TOMADAS_PLACEHOLDER)}[\\s\\S]*?</w:p>`);
    documentXml = documentXml.replace(markerRegex, replacementXml);

    zip.file('word/document.xml', documentXml);
    zip.file('word/_rels/document.xml.rels', relsXml);
    zip.file('[Content_Types].xml', contentTypesXml);
}

function lerArquivoZipComoTexto(file) {
    if (typeof file.asText === 'function') return file.asText();
    return file._data?.getContent?.() || '';
}

function lerContentTypes(zip) {
    const contentTypesFile = zip.file('[Content_Types].xml');
    return contentTypesFile ? lerArquivoZipComoTexto(contentTypesFile) : '';
}

function normalizarExtensaoImagem(extension) {
    const normalized = String(extension || 'png').toLowerCase().replace(/^\./, '');
    return normalized === 'jpg' ? 'jpeg' : normalized;
}

function converterImagemParaArrayBuffer(imageData) {
    if (imageData instanceof ArrayBuffer) return imageData;
    if (ArrayBuffer.isView(imageData)) {
        return imageData.buffer.slice(imageData.byteOffset, imageData.byteOffset + imageData.byteLength);
    }
    return imageData;
}

function adicionarRelacionamentoImagem(relsXml, relationId, imageFileName) {
    const relationshipXml = `<Relationship Id="${relationId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeXmlAttribute(imageFileName)}"/>`;
    return relsXml.replace('</Relationships>', `${relationshipXml}</Relationships>`);
}

function garantirContentTypeImagem(contentTypesXml, extension, contentType) {
    if (!contentTypesXml) return contentTypesXml;

    const safeExtension = escapeXmlAttribute(extension);
    const normalizedContentType = contentType || (extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`);
    const defaultRegex = new RegExp(`<Default\\s+[^>]*Extension=["']${escapeRegExp(extension)}["']`, 'i');
    if (defaultRegex.test(contentTypesXml)) return contentTypesXml;

    const defaultXml = `<Default Extension="${safeExtension}" ContentType="${escapeXmlAttribute(normalizedContentType)}"/>`;
    return contentTypesXml.replace('</Types>', `${defaultXml}</Types>`);
}

function obterProximoRelationId(relsXml) {
    const ids = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((match) => Number(match[1]));
    return Math.max(0, ...ids) + 1;
}

function obterProximoDocPrId(documentXml) {
    const ids = Array.from(documentXml.matchAll(/<wp:docPr[^>]*\sid="(\d+)"/g)).map((match) => Number(match[1]));
    return Math.max(0, ...ids) + 1;
}

function criarParagrafoTexto(text, options = {}) {
    const safeText = escapeXml(text || '');
    const justification = options.center ? '<w:jc w:val="center"/>' : (options.justify ? '<w:jc w:val="both"/>' : '');
    const firstLine = options.firstLine ? '<w:ind w:firstLine="720"/>' : '';
    const italic = options.italic ? '<w:i/><w:iCs/>' : '';

    return `<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/>${firstLine}${justification}<w:rPr><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/>${italic}</w:rPr></w:pPr><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/>${italic}</w:rPr><w:t xml:space="preserve">${safeText}</w:t></w:r></w:p>`;
}

function criarParagrafoImagem(relationId, altText, docPrId) {
    const cx = 3200000;
    const cy = 2200000;
    const safeAltText = escapeXmlAttribute(altText || `Imagem de tomada ${docPrId}`);

    return `<w:p><w:pPr><w:spacing w:before="160" w:after="80"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${safeAltText}" descr="${safeAltText}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${safeAltText}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function escapeXml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function escapeXmlAttribute(value) {
    return escapeXml(value).replace(/[\r\n\t]+/g, ' ');
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exibirResultados() {
    const resultsSection = document.getElementById('results-section');
    const documentsContainer = document.getElementById('documents-container');
    const dataSummaryContent = document.getElementById('data-summary-content');

    documentsContainer.innerHTML = '';
    dataSummaryContent.innerHTML = '';

    documentosGerados.forEach((doc, index) => {
        const docElement = document.createElement('div');
        docElement.className = 'document-card';
        docElement.innerHTML = `
            <h4><i class="fas fa-file-word"></i> ${doc.nome}</h4>
            <p>Arquivo: <strong>${doc.nomeArquivo}</strong></p>
            <p>Formato: Microsoft Word (.docx)</p>
            <div class="document-buttons">
                <button class="btn-download" onclick="baixarDocumentoWord(${index})">
                    <i class="fas fa-download"></i> Baixar Word
                </button>
                <button class="btn-preview" onclick="visualizarDocumento(${index})">
                    <i class="fas fa-eye"></i> Visualizar
                </button>
            </div>
        `;
        documentsContainer.appendChild(docElement);
    });

    const downloadAllBtn = document.getElementById('download-all-btn');
    downloadAllBtn.onclick = baixarTodosDocumentos;

    dataSummaryContent.innerHTML = JSON.stringify(dadosProcessados, null, 2);
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function baixarDocumentoWord(index) {
    const doc = documentosGerados[index];
    const blob = new Blob([doc.conteudo], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 100);
    showDownloadFeedback(doc.nome);
}

function baixarTodosDocumentos() {
    if (documentosGerados.length === 0) {
        alert('Nenhum documento para baixar.');
        return;
    }

    const zip = new JSZip();
    documentosGerados.forEach(doc => {
        zip.file(doc.nomeArquivo, doc.conteudo);
    });

    zip.generateAsync({ type: 'blob' })
        .then(function(content) {
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            const nomeProjeto = (dadosProcessados.HHHH || 'memorial_descritivo_eletrico').replace(/[^a-z0-9]/gi, '_');
            a.download = `Memorial_Descritivo_Eletrico_${nomeProjeto}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showDownloadFeedback('memorial descritivo elétrico');
        })
        .catch(function(error) {
            console.error('Erro ao criar ZIP:', error);
            alert('Erro ao criar arquivo ZIP.');
        });
}

function visualizarDocumento(index) {
    const doc = documentosGerados[index];
    alert(`Para visualizar o documento "${doc.nome}", faça o download e abra no Microsoft Word.\n\nArquivo: ${doc.nomeArquivo}`);
}

function copiarDados() {
    const dadosFormatados = document.getElementById('data-summary-content').textContent;

    navigator.clipboard.writeText(dadosFormatados)
        .then(() => {
            const btn = document.getElementById('copy-data-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            btn.style.background = '#27ae60';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        })
        .catch(err => {
            console.error('Erro ao copiar:', err);
            alert('Erro ao copiar dados para a área de transferência.');
        });
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const generateBtn = document.getElementById('generate-btn');

    if (show) {
        loading.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    } else {
        loading.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-file-word"></i> Gerar Documento Word';
    }
}

function showDownloadFeedback(nomeDocumento) {
    const originalTitle = document.title;
    document.title = `✓ ${nomeDocumento} baixado! - Gerador de Memorial`;

    setTimeout(() => {
        document.title = originalTitle;
    }, 1500);
}

function initThemeSelector() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'light';

    themeToggle.addEventListener('change', function() {
        const theme = this.checked ? 'light' : 'dark';
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });
}