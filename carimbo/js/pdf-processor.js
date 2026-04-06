// Processador de PDFs - Baseado nas funções Python
class PDFProcessor {
    constructor() {
        this.pdfjsLib = window['pdfjsLib'];
        // Configurar o worker se não estiver configurado
        if (this.pdfjsLib && !this.pdfjsLib.GlobalWorkerOptions.workerSrc) {
            this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    normalizarTexto(texto) {
        return (texto || '')
            .replace(/\s+/g, ' ')
            .replace(/[_\-\/]+/g, '/')
            .trim()
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
        if (!matches.length) return null;

        return matches[0][1].replace(/\s+/g, '');
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

            return str.includes('FOLHA') && x >= pageWidth * 0.5 && y <= pageHeight * 0.6;
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

    // CORREÇÃO: Usar window.MAPEAMENTO_PROJETOS
    async processarPDF(file, palavrasChave, opcoes) {
        try {
            const {
                checkFilename = true,
                checkSheetNumber = true,
                checkProjeto = true
            } = opcoes;

            // Extrair informações do nome do arquivo
            const nomeArquivo = file.name.replace(/\.pdf$/i, '');
            const assinadoPeloNome = this.verificarAssinaturaNome(file.name);
            const nomeSemAssinado = nomeArquivo.replace(/_assinado/i, '');
            const numeroPrancha = this.extrairNumeroPrancha(file.name);
            const codigoProjeto = this.extrairCodigoProjeto(file.name);
            
            // CORREÇÃO: Usar window.MAPEAMENTO_PROJETOS
            const descricaoProjeto = window.MAPEAMENTO_PROJETOS && window.MAPEAMENTO_PROJETOS[codigoProjeto] 
                ? window.MAPEAMENTO_PROJETOS[codigoProjeto] 
                : 'Desconhecido';

            // Inicializar resultados
            const dadosCarimbo = [];
            let nomeArquivoEncontrado = false;
            let pranchaEncontrada = false;
            let folhaCarimbo = null;
            let projetoEncontrado = false;
            let tamanhoPrancha = null;

            // Carregar PDF usando pdf.js
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await this.pdfjsLib.getDocument(arrayBuffer).promise;
            
            // Processar cada página
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1 });
                const textoExtraido = textContent.items.map(item => item.str).join(' ').replace(/\n/g, ' ');

                if (!tamanhoPrancha) {
                    tamanhoPrancha = this.extrairFormatoPrancha(textoExtraido);
                }
                // Verificar se o nome do arquivo está no texto da página
                if (checkFilename && nomeSemAssinado && textoExtraido.includes(nomeSemAssinado)) {
                    nomeArquivoEncontrado = true;
                }
                
                // Verificar se o número da prancha especificamente no campo FOLHA do carimbo
                if (checkSheetNumber && numeroPrancha) {
                    const formatoPrancha = this.detectarFormatoPrancha(textoExtraido, viewport);
                    let folhaExtraidaPagina = this.extrairFolhaComFallback(
                        textContent,
                        viewport,
                        textoExtraido
                    );

                    if (!folhaExtraidaPagina) {
                        folhaExtraidaPagina = this.extrairFolhaPorTextoCompleto(textoExtraido);
                    }

                    if (!folhaExtraidaPagina && formatoPrancha === 'A0') {
                        folhaExtraidaPagina = await this.extrairFolhaPorImagem(page, 'A0');
                    }

                    folhaExtraidaPagina = this.corrigirFolhaParcial(
                        folhaExtraidaPagina,
                        numeroPrancha
                    );

                    folhaExtraidaPagina = this.validarFolhaContraEsperada(
                        folhaExtraidaPagina,
                        numeroPrancha
                    );

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
                
                // Verificar se a descrição do projeto está no texto
                if (checkProjeto && codigoProjeto && descricaoProjeto !== 'Desconhecido') {
                    if (textoExtraido.includes(descricaoProjeto)) {
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
                nome_arquivo: nomeArquivo
            };

        } catch (error) {
            console.error(`Erro ao processar PDF ${file.name}:`, error);
            throw new Error(`Erro ao processar PDF ${file.name}: ${error.message}`);
        }
    }

    async processarMultiplosPDFs(files, palavrasChaveAdicionais, opcoes, onProgress) {
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
                resultados[file.name] = await this.processarPDF(file, todasPalavrasChave, opcoes);
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
                    nome_arquivo: file.name.replace(/\.pdf$/i, '')
                };
            }

            // Pequeno delay para não sobrecarregar o navegador
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return resultados;
    }
}
