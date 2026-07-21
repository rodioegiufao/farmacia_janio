(function (global) {
    'use strict';

    const MARCADORES = ['AAAB', 'AAAC', 'AAAD', 'AAAE', 'AAAF', 'AAAG', 'AAAH'];
    const AUSENTE = 'Informação não encontrada no arquivo importado.';

    function limpar(valor) {
        return String(valor ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    }

    function escaparXml(valor) {
        return limpar(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    function decodificarXml(valor) {
        const documento = new DOMParser().parseFromString(`<r>${valor}</r>`, 'application/xml');
        return documento.querySelector('parsererror') ? valor : documento.documentElement.textContent;
    }

    function criarParagrafoXml(texto, opcoes = {}) {
        const pPr = `<w:pPr>${opcoes.keepNext ? '<w:keepNext/>' : ''}<w:spacing w:after="${opcoes.espacoDepois ?? 120}"/>${opcoes.alinhamento ? `<w:jc w:val="${opcoes.alinhamento}"/>` : ''}</w:pPr>`;
        return `<w:p>${pPr}<w:r><w:rPr>${opcoes.negrito ? '<w:b/><w:bCs/>' : ''}<w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escaparXml(texto)}</w:t></w:r></w:p>`;
    }

    function ehNumero(texto) {
        return /^\s*[-+]?\d[\d.,%º°²³VAWkKmM/ ΔØ-]*\s*$/.test(texto || '');
    }

    function criarTabelaXml(modelo, opcoes = {}) {
        if (!modelo?.linhas?.length) return criarParagrafoXml(AUSENTE, { alinhamento: 'left' });
        const colunas = modelo.quantidadeColunas || modelo.colunas || 1;
        const fonte = opcoes.fonte || (colunas > 8 ? 14 : 16); // half-points: 7/8 pt
        const pendentes = Array(colunas).fill(null);
        const linhas = modelo.linhas.map((linha, indiceLinha) => {
            let coluna = 0;
            let indiceCelula = 0;
            const celulas = [];
            while (coluna < colunas) {
                if (pendentes[coluna]?.restantes > 0) {
                    const spanPendente = pendentes[coluna].colspan;
                    celulas.push(`<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${spanPendente > 1 ? `<w:gridSpan w:val="${spanPendente}"/>` : ''}<w:vMerge/></w:tcPr><w:p/></w:tc>`);
                    pendentes[coluna].restantes -= 1;
                    if (!pendentes[coluna].restantes) pendentes[coluna] = null;
                    for (let deslocamento = 1; deslocamento < spanPendente; deslocamento += 1) pendentes[coluna + deslocamento] = null;
                    coluna += spanPendente;
                    continue;
                }
                const celula = linha.celulas[indiceCelula++];
                if (!celula) {
                    celulas.push('<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p/></w:tc>');
                    coluna += 1;
                    continue;
                }
                const colspan = Math.max(1, celula.colspan || 1);
                if ((celula.rowspan || 1) > 1) {
                    pendentes[coluna] = { restantes: celula.rowspan - 1, colspan };
                    for (let deslocamento = 1; deslocamento < colspan; deslocamento += 1) pendentes[coluna + deslocamento] = { coberta: true };
                }
                const propriedades = `<w:tcPr><w:tcW w:w="0" w:type="auto"/>${colspan > 1 ? `<w:gridSpan w:val="${colspan}"/>` : ''}${celula.rowspan > 1 ? '<w:vMerge w:val="restart"/>' : ''}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tcMar></w:tcPr>`;
                const negrito = indiceLinha === 0 || celula.cabecalho;
                celulas.push(`<w:tc>${propriedades}<w:p><w:pPr><w:keepLines/><w:jc w:val="${ehNumero(celula.texto) ? 'right' : 'left'}"/></w:pPr><w:r><w:rPr>${negrito ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${fonte}"/><w:szCs w:val="${fonte}"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escaparXml(celula.texto)}</w:t></w:r></w:p></w:tc>`);
                coluna += colspan;
            }
            return `<w:tr><w:trPr>${indiceLinha === 0 ? '<w:tblHeader/>' : ''}<w:cantSplit/></w:trPr>${celulas.join('')}</w:tr>`;
        }).join('');
        const grade = Array.from({ length: colunas }, () => '<w:gridCol w:w="1"/>').join('');
        return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:jc w:val="center"/><w:tblLayout w:type="autofit"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:color="000000"/></w:tblBorders></w:tblPr><w:tblGrid>${grade}</w:tblGrid>${linhas}</w:tbl>`;
    }

    function tabelaPontos(pontos) {
        if (!pontos?.length) return null;
        const cabecalhos = ['Peça', 'Potência unitária (W)', 'Número de pontos', 'Potência total (W)', 'Fator de potência'];
        return {
            quantidadeColunas: 5,
            linhas: [
                { celulas: cabecalhos.map((texto) => ({ texto, colspan: 1, rowspan: 1, cabecalho: true })) },
                ...pontos.map((ponto) => ({ celulas: [ponto.peca, ponto.potenciaUnitaria, ponto.numeroPontos, ponto.potenciaTotal, ponto.fatorPotencia]
                    .map((texto) => ({ texto, colspan: 1, rowspan: 1, cabecalho: false })) }))
            ]
        };
    }

    function formatarNumero(valor) {
        const bruto = String(valor || '').trim();
        const numero = Number(bruto.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.').match(/[-+]?\d+(?:\.\d+)?/)?.[0]);
        if (!Number.isFinite(numero)) return bruto;
        const casas = bruto.match(/[.,](\d+)/)?.[1]?.length ?? 0;
        return numero.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: Math.max(casas, 2) });
    }

    function comUnidade(valor, unidade) {
        if (!valor) return '';
        const texto = String(valor);
        return /[A-Za-z%²]/.test(texto) ? texto.replace(/\d+(?:[.,]\d+)?/, (n) => formatarNumero(n)) : `${formatarNumero(texto)} ${unidade}`;
    }

    function conclusaoProtecao(verificacao) {
        if (!verificacao) return '';
        const numeros = (verificacao.match(/\d+(?:[.,]\d+)?/g) || []).map((item) => Number(item.replace(',', '.')));
        if (numeros.length < 3) return ` Foi registrada a verificação ${verificacao}.`;
        return numeros[0] < numeros[1] && numeros[1] < numeros[2]
            ? ' A relação de coordenação Ip < In < Iz foi atendida.'
            : ' A relação de coordenação Ip < In < Iz requer revisão.';
    }

    function criarTextoResumo(quadro) {
        const nome = [quadro.nomeQuadro, quadro.descricao].filter(Boolean).join(' – ') || quadro.titulo;
        const pavimento = quadro.titulo?.match(/\(([^)]+)\)/)?.[1];
        let texto = `O quadro ${nome}`;
        if (quadro.quadroOrigem && !/^nenhum$/i.test(quadro.quadroOrigem.trim())) texto += ` é alimentado pelo quadro ${quadro.quadroOrigem}`;
        if (pavimento) texto += `, localizado no pavimento ${pavimento.toLocaleLowerCase('pt-BR')}`;
        if (quadro.alimentacao) texto += `, por meio de sistema ${quadro.alimentacao}`;
        if (quadro.tensao) texto += `, com tensão de ${quadro.tensao}`;
        texto += '.';
        const potencias = [];
        if (quadro.potenciaInstaladaTotal) potencias.push(`potência instalada total de ${comUnidade(quadro.potenciaInstaladaTotal, 'VA')}`);
        if (quadro.potenciaDemandadaTotal) potencias.push(`potência demandada de ${comUnidade(quadro.potenciaDemandadaTotal, 'VA')}`);
        if (potencias.length) texto += ` O quadro apresenta ${potencias.join(' e ')}`;
        if (quadro.correnteProjeto) texto += `${potencias.length ? ', resultando' : ' A corrente resulta'} em corrente de projeto de ${comUnidade(quadro.correnteProjeto, 'A')}`;
        if (potencias.length || quadro.correnteProjeto) texto += '.';
        const condutores = [quadro.condutoresFase && `fase ${quadro.condutoresFase}`, quadro.condutorNeutro && quadro.condutorNeutro !== '-' && `neutro ${quadro.condutorNeutro}`, quadro.condutorTerra && quadro.condutorTerra !== '-' && `terra ${quadro.condutorTerra}`].filter(Boolean);
        if (condutores.length) texto += ` Para o alimentador foram adotados condutores de ${condutores.join(', ')}`;
        if (quadro.capacidadeConducao) texto += `${condutores.length ? ', com' : ' A'} capacidade de condução de ${comUnidade(quadro.capacidadeConducao, 'A')}`;
        if (condutores.length || quadro.capacidadeConducao) texto += '.';
        if (quadro.protecao || quadro.correnteProtecao) {
            texto += ` A proteção geral é realizada por ${quadro.protecao || 'dispositivo de proteção'}`;
            if (quadro.correnteProtecao) texto += `, com corrente nominal de ${comUnidade(quadro.correnteProtecao, 'A')}`;
            if (quadro.curva) texto += `, curva ${quadro.curva}`;
            if (quadro.capacidadeInterrupcao) texto += ` e capacidade de interrupção de ${comUnidade(quadro.capacidadeInterrupcao, 'kA')}`;
            texto += '.';
        }
        if (quadro.quedaTensaoTotal) texto += ` A queda de tensão total calculada é de ${comUnidade(quadro.quedaTensaoTotal, '%')}.`;
        texto += conclusaoProtecao(quadro.verificacaoProtecao);
        return texto.replace(/\b(?:undefined|null)\b/gi, '').replace(/\s+/g, ' ').trim();
    }

    function criarResumoQuadrosXml(quadros) {
        if (!quadros?.length) return criarParagrafoXml(AUSENTE);
        return quadros.map((quadro) => {
            const texto = criarTextoResumo(quadro);
            const nome = [quadro.nomeQuadro, quadro.descricao].filter(Boolean).join(' – ') || quadro.titulo || 'Quadro';
            const restante = texto.startsWith(`O quadro ${nome}`) ? texto.slice(`O quadro ${nome}`.length) : texto;
            return `<w:p><w:pPr><w:spacing w:after="240"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escaparXml(`O quadro ${nome}`)}</w:t></w:r><w:r><w:rPr><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escaparXml(restante)}</w:t></w:r></w:p>`;
        }).join('');
    }

    function criarQuadrosCargaXml(quadros) {
        if (!quadros?.length) return criarParagrafoXml(AUSENTE);
        return quadros.map((quadro) => `${criarParagrafoXml(quadro.titulo, { negrito: true, keepNext: true })}${criarTabelaXml(quadro.tabela, { fonte: quadro.tabela.quantidadeColunas > 8 ? 14 : 16 })}${criarParagrafoXml('', { espacoDepois: 120 })}`).join('');
    }

    function textoDoParagrafo(paragrafoXml) {
        return [...paragrafoXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((item) => decodificarXml(item[1])).join('');
    }

    function substituirParagrafoMarcador(documentXml, marcador, novoXml) {
        const ocorrencias = [...documentXml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)]
            .filter((resultado) => textoDoParagrafo(resultado[0]).includes(marcador));
        if (ocorrencias.length !== 1) throw new Error(`Marcador ${marcador} encontrado ${ocorrencias.length} vez(es) no template; era esperada exatamente uma ocorrência.`);
        const resultado = ocorrencias[0];
        return documentXml.slice(0, resultado.index) + novoXml + documentXml.slice(resultado.index + resultado[0].length);
    }

    async function processarTemplateCalculo(arrayBuffer, dadosFormulario, modelo) {
        if (!global.PizZip || !global.docxtemplater) throw new Error('PizZip e Docxtemplater são necessários para gerar o memorial de cálculo.');
        const zip = new PizZip(arrayBuffer);
        const dados = { ...dadosFormulario };
        MARCADORES.forEach((chave) => { dados[chave] = `__MEMORIAL_${chave}__`; });
        const doc = new docxtemplater(zip, { paragraphLoop: true, linebreaks: true,
            delimiters: { start: '[', end: ']' }, nullGetter: () => '' });
        doc.render(dados);
        const renderizado = doc.getZip();
        const arquivo = renderizado.file('word/document.xml');
        if (!arquivo) throw new Error('O template de cálculo não contém word/document.xml.');
        let documentXml = arquivo.asText();
        const substituicoes = {
            AAAB: criarTabelaXml(modelo.pavimentos), AAAC: criarTabelaXml(modelo.alimentacaoEletrica),
            AAAD: criarTabelaXml(modelo.dimensionamentoQuadros), AAAE: criarTabelaXml(tabelaPontos(modelo.pontosForca)),
            AAAF: criarTabelaXml(tabelaPontos(modelo.pontosLuz)), AAAG: criarQuadrosCargaXml(modelo.quadrosCarga),
            AAAH: criarResumoQuadrosXml(modelo.relatorioQuadros)
        };
        MARCADORES.forEach((chave) => {
            documentXml = substituirParagrafoMarcador(documentXml, `__MEMORIAL_${chave}__`, substituicoes[chave]);
        });
        const proibidos = MARCADORES.flatMap((chave) => [`[${chave}]`, `__MEMORIAL_${chave}__`]);
        const remanescentes = proibidos.filter((item) => documentXml.includes(item));
        if (remanescentes.length) throw new Error(`Marcadores não substituídos: ${remanescentes.join(', ')}.`);
        const teste = new DOMParser().parseFromString(documentXml, 'application/xml');
        if (teste.querySelector('parsererror')) throw new Error('O XML do memorial de cálculo ficou inválido.');
        renderizado.file('word/document.xml', documentXml);
        return renderizado.generate({ type: 'arraybuffer', compression: 'DEFLATE',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    }

    global.DocxMemorialCalculo = { processarTemplateCalculo, criarTabelaXml, criarResumoQuadrosXml,
        substituirParagrafoMarcador, criarTextoResumo };
})(window);