const TEMPLATE_URL = '/Memorial/templates/MEM-DESCRITIVO-ELÉTRICO.docx';
const TEMPLATE_NAME = 'MEM-DESCRITIVO-ELÉTRICO';

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

document.addEventListener('DOMContentLoaded', function() {
    initThemeSelector();
    setupDefaultDatePlaceholders();
    checkTemplate();
    setupEventListeners();
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

    return true;
}

function coletarDadosFormulario() {
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

        // Placeholders existentes no template que não foram solicitados como inputs nesta tela.
        // Mantê-los vazios evita a exibição de valores indefinidos no documento gerado.
        XXXX: '',
        ZXXZ: '',
        ZXZX: ''
    };

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

        return doc.getZip().generate({
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