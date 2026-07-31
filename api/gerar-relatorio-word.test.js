const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const { _test } = require("./gerar-relatorio-word");

const templatePath = path.resolve(__dirname, "..", "atividades", "template", "Relatorio.docx");
const productionTemplatePath = path.resolve(process.cwd(), "atividades", "template", "Relatorio.docx");
assert.equal(templatePath, productionTemplatePath, "o teste deve usar exatamente o template do endpoint");
console.log("Template testado:", templatePath);
const novoZip = () => new PizZip(fs.readFileSync(templatePath));
const periodo = { tipo: "semanal", rotulo: "Semana 30", dataInicio: "2026-07-19", dataFim: "2026-07-25", ano: "2026" };
const atividade = { consolidada: true, obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: ["Trabalho A", "Trabalho B"], colaboradores: ["Hellen"], quantidadeRegistros: 3, horasConsolidadas: 8, status: "Atrasado", prioridade: "P2", percentualConclusao: 40 };

{
  const paragrafos = _test.MARCADORES_XML_BRUTO.map((marcador) => marcador === "KKKK"
    ? "<w:p><w:pPr><w:jc w:val=\"both\"/></w:pPr><w:r><w:t>[</w:t></w:r><w:r><w:t>KKKK</w:t></w:r><w:r><w:t>]</w:t></w:r></w:p>"
    : `<w:p><w:r><w:t>[${marcador}]</w:t></w:r></w:p>`).join("");
  const zip = new PizZip();
  zip.file("word/document.xml", `<w:document><w:body>${paragrafos}</w:body></w:document>`);
  _test.prepararTemplateParaGraficos(zip);
  const xml = zip.file("word/document.xml").asText();
  assert.match(xml, /<w:p><w:pPr><w:jc w:val="both"\/><\/w:pPr><w:r><w:t>\[@KKKK\]<\/w:t><\/w:r><\/w:p>/);
  assert.doesNotMatch(xml, /<w:t>\[<\/w:t>|<w:t>KKKK<\/w:t>|<w:t>\]<\/w:t>/);
}

let xmlFinal;
{
  const zip = novoZip();
  _test.prepararTemplateParaGraficos(zip);
  assert.match(zip.file("word/document.xml").asText(), /\[@KKKK\]/, "o template real deve reconhecer KKKK como XML bruto");
  const dados = _test.montarDadosRelatorio({ atividades: [atividade], atividadesSemanais: [], periodoRelatorio: periodo, graficos: {} }, zip);
  assert.doesNotMatch(dados.JJJJ, /ANEXO A/);
  assert.match(dados.KKKK, /^<w:tbl>/);
  const documento = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true });
  documento.render(dados);
  xmlFinal = _test.validarDocumentoFinal(documento);
  assert.doesNotMatch(xmlFinal, /&lt;w:tbl&gt;/);
  assert.doesNotMatch(xmlFinal, /\[KKKK\]/);
  assert.doesNotMatch(xmlFinal, /\[@KKKK\]/);
  assert.doesNotMatch(xmlFinal, /<w:t\b[^>]*>[\s\S]*?&lt;w:/, "não deve existir OpenXML como texto");
  const indiceTitulo = xmlFinal.lastIndexOf("ANEXO A — DETALHAMENTO DAS FRENTES DE TRABALHO");
  const indiceTabela = xmlFinal.indexOf("<w:tbl>", indiceTitulo);
  assert.ok(indiceTitulo >= 0, "o título do Anexo deve existir");
  assert.ok(indiceTabela > indiceTitulo, "uma tabela real deve existir depois do título do Anexo");
  const xmlAnexo = xmlFinal.slice(indiceTabela);
  assert.equal((xmlAnexo.match(/<w:tr>/g) || []).length, 2, "o XML final do Anexo deve ter cabeçalho e uma linha consolidada");
  assert.match(xmlAnexo, /<w:tblHeader\/>/, "o cabeçalho deve repetir em páginas seguintes");
  assert.match(xmlAnexo, /<w:shd w:fill="1F4E78"\/>/, "o cabeçalho deve ser azul");
  assert.match(xmlAnexo, /OBR-000023/);
  assert.match(xmlFinal, /<w:type w:val="nextPage"\/>/, "o Anexo deve começar em uma nova seção");
  assert.match(xmlFinal, /<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"\/>/, "a seção do Anexo deve ser A4 paisagem");
  const outputPath = path.join(os.tmpdir(), "relatorio-semana-30.docx");
  fs.writeFileSync(outputPath, documento.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("Relatório de regressão gerado:", outputPath);
}

{
  const documentoQuebrado = {
    getZip: () => ({ file: () => ({ asText: () => "ANEXO A — DETALHAMENTO DAS FRENTES DE TRABALHO<w:t>&lt;w:tbl&gt;</w:t>" }) })
  };
  assert.throws(() => _test.validarDocumentoFinal(documentoQuebrado), /texto escapado/, "a publicação deve falhar quando a tabela estiver escapada");
}

const tabela = _test.criarTabelaXml(["Indicador", "Resultado"], [["Atividades", 1]], { colunas: [{ largura: 2800 }, { largura: 1500, alinhamento: "center", noWrap: true }] });
assert.doesNotMatch(tabela, /tcFitText/);
assert.match(tabela, /<w:vAlign w:val="center"\/>/);
assert.match(tabela, /<w:jc w:val="center"\/>/);

const anexo = _test.gerarAnexo([atividade]);
assert.equal((anexo.match(/<w:tr>/g) || []).length, 2);
assert.equal((anexo.match(/Trabalho A/g) || []).length, 1);
assert.match(anexo, /<w:noWrap\/>/);

const desempenho = _test.gerarDesempenhoColaboradores([atividade]);
assert.match(desempenho, />1<\/w:t>/);
assert.match(desempenho, />3<\/w:t>/);
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z"), "22/07/2026");
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z", { incluirHora: true }), "22/07/2026 às 07:48");
assert.equal(_test.calcularDiasAtraso(atividade, "2026-07-25"), 0);
assert.equal(_test.calcularDiasAtraso({ ...atividade, prazo: "2026-07-24" }, "2026-07-25"), 1);
assert.equal(_test.formatarPeriodoEmFrase(periodo), "Durante a Semana 30");

console.log("Testes do relatório Word: OK");
