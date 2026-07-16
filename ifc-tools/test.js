const fs = require('fs');
const path = require('path');
const t = require('./script.js');

function assert(name, condition) {
  if (!condition) throw new Error(`Falha: ${name}`);
  console.log(`✓ ${name}`);
}
function near(a, b) { return Math.abs(a - b) < 1e-8; }
function vecNear(a, b) { return a.length === b.length && a.every((v, i) => near(v, b[i])); }
function findIfcPath() {
  const cli = process.argv[2];
  const candidates = cli ? [cli] : [
    path.join(__dirname, 'IFC-SDAI-IPER(1).ifc'),
    path.join(process.cwd(), 'IFC-SDAI-IPER(1).ifc'),
    path.join(__dirname, '..', 'IFC-SDAI-IPER(1).ifc')
  ];
  for (const candidate of candidates) {
    const full = path.resolve(candidate);
    if (fs.existsSync(full)) return full;
  }
  throw new Error(`Arquivo IFC real não encontrado. Informe o caminho: node ifc-tools/test.js "IFC-SDAI-IPER(1).ifc"`);
}
function duplicatedIds(text) {
  const seen = new Set(), dup = new Set();
  for (const match of text.matchAll(/#(\d+)\s*=/g)) {
    if (seen.has(match[1])) dup.add(match[1]);
    seen.add(match[1]);
  }
  return [...dup];
}
function inspectHtml() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert('interface não contém iframe recursivo', !/iframe\s+[^>]*src=["']ifc_to_xkt\.html["']/i.test(html));
  assert('favicon data URL configurado', /<link\s+rel=["']icon["']\s+href=["']data:,["']/i.test(html));
  assert('botões principais existem', ['fileInput', 'applyBtn', 'downloadLink', 'summary'].every(id => html.includes(`id="${id}"`)));
}

const internalCount = t.runTests();
console.log(`Testes internos aprovados: ${internalCount}`);
inspectHtml();

const src = findIfcPath();
console.log(`Arquivo IFC testado: ${src}`);
const text = fs.readFileSync(src, 'utf8');
const before = t.analyze(text);
console.log(`Esquema: ${before.schema}`);
console.log(`Unidade: ${before.unit.name}`);
console.log(`Entidade encontrada: ${before.target.type} #${before.target.entity.id}`);
console.log(`Posição: (${before.position.join(',')})`);
console.log(`Orientação: (${before.refDirection.join(',')})`);
console.log(`Ângulo: ${before.angle}°`);

const opts = { angle: 90, rotationMode: 'relative', x: 0, y: 0, z: 0, unit: 'm', translationMode: 'relative', rotatePosition: false, pivot: before.position };
const rot90 = t.transform(text, opts).text;
const outAnalysis = t.analyze(rot90);
const dest = path.join(__dirname, 'IFC-SDAI-IPER_ROT90_TESTE.ifc');
fs.writeFileSync(dest, rot90);
console.log(`Arquivo gerado: ${dest}`);

assert('transformação concluída no arquivo real', rot90.length > 0);
assert('nenhum identificador duplicado', duplicatedIds(rot90).length === 0);
assert('nenhuma referência ausente', t.validateFinal(rot90));
assert('direção final numericamente equivalente a (0,1,0)', vecNear(outAnalysis.refDirection, [0, 1, 0]));
assert('eixo Z preservado', vecNear(outAnalysis.axis, before.axis));
assert('site, edifício e descendentes continuam na hierarquia', t.assertHierarchyPreserved(text, rot90));
assert('STEP inicia com ISO-10303-21', rot90.trimStart().startsWith('ISO-10303-21;'));
assert('STEP contém HEADER', /HEADER\s*;/i.test(rot90));
assert('STEP contém DATA', /DATA\s*;/i.test(rot90));
assert('STEP encerra corretamente', rot90.trim().endsWith('END-ISO-10303-21;'));
assert('entidades novas, se houver, ficam dentro da seção DATA', t.findDataSectionBounds(rot90).dataEnd > t.findDataSectionBounds(rot90).dataStart);

const rotNeg = t.transform(text, { ...opts, angle: -90 }).text;
assert('rotação horária produz (0,-1,0)', vecNear(t.analyze(rotNeg).refDirection, [0, -1, 0]));

const shifted = t.transform(text, { ...opts, angle: 0, x: 1, y: 2, z: 0.5 }).text;
const shiftedAnalysis = t.analyze(shifted);
assert('deslocamento converte 1 m = 100 unidades IFC quando IFC usa centímetros', before.unit.factorToMeter !== 0 && vecNear(shiftedAnalysis.position, [before.position[0] + 1 / before.unit.factorToMeter, before.position[1] + 2 / before.unit.factorToMeter, before.position[2] + 0.5 / before.unit.factorToMeter]));

const combo = t.transform(text, { ...opts, angle: 90, x: 1, y: 0, z: 0 }).text;
const comboAnalysis = t.analyze(combo);
assert('rotação e deslocamento combinados conferidos', vecNear(comboAnalysis.refDirection, [0, 1, 0]) && near(comboAnalysis.position[0], before.position[0] + 1 / before.unit.factorToMeter));

console.log('Todos os testes com o arquivo real foram concluídos.');