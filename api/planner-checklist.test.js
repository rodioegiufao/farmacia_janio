const assert = require("node:assert/strict");
const { _test } = require("./planner-checklist");
assert.doesNotThrow(() => _test.requireAdmin({ perfil: "admin" }));
assert.throws(() => _test.requireAdmin({ perfil: "colaborador" }), (erro) => erro.statusCode === 403);
console.log("planner-checklist: acesso da análise temporal restrito a administradores");