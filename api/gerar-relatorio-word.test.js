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
const textoLongo = `Descrição técnica integral ${"sem qualquer corte no conteúdo registrado ".repeat(15)}fim do lançamento.`;
const registros = [
  { id: "1", obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: textoLongo, observacoes: "Primeira observação\ncom nova linha.", colaborador: "Hellen", dataInicio: "2026-07-19", horaInicio: "08:00:00", dataTermino: "2026-07-19", horaTermino: "10:00:00", criadoEm: "2026-07-19T12:00:00Z", status: "Atrasado", prioridade: "P2" },
  { id: "2", obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: "Texto deliberadamente repetido.", observacoes: "Segunda observação.", colaborador: "Bruno", dataInicio: "2026-07-20", horaInicio: "13:00", dataTermino: "2026-07-20", horaTermino: "16:30", criadoEm: "2026-07-20T17:00:00Z", status: "Em progresso", prioridade: "P1" },
  { id: "3", obraId: "1", obraCodigo: "OBR-000023", obra: "Posto", projeto: "Elétrico", etapa: "Plotagem", trabalhos: "Texto deliberadamente repetido.", observacoes: "Projeto ainda incompleto por ausência da potência das bombas. Também solicitei um shaft no superior.", colaborador: "Hellen", dataInicio: "2026-07-21", horaInicio: "08:30", dataTermino: "2026-07-21", horaTermino: "11:00", criadoEm: "2026-07-21T12:00:00Z", status: "Finalizado", prioridade: "P2" }
];
const [atividade] = require("../atividades/atividade-agrupamento").consolidarAtividades(registros);

assert.equal(_test.formatarCompetenciaRelatorio(periodo), "JULHO/2026");
assert.equal(_test.formatarCompetenciaRelatorio({ ...periodo, dataInicio: "2026-07-27", dataFim: "2026-08-02" }), "JULHO/2026 — AGOSTO/2026");
assert.equal(_test.formatarCompetenciaRelatorio({ ...periodo, dataInicio: "2026-12-28", dataFim: "2027-01-03" }), "DEZEMBRO/2026 — JANEIRO/2027");
assert.equal(_test.formatarCompetenciaRelatorio({ tipo: "anual", dataInicio: "2026-01-01", dataFim: "2026-12-31" }), "2026");
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
  const dados = _test.montarDadosRelatorio({ atividades: registros, atividadesSemanais: [], periodoRelatorio: periodo, graficos: {} }, zip);
  assert.equal(dados.PERIODO_RELATORIO, "JULHO/2026");
  assert.equal(dados.COMPETENCIA_RELATORIO, "JULHO/2026");
  assert.equal(dados.ROTULO_PERIODO_RELATORIO, "SEMANA 30");
  assert.match(dados.BBBB, /<w:jc w:val="both"\/>/);
  assert.match(dados.BBBB, /<w:ind w:firstLine="567"\/>/);
  assert.match(dados.BBBB, /<w:widowControl\/>/);
  assert.match(dados.JJJJ, /<w:jc w:val="both"\/>/);
  assert.match(dados.JJJJ, /Pontos de atenção:/);
  assert.doesNotMatch(dados.BBBB + dados.CCCC + dados.JJJJ, /w:firstLine="709"/);
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
  assert.equal((xmlAnexo.match(/<w:tr>/g) || []).length, 8, "o Anexo deve ter quatro linhas de identificação, cabeçalho e três lançamentos");
  assert.match(xmlAnexo, /<w:tblHeader\/>/, "o cabeçalho deve repetir em páginas seguintes");
  assert.match(xmlAnexo, /<w:shd w:fill="1F4E78"\/>/, "o cabeçalho deve ser azul");
  assert.match(xmlAnexo, /OBR-000023/);
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
assert.match(tabela, /<w:tcBorders>/);
assert.match(tabela, /<w:top w:val="single"/);
assert.match(tabela, /<w:left w:val="single"/);
assert.match(tabela, /<w:bottom w:val="single"/);
assert.match(tabela, /<w:right w:val="single"/);
assert.match(tabela, /<w:tblCellSpacing w:w="0" w:type="dxa"\/>/);

const grupos = _test.agruparLancamentosParaAnexo(registros, [atividade]);
assert.equal(grupos.length, 1);
assert.equal(grupos[0].registros.length, 3);
const anexo = _test.gerarAnexoDetalhado(registros, [atividade]);
assert.equal((anexo.match(/<w:tr>/g) || []).length, 8);
assert.equal((anexo.match(/Texto deliberadamente repetido\./g) || []).length, 2);
assert.match(anexo, new RegExp(textoLongo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(anexo, /Descrição técnica integral[^<]*…/);
assert.match(anexo, /Primeira observação/);
assert.match(anexo, /<w:br\/>/);
assert.match(anexo, />2 h</);
assert.match(anexo, />3,5 h</);
assert.match(anexo, />2,5 h</);
assert.doesNotMatch(anexo, />8 h<\/w:t>[\s\S]*>8 h<\/w:t>/);
assert.match(anexo, /<w:noWrap\/>/);
assert.equal((anexo.match(/<w:tblW w:w="13750" w:type="dxa"\/>/g) || []).length, 2);
assert.ok(anexo.includes('<w:gridCol w:w="4800"/>'));
assert.ok(anexo.includes('<w:gridCol w:w="4600"/>'));
assert.ok(anexo.includes('<w:shd w:fill="1F4E78"/>'));
assert.ok(anexo.includes('<w:shd w:fill="EAF2F8"/>'));
assert.ok(anexo.includes('<w:color w:val="FFFFFF"/>'));
assert.ok(anexo.includes("<w:keepNext/>"));
assert.match(anexo, /w:line="200" w:lineRule="exact"/);
assert.equal(_test.formatarIntervaloHorarioRelatorio(registros[0]), "08:00–10:00");
assert.equal(_test.formatarIntervaloHorarioRelatorio({ horaInicio: "08:00:00" }), "08:00–—");
assert.equal(_test.formatarIntervaloHorarioRelatorio({}), "—");

const desempenho = _test.gerarDesempenhoColaboradores([atividade]);
assert.match(desempenho, />1<\/w:t>/);
assert.match(desempenho, />3<\/w:t>/);
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z"), "22/07/2026");
assert.equal(_test.formatarDataHoraRelatorio("2026-07-22T11:48:00.000Z", { incluirHora: true }), "22/07/2026 às 07:48");
assert.equal(_test.calcularDiasAtraso(atividade, "2026-07-25"), 0);
assert.equal(_test.calcularDiasAtraso({ ...atividade, prazo: "2026-07-24" }, "2026-07-25"), 1);
assert.equal(_test.formatarPeriodoEmFrase(periodo), "Durante a Semana 30");

console.log("Testes do relatório Word: OK");
