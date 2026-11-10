// =====================================================================
// PREENCHIMENTO POR EXCEL
// Uma única especificação (PLANILHA_ABAS) gera o modelo .xlsx e lê a
// planilha preenchida. Para incluir um campo novo no Excel, basta
// acrescentar uma linha aqui.
// =====================================================================

const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

// tipo: texto | numero | data | lista (lista = opções do <select> do formulário)
const PLANILHA_ABAS = [
    {
        aba: 'Dados',
        linhas: [
            { rotulo: 'ART', id: 'art', exemplo: 'RR20240488640' },
            { rotulo: 'POTÊNCIA DA SUBESTAÇÃO EM KVA', id: 'potencia', tipo: 'numero', exemplo: 225 },
            { rotulo: 'TENSÃO GERAL', id: 'tensao', tipo: 'lista', exemplo: '380/220V' },
            { rotulo: 'Tamanho do ramal de entrada (m)', id: 'ramal_tamanho', tipo: 'numero', exemplo: 35 },
            { rotulo: 'Cabo do ramal de entrada MT (mm²)', id: 'ramal_cabo', exemplo: '35 mm²' },
            { rotulo: 'Tipo de subestação', id: 'tipo_subestacao', tipo: 'lista', exemplo: 'Abrigada' },
            { rotulo: 'Nome do projeto', id: 'nome_projeto', exemplo: 'Construção da Escola Nova Canaã' },
            { rotulo: 'Concessionária de Energia', id: 'concessionaria', exemplo: 'RORAIMA ENERGIA' },
            { rotulo: 'Número da UC', id: 'numero_uc', exemplo: 'UC 1234567 ou S/N' },
            { rotulo: 'Demanda do Projeto (kVA)', id: 'demanda', tipo: 'numero', exemplo: 200 },
            { rotulo: 'Carga Instalada (kW)', id: 'carga_instalada', tipo: 'numero', exemplo: 300 },
            { rotulo: 'Revisão do documento', id: 'revisao', exemplo: 'REV00' },
            { rotulo: 'Tipo de Pessoa Jurídica', id: 'tipo_pessoa_juridica', tipo: 'lista', exemplo: 'Pessoa jurídica de direito público' },
            { rotulo: 'ENDEREÇO DO EMPREENDIMENTO', id: 'endereco_empreendimento', exemplo: 'R. Cel. Pinto, 664 - Centro, Boa Vista - RR, 69306-690' },
            { rotulo: 'Coordenadas Geográficas', id: 'localizacao_projeto', exemplo: '2°49\'26.8"N 60°40\'18.8"W' },
            { rotulo: 'Início da Obra', id: 'data_inicio', tipo: 'data', exemplo: '10/11/2026' },
            { rotulo: 'Fim da Obra', id: 'data_fim', tipo: 'data', exemplo: '10/11/2027' },
            { rotulo: 'Engenheiro Responsável', id: 'engenheiro', tipo: 'lista', exemplo: 'RODRIGO DAMASCENO NASCIMENTO' },
            { rotulo: 'Cliente', id: 'cliente', tipo: 'lista', exemplo: 'Inserir cliente manualmente' }
        ]
    },
    {
        aba: 'Dados do cliente',
        nota: 'Só é usada quando "Cliente" = Inserir cliente manualmente',
        linhas: [
            { rotulo: 'Nome / Razão Social', id: 'cliente_manual_nome', exemplo: 'MUNICÍPIO DE CAROEBE' },
            { rotulo: 'CNPJ', id: 'cliente_manual_cnpj', exemplo: '01.614.606/0001-80' },
            { rotulo: 'Endereço da sede', id: 'cliente_manual_endereco', exemplo: 'Avenida Perimetral Norte, S/N, Centro, Caroebe-RR, CEP 69.378-000' },
            { rotulo: 'Responsável legal', id: 'cliente_manual_responsavel', exemplo: 'Osmar Serra Bonfim Filho' },
            { rotulo: 'Nacionalidade', id: 'cliente_manual_nacionalidade', exemplo: 'brasileiro' },
            { rotulo: 'Estado civil', id: 'cliente_manual_estado_civil', exemplo: 'casado' },
            { rotulo: 'Identidade / RG', id: 'cliente_manual_identidade', exemplo: '12433063 SSP AM' },
            { rotulo: 'CPF', id: 'cliente_manual_cpf', exemplo: '618.303.302-25' },
            { rotulo: 'Domicílio do responsável', id: 'cliente_manual_domicilio', exemplo: 'Rua João XXIII, S/N, Centro, Caroebe-RR, CEP 69.378-000' }
        ]
    },
    {
        aba: 'Inf Sub',
        linhas: [
            { rotulo: 'Quantidade de Transformadores', id: 'quantidade_trafos', tipo: 'lista', exemplo: '1 Transformador' },
            { rotulo: 'Tipo de ligação', id: 'fases_sub', tipo: 'lista', alias: ['Fases', 'Tipo de ligação do transformador'], exemplo: 'Trifásica' },
            { rotulo: 'Tipo de Transformador', id: 'tipo_trafo', tipo: 'lista', exemplo: 'ÓLEO' },
            { rotulo: 'Potência do Trafo 1 (kVA)', id: 'potencia_trafo_1', tipo: 'lista', exemplo: '225 kVA' },
            { rotulo: 'Tensão do Trafo 1', id: 'tensao_trafo_1', tipo: 'lista', exemplo: '380V/220V' },
            { rotulo: 'Potência do Trafo 2 (kVA)', id: 'potencia_trafo_2', tipo: 'lista', exemplo: '(só com 2 transformadores)' },
            { rotulo: 'Tensão do Trafo 2', id: 'tensao_trafo_2', tipo: 'lista', exemplo: '(só com 2 transformadores)' }
        ]
    },
    {
        aba: 'Módulo fotovoltaico',
        linhas: [
            { rotulo: 'Marca do módulo', id: 'fv_mod_marca', exemplo: 'OSDA' },
            { rotulo: 'Modelo do módulo', id: 'fv_mod_modelo', exemplo: 'ODA570M-36V-MH' },
            { rotulo: 'Tecnologia do módulo', id: 'fv_mod_tec', exemplo: 'Monocristalino tipo P' },
            { rotulo: 'Potência (Wp)', id: 'fv_mod_pot', tipo: 'numero', exemplo: 570 },
            { rotulo: 'Voc (V)', id: 'fv_mod_voc', tipo: 'numero', exemplo: 50.74 },
            { rotulo: 'Vmp (V)', id: 'fv_mod_vmp', tipo: 'numero', exemplo: 42.07 },
            { rotulo: 'Isc (A)', id: 'fv_mod_isc', tipo: 'numero', exemplo: 14.31 },
            { rotulo: 'Imp (A)', id: 'fv_mod_imp', tipo: 'numero', exemplo: 13.55 },
            { rotulo: 'Eficiência do módulo (%)', id: 'fv_mod_efic', tipo: 'numero', exemplo: 22.07 },
            { rotulo: 'Coef. temp. Pmáx (%/°C)', id: 'fv_mod_coef_p', tipo: 'numero', exemplo: -0.3 },
            { rotulo: 'Coef. temp. Voc (%/°C)', id: 'fv_mod_coef_voc', tipo: 'numero', exemplo: -0.25 },
            { rotulo: 'Coef. temp. Isc (%/°C)', id: 'fv_mod_coef_isc', tipo: 'numero', exemplo: 0.046 },
            { rotulo: 'NOCT (°C)', id: 'fv_mod_noct', tipo: 'numero', exemplo: 45 },
            { rotulo: 'Comprimento (mm)', id: 'fv_mod_comp', tipo: 'numero', exemplo: 2278 },
            { rotulo: 'Largura (mm)', id: 'fv_mod_larg', tipo: 'numero', exemplo: 1134 },
            { rotulo: 'Espessura (mm)', id: 'fv_mod_alt', tipo: 'numero', exemplo: 35 },
            { rotulo: 'Peso (kg)', id: 'fv_mod_peso', tipo: 'numero', exemplo: 28 }
        ]
    },
    {
        aba: 'Inversor',
        linhas: [
            { rotulo: 'Marca do inversor', id: 'fv_inv_marca', exemplo: 'GROWATT' },
            { rotulo: 'Modelo do inversor', id: 'fv_inv_modelo', exemplo: 'MAC 60KTL3-X LV' },
            { rotulo: 'Quantidade', id: 'fv_inv_qtd', tipo: 'numero', exemplo: 2 },
            { rotulo: 'Potência nominal CA (kW)', id: 'fv_inv_pot', tipo: 'numero', exemplo: 60 },
            { rotulo: 'Potência máxima CA (kW)', id: 'fv_inv_pot_max', tipo: 'numero', exemplo: 66.6 },
            { rotulo: 'Tensão máx. CC (V)', id: 'fv_inv_vmax', tipo: 'numero', exemplo: 1100 },
            { rotulo: 'MPPT mín. (V)', id: 'fv_inv_vmppt_min', tipo: 'numero', exemplo: 250 },
            { rotulo: 'MPPT máx. (V)', id: 'fv_inv_vmppt_max', tipo: 'numero', exemplo: 1000 },
            { rotulo: 'Nº de MPPTs', id: 'fv_inv_nmppt', tipo: 'numero', exemplo: 4 },
            { rotulo: 'Corrente máx. por MPPT (A)', id: 'fv_inv_imppt', tipo: 'numero', exemplo: 50 },
            { rotulo: 'Isc máx. por MPPT (A)', id: 'fv_inv_isc_mppt', tipo: 'numero', exemplo: 50 },
            { rotulo: 'Corrente máx. CA (A)', id: 'fv_inv_iac', tipo: 'numero', exemplo: 96.6 },
            { rotulo: 'Eficiência do inversor (%)', id: 'fv_inv_efic', tipo: 'numero', exemplo: 98.8 },
            { rotulo: 'Grau de proteção', id: 'fv_inv_ip', exemplo: 'IP66' }
        ]
    },
    { aba: 'Arranjo', arranjo: true },
    {
        aba: 'Premissas',
        linhas: [
            { rotulo: 'Inclinação (°)', id: 'fv_inclinacao', tipo: 'numero', exemplo: 10 },
            { rotulo: 'Azimute (°)', id: 'fv_azimute', tipo: 'numero', exemplo: 8 },
            { rotulo: 'Performance Ratio (%)', id: 'fv_pr', tipo: 'numero', exemplo: 75 },
            { rotulo: 'Temp. mínima da célula (°C)', id: 'fv_tmin', tipo: 'numero', exemplo: 10 },
            { rotulo: 'Temp. máxima da célula (°C)', id: 'fv_tmax', tipo: 'numero', exemplo: 70 },
            { rotulo: 'Fator de potência', id: 'fv_cosphi', tipo: 'numero', exemplo: 1 },
            { rotulo: 'Consumo de referência (kWh/mês)', id: 'fv_consumo', tipo: 'numero', exemplo: 100 }
        ]
    },
    {
        aba: 'Irradiação',
        linhas: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
            .map((mes, i) => ({ rotulo: mes, id: `fv_irr_${i + 1}`, tipo: 'numero', alias: [mes.slice(0, 3)],
                exemplo: [4.6, 4.73, 5.02, 4.84, 4.45, 4.59, 4.71, 5.15, 5.53, 5.44, 5.15, 4.68][i] }))
    },
    {
        aba: 'Conexão e circuitos',
        linhas: [
            { rotulo: 'Tensão de conexão', id: 'fv_tensao', tipo: 'lista', exemplo: '220/127V' },
            { rotulo: 'Ligação da UC', id: 'fv_ligacao', tipo: 'lista', exemplo: 'Média tensão (subestação própria)' },
            { rotulo: 'Seção do cabo CC (mm²)', id: 'fv_cabo_cc', tipo: 'numero', exemplo: 6 },
            { rotulo: 'Seção do cabo CA (mm²)', id: 'fv_cabo_ca', tipo: 'numero', exemplo: 'vazio = automático' },
            { rotulo: 'Comprimento do circuito CA (m)', id: 'fv_comp_ca', tipo: 'numero', exemplo: 12 }
        ]
    }
];

const ARRANJO_COLUNAS = [
    { chave: 'serie', rotulo: 'Série', largura: 10 },
    { chave: 'inv', rotulo: 'Inversor', largura: 12 },
    { chave: 'mppt', rotulo: 'MPPT', largura: 10 },
    { chave: 'n', rotulo: 'Módulos em série', largura: 18 },
    { chave: 'comp', rotulo: 'Cabo CC (m)', largura: 14 }
];
const ARRANJO_LINHAS_MODELO = 30;

const XL_COR_CABECALHO = 'FF2E7D8C';   // azul-petróleo da capa Ribeiro Lopes
const XL_COR_ENTRADA = 'FFFFF8D6';     // células a preencher
const XL_BORDA = { style: 'thin', color: { argb: 'FFBFBFBF' } };

// ---------------------------------------------------------------- utilitários
function xlNormalizar(texto) {
    return String(texto ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function xlCarregarBiblioteca() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (xlCarregarBiblioteca._promessa) return xlCarregarBiblioteca._promessa;
    xlCarregarBiblioteca._promessa = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = EXCELJS_URL;
        s.onload = () => (window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('Biblioteca de Excel não inicializou.')));
        s.onerror = () => {
            xlCarregarBiblioteca._promessa = null;
            reject(new Error('Não foi possível carregar a biblioteca de Excel. Verifique a conexão com a internet.'));
        };
        document.head.appendChild(s);
    });
    return xlCarregarBiblioteca._promessa;
}

function xlOpcoes(id) {
    const sel = document.getElementById(id);
    if (!sel || sel.tagName !== 'SELECT') return [];
    const vistos = new Set();
    return [...sel.options]
        .filter(o => o.value !== '' && !vistos.has(o.value) && vistos.add(o.value))
        .map(o => ({ valor: o.value, texto: o.textContent.trim() }));
}

// Documentos que usam o campo (calculado a partir dos templates carregados)
function xlOndeVaiPrecisar(id) {
    const base = id.startsWith('cliente_manual_') ? 'cliente' : id;
    if (typeof CAMPOS === 'undefined' || !CAMPOS[base]) return '';
    return DOCUMENTOS.filter(d => documentoUsaCampo(d.tipo, base)).map(d => d.curto).join(', ');
}

// Valor primitivo de uma célula ExcelJS (texto rico, fórmula, hyperlink…)
function xlValorCelula(cell) {
    let v = cell?.value;
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'object') {
        if (Array.isArray(v.richText)) v = v.richText.map(r => r.text).join('');
        else if ('result' in v) v = v.result;
        else if ('text' in v) v = v.text;
        else if ('error' in v) return null;
    }
    if (typeof v === 'string') {
        v = v.replace(/\u00a0/g, ' ').trim();
        return v === '' ? null : v;
    }
    return v;
}

function xlDataISO(v) {
    if (v instanceof Date && !isNaN(v)) {
        // ExcelJS devolve datas em UTC (meia-noite)
        return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
    }
    if (typeof v === 'number' && v > 20000 && v < 80000) {   // número de série do Excel
        return xlDataISO(new Date(Date.UTC(1899, 11, 30) + v * 86400000));
    }
    const m = String(v).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const iso = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

function xlNumeroParaFormulario(v) {
    if (typeof v === 'number') {
        const arred = Math.round(v * 1e6) / 1e6;    // limpa ruído de ponto flutuante do Excel
        return String(arred).replace('.', ',');
    }
    return String(v).trim();
}

// Casa um valor da planilha com uma opção do <select> (tolerante a acentos, espaços e variações)
function xlResolverOpcao(id, bruto) {
    const opcoes = xlOpcoes(id);
    if (id === 'cliente' && /inserir|manual/i.test(String(bruto))) return CLIENTE_MANUAL_VALUE;
    const alvo = xlNormalizar(bruto);
    let achou = opcoes.find(o => xlNormalizar(o.valor) === alvo || xlNormalizar(o.texto) === alvo);
    if (achou) return achou.valor;
    // tensões: compara só os dígitos ("380/220V" = "380V/220V")
    const digitos = String(bruto).replace(/\D/g, '');
    if (digitos.length >= 5) {
        achou = opcoes.find(o => o.valor.replace(/\D/g, '') === digitos);
        if (achou) return achou.valor;
    }
    // números: "112.5 kVA", 112,5, 2 (transformadores)
    const num = typeof bruto === 'number' ? bruto : parseFloat(String(bruto).replace(',', '.'));
    if (isFinite(num)) {
        achou = opcoes.find(o => parseFloat(o.valor.replace(',', '.')) === num || parseFloat(o.texto.replace(',', '.')) === num);
        if (achou) return achou.valor;
    }
    // gênero/plural ("Monofásico" = "Monofásica", "Transformadores" = "Transformador")
    const semFlexao = t => xlNormalizar(t).replace(/(es|as|os|a|o|s)$/, '');
    achou = opcoes.find(o => semFlexao(o.texto) === semFlexao(bruto) || semFlexao(o.valor) === semFlexao(bruto));
    if (achou) return achou.valor;
    // início do texto ("Média tensão" → "Média tensão (subestação própria)")
    if (alvo.length >= 4) {
        achou = opcoes.find(o => xlNormalizar(o.texto).startsWith(alvo) || alvo.startsWith(xlNormalizar(o.texto)));
        if (achou) return achou.valor;
    }
    return null;
}

// ---------------------------------------------------------------- gerar modelo
function xlEstiloCabecalho(row) {
    row.eachCell(c => {
        c.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COR_CABECALHO } };
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        c.border = { top: XL_BORDA, left: XL_BORDA, bottom: XL_BORDA, right: XL_BORDA };
    });
    row.height = 22;
}

function xlValorAtual(linha) {
    const el = document.getElementById(linha.id);
    if (!el) return null;
    const v = String(el.value ?? '').trim();
    if (!v) return null;
    if (linha.tipo === 'lista') {
        if (linha.id === 'cliente' && v === CLIENTE_MANUAL_VALUE) return 'Inserir cliente manualmente';
        return xlOpcoes(linha.id).find(o => o.valor === v)?.texto ?? v;
    }
    if (linha.tipo === 'numero') {
        const n = typeof fvNum === 'function' ? fvNum(v) : Number(v.replace(',', '.'));
        return isFinite(n) ? n : v;
    }
    if (linha.tipo === 'data') {
        const [a, m, d] = v.split('-').map(Number);
        return a ? new Date(Date.UTC(a, m - 1, d)) : null;
    }
    return v;
}

async function xlGerarPlanilha({ comDados = false } = {}) {
    const ExcelJS = await xlCarregarBiblioteca();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Ribeiro Lopes – Gerador de Viabilidade';
    wb.created = new Date();

    // Listas das validações ficam numa aba oculta no fim do arquivo (sem limite de 255 caracteres).
    // Os valores são guardados aqui e a aba é criada depois, para "Dados" ser a primeira aba.
    const colunasListas = [];
    const letraColuna = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    const refLista = id => {
        const ops = xlOpcoes(id).map(o => (id === 'cliente' && o.valor === CLIENTE_MANUAL_VALUE ? 'Inserir cliente manualmente' : o.texto));
        if (!ops.length) return null;
        colunasListas.push(ops);
        const letra = letraColuna(colunasListas.length);
        return `Listas!$${letra}$1:$${letra}$${ops.length}`;
    };

    PLANILHA_ABAS.forEach(def => {
        const ws = wb.addWorksheet(def.aba, { views: [{ state: 'frozen', ySplit: 1 }] });

        if (def.arranjo) {
            ws.columns = [...ARRANJO_COLUNAS.map(c => ({ header: c.rotulo, key: c.chave, width: c.largura })),
                { header: 'Onde vai precisar', key: 'onde', width: 22 }];
            xlEstiloCabecalho(ws.getRow(1));
            const atuais = comDados && typeof fvLerStrings === 'function' ? fvLerStrings() : [];
            const total = Math.max(ARRANJO_LINHAS_MODELO, atuais.length + 5);
            for (let i = 0; i < total; i++) {
                const s = atuais[i] || {};
                const row = ws.addRow({ serie: `STR${i + 1}`, inv: s.inv ?? null, mppt: s.mppt ?? null, n: s.n ?? null,
                    comp: s.comp === '' ? null : (s.comp ?? null), onde: 'Memorial Solar' });
                row.eachCell({ includeEmpty: true }, (c, col) => {
                    c.font = { name: 'Arial', size: 10, color: { argb: col === 6 ? 'FF808080' : 'FF000000' }, italic: col === 6 };
                    c.border = { top: XL_BORDA, left: XL_BORDA, bottom: XL_BORDA, right: XL_BORDA };
                    c.alignment = { horizontal: 'center' };
                    if (col >= 2 && col <= 5) {
                        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COR_ENTRADA } };
                        c.dataValidation = { type: 'decimal', operator: 'greaterThan', formulae: [0], allowBlank: true,
                            showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Digite apenas números.' };
                    }
                });
            }
            return;
        }

        ws.columns = [
            { header: 'Descrição', key: 'desc', width: 36 },
            { header: 'Valor', key: 'valor', width: 46 },
            { header: 'Onde vai precisar', key: 'onde', width: 52 },
            { header: 'Exemplo', key: 'exemplo', width: 42 }
        ];
        xlEstiloCabecalho(ws.getRow(1));

        def.linhas.forEach(linha => {
            const valor = comDados ? xlValorAtual(linha) : null;
            const row = ws.addRow({ desc: linha.rotulo, valor, onde: xlOndeVaiPrecisar(linha.id), exemplo: linha.exemplo ?? '' });
            const [cDesc, cValor, cOnde, cEx] = [1, 2, 3, 4].map(i => row.getCell(i));
            [cDesc, cValor, cOnde, cEx].forEach(c => {
                c.border = { top: XL_BORDA, left: XL_BORDA, bottom: XL_BORDA, right: XL_BORDA };
                c.alignment = { vertical: 'middle', wrapText: true };
            });
            cDesc.font = { name: 'Arial', size: 10, bold: true };
            cValor.font = { name: 'Arial', size: 10, color: { argb: 'FF0000FF' } };
            cValor.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COR_ENTRADA } };
            cOnde.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF808080' } };
            cEx.font = { name: 'Arial', size: 9, color: { argb: 'FF808080' } };

            if (linha.tipo === 'lista') {
                const ref = refLista(linha.id);
                if (ref) cValor.dataValidation = { type: 'list', allowBlank: true, formulae: [ref],
                    showErrorMessage: true, errorStyle: 'warning', errorTitle: 'Valor fora da lista', error: 'Escolha um item da lista.' };
            } else if (linha.tipo === 'numero') {
                cValor.dataValidation = { type: 'decimal', operator: 'between', formulae: [-1e9, 1e9], allowBlank: true,
                    showErrorMessage: true, errorTitle: 'Valor inválido', error: 'Digite apenas números (use vírgula ou ponto para decimais).' };
            } else if (linha.tipo === 'data') {
                cValor.numFmt = 'dd/mm/yyyy';
                cValor.dataValidation = { type: 'date', operator: 'greaterThan', formulae: [new Date(Date.UTC(2000, 0, 1))], allowBlank: true,
                    showErrorMessage: true, errorTitle: 'Data inválida', error: 'Digite uma data no formato dd/mm/aaaa.' };
            }
        });

        if (def.nota) {
            const r = ws.addRow([]);
            const nota = ws.addRow([`Obs.: ${def.nota}.`]);
            nota.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF2E7D8C' } };
            ws.mergeCells(nota.number, 1, nota.number, 3);
            void r;
        }
    });

    // Instruções (última aba)
    const ins = wb.addWorksheet('Instruções');
    ins.getColumn(1).width = 110;
    [
        ['Como usar este modelo', true],
        ['1. Preencha a coluna "Valor" (células amarelas) de cada aba. A coluna "Exemplo" mostra o formato esperado.', false],
        ['2. Campos com seta usam lista suspensa: escolha um item da lista.', false],
        ['3. Preencha só o que for usar. Células vazias não apagam o que já estiver digitado no site.', false],
        ['4. "Dados do cliente" só é usada quando "Cliente" = Inserir cliente manualmente.', false],
        ['5. Aba "Arranjo": uma linha por série (string). Linhas sem "Módulos em série" são ignoradas.', false],
        ['6. "Seção do cabo CA" vazia = dimensionamento automático pelo site.', false],
        ['7. No site, use "Importar planilha preenchida" e confira os campos antes de gerar.', false],
        ['', false],
        ['Não renomeie as abas nem a coluna "Descrição": é por elas que o site encontra cada campo.', true]
    ].forEach(([t, b]) => {
        const c = ins.addRow([t]).getCell(1);
        c.font = { name: 'Arial', size: b ? 11 : 10, bold: b, color: { argb: b ? 'FF2E7D8C' : 'FF000000' } };
        c.alignment = { wrapText: true };
    });

    const listas = wb.addWorksheet('Listas', { state: 'veryHidden' });
    colunasListas.forEach((ops, c) => ops.forEach((t, r) => { listas.getCell(r + 1, c + 1).value = t; }));
    wb.views = [{ activeTab: 0, firstSheet: 0, visibility: 'visible' }];

    return wb.xlsx.writeBuffer();
}

async function xlBaixar({ comDados }) {
    const btn = document.getElementById(comDados ? 'btn-excel-exportar' : 'btn-excel-modelo');
    const original = btn?.innerHTML;
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...'; }
        const buffer = await xlGerarPlanilha({ comDados });
        const nome = comDados
            ? `Dados_${nomeSeguroArquivo(valor('nome_projeto') || 'projeto')}.xlsx`
            : 'Modelo_Preenchimento_Viabilidade.xlsx';
        baixarBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nome);
    } catch (e) {
        console.error(e);
        mostrarFeedback(`<i class="fas fa-times-circle"></i> ${escapeHtml(e.message)}`, 'erro');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

// ---------------------------------------------------------------- importar
function xlAcharAba(wb, nome) {
    const alvo = xlNormalizar(nome);
    return wb.worksheets.find(ws => xlNormalizar(ws.name) === alvo)
        || wb.worksheets.find(ws => xlNormalizar(ws.name).startsWith(alvo.slice(0, 6)) && alvo.startsWith(xlNormalizar(ws.name).slice(0, 6)));
}

function xlAcharCabecalho(ws, nomes) {
    for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const mapa = {};
        row.eachCell((c, col) => { mapa[xlNormalizar(xlValorCelula(c))] = col; });
        if (nomes.some(n => mapa[xlNormalizar(n)])) return { linha: r, mapa };
    }
    return { linha: 1, mapa: {} };
}

async function xlLerPlanilha(arrayBuffer) {
    const ExcelJS = await xlCarregarBiblioteca();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    const estado = {};
    const avisos = [];
    const abasLidas = [];
    let preenchidos = 0;

    PLANILHA_ABAS.forEach(def => {
        const ws = xlAcharAba(wb, def.aba);
        if (!ws) return;
        abasLidas.push(def.aba);

        if (def.arranjo) {
            const { linha, mapa } = xlAcharCabecalho(ws, ['Inversor', 'MPPT']);
            const col = chave => mapa[xlNormalizar(ARRANJO_COLUNAS.find(c => c.chave === chave).rotulo)];
            const cInv = col('inv') || 2, cMppt = col('mppt') || 3, cN = col('n') || 4, cComp = col('comp') || 5;
            const series = [];
            for (let r = linha + 1; r <= ws.rowCount; r++) {
                const row = ws.getRow(r);
                const n = xlValorCelula(row.getCell(cN));
                if (n === null) continue;
                const num = v => (v === null ? '' : (typeof v === 'number' ? v : (typeof fvNum === 'function' ? fvNum(v) : Number(v))));
                const s = { inv: num(xlValorCelula(row.getCell(cInv))), mppt: num(xlValorCelula(row.getCell(cMppt))),
                    n: num(n), comp: num(xlValorCelula(row.getCell(cComp))) };
                ['inv', 'mppt', 'n'].forEach(k => { if (s[k] !== '' && isFinite(s[k])) s[k] = Math.round(s[k]); });
                if (!isFinite(s.n) || s.n <= 0) { avisos.push(`Arranjo, linha ${r}: "Módulos em série" inválido.`); continue; }
                series.push(s);
            }
            if (series.length) {
                estado.fv_strings_json = JSON.stringify(series);
                preenchidos++;
            }
            return;
        }

        const { linha, mapa } = xlAcharCabecalho(ws, ['Descrição', 'Valor']);
        const cDesc = mapa[xlNormalizar('Descrição')] || 1;
        const cValor = mapa[xlNormalizar('Valor')] || 2;
        const porRotulo = new Map();
        def.linhas.forEach(l => {
            porRotulo.set(xlNormalizar(l.rotulo), l);
            (l.alias || []).forEach(a => porRotulo.set(xlNormalizar(a), l));
        });

        for (let r = linha + 1; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const rotulo = xlValorCelula(row.getCell(cDesc));
            if (rotulo === null) continue;
            const spec = porRotulo.get(xlNormalizar(rotulo));
            const bruto = xlValorCelula(row.getCell(cValor));
            if (!spec) {
                if (bruto !== null && !/^obs/i.test(String(rotulo))) avisos.push(`${def.aba}: linha "${rotulo}" não reconhecida (ignorada).`);
                continue;
            }
            if (bruto === null) continue;

            let v = null;
            if (spec.tipo === 'lista') {
                v = xlResolverOpcao(spec.id, bruto);
                if (v === null) { avisos.push(`${def.aba} › ${spec.rotulo}: "${bruto}" não está entre as opções do site.`); continue; }
            } else if (spec.tipo === 'data') {
                v = xlDataISO(bruto);
                if (!v) { avisos.push(`${def.aba} › ${spec.rotulo}: data "${bruto}" não reconhecida.`); continue; }
            } else if (spec.tipo === 'numero') {
                v = xlNumeroParaFormulario(bruto);
                if (typeof bruto !== 'number' && !isFinite(typeof fvNum === 'function' ? fvNum(v) : Number(v))) {
                    avisos.push(`${def.aba} › ${spec.rotulo}: "${bruto}" não é um número.`);
                }
            } else {
                v = bruto instanceof Date ? xlDataISO(bruto).split('-').reverse().join('/') : String(bruto).trim();
            }
            estado[spec.id] = v;
            preenchidos++;
        }
    });

    // Dados de cliente preenchidos sem escolher o cliente → cliente manual
    if (!estado.cliente && estado.cliente_manual_nome && !valor('cliente')) estado.cliente = CLIENTE_MANUAL_VALUE;

    return { estado, avisos, abasLidas, preenchidos };
}

async function xlImportar(arquivo) {
    if (!arquivo) return;
    if (!/\.xlsx$/i.test(arquivo.name)) {
        mostrarFeedback('<i class="fas fa-exclamation-triangle"></i> Envie um arquivo <strong>.xlsx</strong> (Excel). Arquivos .xls antigos precisam ser salvos como .xlsx.', 'erro');
        return;
    }
    const zona = document.getElementById('excel-zona');
    zona?.classList.add('carregando');
    try {
        const { estado, avisos, abasLidas, preenchidos } = await xlLerPlanilha(await arquivo.arrayBuffer());
        if (!abasLidas.length) {
            mostrarFeedback('<i class="fas fa-exclamation-triangle"></i> Nenhuma aba do modelo foi encontrada nessa planilha. Baixe o modelo pelo botão "Baixar modelo" e preencha-o.', 'erro');
            return;
        }
        aplicarEstado(estado);       // também redesenha as séries e reavalia os campos visíveis
        agendarRascunho();
        document.querySelectorAll('.field-error').forEach(g => g.classList.remove('field-error'));

        const temSolar = Object.keys(estado).some(k => k.startsWith('fv_'));
        const dica = temSolar && !getTiposSelecionados().includes('memorial_solar')
            ? '<br><i class="fas fa-solar-panel"></i> A planilha tem dados fotovoltaicos: marque <strong>Memorial Solar (FV)</strong> para gerá-lo.'
            : '';
        const lista = avisos.length
            ? `<br><strong>${avisos.length} ponto(s) para conferir:</strong><ul class="excel-avisos">${avisos.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
            : '';
        mostrarFeedback(
            `<i class="fas fa-file-excel"></i> <strong>${escapeHtml(arquivo.name)}</strong>: ${preenchidos} campo(s) preenchido(s) a partir de ${abasLidas.length} aba(s).${dica}${lista}`,
            avisos.length ? 'erro' : 'sucesso'
        );
    } catch (e) {
        console.error('Erro ao importar planilha:', e);
        mostrarFeedback(`<i class="fas fa-times-circle"></i> Não foi possível ler a planilha: ${escapeHtml(e.message)}`, 'erro');
    } finally {
        zona?.classList.remove('carregando');
        const input = document.getElementById('excel_import');
        if (input) input.value = '';   // permite importar o mesmo arquivo de novo
    }
}

function xlSetup() {
    document.getElementById('btn-excel-modelo')?.addEventListener('click', () => xlBaixar({ comDados: false }));
    document.getElementById('btn-excel-exportar')?.addEventListener('click', () => xlBaixar({ comDados: true }));
    const input = document.getElementById('excel_import');
    input?.addEventListener('change', e => {
        e.stopPropagation();
        xlImportar(input.files?.[0]);
    });

    const zona = document.getElementById('excel-zona');
    if (zona) {
        ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add('arrastando'); }));
        ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove('arrastando'); }));
        zona.addEventListener('drop', e => xlImportar(e.dataTransfer?.files?.[0]));
    }
}

document.addEventListener('DOMContentLoaded', xlSetup);
