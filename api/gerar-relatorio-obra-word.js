const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { parseRequestBody, requireUser, sendJson, supabaseRequest } = require("./_auth");
const { localizarObraPorId } = require("./_obras");
const { analisarObra, carregarDadosObra, montarXmlRelatorio, nomeArquivo, prepararTemplate, validarDocumento } = require("./_relatorio-obra");

const TEMPLATE_PATH = path.join(process.cwd(), "atividades", "template", "Relatorio-Obra.docx");

module.exports = async function gerarRelatorioObraWord(req, res) {
  try {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Método não suportado." }, { Allow: "POST" });
    const user = await requireUser(req); if (user.perfil !== "admin") return sendJson(res, 403, { error: "Apenas administradores podem gerar relatórios de entrega." });
    const { obraId, entregaId } = parseRequestBody(req); if (!obraId || !entregaId) return sendJson(res, 400, { error: "Informe obraId e entregaId." });
    if (!fs.existsSync(TEMPLATE_PATH)) return sendJson(res, 404, { error: "Modelo Relatorio-Obra.docx não encontrado em /atividades/template." });
    const dados = await carregarDadosObra(obraId, supabaseRequest, localizarObraPorId, entregaId); const analise = analisarObra(dados); const entrega = { ...dados.entrega, projetos: dados.projetosEntrega };
    const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH)); prepararTemplate(zip); const valores = montarXmlRelatorio({ analise, entrega, zip });
    const doc = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true }); doc.render(valores); validarDocumento(doc.getZip());
    const buffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }); const arquivo = nomeArquivo(dados.obra, entrega.revisao);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); res.setHeader("Content-Disposition", `attachment; filename="${arquivo}"`); return res.status(200).send(buffer);
  } catch (error) { console.error("Erro ao gerar relatório de entrega da obra:", error); return sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao gerar relatório de entrega." }); }
};