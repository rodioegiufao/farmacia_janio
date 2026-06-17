const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { parseRequestBody, requireUser, sendJson } = require("./_auth");

const TEMPLATE_PATH = path.join(process.cwd(), "atividades", "template", "Relatorio.docx");
const MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
const STATUS = ["Atrasado", "Em progresso", "Pausado", "Finalizado"];
const PRIORIDADES = ["P0", "P1", "P2", "P3"];
const PROJETOS = ["CFTV", "Cabeamento", "Telefonia", "Elétrico Baixa Tensão", "Iluminação Externa", "SPDA", "Subestação", "Alimentador", "Mapa Chave/Situação", "Sonorização", "Solar", "Automação", "Outros"];
const SEM_REGISTROS = "Não foram identificados registros para o período analisado.";

function normalizarTexto(texto) {
  return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function obterIntervaloAtividade(atividade) {
  if (!atividade.dataInicio || !atividade.horaInicio || !atividade.dataTermino || !atividade.horaTermino) return null;
  const inicio = new Date(`${atividade.dataInicio}T${atividade.horaInicio}`);
  const fim = new Date(`${atividade.dataTermino}T${atividade.horaTermino}`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) return null;
  return { inicio, fim };
}

function calcularHorasAtividade(atividade) {
  const intervalo = obterIntervaloAtividade(atividade);
  return intervalo ? (intervalo.fim - intervalo.inicio) / 36e5 : 0;
}

function formatarNumero(valor, casas = 2) {
  return Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

function percentual(parte, total) {
  return total ? Math.round((parte / total) * 100) : 0;
}

function contarProjetosTrabalhados(lista) {
  return new Set(lista.map((a) => `${normalizarTexto(a.obra)}|${normalizarTexto(a.projeto)}`).filter((chave) => chave !== "|")).size;
}

function agruparPorColaborador(lista) {
  return lista.reduce((acc, atividade) => {
    const nome = atividade.colaborador || "Sem colaborador";
    acc[nome] ||= { total: 0, finalizadas: 0, progresso: 0, atrasadas: 0, horas: 0, projetosSet: new Set() };
    acc[nome].total += 1;
    acc[nome].finalizadas += atividade.status === "Finalizado" ? 1 : 0;
    acc[nome].progresso += atividade.status === "Em progresso" ? 1 : 0;
    acc[nome].atrasadas += atividade.status === "Atrasado" ? 1 : 0;
    acc[nome].horas += calcularHorasAtividade(atividade);
    if (atividade.obra || atividade.projeto) acc[nome].projetosSet.add(`${normalizarTexto(atividade.obra)}|${normalizarTexto(atividade.projeto)}`);
    return acc;
  }, {});
}

function itemMaximo(entries, campo) {
  return entries.reduce((max, atual) => (!max || atual[1][campo] > max[1][campo] ? atual : max), null);
}

function gerarResumoGeral(atividades) {
  if (!atividades.length) return SEM_REGISTROS;
  const total = atividades.length;
  const finalizadas = atividades.filter((a) => a.status === "Finalizado").length;
  const progresso = atividades.filter((a) => a.status === "Em progresso").length;
  const atrasadas = atividades.filter((a) => a.status === "Atrasado").length;
  const projetos = contarProjetosTrabalhados(atividades);
  const horas = atividades.reduce((soma, atividade) => soma + calcularHorasAtividade(atividade), 0);
  return `No período analisado, foram registradas ${total} atividade(s) no setor, sendo ${progresso} em progresso, ${finalizadas} finalizada(s) e ${atrasadas} atrasada(s). Foram identificados ${projetos} projeto(s)/obra(s) distinto(s), com total aproximado de ${formatarNumero(horas)} hora(s) trabalhada(s). O percentual geral de conclusão da equipe foi de ${percentual(finalizadas, total)}%.`;
}

function gerarDesempenhoColaboradores(atividades) {
  const resumo = Object.entries(agruparPorColaborador(atividades));
  if (!resumo.length) return SEM_REGISTROS;
  const linhas = resumo.map(([nome, dados]) => `${nome} registrou ${dados.total} atividade(s) no período, sendo ${dados.finalizadas} finalizada(s), ${dados.progresso} em progresso e ${dados.atrasadas} atrasada(s), atuando em ${dados.projetosSet.size} projeto(s)/obra(s) distinto(s), com ${formatarNumero(dados.horas)} hora(s) trabalhada(s).`);
  const maiorTotal = itemMaximo(resumo, "total");
  const maiorFinalizadas = itemMaximo(resumo, "finalizadas");
  const maiorHoras = itemMaximo(resumo, "horas");
  linhas.push(`Como destaques do período, ${maiorTotal[0]} apresentou o maior número de atividades registradas (${maiorTotal[1].total}), ${maiorFinalizadas[0]} apresentou o maior número de atividades finalizadas (${maiorFinalizadas[1].finalizadas}) e ${maiorHoras[0]} concentrou a maior carga horária registrada (${formatarNumero(maiorHoras[1].horas)} hora(s)).`);
  return linhas.join("\n\n");
}

function gerarDistribuicaoStatus(atividades) {
  if (!atividades.length) return SEM_REGISTROS;
  const total = atividades.length;
  const partes = STATUS.map((status) => {
    const qtd = atividades.filter((a) => a.status === status).length;
    return `${status}: ${qtd} atividade(s), correspondendo a ${percentual(qtd, total)}%`;
  });
  const predominante = STATUS.map((status) => [status, atividades.filter((a) => a.status === status).length]).sort((a, b) => b[1] - a[1])[0];
  return `Quanto ao status das atividades, a distribuição observada foi: ${partes.join("; ")}. Observa-se predominância de demandas classificadas como ${predominante[0]}, representando ${percentual(predominante[1], total)}% do total analisado.`;
}

function gerarDistribuicaoProjeto(atividades) {
  if (!atividades.length) return SEM_REGISTROS;
  const contagem = PROJETOS.map((projeto) => [projeto, atividades.filter((a) => a.projeto === projeto).length]);
  const maior = [...contagem].sort((a, b) => b[1] - a[1])[0];
  const semAtividades = contagem.filter(([, qtd]) => qtd === 0).map(([projeto]) => projeto);
  const obras = Object.entries(atividades.reduce((acc, a) => { if (a.obra) acc[a.obra] = (acc[a.obra] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `As atividades concentraram-se principalmente em projetos de ${maior[0]}, com ${maior[1]} registro(s), indicando a disciplina técnica com maior demanda no período. ${semAtividades.length ? `Não foram identificadas atividades para os seguintes tipos de projeto: ${semAtividades.join(", ")}.` : "Todos os tipos de projeto cadastrados apresentaram ao menos uma atividade."} As obras/projetos mais recorrentes foram: ${obras.length ? obras.map(([obra, qtd]) => `${obra} (${qtd})`).join(", ") : "não informado"}.`;
}

function gerarDistribuicaoPrioridade(atividades) {
  if (!atividades.length) return SEM_REGISTROS;
  const contagem = PRIORIDADES.map((p) => [p, atividades.filter((a) => a.prioridade === p).length]);
  const criticas = contagem.filter(([p, qtd]) => ["P0", "P1"].includes(p) && qtd > 0);
  const maior = [...contagem].sort((a, b) => b[1] - a[1])[0];
  return `No período analisado, a distribuição por prioridade foi: ${contagem.map(([p, qtd]) => `${p}: ${qtd} atividade(s)`).join("; ")}. A maior concentração ocorreu em ${maior[0]}, com ${maior[1]} registro(s). ${criticas.length ? `Foram identificadas demandas críticas ou prioritárias em ${criticas.map(([p, qtd]) => `${p} (${qtd})`).join(" e ")}, recomendando acompanhamento gerencial direto.` : "Não foram identificadas atividades classificadas como P0 ou P1, indicando ausência de demandas críticas ou de maior prioridade no período analisado."}`;
}

function gerarAtividadesSemana(semanais) {
  if (!semanais.length) return SEM_REGISTROS;
  const grupos = semanais.reduce((acc, item) => { const semana = item.semana || "Semana não informada"; acc[semana] ||= []; acc[semana].push(item); return acc; }, {});
  return Object.entries(grupos).map(([semana, itens]) => {
    const descricoes = itens.slice(0, 8).map((item) => `${item.atividade || "Atividade sem título"}${item.prioridade ? `, prioridade ${item.prioridade}` : ""}${item.entregas ? `, com entregas previstas: ${item.entregas}` : ""}${item.descricao ? `. ${item.descricao}` : ""}`);
    return `Na ${semana}, foram registradas ${itens.length} atividade(s): ${descricoes.join("; ")}.`;
  }).join("\n\n");
}

function gerarConclusao(atividades) {
  const atrasadas = atividades.filter((a) => a.status === "Atrasado").length;
  const criticas = atividades.filter((a) => ["P0", "P1"].includes(a.prioridade)).length;
  return `Conclui-se que o controle sistematizado das atividades contribui para o acompanhamento do desempenho individual e coletivo da equipe, permitindo identificar demandas em andamento, atividades finalizadas, atrasos, prioridades e concentração de esforços por projeto. ${atrasadas || criticas ? `No período, foram observados ${atrasadas} registro(s) atrasado(s) e ${criticas} demanda(s) de prioridade P0/P1, pontos que devem permanecer sob acompanhamento.` : "No período analisado, não foram evidenciados atrasos ou demandas críticas em volume significativo a partir dos registros encaminhados."} Recomenda-se a atualização contínua dos registros para garantir a confiabilidade dos indicadores e subsidiar a tomada de decisão no âmbito do Setor de Engenharia Elétrica.`;
}

function montarDadosRelatorio(body) {
  const hoje = new Date();
  const atividades = Array.isArray(body.atividades) ? body.atividades : [];
  const atividadesSemanais = Array.isArray(body.atividadesSemanais) ? body.atividadesSemanais : [];
  return {
    AAAA: "Relatório de acompanhamento das atividades desenvolvidas pelo Setor de Engenharia Elétrica, elaborado com base nos registros cadastrados no sistema de controle de atividades, considerando produtividade individual, produtividade coletiva, status das demandas, prioridades, projetos e atividades semanais.",
    MES_ATUAL: MESES[hoje.getMonth()],
    ANO_ATUAL: String(hoje.getFullYear()),
    BBBB: "O presente relatório tem por finalidade apresentar o acompanhamento das atividades desenvolvidas pelo Setor de Engenharia Elétrica, com base nos registros inseridos no sistema de controle de atividades. O documento consolida informações relativas à produtividade individual e coletiva, distribuição das demandas por status, projetos, prioridades, obras, horas trabalhadas e planejamento semanal, permitindo melhor visualização do desempenho da equipe e das demandas em andamento.",
    CCCC: gerarResumoGeral(atividades),
    DDDD: gerarDesempenhoColaboradores(atividades),
    EEEE: gerarDistribuicaoStatus(atividades),
    FFFF: gerarDistribuicaoProjeto(atividades),
    GGGG: gerarDistribuicaoPrioridade(atividades),
    HHHH: gerarAtividadesSemana(atividadesSemanais),
    IIII: "Os gráficos de acompanhamento encontram-se disponíveis no dashboard do sistema, contemplando atividades por colaborador, projetos/obras por colaborador, horas trabalhadas, distribuição por status, atividades finalizadas por mês, atividades por tipo de projeto, prioridades e obras em andamento. A inserção automática de imagens dos gráficos poderá ser incorporada em etapa posterior.",
    JJJJ: gerarConclusao(atividades)
  };
}

module.exports = async function gerarRelatorioWordHandler(req, res) {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Método não suportado." });
      return;
    }
    await requireUser(req);
    if (!fs.existsSync(TEMPLATE_PATH)) {
      sendJson(res, 404, { error: "Modelo Relatorio.docx não encontrado em /atividades/template." });
      return;
    }

    const body = parseRequestBody(req);
    const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH));
    const doc = new Docxtemplater(zip, { delimiters: { start: "[", end: "]" }, paragraphLoop: true, linebreaks: true });
    doc.render(montarDadosRelatorio(body));
    const buffer = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
    const data = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename=\"relatorio-atividades-setor-${data}.docx\"`);
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Erro ao gerar relatório Word:", error);
    sendJson(res, error.statusCode || 500, { error: error.message || "Erro interno ao gerar relatório Word." });
  }
};