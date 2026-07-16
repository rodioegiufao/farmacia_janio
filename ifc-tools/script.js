(function (root) {
  'use strict';

  const TOL = 1e-12;
  const ENTITY_ORDER = ['IFCSITE', 'IFCBUILDING', 'IFCPROJECT', 'IFCBUILDINGSTOREY', 'IFCSPACE'];

  function clean(n) { return Math.abs(n) < TOL ? 0 : n; }
  function deg(rad) { return rad * 180 / Math.PI; }
  function rad(deg) { return deg * Math.PI / 180; }
  function fmt(n) {
    n = clean(n);
    if (Object.is(n, -0)) n = 0;
    return Number.isInteger(n) ? `${n}.` : String(Number(n.toFixed(12)));
  }
  function splitArgs(s) {
    const args = [];
    let buf = '', depth = 0, quoted = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i], next = s[i + 1];
      if (c === "'" && next === "'") { buf += c + next; i++; continue; }
      if (c === "'") quoted = !quoted;
      if (!quoted) {
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (c === ',' && depth === 0) { args.push(buf.trim()); buf = ''; continue; }
      }
      buf += c;
    }
    args.push(buf.trim());
    return args;
  }
  function parseVector(txt) {
    const m = txt.match(/\(\s*\((.*)\)\s*\)/s) || txt.match(/\((.*)\)/s);
    if (!m) return null;
    return splitArgs(m[1]).map(Number);
  }
  function vectorText(v) { return `(${v.map(fmt).join(',')})`; }
  function normalizeXY(v) {
    const len = Math.hypot(v[0] || 0, v[1] || 0);
    return len < TOL ? [1, 0, 0] : [clean((v[0] || 0) / len), clean((v[1] || 0) / len), 0];
  }
  function rotatePoint(p, angle, pivot = [0, 0, 0]) {
    const c = Math.cos(rad(angle)), s = Math.sin(rad(angle));
    const x = p[0] - pivot[0], y = p[1] - pivot[1];
    return [clean(pivot[0] + c * x - s * y), clean(pivot[1] + s * x + c * y), p[2]];
  }

  function findDataSectionBounds(text) {
    const re = /\b(HEADER|DATA|ENDSEC)\b\s*;/ig;
    let match, inData = false, dataStart = -1, dataEnd = -1;
    while ((match = re.exec(text))) {
      const token = match[1].toUpperCase();
      if (token === 'DATA') {
        if (inData) throw Error('IFC inválido: seção DATA aninhada.');
        inData = true;
        dataStart = match.index;
      } else if (token === 'ENDSEC' && inData) {
        dataEnd = match.index;
        return { dataStart, dataEnd, dataEndEnd: re.lastIndex };
      }
    }
    throw Error('IFC inválido: seção DATA ou ENDSEC correspondente não encontrado.');
  }

  function parseStep(text) {
    if (!text.trimStart().startsWith('ISO-10303-21')) throw Error('Arquivo não começa com ISO-10303-21.');
    const bounds = findDataSectionBounds(text);
    const dataText = text.slice(bounds.dataStart, bounds.dataEnd);
    const entities = new Map(), order = [];
    const re = /#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(/ig;
    let m;
    while ((m = re.exec(dataText))) {
      const start = bounds.dataStart + m.index;
      const id = Number(m[1]), type = m[2].toUpperCase();
      let i = bounds.dataStart + re.lastIndex - 1, depth = 0, quoted = false;
      for (; i < text.length; i++) {
        const c = text[i], next = text[i + 1];
        if (c === "'" && next === "'") { i++; continue; }
        if (c === "'") quoted = !quoted;
        if (!quoted) {
          if (c === '(') depth++;
          else if (c === ')') depth--;
          else if (c === ';' && depth === 0) { i++; break; }
        }
      }
      const raw = text.slice(start, i);
      const body = raw.slice(raw.indexOf('(') + 1, raw.lastIndexOf(')'));
      entities.set(id, { id, type, raw, body, args: splitArgs(body), start, end: i });
      order.push(id);
      re.lastIndex = i - bounds.dataStart;
    }
    if (!entities.size) throw Error('Nenhuma entidade STEP encontrada na seção DATA.');
    return { text, entities, order, maxId: Math.max(...order), bounds };
  }

  function refsOfArgs(argsText) { return [...argsText.matchAll(/#(\d+)/g)].map(x => Number(x[1])); }
  function getIncomingReferences(model, entityId) {
    const incoming = [];
    for (const e of model.entities.values()) {
      for (const ref of refsOfArgs(e.body)) {
        if (ref === entityId) incoming.push(e);
      }
    }
    return incoming;
  }
  function schema(text) {
    const m = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
    return m ? m[1] : 'Não identificado';
  }
  function unit(model) {
    for (const e of model.entities.values()) {
      if (e.type === 'IFCSIUNIT' && /\.LENGTHUNIT\./i.test(e.raw)) {
        const pre = (e.raw.match(/\.(MILLI|CENTI|DECI|KILO)\./i) || [])[1];
        const factor = { MILLI: .001, CENTI: .01, DECI: .1, KILO: 1000 }[pre] || 1;
        const name = { MILLI: 'milímetros', CENTI: 'centímetros', DECI: 'decímetros', KILO: 'quilômetros' }[pre] || 'metros';
        return { name, factorToMeter: factor };
      }
    }
    return { name: 'unidade nativa (assumida metro)', factorToMeter: 1 };
  }
  function refArg(arg) { const m = String(arg || '').match(/#(\d+)/); return m ? Number(m[1]) : null; }
  function findTarget(model) {
    for (const t of ENTITY_ORDER) {
      for (const e of model.entities.values()) {
        if (e.type !== t) continue;
        const lp = model.entities.get(refArg(e.args[5]));
        if (!lp || lp.type !== 'IFCLOCALPLACEMENT') continue;
        const ax = model.entities.get(refArg(lp.args[1]));
        if (!ax || ax.type !== 'IFCAXIS2PLACEMENT3D') continue;
        const loc = model.entities.get(refArg(ax.args[0]));
        const axis = ax.args[1] === '$' ? null : model.entities.get(refArg(ax.args[1]));
        const ref = ax.args[2] === '$' ? null : model.entities.get(refArg(ax.args[2]));
        if (loc && loc.type === 'IFCCARTESIANPOINT') return { entity: e, localPlacement: lp, axisPlacement: ax, location: loc, axis, refDirection: ref, type: t };
      }
    }
    throw Error('Não foi encontrado IfcSite/IfcBuilding/objeto espacial com IfcLocalPlacement resolvível.');
  }
  function analyze(text) {
    const model = parseStep(text), target = findTarget(model);
    const loc = parseVector(target.location.body) || [0, 0, 0];
    const ref = target.refDirection ? parseVector(target.refDirection.body) : [1, 0, 0];
    const axis = target.axis ? parseVector(target.axis.body) : [0, 0, 1];
    const u = unit(model);
    return { model, target, position: loc, refDirection: normalizeXY(ref), axis, angle: clean(deg(Math.atan2(ref[1] || 0, ref[0] || 1))), schema: schema(text), unit: u, geo: /IFCMAPCONVERSION|IFCPROJECTEDCRS|IFCCOORDINATEREFERENCESYSTEM|REFLATITUDE|REFLONGITUDE|REFELEVATION|TRUENORTH/i.test(text) };
  }
  function unitValue(v, input, u) { return v * ({ m: 1, cm: .01, mm: .001, native: u.factorToMeter }[input]) / u.factorToMeter; }
  function compute(an, opt) {
    const angle = Number(opt.angle);
    const finalAngle = opt.rotationMode === 'relative' ? an.angle + angle : angle;
    const delta = opt.rotationMode === 'relative' ? angle : finalAngle - an.angle;
    const d = [unitValue(Number(opt.x), opt.unit, an.unit), unitValue(Number(opt.y), opt.unit, an.unit), unitValue(Number(opt.z), opt.unit, an.unit)];
    let base = opt.translationMode === 'absolute' ? d.slice() : an.position.slice();
    if (opt.translationMode === 'relative' && opt.rotatePosition) base = rotatePoint(base, delta, opt.pivot);
    const pos = opt.translationMode === 'absolute' ? base : [base[0] + d[0], base[1] + d[1], base[2] + d[2]];
    return { finalAngle: clean(finalAngle), delta: clean(delta), position: pos, refDirection: [clean(Math.cos(rad(finalAngle))), clean(Math.sin(rad(finalAngle))), 0], axis: an.axis && an.axis.length === 3 ? an.axis : [0, 0, 1] };
  }

  function replaceRefInArg(arg, oldId, newId) { return String(arg).replace(new RegExp(`#${oldId}(?!\\d)`, 'g'), `#${newId}`); }
  function applyEdits(text, edits) {
    const sorted = edits.slice().sort((a, b) => b.start - a.start);
    let out = text;
    for (const edit of sorted) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
    return out;
  }
  function insertIntoData(text, addition) {
    const bounds = findDataSectionBounds(text);
    return text.slice(0, bounds.dataEnd) + addition + (addition.endsWith('\n') ? '' : '\n') + text.slice(bounds.dataEnd);
  }
  function buildEntity(e, args) { return `#${e.id}=${e.type}(${args.join(',')});`; }
  function makeEntity(id, type, args) { return `#${id}=${type}(${args.join(',')});`; }
  function isAxisPlacementIncomingSafe(incoming, selectedLocalPlacement) {
    return incoming.every(e => e.id === selectedLocalPlacement.id && e.type === 'IFCLOCALPLACEMENT');
  }
  function isPointOrDirectionIncomingSafe(incoming, selectedAxisPlacement) {
    return incoming.every(e => e.id === selectedAxisPlacement.id && e.type === 'IFCAXIS2PLACEMENT3D');
  }

  function transform(text, opt) {
    const an = analyze(text), c = compute(an, opt), model = an.model, t = an.target;
    const edits = [];
    const additions = [];
    let nextId = model.maxId + 1;

    const axisIncoming = getIncomingReferences(model, t.axisPlacement.id);
    let axisPlacement = t.axisPlacement;
    if (!isAxisPlacementIncomingSafe(axisIncoming, t.localPlacement)) {
      const axisArgs = t.axisPlacement.args.slice();
      const newAxisId = nextId++;
      axisPlacement = { id: newAxisId, type: 'IFCAXIS2PLACEMENT3D', args: axisArgs };
      const lpArgs = t.localPlacement.args.slice();
      lpArgs[1] = `#${newAxisId}`;
      edits.push({ start: t.localPlacement.start, end: t.localPlacement.end, text: buildEntity(t.localPlacement, lpArgs) });
      additions.push(makeEntity(newAxisId, 'IFCAXIS2PLACEMENT3D', axisArgs));
    }

    const locIncoming = getIncomingReferences(model, t.location.id);
    const refIncoming = t.refDirection ? getIncomingReferences(model, t.refDirection.id) : [];
    let locationId = t.location.id;
    let refDirectionId = t.refDirection ? t.refDirection.id : null;
    const axisArgs = axisPlacement.args.slice();

    if (isPointOrDirectionIncomingSafe(locIncoming, t.axisPlacement) && axisPlacement.id === t.axisPlacement.id) {
      edits.push({ start: t.location.start, end: t.location.end, text: `#${t.location.id}=IFCCARTESIANPOINT(${vectorText(c.position)});` });
    } else {
      locationId = nextId++;
      axisArgs[0] = `#${locationId}`;
      additions.push(makeEntity(locationId, 'IFCCARTESIANPOINT', [vectorText(c.position)]));
    }

    if (t.refDirection && isPointOrDirectionIncomingSafe(refIncoming, t.axisPlacement) && axisPlacement.id === t.axisPlacement.id) {
      edits.push({ start: t.refDirection.start, end: t.refDirection.end, text: `#${t.refDirection.id}=IFCDIRECTION(${vectorText(c.refDirection)});` });
    } else {
      refDirectionId = nextId++;
      axisArgs[2] = `#${refDirectionId}`;
      additions.push(makeEntity(refDirectionId, 'IFCDIRECTION', [vectorText(c.refDirection)]));
    }

    if (axisPlacement.id !== t.axisPlacement.id) {
      const idx = additions.findIndex(line => line.startsWith(`#${axisPlacement.id}=`));
      additions[idx] = makeEntity(axisPlacement.id, 'IFCAXIS2PLACEMENT3D', axisArgs.map(a => replaceRefInArg(a, t.location.id, locationId)).map(a => t.refDirection ? replaceRefInArg(a, t.refDirection.id, refDirectionId) : a));
    } else if (locationId !== t.location.id || (t.refDirection && refDirectionId !== t.refDirection.id)) {
      edits.push({ start: t.axisPlacement.start, end: t.axisPlacement.end, text: makeEntity(t.axisPlacement.id, 'IFCAXIS2PLACEMENT3D', axisArgs) });
    }

    let out = applyEdits(text, edits);
    if (additions.length) out = insertIntoData(out, '\n' + additions.join('\n') + '\n');
    validateFinal(out);
    return { text: out, analysis: an, computed: c, added: additions.length };
  }

  function validateFinal(text) {
    if (!text.trimStart().startsWith('ISO-10303-21')) throw Error('IFC final inválido: cabeçalho ausente.');
    if (!/HEADER\s*;/i.test(text)) throw Error('IFC final inválido: HEADER ausente.');
    findDataSectionBounds(text);
    if (!text.trim().endsWith('END-ISO-10303-21;')) throw Error('IFC final inválido: finalização ausente.');
    const model = parseStep(text), seen = new Set();
    for (const id of model.order) {
      if (seen.has(id)) throw Error('IFC final inválido: identificador duplicado #' + id);
      seen.add(id);
    }
    for (const e of model.entities.values()) {
      for (const r of refsOfArgs(e.body)) if (!model.entities.has(r)) throw Error(`IFC final inválido: referência #${r} não resolvida.`);
    }
    return true;
  }

  function assertHierarchyPreserved(before, after) {
    const a = analyze(before), b = analyze(after);
    const beforeRefs = getIncomingReferences(a.model, a.target.localPlacement.id).filter(e => e.id !== a.target.entity.id).map(e => `${e.id}:${e.type}`).sort();
    const afterRefs = getIncomingReferences(b.model, b.target.localPlacement.id).filter(e => e.id !== b.target.entity.id).map(e => `${e.id}:${e.type}`).sort();
    if (JSON.stringify(beforeRefs) !== JSON.stringify(afterRefs)) throw Error(`Hierarquia alterada: ${beforeRefs.join(',')} != ${afterRefs.join(',')}`);
    return true;
  }

  function runTests() {
    let pass = 0;
    function ok(name, condition) { if (!condition) throw Error(name); pass++; }
    function near(a, b) { return Math.abs(a - b) < 1e-9; }
    function vecNear(a, b) { return a.length === b.length && a.every((v, i) => near(v, b[i])); }
    const sample = "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC2X3'));\nENDSEC;\nDATA;\n#1=IFCSIUNIT(*,.LENGTHUNIT.,.CENTI.,.METRE.);\n#2=IFCPERSON($);\n#3=IFCCARTESIANPOINT((0.,0.,0.));\n#4=IFCDIRECTION((0.,0.,1.));\n#5=IFCDIRECTION((1.,0.,0.));\n#6=IFCAXIS2PLACEMENT3D(#3,#4,#5);\n#7=IFCLOCALPLACEMENT($,#6);\n#8=IFCSITE('g',$,$,$,$,#7,$,$,$,$,$,$,$,$);\n#9=IFCCARTESIANPOINT((10.,20.,30.));\n#10=IFCAXIS2PLACEMENT3D(#9,#4,#5);\n#11=IFCLOCALPLACEMENT(#7,#10);\n#12=IFCBUILDING('b',$,$,$,$,#11,$,$,$,$,$,$);\nENDSEC;\nEND-ISO-10303-21;";
    ok('findDataSectionBounds aponta para DATA', findDataSectionBounds(sample).dataStart > sample.indexOf('HEADER'));
    ok('referência própria não é contada', getIncomingReferences(parseStep(sample), 3).length === 1);
    const rot90 = transform(sample, { angle: 90, rotationMode: 'relative', x: 0, y: 0, z: 0, unit: 'm', translationMode: 'relative', rotatePosition: false, pivot: [0, 0, 0] });
    ok('rot 90', vecNear(analyze(rot90.text).refDirection, [0, 1, 0]));
    ok('eixo Z preservado', vecNear(analyze(rot90.text).axis, [0, 0, 1]));
    ok('hierarquia preservada', assertHierarchyPreserved(sample, rot90.text));
    const rotNeg = transform(sample, { angle: -90, rotationMode: 'relative', x: 0, y: 0, z: 0, unit: 'm', translationMode: 'relative', rotatePosition: false, pivot: [0, 0, 0] });
    ok('rot -90', vecNear(analyze(rotNeg.text).refDirection, [0, -1, 0]));
    const shifted = transform(sample, { angle: 0, rotationMode: 'relative', x: 1, y: 2, z: .5, unit: 'm', translationMode: 'relative', rotatePosition: false, pivot: [0, 0, 0] });
    ok('1 m = 100 unidades IFC em centímetros', vecNear(analyze(shifted.text).position, [100, 200, 50]));
    const combo = transform(sample, { angle: 90, rotationMode: 'relative', x: 1, y: 0, z: 0, unit: 'm', translationMode: 'relative', rotatePosition: false, pivot: [0, 0, 0] });
    ok('rotação + deslocamento', vecNear(analyze(combo.text).position, [100, 0, 0]) && vecNear(analyze(combo.text).refDirection, [0, 1, 0]));
    ok('integridade STEP', validateFinal(combo.text));
    ok('nenhum iframe recursivo no HTML', typeof document === 'undefined' || !document.querySelector('iframe[src="ifc_to_xkt.html"]'));
    return pass;
  }

  root.IfcTransformer = { analyze, transform, compute, runTests, validateFinal, parseStep, findDataSectionBounds, getIncomingReferences, assertHierarchyPreserved };
  if (typeof module !== 'undefined') module.exports = root.IfcTransformer;

  if (typeof document !== 'undefined') {
    let state = { downloadUrl: null };
    const $ = id => document.getElementById(id);
    function revokeDownload() {
      if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
      state.downloadUrl = null;
      $('downloadLink').removeAttribute('href');
      $('downloadLink').classList.add('hidden');
    }
    function showError(elementId, error, context) {
      console.error(context, error);
      $(elementId).textContent = `${context}: ${error.message || error}`;
    }
    $('rotationPreset').onchange = () => { $('customAngle').disabled = $('rotationPreset').value !== 'custom'; updateSummary(); };
    ['customAngle', 'rotationMode', 'translationMode', 'dx', 'dy', 'dz', 'inputUnit', 'rotatePosition', 'pivotMode', 'pivotX', 'pivotY', 'pivotZ'].forEach(id => { $(id).oninput = updateSummary; });
    $('resetBtn').onclick = () => { ['dx', 'dy', 'dz', 'customAngle'].forEach(id => { $(id).value = 0; }); $('rotationPreset').value = '0'; $('rotationMode').value = 'relative'; $('translationMode').value = 'relative'; $('inputUnit').value = 'm'; $('rotatePosition').checked = false; $('pivotMode').value = 'current'; $('applyGeo').checked = false; updateSummary(); };
    $('previewBtn').onclick = updateSummary;
    $('fileInput').onchange = e => loadFile(e.target.files[0]);
    ['dragover', 'dragleave', 'drop'].forEach(ev => $('dropzone').addEventListener(ev, e => { e.preventDefault(); $('dropzone').classList.toggle('dragover', ev === 'dragover'); if (ev === 'drop') loadFile(e.dataTransfer.files[0]); }));
    function opts() {
      const an = state.analysis, angle = $('rotationPreset').value === 'custom' ? $('customAngle').value : $('rotationPreset').value;
      const pivot = $('pivotMode').value === 'origin' ? [0, 0, 0] : $('pivotMode').value === 'custom' ? [+$('pivotX').value, +$('pivotY').value, +$('pivotZ').value] : an.position;
      return { angle: +angle, rotationMode: $('rotationMode').value, x: +$('dx').value, y: +$('dy').value, z: +$('dz').value, unit: $('inputUnit').value, translationMode: $('translationMode').value, rotatePosition: $('rotatePosition').checked, pivot };
    }
    function updateSummary() {
      if (!state.analysis) return;
      try {
        const c = compute(state.analysis, opts()), a = state.analysis;
        $('summary').textContent = `Arquivo original:\n${state.file.name}\n\nEntidade transformada:\n${a.target.type} #${a.target.entity.id}\n\nPosição original:\nX = ${a.position[0]}\nY = ${a.position[1]}\nZ = ${a.position[2]}\n\nPosição final:\nX = ${fmt(c.position[0])}\nY = ${fmt(c.position[1])}\nZ = ${fmt(c.position[2])}\n\nOrientação original:\n${fmt(a.angle)}°\n\nRotação aplicada:\n${fmt(c.delta)}°\n\nOrientação final:\n${fmt(c.finalAngle)}°\n\nUnidade interna do IFC:\n${a.unit.name}`;
        $('applyBtn').disabled = false;
      } catch (e) { showError('resultMessage', e, 'Erro ao atualizar resumo'); $('applyBtn').disabled = true; }
    }
    function render() {
      const a = state.analysis;
      $('detected').innerHTML = `<dt>Esquema</dt><dd>${a.schema}</dd><dt>Unidade</dt><dd>${a.unit.name}</dd><dt>Entidade</dt><dd>${a.target.type} #${a.target.entity.id}</dd><dt>Coordenadas atuais</dt><dd>X=${a.position[0]}, Y=${a.position[1]}, Z=${a.position[2]}</dd><dt>Orientação horizontal</dt><dd>(${a.refDirection.join(', ')}) — ${fmt(a.angle)}°</dd><dt>Georreferenciamento</dt><dd>${a.geo ? 'Detectado' : 'Não detectado'}</dd>`;
      $('geoWarning').classList.toggle('hidden', !a.geo);
      updateSummary();
    }
    function loadFile(f) {
      $('fileError').textContent = '';
      $('resultMessage').textContent = '';
      revokeDownload();
      if (!f) return;
      if (!f.name.toLowerCase().endsWith('.ifc')) { $('fileError').textContent = 'Arquivo inválido. Selecione um .ifc.'; return; }
      const reader = new FileReader();
      reader.onload = () => {
        try { state = { ...state, file: f, text: reader.result, analysis: analyze(reader.result) }; $('fileInfo').textContent = `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`; render(); }
        catch (e) { showError('fileError', e, 'Erro ao analisar IFC'); }
      };
      reader.onerror = () => showError('fileError', reader.error || Error('Falha de leitura'), 'Erro ao ler arquivo');
      reader.readAsText(f);
    }
    $('applyBtn').onclick = () => {
      try {
        $('resultMessage').textContent = '';
        revokeDownload();
        const res = transform(state.text, opts());
        const blob = new Blob([res.text], { type: 'application/step' });
        const base = state.file.name.replace(/\.ifc$/i, ''), name = base + ($('suffix').value || '_TRANSFORMADO') + '.ifc';
        const url = URL.createObjectURL(blob);
        state.downloadUrl = url;
        $('downloadLink').href = url;
        $('downloadLink').download = name;
        $('downloadLink').classList.remove('hidden');
        $('resultMessage').textContent = 'Arquivo gerado com validação STEP concluída.';
      } catch (e) { showError('resultMessage', e, 'Erro ao transformar IFC'); }
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);