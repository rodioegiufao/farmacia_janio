// Gerador de Excel - Baseado na funcionalidade do openpyxl
class ExcelGenerator {
    constructor() {
        this.XLSX = window.XLSX;
    }

    // Criar planilha Excel - Baseado na criação com openpyxl
    gerarExcel(resultados) {
        // Preparar dados para a tabela - Similar ao DataFrame do Python
        const dadosTabela = this.prepararDadosTabela(resultados);

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

        return wb;
    }

    // Preparar dados para a tabela - Baseado na criação do DataFrame
    prepararDadosTabela(resultados) {
        const dadosTabela = [];

        for (const [nomeArquivo, dados] of Object.entries(resultados)) {
            dadosTabela.push({
                "Código Projeto": dados.codigo_projeto || "Não identificado",
                "Descrição Projeto": dados.descricao_projeto,
                "Palavras-chave encontradas": dados.dados_carimbo.length > 0 ? 
                    dados.dados_carimbo.join(', ') : "Nenhuma",
                "Nome do Arquivo": nomeArquivo,
                "Número da Prancha": dados.numero_prancha || "Não identificado",
                "Nome encontrado": dados.nome_arquivo_encontrado ? "Sim" : "Não",
                "Prancha encontrada": dados.prancha_encontrada ? "Sim" : "Não",
                "Arquivo assinado": dados.assinado_pelo_nome ? "Sim" : "Não",
                "Projeto encontrado": dados.projeto_encontrado ? "Sim" : "Não"
            });
        }

        return dadosTabela;
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
                fgColor: { rgb: "00FF00" } 
            } 
        };
        
        const estiloVermelho = { 
            fill: { 
                fgColor: { rgb: "FF2C2B" } 
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
                        if (cell.v === "Sim") {
                            cell.s = estiloVerde;
                        } else if (cell.v === "Não") {
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