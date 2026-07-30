const assert = require("assert");
const test = require("./gerar-relatorio-word")._test;
const atividades = [
  { obraId:"1", obra:"Obra A", projeto:"Elétrica", etapa:"Projeto", status:"Finalizado", prioridade:"P3", quantidadeRegistros:2, horasConsolidadas:8, consolidada:true },
  { obraId:"1", obra:"Obra A", projeto:"SPDA", etapa:"Projeto", status:"Atrasado", prioridade:"P2", quantidadeRegistros:1, horasConsolidadas:4, consolidada:true, prazo:"2026-07-10" },
  { obraId:"2", obra:"Obra B", projeto:"Elétrica", etapa:"Revisão", status:"Em progresso", prioridade:"P1", quantidadeRegistros:3, horasConsolidadas:6, consolidada:true, entregaPrevista:"2027-08-01" }
];
const i=test.calcularIndicadoresGerenciais(atividades);
assert.deepStrictEqual([i.totalObras,i.totalFrentes,i.totalDisciplinas,i.totalAtividades,i.totalLancamentos],[2,3,2,3,6]);
assert.strictEqual(test.pontoAtencaoProjeto({atividades:1,finalizadas:1,conclusao:100,atrasadas:0,pausadas:0,prioridadePredominante:"P3",statusPredominante:"Finalizado"}),"Demanda concluída no período.");
assert.strictEqual(test.calcularDiasAtraso(atividades[0],"2026-07-31"),0);
assert.strictEqual(test.calcularDiasAtraso(atividades[1],"2026-07-31"),21);
assert.strictEqual(test.resumirTextoRelatorio("a  \n b",120),"a b");
assert(test.verificarConsistencia(atividades,{dataFim:"2026-07-31"}).some((x)=>x.includes("fora do intervalo usual")));
assert(test.gerarLeituraGraficoStatus({...i,statusPredominante:"Finalizado"}).includes("finalizada"));
assert.throws(()=>test.normalizarPeriodoRelatorio({}),/Período/);
console.log("Testes do relatório executivo: OK");