const assert = require("node:assert/strict");
global.document = { createElement: () => ({ style: {} }) };
const graficos = require("./graficos-relatorio");
const canvas = graficos.canvasRelatorio(1200, 600);
assert.equal(canvas.width, 2400);
assert.equal(canvas.height, 1200);
assert.equal(graficos.CONFIG_GRAFICO_RELATORIO.fundo, "#ffffff");
assert.equal(graficos.formatarHoras(25.85), "25,85 h");
console.log("Gráficos do relatório: escala 2x, tema claro e formatação validados");