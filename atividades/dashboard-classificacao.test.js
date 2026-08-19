const assert = require("node:assert/strict");
const api = require("./dashboard-classificacao");
const registro = (obra, projeto, fase, item, horas) => ({ obra, projeto, fase, item, horas });
const calcular = (atividade) => atividade.horas;
const soma = (categorias) => categorias.reduce((total, categoria) => total + categoria.horas, 0);

const fases = api.agruparHorasPorFaseDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "", 4),
  registro("IPER", "Elétrico Baixa Tensão", "Distribuição", "", 6),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Lançamento", "", 3),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "", "", 5)
], calcular);
assert.equal(fases.categorias.find((item) => item.fase === "Distribuição").horas, 10, "a mesma fase e projeto deve somar entre obras");
assert.equal(fases.categorias.find((item) => item.fase === "Lançamento").horas, 3);
assert.equal(fases.horasSemFase, 5);
assert.equal(soma(fases.categorias) + fases.horasSemFase, fases.totalHoras);
assert.equal(api.obterLabelFaseDashboard(fases.categorias[0], false), "Distribuição");

const projetos = api.agruparHorasPorFaseDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "", 10),
  registro("FIOCRUZ", "CFTV", "Distribuição", "", 5)
], calcular);
assert.equal(projetos.categorias.length, 2, "a mesma fase em projetos diferentes não deve ser misturada");
assert.equal(api.obterLabelFaseDashboard(projetos.categorias[0], true), "Elétrico Baixa Tensão → Distribuição");

const itens = api.agruparHorasPorItemDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha", 6),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha · Leito", 8),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "A · B · C", 9),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Lançamento", "Iluminação", 4),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Plotagem", "Iluminação", 6),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "", 7)
], calcular);
assert.equal(itens.categorias.find((item) => item.item === "Eletrocalha").horas, 10);
assert.equal(itens.categorias.find((item) => item.item === "Leito").horas, 4);
["A", "B", "C"].forEach((nome) => assert.equal(itens.categorias.find((item) => item.item === nome).horas, 3));
assert.equal(itens.categorias.filter((item) => item.item === "Iluminação").length, 2, "o mesmo item em fases diferentes deve gerar categorias diferentes");
assert.equal(itens.categorias.find((item) => item.fase === "Lançamento" && item.item === "Iluminação").horas, 4);
assert.equal(itens.categorias.find((item) => item.fase === "Plotagem" && item.item === "Iluminação").horas, 6);
assert.equal(api.obterLabelItemDashboard(itens.categorias.find((item) => item.fase === "Lançamento" && item.item === "Iluminação"), false), "Lançamento → Iluminação");
assert.equal(itens.horasSemItem, 7);
assert.ok(Math.abs(soma(itens.categorias) + itens.horasSemItem - itens.totalHoras) < 1e-10, "o rateio deve conservar todas as horas");
const rateio = api.agruparHorasPorItemDashboard([registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha · Leito · Perfilado", 9)], calcular);
assert.deepEqual(rateio.categorias.map((item) => item.horas), [3, 3, 3]);

const mesmoItem = api.agruparHorasPorItemDashboard([
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Distribuição", "Eletrocalha", 2),
  registro("FIOCRUZ", "Elétrico Baixa Tensão", "Lançamento", "Eletrocalha", 3)
], calcular);
assert.equal(mesmoItem.categorias.length, 2);
assert.equal(api.obterLabelItemDashboard(mesmoItem.categorias[0], true), "Elétrico Baixa Tensão → Distribuição → Eletrocalha");
const quinze = Array.from({ length: 15 }, (_, indice) => ({ chave: `Categoria ${indice}`, horas: indice + 1 }));
const top = api.ordenarTopHorasDashboard(quinze, 10);
assert.equal(top.categorias.length, 10);
assert.equal(top.totalCategorias, 15);
assert.deepEqual(top.categorias.map((item) => item.horas), [15, 14, 13, 12, 11, 10, 9, 8, 7, 6]);
assert.deepEqual(api.ordenarTopHorasDashboard([{ chave: "B", horas: 2 }, { chave: "A", horas: 2 }]).categorias.map((item) => item.chave), ["A", "B"]);
assert.deepEqual(api.obterRegistrosDetalhadosDashboard([{ registros: [{ id: 1 }, { id: 2 }] }, { id: 3 }]).map((item) => item.id), [1, 2, 3]);
console.log("Dashboard de classificação: testes de taxonomia, rateio, conservação e Top 10 passaram");