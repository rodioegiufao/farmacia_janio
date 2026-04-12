// Gerador de Excel - Baseado na funcionalidade do openpyxl
class ExcelGenerator {
    constructor() {
        this.XLSX = window.XLSX;
    }

    // Criar planilha Excel - Baseado na criação com openpyxl
    gerarExcel(resultados) {
        // Preparar dados para a tabela - Similar ao DataFrame do Python
        const dadosTabela = this.prepararDadosTabela(resultados);
        const dadosComodos = this.prepararDadosTabelaComodos(resultados);
        const dadosLuminarias = this.prepararDadosTabelaLuminarias(resultados);

        // Criar workbook - Similar ao Workbook do openpyxl
        const wb = this.XLSX.utils.book_new();
        
        // Converter dados para worksheet - Similar à criação da worksheet
        const ws = this.XLSX.utils.json_to_sheet(dadosTabela);
        
        // Adicionar worksheet ao workbook
        this.XLSX.utils.book_append_sheet(wb, ws, "Resultados PDF");
        
        // Aplicar formatação condicional - Similar ao PatternFill do openpyxl
        this.aplicarFormatacaoCondicional(ws, dadosTabela);
        
        // Ajustar largura das colunas - Similar ao adjustment do Python
        this.ajustarLarguraColunas(ws);

        const wsComodos = this.XLSX.utils.json_to_sheet(dadosComodos);
        this.XLSX.utils.book_append_sheet(wb, wsComodos, "Cômodos IA");
        this.ajustarLarguraColunas(wsComodos);

        const wsLuminarias = this.XLSX.utils.json_to_sheet(dadosLuminarias);
        this.XLSX.utils.book_append_sheet(wb, wsLuminarias, "Luminárias IA");
        this.ajustarLarguraColunas(wsLuminarias);

        return wb;
    }

    // Preparar dados para a tabela - Baseado na criação do DataFrame
    prepararDadosTabela(resultados) {
        const dadosTabela = [];

        for (const [nomeArquivo, dados] of Object.entries(resultados)) {
            const analise = dados.analise_consistencia;
            const severidade = analise?.severidade || 'n/a';
            const score = analise?.score ?? 'N/A';
            const alertas = analise?.alertas?.length ? analise.alertas.join(' | ') : 'Sem alertas';
            dadosTabela.push({
                "Código Projeto": dados.codigo_projeto || "Não identificado",
                "Descrição Projeto": dados.descricao_projeto,
                "Palavras-chave encontradas": dados.dados_carimbo.length > 0 ? 
                    dados.dados_carimbo.join(', ') : "Nenhuma",
                "Nome do Arquivo": nomeArquivo,
                "Número da Prancha": dados.numero_prancha || "Não identificado",
                "Tamanho da Prancha": dados.tamanho_prancha || "Não identificado",
                "Nome encontrado": dados.nome_arquivo_encontrado ? "Sim" : "Não",
                "Prancha encontrada": dados.prancha_encontrada ? "Sim" : "Não",
                "Arquivo assinado": dados.assinado_pelo_nome ? "Sim" : "Não",
                "Projeto encontrado": dados.projeto_encontrado ? "Sim" : "Não",
                "Qtd. Cômodos IA": dados.comodos_ia?.total_deteccoes ?? 0,
                "Consistência": `${severidade.toUpperCase()} (${score})`,
                "Alertas de consistência": alertas
            });
        }

        return dadosTabela;
    }

    prepararDadosTabelaComodos(resultados) {
        const linhas = [];

        for (const [nomeArquivo, dados] of Object.entries(resultados)) {
            const numeroPrancha = dados.numero_prancha || 'Não identificado';
            const codigoProjeto = dados.codigo_projeto || 'Não identificado';
            const descricaoProjeto = dados.descricao_projeto || 'Não identificado';
            const deteccoes = dados.comodos_ia?.deteccoes || [];

            if (deteccoes.length === 0) {
                linhas.push({
                    'Nome do Arquivo': nomeArquivo,
                    'Número da Prancha': numeroPrancha,
                    'Código Projeto': codigoProjeto,
                    'Descrição Projeto': descricaoProjeto,
                    'Página PDF': '',
                    Cômodo: 'Nenhum detectado',
                    'Confiança Cômodo (%)': '',
                    'ID Planta': '',
                    'Classe Planta': '',
                    'Confiança Planta (%)': ''
                });
                continue;
            }

            for (const item of deteccoes) {
                linhas.push({
                    'Nome do Arquivo': nomeArquivo,
                    'Número da Prancha': numeroPrancha,
                    'Código Projeto': codigoProjeto,
                    'Descrição Projeto': descricaoProjeto,
                    'Página PDF': item.pagina_pdf ?? '',
                    Cômodo: item.comodo,
                    'Confiança Cômodo (%)': item.confianca ? (item.confianca * 100).toFixed(2) : '0.00',
                    'ID Planta': item.planta_id ?? '',
                    'Classe Planta': item.planta_classe ?? '',
                    'Confiança Planta (%)': item.planta_confianca ? (item.planta_confianca * 100).toFixed(2) : ''
                });
            }
        }

        return linhas;
    }

    prepararDadosTabelaLuminarias(resultados) {
        const linhas = [];

        for (const [nomeArquivo, dados] of Object.entries(resultados)) {
            const numeroPrancha = dados.numero_prancha || 'Não identificado';
            const codigoProjeto = dados.codigo_projeto || 'Não identificado';
            const descricaoProjeto = dados.descricao_projeto || 'Não identificado';
            const deteccoes = dados.luminarias_ia?.deteccoes || [];

            if (deteccoes.length === 0) {
                linhas.push({
                    'Nome do Arquivo': nomeArquivo,
                    'Número da Prancha': numeroPrancha,
                    'Código Projeto': codigoProjeto,
                    'Descrição Projeto': descricaoProjeto,
                    'Página PDF': '',
                    Luminária: 'Nenhuma detectada',
                    'Confiança Luminária (%)': '',
                    'ID Planta': '',
                    'Classe Planta': '',
                    'Confiança Planta (%)': ''
                });
                continue;
            }

            for (const item of deteccoes) {
                linhas.push({
                    'Nome do Arquivo': nomeArquivo,
                    'Número da Prancha': numeroPrancha,
                    'Código Projeto': codigoProjeto,
                    'Descrição Projeto': descricaoProjeto,
                    'Página PDF': item.pagina_pdf ?? '',
                    Luminária: item.luminaria,
                    'Confiança Luminária (%)': item.confianca ? (item.confianca * 100).toFixed(2) : '0.00',
                    'ID Planta': item.planta_id ?? '',
                    'Classe Planta': item.planta_classe ?? '',
                    'Confiança Planta (%)': item.planta_confianca ? (item.planta_confianca * 100).toFixed(2) : ''
                });
            }
        }

        return linhas;
    }

    // Aplicar formatação condicional - Baseado no PatternFill do Python
    aplicarFormatacaoCondicional(ws, dadosTabela) {
        // Colunas para formatar (baseado nas colunas do Python)
        const colunasParaFormatar = ['Nome encontrado', 'Prancha encontrada', 'Arquivo assinado', 'Projeto encontrado'];
        
        // Encontrar índices das colunas
        const range = this.XLSX.utils.decode_range(ws['!ref']);
        
        // Criar estilos - Similar aos PatternFill do Python
        const estiloVerde = { 
            fill: {
                patternType: "solid",
                fgColor: { rgb: "FF00B050" }
            },
            font: {
                color: { rgb: "FFFFFFFF" },
                bold: true
            },
            alignment: {
                horizontal: "center"
            }
        };
        
        const estiloVermelho = { 
            fill: {
                patternType: "solid",
                fgColor: { rgb: "FFFF0000" }
            },
            font: {
                color: { rgb: "FFFFFFFF" },
                bold: true
            },
            alignment: {
                horizontal: "center"
            }
        };

        // Aplicar formatação para cada coluna
        colunasParaFormatar.forEach(nomeColuna => {
            const colIndex = this.encontrarIndiceColuna(ws, nomeColuna);
            if (colIndex !== -1) {
                for (let row = range.s.r + 1; row <= range.e.r; row++) {
                    const cellAddress = this.XLSX.utils.encode_cell({ r: row, c: colIndex });
                    const cell = ws[cellAddress];
                    
                    if (cell) {
                        const valorCelula = String(cell.v).trim().toLowerCase();

                        if (valorCelula === "sim") {
                            cell.s = estiloVerde;
                        } else if (valorCelula === "não" || valorCelula === "nao") {
                            cell.s = estiloVermelho;
                        }
                    }
                }
            }
        });
    }

    // Encontrar índice da coluna pelo nome
    encontrarIndiceColuna(ws, nomeColuna) {
        const range = this.XLSX.utils.decode_range(ws['!ref']);
        
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = this.XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const headerCell = ws[cellAddress];
            if (headerCell && headerCell.v === nomeColuna) {
                return col;
            }
        }
        return -1;
    }

    // Ajustar largura das colunas - Baseado no adjustment do Python
    ajustarLarguraColunas(ws) {
        const range = this.XLSX.utils.decode_range(ws['!ref']);
        const colWidths = [];

        // Calcular largura máxima para cada coluna
        for (let col = range.s.c; col <= range.e.c; col++) {
            let maxLength = 0;
            
            for (let row = range.s.r; row <= range.e.r; row++) {
                const cellAddress = this.XLSX.utils.encode_cell({ r: row, c: col });
                const cell = ws[cellAddress];
                
                if (cell && cell.v) {
                    const length = cell.v.toString().length;
                    if (length > maxLength) {
                        maxLength = length;
                    }
                }
            }
            
            // Ajustar largura - Similar ao cálculo do Python
            colWidths.push({ wch: Math.min(Math.max(maxLength + 2, 10), 50) });
        }

        ws['!cols'] = colWidths;
    }

    // Baixar arquivo Excel - Similar ao download_button do Streamlit
    baixarExcel(resultados, nomeArquivo = "resultados_analise.xlsx") {
        try {
            const wb = this.gerarExcel(resultados);
            this.XLSX.writeFile(wb, nomeArquivo);
            return true;
        } catch (error) {
            console.error('Erro ao gerar Excel:', error);
            return false;
        }
    }

    // Gerar blob para download - Alternativa para download direto
    gerarBlobExcel(resultados) {
        try {
            const wb = this.gerarExcel(resultados);
            const blob = this.XLSX.write(wb, { bookType: 'xlsx', type: 'blob' });
            return blob;
        } catch (error) {
            console.error('Erro ao gerar blob Excel:', error);
            return null;
        }
    }
}
