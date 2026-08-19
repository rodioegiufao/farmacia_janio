const assert = require("node:assert/strict");
const gantt = require("./planner-gantt");
let sequencia = 0;
const atividade = (dia, inicio="08:00", fim="10:00", colaborador="Rodrigo", termino=dia, id=`a${++sequencia}`) => ({ id, data_inicio:dia, hora_inicio:inicio, data_termino:termino, hora_termino:fim, colaborador });
const item = (id, etapa, atividadesVinculadas) => ({ id, etapa, estagio:id, atividadesVinculadas });

assert.equal(gantt.obterIntervaloRealAtividade(atividade("2026-08-18","08:00","12:00")).minutos,240);
assert.equal(gantt.obterIntervaloRealAtividade(atividade("2026-08-20","08:00","12:00","R","2026-08-18")),null);
const compartilhada=atividade("2026-08-03","08:00","10:00","Bruno");
const checklists=[
 {id:"p1",obraId:"o1",obra:"FIOCRUZ",projeto:"Elétrico",itens:[item("A","Fase A",[compartilhada,atividade("2026-08-08")]),item("B","Fase A",[atividade("2026-08-04")])]},
 {id:"p2",obraId:"o1",obra:"FIOCRUZ",projeto:"SPDA",itens:[item("C","Fase B",[atividade("2026-08-10")]),item("D","Fase B",[compartilhada])]}
];
const estrutura=gantt.construirEstruturaGantt(checklists,{periodo:{inicio:"2026-08-01",fim:"2026-08-31"}}), obra=estrutura[0], projeto=obra.projetos[0], fase=projeto.fases[0];
assert.deepEqual(fase.segmentosGantt.map(s=>s.data),["2026-08-03","2026-08-04","2026-08-08"],"a fase não inventa continuidade");
assert.deepEqual(projeto.segmentosGantt.map(s=>s.data),["2026-08-03","2026-08-04","2026-08-08"]);
assert.deepEqual(obra.segmentosGantt.map(s=>s.data),["2026-08-03","2026-08-04","2026-08-08","2026-08-10"]);
assert.equal(obra.metricas.minutosNoPeriodo,480,"atividade vinculada em dois projetos é deduplicada na obra");

const historico=[atividade("2026-07-01","08:00","04:00","A","2026-07-02"),atividade("2026-08-01","08:00","18:00")];
const metricas=gantt.calcularMetricasTemporais(historico,{inicio:"2026-08-01",fim:"2026-08-31"});
assert.equal(metricas.minutosNoPeriodo,600);assert.equal(metricas.minutosAcumulados,1800);
const dias=gantt.calcularMetricasTemporais([atividade("2026-08-01","08:00","10:00"),atividade("2026-08-01","14:00","18:00"),atividade("2026-08-03","08:00","12:00")]);
assert.equal(dias.diasAtivos,2);assert.equal(dias.diasJanela,3,"janela usa dias civis e contagem inclusiva");
const lacuna=gantt.calcularMetricasTemporais([atividade("2026-08-01"),atividade("2026-08-02"),atividade("2026-08-08")]);
assert.deepEqual(lacuna.maiorLacuna,{dias:5,inicio:"2026-08-02",fim:"2026-08-08"});
const cadencia=gantt.calcularMetricasTemporais([1,2,3,4,10].map(d=>atividade(`2026-08-${String(d).padStart(2,"0")}`)));
assert.equal(cadencia.diasJanela,10);assert.equal(cadencia.cadencia,.5);assert.equal(cadencia.colaboradores.length,1);
const faseParalela=fase.segmentosGantt.find(s=>s.data==="2026-08-03");assert.equal(faseParalela.itens.length,1);
const recolhidos=new Set([`fase:${fase.id}`]);
assert.ok(gantt.filtrarLinhasHierarquia(estrutura,{modo:"analitico",recolhidos}).includes(fase));
assert.ok(!gantt.filtrarLinhasHierarquia(estrutura,{modo:"analitico",recolhidos}).includes(fase.itens[0]));
assert.ok(!gantt.filtrarLinhasHierarquia(estrutura,{modo:"sintetico"}).some(n=>n.tipo==="item"));
assert.ok(gantt.filtrarLinhasHierarquia(estrutura,{modo:"analitico"}).some(n=>n.tipo==="item"));
console.log("planner-gantt: macroprocessos, períodos, métricas, deduplicação e hierarquia validados");
