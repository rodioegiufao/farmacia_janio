const assert = require("node:assert/strict");
const {
  normalizarCampoAgrupamento,
  consolidarAtividades,
  consolidarAtividadesPorColaborador
} = require("./atividade-agrupamento");

function registro(sobrescritas = {}) {
  return {
    id: Math.random().toString(36),
    obraId: "obra-1",
    obraCodigo: "OBR-000001",
    obra: "IPER",
    projeto: "Elétrico",
    etapa: "Lançamento",
    trabalhos: "Pontos de iluminação",
    colaborador: "Rodrigo",
    status: "Finalizado",
    prioridade: "P1",
    dataInicio: "2026-07-01",
    horaInicio: "08:00",
    dataTermino: "2026-07-01",
    horaTermino: "10:00",
    ...sobrescritas
  };
}

assert.equal(normalizarCampoAgrupamento(" LANÇAMENTO "), "lancamento");

const mesmaAtividade = consolidarAtividades([
  registro({ id: "1" }),
  registro({ id: "2", obra: "iper", trabalhos: "Tomadas", horaInicio: "14:00", horaTermino: "17:00" }),
  registro({ id: "3", obra: "Íper", trabalhos: "Climatização", horaInicio: "17:00", horaTermino: "18:00" })
]);
assert.equal(mesmaAtividade.length, 1);
assert.equal(mesmaAtividade[0].horasConsolidadas, 6);
assert.equal(mesmaAtividade[0].quantidadeRegistros, 3);
assert.equal(mesmaAtividade[0].trabalhos.length, 3);

assert.equal(consolidarAtividades([registro(), registro({ etapa: "Distribuição" })]).length, 2);
assert.equal(consolidarAtividades([registro(), registro({ projeto: "CFTV" })]).length, 2);
assert.equal(consolidarAtividades([registro(), registro({ obraId: "obra-2", obra: "HGR" })]).length, 2);
assert.equal(consolidarAtividades([registro({ etapa: "", trabalhos: "Tomadas" }), registro({ etapa: "", trabalhos: "Iluminação" })]).length, 2);

assert.equal(consolidarAtividades([registro(), registro({ status: "Em progresso" })])[0].status, "Em progresso");
assert.equal(consolidarAtividades([registro(), registro({ status: "Atrasado" })])[0].status, "Atrasado");
assert.equal(consolidarAtividades([registro(), registro()])[0].status, "Finalizado");
assert.equal(consolidarAtividades([registro({ prioridade: "P1" }), registro({ prioridade: "P3" }), registro({ prioridade: "P2" })])[0].prioridade, "P3");

const porColaborador = consolidarAtividadesPorColaborador([
  registro({ id: "r1", horaInicio: "08:00", horaTermino: "10:00" }),
  registro({ id: "r2", horaInicio: "10:00", horaTermino: "13:00" }),
  registro({ id: "b1", colaborador: "Bruno", horaInicio: "13:00", horaTermino: "16:00" })
]);
assert.equal(porColaborador.length, 2);
assert.equal(porColaborador.find((item) => item.colaborador === "Rodrigo").horasConsolidadas, 5);
assert.equal(porColaborador.find((item) => item.colaborador === "Bruno").horasConsolidadas, 3);

console.log("Testes de consolidação de atividades: OK");