const assert = require("node:assert/strict");
const { _test } = require("./atividades");

assert.equal(
  _test.filtroAtividadesRelacionadas({
    colaborador: "Hellen",
    obra_id: "obra-1",
    obra: "Nome antigo",
    projeto: "Elétrico & SPDA",
    etapa: "Projeto executivo"
  }),
  "?colaborador=eq.Hellen&obra_id=eq.obra-1&projeto=eq.El%C3%A9trico%20%26%20SPDA&etapa=eq.Projeto%20executivo"
);

assert.equal(_test.filtroAtividadesRelacionadas({ colaborador: "Hellen" }), "");

assert.deepEqual(
  _test.activityUpdateOptions({ id: "atividade-1", status: "Finalizado" }),
  {
    method: "PATCH",
    body: JSON.stringify({ id: "atividade-1", status: "Finalizado" })
  }
);

console.log("Testes de atualização e cascata de finalização passaram.");
