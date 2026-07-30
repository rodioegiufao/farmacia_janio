const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const { _test } = require("./gerar-relatorio-word");

const templatePath = path.join(__dirname, "..", "atividades", "template", "Relatorio.docx");
const zip = new PizZip(fs.readFileSync(templatePath));

_test.prepararTemplateParaGraficos(zip);

assert.doesNotThrow(() => {
  const documento = new Docxtemplater(zip, {
    delimiters: { start: "[", end: "]" },
    paragraphLoop: true,
    linebreaks: true
  });

  documento.render(_test.montarDadosRelatorio({
    atividades: [],
    atividadesSemanais: [],
    periodoRelatorio: {
      tipo: "mensal",
      rotulo: "Julho de 2026",
      dataInicio: "2026-07-01",
      dataFim: "2026-07-31",
      mes: "Julho",
      ano: "2026"
    },
    graficos: {}
  }, zip));

  const resultado = documento.getZip().generate({ type: "nodebuffer" });
  assert.ok(resultado.length > 0);
});

console.log("Teste de geração do relatório Word: OK");