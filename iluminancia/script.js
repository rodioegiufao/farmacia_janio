function parseNumero(valor) {
    if (typeof valor !== 'string') return Number.NaN;

    const texto = valor.trim().replace(/\s/g, '');
    if (!texto) return Number.NaN;

    const temVirgula = texto.includes(',');
    const temPonto = texto.includes('.');
    let normalizado = texto;

    if (temVirgula && temPonto) {
        const ultimoSeparador = Math.max(texto.lastIndexOf(','), texto.lastIndexOf('.'));
        const inteiro = texto.slice(0, ultimoSeparador).replace(/[.,]/g, '');
        const decimal = texto.slice(ultimoSeparador + 1);
        normalizado = `${inteiro}.${decimal}`;
    } else if (temVirgula) {
        normalizado = texto.replace(',', '.');
    }

    return Number.parseFloat(normalizado);
}

function parseInteiroOpcional(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return null;
    if (!/^\d+$/.test(texto)) return Number.NaN;
    return Number.parseInt(texto, 10);
}

function calcularEspacamentoMalha(d) {
    return 0.2 * Math.pow(5, Math.log10(d));
}

const referenciasMalha = [
    { dimensao: 1, lm: 0.2, ambiente: 'área da tarefa' },
    { dimensao: 5, lm: 0.6, ambiente: 'sala/zona de sala pequena' },
    { dimensao: 10, lm: 1, ambiente: 'sala média' },
    { dimensao: 50, lm: 3, ambiente: 'sala grande' }
];

function criarResultadoReferencia(referencia) {
    return {
        lm: referencia.lm,
        inferior: referencia,
        superior: referencia,
        interpolado: false
    };
}

function calcularInterpolacaoLm(d) {
    const primeiraReferencia = referenciasMalha[0];
    const ultimaReferencia = referenciasMalha[referenciasMalha.length - 1];
    const referenciaExata = referenciasMalha.find((referencia) => referencia.dimensao === d);

    if (referenciaExata) {
        return criarResultadoReferencia(referenciaExata);
    }

    if (d < primeiraReferencia.dimensao) {
        return criarResultadoReferencia(primeiraReferencia);
    }

    if (d > ultimaReferencia.dimensao) {
        return criarResultadoReferencia(ultimaReferencia);
    }

    for (let i = 0; i < referenciasMalha.length - 1; i += 1) {
        const inferior = referenciasMalha[i];
        const superior = referenciasMalha[i + 1];

        if (d >= inferior.dimensao && d <= superior.dimensao) {
            const lm = inferior.lm + ((d - inferior.dimensao) * (superior.lm - inferior.lm)) / (superior.dimensao - inferior.dimensao);

            return {
                lm,
                inferior,
                superior,
                interpolado: d !== inferior.dimensao && d !== superior.dimensao
            };
        }
    }

    return {
        lm: ultimaReferencia.lm,
        inferior: ultimaReferencia,
        superior: ultimaReferencia,
        interpolado: false
    };
}

function calcularPontos(comprimento, largura, pontosComprimentoManual = null, pontosLarguraManual = null, hlp = null) {
    const maiorDimensao = Math.max(comprimento, largura);
    const espacamento = calcularEspacamentoMalha(maiorDimensao);
    const interpolacaoLm = calcularInterpolacaoLm(maiorDimensao);
    const lm = interpolacaoLm.lm;
    const logLm = Math.log10(lm);
    const ds = 0.2 * 5 * lm;
    const nComprimentoAutomatico = Math.max(1, Math.round(comprimento / ds));
    const nLarguraAutomatico = Math.max(1, Math.round(largura / ds));
    const nComprimento = pontosComprimentoManual || nComprimentoAutomatico;
    const nLargura = pontosLarguraManual || nLarguraAutomatico;
    const totalPontos = nComprimento * nLargura;
    const x = comprimento / nComprimento;
    const x1 = x / 2;
    const y = largura / nLargura;
    const y1 = y / 2;
    const verificacaoHlp = hlp ? {
        limite: 1.5 * hlp,
        atendeX: x <= 1.5 * hlp,
        atendeY: y <= 1.5 * hlp
    } : null;

    return {
        maiorDimensao,
        espacamento,
        lm,
        interpolacaoLm,
        logLm,
        ds,
        nComprimentoAutomatico,
        nLarguraAutomatico,
        nComprimento,
        nLargura,
        pontosComprimentoManual,
        pontosLarguraManual,
        totalPontos,
        x,
        x1,
        y,
        y1,
        verificacaoHlp
    };
}

function formatarNumero(valor, casas = 2) {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function formatarInterpolacao(dados) {
    const { inferior, superior, interpolado } = dados.interpolacaoLm;

    if (!interpolado && inferior === superior) {
        if (dados.maiorDimensao === inferior.dimensao) {
            return `D = ${formatarNumero(dados.maiorDimensao)} m corresponde a ${inferior.ambiente}; adota-se Lm = ${formatarNumero(dados.lm)} m.`;
        }

        return `D = ${formatarNumero(dados.maiorDimensao)} m está ${dados.maiorDimensao < inferior.dimensao ? 'abaixo de' : 'acima de'} ${formatarNumero(inferior.dimensao)} m (${inferior.ambiente}); adota-se Lm = ${formatarNumero(dados.lm)} m.`;
    }

    return `(${formatarNumero(superior.dimensao)} - ${formatarNumero(inferior.dimensao)}) / (${formatarNumero(superior.lm)} - ${formatarNumero(inferior.lm)}) = (${formatarNumero(superior.dimensao)} - ${formatarNumero(dados.maiorDimensao)}) / (${formatarNumero(superior.lm)} - Lm) ⇒ Lm = ${formatarNumero(dados.lm)} m (${inferior.ambiente} a ${superior.ambiente})`;
}

function mostrarErro(mensagem) {
    const erro = document.getElementById('mensagemErro');
    erro.textContent = mensagem;
    erro.hidden = false;
}

function ocultarErro() {
    const erro = document.getElementById('mensagemErro');
    erro.textContent = '';
    erro.hidden = true;
}

function renderizarResultado(dados) {
    const resultadoCard = document.getElementById('resultadoCard');
    const resumo = document.getElementById('resumoResultado');
    const metricas = document.getElementById('metricasResultado');
    const memoria = document.getElementById('memoriaConteudo');
    const nome = dados.nomeAmbiente || 'Ambiente analisado';
    const complementoManual = dados.pontosComprimentoManual || dados.pontosLarguraManual ? ' Os espaçamentos reais foram recalculados com os pontos manuais informados.' : '';

    resumo.textContent = `Para ${nome}, considerando comprimento de ${formatarNumero(dados.comprimento)} m e largura de ${formatarNumero(dados.largura)} m, a maior dimensão adotada foi de ${formatarNumero(dados.maiorDimensao)} m. O Lm interpolado é ${formatarNumero(dados.lm)} m e a distância da malha Ds é ${formatarNumero(dados.ds)} m. Assim, recomenda-se uma malha com ${dados.nComprimento} pontos no sentido do comprimento e ${dados.nLargura} pontos no sentido da largura, totalizando ${dados.totalPontos} pontos de verificação de iluminância.${complementoManual}`;

    const verificacaoTexto = dados.verificacaoHlp
        ? `X ${dados.verificacaoHlp.atendeX ? 'atende' : 'não atende'} e Y ${dados.verificacaoHlp.atendeY ? 'atende' : 'não atende'} ao limite de 1,5 × Hlp = ${formatarNumero(dados.verificacaoHlp.limite)} m.`
        : 'Não foi realizada verificação com Hlp, pois a altura entre luminária e plano de trabalho não foi informada.';

    const itens = [
        ['Nome do ambiente', nome],
        ['Maior dimensão D', `${formatarNumero(dados.maiorDimensao)} m`],
        ['Espaçamento máximo (cálculo atual)', `${formatarNumero(dados.espacamento)} m`],
        ['Lm interpolado', `${formatarNumero(dados.lm)} m`],
        ['log10(Lm)', formatarNumero(dados.logLm, 4)],
        ['Ds', `${formatarNumero(dados.ds)} m`],
        ['Pontos no comprimento', `${dados.nComprimento}${dados.pontosComprimentoManual ? ' (manual)' : ''}`],
        ['Pontos na largura', `${dados.nLargura}${dados.pontosLarguraManual ? ' (manual)' : ''}`],
        ['Total de pontos', dados.totalPontos, true],
        ['X', `${formatarNumero(dados.x)} m`],
        ['X1', `${formatarNumero(dados.x1)} m`],
        ['Y', `${formatarNumero(dados.y)} m`],
        ['Y1', `${formatarNumero(dados.y1)} m`],
        ['Verificação com Hlp', verificacaoTexto]
    ];

    metricas.innerHTML = itens.map(([rotulo, valor, destaque]) => `
        <div class="metric${destaque ? ' highlight' : ''}">
            <span>${rotulo}</span>
            <strong>${valor}</strong>
        </div>
    `).join('');

    memoria.innerHTML = `
        <p><strong>D = max(comprimento, largura)</strong> = max(${formatarNumero(dados.comprimento)}; ${formatarNumero(dados.largura)}) = ${formatarNumero(dados.maiorDimensao)} m</p>
        <p><strong>Interpolação:</strong> ${formatarInterpolacao(dados)}</p>
        <p><strong>Distância da malha:</strong> Ds = 0,2 × 5 × Lm = 0,2 × 5 × ${formatarNumero(dados.lm)} = ${formatarNumero(dados.ds)} m</p>
        <p><strong>Número de pontos:</strong> Np = dimensão / Ds. Comprimento: ${formatarNumero(dados.comprimento)} / ${formatarNumero(dados.ds)} = ${formatarNumero(dados.comprimento / dados.ds)} ⇒ ${dados.nComprimentoAutomatico} ponto(s). Largura: ${formatarNumero(dados.largura)} / ${formatarNumero(dados.ds)} = ${formatarNumero(dados.largura / dados.ds)} ⇒ ${dados.nLarguraAutomatico} ponto(s).</p>
        <p><strong>Espaçamento real:</strong> X = ${formatarNumero(dados.comprimento)} / ${dados.nComprimento} = ${formatarNumero(dados.x)} m; X1 = ${formatarNumero(dados.x)} / 2 = ${formatarNumero(dados.x1)} m; Y = ${formatarNumero(dados.largura)} / ${dados.nLargura} = ${formatarNumero(dados.y)} m; Y1 = ${formatarNumero(dados.y)} / 2 = ${formatarNumero(dados.y1)} m.</p>
        <p><strong>Verificação com Hlp:</strong> ${verificacaoTexto}</p>
    `;

    desenharMalha(dados);
    resultadoCard.hidden = false;
    resultadoCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function desenharMalha(dados) {
    const malha = document.getElementById('malhaVisual');
    const legenda = document.getElementById('meshLegend');
    const limiteVisual = 225;
    const simplificada = dados.totalPontos > limiteVisual;
    const cols = simplificada ? Math.min(dados.nComprimento, 15) : dados.nComprimento;
    const rows = simplificada ? Math.min(dados.nLargura, 15) : dados.nLargura;

    malha.style.setProperty('--cols', cols);
    malha.style.setProperty('--rows', rows);
    malha.innerHTML = '';

    const larguraRelativa = Math.max(42, Math.min(100, (dados.comprimento / Math.max(dados.comprimento, dados.largura)) * 100));
    malha.style.width = `min(100%, ${Math.round(larguraRelativa * 7.6)}px)`;

    for (let i = 0; i < cols * rows; i += 1) {
        const ponto = document.createElement('span');
        ponto.className = 'mesh-point';
        malha.appendChild(ponto);
    }

    const labels = [
        ['length', `Comprimento = ${formatarNumero(dados.comprimento)} m`],
        ['width', `Largura = ${formatarNumero(dados.largura)} m`],
        ['x', `X = ${formatarNumero(dados.x)} m`],
        ['y', `Y = ${formatarNumero(dados.y)} m`],
        ['x1', `X1 = ${formatarNumero(dados.x1)} m`],
        ['y1', `Y1 = ${formatarNumero(dados.y1)} m`]
    ];

    labels.forEach(([classe, texto]) => {
        const label = document.createElement('span');
        label.className = `mesh-label mesh-label-${classe}`;
        label.textContent = texto;
        malha.appendChild(label);
    });

    legenda.textContent = `${dados.nComprimento} × ${dados.nLargura} = ${dados.totalPontos} pontos${simplificada ? '. A visualização foi simplificada devido à grande quantidade de pontos.' : ''}`;
}

function initThemeSelector() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'light';

    themeToggle.addEventListener('change', function () {
        const theme = this.checked ? 'light' : 'dark';
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initThemeSelector();

    const form = document.getElementById('iluminanciaForm');
    const limparBtn = document.getElementById('limparBtn');

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        ocultarErro();

        const comprimento = parseNumero(document.getElementById('comprimento').value);
        const largura = parseNumero(document.getElementById('largura').value);
        const hlpTexto = document.getElementById('hlp').value.trim();
        const hlp = hlpTexto ? parseNumero(hlpTexto) : null;
        const pontosComprimentoManual = parseInteiroOpcional(document.getElementById('pontosComprimentoManual').value);
        const pontosLarguraManual = parseInteiroOpcional(document.getElementById('pontosLarguraManual').value);

        if (!Number.isFinite(comprimento) || !Number.isFinite(largura)) {
            mostrarErro('Informe comprimento e largura válidos, usando metros como unidade. Você pode usar vírgula ou ponto como separador decimal.');
            return;
        }

        if (comprimento <= 0 || largura <= 0) {
            mostrarErro('Comprimento e largura devem ser maiores que zero.');
            return;
        }

        if (hlpTexto && (!Number.isFinite(hlp) || hlp <= 0)) {
            mostrarErro('Hlp, se informado, deve ser maior que zero.');
            return;
        }

        if ((pontosComprimentoManual !== null && (!Number.isInteger(pontosComprimentoManual) || pontosComprimentoManual <= 0)) ||
            (pontosLarguraManual !== null && (!Number.isInteger(pontosLarguraManual) || pontosLarguraManual <= 0))) {
            mostrarErro('O número manual de pontos deve ser inteiro maior que zero.');
            return;
        }

        const resultado = calcularPontos(comprimento, largura, pontosComprimentoManual, pontosLarguraManual, hlp);
        renderizarResultado({
            ...resultado,
            comprimento,
            largura,
            hlp,
            nomeAmbiente: document.getElementById('nomeAmbiente').value.trim(),
            alturaPlano: document.getElementById('alturaPlano').value.trim(),
            tipoAmbiente: document.getElementById('tipoAmbiente').value.trim(),
            observacoes: document.getElementById('observacoes').value.trim()
        });
    });

    limparBtn.addEventListener('click', () => {
        ocultarErro();
        document.getElementById('resultadoCard').hidden = true;
        document.getElementById('malhaVisual').innerHTML = '';
    });
});
