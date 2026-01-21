// Cálculos de Dimensionamento Elétrico - Conversão do Python
class CalculosEletricos {
    constructor() {
        // Tabelas de cabos Voltenax 0,95 (mesmas do Python)
        this.cb_voltenax_095_qd = [7.54, 4.5, 2.86, 1.83, 1.34, 1, 0.71, 0.53, 0.43, 0.36];
        this.cb_voltenax_bitola = [6, 10, 16, 25, 35, 50, 70, 95, 120, 150];
        this.cb_voltenax_terra = [6, 10, 16, 16, 16, 25, 35, 50, 70, 95];
        this.cb_voltenax_corrente = [54, 75, 100, 133, 164, 198, 253, 306, 354, 407];
        
        // Disjuntores caixa moldada
        this.dj_cx_mol = [40, 50, 63, 100, 125, 150, 160, 200, 250, 320, 400, 500, 630, 700, 800, 1000, 1600, 2000, 2500];
        
        // Capacidades padrão de subestações (kVA)
        this.subestacoes_kva = [75, 112.5, 225, 300, 500, 750, 1000, 1250, 1500, 1750, 2000];
    }

    // Função principal de dimensionamento (equivalente à do Python)
    calcularDimensionamento(nomeQuadro, fp, fd, dist, pr, ps, pt, tensao) {
        // Validações básicas
        if (pr < 0 || ps < 0 || pt < 0 || dist <= 0 || fp <= 0 || fd <= 0) {
            throw new Error('Valores inválidos fornecidos para o cálculo');
        }

        const sum_pot = pr + ps + pt;
        const p = [pr, ps, pt];
        let c_qds = [0, 0, 0];
        let c_med = 0;

        // Determinar o tipo de circuito e calcular corrente
        const tipoCircuito = this.determinarTipoCircuito(pr, ps, pt);
        
        switch (tipoCircuito) {
            case 'trifasico':
                c_med = sum_pot / (tensao * (Math.sqrt(3)) * fp);
                for (let i = 0; i < 3; i++) {
                    c_qds[i] = c_med * (p[i] / (sum_pot / 3));
                }
                break;
                
            case 'bifasico':
                c_med = sum_pot / (tensao * fp);
                for (let i = 0; i < 3; i++) {
                    c_qds[i] = c_med * (p[i] / (sum_pot / 2));
                }
                break;
                
            case 'monofasico':
                c_med = sum_pot / ((tensao * fp) / Math.sqrt(3));
                for (let i = 0; i < 3; i++) {
                    c_qds[i] = c_med * (p[i] / sum_pot);
                }
                break;
        }

        // Calcular quedas de tensão para cada bitola
        const qd = this.calcularQuedasTensao(dist, c_med, tensao);

        // Dimensionar cabos
        const dimensionamentoCabos = this.dimensionarCabos(c_med, qd);
        
        // Dimensionar disjuntor
        const disjuntor = this.dimensionarDisjuntor(c_med);
        
        // Calcular tensão de linha
        const tensao_fase = tensao === 220 ? 127 : 220; // Se entrada é 220V, fase é 127V
        const tensao_linha = tensao; // A entrada já é a tensão de linha
        
        // Gerar número do QD
        const qd_number = this.gerarNumeroQD();
        
        // Retornar dados no formato correto (igual ao Python)
        // No calculos.js, altere o retorno da função calcularDimensionamento:
        // No retorno, ajuste:
        return {
            "N": `QD-${qd_number}`,
            "DESCRICAO": nomeQuadro,
            "ATIVA_R": pr,
            "ATIVA_S": ps,
            "ATIVA_T": pt,
            "DEM_R": this.calcularDemanda(pr, fd),
            "DEM_S": this.calcularDemanda(ps, fd),
            "DEM_T": this.calcularDemanda(pt, fd),
            "R": this.arredondarCorrente(c_qds[0]),
            "S": this.arredondarCorrente(c_qds[1]),
            "T": this.arredondarCorrente(c_qds[2]),
            "FP": fp,
            "FD": fd,
            "TENSAO_FASE_V": tensao_fase, // <-- Agora é fase-neutro
            "TENSAO_LINHA_V": tensao_linha, // <-- Agora é fase-fase (entrada do usuário)
            "POT_TOTAL_W": sum_pot,
            "DEM_TOTAL_VA": this.calcularDemandaTotal(sum_pot, fd, fp),
            "COR_MEDIA_A": this.arredondarCorrente(c_med),
            "DIST_M": dist,
            "QUEDA_TENSAO_PERC": dimensionamentoCabos.queda,
            "FA": dimensionamentoCabos.cabo,
            "NE": dimensionamentoCabos.cabo,
            "TE": dimensionamentoCabos.terra,
            "DISJUNTOR": disjuntor
        };
    }

    // Determinar tipo de circuito baseado nas potências
    determinarTipoCircuito(pr, ps, pt) {
        const fasesComPotencia = [pr, ps, pt].filter(pot => pot > 0).length;
        
        if (fasesComPotencia === 3) {
            return 'trifasico';
        } else if (fasesComPotencia === 2) {
            return 'bifasico';
        } else {
            return 'monofasico';
        }
    }

    // Calcular quedas de tensão para cada bitola
    calcularQuedasTensao(dist, c_med, tensao) {
        return this.cb_voltenax_095_qd.map(r => 
            (dist * r * c_med) / (10 * tensao)
        );
    }

    // Dimensionar cabos considerando múltiplos cabos em paralelo
    // No método dimensionarCabos do calculos.js, ajuste final:
    dimensionarCabos(c_med, qd) {
        let n = 0;
        let cabo = "";
        let terra = "";
        let queda = 0;
        const max_cabos = 5;
    
        // Tenta de 1 até max_cabos cabos em paralelo
        for (let n_cabos = 1; n_cabos <= max_cabos; n_cabos++) {
            for (let i = 0; i < this.cb_voltenax_corrente.length; i++) {
                const corrente_limite = this.cb_voltenax_corrente[i] * n_cabos;
                const queda_total = qd[i] / n_cabos;
                
                if (c_med < corrente_limite && queda_total < 3) {
                    queda = this.arredondarQueda(queda_total);
                    
                    // Formatar a descrição do cabo - SEM "1x" para um único cabo
                    if (n_cabos === 1) {
                        cabo = this.cb_voltenax_bitola[i].toString(); // Apenas o número
                        terra = this.cb_voltenax_terra[i].toString(); // Apenas o número
                    } else {
                        cabo = n_cabos + 'x' + this.cb_voltenax_bitola[i]; // Nx número
                        terra = n_cabos + 'x' + this.cb_voltenax_terra[i]; // Nx número
                    }
                    
                    n = n_cabos;
                    return { cabo, terra, queda, n_cabos: n };
                }
            }
        }
    
        // Se não encontrou solução, usar o maior cabo disponível
        const ultimoIndex = this.cb_voltenax_corrente.length - 1;
        queda = this.arredondarQueda(qd[ultimoIndex]);
        cabo = this.cb_voltenax_bitola[ultimoIndex].toString(); // Apenas o número
        terra = this.cb_voltenax_terra[ultimoIndex].toString(); // Apenas o número
        
        return { cabo, terra, queda, n_cabos: 1 };
    }
    

    // Dimensionar disjuntor
    dimensionarDisjuntor(c_med) {
        if (c_med < 32) {
            return 32;
        }

        for (let i = 0; i < this.dj_cx_mol.length; i++) {
            if (c_med < this.dj_cx_mol[i]) {
                return this.dj_cx_mol[i];
            }
        }

        // Retornar o maior disjuntor se a corrente for muito alta
        return this.dj_cx_mol[this.dj_cx_mol.length - 1];
    }

    // Calcular demanda individual
    calcularDemanda(potencia, fd) {
        const demanda = potencia * fd;
        // Arredondar para 2 casas decimais
        return Math.round(demanda * 100) / 100;
    }

    // Calcular demanda total
    calcularDemandaTotal(potenciaTotal, fd, fp) {
        const demandatotal = (potenciaTotal * fd) / fp;
        // Arredondar para 2 casas decimais
        return Math.round(demandatotal * 100) / 100;
    }

    // Gerar número sequencial do QD
    gerarNumeroQD() {
        try {
            const dadosSalvos = localStorage.getItem('dimensionamentoEletrico');
            if (dadosSalvos) {
                const dados = JSON.parse(dadosSalvos);
                return dados.length + 1;
            }
        } catch (error) {
            console.error('Erro ao gerar número QD:', error);
        }
        return 1;
    }

    // Arredondar corrente para 2 casas decimais
    arredondarCorrente(corrente) {
        return Math.round(corrente * 100) / 100;
    }

    // Arredondar queda de tensão para 2 casas decimais
    arredondarQueda(queda) {
        return Math.round(queda * 100) / 100;
    }

    // Cálculos adicionais para análise do sistema
    calcularAnaliseSistema(dadosQuadros) {
        if (!dadosQuadros || dadosQuadros.length === 0) {
            return null;
        }

        // Totais por fase
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
            totais.potenciaR += quadro['ATIVA-R'];
            totais.potenciaS += quadro['ATIVA-S'];
            totais.potenciaT += quadro['ATIVA-T'];
            
            totais.demandaR += quadro['DEM-R'];
            totais.demandaS += quadro['DEM-S'];
            totais.demandaT += quadro['DEM-T'];
            
            totais.correnteR += quadro.R;
            totais.correnteS += quadro.S;
            totais.correnteT += quadro.T;
            
            totais.potenciaTotal += quadro['POT. TOTAL (W)'];
            totais.demandaTotal += quadro['DEM. TOTAL (VA)'];
            totais.correnteMediaTotal += quadro['COR. MÉDIA (A)'];
        });

        totais.correnteMediaTotal /= dadosQuadros.length;

        // Calcular desbalanceamento
        const demandas = [totais.demandaR, totais.demandaS, totais.demandaT];
        const demandaMaxima = Math.max(...demandas);
        const demandaMedia = (totais.demandaR + totais.demandaS + totais.demandaT) / 3;
        const desbalanceamento = ((demandaMaxima - demandaMedia) / demandaMedia) * 100;

        // Subestação recomendada
        const demandaKVA = totais.demandaTotal / 1000;
        const subestacaoRecomendada = this.calcularSubestacaoRecomendada(demandaKVA);

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

    // Calcular subestação recomendada
    calcularSubestacaoRecomendada(demandaKVA) {
        for (const capacidade of this.subestacoes_kva) {
            if (capacidade >= demandaKVA) {
                return capacidade;
            }
        }
        return this.subestacoes_kva[this.subestacoes_kva.length - 1];
    }

    // Verificar conformidade com normas
    verificarConformidade(dadosQuadro) {
        const alertas = [];

        // Verificar queda de tensão
        if (dadosQuadro['QUEDA DE TENSÃO (%)'] > 3) {
            alertas.push({
                tipo: 'alerta',
                mensagem: `Queda de tensão (${dadosQuadro['QUEDA DE TENSÃO (%)']}%) acima do recomendado (3%)`,
                severidade: 'media'
            });
        }

        // Verificar fator de potência
        if (dadosQuadro.FP < 0.92) {
            alertas.push({
                tipo: 'recomendacao',
                mensagem: `Fator de potência (${dadosQuadro.FP}) abaixo do ideal. Considere correção.`,
                severidade: 'baixa'
            });
        }

        // Verificar relação disjuntor/cabo
        const bitola = parseInt(dadosQuadro.FA.split('x')[1]);
        const correnteMaxima = this.cb_voltenax_corrente[this.cb_voltenax_bitola.indexOf(bitola)];
        
        if (dadosQuadro.DISJUNTOR > correnteMaxima * 1.25) {
            alertas.push({
                tipo: 'alerta',
                mensagem: `Disjuntor muito grande para o cabo dimensionado`,
                severidade: 'alta'
            });
        }

        return alertas;
    }

    // Simular diferentes cenários
    simularCenario(dadosBase, variacoes) {
        const resultados = [];
        
        variacoes.forEach(variacao => {
            const novosDados = {
                ...dadosBase,
                fd: variacao.fd || dadosBase.fd,
                fp: variacao.fp || dadosBase.fp,
                distancia: variacao.distancia || dadosBase.distancia
            };

            try {
                const resultado = this.calcularDimensionamento(
                    `${dadosBase.DESCRIÇÃO} - ${variacao.nome}`,
                    novosDados.fp,
                    novosDados.fd,
                    novosDados.distancia,
                    novosDados['ATIVA-R'],
                    novosDados['ATIVA-S'],
                    novosDados['ATIVA-T'],
                    novosDados['TENSÃO FASE (V)']
                );

                resultados.push({
                    cenario: variacao.nome,
                    dados: resultado,
                    variacao: variacao
                });
            } catch (error) {
                console.error(`Erro na simulação ${variacao.nome}:`, error);
            }
        });

        return resultados;
    }
}

// Função global para ser chamada pelo app principal
function calcularDimensionamento(nomeQuadro, fp, fd, dist, pr, ps, pt, tensao) {
    const calculadora = new CalculosEletricos();
    return calculadora.calcularDimensionamento(nomeQuadro, fp, fd, dist, pr, ps, pt, tensao);
}

// Função para análise do sistema completo
function analisarSistema(dadosQuadros) {
    const calculadora = new CalculosEletricos();
    return calculadora.calcularAnaliseSistema(dadosQuadros);
}

// Função para verificar conformidade de um quadro
function verificarConformidadeQuadro(dadosQuadro) {
    const calculadora = new CalculosEletricos();
    return calculadora.verificarConformidade(dadosQuadro);

}




