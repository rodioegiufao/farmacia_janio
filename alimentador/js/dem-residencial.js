document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('dem-residencial-entries');

    if (!container) {
        return;
    }

    const entries = [
        { key: 'a', descricao: 'circuitos de iluminação e tomadas' },
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

    const listGroup = document.createElement('div');
    listGroup.className = 'list-group';

    entries.forEach((entry) => {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.style.background = 'var(--bg-card)';
        item.style.color = 'var(--text-light)';
        item.style.borderColor = 'var(--border-color)';
        item.innerHTML = `<strong>${entry.key}</strong> = ${entry.descricao};`;
        listGroup.appendChild(item);
    });

    container.appendChild(listGroup);
});