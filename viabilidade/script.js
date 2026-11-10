// Dados fixos
const ENGENHEIROS = {
    "SALOMÃO JOSE COHEN": {
        "CREA": "0401863549",
        "EMAIL": "salomao.cohen@hotmail.com",
        "FONE": "(92) 99136-1006",
        "ENDERECO": "Rua Mar de SUFE, 67, Conjunto Imperial, Flores, Manaus/AM, CEP 69058-438",
        "RG": "801.420-5",
        "CPF": "317.323.132-53"
    },
    "RODRIGO DAMASCENO NASCIMENTO": {
        "CREA": "0920192912",
        "EMAIL": "rodrigo.ele@ribeirolopes.eng.br",
        "FONE": "(95) 99146-6367",
        "ENDERECO": "Rua Antonio Marques, 108, Buritis, Boa Vista/RR, CEP 69309-172",
        "RG": "413.816-3",
        "CPF": "022.331.622-93"
    }
};

const CLIENTES = {
    "SUPERINTENDÊNCIA DA RECEITA FEDERAL": {
        "CNPJ": "00.394.460/0070-73",
        "END_SEDE": "Rua Travessa Rui Barbosa,1039, Bairro Reduto, Belém-PA, CEP 66.053-260",
        "RESPONSAVEL": "Eduardo Badaró Fernandes",
        "NACIONALIDADE": "brasileira",
        "ESTADO_CIVIL": "Solteiro(a)",
        "IDENTIDADE": "01.184.275-1",
        "CPF": "000.934.647-38",
        "DOMICILIO": "Av. Dr. Theomario Pinto da Costa, n° 192, Chapada, Manaus/AM"
    },
    "PREFEITURA MUNICIPAL DE SÃO LUIZ DO ANAUÁ/RR": {
        "CNPJ": "04.056.230/0001-23",
        "END_SEDE": "Avenida Macapá, Nº 1000, Centro, CEP-69370-000, São Luiz do Anauá/RR",
        "RESPONSAVEL": "Isaac Thomas Santos e Santos",
        "NACIONALIDADE": "brasileiro",
        "ESTADO_CIVIL": "Solteiro",
        "IDENTIDADE": "15.212-3",
        "CPF": "058.834.373-03",
        "DOMICILIO": "Rua Jose Vieira Sampaio, Nº 12, Centro, CEP: 69.378-000, Caroebe/RR"
    },
    "INSTITUTO DE PREVIDÊNCIA SOCIAL DO ESTADO DE RORAIMA - IPER": {
        "CNPJ": "03.491.063/0001-86",
        "END_SEDE": "Rua Araújo Filho, 823 - Centro, Boa Vista - RR, CEP: 69.301-090",
        "RESPONSAVEL": "Rafael David Aires Alencar",
        "NACIONALIDADE": "brasileiro",
        "ESTADO_CIVIL": "Casado(a)",
        "IDENTIDADE": "15.912-4",
        "CPF": "512.997.122-15",
        "DOMICILIO": "Rua Araújo Filho, 823 - Centro, Boa Vista - RR, CEP: 69.301-090"
    },
    "SECRETARIA MUNICIPAL DE OBRAS - SMO": {
        "CNPJ": "05.943.030/0001-55",
        "END_SEDE": "Av. Santos Dumont, 1721 - São Francisco, Boa Vista - RR, CEP 69.305-105",
        "RESPONSAVEL": "Kaynara Carvalho de Oliveira",
        "NACIONALIDADE": "brasileira",
        "ESTADO_CIVIL": "Solteiro(a)",
        "IDENTIDADE": "361.182-7",
        "CPF": "062.137.393-19",
        "DOMICILIO": "Rua João XXIII, n° 476, apartamento 4, Bairro Aparecida, Boa Vista/RR"
    },
    "SECRETARIA DE ESTADO DE INFRAESTRUTURA DE RORAIMA - SEINF": {
        "CNPJ": "84.012.012/0001-26",
        "END_SEDE": "Av. Getúlio Vargas,3941 Bairro Canarinho, Boa Vista/Roraima, CEP 69.306-545",
        "RESPONSAVEL": "Raissa Karla Santos de Andrade",
        "NACIONALIDADE": "brasileira",
        "ESTADO_CIVIL": "Solteiro(a)",
        "IDENTIDADE": "202.909-6",
        "CPF": "049.666.684-33",
        "DOMICILIO": "Av. Getúlio Vargas,3941 Bairro Canarinho, Boa Vista/Roraima, CEP 69.306-545"
    },
    "SECRETARIA DE ESTADO DA SAÚDE DE RORAIMA - SESAU": {
        "CNPJ": "84.013.408/0001-98",
        "END_SEDE": "Rua Madri, 180, Aeroporto, Boa Vista - RR, CEP 69.310-043",
        "RESPONSAVEL": "Wengley Glides Martins Silva",
        "NACIONALIDADE": "brasileiro",
        "ESTADO_CIVIL": "Solteiro(o)",
        "IDENTIDADE": "15.212-3",
        "CPF": "779.133.102-00",
        "DOMICILIO": "Rua Olavo Brasil filho, 101, apartamento 03, Jardim Floresta, CEP 69.312-133"
    }
};
const CLIENTE_MANUAL_VALUE = '__cliente_manual__';
const CLIENTE_MANUAL_FIELD_IDS = [
    'cliente_manual_nome', 'cliente_manual_cnpj', 'cliente_manual_endereco',
    'cliente_manual_responsavel', 'cliente_manual_nacionalidade',
    'cliente_manual_estado_civil', 'cliente_manual_identidade',
    'cliente_manual_cpf', 'cliente_manual_domicilio'
];
// Dados para os Transformadores
const PT_TRAFO = [112.5, 150, 225, 500, 750, 1000, 1250, 1500];
const TENSOES_TRAFO = ["220/127V", "380V/220V"]; 

// --- DADOS DE PROTEÇÃO 220/127V ---
const IB_220 = [296.05, 394.74, 592.11, 1315.79, 1973.68, 2631.58, 3289.47, 3947.36];
const IN_220 = [300, 400, 630, 1600, 2000, 3200, 3500, 4000];
const IZ_220 = [444, 624, 716, 1924, 2405, 3367, 4424, 4424];
const CAB_220 = [70, 95, 150, 240, 240, 240, 300, 300];
const QTD_CAB_220 = ["2x70", "2x95", "2x150", "4x240", "5x240", "7x240", "8x300", "8x300"];
const QTD_220 = [2, 2, 2, 4, 5, 7, 8, 8];
const I_CAB_220 = [222, 269, 358, 481, 481, 481, 553, 553]; // Corrente do Cabo (IZXY)
const I_AJUSTE_220 = [ // Ajuste da Proteção (IAJU)
    "300A – 100%", 
    "400A – 100%", 
    "600A – 95,24%", 
    "1400A – 87,5%", 
    "2000A – 100%", 
    "2700A – 84,37%", 
    "3300A – 94,29%", 
    "4000A – 100%"
];
 
// --- DADOS DE PROTEÇÃO 380V/220V ---
const IB_380 = [170.93, 227.90, 341.85, 759.67, 1139.51, 1519.34, 1899.17, 2279.01];
const IN_380 = [200, 300, 400, 800, 1250, 1600, 2000, 2500];
const IZ_380 = [222, 444, 444, 816, 1443, 1924, 2405, 2886];
const CAB_380 = [70, 70, 70, 185, 240, 240, 240, 240];
const QTD_CAB_380 = ["70", "2x70", "2x70", "2x185", "3x240", "4x240", "5x240", "6x240"];
const QTD_380 = [1, 2, 2, 2, 3, 4, 5, 6];
const I_CAB_380 = [222, 222, 222, 408, 481, 481, 481, 481]; // Corrente do Cabo (IZXY)
const I_AJUSTE_380 = [ // Ajuste da Proteção (IAJU)
    "180A – 90%", 
    "230A – 76,67%", 
    "350A – 87,5%", 
    "760A – 95%", 
    "1140A – 91,2%", 
    "1520A – 95%", 
    "1900A – 95%", 
    "2300A – 92%"
];


// Mapeamento dos meses em português
const MESES_PT_BR = {
    "January": "janeiro", "February": "fevereiro", "March": "março",
    "April": "abril", "May": "maio", "June": "junho",
    "July": "julho", "August": "agosto", "September": "setembro",
    "October": "outubro", "November": "novembro", "December": "dezembro"
};

// Templates disponíveis
const TEMPLATES = {
    "memorial": "viabilidade/templates/memorial-descritivo.docx",
    "memorial_aerea": "viabilidade/templates/memorial-descritivo-aérea.docx",
    "procuração": "viabilidade/templates/procuração.docx",
    "termo_responsabilidade": "viabilidade/templates/termo-responsabilidade.docx",
    "carta_viabilidade": "viabilidade/templates/carta-viabilidade.docx",
    "termo_nao_geração": "viabilidade/templates/termo-nao-geração.docx"
};

// =====================================================================
// MAPA DE DOCUMENTOS E CAMPOS
// Cada campo do formulário declara quais placeholders alimenta. Um campo
// só aparece (e só é obrigatório) se algum documento selecionado usar
// pelo menos um desses placeholders.
// =====================================================================

const DOCUMENTOS = [
    { tipo: 'memorial',               checkbox: 'gerar_memorial',          nome: 'Memorial Descritivo',       curto: 'Memorial' },
    { tipo: 'procuração',             checkbox: 'gerar_procuracao',        nome: 'Procuração',                curto: 'Procuração' },
    { tipo: 'termo_responsabilidade', checkbox: 'gerar_termo',             nome: 'Termo de Responsabilidade', curto: 'T. Responsabilidade' },
    { tipo: 'carta_viabilidade',      checkbox: 'gerar_carta',             nome: 'Carta de Viabilidade',      curto: 'Carta' },
    { tipo: 'termo_nao_geração',      checkbox: 'gerar_termo_nao_geracao', nome: 'Termo de Não Geração',      curto: 'T. Não Geração' }
];

const PRESETS = {
    completo:   DOCUMENTOS.map(d => d.tipo),
    procuracao: ['procuração'],
    cliente:    ['procuração', 'termo_responsabilidade', 'termo_nao_geração'],
    tecnico:    ['memorial', 'carta_viabilidade']
};

// Placeholders de cada template (fallback). Ao abrir a página, os templates
// são lidos e esta lista é substituída pelo que realmente existe nos .docx,
// então editar um template no Word já ajusta o formulário sozinho.
const PLACEHOLDERS_PADRAO = {
    memorial: ['AAAA','ANO_ATUAL','BBBB','CABX1','CABX2','CCCC','DDDD','EEEE','FFFF','GGGG','IAJU1','IAJU2','IBXX1','IBXX2','INXX1','INXX2','IZXX1','IZXX2','IZXY1','IZXY2','MES_ATUAL','MMMM','PTF1','PTF2','QTD11','QTD12','QTDY1','QTDY2','TIPO_TRAFO','TTF1','TTF2','XXXX','XXXY','XXYY','YYYY','ZXXZ','ZXZX'],
    memorial_aerea: ['AAAA','ANO_ATUAL','BBBB','CABX1','CCCC','DDDD','EEEE','FFFF','GGGG','IAJU1','IBXX1','INXX1','IZXX1','IZXY1','MES_ATUAL','MMMM','PTF1','QTD11','QTDY1','XXXX','XXXY','XXYY','YYYY','ZXXZ','ZXZX'],
    'procuração': ['14 / 07 / 2026','14 de julho de 2025','AAAA','GGGG','IIII','JJJJ','KKKK','LLLL','MMMM','NNNN','OOOO','PJDP','PPPP','QQQQ','RRRR','SSSS','TTTT','UUUU','XXXY','XXYY'],
    termo_responsabilidade: ['14 de julho de 2025','GGGG','LLLL','MMMM','PPPP','TTTT','UUUU','XXXY'],
    carta_viabilidade: ['BBBB','CCCC','DDDD','DTFI','DTIN','GGGG','HHHH','MMMM','NNNN','OOOO','VVVV','XXXX','XXXY','XXYY','ZXZX'],
    'termo_nao_geração': ['14 de julho de 2025','AAAA','GGGG','JJJJ','NNNN','PPPP','TTTT','VVVV','XXXY','XXYY']
};

const derivadosTrafo = n => ['IBXX','INXX','IZXX','CABX','QTDY','IZXY','IAJU','IZ14','QTD1'].map(p => p + n);

const CAMPOS = {
    potencia:                { placeholders: ['XXXX'] },
    art:                     { placeholders: ['YYYY'] },
    tensao:                  { placeholders: ['DDDD'] },
    ramal_tamanho:           { placeholders: ['EEEE'] },
    ramal_cabo:              { placeholders: ['FFFF'] },
    tipo_subestacao:         { placeholders: [], docs: ['memorial'] },
    quantidade_trafos:       { placeholders: ['PTF2', 'TTF2', ...derivadosTrafo(2)] },
    tipo_trafo:              { placeholders: ['TIPO_TRAFO'] },
    potencia_trafo_1:        { placeholders: ['PTF1', ...derivadosTrafo(1)] },
    tensao_trafo_1:          { placeholders: ['TTF1', ...derivadosTrafo(1)] },
    potencia_trafo_2:        { placeholders: ['PTF2', ...derivadosTrafo(2)], quando: () => valor('quantidade_trafos') === '2' },
    tensao_trafo_2:          { placeholders: ['TTF2', ...derivadosTrafo(2)], quando: () => valor('quantidade_trafos') === '2' },
    nome_projeto:            { placeholders: ['GGGG'] },
    concessionaria:          { placeholders: ['LLLL'] },
    numero_uc:               { placeholders: ['VVVV'] },
    demanda:                 { placeholders: ['ZXZX'] },
    carga_instalada:         { placeholders: ['ZXXZ'] },
    tipo_pessoa_juridica:    { placeholders: ['PJDP'] },
    endereco_empreendimento: { placeholders: ['XXXY', 'ZZZZ'] },
    localizacao_projeto:     { placeholders: ['HHHH'] },
    data_inicio:             { placeholders: ['DTIN'] },
    data_fim:                { placeholders: ['DTFI'] },
    engenheiro:              { placeholders: ['XXYY','AAAA','BBBB','CCCC','IIII','JJJJ','KKKK'] },
    cliente:                 { placeholders: ['MMMM','NNNN','OOOO','PPPP','QQQQ','RRRR','SSSS','TTTT','UUUU'] }
};

// Placeholders literais de data presentes nos templates.
// A data da procuração ("14 / 07 / 2026") é a validade: hoje + 1 ano.
const PH_DATA_VALIDADE = '14 / 07 / 2026';
const PH_DATA_EXTENSO = '14 de julho de 2025';

const STORAGE_RASCUNHO = 'viabilidade:rascunho';
const STORAGE_PROJETOS = 'viabilidade:projetos';

// Variáveis globais
let documentosGerados = [];
let dadosProcessados = {};
let placeholdersTemplate = JSON.parse(JSON.stringify(PLACEHOLDERS_PADRAO));
const templateCache = {};
let timerRascunho = null;

// =====================================================================
// INICIALIZAÇÃO
// =====================================================================

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    setupDefaultDates();
    populateSelectors();
    populateTrafoPotenciasAndTensoes();
    criarIndicadoresDeUso();
    setupEventListeners();

    restaurarRascunho();
    popularProjetosSalvos();
    atualizarFormulario();

    await checkTemplates();
    atualizarFormulario(); // reavalia com os placeholders lidos dos templates
}

function valor(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

function populateTrafoPotenciasAndTensoes() {
    const addOptions = (id, placeholder, itens, rotulo) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
        itens.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = rotulo(item);
            select.appendChild(option);
        });
    };
    ['potencia_trafo_1', 'potencia_trafo_2'].forEach(id =>
        addOptions(id, 'Selecione a Potência (kVA)', PT_TRAFO, p => `${p} kVA`));
    ['tensao_trafo_1', 'tensao_trafo_2'].forEach(id =>
        addOptions(id, 'Selecione a Tensão', TENSOES_TRAFO, t => t));
}

function setupDefaultDates() {
    const hoje = new Date();
    const umAno = new Date();
    umAno.setFullYear(hoje.getFullYear() + 1);
    const dataInicio = document.getElementById('data_inicio');
    const dataFim = document.getElementById('data_fim');
    if (dataInicio) dataInicio.valueAsDate = hoje;
    if (dataFim) dataFim.valueAsDate = umAno;
}

function populateSelectors() {
    const engenheiroSelect = document.getElementById('engenheiro');
    const clienteSelect = document.getElementById('cliente');

    if (engenheiroSelect) {
        Object.keys(ENGENHEIROS).forEach(eng => {
            engenheiroSelect.appendChild(new Option(eng, eng));
        });
    }
    if (clienteSelect) {
        Object.keys(CLIENTES).forEach(cliente => {
            clienteSelect.appendChild(new Option(cliente, cliente));
        });
        clienteSelect.appendChild(new Option('Inserir cliente manualmente', CLIENTE_MANUAL_VALUE));
    }
}

// =====================================================================
// LEITURA DOS TEMPLATES (verificação + detecção de placeholders)
// =====================================================================

function extrairPlaceholders(arrayBuffer) {
    const zip = new PizZip(arrayBuffer);
    const encontrados = new Set();
    Object.keys(zip.files)
        .filter(nome => /^word\/.*\.xml$/.test(nome))
        .forEach(nome => {
            const xml = zip.file(nome).asText();
            // Junta o texto de cada parágrafo (o Word costuma quebrar [XXXX] em vários "runs")
            const paragrafos = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
            paragrafos.forEach(p => {
                const texto = (p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || [])
                    .map(t => t.replace(/<[^>]+>/g, ''))
                    .join('');
                (texto.match(/\[([^\[\]]{1,40})\]/g) || [])
                    .forEach(tag => encontrados.add(tag.slice(1, -1)));
            });
        });
    return [...encontrados];
}

async function carregarTemplate(chave) {
    if (templateCache[chave]) return templateCache[chave];
    const response = await fetch(TEMPLATES[chave]);
    if (!response.ok) throw new Error(`Template não encontrado: ${TEMPLATES[chave]}`);
    templateCache[chave] = await response.arrayBuffer();
    return templateCache[chave];
}

async function checkTemplates() {
    const statusElement = document.getElementById('template-status');
    const faltando = [];

    await Promise.all(Object.keys(TEMPLATES).map(async chave => {
        try {
            const buffer = await carregarTemplate(chave);
            const tags = extrairPlaceholders(buffer);
            if (tags.length) placeholdersTemplate[chave] = tags;
        } catch (error) {
            console.error(`Erro ao ler template ${chave}:`, error);
            faltando.push(chave);
        }
    }));

    if (!statusElement) return;
    if (faltando.length === 0) {
        statusElement.innerHTML = `
            <p><i class="fas fa-check-circle" style="color: var(--success);"></i> Todos os templates encontrados!</p>
            <small>Campos ajustados automaticamente a cada template</small>`;
    } else {
        statusElement.innerHTML = `
            <p><i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i> Templates não encontrados:</p>
            <small>${faltando.map(f => TEMPLATES[f].split('/').pop()).join('<br>')}</small>`;
    }
}

// =====================================================================
// CAMPOS DINÂMICOS (mostra só o necessário para os documentos marcados)
// =====================================================================

function getTiposSelecionados() {
    return DOCUMENTOS
        .filter(d => document.getElementById(d.checkbox)?.checked)
        .map(d => d.tipo);
}

function templatesDoDocumento(tipo) {
    if (tipo !== 'memorial') return [tipo];
    const sub = valor('tipo_subestacao');
    if (sub === 'aerea') return ['memorial_aerea'];
    if (sub === 'abrigada') return ['memorial'];
    return ['memorial', 'memorial_aerea'];
}

function placeholdersDoDocumento(tipo) {
    const set = new Set();
    templatesDoDocumento(tipo).forEach(t => (placeholdersTemplate[t] || []).forEach(p => set.add(p)));
    return set;
}

function documentoUsaCampo(tipo, campoId) {
    const def = CAMPOS[campoId];
    if (def.docs && def.docs.includes(tipo)) return true;
    const phs = placeholdersDoDocumento(tipo);
    return def.placeholders.some(p => phs.has(p));
}

function campoNecessario(campoId, tipos) {
    const def = CAMPOS[campoId];
    if (def.quando && !def.quando()) return false;
    return tipos.some(tipo => documentoUsaCampo(tipo, campoId));
}

function criarIndicadoresDeUso() {
    Object.keys(CAMPOS).forEach(id => {
        const grupo = document.getElementById(id)?.closest('.form-group');
        if (!grupo || grupo.querySelector('.field-docs')) return;
        const div = document.createElement('div');
        div.className = 'field-docs';
        grupo.appendChild(div);
    });
}

function atualizarFormulario() {
    const tipos = getTiposSelecionados();
    let totalNecessarios = 0;
    let totalPreenchidos = 0;

    Object.keys(CAMPOS).forEach(id => {
        const campo = document.getElementById(id);
        const grupo = campo?.closest('.form-group');
        if (!campo || !grupo) return;

        const necessario = campoNecessario(id, tipos);
        grupo.classList.toggle('hidden', !necessario);
        campo.required = necessario;
        if (!necessario) grupo.classList.remove('field-error');

        if (necessario) {
            totalNecessarios++;
            if (valor(id)) totalPreenchidos++;
        }

        // Etiquetas "usado em"
        const indicador = grupo.querySelector('.field-docs');
        if (indicador) {
            indicador.innerHTML = DOCUMENTOS
                .filter(d => documentoUsaCampo(d.tipo, id))
                .map(d => `<span class="doc-chip${tipos.includes(d.tipo) ? ' active' : ''}">${d.curto}</span>`)
                .join('');
        }
    });

    // Bloco do Trafo 2
    const trafo2 = document.getElementById('trafo_2_fields');
    if (trafo2) trafo2.classList.toggle('hidden', !campoNecessario('potencia_trafo_2', tipos));

    // Painel de cliente manual
    const clienteNecessario = campoNecessario('cliente', tipos);
    const manual = clienteNecessario && valor('cliente') === CLIENTE_MANUAL_VALUE;
    const painel = document.getElementById('cliente-manual-fields');
    if (painel) {
        painel.classList.toggle('hidden', !manual);
        painel.setAttribute('aria-hidden', String(!manual));
    }
    CLIENTE_MANUAL_FIELD_IDS.forEach(fid => {
        const f = document.getElementById(fid);
        if (!f) return;
        f.required = manual;
        if (manual) {
            totalNecessarios++;
            if (valor(fid)) totalPreenchidos++;
        } else {
            f.closest('.form-group')?.classList.remove('field-error');
        }
    });

    // Seções sem nenhum campo visível somem
    document.querySelectorAll('#document-form .form-section:not([data-always-visible])').forEach(secao => {
        secao.classList.remove('hidden'); // reavalia do zero (senão a própria seção conta como "escondida")
        const visivel = [...secao.querySelectorAll('.form-group')]
            .some(g => !g.classList.contains('hidden') && !g.closest('.hidden'));
        secao.classList.toggle('hidden', !visivel);
    });

    // Preset ativo
    document.querySelectorAll('.preset-btn').forEach(btn => {
        const preset = PRESETS[btn.dataset.preset] || [];
        const igual = preset.length === tipos.length && preset.every(t => tipos.includes(t));
        btn.classList.toggle('active', igual);
    });

    // Contador
    const contador = document.getElementById('fields-counter');
    if (contador) {
        if (tipos.length === 0) {
            contador.innerHTML = '<i class="fas fa-info-circle"></i> Selecione pelo menos um documento.';
        } else {
            const faltam = totalNecessarios - totalPreenchidos;
            contador.innerHTML = faltam === 0
                ? `<i class="fas fa-check-circle"></i> ${totalNecessarios} campos necessários — tudo preenchido.`
                : `<i class="fas fa-list-check"></i> ${totalNecessarios} campos necessários para ${tipos.length} documento(s) — faltam <strong>${faltam}</strong>.`;
            contador.classList.toggle('complete', faltam === 0);
        }
    }

    const btn = document.getElementById('generate-btn');
    if (btn && !btn.disabled) btn.innerHTML = textoBotaoGerar(tipos.length);
}

function textoBotaoGerar(qtd) {
    return qtd === 1
        ? '<i class="fas fa-file-word"></i> Gerar Documento Word'
        : `<i class="fas fa-file-word"></i> Gerar ${qtd || ''} Documentos Word`;
}

function aplicarPreset(nome) {
    const tipos = PRESETS[nome];
    if (!tipos) return;
    DOCUMENTOS.forEach(d => {
        const cb = document.getElementById(d.checkbox);
        if (cb) cb.checked = tipos.includes(d.tipo);
    });
    atualizarFormulario();
    agendarRascunho();
}

// =====================================================================
// EVENTOS
// =====================================================================

function setupEventListeners() {
    const form = document.getElementById('document-form');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            processarFormulario();
        });
        form.addEventListener('change', e => {
            if (e.target.id === 'projeto_salvo') return;
            if (e.target.id === 'quantidade_trafos' && e.target.value !== '2') {
                ['potencia_trafo_2', 'tensao_trafo_2'].forEach(id => {
                    const f = document.getElementById(id);
                    if (f) f.value = '';
                });
            }
            if (e.target.id === 'cliente' && e.target.value === CLIENTE_MANUAL_VALUE) {
                setTimeout(() => document.getElementById('cliente_manual_nome')?.focus(), 0);
            }
            atualizarFormulario();
            agendarRascunho();
        });
        form.addEventListener('input', e => {
            e.target.closest('.form-group')?.classList.remove('field-error');
            agendarRascunho();
            clearTimeout(form._contadorTimer);
            form._contadorTimer = setTimeout(atualizarFormulario, 250);
        });
    }

    document.querySelectorAll('.preset-btn').forEach(btn =>
        btn.addEventListener('click', () => aplicarPreset(btn.dataset.preset)));

    document.getElementById('reset-btn')?.addEventListener('click', limparFormulario);
    document.getElementById('copy-data-btn')?.addEventListener('click', copiarDados);
    document.getElementById('download-all-btn')?.addEventListener('click', baixarTodosDocumentos);

    document.getElementById('btn-carregar-projeto')?.addEventListener('click', carregarProjetoSelecionado);
    document.getElementById('btn-salvar-projeto')?.addEventListener('click', () => {
        const nome = salvarProjetoAtual();
        if (nome) mostrarFeedback(`<i class="fas fa-save"></i> Projeto <strong>${escapeHtml(nome)}</strong> salvo.`, 'sucesso');
        else mostrarFeedback('<i class="fas fa-info-circle"></i> Preencha o <strong>Nome do projeto</strong> para salvar.', 'erro');
    });
    document.getElementById('btn-excluir-projeto')?.addEventListener('click', excluirProjetoSelecionado);
}

function limparFormulario() {
    const form = document.getElementById('document-form');
    if (form) form.reset();
    try { localStorage.removeItem(STORAGE_RASCUNHO); } catch (e) { /* sem storage */ }
    setupDefaultDates();
    document.querySelectorAll('.field-error').forEach(g => g.classList.remove('field-error'));
    esconderFeedback();
    atualizarFormulario();
    document.getElementById('results-section')?.classList.add('hidden');
}

// =====================================================================
// RASCUNHO AUTOMÁTICO E PROJETOS SALVOS
// =====================================================================

function camposPersistiveis() {
    return [...document.querySelectorAll('#document-form input[id], #document-form select[id]')]
        .filter(el => !el.hasAttribute('data-no-persist'));
}

function lerEstado({ incluirSelecaoDocs = true } = {}) {
    const estado = {};
    camposPersistiveis().forEach(el => {
        if (!incluirSelecaoDocs && el.id.startsWith('gerar_')) return;
        estado[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return estado;
}

function aplicarEstado(estado) {
    if (!estado) return;
    // quantidade_trafos primeiro, para o Trafo 2 aparecer antes de receber valor
    const ids = Object.keys(estado).sort((a, b) => (a === 'quantidade_trafos' ? -1 : b === 'quantidade_trafos' ? 1 : 0));
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.hasAttribute('data-no-persist')) return;
        if (el.type === 'checkbox') {
            el.checked = Boolean(estado[id]);
        } else if (el.tagName === 'SELECT') {
            const existe = [...el.options].some(o => o.value === String(estado[id]));
            if (existe) el.value = estado[id];
        } else {
            el.value = estado[id] ?? '';
        }
    });
    atualizarFormulario();
}

function lerStorage(chave, padrao) {
    try {
        const bruto = localStorage.getItem(chave);
        return bruto ? JSON.parse(bruto) : padrao;
    } catch (e) {
        return padrao;
    }
}

function gravarStorage(chave, valorObj) {
    try {
        localStorage.setItem(chave, JSON.stringify(valorObj));
        return true;
    } catch (e) {
        console.warn('Não foi possível salvar no navegador:', e);
        return false;
    }
}

function agendarRascunho() {
    clearTimeout(timerRascunho);
    timerRascunho = setTimeout(() => gravarStorage(STORAGE_RASCUNHO, lerEstado()), 400);
}

function restaurarRascunho() {
    const rascunho = lerStorage(STORAGE_RASCUNHO, null);
    if (rascunho) aplicarEstado(rascunho);
}

function popularProjetosSalvos(selecionar = '') {
    const select = document.getElementById('projeto_salvo');
    if (!select) return;
    const projetos = lerStorage(STORAGE_PROJETOS, {});
    const nomes = Object.keys(projetos).sort((a, b) =>
        String(projetos[b].salvoEm).localeCompare(String(projetos[a].salvoEm)));

    select.innerHTML = nomes.length
        ? '<option value="">Selecione um projeto…</option>'
        : '<option value="">Nenhum projeto salvo ainda</option>';
    nomes.forEach(nome => {
        const data = projetos[nome].salvoEm ? new Date(projetos[nome].salvoEm).toLocaleDateString('pt-BR') : '';
        select.appendChild(new Option(data ? `${nome} — ${data}` : nome, nome));
    });
    if (selecionar) select.value = selecionar;
}

function salvarProjetoAtual() {
    const nome = valor('nome_projeto');
    if (!nome) return null;
    const projetos = lerStorage(STORAGE_PROJETOS, {});
    // Mescla com o que já existia: gerar só a procuração não apaga dados técnicos salvos antes
    const anterior = projetos[nome]?.estado || {};
    const atual = lerEstado({ incluirSelecaoDocs: false });
    const mesclado = { ...anterior };
    Object.keys(atual).forEach(id => {
        if (atual[id] !== '' && atual[id] !== null) mesclado[id] = atual[id];
    });
    projetos[nome] = { estado: mesclado, salvoEm: new Date().toISOString() };
    gravarStorage(STORAGE_PROJETOS, projetos);
    popularProjetosSalvos(nome);
    return nome;
}

function carregarProjetoSelecionado() {
    const nome = valor('projeto_salvo');
    if (!nome) {
        mostrarFeedback('<i class="fas fa-info-circle"></i> Escolha um projeto na lista para carregar.', 'erro');
        return;
    }
    const projeto = lerStorage(STORAGE_PROJETOS, {})[nome];
    if (!projeto) return;
    aplicarEstado(projeto.estado);
    document.querySelectorAll('.field-error').forEach(g => g.classList.remove('field-error'));
    agendarRascunho();
    mostrarFeedback(`<i class="fas fa-check-circle"></i> Dados de <strong>${escapeHtml(nome)}</strong> carregados. Marque os documentos desejados e gere.`, 'sucesso');
}

function excluirProjetoSelecionado() {
    const nome = valor('projeto_salvo');
    if (!nome) return;
    if (!confirm(`Excluir o projeto salvo "${nome}"?`)) return;
    const projetos = lerStorage(STORAGE_PROJETOS, {});
    delete projetos[nome];
    gravarStorage(STORAGE_PROJETOS, projetos);
    popularProjetosSalvos();
}

// =====================================================================
// FEEDBACK E VALIDAÇÃO
// =====================================================================

function escapeHtml(texto) {
    return String(texto).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mostrarFeedback(html, tipo = 'erro') {
    const box = document.getElementById('form-feedback');
    if (!box) { alert(html.replace(/<[^>]+>/g, '')); return; }
    box.innerHTML = html;
    box.className = `form-feedback ${tipo}`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function esconderFeedback() {
    document.getElementById('form-feedback')?.classList.add('hidden');
}

function rotuloDoCampo(id) {
    const label = document.querySelector(`label[for="${id}"]`);
    return label ? label.textContent.replace('*', '').replace(/:\s*$/, '').trim() : id;
}

function validarFormulario() {
    const tipos = getTiposSelecionados();
    document.querySelectorAll('.field-error').forEach(g => g.classList.remove('field-error'));

    if (tipos.length === 0) {
        mostrarFeedback('<i class="fas fa-info-circle"></i> Selecione pelo menos um documento para gerar.', 'erro');
        return false;
    }

    const faltando = Object.keys(CAMPOS).filter(id => campoNecessario(id, tipos) && !valor(id));
    if (campoNecessario('cliente', tipos) && valor('cliente') === CLIENTE_MANUAL_VALUE) {
        faltando.push(...CLIENTE_MANUAL_FIELD_IDS.filter(id => !valor(id)));
    }

    if (faltando.length) {
        faltando.forEach(id => document.getElementById(id)?.closest('.form-group')?.classList.add('field-error'));
        mostrarFeedback(
            `<i class="fas fa-exclamation-triangle"></i> Preencha ${faltando.length === 1 ? 'o campo' : 'os campos'}: ` +
            faltando.map(id => `<strong>${escapeHtml(rotuloDoCampo(id))}</strong>`).join(', '),
            'erro'
        );
        document.getElementById(faltando[0])?.focus({ preventScroll: true });
        return false;
    }

    if (campoNecessario('data_fim', tipos) && campoNecessario('data_inicio', tipos)
        && valor('data_fim') < valor('data_inicio')) {
        document.getElementById('data_fim')?.closest('.form-group')?.classList.add('field-error');
        mostrarFeedback('<i class="fas fa-exclamation-triangle"></i> O <strong>Fim da Obra</strong> está antes do início.', 'erro');
        return false;
    }

    esconderFeedback();
    return true;
}

// =====================================================================
// PROCESSAMENTO
// =====================================================================

function extrairMunicipio(enderecoCompleto) {
    if (!enderecoCompleto) return "Boa Vista";
    const partes = enderecoCompleto.split(',');
    if (partes.length >= 3) {
        let cidadeUf = partes[partes.length - 1].trim();
        cidadeUf = cidadeUf.split('CEP')[0].trim();
        if (cidadeUf.includes('-')) return cidadeUf.split('-')[0].trim();
        return cidadeUf;
    }
    return "Boa Vista";
}

async function processarFormulario() {
    if (!validarFormulario()) return;
    showLoading(true);

    try {
        const dados = coletarDadosFormulario();
        const documentosParaGerar = getDocumentosSelecionados();
        await gerarDocumentosWord(dados, documentosParaGerar);

        salvarProjetoAtual();
        exibirResultados();

        // Um único documento (ex.: só a procuração): baixa direto
        if (documentosGerados.length === 1) baixarDocumentoWord(0);
    } catch (error) {
        console.error('Erro ao processar:', error);
        mostrarFeedback(`<i class="fas fa-times-circle"></i> Erro ao gerar documentos: ${escapeHtml(error.message)}`, 'erro');
    } finally {
        showLoading(false);
    }
}

/**
 * Calcula os dados de proteção (IB, IN, IZ, CAB, QTD_CAB, I_CAB, I_AJUSTE, IZ x 1,45)
 * para um transformador específico.
 */
function getTrafoData(potencia, tensao, trafoNumber) {
    const vazio = () => Object.fromEntries(derivadosTrafo(trafoNumber).map(k => [k, 'N/A']));
    if (!potencia || !tensao) return vazio();

    const index = PT_TRAFO.indexOf(parseFloat(potencia));
    if (index === -1) {
        console.error(`Potência ${potencia} não encontrada em PT_TRAFO.`);
        return vazio();
    }

    let t;
    if (tensao === "220/127V") {
        t = { IB: IB_220, IN: IN_220, IZ: IZ_220, CAB: CAB_220, QTD_CAB: QTD_CAB_220, I_CAB: I_CAB_220, AJ: I_AJUSTE_220, QTD: QTD_220 };
    } else if (tensao === "380V/220V") {
        t = { IB: IB_380, IN: IN_380, IZ: IZ_380, CAB: CAB_380, QTD_CAB: QTD_CAB_380, I_CAB: I_CAB_380, AJ: I_AJUSTE_380, QTD: QTD_380 };
    } else {
        return vazio();
    }

    const izValue = parseFloat(t.IZ[index]);
    return {
        [`IBXX${trafoNumber}`]: t.IB[index],
        [`INXX${trafoNumber}`]: t.IN[index],
        [`IZXX${trafoNumber}`]: t.IZ[index],
        [`CABX${trafoNumber}`]: t.CAB[index],
        [`QTDY${trafoNumber}`]: t.QTD_CAB[index],
        [`IZXY${trafoNumber}`]: t.I_CAB[index],
        [`IAJU${trafoNumber}`]: t.AJ[index],
        [`IZ14${trafoNumber}`]: isNaN(izValue) ? 'N/A' : (izValue * 1.45).toFixed(2),
        [`QTD1${trafoNumber}`]: t.QTD[index]
    };
}

function coletarDadosFormulario() {
    const potencia1 = valor('potencia_trafo_1');
    const tensao1 = valor('tensao_trafo_1');
    const qtdTrafos = valor('quantidade_trafos') || '1';
    const potencia2 = qtdTrafos === '2' ? valor('potencia_trafo_2') : '';
    const tensao2 = qtdTrafos === '2' ? valor('tensao_trafo_2') : '';

    const dados = {
        'XXXX': valor('potencia'),
        'YYYY': valor('art'),
        'DDDD': valor('tensao'),
        'EEEE': valor('ramal_tamanho'),
        'FFFF': valor('ramal_cabo'),
        'PTF1': potencia1,
        'TTF1': tensao1,
        'PTF2': potencia2 || 'N/A',
        'TTF2': tensao2 || 'N/A',
        'TIPO_TRAFO': valor('tipo_trafo') || 'N/A',
        'ZXXZ': valor('carga_instalada'),
        ...getTrafoData(potencia1, tensao1, 1),
        ...getTrafoData(potencia2, tensao2, 2),
        'GGGG': valor('nome_projeto'),
        'LLLL': valor('concessionaria'),
        'XXXY': valor('endereco_empreendimento'),
        'HHHH': valor('localizacao_projeto'),
        'VVVV': valor('numero_uc'),
        'ZXZX': valor('demanda'),
        'DTIN': formatarData(valor('data_inicio')),
        'DTFI': formatarData(valor('data_fim')),
        'PJDP': valor('tipo_pessoa_juridica').toLowerCase()
    };

    // Engenheiro
    const engenheiroNome = valor('engenheiro');
    const engData = ENGENHEIROS[engenheiroNome] || {};
    Object.assign(dados, {
        'XXYY': engenheiroNome,
        'AAAA': engData.CREA || '',
        'BBBB': engData.EMAIL || '',
        'CCCC': engData.FONE || '',
        'IIII': engData.RG || '',
        'JJJJ': engData.CPF || '',
        'KKKK': engData.ENDERECO || ''
    });

    // Cliente
    const clienteNome = valor('cliente');
    const clienteManual = clienteNome === CLIENTE_MANUAL_VALUE;
    const cliData = clienteManual ? {
        CNPJ: valor('cliente_manual_cnpj'),
        END_SEDE: valor('cliente_manual_endereco'),
        RESPONSAVEL: valor('cliente_manual_responsavel'),
        NACIONALIDADE: valor('cliente_manual_nacionalidade'),
        ESTADO_CIVIL: valor('cliente_manual_estado_civil'),
        IDENTIDADE: valor('cliente_manual_identidade'),
        CPF: valor('cliente_manual_cpf'),
        DOMICILIO: valor('cliente_manual_domicilio')
    } : (CLIENTES[clienteNome] || {});
    Object.assign(dados, {
        'MMMM': clienteManual ? valor('cliente_manual_nome') : clienteNome,
        'NNNN': cliData.CNPJ || '',
        'OOOO': cliData.END_SEDE || '',
        'PPPP': cliData.RESPONSAVEL || '',
        'QQQQ': cliData.NACIONALIDADE || '',
        'RRRR': cliData.ESTADO_CIVIL || '',
        'SSSS': cliData.IDENTIDADE || '',
        'TTTT': cliData.CPF || '',
        'UUUU': cliData.DOMICILIO || ''
    });

    dados['ZZZZ'] = extrairMunicipio(dados['XXXY']);

    // Datas automáticas
    const hoje = new Date();
    const dia = hoje.getDate().toString().padStart(2, '0');
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const mesPortugues = MESES_PT_BR[hoje.toLocaleString('en-US', { month: 'long' })];
    dados[PH_DATA_VALIDADE] = `${dia} / ${mes} / ${hoje.getFullYear() + 1}`;
    dados[PH_DATA_EXTENSO] = `${dia} de ${mesPortugues} de ${hoje.getFullYear()}`;
    dados['MES_ATUAL'] = mesPortugues.toUpperCase();
    dados['ANO_ATUAL'] = hoje.getFullYear().toString();

    dadosProcessados = { ...dados, tipo_subestacao: valor('tipo_subestacao') };
    return dados;
}

function formatarData(dataString) {
    if (!dataString) return '';
    // Monta a data no fuso local para não "voltar" um dia (new Date('YYYY-MM-DD') é UTC)
    const [ano, mes, dia] = dataString.split('-').map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
}

function getDocumentosSelecionados() {
    const tipos = getTiposSelecionados();
    return DOCUMENTOS
        .filter(d => tipos.includes(d.tipo))
        .map(d => ({ tipo: d.tipo, nome: d.nome, nomeArquivo: d.nome }));
}

function nomeSeguroArquivo(texto) {
    return String(texto || 'projeto')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'projeto';
}

async function gerarDocumentosWord(dados, documentosParaGerar) {
    documentosGerados = [];
    const nomeProjeto = nomeSeguroArquivo(dados['GGGG']);

    for (const docInfo of documentosParaGerar) {
        const chave = templatesDoDocumento(docInfo.tipo)[0];
        const arrayBuffer = await carregarTemplate(chave);
        const docxContent = processarTemplateWord(arrayBuffer, dados, docInfo.nome);

        documentosGerados.push({
            nome: docInfo.nome,
            nomeArquivo: `${docInfo.nomeArquivo} - ${nomeProjeto}.docx`,
            conteudo: docxContent,
            tipo: docInfo.tipo
        });
    }
}

function processarTemplateWord(arrayBuffer, dados, nomeDocumento = '') {
    const naoPreenchidos = new Set();
    try {
        // PizZip recebe uma cópia para o cache do template continuar intacto
        const zip = new PizZip(arrayBuffer.slice(0));
        const doc = new docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '[', end: ']' },
            nullGetter(part) {
                naoPreenchidos.add(part.value);
                return '';
            }
        });

        doc.render(dados);

        if (naoPreenchidos.size) {
            console.warn(`[${nomeDocumento}] placeholders sem valor:`, [...naoPreenchidos]);
        }

        return doc.getZip().generate({
            type: "arraybuffer",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            compression: "DEFLATE"
        });
    } catch (error) {
        console.error('Erro ao processar template Word:', error);
        if (error.properties) {
            console.log('Descrição do erro:', error.properties.explanation);
            console.log('Erro na tag:', error.properties.xtag);
        }
        throw new Error(`Falha ao gerar "${nomeDocumento}".`);
    }
}

// =====================================================================
// RESULTADOS E DOWNLOAD
// =====================================================================

function exibirResultados() {
    const resultsSection = document.getElementById('results-section');
    const documentsContainer = document.getElementById('documents-container');
    const dataSummaryContent = document.getElementById('data-summary-content');

    documentsContainer.innerHTML = '';
    documentosGerados.forEach((doc, index) => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.innerHTML = `
            <h4><i class="fas fa-file-word"></i> ${escapeHtml(doc.nome)}</h4>
            <p>Arquivo: <strong>${escapeHtml(doc.nomeArquivo)}</strong></p>
            <div class="document-buttons">
                <button type="button" class="btn-download"><i class="fas fa-download"></i> Baixar Word</button>
            </div>`;
        card.querySelector('.btn-download').addEventListener('click', () => baixarDocumentoWord(index));
        documentsContainer.appendChild(card);
    });

    // Lote só faz sentido com mais de um documento
    document.querySelector('.download-options')?.classList.toggle('hidden', documentosGerados.length < 2);

    // Resumo: só os placeholders usados nos documentos gerados
    const usados = new Set();
    documentosGerados.forEach(d => placeholdersDoDocumento(d.tipo).forEach(p => usados.add(p)));
    const resumo = {};
    Object.keys(dadosProcessados)
        .filter(k => usados.has(k) && k !== PH_DATA_VALIDADE && k !== PH_DATA_EXTENSO)
        .sort()
        .forEach(k => { resumo[k] = dadosProcessados[k]; });
    dataSummaryContent.textContent = JSON.stringify(resumo, null, 2);

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function baixarBlob(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function baixarDocumentoWord(index) {
    const doc = documentosGerados[index];
    if (!doc) return;
    baixarBlob(new Blob([doc.conteudo], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }), doc.nomeArquivo);
    showDownloadFeedback(doc.nome);
}

function baixarTodosDocumentos() {
    if (documentosGerados.length === 0) {
        mostrarFeedback('Nenhum documento para baixar.', 'erro');
        return;
    }
    const zip = new JSZip();
    documentosGerados.forEach(doc => zip.file(doc.nomeArquivo, doc.conteudo));
    zip.generateAsync({ type: 'blob' })
        .then(content => {
            baixarBlob(content, `Documentos_${nomeSeguroArquivo(dadosProcessados['GGGG'])}.zip`);
            showDownloadFeedback('todos os documentos');
        })
        .catch(error => {
            console.error('Erro ao criar ZIP:', error);
            mostrarFeedback('Erro ao criar arquivo ZIP.', 'erro');
        });
}

function copiarDados() {
    const texto = document.getElementById('data-summary-content').textContent;
    navigator.clipboard.writeText(texto)
        .then(() => {
            const btn = document.getElementById('copy-data-btn');
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            setTimeout(() => { btn.innerHTML = original; }, 2000);
        })
        .catch(err => console.error('Erro ao copiar:', err));
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    const generateBtn = document.getElementById('generate-btn');
    loading?.classList.toggle('hidden', !show);
    if (!generateBtn) return;
    generateBtn.disabled = show;
    generateBtn.innerHTML = show
        ? '<i class="fas fa-spinner fa-spin"></i> Processando...'
        : textoBotaoGerar(getTiposSelecionados().length);
}

function showDownloadFeedback(nomeDocumento) {
    const originalTitle = document.title;
    document.title = `✓ ${nomeDocumento} baixado! - Gerador de Documentos`;
    setTimeout(() => { document.title = originalTitle; }, 1500);
}

// =====================================================================
// TEMA
// =====================================================================

function initThemeSelector() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'light';
    themeToggle.addEventListener('change', function () {
        const theme = this.checked ? 'light' : 'dark';
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });
}

initThemeSelector();
