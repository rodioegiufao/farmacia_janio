const { supabaseRequest } = require("./_auth");
const { normalizarChavePlanner, normalizarProjetoPlanner } = require("../atividades/planner-modelos");
const { separarItens, taxonomiaPlannerCompleta } = require("../atividades/fase-item");

const CHECKLISTS_TABLE = "planner_checklists";
const ITEMS_TABLE = "planner_checklist_itens";
const LINKS_TABLE = "atividade_planner_itens";
const CODIGO_BAIXA_TENSAO = "PRJ-ELE";
const ITEM_ALIASES = new Map([
  ["eletrocalhas", "eletrocalha"], ["perfilados", "perfilado"], ["cabos pp", "cabo pp"],
  ["tomadas de uso especifico", "tomada de uso especifico"], ["pontos de it-medico", "it-medico"]
]);

function obterCodigoProjetoDaAtividade(projeto) {
  const normalizado = normalizarProjetoPlanner(projeto);
  return normalizado === normalizarProjetoPlanner(CODIGO_BAIXA_TENSAO) ? CODIGO_BAIXA_TENSAO : "";
}
function ehProjetoBaixaTensao(projeto) { return obterCodigoProjetoDaAtividade(projeto) === CODIGO_BAIXA_TENSAO; }
function gerarChavePlanner(obraId, codigoProjeto) { return `${String(obraId || "").trim()}::${String(codigoProjeto || "").trim().toUpperCase()}`; }
function normalizarItemPlanner(valor) {
  const chave = normalizarChavePlanner(valor).replace(/\s+/g, " ");
  return ITEM_ALIASES.get(chave) || chave;
}
function gerarChaveItemPlanner(fase, item) { return `${normalizarChavePlanner(fase)}::${normalizarItemPlanner(item)}`; }
function itensDaAtividade(atividade) { return separarItens(atividade.item).filter((item) => normalizarChavePlanner(item) !== "outros"); }
function minutosDaAtividade(atividade) {
  if (!atividade.data_inicio || !atividade.hora_inicio || !atividade.data_termino || !atividade.hora_termino) return 0;
  const inicio = new Date(`${atividade.data_inicio}T${atividade.hora_inicio}`);
  const fim = new Date(`${atividade.data_termino}T${atividade.hora_termino}`);
  const minutos = Math.round((fim - inicio) / 60000);
  return Number.isFinite(minutos) && minutos > 0 ? minutos : 0;
}

async function localizarOuCriarPlanner(atividade, user, checklistEscolhidoId) {
  const codigo = obterCodigoProjetoDaAtividade(atividade.projeto);
  const chave = gerarChavePlanner(atividade.obra_id, codigo);
  const porChave = await supabaseRequest(CHECKLISTS_TABLE, `?chave_sincronizacao=eq.${encodeURIComponent(chave)}&select=*`);
  if (porChave?.[0]) {
    const checklist = porChave[0]; const responsaveis = new Set(listarResponsaveis(checklist.responsavel));
    if (atividade.colaborador && !responsaveis.has(atividade.colaborador)) { responsaveis.add(atividade.colaborador); await supabaseRequest(CHECKLISTS_TABLE, `?id=eq.${encodeURIComponent(checklist.id)}`, { method: "PATCH", body: JSON.stringify({ responsavel: JSON.stringify([...responsaveis]) }) }); checklist.responsavel = JSON.stringify([...responsaveis]); }
    return { checklist, criado: false };
  }
  const candidatos = await supabaseRequest(CHECKLISTS_TABLE, `?obra_id=eq.${encodeURIComponent(atividade.obra_id)}&codigo_projeto=eq.${encodeURIComponent(codigo)}&select=*`);
  let escolhido = checklistEscolhidoId ? candidatos.find((item) => String(item.id) === String(checklistEscolhidoId)) : null;
  if (!escolhido && candidatos.length === 1) escolhido = candidatos[0];
  if (!escolhido && candidatos.length > 1) return { ambigua: true, candidatos: candidatos.map((item) => ({ id: item.id, nomeTarefa: item.nome_tarefa, tipo: item.tipo })) };
  if (escolhido) {
    const responsaveis = new Set(listarResponsaveis(escolhido.responsavel)); responsaveis.add(atividade.colaborador);
    const rows = await supabaseRequest(CHECKLISTS_TABLE, `?id=eq.${encodeURIComponent(escolhido.id)}`, { method: "PATCH", body: JSON.stringify({ chave_sincronizacao: chave, origem: escolhido.origem === "atividade" ? "atividade" : "hibrido", responsavel: JSON.stringify([...responsaveis].filter(Boolean)) }) });
    return { checklist: rows[0] || escolhido, criado: false };
  }
  const novo = { obra_id: atividade.obra_id, obra: atividade.obra, projeto: "Projetos Elétricos de Baixa Tensão", codigo_projeto: codigo, tipo: null,
    nome_tarefa: "Projeto Elétrico Baixa Tensão", status: "Em andamento", prioridade: atividade.prioridade || "P1", data_inicio: atividade.data_inicio || null,
    data_conclusao: atividade.data_prevista || null, bucket: "Projeto Elétrico Baixa Tensão", responsavel: JSON.stringify([atividade.colaborador].filter(Boolean)),
    origem: "atividade", chave_sincronizacao: chave, configuracao_automatica_concluida: false, criado_por: user?.id || null, criado_por_nome: user?.nome || atividade.colaborador };
  try {
    const rows = await supabaseRequest(CHECKLISTS_TABLE, "", { method: "POST", body: JSON.stringify(novo) });
    return { checklist: rows[0], criado: true };
  } catch (error) {
    if (!/duplicate|unique|23505/i.test(error.message || "") && error.statusCode !== 409) throw error;
    const concorrente = await supabaseRequest(CHECKLISTS_TABLE, `?chave_sincronizacao=eq.${encodeURIComponent(chave)}&select=*`);
    if (!concorrente?.[0]) throw error;
    return { checklist: concorrente[0], criado: false };
  }
}
function listarResponsaveis(valor) {
  if (Array.isArray(valor)) return valor;
  try { const parsed = JSON.parse(valor || "[]"); if (Array.isArray(parsed)) return parsed; } catch (_) { /* legado */ }
  return String(valor || "").split(/\s*(?:·|,|;|\|)\s*/).filter(Boolean);
}
async function localizarOuCriarItemPlanner(checklistId, fase, item, ordem) {
  const chave = gerarChaveItemPlanner(fase, item);
  const existentes = await supabaseRequest(ITEMS_TABLE, `?checklist_id=eq.${encodeURIComponent(checklistId)}&select=*`);
  let existente = existentes.find((row) => row.chave_sincronizacao === chave || gerarChaveItemPlanner(row.etapa, row.atividade || row.estagio) === chave);
  if (existente) {
    if (!existente.chave_sincronizacao) await supabaseRequest(ITEMS_TABLE, `?id=eq.${encodeURIComponent(existente.id)}&chave_sincronizacao=is.null`, { method: "PATCH", body: JSON.stringify({ chave_sincronizacao: chave }) }).catch(() => null);
    return { item: existente, criado: false };
  }
  try {
    const rows = await supabaseRequest(ITEMS_TABLE, "", { method: "POST", body: JSON.stringify({ checklist_id: checklistId, etapa: fase, atividade: item, texto: `${fase} — ${item}`, ordem, origem: "atividade", chave_sincronizacao: chave }) });
    return { item: rows[0], criado: true };
  } catch (error) {
    if (!/duplicate|unique|23505/i.test(error.message || "") && error.statusCode !== 409) throw error;
    const rows = await supabaseRequest(ITEMS_TABLE, `?checklist_id=eq.${encodeURIComponent(checklistId)}&chave_sincronizacao=eq.${encodeURIComponent(chave)}&select=*`);
    if (!rows?.[0]) throw error;
    return { item: rows[0], criado: false };
  }
}
async function removerVinculosAtividade(atividadeId) {
  const antigos = await supabaseRequest(LINKS_TABLE, `?atividade_id=eq.${encodeURIComponent(atividadeId)}&select=item_id`);
  await supabaseRequest(LINKS_TABLE, `?atividade_id=eq.${encodeURIComponent(atividadeId)}`, { method: "DELETE" });
  return antigos || [];
}
async function limparItensOrfaos(vinculos) {
  for (const vinculo of vinculos) {
    const restantes = await supabaseRequest(LINKS_TABLE, `?item_id=eq.${encodeURIComponent(vinculo.item_id)}&select=id&limit=1`);
    if (restantes.length) continue;
    const itens = await supabaseRequest(ITEMS_TABLE, `?id=eq.${encodeURIComponent(vinculo.item_id)}&origem=eq.atividade&concluido=eq.false&data_prevista=is.null&hora_prevista=is.null&responsavel=is.null&observacoes=is.null&select=id`);
    if (itens.length) await supabaseRequest(ITEMS_TABLE, `?id=eq.${encodeURIComponent(vinculo.item_id)}`, { method: "DELETE" });
  }
}
async function sincronizarAtividadeComPlanner(atividade, { user, checklistId } = {}) {
  if (!ehProjetoBaixaTensao(atividade.projeto)) { const antigos = await removerVinculosAtividade(atividade.id); await limparItensOrfaos(antigos); return { status: "ignorado" }; }
  if (!atividade.obra_id || !atividade.id || !atividade.fase || !itensDaAtividade(atividade).length) return { status: "ignorado" };
  const localizado = await localizarOuCriarPlanner(atividade, user, checklistId);
  if (localizado.ambigua) return { status: "ambigua", candidatos: localizado.candidatos };
  const antigos = await removerVinculosAtividade(atividade.id);
  const itemIds = []; let itensCriados = 0;
  for (const [indice, nome] of itensDaAtividade(atividade).entries()) {
    const localizadoItem = await localizarOuCriarItemPlanner(localizado.checklist.id, atividade.fase, nome, indice);
    itemIds.push(localizadoItem.item.id); if (localizadoItem.criado) itensCriados += 1;
    await supabaseRequest(LINKS_TABLE, "?on_conflict=atividade_id,item_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ atividade_id: atividade.id, checklist_id: localizado.checklist.id, item_id: localizadoItem.item.id }) });
  }
  await limparItensOrfaos(antigos.filter((v) => !itemIds.includes(v.item_id)));
  return { status: "sincronizado", checklistId: localizado.checklist.id, itemIds, plannerCriado: localizado.criado, itensCriados, precisaConfigurar: localizado.criado || !localizado.checklist.configuracao_automatica_concluida,
    itens: itensDaAtividade(atividade).map((item, index) => ({ id: itemIds[index], fase: atividade.fase, item })) };
}
async function agregarAtividadesDosItens(checklistIds) {
  if (!checklistIds.length) return new Map();
  const links = await supabaseRequest(LINKS_TABLE, `?checklist_id=in.(${checklistIds.map(encodeURIComponent).join(",")})&select=item_id,atividade:atividades_colaboradores(*)`);
  const mapa = new Map();
  for (const link of links || []) { const a = link.atividade; if (!a) continue; const atual = mapa.get(link.item_id) || { atividadeCount: 0, minutosRegistrados: 0, colaboradores: [], ultimaAtividade: "", atividades: [] };
    atual.atividadeCount += 1; atual.minutosRegistrados += minutosDaAtividade(a); if (a.colaborador && !atual.colaboradores.includes(a.colaborador)) atual.colaboradores.push(a.colaborador);
    atual.ultimaAtividade = [atual.ultimaAtividade, a.data_termino || a.data_inicio || ""].sort().pop(); atual.atividades.push(a); mapa.set(link.item_id, atual); }
  return mapa;
}
async function configurarPlannerAutomatico({ checklistId, modo, tipo, selecao, user }) {
  const rows = await supabaseRequest(CHECKLISTS_TABLE, `?id=eq.${encodeURIComponent(checklistId)}&select=*`); const checklist = rows?.[0];
  if (!checklist) throw Object.assign(new Error("Planner não encontrado."), { statusCode: 404 });
  if (user?.perfil !== "admin" && !listarResponsaveis(checklist.responsavel).some((n) => normalizarChavePlanner(user.nome).includes(normalizarChavePlanner(n)))) throw Object.assign(new Error("Sem permissão para configurar este Planner."), { statusCode: 403 });
  const grupos = modo === "completo" ? taxonomiaPlannerCompleta() : modo === "personalizado" ? (selecao || []) : [];
  let ordem = 1000; for (const grupo of grupos) for (const item of grupo.estagios || grupo.itens || []) { await localizarOuCriarItemPlanner(checklist.id, grupo.etapa || grupo.fase, item, ordem++); }
  await supabaseRequest(CHECKLISTS_TABLE, `?id=eq.${encodeURIComponent(checklist.id)}`, { method: "PATCH", body: JSON.stringify({ tipo: tipo || null, configuracao_automatica_concluida: true }) });
  return { status: "sincronizado", checklistId: checklist.id };
}

module.exports = { agregarAtividadesDosItens, configurarPlannerAutomatico, ehProjetoBaixaTensao, gerarChaveItemPlanner, gerarChavePlanner, itensDaAtividade, limparItensOrfaos, minutosDaAtividade, normalizarItemPlanner, obterCodigoProjetoDaAtividade, removerVinculosAtividade, sincronizarAtividadeComPlanner };