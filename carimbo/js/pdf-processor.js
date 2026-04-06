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

    // Extrai o valor do campo "FOLHA" por posição visual na célula inferior direita do carimbo
    extrairFolhaPorRegiao(textContent, viewport) {
        if (!textContent?.items?.length || !viewport) return null;

        const pageWidth = viewport.width;
        const pageHeight = viewport.height;

        // Recorte focado apenas na célula FOLHA para evitar capturar outros números do carimbo
        const xMin = pageWidth * 0.905;
        const xMax = pageWidth * 0.992;
        const yMin = pageHeight * 0.015;
        const yMax = pageHeight * 0.105;

        const itensNaRegiao = textContent.items.filter(item => {
            if (!item?.transform || item.transform.length < 6) return false;

            const x = item.transform[4];
            const y = item.transform[5];
            const str = (item.str || '').trim();

            return str && x >= xMin && x <= xMax && y >= yMin && y <= yMax;
        });

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

            return str.includes('FOLHA') && x >= pageWidth * 0.68 && y <= pageHeight * 0.38;
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

            // Carregar PDF usando pdf.js
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await this.pdfjsLib.getDocument(arrayBuffer).promise;
            
            // Processar cada página
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1 });
                const textoExtraido = textContent.items.map(item => item.str).join(' ').replace(/\n/g, ' ');
                // Verificar se o nome do arquivo está no texto da página
                if (checkFilename && nomeSemAssinado && textoExtraido.includes(nomeSemAssinado)) {
                    nomeArquivoEncontrado = true;
                }
                
                // Verificar se o número da prancha especificamente no campo FOLHA do carimbo
                if (checkSheetNumber && numeroPrancha) {
                    const folhaExtraidaPagina = this.extrairFolhaPorRegiao(textContent, viewport);

                    if (folhaExtraidaPagina) {
                        folhaCarimbo = folhaExtraidaPagina;
                        pranchaEncontrada = (
                            folhaExtraidaPagina.replace(/\s+/g, '') === numeroPrancha.replace(/\s+/g, '')
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
                    nome_arquivo: file.name.replace(/\.pdf$/i, '')
                };
            }

            // Pequeno delay para não sobrecarregar o navegador
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return resultados;
    }
}
