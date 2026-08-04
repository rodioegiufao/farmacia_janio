// Gerador de Excel com ExcelJS para suportar imagens incorporadas no XLSX.
class ExcelGenerator {
    constructor() {
        this.ExcelJS = window.ExcelJS;
    }

    async gerarExcel(resultados) {
        if (!this.ExcelJS) throw new Error('ExcelJS não carregado no navegador.');
        const workbook = new this.ExcelJS.Workbook();
        workbook.creator = 'Analisador de Carimbos';
        workbook.created = new Date();
        const maxLogos = this.obterQuantidadeColunasLogo(resultados);
        const ws = workbook.addWorksheet('Resultados PDF', { views: [{ state: 'frozen', ySplit: 1 }] });
        this.montarResultadosPDF(workbook, ws, resultados, maxLogos);
        this.montarAbaSimples(workbook.addWorksheet('Cômodos IA'), this.prepararDadosTabelaComodos(resultados));
        this.montarAbaSimples(workbook.addWorksheet('Luminárias IA'), this.prepararDadosTabelaLuminarias(resultados));
        return workbook;
    }

    obterQuantidadeColunasLogo(resultados) {
        const limite = window.LOGOS_REFERENCIA_CONFIG?.maxLogosPorPdf || 10;
        const maior = Math.max(0, ...Object.values(resultados || {}).map(d => d.logos_detectadas?.itens?.length || 0));
        return Math.max(1, Math.min(limite, maior));
    }
        montarResultadosPDF(workbook, ws, resultados, maxLogos) {
        const logoHeaders = Array.from({ length: maxLogos }, (_, i) => `Logo identificada ${i + 1}`);
        const headers = [
            'Código Projeto', 'Descrição Projeto', 'Palavras-chave encontradas', 'Área',
            ...logoHeaders,
            'Nome do Arquivo', 'Número da Prancha', 'Tamanho da Prancha', 'Nome encontrado',
            'Prancha encontrada', 'Arquivo assinado', 'Projeto encontrado', 'Qtd. Cômodos IA',
            'Consistência', 'Alertas de consistência'
        ];
        ws.addRow(headers);
        this.formatarCabecalho(ws.getRow(1));
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
        const imageCache = new Map();
        let rowIndex = 2;
        for (const [nomeArquivo, dados] of Object.entries(resultados)) {
            const analise = dados.analise_consistencia;
            const severidade = analise?.severidade || 'n/a';
            const score = analise?.score ?? 'N/A';
            const alertas = analise?.alertas?.length ? analise.alertas.join(' | ') : 'Sem alertas';
            const logoStatus = this.textoStatusLogo(dados.logos_detectadas);
            const rowValues = [
                dados.codigo_projeto || 'Não identificado',
                dados.descricao_projeto,
                dados.dados_carimbo?.length ? dados.dados_carimbo.join(', ') : 'Nenhuma',
                dados.area_projeto || '',
                ...Array.from({ length: maxLogos }, (_, i) => i === 0 ? logoStatus : ''),
                nomeArquivo,
                dados.numero_prancha || 'Não identificado',
                dados.tamanho_prancha || 'Não identificado',
                dados.nome_arquivo_encontrado ? 'Sim' : 'Não',
                dados.prancha_encontrada ? 'Sim' : 'Não',
                dados.assinado_pelo_nome ? 'Sim' : 'Não',
                dados.projeto_encontrado ? 'Sim' : 'Não',
                dados.comodos_ia?.total_deteccoes ?? 0,
                `${String(severidade).toUpperCase()} (${score})`,
                alertas
            ];
            const row = ws.addRow(rowValues);
            row.alignment = { vertical: 'middle', wrapText: true };
            this.formatarSimNao(row, headers);
            const logos = (dados.logos_detectadas?.itens || []).slice(0, maxLogos);
            if (logos.length) {
                row.height = 65;
                logos.forEach((logo, i) => this.inserirImagemLogo(workbook, ws, logo, rowIndex, 5 + i, imageCache));
            }
            rowIndex++;
        }
        this.ajustarLarguras(ws, headers, maxLogos);
    }

    textoStatusLogo(logos) {
        if (logos?.itens?.length) return '';
        if (logos?.status === 'desabilitado') return 'Análise desativada';
        if (logos?.status === 'sem_referencias') return 'Referências não cadastradas';
        return 'Nenhuma imagem identificada';
    }

    inserirImagemLogo(workbook, ws, logo, rowIndex, colIndex, imageCache) {
        const preparada = this.prepararImagemExcel(logo.imagem_base64);
        if (!preparada) return;
        const key = logo.hash || preparada.base64.slice(0, 512);
        let imageId = imageCache.get(key);
        if (!imageId) {
            imageId = workbook.addImage({ base64: preparada.base64, extension: preparada.extension });
            imageCache.set(key, imageId);
        }
        const dim = this.calcularDimensoesImagem(logo.largura_original || 120, logo.altura_original || 75, 120, 75);
        ws.addImage(imageId, {
            tl: { col: colIndex - 1 + 0.08, row: rowIndex - 1 + 0.12 },
            ext: { width: dim.width, height: dim.height },
            editAs: 'oneCell'
        });
    }

    prepararImagemExcel(dataUrl) {
        if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
        const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
        if (match) return { extension: match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase(), base64: dataUrl };
        return { extension: 'png', base64: dataUrl };
    }

    calcularDimensoesImagem(largura, altura, maxWidth, maxHeight) {
        const escala = Math.min(maxWidth / Math.max(1, largura), maxHeight / Math.max(1, altura), 1);
        return { width: Math.max(1, Math.round(largura * escala)), height: Math.max(1, Math.round(altura * escala)) };
    }

    montarAbaSimples(ws, linhas) {
        if (!linhas.length) linhas = [{ Mensagem: 'Nenhum dado disponível' }];
        const headers = Object.keys(linhas[0]);
        ws.addRow(headers);
        this.formatarCabecalho(ws.getRow(1));
        linhas.forEach(obj => {
            const row = ws.addRow(headers.map(h => obj[h] ?? ''));
            row.alignment = { vertical: 'middle', wrapText: true };
        });
        ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
        this.ajustarLarguras(ws, headers, 0);
    }

    formatarCabecalho(row) {
        row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }

    formatarSimNao(row, headers) {
        ['Nome encontrado', 'Prancha encontrada', 'Arquivo assinado', 'Projeto encontrado'].forEach(nome => {
            const idx = headers.indexOf(nome) + 1;
            const cell = row.getCell(idx);
            const valor = String(cell.value || '').toLowerCase();
            if (valor === 'sim' || valor === 'não' || valor === 'nao') {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: valor === 'sim' ? 'FF00B050' : 'FFFF0000' } };
            }
        });
    }

    ajustarLarguras(ws, headers, maxLogos) {
        headers.forEach((h, i) => {
            const col = ws.getColumn(i + 1);
            if (h.startsWith('Logo identificada')) col.width = 22;
            else col.width = Math.min(Math.max(String(h).length + 4, 12), 50);
        });
        ws.eachRow(row => row.eachCell(cell => { cell.alignment = cell.alignment || { wrapText: true, vertical: 'middle' }; }));
    }

    prepararDadosTabelaComodos(resultados) {
        const linhas = [];
        for (const [nomeArquivo, dados] of Object.entries(resultados)) {
            const deteccoes = dados.comodos_ia?.deteccoes || [];
            if (!deteccoes.length) {
                linhas.push({ 'Nome do Arquivo': nomeArquivo, 'Número da Prancha': dados.numero_prancha || 'Não identificado', 'Código Projeto': dados.codigo_projeto || 'Não identificado', 'Descrição Projeto': dados.descricao_projeto || 'Não identificado', 'Página PDF': '', Cômodo: 'Nenhum detectado', 'Confiança Cômodo (%)': '', 'ID Planta': '', 'Classe Planta': '', 'Confiança Planta (%)': '' });
                continue;
            }
            deteccoes.forEach(item => linhas.push({ 'Nome do Arquivo': nomeArquivo, 'Número da Prancha': dados.numero_prancha || 'Não identificado', 'Código Projeto': dados.codigo_projeto || 'Não identificado', 'Descrição Projeto': dados.descricao_projeto || 'Não identificado', 'Página PDF': item.pagina_pdf ?? '', Cômodo: item.comodo, 'Confiança Cômodo (%)': item.confianca ? (item.confianca * 100).toFixed(2) : '0.00', 'ID Planta': item.planta_id ?? '', 'Classe Planta': item.planta_classe ?? '', 'Confiança Planta (%)': item.planta_confianca ? (item.planta_confianca * 100).toFixed(2) : '' }));
        }
        return linhas;
    }

    prepararDadosTabelaLuminarias(resultados) {
        const linhas = [];
        for (const [nomeArquivo, dados] of Object.entries(resultados)) {
            const deteccoes = dados.luminarias_ia?.deteccoes || [];
            if (!deteccoes.length) {
                linhas.push({ 'Nome do Arquivo': nomeArquivo, 'Número da Prancha': dados.numero_prancha || 'Não identificado', 'Código Projeto': dados.codigo_projeto || 'Não identificado', 'Descrição Projeto': dados.descricao_projeto || 'Não identificado', 'Página PDF': '', Luminária: 'Nenhuma detectada', 'Confiança Luminária (%)': '', 'ID Planta': '', 'Classe Planta': '', 'Confiança Planta (%)': '' });
                continue;
            }
            deteccoes.forEach(item => linhas.push({ 'Nome do Arquivo': nomeArquivo, 'Número da Prancha': dados.numero_prancha || 'Não identificado', 'Código Projeto': dados.codigo_projeto || 'Não identificado', 'Descrição Projeto': dados.descricao_projeto || 'Não identificado', 'Página PDF': item.pagina_pdf ?? '', Luminária: item.luminaria, 'Confiança Luminária (%)': item.confianca ? (item.confianca * 100).toFixed(2) : '0.00', 'ID Planta': item.planta_id ?? '', 'Classe Planta': item.planta_classe ?? '', 'Confiança Planta (%)': item.planta_confianca ? (item.planta_confianca * 100).toFixed(2) : '' }));
        }
        return linhas;
    }

    async baixarExcel(resultados, nomeArquivo = 'resultados_analise.xlsx') {
        const blob = await this.gerarBlobExcel(resultados);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    }

    async gerarBlobExcel(resultados) {
        const wb = await this.gerarExcel(resultados);
        const buffer = await wb.xlsx.writeBuffer();
        return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
}
