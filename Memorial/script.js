const TEMPLATE_DESCRITIVO_URL = '/Memorial/templates/MEM-DESCRITIVO-ELÉTRICO.docx';
const TEMPLATE_CALCULO_URL = '/Memorial/templates/MEM-CALCULO-ELETRICO.docx';
const TEMPLATE_LOGICA_URL = '/Memorial/templates/MEM-DESCRITIVO-LOGICA.docx';
const TEMPLATE_DESCRITIVO_NAME = 'MEM-DESCRITIVO-ELÉTRICO';
const TEMPLATE_CALCULO_NAME = 'MEM-CALCULO-ELÉTRICO';
const TEMPLATE_LOGICA_NAME = 'MEM-DESCRITIVO-LOGICA';
const MEMORIAL_DATABASE_URL = '/Memorial/base_de_dados_memorial.xlsx';
const TOMADAS_PLACEHOLDER = '__MEMORIAL_TOMADAS_SELECIONADAS__';
const ELETROCALHAS_PLACEHOLDER = '__MEMORIAL_ELETROCALHAS_SELECIONADAS__';
const ILUMINACAO_PLACEHOLDER = '__MEMORIAL_ILUMINACAO_SELECIONADA__';
const ELETRO_LOG_PLACEHOLDER = '__MEMORIAL_ELETRO_LOG_SELECIONADO__';
const DADOS_CATEGORIA = {
    cat5: { classe: 'C', velocidade: '100 Mbps' },
    cat5e: { classe: 'D', velocidade: '1 Gbps' },
    cat6: { classe: 'E', velocidade: '1 Gbps' },
    cat6a: { classe: 'EA', velocidade: '10 Gbps' }
};
const PLACEHOLDERS_LOGICA = ['[BBBBH]', '[BBBL]', '[BBBM]', '[CATEGORIA]', '[CLASSE]', '[VELOCIDADE]', '[BLINDAGEM]', '[TIPO_CABO]', '[APLICACAO]', '[CONECTOR]', '[TERMINACAO]', '[FIBRA]', '[QUANTIDADE_RACKS]', '[QUANTIDADE_PONTOS]', '[RESERVA]', '[DISTRIBUIDOR_PRINCIPAL]', '[LOCALIZACAO]', '[LISTA_DISTRIBUIDORES]', '[BACKBONE]', '[CONECTOR_OPTICO]', '[TER_OPTICO]', '[ELETRO_LOG]', '[QUANTIDADE]', '[TIPO]', '[FUSÃO/PIGTAIL/OUTRO]', ELETRO_LOG_PLACEHOLDER];

const ENGENHEIROS = {
    'SALOMÃO JOSE COHEN': {
        CREA: '040186354-9',
        EMAIL: 'salomao.cohen@hotmail.com',
        FONE: '(92) 99136-1006',
        ENDERECO: 'Rua Mar de SUFE, 67, Conjunto Imperial, Flores, Manaus/AM, CEP 69058-438',
        RG: '801.420-5',
        CPF: '317.323.132-53'
    },
    'RODRIGO DAMASCENO NASCIMENTO': {
        CREA: '092019291-2',
        EMAIL: 'rodrigo.ele@ribeirolopes.eng.br',
        FONE: '(95) 99146-6367',
        ENDERECO: 'Rua Antonio Marques, 108, Buritis, Boa Vista/RR, CEP 69309-172',
        RG: '413.816-3',
        CPF: '022.331.622-93'
    }
};

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
let distribuidoresSecundarios = [];
let abaMemorialAtiva = 'eletrico';

document.addEventListener('DOMContentLoaded', function() {
    initThemeSelector();
    setupDefaultDatePlaceholders();
    setupEngineerSelector();
    checkTemplate();
    setupEventListeners();
    carregarMateriaisTomada();
    carregarMateriaisEletrocalha();
    carregarMateriaisIluminacao();
    setupMemorialCalculoImport();
    setupMemorialTabs();
    setupLogicaControls();
});

function setupEngineerSelector() {
    const engineerSelect = document.getElementById('engenheiro');
    if (!engineerSelect) return;

    Object.keys(ENGENHEIROS).forEach((engineerName) => {
        const option = document.createElement('option');
        option.value = engineerName;
        option.textContent = engineerName;
        engineerSelect.appendChild(option);
    });

    engineerSelect.addEventListener('change', updateEngineerFields);
    updateEngineerFields();
}

function updateEngineerFields() {
    const engineerName = document.getElementById('engenheiro')?.value;
    const engineer = ENGENHEIROS[engineerName];

    document.getElementById('crea').value = engineer?.CREA || '';
    document.getElementById('email').value = engineer?.EMAIL || '';
    document.getElementById('telefone').value = engineer?.FONE || '';
}

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

    const templates = [
        ['MEM-DESCRITIVO-ELÉTRICO', TEMPLATE_DESCRITIVO_URL],
        ['MEM-CALCULO-ELETRICO', TEMPLATE_CALCULO_URL],
        ['MEM-DESCRITIVO-LOGICA', TEMPLATE_LOGICA_URL]
    ];
    const estados = await Promise.all(templates.map(async ([nome, url]) => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return { nome, estado: response.ok ? 'encontrado' : 'não encontrado', classe: response.ok ? 'fa-check-circle status-ok' : 'fa-exclamation-triangle status-warning' };
        } catch (error) {
            console.error(`Erro ao verificar ${nome}:`, error);
            return { nome, estado: 'erro ao verificar', classe: 'fa-times-circle status-error' };
        }
    }));
    statusElement.innerHTML = estados.map(({ nome, estado, classe }) => `<p><i class="fas ${classe}"></i> <strong>${escapeHtml(nome)}</strong>: ${estado}</p>`).join('');
}

const TENSAO_ISOLAMENTO_POR_ISOLACAO = {
    'PVC': '450/750V',
    'XLPE/EPR': '600/1000V'
};

function obterTensaoIsolamentoPorTipo(tipoIsolacao) {
    return TENSAO_ISOLAMENTO_POR_ISOLACAO[tipoIsolacao] || '';
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
    renderizarOpcoesMateriais({
        containerId: 'eletro-log-material-options',
        inputName: 'materiais_eletrocalha_logica',
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

function obterMateriaisEletrocalhaLogicaSelecionados() {
    return obterMateriaisSelecionados('materiais_eletrocalha_logica', materiaisEletrocalha);
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

function ativarAbaMemorial(disciplina, moverFoco = false) {
    abaMemorialAtiva = disciplina;
    ['eletrico', 'logica'].forEach((nome) => {
        const ativo = nome === disciplina;
        const tab = document.getElementById(`tab-memorial-${nome}`);
        const panel = document.getElementById(`panel-memorial-${nome}`);
        tab?.classList.toggle('active', ativo);
        tab?.setAttribute('aria-selected', String(ativo));
        tab?.setAttribute('tabindex', ativo ? '0' : '-1');
        panel?.classList.toggle('active', ativo);
        if (panel) panel.hidden = !ativo;
        if (ativo && moverFoco) tab?.focus();
    });
}

function setupMemorialTabs() {
    const tabs = Array.from(document.querySelectorAll('.memorial-tab'));
    tabs.forEach((tab, index) => {
        const disciplina = tab.id.endsWith('logica') ? 'logica' : 'eletrico';
        tab.addEventListener('click', () => ativarAbaMemorial(disciplina));
        tab.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            const deslocamento = event.key === 'ArrowRight' ? 1 : -1;
            const destino = tabs[(index + deslocamento + tabs.length) % tabs.length];
            ativarAbaMemorial(destino.id.endsWith('logica') ? 'logica' : 'eletrico', true);
        });
    });
}

function atualizarCategoriaLogica() {
    const dados = DADOS_CATEGORIA[getValue('categoria_logica')] || { classe: '', velocidade: '' };
    document.getElementById('classe_logica').value = dados.classe;
    document.getElementById('velocidade_logica').value = dados.velocidade;
}

function atualizarCamposCondicionaisLogica() {
    const outrosAplicacao = getValue('aplicacao_logica') === 'Outros';
    const outroConector = getValue('conector_logica') === 'Outros';
    document.getElementById('aplicacao-outra-group').hidden = !outrosAplicacao;
    document.getElementById('conector-outro-group').hidden = !outroConector;
    const possuiBackbone = getValue('backbone_logica') === 'Sim';
    document.querySelectorAll('.optical-field select').forEach((campo) => { campo.disabled = !possuiBackbone; });
}

function renderizarDistribuidores() {
    const container = document.getElementById('distribuidores-chips');
    if (!container) return;
    container.innerHTML = distribuidoresSecundarios.map((item, index) => `<span class="chip">${escapeHtml(item)} <button type="button" data-remove-distribuidor="${index}" aria-label="Remover ${escapeHtml(item)}">×</button></span>`).join('');
    document.getElementById('distribuidores-contagem').textContent = `${distribuidoresSecundarios.length} rack(s) secundário(s) adicionado(s)`;
}

function adicionarDistribuidor() {
    const input = document.getElementById('distribuidor-input');
    const valor = input?.value.trim() || '';
    if (!valor) return;
    if (distribuidoresSecundarios.some((item) => item.toLocaleLowerCase('pt-BR') === valor.toLocaleLowerCase('pt-BR'))) {
        alert('Este distribuidor secundário já foi adicionado.');
        input.focus();
        return;
    }
    distribuidoresSecundarios.push(valor);
    input.value = '';
    renderizarDistribuidores();
}

function setupLogicaControls() {
    document.getElementById('categoria_logica')?.addEventListener('change', atualizarCategoriaLogica);
    ['aplicacao_logica', 'conector_logica', 'backbone_logica'].forEach((id) => document.getElementById(id)?.addEventListener('change', atualizarCamposCondicionaisLogica));
    document.getElementById('adicionar-distribuidor')?.addEventListener('click', adicionarDistribuidor);
    document.getElementById('distribuidor-input')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); adicionarDistribuidor(); }
    });
    document.getElementById('distribuidores-chips')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-distribuidor]');
        if (!button) return;
        distribuidoresSecundarios.splice(Number(button.dataset.removeDistribuidor), 1);
        renderizarDistribuidores();
    });
    document.querySelectorAll('.help-button').forEach((button) => button.addEventListener('click', () => alert(button.dataset.tooltip)));
    atualizarCategoriaLogica();
    atualizarCamposCondicionaisLogica();
    renderizarDistribuidores();
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
            updateEngineerFields();
            documentosGerados = [];
            dadosProcessados = {};
            setupDefaultDatePlaceholders();
            limparMemorialCalculoImportado();
            distribuidoresSecundarios = [];
            renderizarDistribuidores();
            document.getElementById('quantidade_conectores').value = '1';
            document.getElementById('gerar_memorial_eletrico').checked = true;
            document.getElementById('gerar_memorial_calculo').checked = false;
            document.getElementById('gerar_memorial_logica').checked = true;
            atualizarCategoriaLogica();
            atualizarCamposCondicionaisLogica();
            ativarAbaMemorial('eletrico');
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) resultsSection.classList.add('hidden');
        });
    }
    
    const fillTestDataBtn = document.getElementById('fill-test-data-btn');
    if (fillTestDataBtn) {
        fillTestDataBtn.addEventListener('click', preencherDadosDeTeste);
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
function preencherDadosDeTeste() {
    const dadosDeTeste = {
        numero_art: 'RR2026123456',
        responsavel: 'Secretaria Municipal de Obras',
        nome_projeto: 'Reforma da Unidade Básica de Saúde',
        tensao_secundaria: '220/127V',
        concessionaria: 'ÂMBAR ENERGIA RORAIMA',
        esquema_ligacao: '3F+N+T',
        esquema_aterramento: 'TN-S',
        ponto_entrega: 'Rua Antônio Marquês, n° 144, Buritis',
        ultima_prancha: 'PRJ-ELE-SMEC-ENC-06-06',
        ultima_prancha_logica: 'PRJ-LOG-SMEC-ENC-06-06',
        engenheiro: 'RODRIGO DAMASCENO NASCIMENTO',
        bitola_iluminacao: '2,5',
        isolacao_iluminacao: 'XLPE/EPR',
        bitola_tomadas: '4',
        isolacao_tomadas: 'XLPE/EPR',
        bitola_climatizacao: '4 e 6',
        isolacao_climatizacao: 'XLPE/EPR',
        bitola_exaustao: '2,5',
        isolacao_exaustao: 'XLPE/EPR',
        bitola_emergencia: '2,5',
        isolacao_emergencia: 'XLPE/EPR'
    };

    Object.entries(dadosDeTeste).forEach(([id, value]) => {
        const campo = document.getElementById(id);
        if (!campo) return;

        campo.value = value;
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    if (abaMemorialAtiva === 'logica') {
        const logica = { categoria_logica: 'cat6', blindagem_logica: 'UTP', tipo_cabo_logica: 'LSZH', aplicacao_logica: 'Dados e Voz', conector_logica: 'RJ45', terminacao_logica: 'T568B', fibra_logica: 'OM3', quantidade_racks: '4', quantidade_pontos: '120', quantidade_conectores: '1', reserva_logica: '20', distribuidor_principal: 'CD', localizacao_rack: 'Pavimento térreo, sala técnica', backbone_logica: 'Sim', conector_optico: 'LC', ter_optico: 'LC/SC' };
        Object.entries(logica).forEach(([id, value]) => { const campo = document.getElementById(id); campo.value = value; campo.dispatchEvent(new Event('change', { bubbles: true })); });
        document.querySelectorAll('[name="sistemas_logica"]').forEach((item) => { item.checked = ['CFTV', 'Controle de acesso'].includes(item.value); });
        distribuidoresSecundarios = ['BD1', 'BD2', 'BD3'];
        renderizarDistribuidores();
    }
}
async function processarFormulario() {
    const gerarEletrico = document.getElementById('gerar_memorial_eletrico')?.checked;
    const gerarCalculo = document.getElementById('gerar_memorial_calculo')?.checked;
    const gerarLogica = document.getElementById('gerar_memorial_logica')?.checked;
    if (!gerarEletrico && !gerarCalculo && !gerarLogica) {
        alert('Selecione pelo menos um documento para gerar.');
        return;
    }
    if (!validarCamposComuns()) return;
    if ((gerarEletrico || gerarCalculo) && !validarFormularioEletrico()) { ativarAbaMemorial('eletrico'); return; }
    if (gerarCalculo && !memorialCalculoImportado) {
        ativarAbaMemorial('eletrico');
        alert('Para gerar o memorial de cálculo, importe o HTML do QiBuilder.');
        return;
    }
    if (gerarLogica && !validarFormularioLogica()) { ativarAbaMemorial('logica'); return; }
    showLoading(true);
    try {
        documentosGerados = [];
        const dadosComuns = coletarDadosComuns();
        const resumos = [];
        if (gerarEletrico) {
            const dados = combinarDadosComMetadados(dadosComuns, coletarDadosEletricos());
            atualizarEtapaProcessamento('Preparando memorial descritivo elétrico');;
            await gerarMemorialDescritivo(dados);
            resumos.push(dados);
        }
        if (gerarCalculo) {
            const dados = combinarDadosComMetadados(dadosComuns, coletarDadosEletricos());
            atualizarEtapaProcessamento('Preparando memorial de cálculo elétrico');
            await gerarMemorialCalculo(dados, memorialCalculoImportado);
            resumos.push(dados);
        }
        if (gerarLogica) {
            const dados = combinarDadosComMetadados(dadosComuns, coletarDadosLogica());
            atualizarEtapaProcessamento('Preparando memorial descritivo de lógica');
            await gerarMemorialDescritivoLogica(dados);
            resumos.push(dados);
        }
        dadosProcessados = Object.assign({}, ...resumos);
        atualizarEtapaProcessamento('Finalizando documentos');
        exibirResultados();
    } catch (error) {
        console.error('Erro ao processar memoriais:', error);
        alert(error.message || 'Erro ao gerar os memoriais.');
    } finally { showLoading(false); }
}

function focarCampoInvalido(campo, mensagem) {
    alert(mensagem || `Por favor, preencha o campo obrigatório: ${campo?.closest('.form-group')?.querySelector('label')?.textContent.replace('*', '').trim() || campo?.id}`);
    campo?.focus();
    return false;
}

function validarListaCampos(ids) {
    for (const id of ids) {
        const campo = document.getElementById(id);
        if (!campo || !campo.value.trim()) return focarCampoInvalido(campo);
    }
    return true;
}

function validarCamposComuns() {
    return validarListaCampos(['numero_art', 'responsavel', 'nome_projeto', 'engenheiro', 'crea', 'email', 'telefone']);
}

function validarUltimaPrancha(id) {
    if (!validarListaCampos([id])) return false;
    try { obterDadosPranchas(getValue(id)); }
    catch (error) { return focarCampoInvalido(document.getElementById(id), error.message); }
    return true;
}

function validarFormularioEletrico() {
    if (!validarUltimaPrancha('ultima_prancha')) return false;
    const campos = ['tensao_secundaria', 'concessionaria', 'esquema_ligacao', 'esquema_aterramento', 'ponto_entrega', 'bitola_iluminacao', 'isolacao_iluminacao', 'bitola_tomadas', 'isolacao_tomadas', 'bitola_climatizacao', 'isolacao_climatizacao', 'bitola_exaustao', 'isolacao_exaustao', 'bitola_emergencia', 'isolacao_emergencia'];
    if (!validarListaCampos(campos)) return false;
    const materiais = [[obterMateriaisTomadaSelecionados(), 'tomada', 'tomadas-material-options'], [obterMateriaisIluminacaoSelecionados(), 'iluminação', 'iluminacao-material-options'], [obterMateriaisEletrocalhaSelecionados(), 'eletrocalha', 'eletrocalhas-material-options']];
    for (const [itens, nome, id] of materiais) {
        if (!itens.length) { alert(`Por favor, selecione pelo menos um material de ${nome}.`); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    }
    return true;
}

function validarFormularioLogica() {
    if (!validarUltimaPrancha('ultima_prancha_logica')) return false;
    if (!document.querySelectorAll('[name="sistemas_logica"]:checked').length) { alert('Selecione pelo menos um sistema contemplado.'); return false; }
    const campos = ['categoria_logica', 'blindagem_logica', 'tipo_cabo_logica', 'aplicacao_logica', 'conector_logica', 'terminacao_logica', 'quantidade_racks', 'quantidade_pontos', 'quantidade_conectores', 'reserva_logica', 'distribuidor_principal', 'localizacao_rack', 'backbone_logica'];
    if (!validarListaCampos(campos)) return false;
    if (getValue('aplicacao_logica') === 'Outros' && !getValue('aplicacao_outra')) return focarCampoInvalido(document.getElementById('aplicacao_outra'));
    if (getValue('conector_logica') === 'Outros' && !getValue('conector_outro')) return focarCampoInvalido(document.getElementById('conector_outro'));
    const inteiros = [['quantidade_racks', 1], ['quantidade_pontos', 1], ['quantidade_conectores', 1]];
    for (const [id, minimo] of inteiros) { const numero = Number(getValue(id)); if (!Number.isInteger(numero) || numero < minimo) return focarCampoInvalido(document.getElementById(id), 'Informe um número inteiro maior ou igual a 1.'); }
    const reserva = Number(getValue('reserva_logica'));
    if (!Number.isFinite(reserva) || reserva < 0 || reserva > 100) return focarCampoInvalido(document.getElementById('reserva_logica'), 'A reserva técnica deve estar entre 0 e 100.');
    if (Number(getValue('quantidade_racks')) !== 1 + distribuidoresSecundarios.length) return focarCampoInvalido(document.getElementById('quantidade_racks'), 'A quantidade total de racks deve corresponder a um rack principal mais a quantidade de racks secundários adicionados.');
    if (getValue('backbone_logica') === 'Sim') {
        if (!distribuidoresSecundarios.length) { alert('Adicione pelo menos um distribuidor secundário para o backbone.'); document.getElementById('distribuidor-input')?.focus(); return false; }
        if (!getValue('fibra_logica') || getValue('fibra_logica') === 'Não aplicável') return focarCampoInvalido(document.getElementById('fibra_logica'), 'Selecione uma fibra aplicável quando o backbone estiver ativo.');
        if (!validarListaCampos(['conector_optico', 'ter_optico'])) return false;
    }

    if (!obterMateriaisEletrocalhaLogicaSelecionados().length) { alert('Selecione pelo menos uma eletrocalha para o memorial de lógica.'); document.getElementById('eletro-log-material-options')?.scrollIntoView({ behavior: 'smooth' }); return false; }

    return true;
}

function formatarListaPortugues(itens) {
    const valores = itens.map((item) => String(item || '').trim()).filter(Boolean);
    if (!valores.length) return '';
    if (valores.length === 1) return valores[0];
    if (valores.length === 2) return `${valores[0]} e ${valores[1]}`;
    return `${valores.slice(0, -1).join(', ')} e ${valores[valores.length - 1]}`;
}

function gerarTextoBackbone({ possuiBackbone, distribuidorPrincipal, distribuidores }) {
    if (possuiBackbone !== 'Sim') return 'O projeto não contempla a utilização do Backbone.';
    const lista = formatarListaPortugues(distribuidores);
    const preposicao = distribuidores.length === 1 ? 'ao' : 'aos';
    return `O backbone será constituído por fibra óptica, interligando o rack principal ${distribuidorPrincipal} ${preposicao} ${lista}, com quantidades compatíveis de fibras ou pares compatíveis com a utilização prevista e com a reserva técnica indicada no projeto.`;
}

function coletarDadosComuns() {
    const data = obterDataAtualDocumento();
    const pranchas = obterDadosPranchas(getValue('ultima_prancha'));
    return { YYYY: getValue('numero_art'), MMMM: getValue('responsavel'), HHHH: getValue('nome_projeto'), XXYY: getValue('engenheiro'), AAAA: getValue('crea'), BBBB: getValue('email'), CCCC: getValue('telefone'), BBBG: pranchas.nomesEmSequencia, BBBH: pranchas.numeroTotal, MES_ATUAL: data.MES_ATUAL, ANO_ATUAL: data.ANO_ATUAL };
}

function coletarDadosEletricos() {
    const tomadas = obterMateriaisTomadaSelecionados();
    const eletrocalhas = obterMateriaisEletrocalhaSelecionados();
    const iluminacao = obterMateriaisIluminacaoSelecionados();
    const tensao = getValue('tensao_secundaria');
    const linhas = obterTensoesLinhaPorTensaoSecundaria(tensao);
    const dados = { DDDD: tensao, BBBC: getValue('concessionaria'), BBBD: getValue('esquema_ligacao'), BBBE: getValue('esquema_aterramento'), BBBF: getValue('ponto_entrega'), ...linhas, EEEE: obterTensaoIsolamentoPorTipo(getValue('isolacao_iluminacao')), FFFF: getValue('bitola_iluminacao'), GGGG: getValue('isolacao_iluminacao'), EEEA: obterTensaoIsolamentoPorTipo(getValue('isolacao_tomadas')), FFFA: getValue('bitola_tomadas'), GGGA: getValue('isolacao_tomadas'), EEEB: obterTensaoIsolamentoPorTipo(getValue('isolacao_climatizacao')), FFFB: getValue('bitola_climatizacao'), GGGB: getValue('isolacao_climatizacao'), EEEC: obterTensaoIsolamentoPorTipo(getValue('isolacao_exaustao')), FFFC: getValue('bitola_exaustao'), GGGC: getValue('isolacao_exaustao'), EEED: obterTensaoIsolamentoPorTipo(getValue('isolacao_emergencia')), FFFD: getValue('bitola_emergencia'), GGGD: getValue('isolacao_emergencia'), IIII: TOMADAS_PLACEHOLDER, JJJJ: ELETROCALHAS_PLACEHOLDER, KKKK: ILUMINACAO_PLACEHOLDER, TOMADAS_SELECIONADAS: tomadas.map((x) => x.nome).join(', '), ELETROCALHAS_SELECIONADAS: eletrocalhas.map((x) => x.nome).join(', '), ILUMINACAO_SELECIONADA: iluminacao.map((x) => x.nome).join(', '), XXXX: '', ZXXZ: '', ZXZX: '' };
    Object.defineProperties(dados, { __tomadasSelecionadas: { value: tomadas }, __eletrocalhasSelecionadas: { value: eletrocalhas }, __iluminacaoSelecionada: { value: iluminacao } });
    return dados;
}

function obterAplicacaoFinal() { return getValue('aplicacao_logica') === 'Outros' ? `Outros — ${getValue('aplicacao_outra')}` : getValue('aplicacao_logica'); }
function obterConectorFinal() { return getValue('conector_logica') === 'Outros' ? `Outros — ${getValue('conector_outro')}` : getValue('conector_logica'); }

function coletarDadosLogica() {
    const sistemas = Array.from(document.querySelectorAll('[name="sistemas_logica"]:checked')).map((item) => item.value);
    const conector = obterConectorFinal();
    const terminacaoOptica = getValue('ter_optico');
    const eletrocalhas = obterMateriaisEletrocalhaLogicaSelecionados();
    const pranchas = obterDadosPranchas(getValue('ultima_prancha_logica'));
    const dados = { BBBL: pranchas.numeroTotal, BBBM: pranchas.nomesEmSequencia, BBBBH: formatarListaPortugues(sistemas), CATEGORIA: getValue('categoria_logica'), CLASSE: getValue('classe_logica'), VELOCIDADE: getValue('velocidade_logica'), BLINDAGEM: getValue('blindagem_logica'), TIPO_CABO: getValue('tipo_cabo_logica'), APLICACAO: obterAplicacaoFinal(), CONECTOR: conector, TIPO: conector, QUANTIDADE: getValue('quantidade_conectores'), TERMINACAO: getValue('terminacao_logica'), FIBRA: getValue('fibra_logica'), QUANTIDADE_RACKS: getValue('quantidade_racks'), QUANTIDADE_PONTOS: getValue('quantidade_pontos'), RESERVA: getValue('reserva_logica'), DISTRIBUIDOR_PRINCIPAL: getValue('distribuidor_principal'), LOCALIZACAO: getValue('localizacao_rack'), LISTA_DISTRIBUIDORES: formatarListaPortugues(distribuidoresSecundarios), BACKBONE: gerarTextoBackbone({ possuiBackbone: getValue('backbone_logica'), distribuidorPrincipal: getValue('distribuidor_principal'), distribuidores: distribuidoresSecundarios }), CONECTOR_OPTICO: getValue('conector_optico'), TER_OPTICO: terminacaoOptica, 'FUSÃO/PIGTAIL/OUTRO': terminacaoOptica, ELETRO_LOG: ELETRO_LOG_PLACEHOLDER };
    Object.defineProperty(dados, '__eletrocalhasLogicaSelecionadas', { value: eletrocalhas, enumerable: false });
    return dados;
}

function combinarDadosComMetadados(dadosComuns, dadosEspecificos) {
    const dados = { ...dadosComuns, ...dadosEspecificos };
    Object.entries(Object.getOwnPropertyDescriptors(dadosEspecificos))
        .filter(([chave]) => chave.startsWith('__'))
        .forEach(([chave, descritor]) => Object.defineProperty(dados, chave, descritor));
    return dados;
}

function coletarDadosFormulario() { return combinarDadosComMetadados(coletarDadosComuns(), coletarDadosEletricos()); }

function getValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function obterDadosPranchas(nomeUltimaPrancha) {
    const nomeNormalizado = String(nomeUltimaPrancha || '').trim().toUpperCase().replace(/;$/, '');
    const partes = nomeNormalizado.match(/^(PRJ-[^-]+-[^-]+(?:-[^-]+)?)-(\d+)-(\d+)$/);

    if (!partes) {
        throw new Error('Informe o nome da última prancha no formato PRJ-XXX-YYYY-AA-BB ou PRJ-XXX-YYYY-ZZZ-AA-BB, com AA e BB numéricos.');
    }

    const numeroUltimaPrancha = Number(partes[2]);
    const numeroTotal = Number(partes[3]);
    if (!Number.isSafeInteger(numeroTotal) || numeroTotal < 1) {
        throw new Error('O número total de pranchas (BB) deve ser maior que zero.');
    }
    if (numeroUltimaPrancha !== numeroTotal) {
        throw new Error('Como o nome informado é o da última prancha, os números AA e BB devem ser iguais.');
    }

    const larguraNumeroPrancha = Math.max(2, partes[2].length);
    const numeroTotalFormatado = partes[3].padStart(Math.max(2, partes[3].length), '0');
    const nomes = Array.from({ length: numeroTotal }, (_, indice) => {
        const numeroPrancha = String(indice + 1).padStart(larguraNumeroPrancha, '0');
        return `${partes[1]}-${numeroPrancha}-${numeroTotalFormatado}`;
    });

    return {
        numeroTotal: numeroTotalFormatado,
        nomesEmSequencia: nomes.join(', ')
    };
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
    const docxContent = await processarTemplateWord(arrayBuffer, dados, { insercoesMateriais: [
        { materiais: dados.__tomadasSelecionadas || [], opcoes: { placeholder: TOMADAS_PLACEHOLDER, emptyMessage: 'Nenhum material de tomada selecionado.', imageFilePrefix: 'memorial_tomada', missingImageMessage: 'Imagem não encontrada na coluna C da planilha.', defaultAltText: 'Imagem de tomada' } },
        { materiais: dados.__eletrocalhasSelecionadas || [], opcoes: { placeholder: ELETROCALHAS_PLACEHOLDER, emptyMessage: 'Nenhum material de eletrocalha selecionado.', imageFilePrefix: 'memorial_eletrocalha', missingImageMessage: 'Imagem não encontrada na coluna C da planilha.', defaultAltText: 'Imagem de eletrocalha' } },
        { materiais: dados.__iluminacaoSelecionada || [], opcoes: { placeholder: ILUMINACAO_PLACEHOLDER, emptyMessage: 'Nenhum material de iluminação selecionado.', imageFilePrefix: 'memorial_iluminacao', missingImageMessage: 'Imagem não encontrada na coluna C da planilha.', defaultAltText: 'Imagem de iluminação' } }
    ] });
    const nomeProjeto = (dados.HHHH || 'memorial_descritivo_eletrico').replace(/[^a-z0-9]/gi, '_').toLowerCase();

    documentosGerados.push({
        nome: 'Memorial Descritivo Elétrico',
        nomeArquivo: `${TEMPLATE_DESCRITIVO_NAME} - ${nomeProjeto}.docx`,
        nomeArquivoPdf: `${TEMPLATE_DESCRITIVO_NAME} - ${nomeProjeto}.pdf`,
        conteudo: docxContent,
        tipo: 'memorial_descritivo_eletrico'
    });
}

async function gerarMemorialDescritivoLogica(dados) {
    const response = await fetch(TEMPLATE_LOGICA_URL);
    if (!response.ok) throw new Error(`Template de lógica não encontrado: ${TEMPLATE_LOGICA_URL}`);
    const arrayBuffer = await response.arrayBuffer();
    const conteudo = await processarTemplateWord(arrayBuffer, dados, { insercoesMateriais: [{
        materiais: dados.__eletrocalhasLogicaSelecionadas || [],
        opcoes: { placeholder: ELETRO_LOG_PLACEHOLDER, emptyMessage: 'Nenhuma eletrocalha selecionada.', imageFilePrefix: 'memorial_logica_eletrocalha', missingImageMessage: 'Imagem não encontrada na coluna C da planilha.', defaultAltText: 'Imagem de eletrocalha para infraestrutura de lógica' }
    }], placeholdersProibidos: PLACEHOLDERS_LOGICA });
    const nomeProjeto = (dados.HHHH || 'memorial_descritivo_logica').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    documentosGerados.push({ nome: 'Memorial Descritivo de Lógica', nomeArquivo: `${TEMPLATE_LOGICA_NAME} - ${nomeProjeto}.docx`, nomeArquivoPdf: `${TEMPLATE_LOGICA_NAME} - ${nomeProjeto}.pdf`, conteudo, tipo: 'memorial_descritivo_logica' });
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

async function processarTemplateWord(arrayBuffer, dados, opcoes = {}) {
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

        doc.render(dados);

        const renderedZip = doc.getZip();
        for (const insercao of opcoes.insercoesMateriais || []) {
            await inserirMateriaisNoDocumento(renderedZip, insercao.materiais, insercao.opcoes);
        }
        const documentXml = lerArquivoZipComoTexto(renderedZip.file('word/document.xml'));
        validarPlaceholdersRestantes(documentXml, opcoes.placeholdersProibidos || []);

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
        throw new Error(error.message || 'Falha ao gerar o documento Word com Docxtemplater.');
    }
}

function validarPlaceholdersRestantes(documentXml, placeholders) {
    const encontrados = placeholders.filter((placeholder) => documentXml.includes(placeholder));
    if (encontrados.length) throw new Error(`Os seguintes campos não foram processados: ${encontrados.join(', ')}`);
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
            <h4><i class="fas ${doc.tipo === 'memorial_descritivo_logica' ? 'fa-network-wired' : 'fa-file-word'}"></i> ${doc.nome}</h4>
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
            const nomeProjeto = (dadosProcessados.HHHH || 'projeto').replace(/[^a-z0-9]/gi, '_');
            a.download = `Memoriais_Projeto_${nomeProjeto}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            showDownloadFeedback('memoriais do projeto');
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