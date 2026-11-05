"use strict";
const assert = require("node:assert/strict");
const C = require("../atividades/conclusao-relatorio");

const reg = (id, obraCodigo, obra, projeto, colaborador, data, h, status = "Finalizado") => {
  const fim = `${String(8 + Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  return { id, obraId: obraCodigo, obraCodigo, obra, projeto, colaborador, status, dataInicio: data, horaInicio: "08:00", dataTermino: data, horaTermino: fim };
};
const periodo = { tipo: "mensal", rotulo: "OUTUBRO / 2026", dataInicio: "2026-10-01", dataFim: "2026-10-31" };

// ---- períodos anteriores
assert.deepEqual(C.calcularPeriodoAnterior(periodo), { tipo: "mensal", dataInicio: "2026-09-01", dataFim: "2026-09-30" });
assert.deepEqual(C.calcularPeriodoAnterior({ tipo: "mensal", dataInicio: "2026-03-01", dataFim: "2026-03-31" }).dataInicio, "2026-02-01");
assert.deepEqual(C.calcularPeriodoAnterior({ tipo: "semanal", rotulo: "SEMANA 44", dataInicio: "2026-10-25", dataFim: "2026-10-31" }), { tipo: "semanal", dataInicio: "2026-10-18", dataFim: "2026-10-24" });
assert.deepEqual(C.calcularPeriodoAnterior({ tipo: "anual", dataInicio: "2026-01-01", dataFim: "2026-12-31" }), { tipo: "anual", dataInicio: "2025-01-01", dataFim: "2025-12-31" });
assert.equal(C.descreverPeriodo(periodo), "Em outubro de 2026");
assert.equal(C.descreverPeriodo({ tipo: "semanal", rotulo: "SEMANA 44", dataInicio: "2026-10-25", dataFim: "2026-10-31" }), "Na semana 44 (25/10 a 31/10/2026)");
assert.equal(C.lerData("23/10/2026"), "2026-10-23"); assert.equal(C.lerData("SEM PREVISÃO"), "");

// ---- cenário parecido com outubro/2026
const registros = [
  reg("1", "OBR-45", "TCE", "Elétrico Baixa Tensão", "Rodrigo", "2026-10-02", 8),
  reg("2", "OBR-45", "TCE", "Elétrico Baixa Tensão", "Hellen", "2026-10-03", 8),
  reg("3", "OBR-45", "TCE", "Todos", "Geovanna", "2026-10-04", 8),
  reg("4", "OBR-45", "TCE", "Cabeamento", "Hellen", "2026-10-05", 6),
  reg("5", "OBR-15", "FIOCRUZ", "Cabeamento", "Bruno", "2026-10-06", 2),
  reg("6", "OBR-42", "3D", "Site", "Bruno", "2026-10-07", 2)
];
const colaboradores = [{ nome: "Rodrigo", horas: 10 }, { nome: "Hellen", horas: 12 }, { nome: "Geovanna", horas: 8 }, { nome: "Bruno", horas: 4 }];
const anterior = { tipo: "mensal", dataInicio: "2026-09-01", dataFim: "2026-09-30", horas: 20, horasPorObra: [{ chave: "OBR-45", obra: "OBR-45 — TCE", horas: 10 }, { chave: "OBR-99", obra: "OBR-99 — IPER", horas: 10 }] };
const semanais = [
  { atividade: "SENAC", prioridade: "P3", entregas: "23/10/2026" },
  { atividade: "IPER", prioridade: "P3", entregas: "2026-09-28" },
  { atividade: "Fecomércio", prioridade: "P1", entregas: "16/11/2026" },
  { atividade: "Fecomércio", prioridade: "P1", entregas: "16/11/2026" }
];
const r = C.analisarConclusao({ registros, atividades: registros, semanais, periodo, colaboradores, periodoAnterior: anterior, dataReferencia: "2026-11-05" });
const tudo = [...r.sintese, ...r.pontos.flatMap((p) => [p.ponto, p.encaminhamento]), r.proximasEntregas].join("\n");

assert.match(r.sintese[0], /^Em outubro de 2026, o setor registrou 34,00 h distribuídas em 3 obras, 70% acima do registrado em setembro de 2026 \(20,00 h\)\.$/);
assert.match(r.sintese[1], /OBR-45 — TCE concentrou 88% das horas, principalmente em Elétrico Baixa Tensão \(16,00 h\) e Cabeamento \(6,00 h\)/, "a disciplina genérica não deve aparecer como destaque");
assert.equal(r.sintese[2], "Todas as atividades registradas constam como finalizadas.");
const tipos = r.pontos.map((p) => p.tipo);
assert.ok(tipos.includes("concentracao_obra"));
assert.ok(tipos.includes("disciplina_generica"));
assert.ok(tipos.includes("prazo_planejamento"));
assert.ok(tipos.includes("obra_interrompida"));
assert.ok(!tipos.includes("sobrecarga"), "Hellen com 35% em equipe de 4 não chega a 1,5x a média");
assert.match(r.pontos.find((p) => p.tipo === "prazo_planejamento").ponto, /2 entregas do planejamento estão com prazo encerrado sem conclusão registrada: IPER \(28\/09, P3\) e SENAC \(23\/10, P3\)/);
assert.match(r.pontos.find((p) => p.tipo === "obra_interrompida").ponto, /OBR-99 — IPER \(10,00 h antes\)/);
assert.equal(r.proximasEntregas, "Para o próximo período, estão previstas as entregas de Fecomércio (16/11, P1).", "duplicatas do planejamento devem ser unificadas");
assert.doesNotMatch(tudo, /\((?:s|es)\)|nenhuma atrasadas|Na OUTUBRO|Demandas P3 exigem/);

// ---- sobrecarga real
const sobrecarga = C.analisarConclusao({ registros, atividades: registros, periodo, colaboradores: [{ nome: "Rodrigo", horas: 30 }, { nome: "Hellen", horas: 4 }], dataReferencia: "2026-11-05" });
assert.match(sobrecarga.pontos.find((p) => p.tipo === "sobrecarga").ponto, /^Rodrigo concentrou 88% das horas da equipe/);

// ---- atividades abertas e responsáveis
const abertas = [{ ...registros[0], status: "Atrasado" }, { ...registros[4], status: "Pausado" }];
const comAbertas = C.analisarConclusao({ registros, atividades: abertas, periodo, dataReferencia: "2026-11-05" });
assert.equal(comAbertas.sintese[2], "Ao fim do período, 1 estava pausada e 1 estava atrasada.");
assert.match(comAbertas.pontos.find((p) => p.tipo === "atraso").encaminhamento, /Responsáveis: Rodrigo/);

// ---- período sem desvios: nenhuma frase genérica
const equilibrados = [registros[4], registros[5], reg("7", "OBR-45", "TCE", "SPDA", "Hellen", "2026-10-08", 2)];
const limpo = C.analisarConclusao({ registros: equilibrados, atividades: equilibrados, periodo, colaboradores: [{ nome: "Bruno", horas: 4 }, { nome: "Hellen", horas: 2 }], dataReferencia: "2026-11-05" });
assert.deepEqual(limpo.pontos, []);
assert.match(limpo.sintese[1], /^O esforço ficou distribuído entre as obras/);
const duasObras = C.analisarConclusao({ registros: [registros[0], registros[4]], atividades: [registros[0], registros[4]], periodo, dataReferencia: "2026-11-05" });
assert.match(duasObras.pontos.find((p) => p.tipo === "concentracao_obra").ponto, /a outra obra somou 2,00 h/);

// ---- mês em andamento: não acusa queda nem obra parada
const emAndamento = C.analisarConclusao({ registros: [registros[0]], atividades: [registros[0]], periodo, periodoAnterior: { ...anterior, horas: 100 }, dataReferencia: "2026-10-10" });
assert.match(emAndamento.sintese[0], /período ainda está em andamento/);
assert.ok(!emAndamento.pontos.some((p) => ["queda", "obra_interrompida"].includes(p.tipo)));

// ---- resumo do período anterior
const resumo = C.resumirPeriodo(registros, anterior);
assert.equal(resumo.horas, 34); assert.equal(resumo.horasPorObra[0].chave, "OBR-45");

console.log("✓ conclusão dos relatórios: regras e redação validadas");
