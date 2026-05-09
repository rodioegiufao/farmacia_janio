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

    const formatarW = (valor) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} W`;

    const resultadoWrapper = document.createElement('div');
    resultadoWrapper.className = 'mt-4 p-3 rounded';
    resultadoWrapper.style.background = 'rgba(49, 130, 206, 0.12)';
    resultadoWrapper.style.border = '1px solid var(--accent-blue)';

    const resultadoTitulo = document.createElement('h6');
    resultadoTitulo.className = 'mb-2';
    resultadoTitulo.textContent = 'Demanda calculada';

    const resultadoA = document.createElement('p');
    resultadoA.className = 'mb-1';

    const resultadoTotal = document.createElement('p');
    resultadoTotal.className = 'mb-1 fw-bold';

    const resultadoObs = document.createElement('small');
    resultadoObs.className = 'text-muted';
    resultadoObs.textContent = 'No momento, o total considera apenas a demanda de a. Os itens b1, b2, b3, b4, b5, c, d, e e f serão somados nas próximas etapas.';

    resultadoWrapper.appendChild(resultadoTitulo);
    resultadoWrapper.appendChild(resultadoA);
    resultadoWrapper.appendChild(resultadoTotal);
    resultadoWrapper.appendChild(resultadoObs);

    const atualizarResultados = () => {
        const inputCI = document.getElementById('dem-a-carga-instalada');
        const cargaInstalada = Number(inputCI?.value || 0);
        const fdA = cargaInstalada > 0 ? calcularFatorDemandaA(cargaInstalada) : 0;
        const demandaA = cargaInstalada > 0 ? cargaInstalada * fdA : 0;

        resultadoA.textContent = `a = ${formatarW(demandaA)} (CI: ${formatarW(cargaInstalada)} × FD: ${fdA.toFixed(2)})`;
        resultadoTotal.textContent = `Demanda total (a+b1+b2+b3+b4+b5+c+d+e+f): ${formatarW(demandaA)}`;
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
                    <label for="dem-${entry.key}-potencia" class="form-label mb-1">Potência (W)</label>
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

    document.getElementById('dem-a-carga-instalada')?.addEventListener('input', atualizarResultados);
    atualizarResultados();
});
