document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('dem-residencial-entries');

    if (!container) {
        return;
    }

    const entries = [
        { key: 'a', descricao: 'circuitos de iluminação e tomadas', singleInput: true },
        { key: 'b1', descricao: 'chuveiros, torneiras e cafeteiras' },
        { key: 'b2', descricao: 'aquecedores de água' },
        { key: 'b3', descricao: 'fornos, fogões e aparelhos tipo "Grill"' },
        { key: 'b4', descricao: 'máquinas de lavar e secar' },
        { key: 'b5', descricao: 'demais aparelhos' },
        { key: 'c', descricao: 'condicionadores de ar' },
        { key: 'd', descricao: 'motores elétricos' },
        { key: 'e', descricao: 'máquinas de solda' },
        { key: 'f', descricao: 'demanda de equipamentos especiais' }
    ];

    const formWrapper = document.createElement('div');
    formWrapper.className = 'row g-3';

    const calcularFatorDemandaA = (cargaInstalada) => {
        if (cargaInstalada <= 1000) return 0.86;
        if (cargaInstalada <= 2000) return 0.81;
        if (cargaInstalada <= 3000) return 0.76;
        if (cargaInstalada <= 4000) return 0.72;
        if (cargaInstalada <= 5000) return 0.68;
        if (cargaInstalada <= 6000) return 0.64;
        if (cargaInstalada <= 7000) return 0.60;
        if (cargaInstalada <= 8000) return 0.57;
        if (cargaInstalada <= 9000) return 0.54;
        if (cargaInstalada <= 10000) return 0.52;
        return 0.45;
    };

    const calcularFatorDemandaPorQuantidade = (quantidade) => {
        if (quantidade <= 0) return 0;
        if (quantidade === 1) return 1;
        if (quantidade === 2) return 0.92;
        if (quantidade === 3) return 0.84;
        if (quantidade === 4) return 0.76;
        if (quantidade === 5) return 0.70;
        if (quantidade === 6) return 0.65;
        if (quantidade === 7) return 0.60;
        if (quantidade === 8) return 0.57;
        if (quantidade === 9) return 0.54;
        if (quantidade === 10) return 0.52;
        if (quantidade === 11) return 0.49;
        if (quantidade === 12) return 0.48;
        if (quantidade === 13) return 0.46;
        if (quantidade === 14) return 0.45;
        if (quantidade === 15) return 0.44;
        if (quantidade === 16) return 0.43;
        if (quantidade === 17) return 0.42;
        if (quantidade === 18) return 0.41;
        if (quantidade === 19) return 0.40;
        if (quantidade === 20) return 0.40;
        if (quantidade === 21) return 0.39;
        if (quantidade === 22) return 0.39;
        if (quantidade === 23) return 0.39;
        if (quantidade === 24) return 0.38;
        if (quantidade === 25) return 0.38;
        if (quantidade <= 30) return 0.37;
        if (quantidade <= 40) return 0.36;
        if (quantidade <= 50) return 0.35;
        if (quantidade <= 60) return 0.34;
        return 0.33;
    };



    const calcularFatorDemandaB3 = (quantidade, potenciaW) => {
        if (quantidade <= 0 || potenciaW <= 0) return 0;

        const fatoresAte35kW = { 1: 0.8, 2: 0.75, 3: 0.7, 4: 0.66, 5: 0.62, 6: 0.59, 7: 0.56, 8: 0.53, 9: 0.51, 10: 0.49 };
        const fatoresAcima35kW = { 1: 0.8, 2: 0.65, 3: 0.55, 4: 0.5, 5: 0.45, 6: 0.43, 7: 0.4, 8: 0.36, 9: 0.35, 10: 0.34 };
        const limite = Math.min(quantidade, 10);
        const tabela = potenciaW <= 3500 ? fatoresAte35kW : fatoresAcima35kW;

        return tabela[limite] ?? 0;
    };

    const formatarW = (valor) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} W`;

    const tabelasLigacao = {
        monofasico: {
            label: 'Monofásico',
            unidade: 'Carga instalada',
            limiteSemAtendimento: 10000,
            faixas: [
                { min: 0, max: 1270, disjuntor: '10A', condutor: '4mm²' },
                { min: 1270, max: 1905, disjuntor: '16A', condutor: '4mm²', minExclusivo: true },
                { min: 1905, max: 2540, disjuntor: '20A', condutor: '4mm²', minExclusivo: true },
                { min: 2540, max: 3175, disjuntor: '25A', condutor: '4mm²', minExclusivo: true },
                { min: 3175, max: 3810, disjuntor: '32A', condutor: '6mm²', minExclusivo: true },
                { min: 3810, max: 5000, disjuntor: '40A', condutor: '6mm²', minExclusivo: true },
                { min: 5000, max: 6350, disjuntor: '50A', condutor: '10mm²', minExclusivo: true },
                { min: 6350, max: 10000, disjuntor: '63A', condutor: '16mm²', minExclusivo: true }
            ]
        },
        bifasico: {
            label: 'Bifásico',
            unidade: 'Carga instalada',
            limiteSemAtendimento: 15000,
            faixas: [
                { min: 0, max: 2220, disjuntor: '10A', condutor: '4mm²' },
                { min: 2220, max: 3300, disjuntor: '16A', condutor: '4mm²', minExclusivo: true },
                { min: 3300, max: 4400, disjuntor: '20A', condutor: '4mm²', minExclusivo: true },
                { min: 4400, max: 5500, disjuntor: '25A', condutor: '4mm²', minExclusivo: true },
                { min: 5500, max: 6600, disjuntor: '32A', condutor: '6mm²', minExclusivo: true },
                { min: 6600, max: 8800, disjuntor: '40A', condutor: '6mm²', minExclusivo: true },
                { min: 8800, max: 11000, disjuntor: '50A', condutor: '10mm²', minExclusivo: true },
                { min: 11000, max: 15000, disjuntor: '63A', condutor: '16mm²', minExclusivo: true }
            ]
        },
        trifasico: {
            label: 'Trifásico',
            unidade: 'Demanda',
            limiteSemAtendimento: null,
            faixas: [
                { min: 0, max: 5710, disjuntor: '16A', condutor: '4mm²' },
                { min: 5710, max: 9520, disjuntor: '25A', condutor: '4mm²', minExclusivo: true },
                { min: 9520, max: 11430, disjuntor: '32A', condutor: '4mm²', minExclusivo: true },
                { min: 11430, max: 15240, disjuntor: '40A', condutor: '6mm²', minExclusivo: true },
                { min: 15240, max: 19050, disjuntor: '50A', condutor: '10mm²', minExclusivo: true },
                { min: 19050, max: 23000, disjuntor: '63A', condutor: '16mm²', minExclusivo: true },
                { min: 23000, max: 27000, disjuntor: '70A', condutor: '16mm²', minExclusivo: true },
                { min: 27000, max: 34200, disjuntor: '90A', condutor: '25mm²', minExclusivo: true },
                { min: 34200, max: 38000, disjuntor: '100A', condutor: '25mm²', minExclusivo: true },
                { min: 38000, max: 47000, disjuntor: '120A', condutor: '35mm²', minExclusivo: true },
                { min: 47000, max: 57000, disjuntor: '150A', condutor: '50mm²', minExclusivo: true },
                { min: 57000, max: 66000, disjuntor: '175A', condutor: '70mm²', minExclusivo: true },
                { min: 66000, max: 75000, disjuntor: '200A', condutor: '95mm²', minExclusivo: true }
            ]
        }
    };

    const obterRecomendacaoLigacao = (tipo, valorBase) => {
        const tabela = tabelasLigacao[tipo];

        if (!tabela || valorBase <= 0) {
            return `${tabela?.label || 'Sistema'}: informe um valor maior que zero para calcular a recomendação.`;
        }

        const faixa = tabela.faixas.find((item) => {
            const atendeMinimo = item.minExclusivo ? valorBase > item.min : valorBase >= item.min;
            return atendeMinimo && valorBase <= item.max;
        });

        if (faixa) {
            return `${tabela.label}: ${tabela.unidade} de ${formatarW(valorBase)} → Disjuntor recomendado: ${faixa.disjuntor} | Cabo recomendado: ${faixa.condutor}.`;
        }

        if (tabela.limiteSemAtendimento !== null && valorBase > tabela.limiteSemAtendimento) {
            return `${tabela.label}: para ${tabela.unidade.toLowerCase()} acima de ${formatarW(tabela.limiteSemAtendimento)}, sem disjuntor/cabo padrão nesta tabela.`;
        }

        return `${tabela.label}: valor fora da faixa cadastrada. Revise a entrada.`;
    };

    const resultadoWrapper = document.createElement('div');
    resultadoWrapper.className = 'mt-4 p-3 rounded';
    resultadoWrapper.style.background = 'rgba(49, 130, 206, 0.12)';
    resultadoWrapper.style.border = '1px solid var(--accent-blue)';

    const resultadoTitulo = document.createElement('h6');
    resultadoTitulo.className = 'mb-2';
    resultadoTitulo.textContent = 'Demanda calculada';

    const resultadoA = document.createElement('p');
    resultadoA.className = 'mb-1';

    const resultadoB1 = document.createElement('p');
    resultadoB1.className = 'mb-1';

    const resultadoB2 = document.createElement('p');
    resultadoB2.className = 'mb-1';

    const resultadoB3 = document.createElement('p');
    resultadoB3.className = 'mb-1';

    const resultadoB4 = document.createElement('p');
    resultadoB4.className = 'mb-1';

    const resultadoB5 = document.createElement('p');
    resultadoB5.className = 'mb-1';

    const resultadoC = document.createElement('p');
    resultadoC.className = 'mb-1';
    
    const resultadoTotal = document.createElement('p');
    resultadoTotal.className = 'mb-1 fw-bold';

    const resultadoMonofasico = document.createElement('p');
    resultadoMonofasico.className = 'mb-1';

    const resultadoBifasico = document.createElement('p');
    resultadoBifasico.className = 'mb-1';

    const resultadoTrifasico = document.createElement('p');
    resultadoTrifasico.className = 'mb-1';

    const resultadoObs = document.createElement('small');
    resultadoObs.className = 'text-muted';
    resultadoObs.textContent = 'No momento, o total considera a demanda de a, b1, b2, b3, b4, b5 e c. Os itens d, e e f serão somados nas próximas etapas.';

    resultadoWrapper.appendChild(resultadoTitulo);
    resultadoWrapper.appendChild(resultadoA);
    resultadoWrapper.appendChild(resultadoB1);
    resultadoWrapper.appendChild(resultadoB2);
    resultadoWrapper.appendChild(resultadoB3);
    resultadoWrapper.appendChild(resultadoB4);
    resultadoWrapper.appendChild(resultadoB5);
    resultadoWrapper.appendChild(resultadoC);
    resultadoWrapper.appendChild(resultadoTotal);
    resultadoWrapper.appendChild(resultadoMonofasico);
    resultadoWrapper.appendChild(resultadoBifasico);
    resultadoWrapper.appendChild(resultadoTrifasico);
    resultadoWrapper.appendChild(resultadoObs);

    const calcularDemandaPorQuantidade = (key) => {
        const potencia = Number(document.getElementById(`dem-${key}-potencia`)?.value || 0);
        const quantidade = Math.floor(Number(document.getElementById(`dem-${key}-quantidade`)?.value || 0));

        if (potencia <= 0 || quantidade <= 0) {
            return { potencia, quantidade, fator: 0, demanda: 0 };
        }

        const cargaInstalada = potencia;
        const fator = calcularFatorDemandaPorQuantidade(quantidade);
        return { potencia, quantidade, fator, demanda: cargaInstalada * fator };
    };

    const calcularDemandaB3 = () => {
        const potencia = Number(document.getElementById('dem-b3-potencia')?.value || 0);
        const quantidade = Math.floor(Number(document.getElementById('dem-b3-quantidade')?.value || 0));

        if (potencia <= 0 || quantidade <= 0) {
            return { potencia, quantidade, fator: 0, demanda: 0 };
        }

        const cargaInstalada = potencia;
        const fator = calcularFatorDemandaB3(quantidade, potencia);

        return { potencia, quantidade, fator, demanda: cargaInstalada * fator };
    };

    const atualizarResultados = () => {
        const inputCI = document.getElementById('dem-a-carga-instalada');
        const cargaInstalada = Number(inputCI?.value || 0);
        const fdA = cargaInstalada > 0 ? calcularFatorDemandaA(cargaInstalada) : 0;
        const demandaA = cargaInstalada > 0 ? cargaInstalada * fdA : 0;

        const demandaB1 = calcularDemandaPorQuantidade('b1');
        const demandaB2 = calcularDemandaPorQuantidade('b2');
        const demandaB3 = calcularDemandaB3();
        const demandaB4 = calcularDemandaPorQuantidade('b4');
        const demandaB5 = calcularDemandaPorQuantidade('b5');
        const demandaC = calcularDemandaPorQuantidade('c');

        resultadoA.textContent = `a = ${formatarW(demandaA)} (CI: ${formatarW(cargaInstalada)} × FD: ${fdA.toFixed(2)})`;
        resultadoB1.textContent = `b1 = ${formatarW(demandaB1.demanda)} (CI: ${formatarW(demandaB1.potencia)} × FD: ${demandaB1.fator.toFixed(2)})`;
        resultadoB2.textContent = `b2 = ${formatarW(demandaB2.demanda)} (CI: ${formatarW(demandaB2.potencia)} × FD: ${demandaB2.fator.toFixed(2)})`;
        resultadoB3.textContent = `b3 = ${formatarW(demandaB3.demanda)} (CI: ${formatarW(demandaB3.potencia)} × FD: ${demandaB3.fator.toFixed(2)} | Potência ${demandaB3.potencia <= 3500 ? 'até 3,5 kW' : 'acima de 3,5 kW'})`;
        resultadoB4.textContent = `b4 = ${formatarW(demandaB4.demanda)} (CI: ${formatarW(demandaB4.potencia)} × FD: ${demandaB4.fator.toFixed(2)})`;
        resultadoB5.textContent = `b5 = ${formatarW(demandaB5.demanda)} (CI: ${formatarW(demandaB5.potencia)} × FD: ${demandaB5.fator.toFixed(2)})`;
        resultadoC.textContent = `c = ${formatarW(demandaC.demanda)} (CI: ${formatarW(demandaC.potencia)} × FD: ${demandaC.fator.toFixed(2)})`;

        const total = demandaA + demandaB1.demanda + demandaB2.demanda + demandaB3.demanda + demandaB4.demanda + demandaB5.demanda + demandaC.demanda;
        const usaApenasGrupoA = demandaA > 0
            && demandaB1.demanda === 0
            && demandaB2.demanda === 0
            && demandaB3.demanda === 0
            && demandaB4.demanda === 0
            && demandaB5.demanda === 0
            && demandaC.demanda === 0;

        resultadoTotal.textContent = `Demanda total (a+b1+b2+b3+b4+b5+c+d+e+f): ${formatarW(total)}`;
        resultadoMonofasico.textContent = usaApenasGrupoA
            ? obterRecomendacaoLigacao('monofasico', total)
            : 'Monofásico: recomendação disponível apenas quando houver somente carga do item a (circuitos de iluminação e tomadas).';
        resultadoBifasico.textContent = obterRecomendacaoLigacao('bifasico', total);
        resultadoTrifasico.textContent = obterRecomendacaoLigacao('trifasico', total);
    };

    entries.forEach((entry) => {
        const block = document.createElement('div');
        block.className = 'col-12';

        const card = document.createElement('div');
        card.className = 'p-3 rounded';
        card.style.background = 'var(--bg-card)';

        const title = document.createElement('div');
        title.className = 'mb-2';
        title.innerHTML = `<strong>${entry.key}</strong> = ${entry.descricao};`;
        card.appendChild(title);

        const row = document.createElement('div');
        row.className = 'row g-2';

        if (entry.singleInput) {
            row.innerHTML = `
                <div class="col-12 col-md-6">
                    <label for="dem-${entry.key}-carga-instalada" class="form-label mb-1">Carga instalada (W)</label>
                    <input type="number" min="0" step="any" class="form-control" id="dem-${entry.key}-carga-instalada" placeholder="Ex.: 2500">
                </div>
            `;
        } else {
            row.innerHTML = `
                <div class="col-12 col-md-6">
                    <label for="dem-${entry.key}-potencia" class="form-label mb-1">Potência total dos equipamentos (W)</label>
                    <input type="number" min="0" step="any" class="form-control" id="dem-${entry.key}-potencia" placeholder="Ex.: 1500">
                </div>
                <div class="col-12 col-md-6">
                    <label for="dem-${entry.key}-quantidade" class="form-label mb-1">Quantidade de equipamentos</label>
                    <input type="number" min="0" step="1" class="form-control" id="dem-${entry.key}-quantidade" placeholder="Ex.: 2">
                </div>
            `;
        }

        card.appendChild(row);
        block.appendChild(card);
        formWrapper.appendChild(block);
    });

    container.appendChild(formWrapper);
    container.appendChild(resultadoWrapper);

    document.querySelectorAll('#dem-residencial-entries input').forEach((input) => {
        input.addEventListener('input', atualizarResultados);
    });

    atualizarResultados();
});
