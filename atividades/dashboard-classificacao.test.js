const assert = require("node:assert/strict");
const api = require("./dashboard-classificacao");
const registro = (obra, fase, item, horas) => ({ obra, fase, item, horas });
const calcular = (atividade) => atividade.horas;
const soma = (categorias) => categorias.reduce((total, categoria) => total + categoria.horas, 0);

const fases = api.agruparHorasPorFaseDashboard([registro("BT", "Distribuição", "", 4), registro("BT", "Distribuição", "", 6), registro("BT", "Lançamento", "", 3), registro("BT", "", "", 5)], calcular);
assert.equal(fases.categorias.find((item) => item.fase === "Distribuição").horas, 10);
assert.equal(fases.categorias.find((item) => item.fase === "Lançamento").horas, 3);
assert.equal(fases.horasSemFase, 5);
assert.equal(soma(fases.categorias) + fases.horasSemFase, fases.totalHoras);

const obras = api.agruparHorasPorFaseDashboard([registro("Farmácia", "Distribuição", "", 10), registro("Hospital", "Distribuição", "", 5)], calcular);
assert.equal(obras.categorias.length, 2);
assert.equal(api.obterLabelFaseDashboard(obras.categorias[0], true), "Farmácia → Distribuição");

const itens = api.agruparHorasPorItemDashboard([registro("BT", "Distribuição", "Eletrocalha", 6), registro("BT", "Distribuição", "Eletrocalha · Leito", 8), registro("BT", "Distribuição", "A · B · C", 9), registro("BT", "Lançamento", "Iluminação", 4), registro("BT", "Plotagem", "Iluminação", 6), registro("BT", "Distribuição", "", 7)], calcular);
assert.equal(itens.categorias.find((item) => item.item === "Eletrocalha").horas, 10);
assert.equal(itens.categorias.find((item) => item.item === "Leito").horas, 4);
["A", "B", "C"].forEach((nome) => assert.equal(itens.categorias.find((item) => item.item === nome).horas, 3));
assert.equal(itens.categorias.filter((item) => item.item === "Iluminação").length, 1);
assert.equal(itens.categorias.find((item) => item.item === "Iluminação").horas, 10);
assert.equal(itens.horasSemItem, 7);
assert.ok(Math.abs(soma(itens.categorias) + itens.horasSemItem - itens.totalHoras) < 1e-10, "o rateio deve conservar todas as horas");
const mesmoItem = api.agruparHorasPorItemDashboard([registro("Farmácia", "Distribuição", "Eletrocalha", 2), registro("Farmácia", "Lançamento", "Eletrocalha", 3)], calcular);
assert.equal(mesmoItem.categorias.length, 1);
assert.equal(mesmoItem.categorias[0].horas, 5);
assert.equal(api.obterLabelItemDashboard(mesmoItem.categorias[0], true), "Farmácia → Eletrocalha");
const quinze = Array.from({ length: 15 }, (_, indice) => ({ chave: `Categoria ${indice}`, horas: indice + 1 }));
const top = api.ordenarTopHorasDashboard(quinze, 10);
assert.equal(top.categorias.length, 10);
assert.equal(top.totalCategorias, 15);
assert.deepEqual(top.categorias.map((item) => item.horas), [15, 14, 13, 12, 11, 10, 9, 8, 7, 6]);
assert.deepEqual(api.ordenarTopHorasDashboard([{ chave: "B", horas: 2 }, { chave: "A", horas: 2 }]).categorias.map((item) => item.chave), ["A", "B"]);
assert.deepEqual(api.obterRegistrosDetalhadosDashboard([{ registros: [{ id: 1 }, { id: 2 }] }, { id: 3 }]).map((item) => item.id), [1, 2, 3]);
console.log("Dashboard de classificação: testes de agrupamento, rateio, conservação e Top 10 passaram");
