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
    "memorial": "templates/memorial-descritivo.docx",
    "procuração": "templates/procuração.docx",
    "termo_responsabilidade": "templates/termo-responsabilidade.docx",
    "carta_viabilidade": "templates/carta-viabilidade.docx",
    "termo_nao_geração": "templates/termo-nao-geração.docx"
};

// Variáveis globais
let documentosGerados = [];
let dadosProcessados = {};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    // Configurar datas padrão
    setupDefaultDates();
    
    // Preencher seletores
    populateSelectors();
    
    // NOVO: Função que preenche Potências E Tensões dos Trafos
    populateTrafoPotenciasAndTensoes();
    setupTrafoQuantityListener();
    
    // Verificar templates
    await checkTemplates();
    
    // Configurar eventos
    setupEventListeners();
}

/**
 * NOVO: Função para popular Potências e TENSÕES para os transformadores.
 * Incluído para compatibilidade com o HTML da interação anterior.
 */
function populateTrafoPotenciasAndTensoes() {
    const select1 = document.getElementById('potencia_trafo_1');
    const select2 = document.getElementById('potencia_trafo_2');
    const tensao1 = document.getElementById('tensao_trafo_1');
    const tensao2 = document.getElementById('tensao_trafo_2');

    // 1. Potências
    function addPotenciaOptions(selectElement) {
        if (!selectElement) return;
        selectElement.innerHTML = '<option value="" disabled selected>Selecione a Potência (kVA)</option>';
        PT_TRAFO.forEach(potencia => {
            const option = document.createElement('option');
            option.value = potencia;
            option.textContent = `${potencia} kVA`;
            selectElement.appendChild(option);
        });
    }
    
    // 2. Tensões
    function addTensaoOptions(selectElement) {
        if (!selectElement) return;
        selectElement.innerHTML = '<option value="" disabled selected>Selecione a Tensão</option>';
        TENSOES_TRAFO.forEach(tensao => {
            const option = document.createElement('option');
            option.value = tensao;
            option.textContent = tensao;
            selectElement.appendChild(option);
        });
    }

    addPotenciaOptions(select1);
    addPotenciaOptions(select2);
    addTensaoOptions(tensao1);
    addTensaoOptions(tensao2);
}

/**
 * NOVO: Função para controlar a visibilidade dos campos do Trafo 2.
 * Incluído para compatibilidade com o HTML da interação anterior.
 */
function setupTrafoQuantityListener() {
    const quantitySelect = document.getElementById('quantidade_trafos');
    const trafo2Fields = document.getElementById('trafo_2_fields');
    
    if (!quantitySelect || !trafo2Fields) return;
    
    const potencia2 = document.getElementById('potencia_trafo_2');
    const tensao2 = document.getElementById('tensao_trafo_2');

    function toggleTrafo2(show) {
        trafo2Fields.style.display = show ? 'grid' : 'none';
        
        // Define/remove a obrigatoriedade dos campos
        if (potencia2) potencia2.required = show;
        if (tensao2) tensao2.required = show;
        
        // Limpa os valores se for desativado
        if (!show) {
            if (potencia2) potencia2.value = '';
            if (tensao2) tensao2.value = ''; 
        }
    }

    // Inicialização 
    toggleTrafo2(quantitySelect.value === '2');

    quantitySelect.addEventListener('change', (event) => {
        toggleTrafo2(event.target.value === '2');
    });
}


function setupDefaultDates() {
    const hoje = new Date();
    const umAno = new Date();
    umAno.setFullYear(hoje.getFullYear() + 1);
    
    // Formatando para input type="date"
    const dataInicio = document.getElementById('data_inicio');
    const dataFim = document.getElementById('data_fim');
    
    if (dataInicio) dataInicio.valueAsDate = hoje;
    if (dataFim) dataFim.valueAsDate = umAno;
}

function populateSelectors() {
    const engenheiroSelect = document.getElementById('engenheiro');
    const clienteSelect = document.getElementById('cliente');
    
    // Adicionar opções de engenheiros
    if (engenheiroSelect) {
        Object.keys(ENGENHEIROS).forEach(eng => {
            const option = document.createElement('option');
            option.value = eng;
            option.textContent = eng;
            engenheiroSelect.appendChild(option);
        });
    }
    
    // Adicionar opções de clientes
    if (clienteSelect) {
        Object.keys(CLIENTES).forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente;
            option.textContent = cliente;
            clienteSelect.appendChild(option);
        });
    }
}

async function checkTemplates() {
    const statusElement = document.getElementById('template-status');
    
    try {
        const templates = await Promise.all(
            Object.values(TEMPLATES).map(template => fetch(template).then(res => res.ok))
        );
        
        const allExist = templates.every(exists => exists);
        
        if (allExist) {
            statusElement.innerHTML = `
                <p><i class="fas fa-check-circle" style="color: #27ae60;"></i> 
                Todos os templates encontrados!</p>
                <small>Pronto para gerar documentos Word</small>
            `;
        } else {
            statusElement.innerHTML = `
                <p><i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i> 
                Alguns templates não foram encontrados</p>
                <small>Verifique a pasta /templates/</small>
            `;
        }
    } catch (error) {
        statusElement.innerHTML = `
            <p><i class="fas fa-times-circle" style="color: #e74c3c;"></i> 
            Erro ao verificar templates</p>
            <small>Verifique o console para detalhes</small>
        `;
        console.error('Erro ao verificar templates:', error);
    }
}

function setupEventListeners() {
    const form = document.getElementById('document-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            processarFormulario();
        });
    }
    
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (form) form.reset();
            setupDefaultDates();
            // Recarrega as opções de potência e tensão e listener
            populateTrafoPotenciasAndTensoes();
            setupTrafoQuantityListener();
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) resultsSection.classList.add('hidden');
        });
    }
    
    // Botão copiar dados
    const copyBtn = document.getElementById('copy-data-btn');
    if (copyBtn) copyBtn.addEventListener('click', copiarDados);
    
    // Botão download individual
    const downloadIndividualBtn = document.getElementById('download-individual-btn');
    if (downloadIndividualBtn) {
        downloadIndividualBtn.addEventListener('click', () => {
            alert('Para abrir a pasta de downloads, verifique sua pasta padrão de downloads.');
        });
    }
}

// Função para extrair município
function extrairMunicipio(enderecoCompleto) {
    if (!enderecoCompleto) return "Boa Vista";
    
    const partes = enderecoCompleto.split(',');
    if (partes.length >= 3) {
        let cidadeUf = partes[partes.length - 1].trim();
        cidadeUf = cidadeUf.split('CEP')[0].trim();
        if (cidadeUf.includes('-')) {
            return cidadeUf.split('-')[0].trim();
        }
        return cidadeUf;
    }
    return "Boa Vista";
}

// Função principal para processar formulário
async function processarFormulario() {
    // Validar campos obrigatórios
    if (!validarFormulario()) return;
    
    // Mostrar loading
    showLoading(true);
    
    try {
        // Coletar e processar dados
        const dados = coletarDadosFormulario();
        
        // Verificar quais documentos gerar
        const documentosParaGerar = getDocumentosSelecionados();
        
        if (documentosParaGerar.length === 0) {
            alert('Selecione pelo menos um documento para gerar.');
            showLoading(false);
            return;
        }
        
        // Gerar documentos
        await gerarDocumentosWord(dados, documentosParaGerar);
        
        // Exibir resultados
        exibirResultados();
        
    } catch (error) {
        console.error('Erro ao processar:', error);
        alert('Erro ao gerar documentos. Verifique o console para detalhes.');
    } finally {
        showLoading(false);
    }
}

function validarFormulario() {
    const camposObrigatorios = [
        'potencia', 'art', 'tensao', 'ramal_tamanho', 'ramal_cabo',
        'potencia_trafo_1', 'tensao_trafo_1', 'tipo_trafo', // Novos campos de Trafo 1 e Tipo
        'carga_instalada', // Campo movido/novo
        'nome_projeto', 'concessionaria', 'endereco_empreendimento',
        'localizacao_projeto', 'numero_uc', 'demanda', 'data_inicio', 'data_fim',
        'engenheiro', 'cliente', 'tipo_pessoa_juridica'
    ];
    
    // Adiciona Trafo 2 condicionalmente
    const qtdTrafosElement = document.getElementById('quantidade_trafos');
    if (qtdTrafosElement && qtdTrafosElement.value === '2') {
        camposObrigatorios.push('potencia_trafo_2', 'tensao_trafo_2');
    }
    
    for (const campoId of camposObrigatorios) {
        const campo = document.getElementById(campoId);
        if (!campo || !campo.value.trim()) {
            const labelText = campo ? (campo.previousElementSibling ? campo.previousElementSibling.textContent.replace('*', '').trim() : campoId) : campoId;
            alert(`Por favor, preencha o campo obrigatório: ${labelText}`);
            if (campo) campo.focus();
            return false;
        }
    }
    
    return true;
}

/**
 * FUNÇÃO DE AJUDA: Calcula os dados de proteção (IB, IN, IZ, CAB, QTD_CAB, I_CAB, I_AJUSTE, IZ_X_145)
 * para um transformador específico.
 */
function getTrafoData(potencia, tensao, trafoNumber) {
    // Retorna N/A se a potência ou tensão estiverem faltando
    if (!potencia || !tensao) {
        return {
            [`IBXX${trafoNumber}`]: 'N/A',
            [`INXX${trafoNumber}`]: 'N/A',
            [`IZXX${trafoNumber}`]: 'N/A',
            [`CABX${trafoNumber}`]: 'N/A',
            [`QTDY${trafoNumber}`]: 'N/A',
            [`IZXY${trafoNumber}`]: 'N/A', 
            [`IAJU${trafoNumber}`]: 'N/A',
            // NOVO
            [`IZ14${trafoNumber}`]: 'N/A',
            [`QTD1${trafoNumber}`]: 'N/A'
        };
    }

    // Busca o índice da potência no array PT_TRAFO
    const index = PT_TRAFO.indexOf(parseFloat(potencia));

    if (index === -1) {
        console.error(`Potência ${potencia} não encontrada em PT_TRAFO.`);
        return getTrafoData('', '', trafoNumber); // Fallback para N/A
    }

    let IB_ARR, IN_ARR, IZ_ARR, CAB_ARR, QTD_CAB_ARR;
    let I_CAB_ARR, I_AJUSTE_ARR; 
    let IZ_TO_CALCULATE_ARR; // Array base para o cálculo de 1,45
    let QTD_ARR;
    
    // Seleciona o conjunto de arrays de proteção com base na tensão
    if (tensao === "220/127V") {
        IB_ARR = IB_220;
        IN_ARR = IN_220;
        IZ_ARR = IZ_220;
        CAB_ARR = CAB_220;
        QTD_CAB_ARR = QTD_CAB_220;
        
        I_CAB_ARR = I_CAB_220;
        I_AJUSTE_ARR = I_AJUSTE_220;
        
        IZ_TO_CALCULATE_ARR = IZ_220; // Usar IZ_220 para cálculo
        QTD_ARR = QTD_220
        
    } else if (tensao === "380V/220V") {
        IB_ARR = IB_380;
        IN_ARR = IN_380;
        IZ_ARR = IZ_380;
        CAB_ARR = CAB_380;
        QTD_CAB_ARR = QTD_CAB_380;
        
        I_CAB_ARR = I_CAB_380;
        I_AJUSTE_ARR = I_AJUSTE_380;
        
        IZ_TO_CALCULATE_ARR = IZ_380; // Usar IZ_380 para cálculo
        QTD_ARR = QTD_380;
    } else {
        return getTrafoData('', '', trafoNumber); // Tensão desconhecida
    }

    // NOVO CÁLCULO: IZ_X_145
    // Pega o valor de IZ do array correspondente e multiplica por 1.45
    const izValue = parseFloat(IZ_TO_CALCULATE_ARR[index]);
    let iz145Result = 'N/A';
    if (!isNaN(izValue)) {
        iz145Result = (izValue * 1.45).toFixed(2); // Duas casas decimais
    }


    // Retorna o objeto com os placeholders e seus valores
    return {
        [`IBXX${trafoNumber}`]: IB_ARR[index],
        [`INXX${trafoNumber}`]: IN_ARR[index],
        [`IZXX${trafoNumber}`]: IZ_ARR[index],
        [`CABX${trafoNumber}`]: CAB_ARR[index],
        [`QTDY${trafoNumber}`]: QTD_CAB_ARR[index],
        
        // Novos Placeholders da iteração anterior
        [`IZXY${trafoNumber}`]: I_CAB_ARR[index], 
        [`IAJU${trafoNumber}`]: I_AJUSTE_ARR[index],
        
        // NOVO PLACEHOLDER DE CÁLCULO
        [`IZ14${trafoNumber}`]: iz145Result,
        [`QTD1${trafoNumber}`]: QTD_ARR[index]
    };
}


function coletarDadosFormulario() {
    // Novos campos de Trafo 
    const potencia1 = document.getElementById('potencia_trafo_1')?.value || '';
    const tensao1 = document.getElementById('tensao_trafo_1')?.value || '';
    const tipoTrafo = document.getElementById('tipo_trafo')?.value || 'N/A';
    const cargaInstalada = document.getElementById('carga_instalada')?.value || 'N/A';

    const qtdTrafos = document.getElementById('quantidade_trafos')?.value || '1';

    let potencia2 = '';
    let tensao2 = '';

    if (qtdTrafos === '2') {
        potencia2 = document.getElementById('potencia_trafo_2')?.value || '';
        tensao2 = document.getElementById('tensao_trafo_2')?.value || '';
    }
    
    // **CALCULA DADOS DE PROTEÇÃO**
    const dadosTrafo1 = getTrafoData(potencia1, tensao1, 1);
    const dadosTrafo2 = getTrafoData(potencia2, tensao2, 2);


    const dados = {
        // PLACEHOLDERS ORIGINAIS (Dados do Projeto)
        'XXXX': document.getElementById('potencia').value, // POTÊNCIA DA SUBESTAÇÃO EM KVA
        'YYYY': document.getElementById('art').value,       // ART
        'DDDD': document.getElementById('tensao').value,    // TENSÃO GERAL
        'EEEE': document.getElementById('ramal_tamanho').value, // Tamanho do ramal
        'FFFF': document.getElementById('ramal_cabo').value,    // Cabo do ramal
        
        // PLACEHOLDERS DA SUBESTAÇÃO (Detalhes) 
        'PTF1': potencia1, // Potência do Trafo 1
        'TTF1': tensao1,   // Tensão do Trafo 1
        'PTF2': potencia2 || 'N/A', // Potência do Trafo 2 (ou N/A)
        'TTF2': tensao2 || 'N/A',   // Tensão do Trafo 2 (ou N/A)
        'TIPO_TRAFO': tipoTrafo, // Tipo do Trafo
        'ZXXZ': cargaInstalada, // Carga Instalada (Novo/Movido)
        
        // Dados de Proteção (Trafo 1)
        ...dadosTrafo1,
        
        // Dados de Proteção (Trafo 2)
        ...dadosTrafo2,
        
        // PLACEHOLDERS EXISTENTES (Outros)
        'GGGG': document.getElementById('nome_projeto').value,
        'LLLL': document.getElementById('concessionaria').value,
        'XXXY': document.getElementById('endereco_empreendimento').value,
        'HHHH': document.getElementById('localizacao_projeto').value,
        'VVVV': document.getElementById('numero_uc').value,
        'ZXZX': document.getElementById('demanda').value, // Demanda
        'DTIN': formatarData(document.getElementById('data_inicio').value),
        'DTFI': formatarData(document.getElementById('data_fim').value),
        'PJDP': document.getElementById('tipo_pessoa_juridica').value.toLowerCase()
    };
    
    // Dados do engenheiro
    const engenheiroNome = document.getElementById('engenheiro').value;
    const engData = ENGENHEIROS[engenheiroNome];
    dados['XXYY'] = engenheiroNome;
    dados['AAAA'] = engData.CREA;
    dados['BBBB'] = engData.EMAIL;
    dados['CCCC'] = engData.FONE;
    dados['IIII'] = engData.RG;
    dados['JJJJ'] = engData.CPF;
    dados['KKKK'] = engData.ENDERECO;
    
    // Dados do cliente
    const clienteNome = document.getElementById('cliente').value;
    const cliData = CLIENTES[clienteNome];
    dados['MMMM'] = clienteNome;
    dados['NNNN'] = cliData.CNPJ;
    dados['OOOO'] = cliData.END_SEDE;
    dados['PPPP'] = cliData.RESPONSAVEL;
    dados['QQQQ'] = cliData.NACIONALIDADE;
    dados['RRRR'] = cliData.ESTADO_CIVIL;
    dados['SSSS'] = cliData.IDENTIDADE;
    dados['TTTT'] = cliData.CPF;
    dados['UUUU'] = cliData.DOMICILIO;
    
    // Extrair município
    dados['ZZZZ'] = extrairMunicipio(dados['XXXY']);
    
    // Adicionar datas formatadas
    const hoje = new Date();
    
    // 1. Obter e formatar o dia (com zero à esquerda)
    const diaFormatado = hoje.getDate().toString().padStart(2, '0');
    
    // 2. Obter e formatar o mês (com zero à esquerda)
    const mesFormatado = (hoje.getMonth() + 1).toString().padStart(2, '0');
    
    // 3. Obter o nome do mês em português
    const mesIngles = hoje.toLocaleString('en-US', { month: 'long' });
    const mesPortugues = MESES_PT_BR[mesIngles] || mesIngles;
    
    // 4. Aplicar nos dados
    dados['14 / 07 / 2026'] = `${diaFormatado} / ${mesFormatado} / ${hoje.getFullYear() + 1}`;
    dados['14 de julho de 2025'] = `${diaFormatado} de ${mesPortugues} de ${hoje.getFullYear()}`;

    // NOVO: Adicionar o placeholder [MES_ATUAL] (Solicitação do usuário)
    dados['MES_ATUAL'] = mesPortugues.toUpperCase();
    
    // Salvar dados para uso posterior
    dadosProcessados = { ...dados };
    
    return dados;
}

function formatarData(dataString) {
    // dataString é "YYYY-MM-DD" do input. Ao usar new Date(dataString) ele assume UTC,
    // o que pode resultar no dia anterior no fuso horário local.
    
    // Solução: Analisar os componentes e criar a data no fuso local.
    const partes = dataString.split('-');
    const ano = parseInt(partes[0]);
    // Mês em JavaScript é 0-indexado (Janeiro = 0, Dezembro = 11), por isso subtraímos 1.
    const mes = parseInt(partes[1]) - 1; 
    const dia = parseInt(partes[2]);
    
    // Cria a data no fuso horário local (00:00:00 do dia escolhido)
    const data = new Date(ano, mes, dia);
    
    return data.toLocaleDateString('pt-BR');
}

function getDocumentosSelecionados() {
    const documentos = [];
    
    if (document.getElementById('gerar_memorial').checked) {
        documentos.push({ 
            tipo: 'memorial', 
            nome: 'Memorial Descritivo',
            nomeArquivo: 'Memorial Descritivo' 
        });
    }
    
    if (document.getElementById('gerar_procuracao').checked) {
        documentos.push({ 
            tipo: 'procuração', 
            nome: 'Procuração',
            nomeArquivo: 'Procuração' 
        });
    }
    
    if (document.getElementById('gerar_termo').checked) {
        documentos.push({ 
            tipo: 'termo_responsabilidade', 
            nome: 'Termo de Responsabilidade',
            nomeArquivo: 'Termo de Responsabilidade' 
        });
    }
    
    if (document.getElementById('gerar_carta').checked) {
        documentos.push({ 
            tipo: 'carta_viabilidade', 
            nome: 'Carta de Viabilidade',
            nomeArquivo: 'Carta de Viabilidade' 
        });
    }
    
    if (document.getElementById('gerar_termo_nao_geracao').checked) {
        documentos.push({ 
            tipo: 'termo_nao_geração', 
            nome: 'Termo de Não Geração',
            nomeArquivo: 'Termo de Não Geração' 
        });
    }
    
    return documentos;
}

async function gerarDocumentosWord(dados, documentosParaGerar) {
    documentosGerados = [];
    
    for (const docInfo of documentosParaGerar) {
        try {
            const templateUrl = TEMPLATES[docInfo.tipo];
            const response = await fetch(templateUrl);
            
            if (!response.ok) {
                throw new Error(`Template não encontrado: ${templateUrl}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // Criar documento com dados substituídos
            const docxContent = await processarTemplateWord(arrayBuffer, dados);
            
            // Nome do arquivo final
            const nomeProjeto = dados['GGGG'].replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const nomeArquivo = `${docInfo.nomeArquivo} - ${nomeProjeto}.docx`;
            
            documentosGerados.push({
                nome: docInfo.nome,
                nomeArquivo: nomeArquivo,
                conteudo: docxContent,
                tipo: docInfo.tipo
            });
            
        } catch (error) {
            console.error(`Erro ao processar ${docInfo.nome}:`, error);
            throw error;
        }
    }
}

async function processarTemplateWord(arrayBuffer, dados) {
    try {
        // 1. Carregar o ArrayBuffer com Pizzip
        const zip = new PizZip(arrayBuffer);

        const doc = new docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
                start: '[',
                end: ']'
            }
        });

        // 3. Definir os dados para substituição
        doc.setData(dados);

        // 4. Executar a substituição
        doc.render();

        // 5. Gerar o novo arquivo binário (.docx)
        const content = doc.getZip().generate({
            type: "arraybuffer",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            compression: "DEFLATE",
        });

        return content;
    } catch (error) {
        console.error('Erro ao processar template Word:', error);
        // Exibir detalhes de erro do Docxtemplater, se possível
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
    
    // Limpar conteúdo anterior
    documentsContainer.innerHTML = '';
    dataSummaryContent.innerHTML = '';
    
    // Exibir documentos gerados
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
    
    // Configurar botão para baixar todos
    const downloadAllBtn = document.getElementById('download-all-btn');
    downloadAllBtn.onclick = baixarTodosDocumentos;
    
    // Exibir resumo dos dados
    const dadosFormatados = {};
    Object.keys(dadosProcessados).forEach(key => {
        if (!key.startsWith('14') && !key.includes('de ') && !key.includes('/202')) {
            dadosFormatados[key] = dadosProcessados[key];
        }
    });
    
    dataSummaryContent.innerHTML = JSON.stringify(dadosFormatados, null, 2);
    
    // Mostrar seção de resultados
    resultsSection.classList.remove('hidden');
    
    // Rolagem suave para resultados
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function baixarDocumentoWord(index) {
    const doc = documentosGerados[index];
    
    // Criar blob do documento Word
    const blob = new Blob([doc.conteudo], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    // Criar link para download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Liberar URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    // Feedback visual
    showDownloadFeedback(doc.nome);
}

function baixarTodosDocumentos() {
    if (documentosGerados.length === 0) {
        alert('Nenhum documento para baixar.');
        return;
    }
    
    // Criar um arquivo ZIP com todos os documentos
    const zip = new JSZip();
    
    documentosGerados.forEach(doc => {
        zip.file(doc.nomeArquivo, doc.conteudo);
    });
    
    // Gerar o ZIP
    zip.generateAsync({ type: 'blob' })
        .then(function(content) {
            // Criar link para download do ZIP
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Documentos_${dadosProcessados['GGGG'].replace(/[^a-z0-9]/gi, '_')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Liberar URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            // Feedback
            showDownloadFeedback('todos os documentos');
        })
        .catch(function(error) {
            console.error('Erro ao criar ZIP:', error);
            alert('Erro ao criar arquivo ZIP.');
        });
}

function visualizarDocumento(index) {
    const doc = documentosGerados[index];
    
    // Em um ambiente real, você poderia abrir em uma nova janela
    // ou usar um visualizador de documentos
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
        generateBtn.innerHTML = '<i class="fas fa-file-word"></i> Gerar Documentos Word';
    }
}

function showDownloadFeedback(nomeDocumento) {
    // Feedback visual simples
    const originalTitle = document.title;
    document.title = `✓ ${nomeDocumento} baixado! - Gerador de Documentos`;
    
    setTimeout(() => {
        document.title = originalTitle;
    }, 1500);
}

// Funções auxiliares para o navegador
function formatDateToDMY(date) {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
