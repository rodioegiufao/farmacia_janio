(function (global) {
    'use strict';

    const TITULOS_IGNORADOS = ['legenda de simbolos', 'lista de materiais'];
    const CAMPOS = [
        ['pavimentos', ['pavimento', 'estrutura']],
        ['alimentacao', ['alimentacao eletrica', 'alimentacao']],
        ['fatoresDemanda', ['fator de demanda', 'fatores de demanda', 'demanda']],
        ['quadrosProtecao', ['quadro de distribuicao', 'disjuntor', 'protecao']],
        ['quedaTensao', ['queda de tensao']],
        ['temperatura', ['temperatura ambiente', 'temperatura']],
        ['pontosEletricos', ['pontos eletricos', 'pontos de utilizacao', 'pontos']],
        ['quadrosCarga', ['tabela de carga', 'quadro de carga', 'composicao de carga']],
        ['condutores', ['condutor', 'secao dos cabos']],
        ['memorialCalculo', ['memorial de calculo']],
        ['relatorioDimensionamento', ['relatorio de dimensionamento', 'dimensionamento']]
    ];

    function normalizarTitulo(valor) {
        return String(valor || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLocaleLowerCase('pt-BR')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function textoLimpo(elemento) {
        return String(elemento?.textContent || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
    }

    function celulaParaModelo(cell) {
        return {
            texto: textoLimpo(cell),
            colspan: Math.max(1, Number.parseInt(cell.getAttribute('colspan') || '1', 10) || 1),
            rowspan: Math.max(1, Number.parseInt(cell.getAttribute('rowspan') || '1', 10) || 1),
            cabecalho: cell.tagName.toLowerCase() === 'th'
        };
    }

    function tabelaParaModelo(table) {
        const linhas = Array.from(table.rows || []).map((row) => ({
            celulas: Array.from(row.cells || []).map(celulaParaModelo)
        })).filter((row) => row.celulas.some((cell) => cell.texto));
        if (!linhas.length) return null;
        const primeiraTemTh = Array.from(table.rows?.[0]?.cells || []).some((cell) => cell.tagName.toLowerCase() === 'th');
        linhas[0].celulas.forEach((cell) => { cell.cabecalho = primeiraTemTh || cell.cabecalho; });
        return { linhas, titulo: table.getAttribute('summary') || '', colunas: calcularColunas(linhas) };
    }

    function calcularColunas(linhas) {
        return linhas.reduce((max, row) => Math.max(max, row.celulas.reduce((sum, cell) => sum + cell.colspan, 0)), 0);
    }

    function extrairBloco(titulo, nodes) {
        const paragrafos = [];
        const tabelas = [];
        nodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            if (node.matches?.('script, style, link, iframe, object, embed, form, input, button, noscript')) return;
            if (node.matches?.('table')) {
                const tabela = tabelaParaModelo(node);
                if (tabela) tabelas.push(tabela);
                return;
            }
            node.querySelectorAll?.('table').forEach((table) => {
                const tabela = tabelaParaModelo(table);
                if (tabela) tabelas.push(tabela);
            });
            const clone = node.cloneNode(true);
            clone.querySelectorAll?.('table, script, style, link, iframe, object, embed').forEach((item) => item.remove());
            const texto = textoLimpo(clone);
            if (texto) paragrafos.push(texto);
        });
        return { titulo, paragrafos: [...new Set(paragrafos)], tabelas };
    }

    function classificar(titulo) {
        const normalizado = normalizarTitulo(titulo);
        if (TITULOS_IGNORADOS.some((item) => normalizado.includes(item))) return 'ignorar';
        for (const [campo, aliases] of CAMPOS) {
            if (aliases.some((alias) => normalizado.includes(alias))) return campo;
        }
        return 'outras';
    }

    function modeloVazio(arquivo) {
        return {
            arquivo,
            pavimentos: [], alimentacao: { paragrafos: [], tabelas: [] }, fatoresDemanda: [],
            quadrosProtecao: [], quedaTensao: { paragrafos: [], tabelas: [] },
            temperatura: { paragrafos: [], tabelas: [] }, pontosEletricos: [],
            condutores: { paragrafos: [], tabelas: [] }, quadrosCarga: [], memorialCalculo: [],
            relatorioDimensionamento: { quadros: [], circuitos: [], secoes: [] },
            secoes: [], avisos: []
        };
    }

    function adicionarAoModelo(modelo, tipo, bloco) {
        modelo.secoes.push({ tipo, ...bloco });
        if (tipo === 'ignorar' || tipo === 'outras') return;
        if (['alimentacao', 'quedaTensao', 'temperatura', 'condutores'].includes(tipo)) {
            modelo[tipo].paragrafos.push(...bloco.paragrafos);
            modelo[tipo].tabelas.push(...bloco.tabelas);
        } else if (tipo === 'relatorioDimensionamento') {
            modelo.relatorioDimensionamento.secoes.push(bloco);
        } else {
            modelo[tipo].push(bloco);
        }
    }

    function acharColuna(cabecalhos, aliases) {
        return cabecalhos.findIndex((cab) => aliases.some((alias) => cab.includes(alias)));
    }

    function tabelaPlana(tabela) {
        return tabela.linhas.map((row) => row.celulas.flatMap((cell) => Array(cell.colspan).fill(cell.texto)));
    }

    function consolidarRelatorio(modelo) {
        const tabelas = modelo.relatorioDimensionamento.secoes.flatMap((secao) => secao.tabelas.map((tabela) => ({ tabela, secao })));
        tabelas.forEach(({ tabela, secao }) => {
            const matriz = tabelaPlana(tabela);
            if (matriz.length < 2) return;
            const heads = matriz[0].map(normalizarTitulo);
            const circuito = acharColuna(heads, ['circuito', 'circ.']);
            const quadro = acharColuna(heads, ['quadro', 'qd']);
            const linhas = matriz.slice(1).filter((row) => row.some(Boolean));
            if (circuito >= 0) {
                linhas.forEach((row) => modelo.relatorioDimensionamento.circuitos.push({
                    quadro: quadro >= 0 ? row[quadro] : '', circuito: row[circuito], valores: row, cabecalhos: matriz[0]
                }));
            } else if (quadro >= 0) {
                linhas.forEach((row) => modelo.relatorioDimensionamento.quadros.push({ quadro: row[quadro], valores: row, cabecalhos: matriz[0] }));
            } else {
                const pares = matriz.filter((row) => row.length >= 2 && row[0] && row[1]);
                if (!pares.length) return;
                const cabecalhos = pares.map((row) => row[0]);
                const valores = pares.map((row) => row.slice(1).find(Boolean) || '');
                const labels = cabecalhos.map(normalizarTitulo);
                const indiceCircuito = acharColuna(labels, ['circuito', 'numero do circuito']);
                const indiceQuadro = acharColuna(labels, ['quadro', 'nome do quadro']);
                const titulo = secao.paragrafos?.[0] || secao.titulo || '';
                if (indiceCircuito >= 0 || normalizarTitulo(titulo).includes('circuito')) {
                    modelo.relatorioDimensionamento.circuitos.push({
                        quadro: indiceQuadro >= 0 ? valores[indiceQuadro] : '',
                        circuito: indiceCircuito >= 0 ? valores[indiceCircuito] : titulo,
                        valores, cabecalhos
                    });
                } else if (indiceQuadro >= 0 || normalizarTitulo(titulo).includes('quadro')) {
                    modelo.relatorioDimensionamento.quadros.push({
                        quadro: indiceQuadro >= 0 ? valores[indiceQuadro] : titulo,
                        valores, cabecalhos
                    });
                }
            }
        });
    }

    function escolherDecodificacao(buffer) {
        const bytes = new Uint8Array(buffer);
        const amostra = bytes.subarray(0, Math.min(bytes.length, 65536));
        const ascii = new TextDecoder('windows-1252').decode(amostra);
        const meta = ascii.match(/charset\s*=\s*["']?\s*([\w-]+)/i)?.[1]?.toLowerCase() || '';
        if (/utf-?8/.test(meta)) return 'utf-8';
        if (/1252|iso-8859-1|latin1/.test(meta)) return 'windows-1252';
        const utf = new TextDecoder('utf-8').decode(amostra);
        return (utf.match(/\ufffd/g) || []).length ? 'windows-1252' : 'utf-8';
    }

    async function interpretarArquivo(file, onProgress = () => {}) {
        if (!file || !/\.(html?|HTML?)$/.test(file.name || '')) throw new Error('Selecione um arquivo .html ou .htm válido.');
        onProgress('lendo arquivo');
        const buffer = await file.arrayBuffer();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const codificacao = escolherDecodificacao(buffer);
        let html = new TextDecoder(codificacao).decode(buffer);
        let usouFallback = false;
        if ((html.match(/\ufffd/g) || []).length > 20) {
            html = new TextDecoder(codificacao === 'utf-8' ? 'windows-1252' : 'utf-8').decode(buffer);
            usouFallback = true;
        }
        if ((html.match(/\ufffd/g) || []).length > 20) throw new Error('Erro de codificação: o arquivo não pôde ser lido como Windows-1252, ISO-8859-1 ou UTF-8.');
        onProgress('interpretando seções');
        const doc = new DOMParser().parseFromString(html, 'text/html');
        html = '';
        doc.querySelectorAll('script, style, link, iframe, object, embed, base, meta[http-equiv="refresh"]').forEach((node) => node.remove());
        const codificacaoUsada = usouFallback ? (codificacao === 'utf-8' ? 'windows-1252' : 'utf-8') : codificacao;
        const modelo = modeloVazio({ nome: file.name, tamanho: file.size, codificacao: codificacaoUsada });
        if (usouFallback) modelo.avisos.push('Foi necessário usar a codificação alternativa para preservar os caracteres do arquivo.');
        const titulos = Array.from(doc.querySelectorAll('p.subTitle'));
        if (!titulos.length) modelo.avisos.push('Nenhuma seção identificada por P.subTitle.');
        for (let index = 0; index < titulos.length; index += 1) {
            const titulo = titulos[index];
            const range = doc.createRange();
            range.setStartAfter(titulo);
            if (titulos[index + 1]) range.setEndBefore(titulos[index + 1]);
            else range.setEndAfter(doc.body.lastChild || titulo);
            const nodes = Array.from(range.cloneContents().childNodes);
            adicionarAoModelo(modelo, classificar(textoLimpo(titulo)), extrairBloco(textoLimpo(titulo), nodes));
            if (index % 10 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
        }
        onProgress('processando tabelas');
        consolidarRelatorio(modelo);
        const essenciais = ['pavimentos', 'alimentacao', 'fatoresDemanda', 'quadrosProtecao', 'quedaTensao', 'temperatura', 'pontosEletricos', 'condutores'];
        essenciais.forEach((campo) => {
            const valor = modelo[campo];
            const vazio = Array.isArray(valor) ? !valor.length : !valor.paragrafos.length && !valor.tabelas.length;
            if (vazio) modelo.avisos.push(`Seção não localizada: ${campo}.`);
        });
        return modelo;
    }

    global.MemorialCalculoParser = { interpretarArquivo, normalizarTitulo, tabelaParaModelo, classificar };
})(window);