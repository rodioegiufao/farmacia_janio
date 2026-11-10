// =====================================================================
// SUBESTAÇÃO — transformadores mono/trifásicos e checagem de coerência
//
// Potências até 75 kVA (e qualquer monofásico): dimensionamento calculado,
// conforme NDEE-01 (Roraima Energia) Tabela 1B, com cabos EPR/XLPE 90 °C:
//   Ib = S / V            (monofásico, V = maior tensão: 220/127V → 220 V)
//   Ib = S / (√3 · V)     (trifásico)
//   In = próximo disjuntor comercial ≥ Ib
//   Cabo = menor seção com Iz ≥ In  (NBR 5410 Tab. 37, B1, 2 ou 3 condutores
//          carregados), o que garante I2 = 1,45·In ≤ 1,45·Iz (alínea b)
// 112,5 kVA em diante (trifásico): mantém as tabelas de projeto existentes
// (cabos em paralelo, disjuntores ajustáveis), só com Ib calculado exatamente.
// =====================================================================

// Sequência usada na Tabela 1 da NDEE-01 (62,5 A → 70 A; 41,67 A → 50 A)
const SUB_DISJUNTORES = [10, 16, 20, 25, 32, 40, 50, 70, 80, 100, 125, 150, 175, 200, 225, 250, 300,
    350, 400, 500, 600, 630, 700, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000];

// NBR 5410 Tabela 37 — cobre, EPR/XLPE 90 °C, método B1 (A)
const SUB_IZ_EPR_B1 = {
    2: { 6: 54, 10: 75, 16: 100, 25: 133, 35: 164, 50: 198, 70: 253, 95: 306, 120: 354, 150: 407, 185: 464, 240: 546, 300: 628 },
    3: { 6: 48, 10: 66, 16: 88, 25: 117, 35: 144, 50: 175, 70: 222, 95: 269, 120: 312, 150: 358, 185: 408, 240: 481, 300: 553 }
};
const SUB_SECAO_MINIMA = 6;           // NDEE-01 Tabela 1: menor cabo 2x6(6)
const SUB_FP_REFERENCIA = 0.92;       // NDEE-01 5.6.2.3 / REN 1.000 art. 302
const SUB_LIMITE_MONO = 37.5;         // monofásicos até 37,5 kVA
const SUB_SO_MONO_ABAIXO = 15;        // abaixo de 15 kVA só existe monofásico
const PT_TRAFO_TABELADO = [112.5, 150, 225, 500, 750, 1000, 1250, 1500];

// ---------------------------------------------------------------- utilitários
function subNum(v) {
    const s = String(v ?? '').trim().replace(/\s/g, '').replace(/kva$/i, '');
    if (!s) return NaN;
    return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
}

function subFmt(n, dec = 2) {
    return isFinite(n) ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '–';
}

function subFmtKva(n) {
    return Number.isInteger(n) ? String(n) : subFmt(n, 1);
}

// "380V/220V" → { linha: 380, chave: '380/220' }
function subTensao(tensao) {
    const nums = String(tensao || '').match(/\d+/g) || [];
    return { linha: Number(nums[0]) || NaN, chave: nums.slice(0, 2).join('/') };
}

function subFasesPermitidas(kva) {
    if (!isFinite(kva)) return ['tri', 'mono'];
    if (kva < SUB_SO_MONO_ABAIXO) return ['mono'];
    if (kva <= SUB_LIMITE_MONO) return ['tri', 'mono'];
    return ['tri'];
}

const SUB_FASES_TXT = {
    tri: { nome: 'Trifásica', minus: 'trifásica', nFases: 3, carregados: 3, polos: 'tripolar' },
    mono: { nome: 'Monofásica', minus: 'monofásica', nFases: 2, carregados: 2, polos: 'bipolar' }
};

// ---------------------------------------------------------------- dimensionamento
function calcularTrafo(potencia, tensao, n, fases = 'tri') {
    const chaves = derivadosTrafo(n);
    const vazio = () => Object.fromEntries(chaves.map(k => [k, 'N/A']));
    const kva = subNum(potencia);
    const { linha: vLinha } = subTensao(tensao);
    if (!isFinite(kva) || !isFinite(vLinha)) return vazio();

    const f = SUB_FASES_TXT[fases] || SUB_FASES_TXT.tri;
    const ib = fases === 'mono' ? kva * 1000 / vLinha : kva * 1000 / (Math.sqrt(3) * vLinha);
    const base = {
        [`IBXX${n}`]: ib.toFixed(2),
        [`NFASES${n}`]: String(f.nFases),
        [`NCARREG${n}`]: String(f.carregados),
        [`FASES_TRAFO${n}`]: f.minus
    };

    // Trifásicos grandes: tabelas de projeto existentes
    const idx = PT_TRAFO_TABELADO.indexOf(kva);
    if (fases === 'tri' && idx !== -1 && (tensao === '220/127V' || tensao === '380V/220V')) {
        const t = tensao === '220/127V'
            ? { IN: IN_220, IZ: IZ_220, CAB: CAB_220, QTD_CAB: QTD_CAB_220, I_CAB: I_CAB_220, AJ: I_AJUSTE_220, QTD: QTD_220 }
            : { IN: IN_380, IZ: IZ_380, CAB: CAB_380, QTD_CAB: QTD_CAB_380, I_CAB: I_CAB_380, AJ: I_AJUSTE_380, QTD: QTD_380 };
        return {
            ...base,
            [`INXX${n}`]: t.IN[idx],
            [`IZXX${n}`]: t.IZ[idx],
            [`CABX${n}`]: t.CAB[idx],
            [`QTDY${n}`]: t.QTD_CAB[idx],
            [`IZXY${n}`]: t.I_CAB[idx],
            [`IAJU${n}`]: t.AJ[idx],
            [`IZ14${n}`]: (t.IZ[idx] * 1.45).toFixed(2),
            [`QTD1${n}`]: t.QTD[idx],
            [`DISJ_DESC${n}`]: `tripolar do tipo ajustável, corrente nominal de ${t.IN[idx]}A, (ajustado em ${t.AJ[idx]})`
        };
    }

    // Demais casos: cálculo
    const inA = SUB_DISJUNTORES.find(d => d >= ib - 1e-9);
    const tabela = SUB_IZ_EPR_B1[f.carregados];
    const secoes = Object.keys(tabela).map(Number).sort((a, b) => a - b).filter(s => s >= SUB_SECAO_MINIMA);
    let paralelo = 1, secao = null;
    for (paralelo = 1; paralelo <= 8 && secao === null; paralelo++) {
        const limite = paralelo === 1 ? 300 : 240;
        secao = secoes.find(s => s <= limite && paralelo * tabela[s] >= inA) ?? null;
        if (secao !== null) break;
    }
    if (!inA || secao === null) return { ...vazio(), ...base };
    const izCabo = tabela[secao];
    const iz = paralelo * izCabo;
    return {
        ...base,
        [`INXX${n}`]: inA,
        [`IZXX${n}`]: iz,
        [`CABX${n}`]: secao,
        [`QTDY${n}`]: paralelo > 1 ? `${paralelo}x${secao}` : String(secao),
        [`IZXY${n}`]: izCabo,
        [`IAJU${n}`]: `${inA}A – 100%`,
        [`IZ14${n}`]: (iz * 1.45).toFixed(2),
        [`QTD1${n}`]: paralelo,
        [`DISJ_DESC${n}`]: `${f.polos}, termomagnético, com corrente nominal de ${inA}A`
    };
}

// ---------------------------------------------------------------- formulário
// Restringe "Tipo de ligação" e as tensões conforme as potências escolhidas
function subAtualizarFases() {
    const sel = document.getElementById('fases_sub');
    if (!sel) return;
    const qtd = valor('quantidade_trafos') === '2' ? 2 : 1;
    const potencias = [1, 2].slice(0, qtd).map(i => subNum(valor(`potencia_trafo_${i}`))).filter(isFinite);
    const permitidas = ['tri', 'mono'].filter(f => potencias.every(p => subFasesPermitidas(p).includes(f)));
    const dica = document.getElementById('fases-dica');

    [...sel.options].forEach(o => { o.disabled = permitidas.length > 0 && !permitidas.includes(o.value); });
    if (permitidas.length && !permitidas.includes(sel.value)) sel.value = permitidas[0];

    if (dica) {
        const menor = Math.min(...potencias), maior = Math.max(...potencias);
        dica.textContent = !potencias.length ? 'Monofásica até 37,5 kVA; abaixo de 15 kVA só monofásica.'
            : !permitidas.length ? 'As potências escolhidas não permitem o mesmo tipo de ligação.'
                : maior < SUB_SO_MONO_ABAIXO ? 'Abaixo de 15 kVA só existe transformador monofásico.'
                    : menor > SUB_LIMITE_MONO ? 'Acima de 37,5 kVA só existe transformador trifásico.'
                        : 'Monofásica ou trifásica (até 37,5 kVA).';
    }

    // 240/120V só existe em monofásico
    ['tensao_trafo_1', 'tensao_trafo_2'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        [...s.options].forEach(o => {
            if (/^240/.test(o.value)) o.disabled = sel.value !== 'mono';
        });
        if (s.selectedOptions[0]?.disabled && s.value) s.value = '';
    });
}

// ---------------------------------------------------------------- coerência
// Retorna [{ nivel: 'erro' | 'atencao', msg }]
function subVerificarCoerencia() {
    const tipos = typeof getTiposSelecionados === 'function' ? getTiposSelecionados() : [];
    const usa = id => typeof campoNecessario === 'function' && CAMPOS[id] && campoNecessario(id, tipos);
    const avisos = [];
    const add = (nivel, msg) => avisos.push({ nivel, msg });

    const potSub = subNum(valor('potencia'));
    const demanda = subNum(valor('demanda'));
    const carga = subNum(valor('carga_instalada'));
    const qtd = valor('quantidade_trafos') === '2' ? 2 : 1;
    const fases = valor('fases_sub') || 'tri';
    const trafos = [1, 2].slice(0, qtd)
        .map(i => ({ i, kva: subNum(valor(`potencia_trafo_${i}`)), tensao: valor(`tensao_trafo_${i}`) }));
    const usaTrafos = usa('potencia_trafo_1');

    // 1. Potência da subestação × soma dos transformadores
    if (usaTrafos && isFinite(potSub) && trafos.every(t => isFinite(t.kva))) {
        const soma = trafos.reduce((s, t) => s + t.kva, 0);
        if (Math.abs(soma - potSub) > 0.01) {
            const conta = trafos.map(t => subFmtKva(t.kva)).join(' + ');
            add('erro', `Potência da subestação (${subFmtKva(potSub)} kVA) diferente da soma dos transformadores (${conta}${qtd > 1 ? ` = ${subFmtKva(soma)}` : ''} kVA).`);
        }
    }

    // 2. Demanda × potência instalada
    if ((usa('demanda') || usa('potencia')) && isFinite(demanda) && isFinite(potSub) && demanda > potSub) {
        add('erro', `Demanda (${subFmtKva(demanda)} kVA) maior que a potência da subestação (${subFmtKva(potSub)} kVA): o transformador ficaria sobrecarregado.`);
    }

    // 3. Demanda × carga instalada (a demanda não pode superar a carga instalada)
    if (usa('carga_instalada') && isFinite(demanda) && isFinite(carga) && demanda * SUB_FP_REFERENCIA > carga + 1e-9) {
        add('erro', `Demanda de ${subFmtKva(demanda)} kVA (≈ ${subFmt(demanda * SUB_FP_REFERENCIA, 0)} kW com FP ${subFmt(SUB_FP_REFERENCIA, 2)}) maior que a carga instalada de ${subFmtKva(carga)} kW. A demanda não pode superar a carga instalada — confira se os valores não foram trocados.`);
    }

    if (usaTrafos) {
        // 4. Tensão geral × tensões dos transformadores
        const geral = valor('tensao');
        const tensoesTrafos = trafos.filter(t => t.tensao).map(t => subTensao(t.tensao).chave);
        if (geral && tensoesTrafos.length === qtd) {
            const esperadas = geral.split(/\s+e\s+/i).map(t => subTensao(t).chave).sort();
            const atuais = [...new Set(tensoesTrafos)].sort();
            if (esperadas.join('|') !== atuais.join('|')) {
                const desc = trafos.map(t => `Trafo ${t.i}: ${t.tensao}`).join('; ');
                const extra = esperadas.length > 1 && qtd < 2 ? ' Duas tensões gerais exigem dois transformadores, um em cada tensão.' : '';
                add('erro', `Tensão geral "${geral}" não corresponde aos transformadores (${desc}).${extra}`);
            }
        }

        // 5. Tipo de ligação × potência
        trafos.forEach(t => {
            if (!isFinite(t.kva)) return;
            if (!subFasesPermitidas(t.kva).includes(fases)) {
                add('erro', fases === 'tri'
                    ? `Trafo ${t.i} de ${subFmtKva(t.kva)} kVA: abaixo de 15 kVA só existe transformador monofásico.`
                    : `Trafo ${t.i} de ${subFmtKva(t.kva)} kVA: monofásicos vão só até 37,5 kVA.`);
            }
            if (fases === 'tri' && /^240/.test(t.tensao)) {
                add('erro', `Trafo ${t.i}: a tensão 240/120V é de transformador monofásico.`);
            }
        });

        // 6. Transformador a seco em subestação aérea
        const sub = valor('tipo_subestacao');
        if (sub === 'aerea' && valor('tipo_trafo') === 'SECO') {
            add('atencao', 'Transformador a seco em subestação aérea: em poste o usual é transformador a óleo. Confirme o tipo.');
        }

        // 7. Monofásica abrigada: o texto dos cubículos de MT descreve equipamentos trifásicos
        if (sub === 'abrigada' && fases === 'mono') {
            add('atencao', 'Subestação abrigada monofásica: revise no Word o texto dos cubículos de MT (chave seccionadora e ligação do primário são descritas como trifásicas).');
        }
    }

    return avisos;
}

function subAtualizarPainel() {
    const painel = document.getElementById('painel-coerencia');
    if (!painel) return;
    const avisos = subVerificarCoerencia();
    painel.classList.toggle('hidden', avisos.length === 0);
    if (!avisos.length) { painel.innerHTML = ''; return; }
    const erros = avisos.filter(a => a.nivel === 'erro').length;
    painel.innerHTML = `
        <h4><i class="fas fa-clipboard-check"></i> Conferência dos dados
            <span>${erros ? `${erros} inconsistência(s)` : ''}${erros && avisos.length > erros ? ' · ' : ''}${avisos.length > erros ? `${avisos.length - erros} ponto(s) de atenção` : ''}</span></h4>
        <ul>${avisos.map(a => `<li class="${a.nivel}"><i class="fas ${a.nivel === 'erro' ? 'fa-times-circle' : 'fa-exclamation-triangle'}"></i> ${escapeHtml(a.msg)}</li>`).join('')}</ul>`;
}
