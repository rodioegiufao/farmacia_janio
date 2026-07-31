const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const { _test } = require("./gerar-relatorio-word");

const templatePath = path.join(__dirname, "..", "atividades", "template", "Relatorio.docx");
const novoZip = () => new PizZip(fs.readFileSync(templatePath));
const periodo = { tipo: "semanal", rotulo: "Semana 30", dataInicio: "2026-07-19", dataFim: "2026-07-25", ano: "2026" };
const atividade = { consolidada: true, obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: ["Trabalho A", "Trabalho B"], colaboradores: ["Hellen"], quantidadeRegistros: 3, horasConsolidadas: 8, status: "Atrasado", prioridade: "P2", percentualConclusao: 40 };

{
  const zip = novoZip();
  _test.prepararTemplateParaGraficos(zip);
  assert.match(zip.file("word/document.xml").asText(), /\[@KKKK\]/, "o template deve reconhecer KKKK como XML bruto");
  const dados = _test.montarDadosRelatorio({ atividades: [], atividadesSemanais: [], periodoRelatorio: periodo, graficos: {} }, zip);
  assert.ok(Object.hasOwn(dados, "KKKK"));
  assert.doesNotMatch(dados.JJJJ, /ANEXO A/);
  assert.match(dados.KKKK, /<w:tbl>/);
  const documento = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true });
  documento.render(dados);
  assert.ok(documento.getZip().generate({ type: "nodebuffer" }).length > 0);
}

const tabela = _test.criarTabelaXml(["Indicador", "Resultado"], [["Atividades", 1]], { colunas: [{ largura: 2800 }, { largura: 1500, alinhamento: "center", noWrap: true }] });
assert.doesNotMatch(tabela, /tcFitText/);
assert.match(tabela, /<w:vAlign w:val="center"\/>/);
assert.match(tabela, /<w:jc w:val="center"\/>/);

const anexo = _test.gerarAnexo([atividade]);
assert.equal((anexo.match(/<w:tr>/g) || []).length, 2, "anexo deve ter cabeçalho e uma linha por atividade consolidada");
assert.equal((anexo.match(/Trabalho A/g) || []).length, 1);
assert.match(anexo, /<w:noWrap\/>/);

const desempenho = _test.gerarDesempenhoColaboradores([atividade]);
assert.match(desempenho, />1<\/w:t>/, "uma atividade consolidada");
assert.match(desempenho, />3<\/w:t>/, "três lançamentos");
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z"), "22/07/2026");
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z", { incluirHora: true }), "22/07/2026 às 07:48");
assert.equal(_test.calcularDiasAtraso(atividade, "2026-07-25"), 0, "atividade sem prazo explícito não recebe dias de atraso");
assert.equal(_test.calcularDiasAtraso({ ...atividade, prazo: "2026-07-24" }, "2026-07-25"), 1);
assert.equal(_test.calcularDiasAtraso({ ...atividade, prazo: "2026-07-23" }, "2026-07-25"), 2);
assert.equal(_test.formatarPeriodoEmFrase(periodo), "Durante a Semana 30");
});

console.log("Testes do relatório Word: OK");
