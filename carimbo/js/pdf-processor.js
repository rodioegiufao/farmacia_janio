// Processador de PDFs - Baseado nas funções Python
class PDFProcessor {
    constructor() {
        this.pdfjsLib = window['pdfjsLib'];
        // Configurar o worker se não estiver configurado
        if (this.pdfjsLib && !this.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    withTimeout(promise, timeoutMs, timeoutMessage) {
        if (!timeoutMs || timeoutMs <= 0) return promise;

        let timeoutId = null;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(timeoutMessage));
            }, timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]).finally(() => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        });
    }

    async detectarComodosViaServico(canvasInferencia, pageNum, cfg) {
        if (typeof window.detectarComodosServico !== 'function') {
            throw new Error('Serviço de detecção não carregado (carimbo/js/detect-comodos.js).');
        }

        const data = await window.detectarComodosServico({
            image: canvasInferencia.toDataURL('image/jpeg', 0.9),
            model: cfg?.model,
            version: cfg?.version,
            confidence: Math.round((cfg?.confidenceMin ?? 0.45) * 100),
            timeoutMs: cfg?.inferenceTimeoutMs ?? 30000,
            pageNum
        });

        return this.normalizarPredicoesComodos(data?.predictions || [], pageNum);
    }

    async detectarPlantasViaServico(canvasInferencia, pageNum, cfg) {
        if (typeof window.detectarPlantasServico !== 'function') {
            throw new Error('Serviço de detecção de plantas não carregado (carimbo/js/detect-plantas.js).');
        }

        const data = await window.detectarPlantasServico({
            image: canvasInferencia.toDataURL('image/jpeg', 0.9),
            model: cfg?.model,
            version: cfg?.version,
            confidence: Math.round((cfg?.confidenceMin ?? 0.55) * 100),
            timeoutMs: cfg?.inferenceTimeoutMs ?? 30000,
            pageNum
        });

        return this.normalizarPredicoesPlantas(data?.predictions || [], pageNum);
    }

    async detectarLuminariasViaServico(canvasInferencia, pageNum, cfg) {
        if (typeof window.detectarLuminariasServico !== 'function') {
            throw new Error('Serviço de detecção de luminárias não carregado (carimbo/js/detect-luminarias.js).');
        }

        const data = await window.detectarLuminariasServico({
            image: canvasInferencia.toDataURL('image/jpeg', 0.9),
            model: cfg?.model,
            version: cfg?.version,
            confidence: Math.round((cfg?.confidenceMin ?? 0.45) * 100),
            timeoutMs: cfg?.inferenceTimeoutMs ?? 30000,
            pageNum
        });

        return this.normalizarPredicoesLuminarias(data?.predictions || [], pageNum);
    }

    async renderizarPaginaParaCanvas(page, scale = 1.8) {
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
            throw new Error('Não foi possível criar o canvas para análise da página.');
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await page.render({
            canvasContext: ctx,
            viewport
        }).promise;

        return canvas;
    }

    redimensionarCanvas(canvasOrigem, larguraDestino = 640, alturaDestino = 640) {
        const canvasDestino = document.createElement('canvas');
        const ctxDestino = canvasDestino.getContext('2d', { willReadFrequently: true });

        if (!ctxDestino) {
            throw new Error('Não foi possível criar o canvas de redimensionamento para IA.');
        }

        canvasDestino.width = Math.max(1, Math.floor(larguraDestino));
        canvasDestino.height = Math.max(1, Math.floor(alturaDestino));

        ctxDestino.drawImage(
            canvasOrigem,
            0,
            0,
            canvasOrigem.width,
            canvasOrigem.height,
            0,
            0,
            canvasDestino.width,
            canvasDestino.height
        );

        return canvasDestino;
    }

    normalizarPredicoesComodos(predictions, pageNum) {
        if (!Array.isArray(predictions)) return [];

        return predictions.map((pred, index) => ({
            id: index + 1,
            pagina_pdf: pageNum,
            comodo: pred.class || pred.label || pred.prediction || 'Desconhecido',
            confianca: Number(pred.confidence || 0),
            x: pred.x ?? null,
            y: pred.y ?? null,
            width: pred.width ?? null,
            height: pred.height ?? null,
            points: Array.isArray(pred.points) ? pred.points.length : 0
        }));
    }

    normalizarPredicoesPlantas(predictions, pageNum) {
        if (!Array.isArray(predictions)) return [];

        return predictions.map((pred, index) => ({
            id: index + 1,
            pagina_pdf: pageNum,
            classe: pred.class || pred.label || 'planta',
            confianca: Number(pred.confidence || 0),
            x: pred.x ?? null,
            y: pred.y ?? null,
            width: pred.width ?? null,
            height: pred.height ?? null
        }));
    }

    normalizarPredicoesLuminarias(predictions, pageNum) {
        if (!Array.isArray(predictions)) return [];

        return predictions.map((pred, index) => ({
            id: index + 1,
            pagina_pdf: pageNum,
            luminaria: pred.class || pred.label || pred.prediction || 'Luminária',
            confianca: Number(pred.confidence || 0),
            x: pred.x ?? null,
            y: pred.y ?? null,
            width: pred.width ?? null,
            height: pred.height ?? null,
            points: Array.isArray(pred.points) ? pred.points.length : 0
        }));
    }

    mapearBBoxParaCanvasOriginal(pred, canvasOriginal, canvasInferencia, margemPx = 20) {
        const escalaX = canvasOriginal.width / canvasInferencia.width;
        const escalaY = canvasOriginal.height / canvasInferencia.height;

        const x = (pred.x - pred.width / 2) * escalaX;
        const y = (pred.y - pred.height / 2) * escalaY;
        const w = pred.width * escalaX;
        const h = pred.height * escalaY;

        const xFinal = Math.max(0, Math.floor(x - margemPx));
        const yFinal = Math.max(0, Math.floor(y - margemPx));
        const wFinal = Math.min(canvasOriginal.width - xFinal, Math.ceil(w + margemPx * 2));
        const hFinal = Math.min(canvasOriginal.height - yFinal, Math.ceil(h + margemPx * 2));

        return { x: xFinal, y: yFinal, width: wFinal, height: hFinal };
    }

    recortarCanvas(canvasOrigem, box) {
        const canvasDestino = document.createElement('canvas');
        const ctx = canvasDestino.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
            throw new Error('Não foi possível criar canvas de recorte.');
        }

        canvasDestino.width = box.width;
        canvasDestino.height = box.height;

        ctx.drawImage(
            canvasOrigem,
            box.x,
            box.y,
            box.width,
            box.height,
            0,
            0,
            box.width,
            box.height
        );

        return canvasDestino;
    }

    gerarResumoComodos(deteccoes) {
        const mapa = {};

        for (const item of deteccoes) {
            const chave = item.comodo;

            if (!mapa[chave]) {
                mapa[chave] = {
                    comodo: chave,
                    quantidade: 0,
                    somaConfianca: 0,
                    confiancaMax: 0,
                    paginas: new Set()
                };
            }

            mapa[chave].quantidade += 1;
            mapa[chave].somaConfianca += item.confianca;
            mapa[chave].confiancaMax = Math.max(mapa[chave].confiancaMax, item.confianca);
            mapa[chave].paginas.add(item.pagina_pdf);
        }

        return Object.values(mapa)
            .map(item => ({
                comodo: item.comodo,
                quantidade: item.quantidade,
                confianca_media: item.quantidade > 0 ? item.somaConfianca / item.quantidade : 0,
                confianca_max: item.confiancaMax,
                paginas: Array.from(item.paginas).sort((a, b) => a - b).join(', ')
            }))
            .sort((a, b) => b.quantidade - a.quantidade || a.comodo.localeCompare(b.comodo));
    }


    gerarResumoLuminarias(deteccoes) {
        const mapa = {};

        for (const item of deteccoes) {
            const chave = item.luminaria;

            if (!mapa[chave]) {
                mapa[chave] = {
                    luminaria: chave,
                    quantidade: 0,
                    somaConfianca: 0,
                    confiancaMax: 0,
                    paginas: new Set()
                };
            }

            mapa[chave].quantidade += 1;
            mapa[chave].somaConfianca += item.confianca;
            mapa[chave].confiancaMax = Math.max(mapa[chave].confiancaMax, item.confianca);
            mapa[chave].paginas.add(item.pagina_pdf);
        }

        return Object.values(mapa)
            .map(item => ({
                luminaria: item.luminaria,
                quantidade: item.quantidade,
                confianca_media: item.quantidade > 0 ? item.somaConfianca / item.quantidade : 0,
                confianca_max: item.confiancaMax,
                paginas: Array.from(item.paginas).sort((a, b) => a - b).join(', ')
            }))
            .sort((a, b) => b.quantidade - a.quantidade || a.luminaria.localeCompare(b.luminaria));
    }

    async detectarElementosNaPagina(page, pageNum) {
        const cfgComodos = window.ROBOFLOW_CONFIG;
        const cfgPlantas = window.ROBOFLOW_PLANTAS_CONFIG;
        const cfgLuminarias = window.ROBOFLOW_LUMINARIAS_CONFIG;

        if (!cfgComodos?.enabled && !cfgLuminarias?.enabled) {
            return {
                comodos: [],
                luminarias: [],
                status: 'desabilitado',
                mensagem: 'Análises de cômodos e luminárias desabilitadas.'
            };
        }

        try {
            const canvasPagina = await this.renderizarPaginaParaCanvas(page, cfgPlantas?.imageScale || 1.5);

            const canvasPlantasInferencia = this.redimensionarCanvas(
                canvasPagina,
                cfgPlantas?.inferenceWidth ?? 1280,
                cfgPlantas?.inferenceHeight ?? 1280
            );

            const plantas = await this.detectarPlantasViaServico(canvasPlantasInferencia, pageNum, cfgPlantas);

            const areaMinima = cfgPlantas?.minAreaDeteccao ?? 20000;
            const plantasFiltradas = plantas.filter(item => {
                const confOk = item.confianca >= (cfgPlantas?.confidenceMin ?? 0.55);
                const area = (item.width || 0) * (item.height || 0);
                return confOk && area >= areaMinima;
            });

            if (plantasFiltradas.length === 0) {
                return {
                    comodos: [],
                    luminarias: [],
                    status: 'sem_plantas',
                    mensagem: 'Nenhuma planta detectada na página.'
                };
            }

            const comodosTotais = [];
            const luminariasTotais = [];
            const margem = cfgPlantas?.margemRecortePx ?? 20;

            for (const planta of plantasFiltradas) {
                const bboxOriginal = this.mapearBBoxParaCanvasOriginal(
                    planta,
                    canvasPagina,
                    canvasPlantasInferencia,
                    margem
                );

                const canvasRecorte = this.recortarCanvas(canvasPagina, bboxOriginal);

                if (cfgComodos?.enabled) {
                    const canvasComodosInferencia = this.redimensionarCanvas(
                        canvasRecorte,
                        cfgComodos?.inferenceWidth ?? 640,
                        cfgComodos?.inferenceHeight ?? 640
                    );

                    const comodos = await this.detectarComodosViaServico(canvasComodosInferencia, pageNum, cfgComodos);

                    const comodosFiltrados = comodos
                        .filter(item => item.confianca >= (cfgComodos?.confidenceMin ?? 0.45))
                        .map(item => ({
                            ...item,
                            planta_id: planta.id,
                            planta_classe: planta.classe,
                            planta_confianca: planta.confianca
                        }));

                    comodosTotais.push(...comodosFiltrados);
                }

                if (cfgLuminarias?.enabled) {
                    const canvasLuminariasInferencia = this.redimensionarCanvas(
                        canvasRecorte,
                        cfgLuminarias?.inferenceWidth ?? 1280,
                        cfgLuminarias?.inferenceHeight ?? 1280
                    );

                    const luminarias = await this.detectarLuminariasViaServico(canvasLuminariasInferencia, pageNum, cfgLuminarias);

                    const luminariasFiltradas = luminarias
                        .filter(item => item.confianca >= (cfgLuminarias?.confidenceMin ?? 0.45))
                        .map(item => ({
                            ...item,
                            planta_id: planta.id,
                            planta_classe: planta.classe,
                            planta_confianca: planta.confianca
                        }));

                    luminariasTotais.push(...luminariasFiltradas);
                }
            }

            return {
                comodos: comodosTotais,
                luminarias: luminariasTotais,
                status: 'sucesso',
                mensagem: `${plantasFiltradas.length} planta(s) detectada(s) e analisada(s).`
            };
        } catch (error) {
            console.warn(`Falha ao detectar plantas/cômodos/luminárias na página ${pageNum}:`, error);
            return {
                comodos: [],
                luminarias: [],
                status: 'erro_backend',
                mensagem: error.message || 'Falha ao executar pipeline de plantas + cômodos + luminárias.'
            };
        }
    }

    normalizarTexto(texto) {
        return (texto || '')
            .replace(/\s+/g, ' ')
            .replace(/[_\-\/]+/g, '/')
            .trim()
            .toUpperCase();
    }

    normalizarTextoComparacao(texto) {
        return (texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .toUpperCase();
    }

    normalizarNumeroFolha(valorFolha) {
        if (!valorFolha) return null;

        const match = `${valorFolha}`.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
        if (!match) return null;

        const atual = Number.parseInt(match[1], 10);
        const total = Number.parseInt(match[2], 10);

        if (Number.isNaN(atual) || Number.isNaN(total)) return null;
        return `${atual}/${total}`;
    }

    escaparRegex(texto) {
        return `${texto}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    criarRegexNumeroFolhaExato(numeroFolha) {
        if (!numeroFolha || !numeroFolha.includes('/')) return null;

        const [atual, total] = numeroFolha.split('/').map(parte => `${parte}`.trim());
        if (!atual || !total) return null;

        return new RegExp(
            `(?<!\\d)${this.escaparRegex(atual)}\\s*(?:\\/|\\s)\\s*${this.escaparRegex(total)}(?!\\d)`
        );
    }

    // Função para extrair o número da prancha do nome do arquivo
    extrairNumeroPrancha(nomeArquivo) {
        try {
            // Remove a extensão e possíveis sufixos como "_assinado"
            const nomeSemExt = nomeArquivo.replace(/\.pdf$/i, '').replace(/_assinado/i, '');
            
            // Procura por padrões como _01_07 ou -01-07 no nome
            const padroes = [
                /[_\-](\d{2})[_\-](\d{2})/,
                /[_\-](\d{2})[_\-](\d{3})/,
                /[_\-](\d{3})[_\-](\d{3})/
            ];
            
            for (const padrao of padroes) {
                const correspondencia = nomeSemExt.match(padrao);
                if (correspondencia) {
                    return `${correspondencia[1]}/${correspondencia[2]}`;
                }
            }
        } catch (error) {
            console.error('Erro ao extrair número da prancha:', error);
        }
        
        return null;
    }

    // Função para verificar se o arquivo está assinado pelo nome
    verificarAssinaturaNome(nomeArquivo) {
        return nomeArquivo.toLowerCase().includes('assinado');
    }

    // Função para extrair o código do projeto do nome do arquivo
    extrairCodigoProjeto(nomeArquivo) {
        try {
            const padrao = /PRJ-([A-Z]+)-/i;
            const correspondencia = nomeArquivo.match(padrao);
            return correspondencia ? correspondencia[1] : null;
        } catch (error) {
            console.error('Erro ao extrair código do projeto:', error);
            return null;
        }
    }

    // Extrai o valor do campo "FOLHA" usando um recorte relativo da prancha
    extrairFolhaPorCaixa(textContent, viewport, box) {
        const itensNaRegiao = this.extrairItensPorCaixa(textContent, viewport, box);

        if (!itensNaRegiao.length) return null;

        // Ordena visualmente (de cima para baixo e da esquerda para direita)
        itensNaRegiao.sort((a, b) => {
            const dy = b.transform[5] - a.transform[5];
            if (Math.abs(dy) > 2) return dy;
            return a.transform[4] - b.transform[4];
        });

        const textoRegiao = itensNaRegiao.map(item => item.str).join(' ');
        const match = textoRegiao.match(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/);

        return match ? match[1].replace(/\s+/g, '') : null;
    }

    extrairItensPorCaixa(textContent, viewport, box) {
        if (!textContent?.items?.length || !viewport || !box) return [];

        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        const xMin = pageWidth * box.xMin;
        const xMax = pageWidth * box.xMax;
        const yMin = pageHeight * box.yMin;
        const yMax = pageHeight * box.yMax;

        return textContent.items.filter(item => {
            if (!item?.transform || item.transform.length < 6) return false;

            const x = item.transform[4];
            const y = item.transform[5];
            const str = (item.str || '').trim();

            return str && x >= xMin && x <= xMax && y >= yMin && y <= yMax;
        });
    }

    getBoxesFolha() {
        return {
            A1_A2: {
                xMin: 0.905,
                xMax: 0.992,
                yMin: 0.015,
                yMax: 0.105
            },
            A0: {
                xMin: 0.905,
                xMax: 0.992,
                yMin: 0.010,
                yMax: 0.075
            }
        };
    }

    getBoxFolhaProporcional(formato) {
        const boxes = this.getBoxesFolha();
        const base = boxes.A1_A2;

        if (formato !== 'A0') return base;

        // Converte a caixa calibrada em A1+ (1189x594) para A0 (1189x841)
        const refAltura = 594;
        const a0Altura = 841;
        const yMinMm = base.yMin * refAltura;
        const yMaxMm = base.yMax * refAltura;

        return {
            xMin: base.xMin,
            xMax: base.xMax,
            yMin: yMinMm / a0Altura,
            yMax: yMaxMm / a0Altura
        };
    }

    extrairFormatoPrancha(textoExtraido) {
        const texto = this.normalizarTexto(textoExtraido);
        if (!texto) return null;

        const padroes = [
            /FORMATO\s+([A-Z0-9+]+)/,
            /FORMATO\s*[:\-]\s*([A-Z0-9+]+)/
        ];

        for (const padrao of padroes) {
            const match = texto.match(padrao);
            if (match?.[1]) {
                return match[1];
            }
        }

        return null;
    }

    detectarFormatoPrancha(textoExtraido, viewport) {
        const texto = (textoExtraido || '').toUpperCase();

        if (texto.includes('FORMATO A0')) return 'A0';
        if (texto.includes('FORMATO A1+')) return 'A1_A2';
        if (texto.includes('FORMATO A2+')) return 'A1_A2';
        if (texto.includes('FORMATO A1')) return 'A1_A2';
        if (texto.includes('FORMATO A2')) return 'A1_A2';
        if (!viewport?.width || !viewport?.height) return 'A1_A2';

        const proporcao = viewport.width / viewport.height;

        if (proporcao < 1.55) return 'A0';
        return 'A1_A2';
    }

    extrairFolhaPorTextoCompleto(textoExtraido) {
        const texto = (textoExtraido || '').replace(/\s+/g, ' ').trim().toUpperCase();
        if (!texto) return null;

        const posFolha = texto.indexOf('FOLHA');
        if (posFolha === -1) return null;

        // Limita a busca para evitar falsos positivos distantes do campo FOLHA
        const trechoDepoisFolha = texto.slice(posFolha, posFolha + 800);

        // Captura a primeira paginação válida dentro da janela
        const matches = [
            ...trechoDepoisFolha.matchAll(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/g)
        ];
        if (matches.length) {
            return matches[0][1].replace(/\s+/g, '');
        }

        const folhaSemBarra = this.extrairFolhaSemBarraPorContexto(trechoDepoisFolha);
        if (folhaSemBarra) return folhaSemBarra;

        // Fallback sem barra: busca dois números em sequência separados apenas por espaço.
        // Esse caminho fica por último porque o carimbo pode conter CREA/CAU, datas e áreas
        // no trecho posterior ao rótulo FOLHA.
        const matchEspaco = trechoDepoisFolha.match(/\b(\d{1,3})\s+(\d{1,3})\b/);
        if (!matchEspaco) return null;

        return `${matchEspaco[1]}/${matchEspaco[2]}`;
    }
    
    extrairFolhaSemBarraPorContexto(texto) {
        const textoNormalizado = (texto || '').replace(/\s+/g, ' ').trim().toUpperCase();
        if (!textoNormalizado) return null;

        const padroesContextuais = [
            // Em alguns PDFs o campo FOLHA é extraído sem a barra, no miolo do carimbo:
            // "ARQUITETURA 05 05 PROJETO ..." deve ser interpretado como "05/05".
            /\b(?:ARQUITETURA|ESTRUTURAL|HIDROSSANIT[ÁA]RIO|EL[ÉE]TRICO|SPDA|INC[ÊE]NDIO|CLIMATIZA[ÇC][ÃA]O|DRENAGEM|TOPOGRAFIA|FUNDA[ÇC][ÃA]O|PAISAGISMO)\s+(\d{1,3})\s+(\d{1,3})\s+PROJETO\b/,
            /\bFOLHA\s*:?\s*(\d{1,3})\s+(\d{1,3})\b/
        ];

        for (const padrao of padroesContextuais) {
            const match = textoNormalizado.match(padrao);
            if (match) {
                return `${match[1]}/${match[2]}`;
            }
        }

        return null;
    }

    validarFolhaContraEsperada(folhaLida, numeroPranchaEsperado) {
        const folha = this.normalizarNumeroFolha(folhaLida);
        const esperada = this.normalizarNumeroFolha(numeroPranchaEsperado);

        if (!folha || !esperada) return null;

        const matchFolha = folha.match(/^(\d{1,3})\/(\d{1,3})$/);
        const matchEsperada = esperada.match(/^(\d{1,3})\/(\d{1,3})$/);

        if (!matchFolha || !matchEsperada) return null;

        const atualLida = Number.parseInt(matchFolha[1], 10);
        const totalLido = Number.parseInt(matchFolha[2], 10);
        const totalEsperado = Number.parseInt(matchEsperada[2], 10);

        if (Number.isNaN(atualLida) || Number.isNaN(totalLido) || Number.isNaN(totalEsperado)) {
            return null;
        }

        // Rejeita valores incompatíveis com uma paginação de prancha
        if (atualLida > totalLido) return null;
        if (totalLido > totalEsperado * 3) return null;

        return folha;
    }

    corrigirFolhaParcial(folhaLida, numeroPranchaEsperado) {
        const folhaNorm = this.normalizarNumeroFolha(folhaLida);
        const esperadaNorm = this.normalizarNumeroFolha(numeroPranchaEsperado);

        if (!folhaLida || !numeroPranchaEsperado || !esperadaNorm) {
            return folhaNorm || folhaLida || null;
        }

        if (folhaNorm === esperadaNorm) return folhaNorm;

        const matchLida = `${folhaLida}`.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
        const matchEsperada = `${numeroPranchaEsperado}`.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);

        if (!matchLida || !matchEsperada) return folhaNorm || folhaLida;

        const atualLida = Number.parseInt(matchLida[1], 10);
        const totalLidoRaw = matchLida[2];
        const atualEsperada = Number.parseInt(matchEsperada[1], 10);
        const totalEsperadoRaw = matchEsperada[2];
        const totalEsperado = Number.parseInt(totalEsperadoRaw, 10);

        if (
            atualLida === atualEsperada &&
            totalEsperadoRaw.startsWith(totalLidoRaw) &&
            !Number.isNaN(totalEsperado)
        ) {
            return `${atualEsperada}/${totalEsperado}`;
        }

        return folhaNorm || folhaLida;
    }

    logLeituraPrancha(fileName, pageNum, dadosLeitura) {
        const titulo = `🔎 [Leitura da prancha] ${fileName} - página ${pageNum}`;
        console.groupCollapsed(titulo);
        console.log('Texto completo extraído da página:', dadosLeitura.textoExtraido || '(vazio)');
        console.log('Formato detectado:', dadosLeitura.formatoPrancha || 'Não identificado');
        console.log('Folha por caixa/anchor:', dadosLeitura.folhaFallback || 'Não encontrada');
        console.log('Folha por texto completo:', dadosLeitura.folhaTextoCompleto || 'Não encontrada');
        console.log('Folha por OCR:', dadosLeitura.folhaOCR || 'Não encontrada');
        console.log('Folha após correção:', dadosLeitura.folhaCorrigida || 'Não encontrada');
        console.log('Folha após validação:', dadosLeitura.folhaValidada || 'Não encontrada');
        console.groupEnd();
    }

    extrairFolhaDoCarimboA0(textContent, viewport) {
        const boxes = this.getBoxesFolha();
        const itens = this.extrairItensPorCaixa(textContent, viewport, boxes.A0);

        if (!itens.length) return null;

        const candidatosFolha = itens.filter(item => {
            const str = (item.str || '').toUpperCase().trim();
            return str.includes('FOLHA');
        });

        if (!candidatosFolha.length) return null;

        const folhaLabel = candidatosFolha.sort((a, b) => {
            const dy = b.transform[5] - a.transform[5];
            if (Math.abs(dy) > 2) return dy;
            return a.transform[4] - b.transform[4];
        })[0];

        const labelX = folhaLabel.transform[4];
        const labelY = folhaLabel.transform[5];

        const abaixo = itens.filter(item => {
            const str = (item.str || '').trim();
            const x = item.transform[4];
            const y = item.transform[5];

            return (
                str &&
                x >= labelX - 20 &&
                x <= labelX + 180 &&
                y <= labelY - 2 &&
                y >= labelY - 130
            );
        });

        abaixo.sort((a, b) => {
            const dy = b.transform[5] - a.transform[5];
            if (Math.abs(dy) > 2) return dy;
            return a.transform[4] - b.transform[4];
        });

        const texto = abaixo.map(i => i.str).join(' ');
        const match = texto.match(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/);

        return match ? match[1].replace(/\s+/g, '') : null;
    }

    extrairFolhaComFallback(textContent, viewport, textoExtraido) {
        const formato = this.detectarFormatoPrancha(textoExtraido, viewport);
        const boxPrincipal = this.getBoxFolhaProporcional(formato);

        let folha = this.extrairFolhaPorCaixa(textContent, viewport, boxPrincipal);
        if (folha) return folha;

        folha = this.extrairFolhaPorAnchor(textContent, viewport);
        if (folha) return folha;
        return null;
    }
    // Fallback: tenta localizar o rótulo "FOLHA" e lê os itens logo abaixo dele
    extrairFolhaPorAnchor(textContent, viewport) {
        const items = textContent?.items || [];
        if (!items.length || !viewport) return null;

        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        const candidatos = items.filter(item => {
            if (!item?.transform || item.transform.length < 6) return false;
            const str = (item.str || '').toUpperCase().trim();
            const x = item.transform[4];
            const y = item.transform[5];

            return str.includes('FOLHA') && x >= pageWidth * 0.5 && y <= pageHeight * 0.5;
        });

        if (!candidatos.length) return null;

        const folhaLabel = candidatos.sort((a, b) => b.transform[5] - a.transform[5])[0];
        const labelX = folhaLabel.transform[4];
        const labelY = folhaLabel.transform[5];

        const abaixo = items.filter(item => {
            if (!item?.transform || item.transform.length < 6) return false;
            const x = item.transform[4];
            const y = item.transform[5];
            const str = (item.str || '').trim();

            return (
                str &&
                x >= labelX - 30 &&
                x <= labelX + 170 &&
                y <= labelY - 2 &&
                y >= labelY - 90
            );
        });

        abaixo.sort((a, b) => {
            const dy = b.transform[5] - a.transform[5];
            if (Math.abs(dy) > 2) return dy;
            return a.transform[4] - b.transform[4];
        });

        const texto = abaixo.map(item => item.str).join(' ');
        const match = texto.match(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/);
        return match ? match[1].replace(/\s+/g, '') : null;
    }


    getCropBoxImagem(formato, width, height) {
        if (!width || !height) return null;

        if (formato === 'A0') {
            return {
                x: Math.round(width * 0.875),
                y: Math.round(height * 0.905),
                width: Math.round(width * 0.110),
                height: Math.round(height * 0.085)
            };
        }

        return {
            x: Math.round(width * 0.885),
            y: Math.round(height * 0.865),
            width: Math.round(width * 0.120),
            height: Math.round(height * 0.120)
        };
    }

    async extrairFolhaPorImagem(page, formato) {
        try {
            if (!page || typeof Tesseract === 'undefined') {
                return null;
            }

            const scale = 2.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (!ctx) return null;

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            await page.render({
                canvasContext: ctx,
                viewport
            }).promise;

            const cropBox = this.getCropBoxImagem(formato, canvas.width, canvas.height);
            if (!cropBox) return null;

            const cropCanvas = document.createElement('canvas');
            const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
            if (!cropCtx) return null;

            cropCanvas.width = cropBox.width;
            cropCanvas.height = cropBox.height;

            cropCtx.drawImage(
                canvas,
                cropBox.x,
                cropBox.y,
                cropBox.width,
                cropBox.height,
                0,
                0,
                cropBox.width,
                cropBox.height
            );

            const { data: { text } } = await Tesseract.recognize(cropCanvas, 'eng', {
                logger: () => {}
            });

            const match = (text || '').match(/\b(\d{1,3}\s*\/\s*\d{1,3})\b/);
            return match ? match[1].replace(/\s+/g, '') : null;
        } catch (error) {
            console.warn('OCR da célula FOLHA falhou:', error);
            return null;
        }
    }

    contarOcorrencias(texto, termo) {
        if (!texto || !termo) return 0;
        const regex = new RegExp(`\\b${this.escaparRegex(termo)}\\b`, 'g');
        return (texto.match(regex) || []).length;
    }

    analisarCompatibilidadeDisciplina(codigoProjeto, textosPaginas) {
        const regra = window.REGRAS_COMPATIBILIDADE_DISCIPLINA?.[codigoProjeto];
        if (!regra) return null;

        const textoCombinado = this.normalizarTextoComparacao((textosPaginas || []).join(' '));
        if (!textoCombinado) return null;

        const obrigatoriosEncontrados = regra.obrigatorios.filter(termo =>
            textoCombinado.includes(termo)
        );
        const suspeitosEncontrados = regra.suspeitos.filter(termo =>
            textoCombinado.includes(termo)
        );

        const totalOcorrenciasSuspeitos = suspeitosEncontrados.reduce((total, termo) => (
            total + this.contarOcorrencias(textoCombinado, termo)
        ), 0);

        const padraoContextoCritico = /(LEGENDA|SIMBOLO|QUADRO|CIRCUITO|NOTAS?)/;
        const contextoCriticoComSuspeito = suspeitosEncontrados.some(termo => {
            const regex = new RegExp(`(LEGENDA|SIMBOLO|QUADRO|CIRCUITO|NOTAS?).{0,80}${this.escaparRegex(termo)}`);
            return regex.test(textoCombinado) || (padraoContextoCritico.test(textoCombinado) && totalOcorrenciasSuspeitos >= 2);
        });

        let severidade = 'ok';
        let score = 0;
        const alertas = [];

        if (obrigatoriosEncontrados.length === 0) {
            score += 20;
            alertas.push(`Termos esperados da disciplina ${codigoProjeto} não foram encontrados.`);
        }

        if (suspeitosEncontrados.length > 0) {
            severidade = 'aviso';
            score += Math.min(totalOcorrenciasSuspeitos * 12, 45);
            alertas.push(
                `Encontrados termos potencialmente incompatíveis com ${codigoProjeto}: ${suspeitosEncontrados.join(', ')}.`
            );
        }

        if (totalOcorrenciasSuspeitos >= 3 || contextoCriticoComSuspeito) {
            severidade = 'erro';
            score += contextoCriticoComSuspeito ? 45 : 30;
            alertas.push('Os termos suspeitos aparecem com frequência ou em contexto técnico (legenda/quadro/notas).');
        }

        return {
            severidade,
            score: Math.min(score, 100),
            obrigatorios_encontrados: obrigatoriosEncontrados,
            termos_suspeitos: suspeitosEncontrados,
            total_ocorrencias_suspeitos: totalOcorrenciasSuspeitos,
            alertas
        };
    }

    // CORREÇÃO: Usar window.MAPEAMENTO_PROJETOS
    async processarPDF(file, palavrasChave, opcoes, areaProjeto = '') {
        try {
            const {
                checkFilename = true,
                checkSheetNumber = true,
                checkProjeto = true,
                checkComodos = false,
                checkLogos = true
            } = opcoes;

            // Extrair informações do nome do arquivo
            const nomeArquivo = file.name.replace(/\.pdf$/i, '');
            const assinadoPeloNome = this.verificarAssinaturaNome(file.name);
            const nomeSemAssinado = nomeArquivo.replace(/_assinado/i, '');
            const numeroPrancha = this.extrairNumeroPrancha(file.name);
            const regexNumeroPrancha = this.criarRegexNumeroFolhaExato(numeroPrancha);
            const codigoProjeto = this.extrairCodigoProjeto(file.name);
            
            // CORREÇÃO: Usar window.MAPEAMENTO_PROJETOS
            const descricaoProjeto = window.MAPEAMENTO_PROJETOS && window.MAPEAMENTO_PROJETOS[codigoProjeto] 
                ? window.MAPEAMENTO_PROJETOS[codigoProjeto] 
                : 'Desconhecido';
            const termoBuscaProjeto = window.MAPEAMENTO_BUSCA_PROJETOS && window.MAPEAMENTO_BUSCA_PROJETOS[codigoProjeto]
                ? window.MAPEAMENTO_BUSCA_PROJETOS[codigoProjeto]
                : descricaoProjeto;

            // Inicializar resultados
            const dadosCarimbo = [];
            let nomeArquivoEncontrado = false;
            let pranchaEncontrada = false;
            let folhaCarimbo = null;
            let projetoEncontrado = false;
            let tamanhoPrancha = null;
            const textosPaginas = [];
            const deteccoesComodos = [];
            const deteccoesLuminarias = [];
            const diagnosticoComodos = {
                status: checkComodos ? 'nao_executado' : 'desabilitado',
                mensagem: checkComodos ? 'Análise de cômodos não executada.' : 'Opção de análise de cômodos desativada pelo usuário.',
                paginas_analisadas: 0,
                paginas_com_erro: 0
            };

            const logoDetector = window.LogoDetector ? new LogoDetector(window.LOGOS_REFERENCIA_CONFIG || {}) : null;
            let logosDetectadas = logoDetector
                ? logoDetector.criarResultadoVazio(checkLogos ? 'nenhuma_detectada' : 'desabilitado', checkLogos ? 'Análise de logos inicializada.' : 'Análise de logos desativada pelo usuário.')
                : { status: 'erro', mensagem: 'Módulo de detecção de logos não carregado.', total_referencias: 0, total_candidatos: 0, total_detectadas: 0, itens: [] };

            // Carregar PDF usando pdf.js
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await this.pdfjsLib.getDocument(arrayBuffer).promise;

            if (checkLogos && logoDetector) {
                try {
                    logosDetectadas = await logoDetector.detectarNoPDF(pdf, mensagem => {
                        console.log(`🔎 ${mensagem}`);
                    });
                } catch (error) {
                    console.warn(`⚠️ Falha na detecção de logos em ${file.name}:`, error);
                    logosDetectadas = logoDetector.criarResultadoVazio('erro', `Erro ao detectar logos: ${error.message}`);
                }
            }
            
            // Processar cada página
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1 });
                const textoExtraido = textContent.items.map(item => item.str).join(' ').replace(/\n/g, ' ');
                textosPaginas.push(textoExtraido);

                const deveAnalisarComodos = checkComodos &&
                    window.ROBOFLOW_CONFIG?.enabled &&
                    (window.ROBOFLOW_CONFIG?.analyzeAllPages || pageNum === 1);
                const deveAnalisarLuminarias = checkComodos &&
                    window.ROBOFLOW_LUMINARIAS_CONFIG?.enabled &&
                    (window.ROBOFLOW_LUMINARIAS_CONFIG?.analyzeAllPages || pageNum === 1);

                if (deveAnalisarComodos || deveAnalisarLuminarias) {
                    const resultadoPagina = await this.detectarElementosNaPagina(page, pageNum);

                    const comodosPagina = resultadoPagina?.comodos || [];
                    const luminariasPagina = resultadoPagina?.luminarias || [];

                    deteccoesComodos.push(...comodosPagina);
                    deteccoesLuminarias.push(...luminariasPagina);
                    diagnosticoComodos.paginas_analisadas += 1;

                    if (resultadoPagina?.status === 'erro_backend') {
                        diagnosticoComodos.paginas_com_erro += 1;
                        diagnosticoComodos.status = 'erro_carregamento_modelo';
                        diagnosticoComodos.mensagem = resultadoPagina?.mensagem || 'Falha ao executar IA de cômodos/luminárias no backend.';
                    } else if (diagnosticoComodos.status !== 'erro_carregamento_modelo') {
                        diagnosticoComodos.status = 'sucesso';
                        diagnosticoComodos.mensagem = 'Inferência de cômodos/luminárias executada com sucesso.';
                    }
                }

                if (!tamanhoPrancha) {
                    tamanhoPrancha = this.extrairFormatoPrancha(textoExtraido);
                }
                // Verificar se o nome do arquivo está no texto da página
                if (checkFilename && nomeSemAssinado && textoExtraido.includes(nomeSemAssinado)) {
                    nomeArquivoEncontrado = true;
                }
                
                if (checkSheetNumber && numeroPrancha) {
                    if (regexNumeroPrancha && regexNumeroPrancha.test(textoExtraido)) {
                        folhaCarimbo = numeroPrancha;
                        pranchaEncontrada = true;
                    } else {
                        const formatoPrancha = this.detectarFormatoPrancha(textoExtraido, viewport);
                        let folhaFallback = this.extrairFolhaComFallback(
                            textContent,
                            viewport,
                            textoExtraido
                        );
                        let folhaTextoCompleto = null;
                        let folhaOCR = null;
                        let folhaExtraidaPagina = folhaFallback;

                        if (!folhaExtraidaPagina) {
                            folhaTextoCompleto = this.extrairFolhaPorTextoCompleto(textoExtraido);
                            folhaExtraidaPagina = folhaTextoCompleto;
                        }

                        if (!folhaExtraidaPagina && formatoPrancha === 'A0') {
                            folhaOCR = await this.extrairFolhaPorImagem(page, 'A0');
                            folhaExtraidaPagina = folhaOCR;
                        }

                        const folhaCorrigida = this.corrigirFolhaParcial(
                            folhaExtraidaPagina,
                            numeroPrancha
                        );
                        folhaExtraidaPagina = folhaCorrigida;

                        const folhaValidada = this.validarFolhaContraEsperada(
                            folhaExtraidaPagina,
                            numeroPrancha
                        );
                        folhaExtraidaPagina = folhaValidada;

                        this.logLeituraPrancha(file.name, pageNum, {
                            textoExtraido,
                            formatoPrancha,
                            folhaFallback,
                            folhaTextoCompleto,
                            folhaOCR,
                            folhaCorrigida,
                            folhaValidada
                        });

                        if (folhaExtraidaPagina) {
                            folhaCarimbo = folhaExtraidaPagina;
                            const folhaNormalizada = this.normalizarNumeroFolha(folhaExtraidaPagina);
                            const numeroPranchaNormalizado = this.normalizarNumeroFolha(numeroPrancha);
                            pranchaEncontrada = (
                                !!folhaNormalizada &&
                                !!numeroPranchaNormalizado &&
                                folhaNormalizada === numeroPranchaNormalizado
                            );
                        } else {
                            folhaCarimbo = null;
                            pranchaEncontrada = false;
                        }
                    }
                }
                
                // Verificar se a descrição do projeto está no texto
                if (checkProjeto && codigoProjeto && termoBuscaProjeto !== 'Desconhecido') {
                    if (textoExtraido.includes(termoBuscaProjeto)) {
                        projetoEncontrado = true;
                    }
                }
                
                // CORREÇÃO: Usar window.PALAVRAS_CHAVE_ENGENHEIROS
                if (window.PALAVRAS_CHAVE_ENGENHEIROS) {
                    for (const palavra of window.PALAVRAS_CHAVE_ENGENHEIROS) {
                        if (textoExtraido.includes(palavra) && !dadosCarimbo.includes(palavra)) {
                            dadosCarimbo.push(palavra);
                        }
                    }
                }
                
                // Verificar palavras-chave adicionais do projeto
                for (const palavra of palavrasChave) {
                    if (textoExtraido.includes(palavra) && !dadosCarimbo.includes(palavra)) {
                        dadosCarimbo.push(palavra);
                    }
                }
            }

            const analiseConsistencia = this.analisarCompatibilidadeDisciplina(codigoProjeto, textosPaginas);
            const resumoComodos = this.gerarResumoComodos(deteccoesComodos);
            const resumoLuminarias = this.gerarResumoLuminarias(deteccoesLuminarias);
            if (checkComodos && diagnosticoComodos.paginas_analisadas === 0) {
                if (!window.ROBOFLOW_CONFIG?.enabled) {
                    diagnosticoComodos.status = 'desabilitado_config';
                    diagnosticoComodos.mensagem = 'ROBOFLOW_CONFIG.enabled e ROBOFLOW_LUMINARIAS_CONFIG.enabled estão desativados.';
                } else {
                    diagnosticoComodos.status = 'nao_executado';
                    diagnosticoComodos.mensagem = 'Nenhuma página elegível para análise de cômodos/luminárias.';
                }
            }

            // Retornar estrutura idêntica ao Python
            return {
                dados_carimbo: dadosCarimbo,
                nome_arquivo_encontrado: nomeArquivoEncontrado,
                prancha_encontrada: pranchaEncontrada,
                folha_carimbo: folhaCarimbo,
                assinado_pelo_nome: assinadoPeloNome,
                projeto_encontrado: projetoEncontrado,
                codigo_projeto: codigoProjeto,
                descricao_projeto: descricaoProjeto,
                numero_prancha: numeroPrancha,
                tamanho_prancha: tamanhoPrancha,
                area_projeto: areaProjeto,
                nome_arquivo: nomeArquivo,
                analise_consistencia: analiseConsistencia,
                comodos_ia: {
                    status: diagnosticoComodos.status,
                    mensagem: diagnosticoComodos.mensagem,
                    paginas_analisadas: diagnosticoComodos.paginas_analisadas,
                    paginas_com_erro: diagnosticoComodos.paginas_com_erro,
                    total_deteccoes: deteccoesComodos.length,
                    deteccoes: deteccoesComodos,
                    resumo_por_classe: resumoComodos
                },
                logos_detectadas: logosDetectadas,
                luminarias_ia: {
                    status: diagnosticoComodos.status,
                    mensagem: diagnosticoComodos.mensagem,
                    paginas_analisadas: diagnosticoComodos.paginas_analisadas,
                    paginas_com_erro: diagnosticoComodos.paginas_com_erro,
                    total_deteccoes: deteccoesLuminarias.length,
                    deteccoes: deteccoesLuminarias,
                    resumo_por_classe: resumoLuminarias
                }
            };

        } catch (error) {
            console.error(`Erro ao processar PDF ${file.name}:`, error);
            throw new Error(`Erro ao processar PDF ${file.name}: ${error.message}`);
        }
    }

    async processarMultiplosPDFs(files, palavrasChaveAdicionais, opcoes, onProgress, areaProjeto = '') {
        const resultados = {};
        
        // Verificar se há arquivos
        if (!files || files.length === 0) {
            throw new Error('Nenhum arquivo PDF selecionado');
        }

        // CORREÇÃO: Usar window.PALAVRAS_CHAVE_ENGENHEIROS
        const todasPalavrasChave = [
            ...(window.PALAVRAS_CHAVE_ENGENHEIROS || []), 
            ...palavrasChaveAdicionais
        ];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Chamar callback de progresso
            if (onProgress) {
                onProgress(i, files.length, file.name);
            }

            try {
                resultados[file.name] = await this.processarPDF(file, todasPalavrasChave, opcoes, areaProjeto);
                console.log(`✅ PDF processado: ${file.name}`);
            } catch (error) {
                console.error(`❌ Erro no PDF ${file.name}:`, error);
                
                // Estrutura de erro consistente
                resultados[file.name] = {
                    error: error.message,
                    dados_carimbo: [],
                    nome_arquivo_encontrado: false,
                    prancha_encontrada: false,
                    folha_carimbo: null,
                    assinado_pelo_nome: false,
                    projeto_encontrado: false,
                    codigo_projeto: null,
                    descricao_projeto: 'Erro no processamento',
                    numero_prancha: null,
                    tamanho_prancha: null,
                    area_projeto: areaProjeto,
                    nome_arquivo: file.name.replace(/\.pdf$/i, ''),
                    analise_consistencia: null,
                    logos_detectadas: {
                        status: 'erro',
                        mensagem: 'PDF não processado; análise de logos não executada.',
                        total_referencias: 0,
                        total_candidatos: 0,
                        total_detectadas: 0,
                        itens: []
                    },
                    comodos_ia: {
                        status: 'erro_processamento_pdf',
                        mensagem: error.message,
                        paginas_analisadas: 0,
                        paginas_com_erro: 0,
                        total_deteccoes: 0,
                        deteccoes: [],
                        resumo_por_classe: []
                    },
                    luminarias_ia: {
                        status: 'erro_processamento_pdf',
                        mensagem: error.message,
                        paginas_analisadas: 0,
                        paginas_com_erro: 0,
                        total_deteccoes: 0,
                        deteccoes: [],
                        resumo_por_classe: []
                    }
                };
            }

            // Pequeno delay para não sobrecarregar o navegador
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return resultados;
    }
}
