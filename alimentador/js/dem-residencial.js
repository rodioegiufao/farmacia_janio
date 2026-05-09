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

    entries.forEach((entry) => {
        const block = document.createElement('div');
        block.className = 'col-12';

        const card = document.createElement('div');
        card.className = 'p-3 rounded border';
        card.style.background = 'var(--bg-card)';
        card.style.borderColor = 'var(--border-color)';

        const title = document.createElement('div');
        title.className = 'mb-2';
        title.innerHTML = `<strong>${entry.key}</strong> = ${entry.descricao};`;
        card.appendChild(title);

        const row = document.createElement('div');
        row.className = 'row g-2';

        if (entry.singleInput) {
            row.innerHTML = `
                <div class="col-12 col-md-6">
                    <label for="dem-${entry.key}-quantidade" class="form-label mb-1">Quantidade de circuitos</label>
                    <input type="number" min="0" step="1" class="form-control" id="dem-${entry.key}-quantidade" placeholder="Ex.: 1">
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
});
