// =====================================================================
// MEMORIAL DESCRITIVO SOLAR — cálculo, gráficos e inserção de imagens
// Porta e corrige a antiga calculadora_solar.py (Streamlit):
//  - usa a irradiação REAL de cada mês (CRESESB) em vez de fatores sazonais genéricos
//  - usa os dias reais de cada mês em vez de 30,44
//  - mantém a fórmula: E = kWp × H × dias × η_inv × PR
//  - acrescenta verificação de strings, queda de tensão, cabos e proteções
// =====================================================================

const FV_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FV_DIAS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// CRESESB SunData v3.0 — Boa Vista/RR (mesmos valores do memorial do IPER)
const FV_IRR_BOA_VISTA = [4.60, 4.73, 5.02, 4.84, 4.45, 4.59, 4.71, 5.15, 5.53, 5.44, 5.15, 4.68];

// ABNT NBR 5410 Tabela 37 — cobre, EPR/XLPE 90 °C, método B1, 3 condutores carregados (A)
// (mesma tabela já usada em I_CAB_220/I_CAB_380 do memorial de subestação)
const FV_IZ_B1_EPR = {
    1.5: 20, 2.5: 28, 4: 37, 6: 48, 10: 66, 16: 88, 25: 117, 35: 144, 50: 175,
    70: 222, 95: 269, 120: 312, 150: 358, 185: 408, 240: 481, 300: 553
};
const FV_DISJUNTORES = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 150, 160, 175, 200, 225, 250, 300, 350, 400, 500, 630];
const FV_SECC_CC = [16, 25, 32, 40, 50, 63];
const FV_DPS_CC_V = [600, 1000, 1100, 1200, 1500];
const FV_RHO = 0.0179;              // Ω·mm²/m (cobre)
const FV_FATOR_DISJ_CA = 1.25;      // In ≥ 1,25 × Ib (carga contínua)
const FV_QUEDA_MAX_CA = 2;          // % (trecho inversor → ponto de conexão)

// Exemplo: usina do IPER (memorial assinado)
const FV_EXEMPLO_IPER = {
    fv_mod_marca: 'OSDA', fv_mod_modelo: 'ODA570M-36V-MH', fv_mod_tec: 'Monocristalino tipo P',
    fv_mod_pot: '570', fv_mod_voc: '50,74', fv_mod_vmp: '42,07', fv_mod_isc: '14,31', fv_mod_imp: '13,55',
    fv_mod_efic: '22,07', fv_mod_coef_p: '-0,30', fv_mod_coef_voc: '-0,25', fv_mod_coef_isc: '0,046',
    fv_mod_noct: '45', fv_mod_comp: '2278', fv_mod_larg: '1134', fv_mod_alt: '35', fv_mod_peso: '28',
    fv_inv_marca: 'GROWATT', fv_inv_modelo: 'MAC 60KTL3-X LV', fv_inv_qtd: '2', fv_inv_pot: '60',
    fv_inv_pot_max: '66,6', fv_inv_vmax: '1100', fv_inv_vmppt_min: '250', fv_inv_vmppt_max: '1000',
    fv_inv_nmppt: '4', fv_inv_imppt: '50', fv_inv_isc_mppt: '50', fv_inv_iac: '96,6', fv_inv_efic: '98,8',
    fv_inv_ip: 'IP66', fv_inclinacao: '10', fv_azimute: '8', fv_cabo_cc: '6', fv_comp_ca: '12',
    fv_strings_json: JSON.stringify([
        [1, 1, 20, 86.757], [1, 1, 20, 80.333], [1, 2, 20, 73.282], [1, 2, 20, 67.452],
        [1, 3, 20, 75.526], [1, 3, 16, 69.52], [2, 1, 16, 64.185], [2, 1, 16, 59.554],
        [2, 2, 16, 29], [2, 2, 10, 31], [2, 3, 12, 31], [2, 3, 10, 28.61]
    ].map(([inv, mppt, n, comp]) => ({ inv, mppt, n, comp })))
};

// ---------------------------------------------------------------- utilitários
function fvNum(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim().replace(/\s/g, '');
    if (!s) return NaN;
    // "1.234,56" → 1234.56 ; "1234.56" → 1234.56 ; "12,5" → 12.5
    const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    return Number(normal);
}

function fvFmt(n, dec = 2) {
    if (!isFinite(n)) return '–';
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fvVal(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

const FV_EXTENSO = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
function fvExtenso(n) {
    return n >= 0 && n <= 10 ? `${String(n).padStart(2, '0')} (${FV_EXTENSO[n]})` : String(n);
}

function fvProximo(lista, minimo) {
    return lista.find(v => v >= minimo - 1e-9) ?? null;
}

// ---------------------------------------------------------------- strings (editor)
function fvLerStrings() {
    try {
        const arr = JSON.parse(fvVal('fv_strings_json') || '[]');
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function fvGravarStrings(lista) {
    const hidden = document.getElementById('fv_strings_json');
    if (hidden) hidden.value = lista.length ? JSON.stringify(lista) : '';
}

function fvRenderStrings() {
    const tbody = document.getElementById('fv-strings-body');
    if (!tbody) return;
    const lista = fvLerStrings();
    tbody.innerHTML = '';
    lista.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fv-str-id">STR${i + 1}</td>
            <td><input type="text" inputmode="numeric" data-k="inv" value="${s.inv ?? ''}" aria-label="Inversor da série ${i + 1}"></td>
            <td><input type="text" inputmode="numeric" data-k="mppt" value="${s.mppt ?? ''}" aria-label="MPPT da série ${i + 1}"></td>
            <td><input type="text" inputmode="numeric" data-k="n" value="${s.n ?? ''}" aria-label="Módulos da série ${i + 1}"></td>
            <td><input type="text" inputmode="decimal" data-k="comp" value="${s.comp !== undefined && s.comp !== '' ? String(s.comp).replace('.', ',') : ''}" aria-label="Comprimento do cabo da série ${i + 1}"></td>
            <td class="fv-str-actions">
                <button type="button" class="fv-str-btn" data-acao="dup" title="Duplicar série"><i class="fas fa-clone"></i></button>
                <button type="button" class="fv-str-btn danger" data-acao="del" title="Remover série"><i class="fas fa-trash"></i></button>
            </td>`;
        tr.dataset.index = i;
        tbody.appendChild(tr);
    });
    const vazio = document.getElementById('fv-strings-vazio');
    if (vazio) vazio.classList.toggle('hidden', lista.length > 0);
}

function fvSetupStringsEditor() {
    const tbody = document.getElementById('fv-strings-body');
    if (!tbody || tbody.dataset.ready) return;
    tbody.dataset.ready = '1';

    tbody.addEventListener('input', e => {
        const tr = e.target.closest('tr');
        const k = e.target.dataset.k;
        if (!tr || !k) return;
        const lista = fvLerStrings();
        const item = lista[Number(tr.dataset.index)];
        if (!item) return;
        item[k] = k === 'comp' ? fvNum(e.target.value) : parseInt(e.target.value, 10);
        if (Number.isNaN(item[k])) item[k] = '';
        fvGravarStrings(lista);
    });

    tbody.addEventListener('click', e => {
        const btn = e.target.closest('button[data-acao]');
        if (!btn) return;
        const i = Number(btn.closest('tr').dataset.index);
        const lista = fvLerStrings();
        if (btn.dataset.acao === 'del') lista.splice(i, 1);
        if (btn.dataset.acao === 'dup') lista.splice(i + 1, 0, { ...lista[i] });
        fvGravarStrings(lista);
        fvRenderStrings();
        document.getElementById('document-form')?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    document.getElementById('fv-add-string')?.addEventListener('click', () => {
        const lista = fvLerStrings();
        const ultima = lista[lista.length - 1] || { inv: 1, mppt: 0, n: '', comp: '' };
        lista.push({ inv: ultima.inv || 1, mppt: (Number(ultima.mppt) || 0) + 1, n: ultima.n, comp: '' });
        fvGravarStrings(lista);
        fvRenderStrings();
        document.getElementById('document-form')?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    document.getElementById('fv-exemplo-btn')?.addEventListener('click', () => {
        if (!confirm('Preencher módulo, inversor e séries com os dados da usina do IPER (111,72 kWp)?')) return;
        Object.entries(FV_EXEMPLO_IPER).forEach(([id, v]) => {
            const el = document.getElementById(id);
            if (el) el.value = v;
        });
        fvRenderStrings();
        document.getElementById('document-form')?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    document.getElementById('fv-irr-padrao-btn')?.addEventListener('click', () => {
        FV_IRR_BOA_VISTA.forEach((v, i) => {
            const el = document.getElementById(`fv_irr_${i + 1}`);
            if (el) el.value = fvFmt(v, 2);
        });
        document.getElementById('document-form')?.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

function fvValidarStrings() {
    const lista = fvLerStrings();
    if (!lista.length) return 'Cadastre pelo menos uma série (string).';
    const qtdInv = parseInt(fvVal('fv_inv_qtd'), 10) || 0;
    const nMppt = parseInt(fvVal('fv_inv_nmppt'), 10) || 0;
    for (let i = 0; i < lista.length; i++) {
        const s = lista[i];
        const id = `STR${i + 1}`;
        if (!(s.n > 0)) return `${id}: informe a quantidade de módulos.`;
        if (!(s.inv > 0)) return `${id}: informe o inversor.`;
        if (!(s.mppt > 0)) return `${id}: informe o MPPT.`;
        if (!(s.comp > 0)) return `${id}: informe o comprimento do cabo CC.`;
        if (qtdInv && s.inv > qtdInv) return `${id}: inversor ${s.inv} não existe (são ${qtdInv}).`;
        if (nMppt && s.mppt > nMppt) return `${id}: MPPT ${s.mppt} não existe (o inversor tem ${nMppt}).`;
    }
    return null;
}

// ---------------------------------------------------------------- cálculo
function fvLerEntradas() {
    const n = id => fvNum(fvVal(id));
    return {
        mod: {
            marca: fvVal('fv_mod_marca'), modelo: fvVal('fv_mod_modelo'), tec: fvVal('fv_mod_tec'),
            pot: n('fv_mod_pot'), voc: n('fv_mod_voc'), vmp: n('fv_mod_vmp'), isc: n('fv_mod_isc'), imp: n('fv_mod_imp'),
            efic: n('fv_mod_efic'), coefP: n('fv_mod_coef_p'), coefVoc: n('fv_mod_coef_voc'), coefIsc: n('fv_mod_coef_isc'),
            noct: n('fv_mod_noct'), comp: n('fv_mod_comp'), larg: n('fv_mod_larg'), alt: n('fv_mod_alt'), peso: n('fv_mod_peso')
        },
        inv: {
            marca: fvVal('fv_inv_marca'), modelo: fvVal('fv_inv_modelo'), qtd: parseInt(fvVal('fv_inv_qtd'), 10),
            pot: n('fv_inv_pot'), potMax: n('fv_inv_pot_max'), vmax: n('fv_inv_vmax'),
            vmpptMin: n('fv_inv_vmppt_min'), vmpptMax: n('fv_inv_vmppt_max'), nmppt: parseInt(fvVal('fv_inv_nmppt'), 10),
            imppt: n('fv_inv_imppt'), iscMppt: n('fv_inv_isc_mppt'), iac: n('fv_inv_iac'), efic: n('fv_inv_efic'), ip: fvVal('fv_inv_ip')
        },
        strings: fvLerStrings(),
        inclinacao: n('fv_inclinacao'), azimute: n('fv_azimute'), pr: n('fv_pr'),
        tmin: n('fv_tmin'), tmax: n('fv_tmax'), cosphi: n('fv_cosphi') || 1, consumo: n('fv_consumo'),
        irr: FV_MESES.map((_, i) => n(`fv_irr_${i + 1}`)),
        tensao: fvVal('fv_tensao') || '220/127V', ligacao: fvVal('fv_ligacao'),
        caboCC: n('fv_cabo_cc'), caboCA: n('fv_cabo_ca'), compCA: n('fv_comp_ca')
    };
}

function fvCalcular(e = fvLerEntradas()) {
    const avisos = [];
    const { mod, inv } = e;

    // Potências e classificação
    const nMod = e.strings.reduce((s, x) => s + (Number(x.n) || 0), 0);
    const kWp = nMod * mod.pot / 1000;
    const potInvTotal = inv.qtd * inv.pot;
    const fdi = potInvTotal ? kWp / potInvTotal * 100 : NaN;
    // Potência instalada (REN 1.000): menor valor entre módulos e inversores
    const potInstalada = Math.min(kWp, potInvTotal || kWp);
    const classe = potInstalada <= 75 ? 'microgeração' : 'minigeração';
    const area = nMod * mod.comp * mod.larg / 1e6;

    // Geração mensal: E = kWp × H × dias × η_inv × PR
    const etaInv = inv.efic / 100;
    const pr = e.pr / 100;
    const meses = FV_MESES.map((mes, i) => {
        const h = e.irr[i];
        const geracao = kWp * h * FV_DIAS[i] * etaInv * pr;
        return { mes, dias: FV_DIAS[i], h, geracao };
    });
    const geracaoAnual = meses.reduce((s, m) => s + m.geracao, 0);
    const ghiMedia = e.irr.reduce((s, v) => s + v, 0) / 12;
    const iMax = e.irr.indexOf(Math.max(...e.irr));
    const iMin = e.irr.indexOf(Math.min(...e.irr));

    // Temperatura (coeficientes informados em %/°C; tensão cai com o calor)
    const bV = Math.abs(mod.coefVoc) / 100;
    const aI = Math.abs(mod.coefIsc) / 100;
    const fatorFrio = 1 + bV * (25 - e.tmin);
    const fatorQuente = 1 - bV * (e.tmax - 25);

    // Strings
    const strings = e.strings.map((s, i) => {
        const n = Number(s.n);
        return {
            id: `STR${i + 1}`, inv: Number(s.inv), mppt: Number(s.mppt), n, comp: Number(s.comp),
            destino: `INV${s.inv} – MPPT${s.mppt}`,
            pot: n * mod.pot / 1000,
            vmp: n * mod.vmp,
            vocMax: n * mod.voc * fatorFrio,
            vmpQuente: n * mod.vmp * fatorQuente,
            vmpFrio: n * mod.vmp * fatorFrio
        };
    });

    // Agrupamento por MPPT
    const porMppt = {};
    strings.forEach(s => {
        const k = `${s.inv}-${s.mppt}`;
        (porMppt[k] = porMppt[k] || []).push(s);
    });
    const maxParalelo = Math.max(0, ...Object.values(porMppt).map(g => g.length));
    const iMpptMax = maxParalelo * mod.imp;
    const iscMpptMax = maxParalelo * mod.isc * (1 + aI * (e.tmax - 25));

    // Strings de tamanhos diferentes no mesmo MPPT
    Object.entries(porMppt).forEach(([k, g]) => {
        const tamanhos = [...new Set(g.map(s => s.n))];
        if (tamanhos.length > 1) {
            const [iv, mp] = k.split('-');
            avisos.push(`INV${iv}/MPPT${mp} tem séries com quantidades diferentes de módulos (${tamanhos.join(' e ')}). Séries em paralelo no mesmo MPPT devem ter o mesmo número de módulos.`);
        }
    });

    const vocMaxGeral = Math.max(...strings.map(s => s.vocMax));
    const vmpQuenteMin = Math.min(...strings.map(s => s.vmpQuente));
    const vmpFrioMax = Math.max(...strings.map(s => s.vmpFrio));

    const ok = cond => (cond ? 'Atende' : 'NÃO ATENDE');
    const verif = [
        { criterio: `Maior Voc da série a ${fvFmt(e.tmin, 0)} °C`, calc: vocMaxGeral, lim: inv.vmax, cond: vocMaxGeral <= inv.vmax, u: 'V', op: '≤' },
        { criterio: `Menor Vmp da série a ${fvFmt(e.tmax, 0)} °C`, calc: vmpQuenteMin, lim: inv.vmpptMin, cond: vmpQuenteMin >= inv.vmpptMin, u: 'V', op: '≥' },
        { criterio: `Maior Vmp da série a ${fvFmt(e.tmin, 0)} °C`, calc: vmpFrioMax, lim: inv.vmpptMax, cond: vmpFrioMax <= inv.vmpptMax, u: 'V', op: '≤' },
        { criterio: `Corrente de operação por MPPT (${maxParalelo} série(s) em paralelo)`, calc: iMpptMax, lim: inv.imppt, cond: iMpptMax <= inv.imppt, u: 'A', op: '≤' },
        { criterio: `Corrente de curto-circuito por MPPT a ${fvFmt(e.tmax, 0)} °C`, calc: iscMpptMax, lim: inv.iscMppt, cond: iscMpptMax <= inv.iscMppt, u: 'A', op: '≤' }
    ].map(v => ({
        ...v,
        criterio: v.criterio,
        calculado: `${fvFmt(v.calc, 2)} ${v.u}`,
        limite: `${v.op} ${fvFmt(v.lim, 2)} ${v.u}`,
        status: ok(v.cond)
    }));
    verif.filter(v => !v.cond).forEach(v => avisos.push(`${v.criterio}: ${v.calculado} (limite ${v.limite}).`));
    if (fdi > 135) avisos.push(`Carregamento CC/CA de ${fvFmt(fdi, 1)}% está acima do usual (até ~135%). Confira com o fabricante do inversor.`);

    // Circuitos CC
    const circuitosCC = strings.map(s => ({
        de: 'Módulos', para: `INV${s.inv}-MPPT${s.mppt}-${s.id}`,
        pot: s.pot, corrente: mod.imp, tensao: s.vmp, secao: e.caboCC, comp: s.comp,
        queda: 2 * FV_RHO * s.comp * mod.imp / (e.caboCC * s.vmp) * 100
    }));
    circuitosCC.filter(c => c.queda > 3).forEach(c =>
        avisos.push(`Queda de tensão CC em ${c.para} de ${fvFmt(c.queda)}% (acima de 3%).`));

    // Circuito CA (por inversor)
    const vLinha = e.tensao.startsWith('380') ? 380 : 220;
    const vFase = vLinha === 380 ? 220 : 127;
    const ibCalc = inv.potMax * 1000 / (Math.sqrt(3) * vLinha * e.cosphi);
    if (isFinite(inv.iac) && inv.iac < ibCalc * 0.95) {
        avisos.push(`A corrente CA informada no datasheet (${fvFmt(inv.iac, 1)} A) é menor que a calculada para ${vLinha} V (${fvFmt(ibCalc, 1)} A). Confira se o modelo do inversor é o de ${e.tensao}. O cálculo usa o maior valor.`);
    }
    const ib = Math.max(ibCalc, isFinite(inv.iac) ? inv.iac : 0);
    const inCA = fvProximo(FV_DISJUNTORES, ib * FV_FATOR_DISJ_CA);
    const quedaCA = s => Math.sqrt(3) * FV_RHO * e.compCA * ib * e.cosphi / (s * vLinha) * 100;
    let secaoCA = e.caboCA;
    if (!isFinite(secaoCA) || secaoCA <= 0) {
        // Automático: menor seção com Iz ≥ In e queda ≤ limite
        secaoCA = Object.keys(FV_IZ_B1_EPR).map(Number).sort((a, b) => a - b)
            .find(s => FV_IZ_B1_EPR[s] >= (inCA || ib) && quedaCA(s) <= FV_QUEDA_MAX_CA) ?? NaN;
        if (!isFinite(secaoCA)) avisos.push('Nenhuma seção até 300 mm² atende ao circuito CA: será necessário usar condutores em paralelo.');
    }
    const izCA = FV_IZ_B1_EPR[secaoCA];
    if (izCA && inCA && izCA < inCA) avisos.push(`Cabo CA de ${secaoCA} mm² (Iz = ${izCA} A) não é protegido pelo disjuntor de ${inCA} A (Ib ≤ In ≤ Iz).`);
    if (isFinite(secaoCA) && !izCA) avisos.push(`Seção CA de ${secaoCA} mm² não está na tabela de capacidade de condução; confira manualmente.`);
    const circuitosCA = Array.from({ length: inv.qtd || 0 }, (_, i) => ({
        de: `Inversor ${i + 1}`, para: 'Conexão com a rede',
        pot: inv.potMax, corrente: ib, tensao: vLinha, secao: secaoCA, comp: e.compCA, queda: quedaCA(secaoCA)
    }));

    // Proteções
    const iscSecc = maxParalelo * mod.isc * 1.25;
    const vDps = fvProximo(FV_DPS_CC_V, vocMaxGeral) ?? Math.ceil(vocMaxGeral);
    const aSecc = fvProximo(FV_SECC_CC, iscSecc) ?? Math.ceil(iscSecc);
    const ucDpsCA = vFase === 127 ? 175 : 275;

    return {
        avisos, nMod, kWp, potInvTotal, fdi, classe, area, meses, geracaoAnual, ghiMedia, iMax, iMin,
        strings, verif, circuitosCC, circuitosCA, ib, inCA, izCA, secaoCA, vLinha,
        dps: { cc: vDps, ca: ucDpsCA }, secc: aSecc, entradas: e
    };
}

// Placeholders do template memorial-solar.docx
function fvDadosTemplate(r, opcoes = {}) {
    const { entradas: e } = r;
    const { mod, inv } = e;
    const temLoc = Boolean(opcoes.temLocalizacao);
    const fig = temLoc ? { loc: 1, placa: 2, irr: 3, ger: 4 } : { loc: '', placa: 1, irr: 2, ger: 3 };
    const fmtCoef = v => (v > 0 ? '+' : '') + fvFmt(v, 3).replace(/0+$/, '').replace(/,$/, '');
    const consumoAnual = e.consumo * 12;
    const ligacoes = {
        mt: 'em média tensão, atendida por subestação própria',
        bt: 'em baixa tensão, trifásica'
    };

    const dados = {
        FV_CLASSE: r.classe, FV_CLASSE_MAIUSC: r.classe.toUpperCase(),
        FV_KWP: fvFmt(r.kWp, 2), FV_MOD_QTD: String(r.nMod), FV_N_STRINGS: String(r.strings.length),
        FV_MOD_MARCA: mod.marca, FV_MOD_MODELO: mod.modelo, FV_MOD_TEC: mod.tec,
        FV_MOD_POT: fvFmt(mod.pot, 0), FV_MOD_POT_KW: fvFmt(mod.pot / 1000, 3),
        FV_MOD_VOC: fvFmt(mod.voc), FV_MOD_VMP: fvFmt(mod.vmp), FV_MOD_ISC: fvFmt(mod.isc), FV_MOD_IMP: fvFmt(mod.imp),
        FV_MOD_EFIC: fvFmt(mod.efic), FV_MOD_COEF_P: fmtCoef(mod.coefP), FV_MOD_COEF_VOC: fmtCoef(mod.coefVoc),
        FV_MOD_COEF_ISC: fmtCoef(mod.coefIsc), FV_MOD_NOCT: fvFmt(mod.noct, 0),
        FV_MOD_COMP: fvFmt(mod.comp, 0), FV_MOD_LARG: fvFmt(mod.larg, 0), FV_MOD_ALT: fvFmt(mod.alt, 0), FV_MOD_PESO: fvFmt(mod.peso, 1),
        FV_INV_MARCA: inv.marca, FV_INV_MODELO: inv.modelo, FV_INV_QTD: String(inv.qtd), FV_INV_QTD_EXT: fvExtenso(inv.qtd),
        FV_INV_POT: fvFmt(inv.pot, 1), FV_INV_POT_MAX: fvFmt(inv.potMax, 1), FV_INV_POT_TOTAL: fvFmt(r.potInvTotal, 1),
        FV_INV_VMAX: fvFmt(inv.vmax, 0), FV_INV_VMPPT_MIN: fvFmt(inv.vmpptMin, 0), FV_INV_VMPPT_MAX: fvFmt(inv.vmpptMax, 0),
        FV_INV_NMPPT: String(inv.nmppt), FV_INV_IMPPT: fvFmt(inv.imppt, 1), FV_INV_ISC_MPPT: fvFmt(inv.iscMppt, 1),
        FV_INV_IAC: fvFmt(inv.iac, 1), FV_INV_EFIC: fvFmt(inv.efic, 1), FV_INV_IP: inv.ip,
        FV_FDI: fvFmt(r.fdi, 1), FV_AREA: fvFmt(r.area, 2),
        FV_TENSAO: e.tensao, FV_CONEXAO_TEXTO: `TRIFÁSICA ${e.tensao} – 4 FIOS (3F + N) + PE`,
        FV_LIGACAO_TEXTO: ligacoes[e.ligacao] || ligacoes.mt,
        FV_INCLINACAO: fvFmt(e.inclinacao, 0), FV_AZIMUTE: fvFmt(e.azimute, 0), FV_PR: fvFmt(e.pr, 0),
        FV_TMIN: fvFmt(e.tmin, 0), FV_TMAX: fvFmt(e.tmax, 0), FV_COSPHI: fvFmt(e.cosphi, 2),
        FV_CABO_CC: fvFmt(e.caboCC, 0), FV_CABO_CA: fvFmt(r.secaoCA, 0),
        FV_GHI_MEDIA: fvFmt(r.ghiMedia, 2),
        FV_IRR_MES_MAX: FV_MESES[r.iMax].toLowerCase(), FV_IRR_MAX: fvFmt(e.irr[r.iMax]),
        FV_IRR_MES_MIN: FV_MESES[r.iMin].toLowerCase(), FV_IRR_MIN: fvFmt(e.irr[r.iMin]),
        FV_CONSUMO: fvFmt(e.consumo, 2), FV_CONSUMO_ANUAL: fvFmt(consumoAnual, 2),
        FV_CONSUMO_NOTA: e.consumo === 100
            ? 'ao custo de disponibilidade mínimo de uma ligação trifásica (valor de referência)'
            : 'ao consumo médio mensal de referência da unidade consumidora',
        FV_GER_ANUAL: fvFmt(r.geracaoAnual, 2), FV_GER_MEDIA_MES: fvFmt(r.geracaoAnual / 12, 2),
        FV_GER_DIARIA: fvFmt(r.geracaoAnual / 365, 2), FV_DIAS_ANO: '365',
        FV_MESES: r.meses.map(m => ({ mes: m.mes, dias: String(m.dias), irr: fvFmt(m.h), consumo: fvFmt(e.consumo), geracao: fvFmt(m.geracao) })),
        FV_STRINGS: r.strings.map(s => ({ id: s.id, destino: s.destino, n: String(s.n), pot: fvFmt(s.pot), vmp: fvFmt(s.vmp), voc_max: fvFmt(s.vocMax) })),
        FV_VERIF: r.verif.map(v => ({ criterio: v.criterio, calculado: v.calculado, limite: v.limite, status: v.status })),
        FV_CIRCUITOS: [...r.circuitosCC, ...r.circuitosCA].map(c => ({
            de: c.de, para: c.para, pot: fvFmt(c.pot, 2), corrente: fvFmt(c.corrente, 2), tensao: fvFmt(c.tensao, 2),
            secao: fvFmt(c.secao, 0), comp: fvFmt(c.comp, 2), queda: `${fvFmt(c.queda, 2)}%`
        })),
        FV_DPS_CC: `DPS CC classe II, ${r.dps.cc} Vcc / 40 kA`,
        FV_SECC_CC: `Chave seccionadora CC ${r.dps.cc} Vcc / ${r.secc} A`,
        FV_DPS_CA: `DPS CA classe II, ${r.dps.ca} V / 20 kA (fase-terra e neutro-terra)`,
        FV_DISJ_CA: `Disjuntor termomagnético tripolar ${r.inCA ?? '–'} A (um por inversor)`,
        FV_IB_CA: fvFmt(r.ib, 2), FV_IN_CA: String(r.inCA ?? '–'), FV_IZ_CA: r.izCA ? String(r.izCA) : '–',
        FV_TEM_LOCALIZACAO: temLoc,
        FV_FIG_LOC: String(fig.loc), FV_FIG_PLACA: String(fig.placa), FV_FIG_IRR: String(fig.irr), FV_FIG_GER: String(fig.ger)
    };
    FV_MESES.forEach((_, i) => { dados[`FV_IRR_${i + 1}`] = fvFmt(e.irr[i]); });
    return dados;
}

// ---------------------------------------------------------------- resumo ao vivo
function fvAtualizarResumo() {
    const box = document.getElementById('fv-resumo');
    if (!box) return;
    const lista = fvLerStrings();
    const e = fvLerEntradas();
    if (!lista.length || !(e.mod.pot > 0)) {
        box.innerHTML = '<p class="fv-resumo-vazio"><i class="fas fa-solar-panel"></i> Preencha módulo, inversor e séries para ver o resumo.</p>';
        return;
    }
    let r;
    try { r = fvCalcular(e); } catch (err) { box.innerHTML = ''; return; }
    const kpi = (rotulo, valor) => `<div class="fv-kpi"><span>${rotulo}</span><strong>${valor}</strong></div>`;
    const geracaoOk = isFinite(r.geracaoAnual) && r.geracaoAnual > 0;
    box.innerHTML = `
        <div class="fv-kpis">
            ${kpi('Módulos', `${r.nMod} un`)}
            ${kpi('Potência CC', `${fvFmt(r.kWp)} kWp`)}
            ${kpi('Inversores', isFinite(r.potInvTotal) ? `${fvFmt(r.potInvTotal, 1)} kW` : '–')}
            ${kpi('CC/CA', isFinite(r.fdi) ? `${fvFmt(r.fdi, 1)}%` : '–')}
            ${kpi('Geração anual', geracaoOk ? `${fvFmt(r.geracaoAnual, 0)} kWh` : '–')}
            ${kpi('Classificação', r.classe)}
        </div>
        <ul class="fv-verif">
            ${r.verif.filter(v => isFinite(v.calc) && isFinite(v.lim)).map(v =>
                `<li class="${v.cond ? 'ok' : 'falha'}"><i class="fas ${v.cond ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${v.criterio}: ${v.calculado} ${v.limite.replace(/^(.)/, '(limite $1')})</li>`).join('')}
        </ul>
        ${r.avisos.length ? `<div class="fv-avisos">${r.avisos.map(a => `<p><i class="fas fa-exclamation-triangle"></i> ${a}</p>`).join('')}</div>` : ''}`;
}

// ---------------------------------------------------------------- gráficos (canvas → PNG)
function fvCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    return { c, ctx };
}

function fvEixos(ctx, area, yMin, yMax, passo, fmtY, titulo, rotuloY) {
    const { x, y, w, h } = area;
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#404040';
    ctx.textAlign = 'center';
    ctx.fillText(titulo, x + w / 2, 60);
    ctx.font = '26px Arial';
    for (let v = yMin; v <= yMax + 1e-9; v += passo) {
        const py = y + h - (v - yMin) / (yMax - yMin) * h;
        ctx.strokeStyle = '#d9d9d9';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
        ctx.fillStyle = '#595959';
        ctx.textAlign = 'right';
        ctx.fillText(fmtY(v), x - 14, py + 9);
    }
    ctx.save();
    ctx.translate(36, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(rotuloY, 0, 0);
    ctx.restore();
    ctx.textAlign = 'center';
    FV_MESES.forEach((m, i) => ctx.fillText(m, x + (i + 0.5) * w / 12, y + h + 40));
}

function fvPassoBonito(intervalo, divisoes = 6) {
    const bruto = intervalo / divisoes;
    const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const n = bruto / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function fvGraficoIrradiacao(irr, local) {
    const { c, ctx } = fvCanvas(1800, 900);
    const area = { x: 170, y: 110, w: 1580, h: 640 };
    const passo = 0.2;
    const yMin = Math.floor((Math.min(...irr) - 0.3) / passo) * passo;
    const yMax = Math.ceil((Math.max(...irr) + 0.3) / passo) * passo;
    fvEixos(ctx, area, yMin, yMax, passo, v => fvFmt(v, 2), 'Irradiação solar diária média', 'kWh/m².dia');
    const px = i => area.x + (i + 0.5) * area.w / 12;
    const py = v => area.y + area.h - (v - yMin) / (yMax - yMin) * area.h;
    ctx.strokeStyle = '#4472C4'; ctx.lineWidth = 6;
    ctx.beginPath();
    irr.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
    ctx.stroke();
    ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
    irr.forEach((v, i) => {
        ctx.fillStyle = '#4472C4';
        ctx.beginPath(); ctx.arc(px(i), py(v), 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#262626';
        ctx.fillText(fvFmt(v, 2), px(i), py(v) - 24);
    });
    ctx.font = '26px Arial'; ctx.fillStyle = '#595959';
    ctx.fillText(local, area.x + area.w / 2, 870);
    return c;
}

function fvGraficoGeracao(meses) {
    const { c, ctx } = fvCanvas(1800, 900);
    const area = { x: 190, y: 110, w: 1560, h: 640 };
    const valores = meses.map(m => m.geracao);
    const media = valores.reduce((s, v) => s + v, 0) / 12;
    const passo = fvPassoBonito(Math.max(...valores) * 1.15);
    const yMax = Math.ceil(Math.max(...valores) * 1.12 / passo) * passo;
    fvEixos(ctx, area, 0, yMax, passo, v => fvFmt(v, 0), 'Geração prevista de energia', 'kWh/mês');
    const larg = area.w / 12;
    const py = v => area.y + area.h - v / yMax * area.h;
    valores.forEach((v, i) => {
        ctx.fillStyle = '#4472C4';
        ctx.fillRect(area.x + i * larg + larg * 0.18, py(v), larg * 0.64, area.y + area.h - py(v));
    });
    ctx.strokeStyle = '#C00000'; ctx.lineWidth = 5; ctx.setLineDash([22, 14]);
    ctx.beginPath(); ctx.moveTo(area.x, py(media)); ctx.lineTo(area.x + area.w, py(media)); ctx.stroke();
    ctx.setLineDash([]);
    // rótulos por cima da linha da média, com contorno branco para leitura
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    valores.forEach((v, i) => {
        const cx = area.x + i * larg + larg * 0.5;
        const ty = Math.min(py(v) - 12, py(media) - 14);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7;
        ctx.strokeText(fvFmt(v, 0), cx, ty);
        ctx.fillStyle = '#262626';
        ctx.fillText(fvFmt(v, 0), cx, ty);
    });
    // legenda
    ctx.font = '26px Arial'; ctx.textAlign = 'left';
    ctx.fillStyle = '#4472C4'; ctx.fillRect(560, 848, 34, 22);
    ctx.fillStyle = '#404040'; ctx.fillText('Geração mensal (kWh)', 606, 868);
    ctx.strokeStyle = '#C00000'; ctx.setLineDash([16, 10]);
    ctx.beginPath(); ctx.moveTo(960, 860); ctx.lineTo(1020, 860); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillText(`Média: ${fvFmt(media, 0)} kWh/mês`, 1034, 868);
    return c;
}

function fvCanvasParaPng(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Falha ao gerar imagem do gráfico.'));
            blob.arrayBuffer().then(b => resolve(new Uint8Array(b)), reject);
        }, 'image/png');
    });
}

async function fvImagemArquivo(file) {
    if (!file) return null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => rej(new Error('Imagem de localização inválida.'));
            im.src = url;
        });
        const ext = /png/i.test(file.type) ? 'png' : 'jpeg';
        return { bytes, ext, w: img.naturalWidth, h: img.naturalHeight };
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function fvGerarImagens(r, local) {
    const irr = await fvCanvasParaPng(fvGraficoIrradiacao(r.entradas.irr, local));
    const ger = await fvCanvasParaPng(fvGraficoGeracao(r.meses));
    const imagens = {
        GRAFICO_IRRADIACAO: { bytes: irr, ext: 'png', w: 1800, h: 900, larguraCm: 15.5 },
        GRAFICO_GERACAO: { bytes: ger, ext: 'png', w: 1800, h: 900, larguraCm: 15.5 }
    };
    const arquivo = document.getElementById('fv_localizacao')?.files?.[0];
    if (arquivo) {
        const loc = await fvImagemArquivo(arquivo);
        imagens.IMG_LOCALIZACAO = { ...loc, larguraCm: 14, alturaMaxCm: 10 };
    }
    return imagens;
}

// ---------------------------------------------------------------- imagens no .docx
// Substitui o parágrafo que contém {{MARCADOR}} por uma imagem inline.
function fvInserirImagensDocx(zip, imagens) {
    const docPath = 'word/document.xml';
    const relsPath = 'word/_rels/document.xml.rels';
    let xml = zip.file(docPath).asText();
    let rels = zip.file(relsPath).asText();
    let ct = zip.file('[Content_Types].xml').asText();
    const EMU_CM = 360000;
    let seq = 0;

    const acharParagrafo = token => {
        const pos = xml.indexOf(token);
        if (pos === -1) return null;
        const ini = Math.max(xml.lastIndexOf('<w:p>', pos), xml.lastIndexOf('<w:p ', pos));
        const fim = xml.indexOf('</w:p>', pos) + '</w:p>'.length;
        return [ini, fim];
    };

    Object.entries(imagens).forEach(([marcador, img]) => {
        const token = `{{${marcador}}}`;
        let faixa;
        while ((faixa = acharParagrafo(token))) {
            if (!img) { xml = xml.slice(0, faixa[0]) + xml.slice(faixa[1]); continue; }
            seq++;
            const rid = `rIdFv${seq}`;
            const nome = `fv_${marcador.toLowerCase()}_${seq}.${img.ext === 'png' ? 'png' : 'jpeg'}`;
            zip.file(`word/media/${nome}`, img.bytes, { binary: true });
            rels = rels.replace('</Relationships>',
                `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${nome}"/></Relationships>`);

            let cx = Math.round(img.larguraCm * EMU_CM);
            let cy = Math.round(cx * img.h / img.w);
            if (img.alturaMaxCm && cy > img.alturaMaxCm * EMU_CM) {
                cy = Math.round(img.alturaMaxCm * EMU_CM);
                cx = Math.round(cy * img.w / img.h);
            }
            const id = 9000 + seq;
            const drawing =
                `<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>` +
                `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
                `<wp:docPr id="${id}" name="${marcador}"/>` +
                `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
                `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
                `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${nome}"/><pic:cNvPicPr/></pic:nvPicPr>` +
                `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
                `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
                `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
            xml = xml.slice(0, faixa[0]) + drawing + xml.slice(faixa[1]);
        }
    });

    // Marcadores sem imagem (ex.: localização não enviada) são removidos
    let faixa;
    while ((faixa = (() => { const m = xml.match(/\{\{[A-Z_]+\}\}/); return m ? acharParagrafo(m[0]) : null; })())) {
        xml = xml.slice(0, faixa[0]) + xml.slice(faixa[1]);
    }

    if (!/Extension="png"/i.test(ct)) ct = ct.replace('<Default ', '<Default Extension="png" ContentType="image/png"/><Default ');
    if (!/Extension="jpeg"/i.test(ct)) ct = ct.replace('<Default ', '<Default Extension="jpeg" ContentType="image/jpeg"/><Default ');

    zip.file(docPath, xml);
    zip.file(relsPath, rels);
    zip.file('[Content_Types].xml', ct);
}
