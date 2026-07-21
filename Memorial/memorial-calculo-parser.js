(function (global) {
    'use strict';

    function normalizarTexto(valor) {
        return String(valor || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
            .toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function textoOriginal(valor) {
        let texto = '';
        if (typeof valor === 'string') texto = valor;
        else if (valor && typeof valor.textContent === 'string') texto = valor.textContent;
        else if (valor?.textContent && typeof valor.textContent.textContent === 'string') texto = valor.textContent.textContent;
        return texto.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function obterElementosDaSecao(tituloElemento) {
        const elementos = [];
        let atual = tituloElemento?.nextElementSibling;
        while (atual) {
            if (atual.tagName === 'P' && atual.classList.contains('subTitle')) break;
            elementos.push(atual);
            atual = atual.nextElementSibling;
        }
        return elementos;
    }

    function tabelaParaModelo(tabela) {
        const linhas = Array.from(tabela?.rows || []).map((linha, indice) => ({
            celulas: Array.from(linha.cells || []).map((celula) => ({
                texto: textoOriginal(celula),
                colspan: Math.max(1, parseInt(celula.getAttribute('colspan') || '1', 10) || 1),
                rowspan: Math.max(1, parseInt(celula.getAttribute('rowspan') || '1', 10) || 1),
                cabecalho: indice === 0 || celula.tagName === 'TH' || Boolean(celula.querySelector('b, strong'))
            }))
        })).filter((linha) => linha.celulas.some((celula) => celula.texto));
        return linhas.length ? {
            linhas,
            quantidadeColunas: linhas.reduce((maior, linha) => Math.max(maior,
                linha.celulas.reduce((total, celula) => total + celula.colspan, 0)), 0)
        } : null;
    }

    function localizarTitulo(documento, titulo) {
        const esperado = normalizarTexto(titulo);
        return Array.from(documento.querySelectorAll('p.subTitle')).find((item) => normalizarTexto(item.textContent) === esperado);
    }

    function tabelasNosElementos(elementos) {
        const tabelas = [];
        elementos.forEach((elemento) => {
            if (elemento.matches?.('table')) tabelas.push(elemento);
            elemento.querySelectorAll?.('table').forEach((tabela) => tabelas.push(tabela));
        });
        return tabelas;
    }

    function primeiraTabelaDaSecao(documento, titulo) {
        const elemento = localizarTitulo(documento, titulo);
        return { elemento, tabela: elemento ? tabelasNosElementos(obterElementosDaSecao(elemento))[0] : null };
    }

    function elementosEntreMarcadores(elementos, inicio, fim) {
        const saida = [];
        let coletando = false;
        let encontrou = false;
        for (const elemento of elementos) {
            const texto = normalizarTexto(elemento.textContent);
            if (!coletando && elemento.matches?.('p') && texto === inicio) {
                coletando = true;
                encontrou = true;
                continue;
            }
            if (coletando && fim && elemento.matches?.('p') && texto === fim) break;
            if (coletando) saida.push(elemento);
        }
        return { elementos: saida, encontrou };
    }

    function tabelaChaveValorParaPonto(tabela) {
        const valores = {};
        Array.from(tabela.rows || []).forEach((linha) => {
            const celulas = Array.from(linha.cells || []);
            if (celulas.length >= 2) valores[normalizarTexto(celulas[0].textContent)] = textoOriginal(celulas[1]);
        });
        const valor = (...aliases) => {
            const chave = Object.keys(valores).find((item) => aliases.some((alias) => item.includes(alias)));
            return chave ? valores[chave] : '';
        };
        const ponto = {
            peca: valor('peca'), potenciaUnitaria: valor('potencia unitaria'),
            numeroPontos: valor('numero de pontos'), potenciaTotal: valor('potencia total'),
            fatorPotencia: valor('fator de potencia')
        };
        return Object.values(ponto).some(Boolean) ? ponto : null;
    }

    function extrairPontos(documento, avisos) {
        const titulo = localizarTitulo(documento, 'Composição e tabelas de cargas');
        if (!titulo) {
            avisos.push('Seção não localizada: Composição e tabelas de cargas.');
            return { pontosForca: [], pontosLuz: [] };
        }
        const elementos = obterElementosDaSecao(titulo);
        const forca = elementosEntreMarcadores(elementos, 'pontos de forca', 'pontos de luz');
        const luz = elementosEntreMarcadores(elementos, 'pontos de luz');
        const converter = (grupo) => tabelasNosElementos(grupo.elementos).map(tabelaChaveValorParaPonto).filter(Boolean);
        const pontosForca = converter(forca);
        const pontosLuz = converter(luz);
        if (!forca.encontrou) avisos.push('Marcador “Pontos de força” não localizado.');
        else if (!pontosForca.length) avisos.push('O marcador “Pontos de força” não possui tabelas válidas.');
        if (!luz.encontrou) avisos.push('Marcador “Pontos de luz” não localizado.');
        else if (!pontosLuz.length) avisos.push('O marcador “Pontos de luz” não possui tabelas válidas.');
        return { pontosForca, pontosLuz };
    }

    function extrairDimensionamento(documento, avisos) {
        const titulo = localizarTitulo(documento, 'Quadros de distribuição e disjuntores');
        if (!titulo) {
            avisos.push('Seção não localizada: Quadros de distribuição e disjuntores.');
            return null;
        }
        const elementos = obterElementosDaSecao(titulo);
        const marcador = elementos.findIndex((item) => item.matches?.('p') && normalizarTexto(item.textContent).includes('dimensionamento dos quadros de distribuicao'));
        if (marcador < 0) {
            avisos.push('Marcador de dimensionamento dos quadros não localizado.');
            return null;
        }
        const tabela = tabelasNosElementos(elementos.slice(marcador + 1)).find((item) => {
            const cabecalho = normalizarTexto(Array.from(item.rows?.[0]?.cells || []).map(textoOriginal).join(' '));
            return cabecalho.includes('quadro') && cabecalho.includes('protecao');
        });
        if (!tabela) avisos.push('Tabela de dimensionamento com cabeçalho Quadro/Proteção não localizada.');
        return tabelaParaModelo(tabela);
    }

    function extrairQuadrosCarga(documento, avisos) {
        const titulo = localizarTitulo(documento, 'Memorial de cálculo');
        if (!titulo) {
            avisos.push('Seção não localizada: Memorial de cálculo.');
            return [];
        }
        const elementos = obterElementosDaSecao(titulo);
        const quadros = [];
        elementos.forEach((elemento, indice) => {
            if (!elemento.matches?.('p') || !normalizarTexto(elemento.textContent).startsWith('quadro de cargas:')) return;
            const tabela = tabelasNosElementos(elementos.slice(indice + 1))[0];
            if (tabela) quadros.push({ titulo: textoOriginal(elemento), tabela: tabelaParaModelo(tabela) });
            else avisos.push(`Tabela não localizada para ${textoOriginal(elemento)}.`);
        });
        if (!quadros.length) avisos.push('Nenhum quadro de carga foi localizado.');
        return quadros;
    }

    function valorApos(texto, expressao) {
        return texto.match(expressao)?.[1]?.trim() || '';
    }

    function extrairDadosRelatorio(titulo, tabelas) {
        const celulas = tabelas.flatMap((tabela) => tabela.linhas.flatMap((linha) => linha.celulas.map((celula) => celula.texto)));
        const texto = celulas.join(' | ');
        const n = normalizarTexto(texto);
        const acharOriginal = (termo) => celulas.find((celula) => normalizarTexto(celula).includes(termo)) || '';
        const potencia = acharOriginal('potencia instalada');
        const totais = potencia.match(/[-+]?\d[\d.,]*/g) || [];
        const corrente = acharOriginal('projeto (ip)');
        const corrigida = acharOriginal('corrigida (id)');
        const condutores = acharOriginal('capacidade de conducao (fase)') || acharOriginal('fase');
        const protecao = acharOriginal('corrente de atuacao');
        const queda = acharOriginal('dv% parcial') || acharOriginal('queda de tensao');
        const verificacao = acharOriginal('ip < in < iz');
        const tituloTexto = textoOriginal(titulo);
        const nomeDescricao = tituloTexto.replace(/^Dimensionamento\s+/i, '').trim();
        const [nomeQuadro, ...partesDescricao] = nomeDescricao.split(/\s+-\s+/);
        const descricao = partesDescricao.join(' - ').trim();
        return {
            titulo: tituloTexto, nomeQuadro: nomeQuadro.trim(), descricao,
            quadroOrigem: valorApos(acharOriginal('quadro '), /Quadro\s+(.+)/i),
            alimentacao: valorApos(acharOriginal('alimentacao'), /Alimenta[cç][aã]o\s*:?\s*(.+)/i),
            tensao: valorApos(acharOriginal('tensao f-f'), /Tens[aã]o\s+F-F\s*:?\s*(.+)/i),
            fatorPotencia: valorApos(acharOriginal('fp'), /\bFP\s*:?\s*([\d.,]+)/i),
            fca: valorApos(acharOriginal('fca'), /\bFCA[^\d]*([\d.,]+)/i), fct: valorApos(acharOriginal('fct'), /\bFCT[^\d]*([\d.,]+)/i),
            potenciaInstaladaTotal: totais.at(-2) || '', potenciaDemandadaTotal: totais.at(-1) || '',
            correnteProjeto: valorApos(corrente, /Projeto\s*\(Ip\)\s*:?\s*([\d.,]+)/i),
            correnteCorrigida: valorApos(corrigida, /Corrigida\s*\(Id\)\s*:?\s*([\d.,]+)/i),
            metodoInstalacao: valorApos(acharOriginal('metodo de instalacao'), /M[eé]todo de instala[cç][aã]o\s*:?\s*([^|\n]+)/i),
            secaoDimensionada: valorApos(acharOriginal('secao:'), /Se[cç][aã]o\s*:?\s*([\d.,]+\s*mm²)/i),
            condutoresFase: valorApos(condutores, /Fase\s*:?\s*([\d.,]+\s*mm²)/i),
            condutorNeutro: valorApos(condutores, /Neutro\s*:?\s*([^\n|]+)/i), condutorTerra: valorApos(condutores, /Terra\s*:?\s*([^\n|]+)/i),
            capacidadeConducao: valorApos(condutores, /Capacidade de condu[cç][aã]o(?:\s*\(Fase\))?\s*:?\s*([\d.,]+\s*A)/i),
            protecao: protecao.replace(/Corrente de atua[cç][aã]o[\s\S]*/i, '').trim(),
            correnteProtecao: valorApos(protecao, /Corrente de atua[cç][aã]o\s*:?\s*([\d.,]+\s*A)/i),
            capacidadeInterrupcao: valorApos(protecao, /-\s*([\d.,]+\s*kA)/i), curva: valorApos(protecao, /-\s*([A-Z])\s*$/i),
            quedaTensaoParcial: valorApos(queda, /dV% parcial[^\d]*([\d.,]+)/i),
            quedaTensaoTotal: valorApos(queda, /dV% total[^\d]*([\d.,]+)/i),
            curtoCircuito: valorApos(acharOriginal('corrente de curto-circuito'), /curto-circuito[^\d]*([\d.,]+\s*(?:kA)?)/i),
            verificacaoProtecao: verificacao,
            _textoNormalizado: n
        };
    }

    function extrairRelatorioQuadros(documento, avisos) {
        const titulos = Array.from(documento.querySelectorAll('p.subTitle'));
        const indiceRelatorio = titulos.findIndex((item) => normalizarTexto(item.textContent) === 'relatorio de dimensionamento');
        const quadros = indiceRelatorio < 0 ? null : titulos.slice(indiceRelatorio + 1)
            .find((item) => normalizarTexto(item.textContent) === 'quadros');
        if (!quadros) {
            avisos.push('Subseção “Quadros” do relatório de dimensionamento não localizada.');
            return [];
        }
        const elementos = obterElementosDaSecao(quadros); // para obrigatoriamente antes de “Circuitos”
        const saida = [];
        elementos.forEach((elemento, indice) => {
            if (!elemento.matches?.('p') || !normalizarTexto(elemento.textContent).startsWith('dimensionamento ')) return;
            const seguintes = elementos.slice(indice + 1);
            const limite = seguintes.findIndex((item) => item.matches?.('p') && normalizarTexto(item.textContent).startsWith('dimensionamento '));
            const tabelas = tabelasNosElementos(limite < 0 ? seguintes : seguintes.slice(0, limite)).map(tabelaParaModelo).filter(Boolean).slice(0, 2);
            if (tabelas.length) saida.push(extrairDadosRelatorio(elemento, tabelas));
        });
        if (!saida.length) avisos.push('Nenhum dimensionamento de quadro foi localizado na subseção “Quadros”.');
        return saida;
    }

    function escolherDecodificacao(buffer) {
        const amostra = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 65536));
        const declaracao = new TextDecoder('windows-1252').decode(amostra)
            .match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i)?.[1]?.toLowerCase() || '';
        if (/utf-?8/.test(declaracao)) return 'utf-8';
        if (/windows-?1252|iso-8859-1|latin-?1/.test(declaracao)) return 'windows-1252';
        return new TextDecoder('utf-8').decode(amostra).includes('\ufffd') ? 'windows-1252' : 'utf-8';
    }

    async function interpretarArquivo(file, onProgress = () => {}) {
        if (!file || !/\.html?$/i.test(file.name || '')) throw new Error('Selecione um arquivo .html ou .htm válido.');
        onProgress('Lendo arquivo');
        const buffer = await file.arrayBuffer();
        let codificacao = escolherDecodificacao(buffer);
        let texto = new TextDecoder(codificacao).decode(buffer);
        if ((texto.match(/\ufffd/g) || []).length > 20) {
            const alternativa = codificacao === 'utf-8' ? 'windows-1252' : 'utf-8';
            const alternativo = new TextDecoder(alternativa).decode(buffer);
            if ((alternativo.match(/\ufffd/g) || []).length < (texto.match(/\ufffd/g) || []).length) {
                texto = alternativo;
                codificacao = alternativa;
            }
        }
        onProgress('Interpretando estrutura do QiBuilder');
        const documento = new DOMParser().parseFromString(texto, 'text/html');
        texto = '';
        const modelo = {
            arquivo: { nome: file.name, tamanho: file.size, codificacao }, pavimentos: null,
            alimentacaoEletrica: null, dimensionamentoQuadros: null, pontosForca: [], pontosLuz: [],
            quadrosCarga: [], relatorioQuadros: [], avisos: []
        };
        onProgress('Extraindo pavimentos');
        const pavimentos = primeiraTabelaDaSecao(documento, 'Pavimentos da estrutura');
        modelo.pavimentos = pavimentos.tabela ? { titulo: textoOriginal(pavimentos.elemento), ...tabelaParaModelo(pavimentos.tabela) } : null;
        if (!modelo.pavimentos) modelo.avisos.push('Seção/tabela “Pavimentos da estrutura” não localizada.');
        onProgress('Extraindo alimentação elétrica');
        const alimentacao = primeiraTabelaDaSecao(documento, 'Alimentação elétrica');
        modelo.alimentacaoEletrica = alimentacao.tabela ? { tituloEntrada: textoOriginal(alimentacao.tabela.rows?.[0]), ...tabelaParaModelo(alimentacao.tabela) } : null;
        if (!modelo.alimentacaoEletrica) modelo.avisos.push('Seção/tabela “Alimentação elétrica” não localizada.');
        modelo.dimensionamentoQuadros = extrairDimensionamento(documento, modelo.avisos);
        onProgress('Consolidando pontos de força');
        const pontos = extrairPontos(documento, modelo.avisos);
        modelo.pontosForca = pontos.pontosForca;
        onProgress('Consolidando pontos de luz');
        modelo.pontosLuz = pontos.pontosLuz;
        onProgress('Processando quadros de carga');
        modelo.quadrosCarga = extrairQuadrosCarga(documento, modelo.avisos);
        onProgress('Resumindo dimensionamento dos quadros');
        modelo.relatorioQuadros = extrairRelatorioQuadros(documento, modelo.avisos);
        const encontradas = [modelo.pavimentos, modelo.alimentacaoEletrica, modelo.dimensionamentoQuadros,
            modelo.pontosForca.length, modelo.pontosLuz.length, modelo.quadrosCarga.length, modelo.relatorioQuadros.length].filter(Boolean).length;
        if (!encontradas) throw new Error('O arquivo não possui a estrutura esperada de um memorial elétrico do QiBuilder.');
        return modelo;
    }

    global.MemorialCalculoParser = { interpretarArquivo, normalizarTexto, obterElementosDaSecao, tabelaParaModelo };
})(window);