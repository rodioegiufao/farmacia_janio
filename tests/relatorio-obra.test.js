"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { analisarObra, atividadeNoIntervalo, blocosGantt, montarXmlRelatorio, obterPeriodo, prepararTemplate, proximaRevisao, unirDisciplinas, validarDocumento, validarUrl } = require("../api/_relatorio-obra");

const obra = { id: "obra-1", codigo: "OBR-000015", nome: "FIOCRUZ" };
const atividade = (id, projeto, inicio, fim = inicio, status = "Finalizado", extra = {}) => ({ id, obra_id: obra.id, projeto, colaborador: extra.colaborador || "Rodrigo", trabalhos: extra.trabalhos || `Trabalho ${id}`, data_inicio: inicio, hora_inicio: extra.horaInicio || "08:00", data_termino: fim, hora_termino: extra.horaTermino || "12:00", status, classificacoes: extra.classificacoes || [] });

const base = { obra, projetosFicha: [{ projeto: "Elétrico", projeto_chave: "eletrico" }, { projeto: "CFTV", projeto_chave: "cftv" }, { projeto: "SPDA", projeto_chave: "spda" }], atividades: [atividade("1", "Elétrico", "2026-03-03"), atividade("2", "CFTV", "2026-09-28")], planner: [{ projeto: "SPDA" }, { projeto: "Cabeamento" }], entregas: [], projetosEntrega: [] };

// 1 e 2 — união das três fontes e disciplina sem atividade.
const uniao = unirDisciplinas(base);
assert.deepEqual(uniao.map((d) => d.projeto), ["Elétrico", "CFTV", "SPDA", "Cabeamento"]);
const analise = analisarObra(base), spda = analise.disciplinas.find((d) => d.projeto === "SPDA");
assert.equal(spda.atividades, 0); assert.equal(spda.horas, 0); assert.equal(spda.situacao, "Sem atividade registrada"); assert.ok(analise.pendencias.some((p) => p.tipo === "disciplina_sem_atividade"));

// 3 e 4 — período integral e incremento estritamente REV + dígitos.
assert.deepEqual(obterPeriodo(base.atividades), { inicio: "2026-03-03", fim: "2026-09-28", texto: "03/03/2026 a 28/09/2026", competencia: "MARÇO/2026 — SETEMBRO/2026" });
assert.equal(proximaRevisao(["REV00", "REV01"]), "REV02"); assert.equal(proximaRevisao(["EDIÇÃO FINAL"]), "");

// 5 — limite inferior exclusivo e limite superior inclusivo.
assert.equal(atividadeNoIntervalo(atividade("3", "CFTV", "2026-08-19", "2026-08-19"), "2026-08-19", "2026-09-29"), false);
assert.equal(atividadeNoIntervalo(atividade("4", "CFTV", "2026-08-20", "2026-08-20"), "2026-08-19", "2026-09-29"), true);

// 6 e 7 — horas oficiais não se multiplicam por classificações/rateio.
const quatroHoras = atividade("5", "Elétrico", "2026-05-01", "2026-05-01", "Finalizado", { classificacoes: [{ fase: "Lançamento", item: "Iluminação", minutos_dedicados: 150 }, { fase: "Lançamento", item: "Tomadas", minutos_dedicados: 90 }] });
const analiseHoras = analisarObra({ obra, projetosFicha: [], atividades: [quatroHoras], planner: [], entregas: [], projetosEntrega: [] });
assert.equal(analiseHoras.horasTotais, 4); assert.equal(analiseHoras.disciplinas[0].horas, 4);

// 8 — URL segura e relacionamento OpenXML externo sem colisão.
assert.equal(validarUrl("https://exemplo.com/processo"), "https://exemplo.com/processo"); assert.throws(() => validarUrl("javascript:alert(1)", true), /http/);
const templatePath = path.join(__dirname, "..", "atividades", "template", "Relatorio-Obra.docx");
const zip = new PizZip(fs.readFileSync(templatePath)); prepararTemplate(zip);
const entrega = { id: "entrega-1", obra_id: obra.id, tipo_emissao: "entrega_inicial", revisao: "REV00", data_entrega: "2026-09-29", link_processo: "https://exemplo.com/processo", observacoes: "", projetos: [] };
const valores = montarXmlRelatorio({ analise, entrega, zip });
const rels = zip.file("word/_rels/document.xml.rels").asText(); assert.match(rels, /relationships\/hyperlink/); assert.match(rels, /TargetMode="External"/); assert.match(rels, /https:\/\/exemplo.com\/processo/);

// 9 e 10 — Gantt usa apenas meses com atividade e blocos de até 12.
assert.equal(blocosGantt(base.atividades, analise.periodo).length, 1); assert.equal(analise.competencias.some((c) => c.mes === "2026-05"), false);
assert.deepEqual(blocosGantt([], { inicio: "2025-01-01", fim: "2026-08-01" }).map((b) => b.length), [12, 8]);

// 11 e 12 — pendência altera a conclusão factual.
const comPendente = analisarObra({ ...base, atividades: [atividade("6", "Elétrico", "2026-09-01", "2026-09-01", "Em progresso")] }); assert.ok(comPendente.pendencias.some((p) => p.tipo === "status"));
const zipPendente = new PizZip(fs.readFileSync(templatePath)); prepararTemplate(zipPendente); const xmlPendente = montarXmlRelatorio({ analise: comPendente, entrega, zip: zipPendente }); assert.match(xmlPendente.MMMM, /pendências registradas no item 9/); assert.doesNotMatch(xmlPendente.MMMM, /concluída definitivamente/);

// 13 — renderização elimina todos os marcadores e mantém tabelas OpenXML.
const doc = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true }); doc.render(valores); assert.equal(validarDocumento(doc.getZip()), true);
for (const marcador of ["AAAA", "ENTREGA", "REVISAO", "DATA_ENTREGA", "BBBB", "CCCC", "DDDD", "EEEE", "FFFF", "GGGG", "HHHH", "IIII", "JJJJ", "MMMM", "KKKK", "LLLL"]) assert.ok(!doc.getZip().file("word/document.xml").asText().includes(`[${marcador}]`));

console.log("✓ relatório de entrega da obra: 13 cenários validados");