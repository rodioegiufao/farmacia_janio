const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { parseRequestBody, requireUser, sendJson } = require("./_auth");

const TEMPLATE_PATH = path.join(process.cwd(), "memo", "template", "memo.docx");
const IMAGE_MAX_WIDTH_EMU = 5486400; // aprox. 15,2 cm
const IMAGE_MAX_HEIGHT_EMU = 5486400;

const SUGESTOES_TIPO_ASSUNTO = {
  "Subestação": {
    tituloMemo: "MEMORANDO DE DIRETRIZES PARA SUBESTAÇÃO",
    objetivo: "O presente memorando tem por objetivo apresentar as diretrizes e solicitações necessárias para definição e compatibilização da área destinada à subestação, considerando os requisitos técnicos do projeto elétrico, as condições arquitetônicas e as necessidades de operação e manutenção.",
    diretrizGeral: "As soluções relacionadas à subestação deverão observar os requisitos técnicos de acesso, ventilação, operação, manutenção, segurança, afastamentos mínimos, compatibilização arquitetônica e atendimento às normas aplicáveis.",
    consideracoesFinais: "As informações apresentadas neste memorando deverão ser consideradas como premissas técnicas para a definição, compatibilização e consolidação da solução referente à subestação. Recomenda-se que as adequações indicadas sejam avaliadas em conjunto com os projetos de arquitetura, instalações elétricas e demais disciplinas envolvidas, de modo a garantir o atendimento aos requisitos técnicos, operacionais, normativos e de manutenção. Após a definição da solução, os projetos complementares deverão ser atualizados antes da emissão final."
  },
  "Definição de shafts": {
    tituloMemo: "MEMORANDO DE DEFINIÇÃO DE SHAFTS",
    objetivo: "O presente memorando tem por objetivo solicitar a definição e compatibilização dos shafts necessários ao encaminhamento das instalações, de modo a garantir espaços técnicos adequados para passagem, inspeção, manutenção e integração entre as disciplinas de projeto.",
    diretrizGeral: "Os shafts deverão ser definidos considerando o espaço necessário para passagem das instalações, possibilidade de inspeção e manutenção, compatibilização com elementos estruturais e arquitetônicos, além da integração com as demais disciplinas complementares.",
    consideracoesFinais: "As definições apresentadas neste memorando deverão ser consideradas como referência para a locação, dimensionamento e compatibilização dos shafts necessários ao encaminhamento das instalações. Recomenda-se que as áreas técnicas indicadas sejam validadas junto aos projetos de arquitetura e demais disciplinas, a fim de evitar interferências com elementos estruturais, circulações, ambientes de uso e sistemas complementares. A consolidação dos shafts deverá ocorrer antes da emissão final dos projetos."
  },
  "Solicitação de alteração de locais de equipamentos e objetos": {
    tituloMemo: "MEMORANDO DE SOLICITAÇÃO DE ALTERAÇÃO DE LOCALIZAÇÃO",
    objetivo: "O presente memorando tem por objetivo solicitar a avaliação e alteração de localização de equipamentos e elementos de projeto, visando compatibilizar as soluções técnicas com as condições arquitetônicas, operacionais e de manutenção.",
    diretrizGeral: "As alterações de localização deverão ser analisadas de forma integrada, considerando interferências com arquitetura, estrutura, circulação, acessibilidade, manutenção, operação e demais sistemas técnicos previstos no empreendimento.",
    consideracoesFinais: "As alterações indicadas neste memorando deverão ser avaliadas e compatibilizadas com os projetos envolvidos, considerando os impactos sobre acessibilidade, operação, manutenção, circulação, infraestrutura técnica e interferências com demais disciplinas. Recomenda-se que os novos posicionamentos sejam validados previamente à atualização das pranchas, de forma a evitar retrabalhos e garantir coerência entre arquitetura, instalações e demais projetos complementares."
  },
  "Solicitação de alturas de trabalho de projetos de instalação": {
    tituloMemo: "MEMORANDO DE DEFINIÇÃO DE ALTURAS DE INSTALAÇÃO",
    objetivo: "O presente memorando tem por objetivo solicitar a definição ou confirmação das alturas de instalação dos elementos técnicos previstos em projeto, garantindo compatibilização entre arquitetura, instalações, operação, manutenção e execução.",
    diretrizGeral: "As alturas de instalação deverão ser definidas de modo compatível com os critérios de uso, operação, manutenção, ergonomia, segurança, estética, acessibilidade e viabilidade executiva.",
    consideracoesFinais: "As alturas de instalação indicadas neste memorando deverão ser avaliadas e confirmadas pelas disciplinas envolvidas, considerando critérios de operação, manutenção, acessibilidade, ergonomia, segurança, normas técnicas aplicáveis e compatibilização com o projeto arquitetônico. Recomenda-se que as alturas definidas sejam incorporadas aos projetos antes da emissão final, evitando divergências entre documentação gráfica, memoriais e execução em obra."
  },
  "Outro": {
    tituloMemo: "MEMORANDO TÉCNICO",
    objetivo: "O presente memorando tem por objetivo formalizar diretrizes, solicitações e observações técnicas necessárias à compatibilização e consolidação das soluções de projeto.",
    diretrizGeral: "As informações apresentadas deverão ser analisadas pelas disciplinas envolvidas, considerando a compatibilização entre os projetos, as condições de execução, manutenção, operação e atendimento aos requisitos técnicos aplicáveis.",
    consideracoesFinais: "As informações apresentadas neste memorando deverão ser analisadas pelas disciplinas envolvidas e consideradas na compatibilização dos projetos. Recomenda-se que os ajustes necessários sejam validados previamente à emissão final, garantindo coerência entre as soluções adotadas, os documentos técnicos e as condições de execução."
  }
};

function textoSeguro(texto) { return String(texto || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])); }
function textoLimpo(valor) { return String(valor || "").trim(); }
function runXml(texto, bold = false, italic = false) { const pr = bold || italic ? `<w:rPr>${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}</w:rPr>` : ""; return `<w:r>${pr}<w:t xml:space="preserve">${textoSeguro(texto)}</w:t></w:r>`; }
function propriedadesParagrafo({ alignment = "both", firstLine = 709, before = 0, after = 160, line = 276 } = {}) { const indent = firstLine ? `<w:ind w:firstLine="${firstLine}"/>` : ""; return `<w:pPr><w:jc w:val="${alignment}"/>${indent}<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/></w:pPr>`; }
function paragrafoXml(texto, options = {}) { return `<w:p>${propriedadesParagrafo(options)}${runXml(texto, options.bold, options.italic)}</w:p>`; }
function normalizarCodigoMemo(codigoSetor, numeroMemorando, anoMemorando) { const set = textoLimpo(codigoSetor).toUpperCase(); const xyx = textoLimpo(numeroMemorando).padStart(3, "0"); const abc = textoLimpo(anoMemorando); return { set, xyx, abc, codigoCompleto: `MEMO-${set}-${xyx}-${abc}` }; }
function validarBody(body) { const obrigatorios = ["codigoSetor", "numeroMemorando", "anoMemorando", "setorOrigem", "setorDestino", "assunto", "tipoAssunto", "problema", "descricaoProblema", "data", "nomeResponsavel"]; const faltando = obrigatorios.filter((campo) => !textoLimpo(body[campo])); if (faltando.length) { const error = new Error(`Campos obrigatórios ausentes: ${faltando.join(", ")}.`); error.statusCode = 400; throw error; } const { abc } = normalizarCodigoMemo(body.codigoSetor, body.numeroMemorando, body.anoMemorando); if (!/^\d{4}$/.test(abc)) { const error = new Error("O ano do memorando deve ter 4 dígitos."); error.statusCode = 400; throw error; } }
function obterSugestao(tipoAssunto) { return SUGESTOES_TIPO_ASSUNTO[textoLimpo(tipoAssunto)] || SUGESTOES_TIPO_ASSUNTO.Outro; }
function normalizarImagemBase64(valor) { const texto = String(valor || "").trim(); const match = texto.match(/^data:image\/(png|jpeg|jpg);base64,([\s\S]+)$/); if (!match) return null; return { buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"), extension: match[1] === "jpg" ? "jpeg" : match[1] }; }
function dimensoesImagem(buffer, extension) { if (extension === "png" && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }; if (extension === "jpeg") { let offset = 2; while (offset < buffer.length) { if (buffer[offset] !== 0xff) break; const marker = buffer[offset + 1]; const length = buffer.readUInt16BE(offset + 2); if (marker >= 0xc0 && marker <= 0xc3) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }; offset += 2 + length; } } return { width: 1200, height: 800 }; }
function dimensoesEmu(buffer, extension) { const { width, height } = dimensoesImagem(buffer, extension); const ratio = Math.min(IMAGE_MAX_WIDTH_EMU / width, IMAGE_MAX_HEIGHT_EMU / height, 1); return { cx: Math.round(width * ratio), cy: Math.round(height * ratio) }; }
function imagemXml(rId, idx, buffer, extension) { const { cx, cy } = dimensoesEmu(buffer, extension); return `<w:p>${propriedadesParagrafo({ alignment: "center", firstLine: 0, before: 160, after: 120 })}<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${1200 + idx}" name="Imagem do memorando ${idx}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${idx}" name="memorando-imagem-${idx}.${extension}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`; }
function garantirContentTypeImagem(zip, extension) { const contentType = extension === "png" ? "image/png" : "image/jpeg"; const ct = zip.file("[Content_Types].xml").asText(); if (!ct.includes(`Extension="${extension}"`)) zip.file("[Content_Types].xml", ct.replace("</Types>", `<Default Extension="${extension}" ContentType="${contentType}"/></Types>`)); }
function gerarBlocoImagens(zip, imagens = []) { const lista = Array.isArray(imagens) ? imagens : []; let rels = zip.file("word/_rels/document.xml.rels").asText(); let relInsert = ""; let xml = ""; let contador = 0; lista.forEach((imagem) => { const normalizada = normalizarImagemBase64(imagem?.arquivo || imagem?.base64 || imagem); if (!normalizada?.buffer?.length) return; contador += 1; const rId = `rIdMemoImagem${contador}`; const extension = normalizada.extension; zip.file(`word/media/memorando-imagem-${contador}.${extension}`, normalizada.buffer); relInsert += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/memorando-imagem-${contador}.${extension}"/>`; garantirContentTypeImagem(zip, extension); const titulo = textoLimpo(imagem?.titulo) || `Figura ${contador} — Imagem do projeto`; const descricao = textoLimpo(imagem?.descricao); xml += paragrafoXml(titulo, { alignment: "center", firstLine: 0, before: contador === 1 ? 120 : 260, after: 80, bold: true }); xml += imagemXml(rId, contador, normalizada.buffer, extension); if (descricao) xml += paragrafoXml(descricao, { alignment: "both", firstLine: 0, before: 40, after: 180, italic: true }); }); if (relInsert) zip.file("word/_rels/document.xml.rels", rels.replace("</Relationships>", `${relInsert}</Relationships>`)); return xml || paragrafoXml("Não foram inseridas imagens do projeto."); }
function prepararTemplateMemo(zip) { let doc = zip.file("word/document.xml").asText(); doc = doc.replace(/\[IMAGENS_PROJETO\]\s*,/g, "[IMAGENS_PROJETO]"); doc = doc.replace(/\[(IMAGENS_PROJETO|DESCRICAO_PROBLEMA)\]/g, "[@$1]"); zip.file("word/document.xml", doc); return doc.includes("[@DESCRICAO_PROBLEMA]") || doc.includes("[DESCRICAO_PROBLEMA]"); }
function montarDadosMemo(body, zip, possuiDescricaoProblema) { const sugestao = obterSugestao(body.tipoAssunto); const codigo = normalizarCodigoMemo(body.codigoSetor, body.numeroMemorando, body.anoMemorando); const problema = textoLimpo(body.problema); const descricaoProblema = textoLimpo(body.descricaoProblema); return { SETOR_ORIGEM: textoLimpo(body.setorOrigem), SETOR_DESTINO: textoLimpo(body.setorDestino), ASSUNTO: textoLimpo(body.assunto), SET: codigo.set, XYX: codigo.xyx, ABC: codigo.abc, TITULO_MEMO: textoLimpo(body.tituloMemo) || sugestao.tituloMemo, OBJETIVO: textoLimpo(body.objetivo) || sugestao.objetivo, DIRETRIZ_GERAL: textoLimpo(body.diretrizGeral) || sugestao.diretrizGeral, PROBLEMA: possuiDescricaoProblema ? problema : `${problema}\n\n${descricaoProblema}`, DESCRICAO_PROBLEMA: paragrafoXml(descricaoProblema), IMAGENS_PROJETO: gerarBlocoImagens(zip, body.imagens), CONSIDERACOES_FINAIS: textoLimpo(body.consideracoesFinais) || sugestao.consideracoesFinais, DATA: textoLimpo(body.data), NOME: textoLimpo(body.nomeResponsavel), EMAILL: textoLimpo(body.email), NUMERO: textoLimpo(body.numero), _codigoCompleto: codigo.codigoCompleto } }

module.exports = async function gerarMemorandoWordHandler(req, res) {
  try {
    if (req.method !== "POST") { sendJson(res, 405, { error: "Método não suportado." }); return; }
    await requireUser(req);
    if (!fs.existsSync(TEMPLATE_PATH)) { sendJson(res, 404, { error: "Modelo memo.docx não encontrado em /memo/template." }); return; }
    const body = parseRequestBody(req);
    validarBody(body);
    const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH));
    const possuiDescricaoProblema = prepararTemplateMemo(zip);
    const dados = montarDadosMemo(body, zip, possuiDescricaoProblema);
    const doc = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true });
    doc.render(dados);
    const buffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
    const dataArquivo = new Date().toISOString().slice(0, 10);
    const filename = `memorando-${dados._codigoCompleto}-${dataArquivo}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Erro ao gerar memorando Word:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao gerar memorando Word." });
  }
};

module.exports.normalizarCodigoMemo = normalizarCodigoMemo;
module.exports.SUGESTOES_TIPO_ASSUNTO = SUGESTOES_TIPO_ASSUNTO;
