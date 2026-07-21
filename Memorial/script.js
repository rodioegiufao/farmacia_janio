const TEMPLATE_DESCRITIVO_URL = '/Memorial/templates/MEM-DESCRITIVO-ELÉTRICO.docx';
const TEMPLATE_CALCULO_URL = '/Memorial/templates/MEM-CALCULO-ELETRICO.docx';
const TEMPLATE_DESCRITIVO_NAME = 'MEM-DESCRITIVO-ELÉTRICO';
const TEMPLATE_CALCULO_NAME = 'MEM-CALCULO-ELÉTRICO';
const MEMORIAL_DATABASE_URL = '/Memorial/base_de_dados_memorial.xlsx';
const TOMADAS_PLACEHOLDER = '__MEMORIAL_TOMADAS_SELECIONADAS__';
const ELETROCALHAS_PLACEHOLDER = '__MEMORIAL_ELETROCALHAS_SELECIONADAS__';
const ILUMINACAO_PLACEHOLDER = '__MEMORIAL_ILUMINACAO_SELECIONADA__';

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
let materiaisEletrocalha = [];
let materiaisIluminacao = [];
let memorialCalculoImportado = null;

document.addEventListener('DOMContentLoaded', function() {
    initThemeSelector();
    setupDefaultDatePlaceholders();
    checkTemplate();
    setupEventListeners();
    setupAutomaticIsolationVoltages();
    carregarMateriaisTomada();
    carregarMateriaisEletrocalha();
    carregarMateriaisIluminacao();
    setupMemorialCalculoImport();
});

function obterDataAtualDocumento() {
    const hoje = new Date();

    return {
        MES_ATUAL: MESES_PT_BR[hoje.getMonth()].toUpperCase(),
        ANO_ATUAL: hoje.getFullYear().toString()
    };
}

function setupDefaultDatePlaceholders() {
    Object.assign(dadosProcessados, obterDataAtualDocumento());
}

async function checkTemplate() {
    const statusElement = document.getElementById('template-status');

    try {
        const respostas = await Promise.all([
            fetch(TEMPLATE_DESCRITIVO_URL, { method: 'HEAD' }),
            fetch(TEMPLATE_CALCULO_URL, { method: 'HEAD' })
        ]);

        if (respostas.every((response) => response.ok)) {
            statusElement.innerHTML = `
                <p><i class="fas fa-check-circle" style="color: #27ae60;"></i>
                Templates encontrados!</p>
                <small>Memoriais descritivo e de cálculo prontos para geração</small>
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

function obterTensaoIsolamentoPorTipo(tipoIsolacao) {
    return TENSAO_ISOLAMENTO_POR_ISOLACAO[tipoIsolacao] || '';
}

function updateIsolationVoltage(isolacao, isolamento) {
    isolamento.value = obterTensaoIsolamentoPorTipo(isolacao.value);
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

async function carregarMateriaisEletrocalha() {
    const container = document.getElementById('eletrocalhas-material-options');
    if (!container) return;

    try {
        materiaisEletrocalha = await carregarMateriaisDaPlanilhaEletrocalha();
        renderizarOpcoesMateriaisEletrocalha();
    } catch (error) {
        console.error('Erro ao carregar materiais de eletrocalha:', error);
        container.innerHTML = `
            <p class="material-options-status">
                <i class="fas fa-exclamation-triangle"></i>
                Não foi possível carregar a base de eletrocalhas. Verifique o arquivo base_de_dados_memorial.xlsx.
            </p>
        `;
    }
}

async function carregarMateriaisIluminacao() {
    const container = document.getElementById('iluminacao-material-options');
    if (!container) return;

    try {
        materiaisIluminacao = await carregarMateriaisDaPlanilhaIluminacao();
        renderizarOpcoesMateriaisIluminacao();
    } catch (error) {
        console.error('Erro ao carregar materiais de iluminação:', error);
        container.innerHTML = `
            <p class="material-options-status">
                <i class="fas fa-exclamation-triangle"></i>
                Não foi possível carregar a base de iluminação. Verifique o arquivo base_de_dados_memorial.xlsx.
            </p>
        `;
    }
}

async function carregarMateriaisDaPlanilhaTomada() {
    return carregarMateriaisDaPlanilha('tomada', 'tomada');
}

async function carregarMateriaisDaPlanilhaEletrocalha() {
    return carregarMateriaisDaPlanilha('eletrocalha', 'eletrocalha');
}

async function carregarMateriaisDaPlanilhaIluminacao() {
    return carregarMateriaisDaPlanilha('iluminacao', 'iluminacao');
}

async function carregarMateriaisDaPlanilha(sheetName, idPrefix) {
    const response = await fetch(MEMORIAL_DATABASE_URL);
    if (!response.ok) {
        throw new Error(`Base de dados não encontrada: ${MEMORIAL_DATABASE_URL}`);
    }

    const workbookBuffer = await response.arrayBuffer();
    const workbookZip = await JSZip.loadAsync(workbookBuffer);
    const parser = new DOMParser();
    const sharedStrings = await lerSharedStrings(workbookZip, parser);
    const sheetPath = await obterCaminhoDaPlanilha(workbookZip, parser, sheetName);
    const imageMap = await criarMapaImagensRichData(workbookZip, parser);
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
        const imagem = await carregarImagemDaColunaC(workbookZip, imageMap, cellsByColumn.C);

        materiais.push({
            id: `${idPrefix}-${rowNumber}`,
            rowNumber,
            nome,
            descricao,
            nomeImagem,
            imagePath: imagem?.path || '',
            imageExtension: imagem?.extension || 'png',
            imageContentType: imagem?.contentType || 'image/png',
            imageData: imagem?.data || null
        });
    }

    return materiais;
}

async function carregarImagemDaColunaC(workbookZip, imageMap, cell) {
    const vm = Number(cell?.getAttribute('vm'));
    if (!vm || !imageMap.has(vm)) return null;

    const imagePath = imageMap.get(vm);
    const imageFile = workbookZip.file(imagePath);
    if (!imageFile) return null;

    const extension = normalizarExtensaoImagem(imagePath.split('.').pop() || 'png');
    const data = await imageFile.async('uint8array');

    return {
        data,
        path: imagePath,
        extension,
        contentType: obterContentTypeImagem(extension)
    };
}

async function criarMapaImagensRichData(workbookZip, parser) {
    const richValuesFile = workbookZip.file('xl/richData/rdrichvalue.xml');
    const richValueRelsFile = workbookZip.file('xl/richData/richValueRel.xml');
    const richValueRelationshipsFile = workbookZip.file('xl/richData/_rels/richValueRel.xml.rels');

    if (!richValuesFile || !richValueRelsFile || !richValueRelationshipsFile) return new Map();
    const [richValuesXml, richValueRelsXml, richValueRelationshipsXml] = await Promise.all([
        richValuesFile.async('text'),
        richValueRelsFile.async('text'),
        richValueRelationshipsFile.async('text')
    ]);

    const richValuesDoc = parser.parseFromString(richValuesXml, 'application/xml');
    const richValueRelsDoc = parser.parseFromString(richValueRelsXml, 'application/xml');
    const richValueRelationshipsDoc = parser.parseFromString(richValueRelationshipsXml, 'application/xml');

    const relIdsPorIndice = Array.from(richValueRelsDoc.getElementsByTagNameNS('*', 'rel'))
        .map((rel) => rel.getAttribute('r:id') || rel.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));

    const relationshipTargets = Array.from(richValueRelationshipsDoc.getElementsByTagNameNS('*', 'Relationship'))
        .reduce((map, relationship) => {
            map[relationship.getAttribute('Id')] = relationship.getAttribute('Target');
            return map;
        }, {});

    return Array.from(richValuesDoc.getElementsByTagNameNS('*', 'rv')).reduce((map, richValue, index) => {
        const valores = Array.from(richValue.getElementsByTagNameNS('*', 'v'));
        const relIndex = Number(valores[0]?.textContent);
        const relId = relIdsPorIndice[relIndex];
        const target = relationshipTargets[relId];

        if (target) {
            map.set(index + 1, normalizarCaminhoZip(`xl/richData/${target}`));
        }

        return map;
    }, new Map());
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
    renderizarOpcoesMateriais({
        containerId: 'tomadas-material-options',
        inputName: 'materiais_tomada',
        materiais: materiaisTomada,
        emptyMessage: 'Nenhum material encontrado na aba tomada.'
    });
}

function renderizarOpcoesMateriaisEletrocalha() {
    renderizarOpcoesMateriais({
        containerId: 'eletrocalhas-material-options',
        inputName: 'materiais_eletrocalha',
        materiais: materiaisEletrocalha,
        emptyMessage: 'Nenhum material encontrado na aba eletrocalha.'
    });
}

function renderizarOpcoesMateriaisIluminacao() {
    renderizarOpcoesMateriais({
        containerId: 'iluminacao-material-options',
        inputName: 'materiais_iluminacao',
        materiais: materiaisIluminacao,
        emptyMessage: 'Nenhum material encontrado na aba iluminacao.'
    });
}

function renderizarOpcoesMateriais({ containerId, inputName, materiais, emptyMessage }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!materiais.length) {
        container.innerHTML = `<p class="material-options-status">${escapeHtml(emptyMessage)}</p>`;
        return;
    }

    container.innerHTML = materiais.map((material) => `
        <label class="material-option">
            <input type="checkbox" name="${escapeHtml(inputName)}" value="${escapeHtml(material.id)}">
            <span>
                <strong>${escapeHtml(material.nome)}</strong>
                <span>${escapeHtml(material.nomeImagem || 'Imagem sem legenda')}</span>
            </span>
        </label>
    `).join('');
}

function obterMateriaisTomadaSelecionados() {
    return obterMateriaisSelecionados('materiais_tomada', materiaisTomada);
}

function obterMateriaisEletrocalhaSelecionados() {
    return obterMateriaisSelecionados('materiais_eletrocalha', materiaisEletrocalha);
}

function obterMateriaisIluminacaoSelecionados() {
    return obterMateriaisSelecionados('materiais_iluminacao', materiaisIluminacao);
}

function obterMateriaisSelecionados(inputName, materiais) {
    const selectedIds = Array.from(document.querySelectorAll(`input[name="${inputName}"]:checked`)).map((input) => input.value);
    return selectedIds
        .map((id) => materiais.find((material) => material.id === id))
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
            limparMemorialCalculoImportado();
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
    const gerarDescritivo = document.getElementById('gerar_memorial_eletrico')?.checked;
    const gerarCalculo = document.getElementById('gerar_memorial_calculo')?.checked;
    if (!gerarDescritivo && !gerarCalculo) {
        alert('Selecione pelo menos um documento para gerar.');
        return;
    }

    if (gerarCalculo && !memorialCalculoImportado) {
        alert('Para gerar o memorial de cálculo, importe o HTML do QiBuilder.');
        return;
    }

    if (!validarFormulario()) return;

    showLoading(true);

    try {
        documentosGerados = [];
        const dados = coletarDadosFormulario();
        if (gerarDescritivo) {
            atualizarEtapaProcessamento('Preparando o template descritivo');
            await gerarMemorialDescritivo(dados);
        }
        if (gerarCalculo) {
            atualizarEtapaProcessamento('Preparando o template Word');
            await gerarMemorialCalculo(dados, memorialCalculoImportado);
        }
        atualizarEtapaProcessamento('Finalizando documento');
        exibirResultados();
    } catch (error) {
        console.error('Erro ao processar memorial:', error);
        alert(error.message || 'Erro ao gerar o memorial. Verifique o console para detalhes.');
    } finally {
        showLoading(false);
    }
}

function validarFormulario() {
    const camposObrigatorios = [
        'numero_art',
        'responsavel',
        'nome_projeto',
        'tensao_secundaria',
        'engenheiro',
        'crea',
        'email',
        'telefone',
        'bitola_iluminacao',
        'isolacao_iluminacao',
        'bitola_tomadas',
        'isolacao_tomadas',
        'bitola_climatizacao',
        'isolacao_climatizacao',
        'bitola_exaustao',
        'isolacao_exaustao',
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

    if (!obterMateriaisIluminacaoSelecionados().length) {
        alert('Por favor, selecione pelo menos um material de iluminação.');
        document.getElementById('iluminacao-material-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    if (!obterMateriaisEletrocalhaSelecionados().length) {
        alert('Por favor, selecione pelo menos um material de eletrocalha.');
        document.getElementById('eletrocalhas-material-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    return true;
}

function coletarDadosFormulario() {
    const tomadasSelecionadas = obterMateriaisTomadaSelecionados();
    const eletrocalhasSelecionadas = obterMateriaisEletrocalhaSelecionados();
    const iluminacaoSelecionada = obterMateriaisIluminacaoSelecionados();
    const dataAtualDocumento = obterDataAtualDocumento();
    const tensaoSecundaria = getValue('tensao_secundaria');
    const tensoesLinha = obterTensoesLinhaPorTensaoSecundaria(tensaoSecundaria);
    const dados = {
        YYYY: getValue('numero_art'),
        MMMM: getValue('responsavel'),
        MES_ATUAL: dataAtualDocumento.MES_ATUAL,
        ANO_ATUAL: dataAtualDocumento.ANO_ATUAL,
        XXYY: getValue('engenheiro'),
        AAAA: getValue('crea'),
        BBBB: getValue('email'),
        CCCC: getValue('telefone'),
        DDDD: tensaoSecundaria,
        LLLA: tensoesLinha.LLLA,
        LLLB: tensoesLinha.LLLB,
        EEEE: obterTensaoIsolamentoPorTipo(getValue('isolacao_iluminacao')),
        FFFF: getValue('bitola_iluminacao'),
        GGGG: getValue('isolacao_iluminacao'),
        EEEA: obterTensaoIsolamentoPorTipo(getValue('isolacao_tomadas')),
        FFFA: getValue('bitola_tomadas'),
        GGGA: getValue('isolacao_tomadas'),
        EEEB: obterTensaoIsolamentoPorTipo(getValue('isolacao_climatizacao')),
        FFFB: getValue('bitola_climatizacao'),
        GGGB: getValue('isolacao_climatizacao'),
        EEEC: obterTensaoIsolamentoPorTipo(getValue('isolacao_exaustao')),
        FFFC: getValue('bitola_exaustao'),
        GGGC: getValue('isolacao_exaustao'),
        EEED: obterTensaoIsolamentoPorTipo(getValue('isolacao_emergencia')),
        FFFD: getValue('bitola_emergencia'),
        GGGD: getValue('isolacao_emergencia'),
        HHHH: getValue('nome_projeto'),
        IIII: TOMADAS_PLACEHOLDER,
        JJJJ: ELETROCALHAS_PLACEHOLDER,
        KKKK: ILUMINACAO_PLACEHOLDER,
        TOMADAS_SELECIONADAS: tomadasSelecionadas.map((material) => material.nome).join(', '),
        ELETROCALHAS_SELECIONADAS: eletrocalhasSelecionadas.map((material) => material.nome).join(', '),
        ILUMINACAO_SELECIONADA: iluminacaoSelecionada.map((material) => material.nome).join(', '),

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

    Object.defineProperty(dados, '__eletrocalhasSelecionadas', {
        value: eletrocalhasSelecionadas,
        enumerable: false
    });

    Object.defineProperty(dados, '__iluminacaoSelecionada', {
        value: iluminacaoSelecionada,
        enumerable: false
    });

    dadosProcessados = { ...dados };
    return dados;
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function obterTensoesLinhaPorTensaoSecundaria(tensaoSecundaria) {
    const tensoesPorTipo = {
        '220/127V': { LLLA: '127', LLLB: '220' },
        '380/220V': { LLLA: '220', LLLB: '380' },
        '380/220V e 220/127V': { LLLA: '127', LLLB: '220' }
    };

    return tensoesPorTipo[tensaoSecundaria] || { LLLA: '', LLLB: '' };
}

async function gerarMemorialDescritivo(dados) {
    const response = await fetch(TEMPLATE_DESCRITIVO_URL);
    if (!response.ok) {
        throw new Error(`Template não encontrado: ${TEMPLATE_DESCRITIVO_URL}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const docxContent = await processarTemplateWord(arrayBuffer, dados);
    const nomeProjeto = (dados.HHHH || 'memorial_descritivo_eletrico').replace(/[^a-z0-9]/gi, '_').toLowerCase();

    documentosGerados.push({
        nome: 'Memorial Descritivo Elétrico',
        nomeArquivo: `${TEMPLATE_DESCRITIVO_NAME} - ${nomeProjeto}.docx`,
        nomeArquivoPdf: `${TEMPLATE_DESCRITIVO_NAME} - ${nomeProjeto}.pdf`,
        conteudo: docxContent,
        tipo: 'memorial_descritivo_eletrico'
    });
}

async function gerarMemorialCalculo(dados, modeloQiBuilder) {
    const response = await fetch(TEMPLATE_CALCULO_URL);
    if (!response.ok) throw new Error(`Template de cálculo não encontrado: ${TEMPLATE_CALCULO_URL}`);
    const arrayBuffer = await response.arrayBuffer();
    const conteudo = await DocxMemorialCalculo.processarTemplateCalculo(arrayBuffer, dados, modeloQiBuilder);
    const nomeProjeto = (dados.HHHH || 'memorial_calculo_eletrico').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    documentosGerados.push({
        nome: 'Memorial de Cálculo Elétrico',
        nomeArquivo: `${TEMPLATE_CALCULO_NAME} - ${nomeProjeto}.docx`,
        nomeArquivoPdf: `${TEMPLATE_CALCULO_NAME} - ${nomeProjeto}.pdf`,
        conteudo,
        tipo: 'memorial_calculo_eletrico'
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
        await inserirMateriaisNoDocumento(renderedZip, dados.__tomadasSelecionadas || [], {
            placeholder: TOMADAS_PLACEHOLDER,
            emptyMessage: 'Nenhum material de tomada selecionado.',
            imageFilePrefix: 'memorial_tomada',
            missingImageMessage: 'Imagem não encontrada na coluna C da planilha.',
            defaultAltText: 'Imagem de tomada'
        });
        await inserirMateriaisNoDocumento(renderedZip, dados.__eletrocalhasSelecionadas || [], {
            placeholder: ELETROCALHAS_PLACEHOLDER,
            emptyMessage: 'Nenhum material de eletrocalha selecionado.',
            imageFilePrefix: 'memorial_eletrocalha',
            missingImageMessage: 'Imagem não encontrada na coluna C da planilha.',
            defaultAltText: 'Imagem de eletrocalha'
        });
        await inserirMateriaisNoDocumento(renderedZip, dados.__iluminacaoSelecionada || [], {
            placeholder: ILUMINACAO_PLACEHOLDER,
            emptyMessage: 'Nenhum material de iluminação selecionado.',
            imageFilePrefix: 'memorial_iluminacao',
            missingImageMessage: 'Imagem não encontrada na coluna C da planilha.',
            defaultAltText: 'Imagem de iluminação'
        });

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

async function inserirMateriaisNoDocumento(zip, materiaisSelecionados, options) {
    const documentFile = zip.file('word/document.xml');
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!documentFile || !relsFile) return;

    let documentXml = lerArquivoZipComoTexto(documentFile);
    if (!documentXml.includes(options.placeholder)) return;

    let relsXml = lerArquivoZipComoTexto(relsFile);
    let contentTypesXml = lerContentTypes(zip);
    let nextRelationId = obterProximoRelationId(relsXml);
    let nextDocPrId = obterProximoDocPrId(documentXml);
    const paragraphXmlList = [];

    if (!materiaisSelecionados.length) {
        paragraphXmlList.push(criarParagrafoTexto(options.emptyMessage));
    }

    materiaisSelecionados.forEach((material, index) => {
        paragraphXmlList.push(criarParagrafoTexto(material.descricao, { firstLine: true, justify: true }));

        if (material.imageData) {
            const imageType = detectarTipoImagem(material.imageData, material.imageExtension);
            const imageFileName = `${options.imageFilePrefix}_${index + 1}.${imageType.extension}`;
            const relationId = `rId${nextRelationId++}`;
            const docPrId = nextDocPrId++;

            zip.file(`word/media/${imageFileName}`, converterImagemParaUint8Array(material.imageData), {
                binary: true,
                createFolders: true
            });
            relsXml = adicionarRelacionamentoImagem(relsXml, relationId, imageFileName);
            contentTypesXml = garantirContentTypeImagem(contentTypesXml, imageType.extension, imageType.contentType);
            paragraphXmlList.push(criarParagrafoImagem(relationId, material.nomeImagem || material.nome, docPrId, options.defaultAltText));
        } else {
            paragraphXmlList.push(criarParagrafoTexto(options.missingImageMessage, { center: true, italic: true }));
        }

        if (material.nomeImagem) {
            paragraphXmlList.push(criarParagrafoTexto(material.nomeImagem, { center: true, italic: true }));
        }
    });

    const replacementXml = paragraphXmlList.join('');
    const markerRegex = new RegExp(`<w:p(?:\\s|>)(?:(?!<w:p(?:\\s|>))[\\s\\S])*?${escapeRegExp(options.placeholder)}[\\s\\S]*?</w:p>`);
    documentXml = documentXml.replace(markerRegex, replacementXml);

    validarXmlGerado(documentXml, 'word/document.xml');
    validarXmlGerado(relsXml, 'word/_rels/document.xml.rels');
    validarXmlGerado(contentTypesXml, '[Content_Types].xml');

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

function detectarTipoImagem(imageData, fallbackExtension = 'png') {
    const bytes = converterImagemParaUint8Array(imageData);
    const fallback = normalizarExtensaoImagem(fallbackExtension);

    if (!bytes || bytes.length < 4) {
        return { extension: fallback, contentType: obterContentTypeImagem(fallback) };
    }

    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return { extension: 'png', contentType: 'image/png' };
    }

    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return { extension: 'jpeg', contentType: 'image/jpeg' };
    }

    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
        return { extension: 'gif', contentType: 'image/gif' };
    }

    return { extension: fallback, contentType: obterContentTypeImagem(fallback) };
}

function obterContentTypeImagem(extension) {
    const normalized = normalizarExtensaoImagem(extension);
    if (normalized === 'jpeg') return 'image/jpeg';
    if (normalized === 'svg') return 'image/svg+xml';
    return `image/${normalized}`;
}

function converterImagemParaUint8Array(imageData) {
    if (imageData instanceof Uint8Array) return imageData;
    if (imageData instanceof ArrayBuffer) return new Uint8Array(imageData);
    if (ArrayBuffer.isView(imageData)) {
        return new Uint8Array(imageData.buffer, imageData.byteOffset, imageData.byteLength);
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
    const safeText = criarRunsTextoSeguro(text || '');
    const justification = options.center ? '<w:jc w:val="center"/>' : (options.justify ? '<w:jc w:val="both"/>' : '');
    const firstLine = options.firstLine ? '<w:ind w:firstLine="720"/>' : '';
    const italic = options.italic ? '<w:i/><w:iCs/>' : '';

    return `<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/>${firstLine}${justification}<w:rPr><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/>${italic}</w:rPr></w:pPr><w:r><w:rPr><w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/>${italic}</w:rPr><w:t xml:space="preserve">${safeText}</w:t></w:r></w:p>`;
}

function criarParagrafoImagem(relationId, altText, docPrId, defaultAltText = 'Imagem de tomada') {
    const cx = 3200000;
    const cy = 2200000;
    const safeAltText = escapeXmlAttribute(altText || `${defaultAltText} ${docPrId}`);

    return `<w:p><w:pPr><w:spacing w:before="160" w:after="80"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${safeAltText}" descr="${safeAltText}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${safeAltText}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function criarRunsTextoSeguro(value) {
    return escapeXml(limparCaracteresInvalidosXml(value).replace(/\r\n|\n|\r/g, ' '));
}

function limparCaracteresInvalidosXml(value) {
    return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function validarXmlGerado(xml, nomeArquivo) {
    if (typeof DOMParser === 'undefined') return;

    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    const parserError = parsed.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new Error(`XML inválido gerado em ${nomeArquivo}: ${parserError.textContent}`);
    }
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
            <p>Arquivo Word: <strong>${doc.nomeArquivo}</strong></p>
            <p>Arquivo PDF: <strong>${doc.nomeArquivoPdf}</strong></p>
            <p>Formatos disponíveis: Microsoft Word (.docx) ou PDF (.pdf)</p>
            <div class="document-buttons">
                <button class="btn-download" onclick="baixarDocumentoWord(${index})">
                    <i class="fas fa-download"></i> Baixar Word
                </button>
                <button class="btn-download-pdf" onclick="baixarDocumentoPdf(${index})">
                    <i class="fas fa-file-pdf"></i> Baixar PDF
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

async function baixarDocumentoPdf(index) {
    const doc = documentosGerados[index];
    if (!doc) return;

    if (!window.docx?.renderAsync || !window.html2pdf) {
        alert('Não foi possível carregar as bibliotecas de PDF. Verifique sua conexão e tente novamente.');
        return;
    }

    const renderContainer = document.createElement('div');
    renderContainer.className = 'pdf-render-container';
    document.body.appendChild(renderContainer);

    try {
        await window.docx.renderAsync(doc.conteudo.slice(0), renderContainer, null, {
            className: 'docx-preview',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true
        });

        await window.html2pdf()
            .set({
                margin: 0,
                filename: doc.nomeArquivoPdf,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy'] }
            })
            .from(renderContainer)
            .save();

        showDownloadFeedback(`${doc.nome} em PDF`);
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Você ainda pode baixar o arquivo em Word.');
    } finally {
        renderContainer.remove();
    }
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
            a.download = `Memoriais_Eletricos_${nomeProjeto}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showDownloadFeedback('memoriais elétricos');
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
        generateBtn.innerHTML = '<i class="fas fa-file-export"></i> Gerar Documento';
    }
}

function atualizarEtapaProcessamento(etapa) {
    const loading = document.getElementById('loading');
    if (loading) loading.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${escapeHtml(etapa)}...`;
    const status = document.getElementById('qibuilder-status');
    if (status && memorialCalculoImportado) status.textContent = `${etapa}...`;
}

function setupMemorialCalculoImport() {
    const input = document.getElementById('qibuilder-html');
    const remove = document.getElementById('qibuilder-remove');
    if (!input || !window.MemorialCalculoParser) return;
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
            memorialCalculoImportado = null;
            exibirArquivoQiBuilder(file);
            memorialCalculoImportado = await MemorialCalculoParser.interpretarArquivo(file, atualizarStatusQiBuilder);
            exibirResumoQiBuilder(memorialCalculoImportado);
        } catch (error) {
            console.error('Erro ao importar HTML do QiBuilder:', error);
            atualizarStatusQiBuilder(error.message || 'Não foi possível interpretar o arquivo.', true);
            input.value = '';
        }
    });
    remove?.addEventListener('click', limparMemorialCalculoImportado);
}

function exibirArquivoQiBuilder(file) {
    const info = document.getElementById('qibuilder-file-info');
    const remove = document.getElementById('qibuilder-remove');
    if (info) {
        info.textContent = `${file.name} — ${formatarTamanhoArquivo(file.size)}`;
        info.classList.remove('hidden');
    }
    remove?.classList.remove('hidden');
}

function atualizarStatusQiBuilder(etapa, erro = false) {
    const status = document.getElementById('qibuilder-status');
    if (!status) return;
    status.textContent = erro ? etapa : `${etapa}...`;
    status.classList.toggle('is-error', erro);
    status.classList.remove('is-success');
}

function exibirResumoQiBuilder(modelo) {
    const status = document.getElementById('qibuilder-status');
    const container = document.getElementById('qibuilder-sections');
    if (status) {
        status.textContent = `Arquivo lido com sucesso (${modelo.arquivo.codificacao}).`;
        status.classList.add('is-success');
        status.classList.remove('is-error');
    }
    if (!container) return;
    const resumo = [
        ['Pavimentos', Math.max(0, (modelo.pavimentos?.linhas?.length || 1) - 1)],
        ['Pontos de força', modelo.pontosForca.length],
        ['Pontos de luz', modelo.pontosLuz.length],
        ['Quadros de carga', modelo.quadrosCarga.length],
        ['Quadros dimensionados', modelo.relatorioQuadros.length]
    ];
    container.innerHTML = resumo.map(([titulo, total]) => `<span class="qibuilder-section-tag">${escapeHtml(titulo)}: ${total}</span>`).join('')
        + modelo.avisos.map((aviso) => `<p class="qibuilder-warning"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(aviso)}</p>`).join('');
    container.classList.remove('hidden');
}

function limparMemorialCalculoImportado() {
    memorialCalculoImportado = null;
    const input = document.getElementById('qibuilder-html');
    if (input) input.value = '';
    document.getElementById('qibuilder-file-info')?.classList.add('hidden');
    document.getElementById('qibuilder-remove')?.classList.add('hidden');
    document.getElementById('qibuilder-sections')?.classList.add('hidden');
    const status = document.getElementById('qibuilder-status');
    if (status) {
        status.textContent = 'Nenhum HTML carregado. O memorial descritivo pode ser gerado sem essa importação.';
        status.classList.remove('is-error', 'is-success');
    }
}

function formatarTamanhoArquivo(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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