// Gráficos e Visualizações - Substituindo Plotly por Chart.js
class GerenciadorGraficos {
    constructor() {
        this.graficos = {};
        this.cores = {
            faseR: 'rgba(220, 53, 69, 0.8)',
            faseS: 'rgba(40, 167, 69, 0.8)',
            faseT: 'rgba(23, 162, 184, 0.8)',
            potencia: 'rgba(108, 117, 125, 0.8)',
            demanda: 'rgba(255, 193, 7, 0.8)',
            corrente: 'rgba(0, 123, 255, 0.8)',
            queda: 'rgba(111, 66, 193, 0.8)',
            recomendado: 'rgba(40, 167, 69, 1)'
        };
    }

    // Inicializar todos os gráficos
    inicializarGraficos() {
        this.criarGraficoPotenciaDemanda();
        this.criarGraficoCorrente();
        this.criarGraficoQuedaTensao();
        this.criarGraficoSubestacao();
    }

    // Atualizar todos os gráficos com novos dados
    atualizarGraficos(dadosQuadros) {
        if (!dadosQuadros || dadosQuadros.length === 0) {
            this.limparGraficos();
            return;
        }

        const analise = this.calcularAnaliseSistema(dadosQuadros);
        
        this.atualizarGraficoPotenciaDemanda(analise);
        this.atualizarGraficoCorrente(analise);
        this.atualizarGraficoQuedaTensao(dadosQuadros);
        this.atualizarGraficoSubestacao(analise, dadosQuadros);
    }

    // Calcular análise do sistema (função movida para cá)
    calcularAnaliseSistema(dadosQuadros) {
        if (!dadosQuadros || dadosQuadros.length === 0) {
            return null;
        }

        const totais = {
            potenciaR: 0,
            potenciaS: 0,
            potenciaT: 0,
            demandaR: 0,
            demandaS: 0,
            demandaT: 0,
            correnteR: 0,
            correnteS: 0,
            correnteT: 0,
            potenciaTotal: 0,
            demandaTotal: 0,
            correnteMediaTotal: 0
        };

        dadosQuadros.forEach(quadro => {
            totais.potenciaR += quadro.ATIVA_R;
            totais.potenciaS += quadro.ATIVA_S;
            totais.potenciaT += quadro.ATIVA_T;
            
            totais.demandaR += quadro.DEM_R;
            totais.demandaS += quadro.DEM_S;
            totais.demandaT += quadro.DEM_T;
            
            totais.correnteR += quadro.R;
            totais.correnteS += quadro.S;
            totais.correnteT += quadro.T;
            
            totais.potenciaTotal += quadro.POT_TOTAL_W;
            totais.demandaTotal += quadro.DEM_TOTAL_VA;
            totais.correnteMediaTotal += quadro.COR_MEDIA_A;
        });

        totais.correnteMediaTotal /= dadosQuadros.length;

        // Calcular desbalanceamento
        const demandas = [totais.demandaR, totais.demandaS, totais.demandaT];
        const demandaMaxima = Math.max(...demandas);
        const demandaMedia = (totais.demandaR + totais.demandaS + totais.demandaT) / 3;
        const desbalanceamento = ((demandaMaxima - demandaMedia) / demandaMedia) * 100;

        // Subestação recomendada
        const demandaKVA = totais.demandaTotal / 1000;
        const subestacoes = [75, 112.5, 225, 300, 500, 750, 1000, 1250, 1500, 1750, 2000];
        const subestacaoRecomendada = subestacoes.find(s => s >= demandaKVA) || subestacoes[subestacoes.length - 1];

        return {
            ...totais,
            desbalanceamento: Math.round(desbalanceamento * 100) / 100,
            demandaKVA: Math.round(demandaKVA * 100) / 100,
            subestacaoRecomendada,
            demandaMaximaFase: demandaMaxima,
            fases: {
                R: { potencia: totais.potenciaR, demanda: totais.demandaR, corrente: totais.correnteR },
                S: { potencia: totais.potenciaS, demanda: totais.demandaS, corrente: totais.correnteS },
                T: { potencia: totais.potenciaT, demanda: totais.demandaT, corrente: totais.correnteT }
            }
        };
    }

    // Gráfico de Potência vs Demanda por Fase
    criarGraficoPotenciaDemanda() {
        const ctx = document.getElementById('powerChart');
        if (!ctx) return;
        
        this.graficos.potenciaDemanda = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Fase R', 'Fase S', 'Fase T'],
                datasets: [
                    {
                        label: 'Potência (kW)',
                        data: [0, 0, 0],
                        backgroundColor: this.cores.potencia,
                        borderColor: this.cores.potencia.replace('0.8', '1'),
                        borderWidth: 1
                    },
                    {
                        label: 'Demanda (kVA)',
                        data: [0, 0, 0],
                        backgroundColor: this.cores.demanda,
                        borderColor: this.cores.demanda.replace('0.8', '1'),
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Comparação entre Potência Instalada e Demanda por Fase',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString('pt-BR') + ' ' + (context.dataset.label.includes('Potência') ? 'kW' : 'kVA');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Valor (kW ou kVA)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('pt-BR');
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Fase'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    // Gráfico de Corrente por Fase
    criarGraficoCorrente() {
        const ctx = document.getElementById('currentChart');
        if (!ctx) return;
        
        this.graficos.corrente = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Fase R', 'Fase S', 'Fase T'],
                datasets: [{
                    label: 'Corrente (A)',
                    data: [0, 0, 0],
                    backgroundColor: [
                        this.cores.faseR,
                        this.cores.faseS,
                        this.cores.faseT
                    ],
                    borderColor: [
                        this.cores.faseR.replace('0.8', '1'),
                        this.cores.faseS.replace('0.8', '1'),
                        this.cores.faseT.replace('0.8', '1')
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Corrente Total por Fase',
                        font: { size: 14 }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Corrente: ' + context.parsed.y.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + ' A';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Corrente (A)'
                        }
                    }
                }
            }
        });
    }

    // Gráfico de Queda de Tensão por Circuito
    criarGraficoQuedaTensao() {
        const ctx = document.getElementById('voltageDropChart');
        if (!ctx) return;
        
        this.graficos.quedaTensao = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Queda de Tensão (%)',
                    data: [],
                    backgroundColor: this.cores.queda,
                    borderColor: this.cores.queda.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Queda de Tensão por Circuito',
                        font: { size: 14 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Queda: ' + context.parsed.y.toLocaleString('pt-BR', {maximumFractionDigits: 2}) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Queda de Tensão (%)'
                        },
                        max: 5 // Limite para melhor visualização
                    }
                }
            }
        });
    }

    // Gráfico de Dimensionamento da Subestação
    // No método criarGraficoSubestacao, ajuste para a nova versão:
    criarGraficoSubestacao() {
        const ctx = document.getElementById('substationChart');
        if (!ctx) return;
        
        this.graficos.subestacao = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Valor (kVA)',
                    data: [],
                    backgroundColor: this.cores.demanda,
                    borderColor: this.cores.demanda.replace('0.8', '1'),
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'x', // Mudou para vertical
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Dimensionamento da Subestação',
                        font: { size: 14 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString('pt-BR') + ' kVA';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kVA'
                        }
                    }
                }
            }
        });
    }

    // Atualizar gráfico de Potência vs Demanda
    atualizarGraficoPotenciaDemanda(analise) {
        if (!analise || !this.graficos.potenciaDemanda) return;

        const potencias = [
            analise.fases.R.potencia / 1000,
            analise.fases.S.potencia / 1000,
            analise.fases.T.potencia / 1000
        ];

        const demandas = [
            analise.fases.R.demanda / 1000,
            analise.fases.S.demanda / 1000,
            analise.fases.T.demanda / 1000
        ];

        this.graficos.potenciaDemanda.data.datasets[0].data = potencias;
        this.graficos.potenciaDemanda.data.datasets[1].data = demandas;
        this.graficos.potenciaDemanda.update();
    }

    // Atualizar gráfico de Corrente
    atualizarGraficoCorrente(analise) {
        if (!analise || !this.graficos.corrente) return;

        const correntes = [
            analise.fases.R.corrente,
            analise.fases.S.corrente,
            analise.fases.T.corrente
        ];

        this.graficos.corrente.data.datasets[0].data = correntes;
        this.graficos.corrente.update();
    }

    // Atualizar gráfico de Queda de Tensão
    atualizarGraficoQuedaTensao(dadosQuadros) {
        if (!this.graficos.quedaTensao) return;

        const circuitos = dadosQuadros.map(q => q.DESCRICAO);
        const quedas = dadosQuadros.map(q => q.QUEDA_TENSAO_PERC);

        // Limitar a 15 circuitos para melhor visualização
        const circuitosExibir = circuitos.slice(0, 15);
        const quedasExibir = quedas.slice(0, 15);

        this.graficos.quedaTensao.data.labels = circuitosExibir;
        this.graficos.quedaTensao.data.datasets[0].data = quedasExibir;
        
        // Ajustar altura do gráfico baseado no número de circuitos
        const alturaBase = 250;
        const alturaAdicional = circuitosExibir.length * 20;
        const parent = this.graficos.quedaTensao.canvas.parentNode;
        if (parent) {
            parent.style.height = Math.max(alturaBase, alturaAdicional) + 'px';
        }
        
        this.graficos.quedaTensao.update();
    }

    // Atualizar gráfico de Subestação
    // Atualizar gráfico de Subestação - Versão comparativa prática
    atualizarGraficoSubestacao(analise, dadosQuadros) {
        if (!analise || !this.graficos.subestacao) return;
    
        const demandaKVA = analise.demandaKVA;
        const subestacaoRecomendada = analise.subestacaoRecomendada;
        
        // Mostrar: Demanda calculada vs Subestação recomendada
        const labels = ['Sua Demanda', 'Subestação Recomendada'];
        const valores = [demandaKVA, subestacaoRecomendada];
        const cores = [this.cores.demanda, this.cores.recomendado];
    
        // Mudar para um gráfico de barras vertical simples
        this.graficos.subestacao.data.labels = labels;
        this.graficos.subestacao.data.datasets = [{
            label: 'Valor (kVA)',
            data: valores,
            backgroundColor: cores,
            borderColor: cores.map(cor => cor.replace('0.8', '1')),
            borderWidth: 2
        }];
    
        // Mudar para vertical
        this.graficos.subestacao.options.indexAxis = 'x';
        this.graficos.subestacao.options.scales.x.title.text = '';
        this.graficos.subestacao.options.scales.y.title.text = 'kVA';
    
        this.graficos.subestacao.options.plugins.title.text = 
            'Comparação: Demanda vs Subestação Recomendada';
    
        this.graficos.subestacao.update();
    }

    // Limpar todos os gráficos
    limparGraficos() {
        Object.values(this.graficos).forEach(grafico => {
            if (grafico && grafico.data && grafico.data.datasets) {
                grafico.data.datasets.forEach(dataset => {
                    dataset.data = [];
                });
                grafico.data.labels = [];
                grafico.update();
            }
        });
    }

    // Criar gráfico de pizza para distribuição de cargas
    criarGraficoDistribuicao(dadosQuadros, elementoId) {
        const ctx = document.getElementById(elementoId);
        if (!ctx) return null;
        
        // Agrupar por tipo de circuito
        const tipos = {
            'Trifásico': 0,
            'Bifásico': 0,
            'Monofásico': 0
        };

        dadosQuadros.forEach(quadro => {
            const fasesAtivas = [quadro.ATIVA_R, quadro.ATIVA_S, quadro.ATIVA_T].filter(p => p > 0).length;
            
            if (fasesAtivas === 3) tipos['Trifásico'] += quadro.POT_TOTAL_W;
            else if (fasesAtivas === 2) tipos['Bifásico'] += quadro.POT_TOTAL_W;
            else tipos['Monofásico'] += quadro.POT_TOTAL_W;
        });

        return new Chart(ctx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(tipos),
                datasets: [{
                    data: Object.values(tipos),
                    backgroundColor: [
                        this.cores.faseR,
                        this.cores.faseS,
                        this.cores.faseT
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Tipo de Circuito'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return context.label + ': ' + (value/1000).toLocaleString('pt-BR') + ' kW (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // Exportar gráficos como imagem
    exportarGraficoComoImagem(nomeGrafico, formato = 'png') {
        const grafico = this.graficos[nomeGrafico];
        if (!grafico) {
            console.error('Gráfico não encontrado:', nomeGrafico);
            return;
        }

        const link = document.createElement('a');
        link.download = 'grafico_' + nomeGrafico + '.' + formato;
        link.href = grafico.toBase64Image();
        link.click();
    }
}

// Função global para atualizar gráficos
function atualizarGraficos(dadosQuadros) {
    if (!window.gerenciadorGraficos) {
        window.gerenciadorGraficos = new GerenciadorGraficos();
        window.gerenciadorGraficos.inicializarGraficos();
    }
    
    window.gerenciadorGraficos.atualizarGraficos(dadosQuadros);
}

// Inicializar gráficos quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Pequeno delay para garantir que o DOM esteja totalmente carregado
    setTimeout(() => {
        if (typeof Chart !== 'undefined') {
            window.gerenciadorGraficos = new GerenciadorGraficos();
            window.gerenciadorGraficos.inicializarGraficos();
        }
    }, 100);
});

