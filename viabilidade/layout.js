// =====================================================================
// LAYOUT v3 — grupos de documentos, abas de origem dos dados, seções
// recolhíveis com status e painel de resumo (à esquerda, fixo na rolagem).
// Só apresentação: a lógica de campos, validação e geração continua no
// script.js; este arquivo apenas lê o estado do formulário.
// =====================================================================

function lyCampoVisivel(el) {
    if (!el) return false;
    const grupo = el.closest('.form-group');
    if (grupo && (grupo.classList.contains('hidden') || grupo.closest('.hidden'))) return false;
    return !el.closest('section.hidden');
}

// Campos obrigatórios visíveis de um contêiner (ou do formulário inteiro)
function lyCamposObrigatorios(raiz) {
    return [...raiz.querySelectorAll('input[required], select[required]')]
        .filter(el => el.type !== 'file' && lyCampoVisivel(el));
}

function lyValorLegivel(el) {
    if (el.tagName === 'SELECT') {
        if (!el.value) return '';
        return el.selectedOptions[0]?.textContent.trim() || el.value;
    }
    if (el.type === 'hidden' || el.type === 'file' || el.type === 'checkbox') return '';
    if (el.type === 'date' && el.value) return el.value.split('-').reverse().join('/');
    return String(el.value || '').trim();
}

// ---------------------------------------------------------------- etapa 1: grupos
function lyAtualizarGrupos() {
    document.querySelectorAll('.doc-grupo').forEach(g => {
        const caixas = [...g.querySelectorAll('input[type="checkbox"]')];
        const todos = caixas.length > 0 && caixas.every(c => c.checked);
        const btn = g.querySelector('.doc-grupo-btn');
        if (btn) btn.textContent = todos ? 'Desmarcar' : 'Marcar todos';
        g.classList.toggle('ativo', caixas.some(c => c.checked));
        caixas.forEach(c => c.closest('.doc-opcao')?.classList.toggle('marcada', c.checked));
    });
}

function lySetupGrupos() {
    document.querySelectorAll('.doc-grupo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const g = btn.closest('.doc-grupo');
            const caixas = [...g.querySelectorAll('input[type="checkbox"]')];
            const marcar = !caixas.every(c => c.checked);
            caixas.forEach(c => { c.checked = marcar; });
            document.getElementById('document-form')?.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });
}

// ---------------------------------------------------------------- etapa 2: abas
function lySetupAbas() {
    const abas = [...document.querySelectorAll('.aba-origem')];
    const ativar = aba => {
        abas.forEach(a => {
            const ativa = a === aba;
            a.classList.toggle('ativa', ativa);
            a.setAttribute('aria-selected', String(ativa));
            a.tabIndex = ativa ? 0 : -1;
            document.getElementById(a.getAttribute('aria-controls'))?.classList.toggle('hidden', !ativa);
        });
    };
    abas.forEach((aba, i) => {
        aba.addEventListener('click', () => ativar(aba));
        aba.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const prox = abas[(i + (e.key === 'ArrowRight' ? 1 : abas.length - 1)) % abas.length];
            ativar(prox);
            prox.focus();
        });
    });
}

// ---------------------------------------------------------------- seções recolhíveis
function lySetupSecoes() {
    document.querySelectorAll('#document-form section.form-section').forEach((secao, n) => {
        if (secao.dataset.lyPronta) return;
        secao.dataset.lyPronta = '1';
        const h2 = secao.querySelector(':scope > h2');
        if (!h2) return;

        const corpo = document.createElement('div');
        corpo.className = 'secao-corpo';
        corpo.id = `secao-corpo-${n}`;
        [...secao.childNodes].filter(no => no !== h2).forEach(no => corpo.appendChild(no));

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'secao-toggle';
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-controls', corpo.id);
        btn.innerHTML = `<i class="fas fa-chevron-down secao-seta" aria-hidden="true"></i>
            <span class="secao-titulo">${h2.innerHTML}</span>
            <span class="secao-status"></span>`;
        btn.addEventListener('click', () => lyAlternarSecao(secao));

        const resumo = document.createElement('div');
        resumo.className = 'secao-resumo';

        h2.replaceWith(btn);
        secao.appendChild(resumo);
        secao.appendChild(corpo);
    });
}

function lyAlternarSecao(secao, aberta) {
    const abrir = aberta ?? secao.classList.contains('recolhida');
    secao.classList.toggle('recolhida', !abrir);
    secao.querySelector('.secao-toggle')?.setAttribute('aria-expanded', String(abrir));
}

function lyStatusSecao(secao) {
    const campos = lyCamposObrigatorios(secao);
    const faltam = campos.filter(el => !String(el.value || '').trim()).length;
    return { total: campos.length, faltam };
}

function lyAtualizarSecoes() {
    document.querySelectorAll('#document-form section.form-section').forEach(secao => {
        const st = secao.querySelector('.secao-status');
        if (!st) return;
        const { total, faltam } = lyStatusSecao(secao);
        secao.classList.toggle('completa', total > 0 && faltam === 0);
        st.className = `secao-status ${faltam ? 'pendente' : 'ok'}`;
        st.innerHTML = faltam
            ? `Faltam ${faltam}`
            : '<i class="fas fa-check" aria-hidden="true"></i> Completa';

        // Linha de resumo para quando a seção estiver recolhida
        const valores = [...secao.querySelectorAll('.secao-corpo input, .secao-corpo select')]
            .filter(el => lyCampoVisivel(el) && el.type !== 'checkbox')
            .map(lyValorLegivel).filter(Boolean).slice(0, 4);
        const r = secao.querySelector('.secao-resumo');
        if (r) r.textContent = valores.join(' · ');
    });
}

// Recolhe as seções completas e abre as pendentes (após carregar dados, nunca durante a digitação)
function lyRecolherCompletas() {
    document.querySelectorAll('#document-form section.form-section').forEach(secao => {
        const { total, faltam } = lyStatusSecao(secao);
        lyAlternarSecao(secao, !(total > 0 && faltam === 0));
    });
}

// ---------------------------------------------------------------- resumo
function lyAtualizarResumo() {
    const tipos = typeof getTiposSelecionados === 'function' ? getTiposSelecionados() : [];

    const docs = document.getElementById('resumo-docs');
    if (docs) {
        docs.innerHTML = tipos.length
            ? DOCUMENTOS.filter(d => tipos.includes(d.tipo)).map(d => `<span class="resumo-chip">${escapeHtml(d.nome)}</span>`).join('')
            : '<span class="resumo-vazio">Nenhum documento marcado.</span>';
    }

    const form = document.getElementById('document-form');
    const campos = form ? lyCamposObrigatorios(form) : [];
    const preenchidos = campos.filter(el => String(el.value || '').trim()).length;
    const txt = document.getElementById('resumo-progresso-txt');
    const barra = document.getElementById('resumo-progresso-barra');
    if (txt) txt.textContent = campos.length ? `${preenchidos} de ${campos.length}` : '–';
    if (barra) {
        const pct = campos.length ? Math.round(preenchidos / campos.length * 100) : 0;
        barra.style.width = `${pct}%`;
        barra.classList.toggle('completo', campos.length > 0 && preenchidos === campos.length);
    }

    const btn = document.getElementById('generate-btn');
    if (btn && !btn.querySelector('.fa-spinner')) btn.disabled = tipos.length === 0;
}

function lyRascunhoSalvo() {
    const el = document.getElementById('resumo-rascunho');
    if (!el) return;
    const agora = new Date();
    el.textContent = `Rascunho salvo às ${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}.`;
}

// Chamado ao fim de atualizarFormulario()
function lyAtualizar() {
    lyAtualizarGrupos();
    lyAtualizarSecoes();
    lyAtualizarResumo();
}

function lySetup() {
    lySetupGrupos();
    lySetupAbas();
    lySetupSecoes();
    document.getElementById('resumo-salvar')?.addEventListener('click', () => document.getElementById('btn-salvar-projeto')?.click());
    document.getElementById('resumo-exportar')?.addEventListener('click', () => document.getElementById('btn-excel-exportar')?.click());
    lyAtualizar();
}

document.addEventListener('DOMContentLoaded', lySetup);
