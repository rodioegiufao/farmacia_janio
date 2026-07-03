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

function calcularEspacamentoMalha(d) {
    return 0.2 * Math.pow(5, Math.log10(d));
}

function calcularPontos(comprimento, largura) {
    const maiorDimensao = Math.max(comprimento, largura);
    const espacamento = calcularEspacamentoMalha(maiorDimensao);
    const nComprimento = Math.ceil(comprimento / espacamento);
    const nLargura = Math.ceil(largura / espacamento);
    const totalPontos = nComprimento * nLargura;

    return { maiorDimensao, espacamento, nComprimento, nLargura, totalPontos };
}

function formatarNumero(valor, casas = 2) {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
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
    const nome = dados.nomeAmbiente || 'Ambiente analisado';

    resumo.textContent = `Para ${nome}, considerando comprimento de ${formatarNumero(dados.comprimento)} m e largura de ${formatarNumero(dados.largura)} m, a maior dimensão adotada foi de ${formatarNumero(dados.maiorDimensao)} m. Com base no critério do Anexo B da ABNT NBR ISO/CIE 8995-1:2013, o espaçamento máximo entre pontos calculado foi de ${formatarNumero(dados.espacamento)} m. Assim, recomenda-se uma malha com ${dados.nComprimento} pontos no sentido do comprimento e ${dados.nLargura} pontos no sentido da largura, totalizando ${dados.totalPontos} pontos de verificação de iluminância.`;

    const itens = [
        ['Nome do ambiente', nome],
        ['Comprimento informado', `${formatarNumero(dados.comprimento)} m`],
        ['Largura informada', `${formatarNumero(dados.largura)} m`],
        ['Maior dimensão considerada', `${formatarNumero(dados.maiorDimensao)} m`],
        ['Espaçamento máximo entre pontos', `${formatarNumero(dados.espacamento)} m`],
        ['Pontos no comprimento', dados.nComprimento],
        ['Pontos na largura', dados.nLargura],
        ['Total de pontos', dados.totalPontos, true]
    ];

    metricas.innerHTML = itens.map(([rotulo, valor, destaque]) => `
        <div class="metric${destaque ? ' highlight' : ''}">
            <span>${rotulo}</span>
            <strong>${valor}</strong>
        </div>
    `).join('');

    desenharMalha(dados.nComprimento, dados.nLargura);
    resultadoCard.hidden = false;
    resultadoCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function desenharMalha(nComprimento, nLargura) {
    const malha = document.getElementById('malhaVisual');
    const legenda = document.getElementById('meshLegend');
    malha.style.setProperty('--cols', nComprimento);
    malha.style.setProperty('--rows', nLargura);
    malha.innerHTML = '';

    for (let i = 0; i < nComprimento * nLargura; i += 1) {
        const ponto = document.createElement('span');
        ponto.className = 'mesh-point';
        malha.appendChild(ponto);
    }

    legenda.textContent = `${nComprimento} × ${nLargura} = ${nComprimento * nLargura} pontos`;
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

        if (!Number.isFinite(comprimento) || !Number.isFinite(largura)) {
            mostrarErro('Informe comprimento e largura válidos, usando metros como unidade. Você pode usar vírgula ou ponto como separador decimal.');
            return;
        }

        if (comprimento <= 0 || largura <= 0) {
            mostrarErro('Comprimento e largura devem ser maiores que zero.');
            return;
        }

        const resultado = calcularPontos(comprimento, largura);
        renderizarResultado({
            ...resultado,
            comprimento,
            largura,
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