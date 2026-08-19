const assert = require("node:assert/strict");
const relatorio = require("./planner-gantt-relatorio");
const engine = require("./planner-gantt");
const atividade = (id, dia, obra = "FIOCRUZ") => ({ id, obra, projeto: "Elétrico", etapa: "Lançamento", data_inicio: dia, hora_inicio: "08:00", data_termino: dia, hora_termino: "10:00" });
const todas = [atividade("15", "2026-08-15"), atividade("18", "2026-08-18"), atividade("20", "2026-08-20"), atividade("25", "2026-08-25"), atividade("tce", "2026-08-20", "TCE")];
const checklists = [
  { id: "p1", obraId: "o1", obra: "FIOCRUZ", projeto: "Elétrico", itens: [{ id: "i1", etapa: "Lançamento", atividadesVinculadas: todas.slice(0, 4) }] },
  { id: "p2", obraId: "o2", obra: "TCE", projeto: "CFTV", itens: [{ id: "i2", etapa: "Plotagem", atividadesVinculadas: [todas[4]] }] }
];
const original = JSON.stringify(checklists), periodo = { inicio: "2026-08-17", fim: "2026-08-22" };
const dados = relatorio.prepararEstrutura({ checklists, atividadesPermitidas: [todas[1], todas[2]], periodo });
assert.equal(JSON.stringify(checklists), original, "o Planner visível deve permanecer imutável");
assert.equal(dados.estrutura.length, 1, "deve respeitar a população filtrada do relatório");
assert.deepEqual(dados.dias, ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"]);
const linhas = engine.filtrarLinhasHierarquia(dados.estrutura, { modo: "sintetico" });
assert.ok(!linhas.some((linha) => linha.tipo === "item"), "a visão executiva não mostra itens");
assert.deepEqual(linhas.find((linha) => linha.tipo === "fase").segmentosPeriodo.map((s) => s.data), ["2026-08-18", "2026-08-20"], "dias sem execução não viram barra contínua");
assert.equal(linhas.find((linha) => linha.tipo === "obra").metricas.minutosNoPeriodo, 240);
assert.equal(linhas.find((linha) => linha.tipo === "projeto").metricas.minutosNoPeriodo, 240);
assert.equal(linhas.find((linha) => linha.tipo === "fase").metricas.minutosNoPeriodo, 240);
assert.equal(relatorio.formatarHoras(330), "5,50 h");
const duplicada = relatorio.prepararEstrutura({ checklists: [{ ...checklists[0], itens: [{ ...checklists[0].itens[0], atividadesVinculadas: [todas[1], todas[1]] }] }], atividadesPermitidas: [todas[1]], periodo });
assert.equal(engine.filtrarLinhasHierarquia(duplicada.estrutura, { modo: "sintetico" }).find((x) => x.tipo === "fase").metricas.minutosNoPeriodo, 120, "a atividade não pode duplicar horas no mesmo nível");
assert.equal(relatorio.prepararEstrutura({ checklists, atividadesPermitidas: [], periodo }).estrutura.length, 0);
console.log("planner-gantt-relatorio: filtro, período, segmentos, síntese e imutabilidade validados");