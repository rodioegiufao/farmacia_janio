// App Principal - Gerenciamento de Estado e Lógica da Interface
class DimensionamentoEletricoApp {
    constructor() {
        this.dadosQuadros = this.carregarDados();
        this.init();
    }

    init() {
        this.inicializarEventos();
        this.atualizarInterface();
    }

    // Carregar dados do LocalStorage
    carregarDados() {
        try {
            const dadosSalvos = localStorage.getItem('dimensionamentoEletrico');
            if (dadosSalvos) {
                return JSON.parse(dadosSalvos);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
        return [];
    }

    // Salvar dados no LocalStorage
    salvarDados() {
        try {
            localStorage.setItem('dimensionamentoEletrico', JSON.stringify(this.dadosQuadros));
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            this.mostrarNotificacao('Erro ao salvar dados!', 'error');
            return false;
        }
    }

    // Inicializar todos os eventos
    inicializarEventos() {
        // Formulário de cálculo
        const formCalculo = document.getElementById('form-calculo');
        if (formCalculo) {
            formCalculo.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processarCalculo();
            });
        }

        // Exportação para Excel
        const exportExcel = document.getElementById('export-excel');
        if (exportExcel) {
            exportExcel.addEventListener('click', () => {
                this.exportarParaExcel();
            });
        }

        // Exclusão de quadros
        const deleteSelected = document.getElementById('delete-selected');
        if (deleteSelected) {
            deleteSelected.addEventListener('click', () => {
                this.excluirQuadroSelecionado();
            });
        }

        const deleteAll = document.getElementById('delete-all');
        if (deleteAll) {
            deleteAll.addEventListener('click', () => {
                this.excluirTodosQuadros();
            });
        }

        // Atualizar seletor de quadros quando mudar de aba
        const dataTab = document.getElementById('data-tab');
        if (dataTab) {
            dataTab.addEventListener('click', () => {
                this.atualizarSeletorQuadros();
            });
        }

        // Atualizar visualizações quando mudar para aba de visualização
        const viewTab = document.getElementById('view-tab');
        if (viewTab) {
            viewTab.addEventListener('click', () => {
                this.atualizarVisualizacoes();
            });
        }
        // Adicionar evento para o botão de limpar
        const limparCamposBtn = document.getElementById('limpar-campos');
        if (limparCamposBtn) {
            limparCamposBtn.addEventListener('click', () => {
                this.limparFormularioCompleto();
            });
        }
    }

    // Processar cálculo do formulário
    processarCalculo() {
        const formData = this.obterDadosFormulario();
        
        if (!this.validarFormulario(formData)) {
            return;
        }

        // Verificar se o nome do quadro já existe
        if (this.nomeQuadroExiste(formData.nomeQuadro)) {
            this.mostrarNotificacao('Ja existe um quadro com o nome "' + formData.nomeQuadro + '". Use um nome diferente.', 'error');
            return;
        }

        // Realizar cálculo
        const resultado = calcularDimensionamento(
            formData.nomeQuadro,
            formData.fp,
            formData.fd,
            formData.distancia,
            formData.potenciaR,
            formData.potenciaS,
            formData.potenciaT,
            formData.tensao
        );

        // Adicionar aos dados
        this.dadosQuadros.push(resultado);
        
        // Salvar dados
        if (this.salvarDados()) {
            this.mostrarNotificacao('Calculo realizado e salvo com sucesso!', 'success');
            this.mostrarResultadoCalculo(resultado);
            //this.limparFormulario();
            this.atualizarInterface();
        }
    }

    // Obter dados do formulário
    obterDadosFormulario() {
        return {
            nomeQuadro: document.getElementById('nome-quadro').value.trim(),
            distancia: parseFloat(document.getElementById('distancia').value),
            fp: parseFloat(document.getElementById('fp').value),
            fd: parseFloat(document.getElementById('fd').value),
            tensao: parseInt(document.getElementById('tensao').value),
            potenciaR: parseFloat(document.getElementById('potencia-r').value) || 0,
            potenciaS: parseFloat(document.getElementById('potencia-s').value) || 0,
            potenciaT: parseFloat(document.getElementById('potencia-t').value) || 0
        };
    }

    // Validar formulário
    validarFormulario(data) {
        if (!data.nomeQuadro) {
            this.mostrarNotificacao('Por favor, informe o nome do quadro.', 'error');
            return false;
        }

        if (data.distancia <= 0) {
            this.mostrarNotificacao('A distancia deve ser maior que zero.', 'error');
            return false;
        }

        if (data.potenciaR === 0 && data.potenciaS === 0 && data.potenciaT === 0) {
            this.mostrarNotificacao('Informe pelo menos uma potencia (R, S ou T).', 'error');
            return false;
        }

        return true;
    }

    // Verificar se nome do quadro já existe
    nomeQuadroExiste(nome) {
        return this.dadosQuadros.some(quadro => 
            quadro.DESCRICAO.toLowerCase() === nome.toLowerCase()
        );
    }

    // Mostrar resultado do cálculo
    // No método mostrarResultadoCalculo, ajuste a exibição:
    // No método mostrarResultadoCalculo do app.js:
    mostrarResultadoCalculo(resultado) {
        const card = document.getElementById('resultado-card');
        const content = document.getElementById('resultado-detailed');
    
        if (!card || !content) return;
    
        // Função para formatar a exibição do cabo
        const formatarCabo = (valorCabo) => {
            if (typeof valorCabo === 'string' && valorCabo.startsWith('1x')) {
                return valorCabo.substring(2); // Remove o "1x"
            }
            return valorCabo;
        };
    
        content.innerHTML = 
            '<div class="row">' +
                '<div class="col-md-6">' +
                    '<h6>Informacoes Basicas</h6>' +
                    '<table class="table table-sm">' +
                        '<tr><td><strong>Quadro:</strong></td><td>' + resultado.DESCRICAO + '</td></tr>' +
                        '<tr><td><strong>Potencia Total:</strong></td><td>' + resultado.POT_TOTAL_W.toLocaleString() + ' W</td></tr>' +
                        '<tr><td><strong>Demanda Total:</strong></td><td>' + resultado.DEM_TOTAL_VA.toLocaleString() + ' VA</td></tr>' +
                        '<tr><td><strong>Corrente Media:</strong></td><td>' + resultado.COR_MEDIA_A.toFixed(2) + ' A</td></tr>' +
                    '</table>' +
                '</div>' +
                '<div class="col-md-6">' +
                    '<h6>Dimensionamento</h6>' +
                    '<table class="table table-sm">' +
                        '<tr><td><strong>Condutor Fase:</strong></td><td>' + formatarCabo(resultado.FA) + ' mm²</td></tr>' +
                        '<tr><td><strong>Condutor Neutro:</strong></td><td>' + formatarCabo(resultado.NE) + ' mm²</td></tr>' +
                        '<tr><td><strong>Condutor Terra:</strong></td><td>' + formatarCabo(resultado.TE) + ' mm²</td></tr>' +
                        '<tr><td><strong>Disjuntor:</strong></td><td>' + resultado.DISJUNTOR + ' A</td></tr>' +
                        '<tr><td><strong>Queda de Tensao:</strong></td><td>' + resultado.QUEDA_TENSAO_PERC.toFixed(2) + '%</td></tr>' +
                    '</table>' +
                '</div>' +
            '</div>';
    
        card.classList.remove('d-none');
    }

    // Método para limpar tudo (apenas quando solicitado)
    limparFormularioCompleto() {
        const form = document.getElementById('form-calculo');
        if (form) {
            form.reset();
        }
    }
    // Atualizar interface completa
    atualizarInterface() {
        this.atualizarAbaVisualizacao();
        this.atualizarAbaDados();
        this.atualizarSeletorQuadros();
    }

    // Atualizar aba de visualização
    atualizarAbaVisualizacao() {
        const noDataAlert = document.getElementById('no-data-alert');
        const dataContent = document.getElementById('data-content');

        if (!noDataAlert || !dataContent) return;

        if (this.dadosQuadros.length === 0) {
            noDataAlert.classList.remove('d-none');
            dataContent.classList.add('d-none');
        } else {
            noDataAlert.classList.add('d-none');
            dataContent.classList.remove('d-none');
            this.atualizarVisualizacoes();
        }
    }

    // Atualizar aba de dados
    atualizarAbaDados() {
        const noSavedData = document.getElementById('no-saved-data');
        const savedDataContent = document.getElementById('saved-data-content');
        const tableBody = document.getElementById('data-table-body');

        if (!noSavedData || !savedDataContent || !tableBody) return;

        if (this.dadosQuadros.length === 0) {
            noSavedData.classList.remove('d-none');
            savedDataContent.classList.add('d-none');
        } else {
            noSavedData.classList.add('d-none');
            savedDataContent.classList.remove('d-none');
            
            // Atualizar tabela
            tableBody.innerHTML = this.dadosQuadros.map((quadro, index) => this.criarLinhaTabela(quadro, index)).join('');
        }
    }

    // Criar linha da tabela
    // No método criarLinhaTabela, ajuste a exibição dos cabos:
    // No método criarLinhaTabela, vamos formatar corretamente a exibição dos cabos:
    criarLinhaTabela(quadro, index) {
        // Função para formatar a exibição do cabo (remover "1x" se existir)
        const formatarCabo = (valorCabo) => {
            if (typeof valorCabo === 'string' && valorCabo.startsWith('1x')) {
                return valorCabo.substring(2); // Remove o "1x"
            }
            return valorCabo;
        };
    
        return '' +
            '<tr>' +
                '<td>' + quadro.N + '</td>' +
                '<td>' + quadro.DESCRICAO + '</td>' +
                '<td>' + quadro.ATIVA_R + '</td>' +
                '<td>' + quadro.ATIVA_S + '</td>' +
                '<td>' + quadro.ATIVA_T + '</td>' +
                '<td>' + quadro.DEM_R + '</td>' +
                '<td>' + quadro.DEM_S + '</td>' +
                '<td>' + quadro.DEM_T + '</td>' +
                '<td>' + quadro.R.toFixed(2) + '</td>' +
                '<td>' + quadro.S.toFixed(2) + '</td>' +
                '<td>' + quadro.T.toFixed(2) + '</td>' +
                '<td>' + quadro.FP + '</td>' +
                '<td>' + quadro.FD + '</td>' +
                '<td>' + quadro.TENSAO_FASE_V + '</td>' +
                '<td>' + quadro.TENSAO_LINHA_V + '</td>' +
                '<td>' + quadro.POT_TOTAL_W.toLocaleString() + '</td>' +
                '<td>' + quadro.DEM_TOTAL_VA.toLocaleString() + '</td>' +
                '<td>' + quadro.COR_MEDIA_A.toFixed(2) + '</td>' +
                '<td>' + quadro.DIST_M + '</td>' +
                '<td>' + quadro.QUEDA_TENSAO_PERC.toFixed(2) + '</td>' +
                '<td>' + formatarCabo(quadro.FA) + ' mm²</td>' + // Formatado
                '<td>' + formatarCabo(quadro.NE) + ' mm²</td>' + // Formatado
                '<td>' + formatarCabo(quadro.TE) + ' mm²</td>' + // Formatado
                '<td>' + quadro.DISJUNTOR + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-danger" onclick="app.excluirQuadro(' + index + ')">' +
                        '<i class="fas fa-trash"></i>' +
                    '</button>' +
                '</td>' +
            '</tr>';
    }

    // Atualizar seletor de quadros
    atualizarSeletorQuadros() {
        const select = document.getElementById('quadro-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione um quadro para excluir</option>';
        
        this.dadosQuadros.forEach((quadro, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = quadro.DESCRICAO;
            select.appendChild(option);
        });
    }

    // Atualizar visualizações e gráficos
    atualizarVisualizacoes() {
        if (this.dadosQuadros.length === 0) return;

        // Atualizar métricas
        this.atualizarMetricas();
        
        // Atualizar gráficos
        if (typeof atualizarGraficos === 'function') {
            atualizarGraficos(this.dadosQuadros);
        }
    }

    // Atualizar métricas principais
    atualizarMetricas() {
        const potenciaTotal = this.dadosQuadros.reduce((sum, q) => sum + q.POT_TOTAL_W, 0);
        const demandaTotal = this.dadosQuadros.reduce((sum, q) => sum + q.DEM_TOTAL_VA, 0);
        const correnteMedia = this.dadosQuadros.reduce((sum, q) => sum + q.COR_MEDIA_A, 0) / this.dadosQuadros.length;

        const totalPower = document.getElementById('total-power');
        const totalDemand = document.getElementById('total-demand');
        const avgCurrent = document.getElementById('avg-current');

        if (totalPower) totalPower.textContent = potenciaTotal.toLocaleString() + ' W';
        if (totalDemand) totalDemand.textContent = demandaTotal.toLocaleString() + ' VA';
        if (avgCurrent) avgCurrent.textContent = correnteMedia.toFixed(2) + ' A';

        // Calcular subestação recomendada
        const demandaKVA = demandaTotal / 1000;
        const subestacoes = [75, 112.5, 225, 300, 500, 750, 1000, 1250, 1500, 1750, 2000];
        const subestacaoRecomendada = subestacoes.find(s => s >= demandaKVA) || subestacoes[subestacoes.length - 1];
        
        const recommendedSub = document.getElementById('recommended-sub');
        if (recommendedSub) recommendedSub.textContent = subestacaoRecomendada + ' kVA';
    }

    // app.js - Substitua a função exportarParaExcel()
    exportarParaExcel() {
        if (this.dadosQuadros.length === 0) {
            this.mostrarNotificacao('Nenhum dado para exportar.', 'warning');
            return;
        }
    
        try {
            // Criar workbook
            const wb = XLSX.utils.book_new();
            
            // Preparar dados no formato da planilha melhorada
            const wsData = this.prepararDadosExcelFormatado();
            
            // Converter para worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Aplicar formatação (largura de colunas, bordas, etc.)
            this.aplicarFormatacaoExcel(ws, wsData);
            
            // Adicionar worksheet ao workbook
            XLSX.utils.book_append_sheet(wb, ws, "Quadros_de_Carga");
            
            // Gerar e baixar arquivo
            const fileName = `quadro_de_cargas_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            this.mostrarNotificacao('Arquivo Excel formatado gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            this.mostrarNotificacao('Erro ao gerar arquivo Excel.', 'error');
        }
    }
    
    // Novo método para preparar dados no formato melhorado
    prepararDadosExcelFormatado() {
        const dadosQuadros = this.dadosQuadros;
        
        // Cabeçalho completo (igual ao seu modelo melhorado)
        const cabecalho = [
            // Linha 1: Títulos principais
            [
                "N", "DESCRICAO", 
                "POTÊNCIA (W)", "", "", 
                "DEMANDA (W)", "", "", 
                "CORRENTE (A)", "", "", 
                "FP", "FD", 
                "TENSAO DE FASE (V)", "TENSAO DE LINHA (V)", 
                "POTÊNCIA TOTAL (W)", "DEMANDA TOTAL (VA)", "CORRENTE MÉDIA (A)", 
                "DISTÂNCIA (M)", "QUEDA DE TENSAO (%)", 
                "CABOS", "", "", "DISJUNTOR"
            ],
            
            // Linha 2: Subtítulos
            [
                "", "",
                "R", "S", "T",          // Potência por fase
                "R", "S", "T",          // Demanda por fase
                "R", "S", "T",          // Corrente por fase
                "", "",                 // FP e FD
                "", "",                 // Tensões
                "", "", "",             // Totais
                "", "",                 // Distância e Queda
                "F", "N", "T",          // Cabos
                ""                      // Disjuntor
            ]
        ];
        
        // Dados dos quadros
        const linhasDados = dadosQuadros.map(quadro => {
            // Função para formatar números
            const formatarNum = (valor, casas = 2) => {
                if (valor === null || valor === undefined) return '0.00';
                const fator = Math.pow(10, casas);
                const arredondado = Math.round(valor * fator) / fator;
                
                // Para valores inteiros (como potências), mostrar sem decimais
                if (casas === 0) {
                    return arredondado.toString();
                }
                
                // Formatar com ponto decimal
                return arredondado.toFixed(casas);
            };
            
            // Função para formatar cabos (remover "1x" se existir)
            const formatarCabo = (valorCabo) => {
                if (typeof valorCabo === 'string' && valorCabo.startsWith('1x')) {
                    return valorCabo.substring(2);
                }
                return valorCabo;
            };
            
            return [
                quadro.N || `QD-${quadro.N}`,
                quadro.DESCRICAO,
                
                // Potências por fase (sem casas decimais)
                formatarNum(quadro.ATIVA_R, 0),
                formatarNum(quadro.ATIVA_S, 0),
                formatarNum(quadro.ATIVA_T, 0),
                
                // Demandas por fase (2 casas decimais)
                formatarNum(quadro.DEM_R, 2),
                formatarNum(quadro.DEM_S, 2),
                formatarNum(quadro.DEM_T, 2),
                
                // Correntes por fase (2 casas decimais)
                formatarNum(quadro.R, 2),
                formatarNum(quadro.S, 2),
                formatarNum(quadro.T, 2),
                
                // FP e FD
                quadro.FP,
                quadro.FD,
                
                // Tensões (sem decimais)
                quadro.TENSAO_FASE_V || 127,
                quadro.TENSAO_LINHA_V || 220,
                
                // Totais
                formatarNum(quadro.POT_TOTAL_W, 0),
                formatarNum(quadro.DEM_TOTAL_VA, 2),
                formatarNum(quadro.COR_MEDIA_A, 2),
                
                // Distância (1 decimal) e Queda (2 decimais)
                formatarNum(quadro.DIST_M, 1),
                formatarNum(quadro.QUEDA_TENSAO_PERC, 2),
                
                // Cabos
                formatarCabo(quadro.FA),
                formatarCabo(quadro.NE),
                formatarCabo(quadro.TE),
                
                // Disjuntor
                quadro.DISJUNTOR
            ];
        });
        
        // Juntar cabeçalho e dados
        return [...cabecalho, ...linhasDados];
    }
    
    // Método para aplicar formatação ao Excel
    aplicarFormatacaoExcel(ws, wsData) {
        // Definir largura das colunas
        const colWidths = [
            { wch: 8 },    // N
            { wch: 25 },   // DESCRICAO
            { wch: 12 },   // POTÊNCIA R
            { wch: 12 },   // POTÊNCIA S
            { wch: 12 },   // POTÊNCIA T
            { wch: 12 },   // DEMANDA R
            { wch: 12 },   // DEMANDA S
            { wch: 12 },   // DEMANDA T
            { wch: 10 },   // CORRENTE R
            { wch: 10 },   // CORRENTE S
            { wch: 10 },   // CORRENTE T
            { wch: 8 },    // FP
            { wch: 8 },    // FD
            { wch: 15 },   // TENSAO FASE
            { wch: 15 },   // TENSAO LINHA
            { wch: 15 },   // POTÊNCIA TOTAL
            { wch: 15 },   // DEMANDA TOTAL
            { wch: 15 },   // CORRENTE MÉDIA
            { wch: 12 },   // DISTÂNCIA
            { wch: 15 },   // QUEDA
            { wch: 8 },    // CABO F
            { wch: 8 },    // CABO N
            { wch: 8 },    // CABO T
            { wch: 10 }    // DISJUNTOR
        ];
        
        ws['!cols'] = colWidths;
        
        // Definir range para mesclar células do cabeçalho
        ws['!merges'] = [
            // Mesclar "POTÊNCIA (W)" sobre R, S, T
            { s: { r: 0, c: 2 }, e: { r: 0, c: 4 } },
            
            // Mesclar "DEMANDA (W)" sobre R, S, T
            { s: { r: 0, c: 5 }, e: { r: 0, c: 7 } },
            
            // Mesclar "CORRENTE (A)" sobre R, S, T
            { s: { r: 0, c: 8 }, e: { r: 0, c: 10 } },
            
            // Mesclar "CABOS" sobre F, N, T
            { s: { r: 0, c: 20 }, e: { r: 0, c: 22 } }
        ];
        
        // Aplicar estilos às células
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Estilo para cabeçalho principal (linha 0)
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            if (!ws[cellAddress]) continue;
            
            ws[cellAddress].s = {
                font: { bold: true, sz: 11 },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: "D9E1F2" } }, // Azul claro
                border: {
                    top: { style: 'thin', color: { rgb: "000000" } },
                    bottom: { style: 'thin', color: { rgb: "000000" } },
                    left: { style: 'thin', color: { rgb: "000000" } },
                    right: { style: 'thin', color: { rgb: "000000" } }
                }
            };
        }
        
        // Estilo para subtítulos (linha 1)
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 1, c: C });
            if (!ws[cellAddress]) continue;
            
            ws[cellAddress].s = {
                font: { bold: true, sz: 10 },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: "E2EFDA" } }, // Verde claro
                border: {
                    top: { style: 'thin', color: { rgb: "000000" } },
                    bottom: { style: 'thin', color: { rgb: "000000" } },
                    left: { style: 'thin', color: { rgb: "000000" } },
                    right: { style: 'thin', color: { rgb: "000000" } }
                }
            };
        }
        
        // Estilo para dados (a partir da linha 2)
        for (let R = 2; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) continue;
                
                // Cor de fundo alternada para melhor leitura
                const fillColor = R % 2 === 0 ? "FFFFFF" : "F8F8F8";
                
                // Alinhamento baseado no tipo de dado
                const alignment = (C >= 2 && C <= 4) || C >= 15 ? 
                    { horizontal: 'right', vertical: 'center' } : 
                    { horizontal: 'center', vertical: 'center' };
                
                ws[cellAddress].s = {
                    font: { sz: 10 },
                    alignment: alignment,
                    fill: { fgColor: { rgb: fillColor } },
                    border: {
                        top: { style: 'thin', color: { rgb: "CCCCCC" } },
                        bottom: { style: 'thin', color: { rgb: "CCCCCC" } },
                        left: { style: 'thin', color: { rgb: "CCCCCC" } },
                        right: { style: 'thin', color: { rgb: "CCCCCC" } }
                    }
                };
            }
        }
        
        // Congelar painel (cabeçalho fixo)
        ws['!freeze'] = { xSplit: 0, ySplit: 2, topLeftCell: "A3", activePane: "bottomRight" };
    }

    // Excluir quadro selecionado
    excluirQuadroSelecionado() {
        const select = document.getElementById('quadro-select');
        if (!select) return;
        
        const index = parseInt(select.value);
        
        if (isNaN(index)) {
            this.mostrarNotificacao('Selecione um quadro para excluir.', 'warning');
            return;
        }

        this.excluirQuadro(index);
    }

    // Excluir quadro específico
    excluirQuadro(index) {
        const quadro = this.dadosQuadros[index];
        
        this.mostrarModalConfirmacao(
            'Deseja realmente excluir o quadro "' + quadro.DESCRICAO + '"?',
            () => {
                this.dadosQuadros.splice(index, 1);
                this.salvarDados();
                this.atualizarInterface();
                this.mostrarNotificacao('Quadro excluido com sucesso!', 'success');
            }
        );
    }

    // Excluir todos os quadros
    excluirTodosQuadros() {
        if (this.dadosQuadros.length === 0) {
            this.mostrarNotificacao('Nao ha dados para excluir.', 'warning');
            return;
        }

        this.mostrarModalConfirmacao(
            'Deseja realmente excluir TODOS os quadros? Esta acao e irreversivel!',
            () => {
                this.dadosQuadros = [];
                this.salvarDados();
                this.atualizarInterface();
                this.mostrarNotificacao('Todos os quadros foram excluidos!', 'success');
            }
        );
    }

    // Mostrar modal de confirmação
    mostrarModalConfirmacao(mensagem, callback) {
        const modalBody = document.getElementById('confirmModalBody');
        const confirmButton = document.getElementById('confirmAction');
        
        if (!modalBody || !confirmButton) return;
        
        modalBody.textContent = mensagem;
        
        // Remover listeners anteriores
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        
        newConfirmButton.addEventListener('click', () => {
            callback();
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
            if (modal) modal.hide();
        });
        
        const modalElement = document.getElementById('confirmModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    // Mostrar notificação
    mostrarNotificacao(mensagem, tipo = 'info') {
        // Criar elemento de notificação
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[tipo] || 'alert-info';

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert ' + alertClass + ' alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = 
            mensagem +
            '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';

        document.body.appendChild(alertDiv);

        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Inicializar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.app = new DimensionamentoEletricoApp();
});





