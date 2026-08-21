const {
  consolidarAtividades,
  consolidarAtividadesPorColaborador,
  normalizarNomeObra: normalizarNomeObraAgrupamento
} = globalThis.ATIVIDADE_AGRUPAMENTO;
const { obterProjetosComFaseItem, obterFasesDoProjeto, obterItensDoProjetoFase, projetoExigeFaseItem, valorFinal, valorFinalMultiplos, prepararEdicao, taxonomiaPlannerCompleta } = globalThis.FASE_ITEM_ATIVIDADE;
const {
  obterRegistrosDetalhadosDashboard,
  agruparHorasPorFaseDashboard,
  agruparHorasPorItemDashboard,
  obterLabelFaseDashboard,
  obterLabelItemDashboard,
  ordenarTopHorasDashboard
} = globalThis.DASHBOARD_CLASSIFICACAO || {};
const colaboradores = ["Rodrigo", "Hellen", "Bruno", "Rian", "Geovanna"];
const prioridades = ["P0", "P1", "P2", "P3"];
const plannerStatusLista = ["Não iniciado", "Em andamento", "Concluído", "Atrasado", "Pausado"];
const plannerPrioridades = ["P0", "P1", "P2", "P3"];
const plannerResponsaveis = ["Geovanna", "Bruno", "Rodrigo", "Hellen", "Rian"];
const plannerBuckets = [...new Set([...(globalThis.PROJETOS_PLANNER || []).map((projeto) => projeto.bucket), "Outros"])];
const plannerProjetosDisponiveis = obterProjetosComFaseItem();
const plannerTiposDisponiveis = [...(globalThis.TIPOS_EDIFICACAO_PLANNER || [])];
const coresPrioridade = {
  P0: "#48bb78",
  P1: "#ecc94b",
  P2: "#ed8936",
  P3: "#f56565"
};
const projetos = ["Site", "Todos", ...obterProjetosComFaseItem(), "Outros"];
const etapas = [
  "Orçamento",
  "QI Builder",
  "AutoCAD",
  "Revit",
  "Word",
  "Excel",
  "Avaliação",
  "Reunião",
  "Visita in-loco",
  "Relatório",
  "Estudo",
  "Outros"
];
const statusLista = ["Atrasado", "Em progresso", "Pausado", "Finalizado"];

const API_URL = "/api/atividades";
const API_SEMANA_URL = "/api/atividades-semanais";
const API_PLANNER_URL = "/api/planner-checklist";
const API_OBRAS_URL = "/api/obras";
const AUTH_URL = "/api/auth";
const API_RELATORIO_WORD_URL = "/api/gerar-relatorio-word";
const LIMITE_VISUALIZACAO_ATIVIDADES = 10;
const CHAVE_SECAO_ATIVA = "atividades:secao-ativa";

const appContent = document.getElementById("appContent");
const btnLogout = document.getElementById("btnLogout");
const userMenu = document.getElementById("userMenu");
const userMenuTrigger = document.getElementById("userMenuTrigger");
const userMenuPanel = document.getElementById("userMenuPanel");
const usuarioIniciais = document.getElementById("usuarioIniciais");
const usuarioIniciaisMenu = document.getElementById("usuarioIniciaisMenu");
const usuarioLogado = document.getElementById("usuarioLogado");
const usuarioPerfil = document.getElementById("usuarioPerfil");
const adminLink = document.getElementById("adminLink");

const form = document.getElementById("atividadeForm");
const tabela = document.getElementById("atividadesTabela");
const atividadesLimiteInfo = document.getElementById("atividadesLimiteInfo");
const atividadesPaginacao = document.getElementById("atividadesPaginacao");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const btnLimparTudo = document.getElementById("btnLimparTudo");
const btnRepetirUltimaAtividade = document.getElementById("btnRepetirUltimaAtividade");
const btnExportarCSV = document.getElementById("btnExportarCSV");

const formSemanal = document.getElementById("atividadeSemanalForm");
const tabelaSemanal = document.getElementById("tabelaAtividadesSemanais");
const dashboardAtividadesSemanais = document.getElementById("dashboardAtividadesSemanais");
const btnSalvarAtividadeSemanal = document.getElementById("btnSalvarAtividadeSemanal");
const btnCancelarEdicaoSemanal = document.getElementById("btnCancelarEdicaoSemanal");
const btnLimparFormularioSemanal = document.getElementById("btnLimparFormularioSemanal");
const btnNovaAtividadeSemanal = document.getElementById("btnNovaAtividadeSemanal");
const btnGerarRelatorioWord = document.getElementById("btnGerarRelatorioWord");
const btnSemanaAnterior = document.getElementById("btnSemanaAnterior");
const btnSemanaProxima = document.getElementById("btnSemanaProxima");
const indicadorSemanaAtual = document.getElementById("indicadorSemanaAtual");

let atividades = [];
let obrasCadastradas = [];
let atividadesSemanais = [];
let carregando = false;
let carregandoSemanais = false;
let usuarioAtual = null;
let paginaAtividadesAtual = 1;
let semanaVisivelIndex = 0;
let plannerModelos = [];
let plannerChecklists = [];
let carregandoPlanner = false;
let plannerDetalheAtualId = null;
let plannerFocoAnterior = null;
let plannerArrastandoId = null;
let plannerViewMode = "quadro";
let plannerGanttEscala = "mes";
let plannerGanttOcultarVazios = true;
let plannerGanttModo = "sintetico";
let plannerGanttReferencia = null;
let plannerGanttMostrarJanela = false;
const plannerGanttRecolhidos = new Set();
let plannerGanttNosAtuais = new Map();
let plannerGanttPeriodoAtual = null;
let plannerGanttAtividadesFocoAnterior = null;

const campos = {
  id: document.getElementById("atividadeId"),
  obraId: document.getElementById("obraId"),
  colaborador: document.getElementById("colaborador"),
  obra: document.getElementById("obra"),
  prioridade: document.getElementById("prioridade"),
  projeto: document.getElementById("projeto"),
  projetoOutro: document.getElementById("projetoOutro"),
  trabalhos: document.getElementById("trabalhos"),
  fase: document.getElementById("fase"),
  faseOutro: document.getElementById("faseOutro"),
  item: document.getElementById("item"),
  itemOutro: document.getElementById("itemOutro"),
  etapa: document.getElementById("etapa"),
  etapaOutro: document.getElementById("etapaOutro"),
  dataInicio: document.getElementById("dataInicio"),
  horaInicio: document.getElementById("horaInicio"),
  dataTermino: document.getElementById("dataTermino"),
  horaTermino: document.getElementById("horaTermino"),
  dataPrevista: document.getElementById("dataPrevista"),
  status: document.getElementById("status"),
  observacoes: document.getElementById("observacoes")
};

const filtros = {
  busca: document.getElementById("busca"),
  data: document.getElementById("filtroData"),
  colaborador: document.getElementById("filtroColaborador"),
  status: document.getElementById("filtroStatus"),
  prioridade: document.getElementById("filtroPrioridade")
};

const camposSemanais = {
  id: document.getElementById("atividadeSemanalId"),
  obraId: document.getElementById("semanaObraId"),
  obra: document.getElementById("semanaObra"),
  semana: document.getElementById("semanaAtividade"),
  atividade: document.getElementById("tituloAtividadeSemanal"),
  prioridade: document.getElementById("prioridadeAtividadeSemanal"),
  entregas: document.getElementById("entregasAtividadeSemanal"),
  descricao: document.getElementById("descricaoAtividadeSemanal")
};

const filtrosSemanais = {
  busca: document.getElementById("filtroBuscaSemana"),
  semana: document.getElementById("filtroSemana")
};

const plannerEls = {
  board: document.getElementById("plannerBoard"),
  gantt: document.getElementById("plannerGantt"),
  viewQuadro: document.getElementById("plannerViewQuadro"),
  viewGantt: document.getElementById("plannerViewGantt"),
  status: document.getElementById("plannerModelosStatus"),
  modal: document.getElementById("plannerModal"),
  form: document.getElementById("plannerForm"),
  btnNovo: document.getElementById("btnNovoChecklistPlanner"),
  btnFechar: document.getElementById("btnFecharPlannerModal"),
  btnCancelar: document.getElementById("btnCancelarPlanner"),
  btnSalvar: document.getElementById("btnSalvarPlanner"),
  id: document.getElementById("plannerId"),
  obraId: document.getElementById("plannerObraId"),
  obra: document.getElementById("plannerObra"),
  projeto: document.getElementById("plannerProjeto"),
  tipo: document.getElementById("plannerTipo"),
  nomeTarefa: document.getElementById("plannerNomeTarefa"),
  responsavel: document.getElementById("plannerResponsavel"),
  statusTarefa: document.getElementById("plannerStatus"),
  prioridade: document.getElementById("plannerPrioridade"),
  dataInicio: document.getElementById("plannerDataInicio"),
  dataConclusao: document.getElementById("plannerDataConclusao"),
  bucket: document.getElementById("plannerBucket"),
  anotacoes: document.getElementById("plannerAnotacoes"),
  formMessage: document.getElementById("plannerFormMessage"),
  busca: document.getElementById("plannerBusca"),
  filtroStatus: document.getElementById("plannerFiltroStatus"),
  filtroPrioridade: document.getElementById("plannerFiltroPrioridade"),
  filtroResponsavel: document.getElementById("plannerFiltroResponsavel"),
  filtroPrazo: document.getElementById("plannerFiltroPrazo"),
  itemModal: document.getElementById("plannerItemModal"),
  ganttActivitiesModal: document.getElementById("plannerGanttActivitiesModal"),
  itemForm: document.getElementById("plannerItemForm"),
  agrupar: document.getElementById("plannerAgrupar"),
  detalheModal: document.getElementById("plannerDetalhesModal"),
  detalheForm: document.getElementById("plannerDetalhesForm"),
  detalheId: document.getElementById("plannerDetalhesId"),
  detalheTag: document.getElementById("plannerDetalhesTag"),
  detalheTitulo: document.getElementById("plannerDetalhesTitulo"),
  detalheObra: document.getElementById("plannerDetalhesObra"),
  detalheResponsavel: document.getElementById("plannerDetalhesResponsavel"),
  detalheStatus: document.getElementById("plannerDetalhesStatus"),
  detalhePrioridade: document.getElementById("plannerDetalhesPrioridade"),
  detalheDataInicio: document.getElementById("plannerDetalhesDataInicio"),
  detalheDataConclusao: document.getElementById("plannerDetalhesDataConclusao"),
  detalheBucket: document.getElementById("plannerDetalhesBucket"),
  detalheChecklist: document.getElementById("plannerDetalhesChecklist"),
  detalheChecklistTitulo: document.getElementById("plannerChecklistTitulo"),
  detalheAnotacoes: document.getElementById("plannerDetalhesAnotacoes"),
  btnFecharDetalhes: document.getElementById("btnFecharPlannerDetalhes"),
  btnSalvarDetalhes: document.getElementById("btnSalvarDetalhesPlanner"),
  btnExcluir: document.getElementById("btnExcluirPlanner")
};

const filtrosCalendario = {
  dataReferencia: document.getElementById("calendarioDataReferencia"),
  colaborador: document.getElementById("calendarioColaborador"),
  status: document.getElementById("calendarioStatus")
};
const btnCalendarioAnterior = document.getElementById("btnCalendarioAnterior");
const btnCalendarioProximo = document.getElementById("btnCalendarioProximo");
const calendarioResumo = document.getElementById("calendarioResumo");
const calendarioGrade = document.getElementById("calendarioGrade");
const calendarioLegenda = document.querySelector(".calendar-legend");
const filtrosDashboard = {
  periodo: document.getElementById("dashboardPeriodo"),
  dataInicio: document.getElementById("dashboardDataInicio"),
  dataFim: document.getElementById("dashboardDataFim"),
  colaborador: document.getElementById("dashboardColaborador"),
  status: document.getElementById("dashboardStatus"),
  prioridade: document.getElementById("dashboardPrioridade"),
  projeto: document.getElementById("dashboardProjeto"),
  obra: document.getElementById("dashboardObra")
};

const dashboardCharts = {};
const sectionTabs = document.querySelectorAll("[data-section-target]");
const sectionPanels = document.querySelectorAll("[data-section-panel]");
const plannerTab = document.querySelector('[data-section-target="plannerSection"]');
const plannerPanel = document.getElementById("plannerSection");

inicializar();

async function inicializar() {
  btnLogout.addEventListener("click", sair);
  userMenuTrigger.addEventListener("click", alternarMenuUsuario);
  document.addEventListener("click", fecharMenuUsuarioAoClicarFora);
  document.addEventListener("keydown", fecharMenuUsuarioComTeclado);
  await verificarSessao();
  if (!usuarioAtual) return;
  
  preencherColaboradoresPermitidos();
  preencherSelect(campos.prioridade, prioridades);
  preencherSelect(camposSemanais.prioridade, prioridades);
  preencherSelect(campos.projeto, projetos);
  preencherSelect(campos.fase, [], "Selecione primeiro o projeto");
  campos.fase.disabled = true;
  preencherSelect(campos.etapa, etapas);
  preencherSelect(campos.status, statusLista);
  configurarCamposOutros();

  preencherSelect(filtros.colaborador, colaboradores, "Todos os colaboradores");
  preencherSelect(filtros.status, statusLista, "Todos os status");
  preencherSelect(filtros.prioridade, prioridades, "Todas as prioridades");
  preencherSelect(filtrosDashboard.colaborador, colaboradores, "Todos os colaboradores");
  preencherSelect(filtrosDashboard.status, statusLista, "Todos os status");
  preencherSelect(filtrosDashboard.prioridade, prioridades, "Todas as prioridades");
  preencherSelect(filtrosDashboard.projeto, projetos, "Todos os projetos");
  preencherSelect(filtrosDashboard.obra, [], "Todas as obras");
  preencherSelect(filtrosCalendario.colaborador, colaboradores, "Todos os colaboradores");
  preencherSelect(filtrosCalendario.status, statusLista, "Todos os status");
  inicializarAutocompleteObras();
  configurarValidacaoDatasAtividade();
  if (filtrosCalendario.dataReferencia && !filtrosCalendario.dataReferencia.value) filtrosCalendario.dataReferencia.value = obterDataIsoLocal(new Date());

  form.addEventListener("submit", salvarAtividade);
  btnCancelarEdicao.addEventListener("click", cancelarEdicao);
  btnRepetirUltimaAtividade?.addEventListener("click", repetirUltimaAtividade);
  btnLimparTudo.addEventListener("click", limparTodosRegistros);
  btnExportarCSV.addEventListener("click", exportarCSV);
  formSemanal.addEventListener("submit", salvarAtividadeSemanal);
  btnCancelarEdicaoSemanal.addEventListener("click", limparFormularioSemanal);
  btnLimparFormularioSemanal.addEventListener("click", limparFormularioSemanal);
  btnNovaAtividadeSemanal?.addEventListener("click", focarFormularioSemanal);
  btnGerarRelatorioWord?.addEventListener("click", gerarRelatorioWord);
  btnSemanaAnterior?.addEventListener("click", () => navegarSemanaPlanejamento(-1));
  btnSemanaProxima?.addEventListener("click", () => navegarSemanaPlanejamento(1));
  sectionTabs.forEach((tab) => tab.addEventListener("click", alternarSecao));
  restaurarSecaoAtiva();
  inicializarPlanner();

  Object.values(filtros).forEach((filtro) => {
    filtro.addEventListener("input", () => {
      paginaAtividadesAtual = 1;
      renderizarTabela();
    });
    filtro.addEventListener("change", () => {
      paginaAtividadesAtual = 1;
      renderizarTabela();
    });
  });
  Object.values(filtrosSemanais).forEach((filtro) => {
    filtro.addEventListener("input", () => {
      definirSemanaVisivelInicial();
      renderizarTabelaSemanal();
    });
    filtro.addEventListener("change", () => {
      definirSemanaVisivelInicial();
      renderizarTabelaSemanal();
    });
  });
  Object.values(filtrosDashboard).forEach((filtro) => {
    filtro.addEventListener("input", atualizarDashboard);
    filtro.addEventListener("change", atualizarDashboard);
  });
  Object.values(filtrosCalendario).forEach((filtro) => {
    filtro?.addEventListener("input", renderizarCalendario);
    filtro?.addEventListener("change", renderizarCalendario);
  });
  btnCalendarioAnterior?.addEventListener("click", () => navegarSemanaCalendario(-1));
  btnCalendarioProximo?.addEventListener("click", () => navegarSemanaCalendario(1));
  if (usuarioAtual) {
    await carregarObras();
    await carregarAtividades();
    await carregarAtividadesSemanais();
    await carregarPlanner();
  }
}

function alternarSecao(event) {
  const targetId = event.currentTarget.dataset.sectionTarget;

  sectionTabs.forEach((tab) => {
    const ativo = tab.dataset.sectionTarget === targetId;
    tab.classList.toggle("active", ativo);
    tab.setAttribute("aria-selected", String(ativo));
  });

  sectionPanels.forEach((panel) => {
    panel.hidden = panel.dataset.sectionPanel !== targetId;
  });

  salvarSecaoAtiva(targetId);

  if (targetId === "dashboardSection") atualizarDashboard();
  if (targetId === "calendarioSection") renderizarCalendario();
  if (targetId === "semanaSection" && usuarioAtual && !atividadesSemanais.length) carregarAtividadesSemanais();
  if (targetId === "plannerSection" && !plannerChecklists.length) carregarPlanner();
}

function salvarSecaoAtiva(targetId) {
  try {
    localStorage.setItem(CHAVE_SECAO_ATIVA, targetId);
  } catch (_erro) {
    // A navegação continua funcionando quando o navegador bloqueia o armazenamento local.
  }
}

function restaurarSecaoAtiva() {
  let targetId;

  try {
    targetId = localStorage.getItem(CHAVE_SECAO_ATIVA);
  } catch (_erro) {
    return;
  }

  const tab = Array.from(sectionTabs).find((item) => item.dataset.sectionTarget === targetId);

  if (tab && !tab.hidden) alternarSecao({ currentTarget: tab });
}

function alternarAba(aba) {
  const mapa = {
    atividade: "atividadeSection",
    dashboard: "dashboardSection",
    semana: "semanaSection",
    calendario: "calendarioSection",
    planner: "plannerSection"
  };
  const targetId = mapa[aba];
  const tab = targetId ? document.querySelector(`[data-section-target="${targetId}"]`) : null;
  if (tab) alternarSecao({ currentTarget: tab });
}
function usuarioAtualEhAdmin() {
  return usuarioAtual?.perfil === "admin";
}

function aplicarPermissaoPlanner() {
  const podeGerenciarPlanner = usuarioAtualEhAdmin();
  if (plannerTab) plannerTab.hidden = !usuarioAtual;
  if (plannerEls.btnNovo) plannerEls.btnNovo.hidden = !podeGerenciarPlanner;
  if (plannerEls.btnSalvarDetalhes) plannerEls.btnSalvarDetalhes.hidden = !podeGerenciarPlanner;
  if (plannerEls.btnExcluir) plannerEls.btnExcluir.hidden = !podeGerenciarPlanner;
  if (plannerEls.modal) plannerEls.modal.hidden = true;
}

function aplicarPermissoesAtividadesSemanais() {
  if (!formSemanal) return;

  const podeGerenciarAtividadesSemanais = usuarioAtualEhAdmin();
  formSemanal.hidden = !podeGerenciarAtividadesSemanais;
  if (btnNovaAtividadeSemanal) btnNovaAtividadeSemanal.hidden = !podeGerenciarAtividadesSemanais;

  if (!podeGerenciarAtividadesSemanais) {
    limparFormularioSemanal();
  }
}
function aplicarPermissaoRelatorioWord() {
  if (!btnGerarRelatorioWord) return;

  const podeGerarRelatorioWord = usuarioAtualEhAdmin();
  btnGerarRelatorioWord.hidden = !podeGerarRelatorioWord;
  btnGerarRelatorioWord.disabled = !podeGerarRelatorioWord;
}
async function verificarSessao() {
  try {
    const data = await fetch(AUTH_URL).then(validarResposta);
    if (!data.user) {
      redirecionarParaLoginInicial();
      return;
    }
    aplicarUsuarioLogado(data.user);
  } catch (_erro) {
    redirecionarParaLoginInicial();
  }
}

function redirecionarParaLoginInicial() {
  const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`/?login=necessario&redirect=${encodeURIComponent(redirect)}`);
}

function aplicarUsuarioLogado(user) {
  usuarioAtual = user;
  const adminLogado = user?.perfil === "admin";

  appContent.hidden = !user;
  userMenu.hidden = !user;
  adminLink.hidden = !adminLogado;
  usuarioLogado.textContent = user?.nome || "";
  usuarioPerfil.textContent = user?.perfil || "";
  const iniciais = obterIniciais(user?.nome);
  usuarioIniciais.textContent = iniciais;
  usuarioIniciaisMenu.textContent = iniciais;
  if (!user) fecharMenuUsuario();
  btnLimparTudo.hidden = !adminLogado;
  preencherColaboradoresPermitidos();
  aplicarPermissoesAtividadesSemanais();
  aplicarPermissaoRelatorioWord();
  aplicarPermissaoPlanner();
  renderizarTabelaSemanal();
}

function obterIniciais(nome) {
  const partes = String(nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return "?";

  const primeira = partes[0][0] || "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] || "");
  return `${primeira}${ultima}`.toUpperCase();
}

function alternarMenuUsuario(event) {
  event.stopPropagation();
  const abrir = userMenuPanel.hidden;
  userMenuPanel.hidden = !abrir;
  userMenuTrigger.setAttribute("aria-expanded", String(abrir));
}

function fecharMenuUsuario() {
  userMenuPanel.hidden = true;
  userMenuTrigger.setAttribute("aria-expanded", "false");
}

function fecharMenuUsuarioAoClicarFora(event) {
  if (userMenu.hidden || userMenu.contains(event.target)) return;
  fecharMenuUsuario();
}

function fecharMenuUsuarioComTeclado(event) {
  if (event.key === "Escape") fecharMenuUsuario();
}

function colaboradorDoUsuario(user = usuarioAtual) {
  if (!user) return "";

  const nomeNormalizado = normalizarTexto(user.nome);
  return colaboradores.find((colaborador) => {
    const colaboradorNormalizado = normalizarTexto(colaborador);
    return nomeNormalizado === colaboradorNormalizado
      || nomeNormalizado.startsWith(`${colaboradorNormalizado} `)
      || nomeNormalizado.includes(colaboradorNormalizado);
  }) || user.nome;
}

function preencherColaboradoresPermitidos() {
  if (!campos.colaborador) return;

  if (usuarioAtual?.perfil === "admin") {
    preencherSelect(campos.colaborador, colaboradores);
    campos.colaborador.disabled = false;
    return;
  }

  const colaborador = colaboradorDoUsuario();
  preencherSelect(campos.colaborador, colaborador ? [colaborador] : []);
  campos.colaborador.value = colaborador;
  campos.colaborador.disabled = true;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
function normalizarNomeObra(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ");
}
function localizarObraCadastrada(valor) {
  const digitado = String(valor || "").trim();
  const chave = normalizarNomeObra(digitado.replace(/^OBR-\d+\s*[—-]\s*/i, ""));
  return obrasCadastradas.find((obra) => obra.codigo.toLowerCase() === digitado.toLowerCase() || normalizarNomeObra(obra.nome) === chave) || null;
}
async function carregarObras() {
  try { obrasCadastradas = await fetch(API_OBRAS_URL).then(validarResposta); }
  catch (erro) { console.error("Não foi possível carregar o cadastro central de obras:", erro); obrasCadastradas = []; }
  const datalist = document.getElementById("obrasCadastradas");
  if (datalist) datalist.innerHTML = obrasCadastradas.map((obra) => `<option value="${escapeHtml(obra.nome)}" label="${escapeHtml(`${obra.codigo} — ${obra.nome}`)}"></option>`).join("");
  atualizarOpcoesDashboard();
}
function configurarAutocompleteObra(input, hidden, identificacao, { opcional = false } = {}) {
  if (!input || !hidden) return;
  const atualizar = (canonizar = false) => {
    const obra = localizarObraCadastrada(input.value);
    hidden.value = obra?.id || "";
    if (obra && canonizar) input.value = obra.nome;
    if (identificacao) identificacao.textContent = obra ? `${obra.codigo} — ${obra.nome}` : (!input.value.trim() && opcional ? "Sem obra vinculada." : "Nova obra. Será criado um cadastro mínimo ao salvar; a ficha técnica poderá ser concluída posteriormente pela Administração.");
  };
  input.addEventListener("input", () => atualizar(false));
  input.addEventListener("change", () => atualizar(true));
  input.addEventListener("blur", () => atualizar(true));
}
function inicializarAutocompleteObras() {
  configurarAutocompleteObra(campos.obra, campos.obraId, document.getElementById("obraIdentificacao"));
  configurarAutocompleteObra(plannerEls.obra, plannerEls.obraId, document.getElementById("plannerObraIdentificacao"));
  configurarAutocompleteObra(camposSemanais.obra, camposSemanais.obraId, document.getElementById("semanaObraIdentificacao"), { opcional: true });
}
async function sair() {
  await fetch(AUTH_URL, { method: "DELETE" }).catch(() => null);
  redirecionarParaLoginInicial();
  atividades = [];
  atividadesSemanais = [];
  plannerChecklists = [];
  atualizarOpcoesDashboard();
  renderizarTabela();
  preencherFiltroSemanas();
  renderizarTabelaSemanal();
}

function preencherSelect(select, opcoes, placeholder = "Selecione") {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  if (select.multiple) select.options[0].disabled = true;
  opcoes.forEach((opcao) => {
    const option = document.createElement("option");
    option.value = opcao;
    option.textContent = opcao;
    select.appendChild(option);
  });
  if (select === campos.item) atualizarSeletorItens();
}

const itemPickerTrigger = document.getElementById("itemPickerTrigger");
const itemPickerOptions = document.getElementById("itemPickerOptions");
const itemPickerSummary = document.getElementById("itemPickerSummary");

function atualizarSeletorItens() {
  if (!itemPickerTrigger) return;
  const opcoes = Array.from(campos.item.options).filter((option) => option.value);
  const selecionadas = opcoes.filter((option) => option.selected);
  itemPickerTrigger.disabled = campos.item.disabled || !opcoes.length;
  itemPickerSummary.textContent = selecionadas.length
    ? `${selecionadas.length} ${selecionadas.length === 1 ? "item selecionado" : "itens selecionados"}`
    : (campos.item.disabled ? "Selecione primeiro a fase" : "Selecione os itens");
  itemPickerOptions.innerHTML = opcoes.map((option, indice) => `
    <label class="item-picker-option" for="itemPickerOption${indice}">
      <input type="checkbox" id="itemPickerOption${indice}" value="${escapeHtml(option.value)}" ${option.selected ? "checked" : ""}>
      <span>${escapeHtml(option.textContent)}</span>
    </label>`).join("");
  if (itemPickerTrigger.disabled) fecharSeletorItens();
}

function fecharSeletorItens() {
  itemPickerOptions.hidden = true;
  itemPickerTrigger?.setAttribute("aria-expanded", "false");
}

itemPickerTrigger?.addEventListener("click", () => {
  const abrir = itemPickerOptions.hidden;
  itemPickerOptions.hidden = !abrir;
  itemPickerTrigger.setAttribute("aria-expanded", String(abrir));
});
itemPickerOptions?.addEventListener("change", (evento) => {
  if (!evento.target.matches('input[type="checkbox"]')) return;
  const option = Array.from(campos.item.options).find((item) => item.value === evento.target.value);
  if (option) option.selected = evento.target.checked;
  campos.item.dispatchEvent(new Event("change", { bubbles: true }));
  atualizarSeletorItens();
});
document.addEventListener("click", (evento) => {
  if (!document.getElementById("itemPicker")?.contains(evento.target)) fecharSeletorItens();
});

function atualizarRestricoesDatasAtividade() {
  const dataMinimaTermino = campos.dataInicio.value || "1000-01-01";
  if (campos.dataTermino.min !== dataMinimaTermino) campos.dataTermino.min = dataMinimaTermino;
  validarOrdemDatasAtividade();
}

function validarOrdemDatasAtividade() {
  campos.dataTermino.setCustomValidity(
    campos.dataInicio.value && campos.dataTermino.value && campos.dataTermino.value < campos.dataInicio.value
      ? "A data de término deve ser maior ou igual à data de início."
      : ""
  );
}

function configurarValidacaoDatasAtividade() {
  campos.dataInicio.addEventListener("input", atualizarRestricoesDatasAtividade);
  campos.dataInicio.addEventListener("change", atualizarRestricoesDatasAtividade);
  campos.dataTermino.addEventListener("input", validarOrdemDatasAtividade);
  campos.dataTermino.addEventListener("change", validarOrdemDatasAtividade);
  atualizarRestricoesDatasAtividade();
}
function configurarCamposOutros() {
  campos.projeto.addEventListener("change", () => {
    atualizarCampoOutro("projeto");
    atualizarFasesDoProjeto();
  });
  campos.fase.addEventListener("change", atualizarItensDaFase);
  campos.item.addEventListener("change", () => atualizarCampoOutro("item"));
  campos.etapa.addEventListener("change", () => atualizarCampoOutro("etapa"));
  atualizarItensDaFase(false);
  atualizarCamposOutros();
}
function atualizarFasesDoProjeto(focar = false) {
  const projeto = campos.projeto.value;
  preencherSelect(campos.fase, obterFasesDoProjeto(projeto), projeto ? "Selecione" : "Selecione primeiro o projeto");
  campos.fase.disabled = !projetoExigeFaseItem(projeto);
  campos.fase.value = "";
  campos.faseOutro.value = "";
  campos.itemOutro.value = "";
  atualizarItensDaFase(false);
  atualizarObrigatoriedadeFaseItem();
  if (focar && !campos.fase.disabled) campos.fase.focus();
}
function atualizarObrigatoriedadeFaseItem() {
  const exibir = projetoExigeFaseItem(campos.projeto.value);
  document.getElementById("faseField").hidden = !exibir;
  document.getElementById("itemField").hidden = !exibir;
  campos.fase.required = exibir;
  campos.item.required = exibir;
  campos.fase.setAttribute("aria-required", String(exibir));
  campos.item.setAttribute("aria-required", String(exibir));
  if (!exibir) {
    campos.fase.value = "";
    campos.fase.disabled = true;
    campos.faseOutro.value = "";
    preencherSelect(campos.item, [], "Selecione primeiro a fase");
    campos.item.disabled = true;
    atualizarSeletorItens();
    campos.itemOutro.value = "";
    atualizarCampoOutro("fase", false);
    atualizarCampoOutro("item", false);
  }
}
function atualizarItensDaFase(focar = true) {
  const faseSelecionada = campos.fase.value;
  preencherSelect(campos.item, obterItensDoProjetoFase(campos.projeto.value, faseSelecionada), faseSelecionada ? "Selecione" : "Selecione primeiro a fase");
  campos.item.disabled = !faseSelecionada;
  atualizarSeletorItens();
  atualizarCampoOutro("fase", focar);
  atualizarCampoOutro("item", false);
}
function atualizarCampoOutro(tipo, focar = true) {
  const select = campos[tipo];
  const input = campos[`${tipo}Outro`];
  const container = document.getElementById(`${tipo}OutroField`);
  const exibir = tipo === "item"
    ? Array.from(select.selectedOptions).some((option) => option.value === "Outros")
    : select.value === "Outros";

  container.hidden = !exibir;
  input.required = exibir;
  input.disabled = !exibir;
  if (!exibir) input.value = "";
  if (exibir && focar) input.focus();
}

function atualizarCamposOutros(focar = false) {
  atualizarCampoOutro("projeto", focar);
  atualizarCampoOutro("fase", focar);
  atualizarCampoOutro("item", focar);
  atualizarCampoOutro("etapa", focar);
  atualizarObrigatoriedadeFaseItem();
}

function valorComOpcaoOutro(tipo) {
  return campos[tipo].value === "Outros" ? campos[`${tipo}Outro`].value.trim() : campos[tipo].value;
}

function preencherOpcaoComOutro(tipo, valor, opcoes) {
  if (valor && !opcoes.includes(valor)) {
    campos[tipo].value = "Outros";
    campos[`${tipo}Outro`].value = valor;
  } else {
    campos[tipo].value = valor || "";
    campos[`${tipo}Outro`].value = "";
  }
  atualizarCampoOutro(tipo, false);
}
async function salvarAtividade(event) {
  event.preventDefault();

  const atividade = {
    id: campos.id.value || gerarId(),
    colaborador: usuarioAtual?.perfil === "admin" ? campos.colaborador.value : colaboradorDoUsuario(),
    obra: campos.obra.value.trim(),
    obraId: campos.obraId.value,
    prioridade: campos.prioridade.value,
    projeto: valorComOpcaoOutro("projeto"),
    trabalhos: campos.trabalhos.value.trim(),
    fase: valorFinal(campos.fase.value, campos.faseOutro.value),
    item: valorFinalMultiplos(Array.from(campos.item.selectedOptions, (option) => option.value), campos.itemOutro.value),
    etapa: valorComOpcaoOutro("etapa"),
    dataInicio: campos.dataInicio.value,
    horaInicio: campos.horaInicio.value,
    dataTermino: campos.dataTermino.value,
    horaTermino: campos.horaTermino.value,
    dataPrevista: campos.dataPrevista.value,
    status: statusAtualizado(campos.status.value, campos.dataPrevista.value),
    observacoes: campos.observacoes.value.trim(),
    criadoEm: campos.id.value ? atividades.find((item) => item.id === campos.id.value)?.criadoEm : new Date().toISOString()
  };

  atualizarRestricoesDatasAtividade();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const conflito = encontrarConflitoHorario(atividade, atividades);
  if (conflito) {
    alert(`Este horário já possui atividade registrada para ${atividade.colaborador}: ${conflito.trabalhos} (${formatarDataHora(conflito.dataInicio, conflito.horaInicio)} até ${formatarDataHora(conflito.dataTermino, conflito.horaTermino)}).`);
    return;
  }

  try {
    setFormDisabled(true);
    const atividadeSalva = await apiRequest(campos.id.value ? "PUT" : "POST", atividade);
    await carregarObras();
    if (atividade.status === "Finalizado") {
      // O servidor também conclui os lançamentos da mesma frente; recarregar
      // mantém tabela, calendário e dashboard sincronizados com essa alteração.
      await carregarAtividades();
    } else {
      const indice = atividades.findIndex((item) => item.id === atividade.id);
      if (indice >= 0) atividades[indice] = atividadeSalva;
      else atividades.unshift(atividadeSalva);
    }
    const trabalhoFinalizado = atividade.status === "Finalizado" ? atividade.trabalhos : "";
    form.reset();
     // Mantém a descrição visível para que o texto do trabalho concluído não se
    // perca da tela após o registro ser finalizado.
    if (trabalhoFinalizado) campos.trabalhos.value = trabalhoFinalizado;
    atualizarFasesDoProjeto(false);
    atualizarCamposOutros();
    atualizarRestricoesDatasAtividade();
    preencherColaboradoresPermitidos();
    campos.id.value = "";
    campos.obraId.value = "";
    btnCancelarEdicao.style.display = "none";
    document.getElementById("btnSalvar").textContent = "Salvar atividade";
    atualizarOpcoesDashboard();
    renderizarTabela();
    renderizarCalendario();
    await tratarResultadoPlanner(atividadeSalva);
  } catch (erro) {
    alert(`Não foi possível salvar no Supabase: ${erro.message}`);
  } finally {
    setFormDisabled(false);
    preencherColaboradoresPermitidos();
  }
}

function statusAtualizado(statusInformado, dataPrevista) {
  if (statusInformado === "Finalizado" || statusInformado === "Pausado") return statusInformado;
  if (!dataPrevista) return statusInformado || "Em progresso";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const entrega = new Date(`${dataPrevista}T00:00:00`);
  if (dataPrevista && entrega < hoje) return "Atrasado";

  return statusInformado || "Em progresso";
}

function atividadeCorrespondeAoDia(atividade, dataSelecionada) {
  if (!dataSelecionada) return true;

  const dataInicio = atividade.dataInicio || atividade.dataTermino || atividade.dataPrevista;
  const dataTermino = atividade.dataTermino || atividade.dataInicio || atividade.dataPrevista;
  if (!dataInicio && !dataTermino) return false;

  if (dataInicio && dataTermino) {
    return dataInicio <= dataSelecionada && dataSelecionada <= dataTermino;
  }

  return dataInicio === dataSelecionada || dataTermino === dataSelecionada;
}

function renderizarTabela() {
  atualizarStatusAtrasadoAutomaticamente();

  const listaFiltrada = atividades.filter((atividade) => {
    const termo = filtros.busca.value.toLowerCase().trim();
    const textoBusca = `${atividade.obraCodigo} ${atividade.obra} ${atividade.projeto} ${atividade.trabalhos} ${atividade.fase} ${atividade.item} ${atividade.observacoes}`.toLowerCase();

    const correspondeBusca = !termo || textoBusca.includes(termo);
    const correspondeData = atividadeCorrespondeAoDia(atividade, filtros.data.value);
    const correspondeColaborador = !filtros.colaborador.value || atividade.colaborador === filtros.colaborador.value;
    const correspondeStatus = !filtros.status.value || atividade.status === filtros.status.value;
    const correspondePrioridade = !filtros.prioridade.value || atividade.prioridade === filtros.prioridade.value;

    return correspondeBusca && correspondeData && correspondeColaborador && correspondeStatus && correspondePrioridade;
  });

  tabela.innerHTML = "";
  if (atividadesLimiteInfo) atividadesLimiteInfo.textContent = "";
  if (atividadesPaginacao) atividadesPaginacao.innerHTML = "";
  
  if (carregando) {
    tabela.innerHTML = `<tr><td colspan="15" class="empty">Carregando atividades do Supabase...</td></tr>`;
    atualizarDashboard();
    return;
  }

  if (!listaFiltrada.length) {
    tabela.innerHTML = `<tr><td colspan="15" class="empty">Nenhuma atividade encontrada.</td></tr>`;
    atualizarDashboard();
    return;
  }

  const totalPaginas = Math.ceil(listaFiltrada.length / LIMITE_VISUALIZACAO_ATIVIDADES);
  paginaAtividadesAtual = Math.min(Math.max(paginaAtividadesAtual, 1), totalPaginas);
  const indiceInicial = (paginaAtividadesAtual - 1) * LIMITE_VISUALIZACAO_ATIVIDADES;
  const listaVisivel = listaFiltrada.slice(indiceInicial, indiceInicial + LIMITE_VISUALIZACAO_ATIVIDADES);

  if (atividadesLimiteInfo) {
    const primeiraAtividade = indiceInicial + 1;
    const ultimaAtividade = indiceInicial + listaVisivel.length;
    atividadesLimiteInfo.textContent = `Mostrando atividades ${primeiraAtividade} a ${ultimaAtividade} de ${listaFiltrada.length} encontradas.`;
  }
  
  renderizarPaginacaoAtividades(totalPaginas);

  listaVisivel.forEach((atividade) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(atividade.colaborador)}</td>
      <td>${escapeHtml(atividade.obra)}</td>
      <td><span class="badge ${classePrioridade(atividade.prioridade)}">${escapeHtml(atividade.prioridade)}</span></td>
      <td>${escapeHtml(atividade.projeto)}</td>
      <td>${escapeHtml(atividade.trabalhos)}</td>
      <td>${escapeHtml(atividade.fase || "-")}</td>
      <td>${escapeHtml(atividade.item || "-")}</td>
      <td>${escapeHtml(atividade.etapa)}</td>
      <td>${formatarDataHora(atividade.dataInicio, atividade.horaInicio)}</td>
      <td>${formatarDataHora(atividade.dataTermino, atividade.horaTermino)}</td>
      <td>${formatarData(atividade.dataPrevista)}</td>
      <td>${formatarDataHoraCadastro(atividade.criadoEm)}</td>
      <td><span class="badge ${classeStatus(atividade.status)}">${escapeHtml(atividade.status)}</span></td>
      <td>${escapeHtml(atividade.observacoes || "-")}</td>
      <td>
        <div class="actions">
          ${podeAlterar(atividade) ? `<button type="button" class="secondary" onclick="editarAtividade('${atividade.id}')">Editar</button>` : ""}
          ${podeAlterar(atividade) ? `<button type="button" class="ghost" onclick="excluirAtividade('${atividade.id}')">Excluir</button>` : ""}
        </div>
      </td>
    `;
    tabela.appendChild(tr);
  });

  atualizarDashboard();
}

function renderizarPaginacaoAtividades(totalPaginas) {
  if (!atividadesPaginacao || totalPaginas <= 1) return;

  atividadesPaginacao.innerHTML = "";
  const botoes = [
    { texto: "Anterior", pagina: paginaAtividadesAtual - 1, desabilitado: paginaAtividadesAtual === 1 }
  ];

  const paginasVisiveis = new Set([1, totalPaginas]);
  for (let pagina = paginaAtividadesAtual - 1; pagina <= paginaAtividadesAtual + 1; pagina += 1) {
    if (pagina > 1 && pagina < totalPaginas) paginasVisiveis.add(pagina);
  }

  const paginasOrdenadas = [...paginasVisiveis].sort((a, b) => a - b);
  paginasOrdenadas.forEach((pagina, indice) => {
    if (indice > 0 && pagina - paginasOrdenadas[indice - 1] > 1) {
      botoes.push({ texto: "…", separador: true });
    }
    botoes.push({ texto: String(pagina), pagina, atual: pagina === paginaAtividadesAtual });
  });

  botoes.push({ texto: "Próxima", pagina: paginaAtividadesAtual + 1, desabilitado: paginaAtividadesAtual === totalPaginas });

botoes.forEach(({ texto, pagina, atual, desabilitado, separador }) => {
    if (separador) {
      const reticencias = document.createElement("span");
      reticencias.className = "pagination-ellipsis";
      reticencias.textContent = texto;
      reticencias.setAttribute("aria-hidden", "true");
      atividadesPaginacao.appendChild(reticencias);
      return;
    }
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = texto;
    botao.className = atual ? "pagination-button active" : "pagination-button";
    botao.disabled = desabilitado || atual;
    botao.setAttribute("aria-label", atual ? `Página ${pagina} atual` : `Ir para página ${pagina}`);
    if (atual) botao.setAttribute("aria-current", "page");
    botao.addEventListener("click", () => {
      paginaAtividadesAtual = pagina;
      renderizarTabela();
    });
    atividadesPaginacao.appendChild(botao);
  });
}
function podeAlterar(atividade) {
  return usuarioAtual?.perfil === "admin" || atividade.usuarioId === usuarioAtual?.id;
}

function atualizarStatusAtrasadoAutomaticamente() {
  atividades = atividades.map((atividade) => {
    const novoStatus = statusAtualizado(atividade.status, atividade.dataPrevista);
    if (novoStatus !== atividade.status) {
      const atualizada = { ...atividade, status: novoStatus };
      apiRequest("PUT", atualizada).catch((erro) => console.error("Erro ao atualizar status no Supabase:", erro));
      return atualizada;
    }
    return atividade;
  });
}

function editarAtividade(id) {
  const atividade = atividades.find((item) => item.id === id);
  if (!atividade) return;

  preencherFormularioComAtividade(atividade);

  campos.id.value = atividade.id;
  btnCancelarEdicao.style.display = "inline-block";
  document.getElementById("btnSalvar").textContent = "Atualizar atividade";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function preencherFormularioComAtividade(atividade, { limparHorarios = false } = {}) {
  const camposIgnorados = ["id", "projeto", "projetoOutro", "fase", "faseOutro", "item", "itemOutro", "etapa", "etapaOutro"];

  Object.keys(campos).filter((campo) => !camposIgnorados.includes(campo)).forEach((campo) => {
    campos[campo].value = atividade[campo] || "";
  });

  preencherOpcaoComOutro("projeto", atividade.projeto, projetos);
  const classificacao = prepararEdicao(atividade.projeto, atividade.fase, atividade.item);
  preencherSelect(campos.fase, classificacao.fasesDisponiveis, "Selecione");
  campos.fase.disabled = !classificacao.projetoSuportado;
  campos.fase.value = classificacao.faseSelecionada;
  campos.faseOutro.value = classificacao.faseOutro;
  preencherSelect(campos.item, classificacao.itensDisponiveis, classificacao.faseSelecionada ? "Selecione" : "Selecione primeiro a fase");
  campos.item.disabled = !classificacao.faseSelecionada;
  Array.from(campos.item.options).forEach((option) => {
    option.selected = classificacao.itensSelecionados.includes(option.value);
  });
  atualizarSeletorItens();
  campos.itemOutro.value = classificacao.itemOutro;
  atualizarCampoOutro("fase", false);
  atualizarCampoOutro("item", false);
  atualizarObrigatoriedadeFaseItem();
  preencherOpcaoComOutro("etapa", atividade.etapa, etapas);
  campos.id.value = "";
  if (limparHorarios) {
    campos.horaInicio.value = "";
    campos.horaTermino.value = "";
  }
  atualizarRestricoesDatasAtividade();
  if (usuarioAtual?.perfil !== "admin") {
    campos.colaborador.value = colaboradorDoUsuario();
  }
}

function repetirUltimaAtividade() {
  const colaboradorAtual = colaboradorDoUsuario();
  const atividadesDoUsuario = atividades.filter((atividade) => atividade.usuarioId
    ? atividade.usuarioId === usuarioAtual?.id
    : normalizarTexto(atividade.colaborador) === normalizarTexto(colaboradorAtual));
  const ultimaAtividade = atividadesDoUsuario.reduce((maisRecente, atividade) => {
    if (!maisRecente) return atividade;
    const cadastroAtual = Date.parse(atividade.criadoEm || atividade.criado_em || "") || 0;
    const cadastroMaisRecente = Date.parse(maisRecente.criadoEm || maisRecente.criado_em || "") || 0;
    return cadastroAtual > cadastroMaisRecente ? atividade : maisRecente;
  }, null);

  if (!ultimaAtividade) {
    alert("Nenhuma atividade anterior cadastrada por você foi encontrada.");
    return;
  }

  preencherFormularioComAtividade(ultimaAtividade, { limparHorarios: true });
  btnCancelarEdicao.style.display = "none";
  document.getElementById("btnSalvar").textContent = "Salvar atividade";
  campos.horaInicio.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirAtividade(id) {
  const confirmar = confirm("Deseja excluir esta atividade do Supabase?");
  if (!confirmar) return;

  try {
    await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then(validarResposta);
    atividades = atividades.filter((item) => item.id !== id);
    await carregarPlanner();
    atualizarOpcoesDashboard();
    renderizarTabela();
    renderizarCalendario();
  } catch (erro) {
    alert(`Não foi possível excluir no Supabase: ${erro.message}`);
  }
}

function cancelarEdicao() {
  form.reset();
  atualizarItensDaFase(false);
  atualizarCamposOutros();
  atualizarRestricoesDatasAtividade();
  preencherColaboradoresPermitidos();
  campos.id.value = "";
  campos.obraId.value = "";
  btnCancelarEdicao.style.display = "none";
  document.getElementById("btnSalvar").textContent = "Salvar atividade";
}

async function limparTodosRegistros() {
  const confirmar = confirm("Deseja apagar todos os registros salvos no Supabase?");
  if (!confirmar) return;

  try {
    await fetch(`${API_URL}?all=true`, { method: "DELETE" }).then(validarResposta);
    atividades = [];
    atualizarOpcoesDashboard();
    renderizarTabela();
    renderizarCalendario();
  } catch (erro) {
    alert(`Não foi possível limpar os registros no Supabase: ${erro.message}`);
  }
}
// Carrega as atividades semanais em uma lista independente da aba Atividade.
async function carregarAtividadesSemanais() {
  try {
    carregandoSemanais = true;
    renderizarTabelaSemanal();
    atividadesSemanais = await fetch(API_SEMANA_URL).then(validarResposta);
    preencherFiltroSemanas();
    definirSemanaVisivelInicial();
    renderizarDashboardSemanal();
  } catch (erro) {
    alert(`Não foi possível carregar as atividades semanais do Supabase: ${erro.message}`);
    atividadesSemanais = [];
    preencherFiltroSemanas();
    renderizarDashboardSemanal();
  } finally {
    carregandoSemanais = false;
    renderizarTabelaSemanal();
  }
}

async function salvarAtividadeSemanal(event) {
  event.preventDefault();
  if (!usuarioAtualEhAdmin()) {
    alert("Apenas administradores podem cadastrar ou editar atividades semanais.");
    return;
  }
  const atividadeSemanal = {
    id: camposSemanais.id.value || undefined,
    semana: camposSemanais.semana.value.trim(),
    atividade: camposSemanais.atividade.value.trim(),
    prioridade: camposSemanais.prioridade.value,
    entregas: camposSemanais.entregas.value.trim(),
    descricao: camposSemanais.descricao.value.trim(),
    obraId: camposSemanais.obraId.value || null,
    obra: camposSemanais.obra.value.trim()
  };

  try {
    setFormSemanalDisabled(true);
    const atividadeSalva = await apiRequestSemanal(camposSemanais.id.value ? "PUT" : "POST", atividadeSemanal);
    await carregarObras();
    const indice = atividadesSemanais.findIndex((item) => item.id === atividadeSalva.id);

    if (indice >= 0) {
      atividadesSemanais[indice] = atividadeSalva;
    } else {
      atividadesSemanais.unshift(atividadeSalva);
    }

    limparFormularioSemanal();
    preencherFiltroSemanas();
    renderizarDashboardSemanal();
    renderizarTabelaSemanal();
  } catch (erro) {
    alert(`Não foi possível salvar a atividade semanal no Supabase: ${erro.message}`);
  } finally {
    setFormSemanalDisabled(false);
  }
}

function obterAtividadesSemanaisFiltradas() {
  const termo = filtrosSemanais.busca.value.toLowerCase().trim();
  const semanaSelecionada = filtrosSemanais.semana.value;
  return atividadesSemanais.filter((atividadeSemanal) => {
    const textoBusca = `${atividadeSemanal.obraCodigo} ${atividadeSemanal.obra} ${atividadeSemanal.semana} ${atividadeSemanal.atividade} ${atividadeSemanal.descricao} ${atividadeSemanal.prioridade} ${atividadeSemanal.entregas}`.toLowerCase();
    const correspondeBusca = !termo || textoBusca.includes(termo);
    const correspondeSemana = !semanaSelecionada || atividadeSemanal.semana === semanaSelecionada;
    return correspondeBusca && correspondeSemana;
  });
}

function renderizarDashboardSemanal() {
  if (!dashboardAtividadesSemanais) return;

  if (carregandoSemanais) {
    dashboardAtividadesSemanais.innerHTML = criarMetricCard("Carregando", "...", "Resumo semanal", "fa-spinner");
    return;
  }

  const semanas = [...new Set(atividadesSemanais.map((item) => item.semana).filter(Boolean))];
  const listaFiltrada = obterAtividadesSemanaisFiltradas();
  const semanaSelecionada = filtrosSemanais.semana.value;
  const atividadesSemanaSelecionada = semanaSelecionada
    ? atividadesSemanais.filter((item) => item.semana === semanaSelecionada).length
    : listaFiltrada.length;
  const ultimaAtualizacao = obterUltimaAtualizacaoSemanal(atividadesSemanais);

  dashboardAtividadesSemanais.innerHTML = [
    criarMetricCard("Semanas cadastradas", semanas.length, "Total de ciclos planejados", "fa-layer-group"),
    criarMetricCard("Atividades cadastradas", atividadesSemanais.length, "Registros semanais no Supabase", "fa-list-check"),
    criarMetricCard("Semana selecionada", atividadesSemanaSelecionada, semanaSelecionada || "Todas as semanas", "fa-calendar-day"),
    criarMetricCard("Última atualização", ultimaAtualizacao, "Movimentação mais recente", "fa-clock")
  ].join("");
}

function criarMetricCard(titulo, valor, descricao, icone) {
  return `
    <article class="weekly-metric-card">
      <div>
        <span>${escapeHtml(titulo)}</span>
        <strong>${escapeHtml(valor)}</strong>
        <small>${escapeHtml(descricao)}</small>
      </div>
      <i class="fas ${icone}" aria-hidden="true"></i>
    </article>
  `;
}

function renderizarTabelaSemanal() {
  const listaFiltrada = obterAtividadesSemanaisFiltradas();
  const podeGerenciarAtividadesSemanais = usuarioAtualEhAdmin();

  renderizarDashboardSemanal();
  tabelaSemanal.innerHTML = "";

  if (carregandoSemanais) {
    atualizarControlesCarrosselSemanal(0);
    tabelaSemanal.innerHTML = '<p class="empty weekly-empty-state">Carregando atividades semanais do Supabase...</p>';
    return;
  }

  const atividadesPorSemana = agruparAtividadesPorSemana(listaFiltrada);
  const semanas = ordenarSemanasPlanejamento(Object.entries(atividadesPorSemana));

  if (!semanas.length) {
    atualizarControlesCarrosselSemanal(0);
    tabelaSemanal.innerHTML = '<p class="empty weekly-empty-state">Não tem nada cadastrado para esta semana.</p>';
    return;
  }

  semanaVisivelIndex = Math.min(Math.max(semanaVisivelIndex, 0), semanas.length - 1);
  const [semana, atividadesDaSemana] = semanas[semanaVisivelIndex];
  atualizarControlesCarrosselSemanal(semanas.length, semana);
  tabelaSemanal.innerHTML = criarBlocoSemana(semana, atividadesDaSemana, podeGerenciarAtividadesSemanais);
}

function atualizarControlesCarrosselSemanal(totalSemanas, semanaAtual = "") {
  const desabilitar = totalSemanas <= 1;
  if (btnSemanaAnterior) btnSemanaAnterior.disabled = desabilitar;
  if (btnSemanaProxima) btnSemanaProxima.disabled = desabilitar;
  if (indicadorSemanaAtual) {
    const numeroSemana = extrairNumeroSemana(semanaAtual);
    indicadorSemanaAtual.textContent = totalSemanas
      ? `${numeroSemana !== null ? `Semana ${numeroSemana}` : "Semana sem número"} (${semanaVisivelIndex + 1} de ${totalSemanas})`
      : "Nenhuma semana para exibir";
  }
}

function navegarSemanaPlanejamento(direcao) {
  const totalSemanas = ordenarSemanasPlanejamento(Object.entries(agruparAtividadesPorSemana(obterAtividadesSemanaisFiltradas()))).length;
  if (totalSemanas <= 1) return;
  semanaVisivelIndex = (semanaVisivelIndex + direcao + totalSemanas) % totalSemanas;
  renderizarTabelaSemanal();
}

function definirSemanaVisivelInicial() {
  const semanas = ordenarSemanasPlanejamento(Object.entries(agruparAtividadesPorSemana(obterAtividadesSemanaisFiltradas())));
  const indiceSemanaAtual = obterIndiceSemanaAtual(semanas);
  semanaVisivelIndex = indiceSemanaAtual >= 0 ? indiceSemanaAtual : 0;
}

function obterIndiceSemanaAtual(semanas) {
  const numeroSemanaAtual = obterNumeroSemanaAno(new Date());
  return semanas.findIndex(([semana]) => extrairNumeroSemana(semana) === numeroSemanaAtual);
}

function obterNumeroSemanaAno(data) {
  return PLANNER_GANTT.obterNumeroSemanaIso(data);
}

function ordenarSemanasPlanejamento(semanas) {
  return semanas.sort(([semanaA], [semanaB]) => compararSemanasPlanejamento(semanaA, semanaB));
}

function compararSemanasPlanejamento(semanaA, semanaB) {
  const intervaloA = extrairIntervaloSemana(semanaA);
  const intervaloB = extrairIntervaloSemana(semanaB);

  if (intervaloA && intervaloB && intervaloA.inicio.getTime() !== intervaloB.inicio.getTime()) {
    return intervaloA.inicio - intervaloB.inicio;
  }

  const numeroA = extrairNumeroSemana(semanaA);
  const numeroB = extrairNumeroSemana(semanaB);

  if (numeroA !== null && numeroB !== null && numeroA !== numeroB) {
    return numeroA - numeroB;
  }

  if (intervaloA && !intervaloB) return -1;
  if (!intervaloA && intervaloB) return 1;
  if (numeroA !== null && numeroB === null) return -1;
  if (numeroA === null && numeroB !== null) return 1;

  return String(semanaA || '').localeCompare(String(semanaB || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

function extrairNumeroSemana(semana) {
  const correspondencia = String(semana || '').match(/semana\s*(\d+)/i);
  if (!correspondencia) return null;

  const numero = Number(correspondencia[1]);
  return Number.isNaN(numero) ? null : numero;
}
function agruparAtividadesPorSemana(lista) {
  return lista.reduce((grupo, atividadeSemanal) => {
    const semana = atividadeSemanal.semana || "Semana não informada";
    if (!grupo[semana]) grupo[semana] = [];
    grupo[semana].push(atividadeSemanal);
    return grupo;
  }, {});
}

function criarBlocoSemana(semana, atividadesDaSemana, podeGerenciarAtividadesSemanais) {
  const detalhes = obterDetalhesSemana(semana);
  const ultimaAtualizacao = obterUltimaAtualizacaoSemanal(atividadesDaSemana);

  return `
    <article class="weekly-week-card">
      <header class="weekly-week-header">
        <div>
          <span class="weekly-week-label">${escapeHtml(detalhes.titulo)}</span>
          <h3>${escapeHtml(detalhes.periodo)}</h3>
        </div>
        <div class="weekly-week-count">
          <strong>${atividadesDaSemana.length}</strong>
          <span>${atividadesDaSemana.length === 1 ? "atividade" : "atividades"}</span>
        </div>
      </header>
      <div class="weekly-week-meta">
        <span><i class="fas fa-clock" aria-hidden="true"></i> Última atualização: ${escapeHtml(ultimaAtualizacao)}</span>
      </div>
      <div class="weekly-activity-list">
        ${atividadesDaSemana.map((atividadeSemanal) => criarItemAtividadeSemanal(atividadeSemanal, podeGerenciarAtividadesSemanais)).join("")}
      </div>
    </article>
  `;
}

function criarItemAtividadeSemanal(atividadeSemanal, podeGerenciarAtividadesSemanais) {
  return `
    <div class="weekly-activity-item">
      <div>
        <div class="weekly-activity-title-row">
          <strong>${escapeHtml(atividadeSemanal.atividade || "Atividade sem título")}</strong>
          ${atividadeSemanal.prioridade ? `<span class="badge ${classePrioridade(atividadeSemanal.prioridade)}">${escapeHtml(atividadeSemanal.prioridade)}</span>` : ""}
          ${atividadeSemanal.obraId ? `<span class="badge obra-badge">${escapeHtml(`${atividadeSemanal.obraCodigo} — ${atividadeSemanal.obra}`)}</span>` : ""}
        </div>
        ${atividadeSemanal.entregas ? `<p class="weekly-activity-deliveries"><i class="fas fa-box-open" aria-hidden="true"></i> <strong>Entregas:</strong> ${escapeHtml(atividadeSemanal.entregas)}</p>` : ""}
        <p>${escapeHtml(atividadeSemanal.descricao || "Sem descrição cadastrada.")}</p>
        <small>Criado em ${escapeHtml(formatarDataHoraCadastro(atividadeSemanal.criadoEm))}</small>
      </div>
      ${podeGerenciarAtividadesSemanais ? `
        <div class="actions weekly-actions">
          <button type="button" class="secondary" onclick="editarAtividadeSemanal('${atividadeSemanal.id}')">Editar</button>
          <button type="button" class="ghost" onclick="excluirAtividadeSemanal('${atividadeSemanal.id}')">Excluir</button>
        </div>
      ` : ""}
    </div>
  `;
}

function obterDetalhesSemana(semana) {
  const partes = String(semana || "Semana não informada").split(":");
  const titulo = (partes.shift() || "Semana não informada").trim();
  const periodo = partes.join(":").trim() || "Período não informado";
  return { titulo, periodo };
}

function obterUltimaAtualizacaoSemanal(lista) {
  const datas = lista
    .map((item) => new Date(item.atualizadoEm || item.criadoEm))
    .filter((data) => !Number.isNaN(data.getTime()))
    .sort((a, b) => b - a);

  if (!datas.length) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(datas[0]);
}

function focarFormularioSemanal() {
  formSemanal.hidden = false;
  camposSemanais.semana.focus();
  formSemanal.scrollIntoView({ behavior: "smooth", block: "center" });
}

function preencherFiltroSemanas() {
  const valorAtual = filtrosSemanais.semana.value;
  const semanas = [...new Set(atividadesSemanais.map((item) => item.semana).filter(Boolean))]
    .sort(compararSemanasPlanejamento);
  preencherSelect(filtrosSemanais.semana, semanas, "Todas as semanas");
  if (semanas.includes(valorAtual)) filtrosSemanais.semana.value = valorAtual;
}

function editarAtividadeSemanal(id) {
  if (!usuarioAtualEhAdmin()) return;
  const atividadeSemanal = atividadesSemanais.find((item) => item.id === id);
  if (!atividadeSemanal) return;

  camposSemanais.id.value = atividadeSemanal.id;
  camposSemanais.semana.value = atividadeSemanal.semana || "";
  camposSemanais.atividade.value = atividadeSemanal.atividade || "";
  camposSemanais.prioridade.value = atividadeSemanal.prioridade || prioridades[0];
  camposSemanais.entregas.value = atividadeSemanal.entregas || "";
  camposSemanais.descricao.value = atividadeSemanal.descricao || "";
  camposSemanais.obraId.value = atividadeSemanal.obraId || "";
  camposSemanais.obra.value = atividadeSemanal.obra || "";
  document.getElementById("semanaObraIdentificacao").textContent = atividadeSemanal.obraId ? `${atividadeSemanal.obraCodigo} — ${atividadeSemanal.obra}` : "Sem obra vinculada.";
  btnCancelarEdicaoSemanal.style.display = "inline-block";
  btnSalvarAtividadeSemanal.textContent = "Atualizar atividade semanal";
  document.getElementById("semanaSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function excluirAtividadeSemanal(id) {
  if (!usuarioAtualEhAdmin()) {
    alert("Apenas administradores podem excluir atividades semanais.");
    return;
  }
  const confirmar = confirm("Deseja excluir esta atividade semanal do Supabase?");
  if (!confirmar) return;

  try {
    await fetch(`${API_SEMANA_URL}?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then(validarResposta);
    atividadesSemanais = atividadesSemanais.filter((item) => item.id !== id);
    preencherFiltroSemanas();
    renderizarDashboardSemanal();
    renderizarTabelaSemanal();
  } catch (erro) {
    alert(`Não foi possível excluir a atividade semanal no Supabase: ${erro.message}`);
  }
}

function limparFormularioSemanal() {
  formSemanal.reset();
  camposSemanais.id.value = "";
  camposSemanais.obraId.value = "";
  document.getElementById("semanaObraIdentificacao").textContent = "Sem obra vinculada.";
  btnCancelarEdicaoSemanal.style.display = "none";
  btnSalvarAtividadeSemanal.textContent = "Salvar atividade semanal";
}

async function apiRequestSemanal(method, atividadeSemanal) {
  return fetch(API_SEMANA_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(atividadeSemanal)
  }).then(validarResposta);
}

function setFormSemanalDisabled(disabled) {
  formSemanal.querySelectorAll("button, input, select, textarea").forEach((elemento) => {
    elemento.disabled = disabled;
  });
}
function obterDataIsoLocal(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function obterInicioSemana(dataReferencia = new Date()) {
  const inicio = new Date(dataReferencia);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return inicio;
}

function obterDiasSemanaCalendario() {
  const referencia = filtrosCalendario.dataReferencia?.value
    ? new Date(`${filtrosCalendario.dataReferencia.value}T00:00:00`)
    : new Date();
  const inicio = obterInicioSemana(referencia);
  if (filtrosCalendario.dataReferencia) filtrosCalendario.dataReferencia.value = obterDataIsoLocal(inicio);
  return Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + indice);
    return data;
  });
}

function navegarSemanaCalendario(direcao) {
  const atual = filtrosCalendario.dataReferencia?.value
    ? new Date(`${filtrosCalendario.dataReferencia.value}T00:00:00`)
    : new Date();
  const inicio = obterInicioSemana(atual);
  inicio.setDate(inicio.getDate() + direcao * 7);
  filtrosCalendario.dataReferencia.value = obterDataIsoLocal(inicio);
  renderizarCalendario();
}

function atividadeCruzaDia(atividade, dataIso) {
  const intervalo = obterIntervaloAtividade(atividade);
  if (!intervalo) return atividade.dataInicio === dataIso;
  const inicioDia = new Date(`${dataIso}T00:00:00`);
  const fimDia = new Date(`${dataIso}T23:59:59.999`);
  return intervalo.inicio <= fimDia && intervalo.fim >= inicioDia;
}

function obterAtividadesCalendario(dias) {
  const inicioIso = obterDataIsoLocal(dias[0]);
  const fimIso = obterDataIsoLocal(dias[dias.length - 1]);
  return atividades.filter((atividade) => {
    const correspondeColaborador = !filtrosCalendario.colaborador?.value || atividade.colaborador === filtrosCalendario.colaborador.value;
    const correspondeStatus = !filtrosCalendario.status?.value || atividade.status === filtrosCalendario.status.value;
    const cruzaSemana = (atividade.dataInicio && atividade.dataInicio <= fimIso && (atividade.dataTermino || atividade.dataInicio) >= inicioIso)
      || dias.some((dia) => atividadeCruzaDia(atividade, obterDataIsoLocal(dia)));
    return correspondeColaborador && correspondeStatus && cruzaSemana;
  });
}

function renderizarCalendario() {
  if (!calendarioGrade || !calendarioResumo) return;
  const dias = obterDiasSemanaCalendario();
  const lista = obterAtividadesCalendario(dias);
  const horas = obterHorasCalendario(dias, lista);
  const totalHoras = calcularHorasTrabalhadas(lista);
  const colaboradoresAtivos = new Set(lista.map((atividade) => atividade.colaborador).filter(Boolean)).size;

  calendarioResumo.innerHTML = [
    criarMetricCard("Atividades na semana", lista.length, `${formatarData(obterDataIsoLocal(dias[0]))} a ${formatarData(obterDataIsoLocal(dias[6]))}`, "fa-list-check"),
    criarMetricCard("Colaboradores ativos", colaboradoresAtivos, "Com registros no calendário", "fa-users"),
    criarMetricCard("Horas registradas", formatarHoras(totalHoras), "Soma dos intervalos lançados", "fa-clock"),
    criarMetricCard("Faixa exibida", formatarFaixaHorasCalendario(horas), "Somente horários com trabalho", "fa-business-time")
  ].join("");

  if (calendarioLegenda) {
    calendarioLegenda.innerHTML = statusLista.map((status) => `<span><i class="calendar-legend-dot ${classeStatus(status)}"></i>${escapeHtml(status)}</span>`).join("");
  }

  calendarioGrade.innerHTML = `
    <div class="calendar-corner">Hora</div>
    ${dias.map((dia) => `<div class="calendar-day-header"><strong>${escapeHtml(formatarDiaSemana(dia))}</strong><span>${formatarData(obterDataIsoLocal(dia))}</span></div>`).join("")}
    ${horas.length ? horas.map((hora) => `
      <div class="calendar-hour">${String(hora).padStart(2, "0")}:00</div>
      ${dias.map((dia) => criarCelulaCalendario(dia, hora, lista)).join("")}
    `).join("") : `<div class="calendar-empty-hours">Nenhum horário trabalhado encontrado para os filtros selecionados.</div>`}
  `;
}

function obterHorasCalendario(dias, lista) {
  if (!lista.length) return [];
  return Array.from({ length: 24 }, (_, hora) => hora).filter((hora) =>
    dias.some((dia) => {
      const dataIso = obterDataIsoLocal(dia);
      return lista.some((atividade) => atividadeOcupaHora(atividade, dataIso, hora));
    })
  );
}

function formatarFaixaHorasCalendario(horas) {
  if (!horas.length) return "Sem registros";
  const inicio = horas[0];
  const fim = horas[horas.length - 1] + 1;
  return `${String(inicio).padStart(2, "0")}h às ${String(fim).padStart(2, "0")}h`;
}

function formatarDiaSemana(data) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(data).replace(".", "");
}

function criarCelulaCalendario(dia, hora, lista) {
  const dataIso = obterDataIsoLocal(dia);
  const itens = lista.filter((atividade) => atividadeOcupaHora(atividade, dataIso, hora));
  return `<div class="calendar-cell">${itens.map(criarEventoCalendario).join("")}</div>`;
}

function atividadeOcupaHora(atividade, dataIso, hora) {
  const intervalo = obterIntervaloAtividade(atividade);
  if (!intervalo) return atividade.dataInicio === dataIso && Number((atividade.horaInicio || "00:00").slice(0, 2)) === hora;
  const inicioHora = new Date(`${dataIso}T${String(hora).padStart(2, "0")}:00:00`);
  const fimHora = new Date(inicioHora);
  fimHora.setHours(fimHora.getHours() + 1);
  return intervalo.inicio < fimHora && intervalo.fim > inicioHora;
}

function criarEventoCalendario(atividade) {
  return `
    <article class="calendar-event ${classeStatus(atividade.status)}" title="${escapeHtml(obterTituloEventoCalendario(atividade))}">
      <strong>${escapeHtml(atividade.colaborador || "Sem colaborador")}</strong>
      <span>${escapeHtml(atividade.trabalhos || atividade.projeto || "Atividade")}</span>
      <small>${escapeHtml(formatarDataHora(atividade.dataInicio, atividade.horaInicio))} → ${escapeHtml(formatarDataHora(atividade.dataTermino, atividade.horaTermino))}</small>
    </article>
  `;
}

function obterTituloEventoCalendario(atividade) {
  return `${atividade.obraCodigo ? `${atividade.obraCodigo} — ` : ""}${atividade.obra || "Obra não informada"}\n${atividade.trabalhos || "Atividade"} (${atividade.status || "Sem status"})`;
}
function atualizarDashboard() {
  const registrosFiltrados = filtrarRegistrosDashboard();
  const listaDashboard = aplicarFiltrosConsolidadosDashboard(consolidarAtividades(registrosFiltrados));
  const total = listaDashboard.length;
  const finalizadas = listaDashboard.filter((a) => a.status === "Finalizado").length;

  document.getElementById("totalAtividades").textContent = total;
  document.getElementById("totalProgresso").textContent = listaDashboard.filter((a) => a.status === "Em progresso").length;
  document.getElementById("totalFinalizado").textContent = finalizadas;
  document.getElementById("totalAtrasado").textContent = listaDashboard.filter((a) => a.status === "Atrasado").length;
  document.getElementById("totalProjetosObras").textContent = contarProjetosTrabalhados(listaDashboard);
  document.getElementById("totalHorasTrabalhadas").textContent = formatarHoras(calcularHorasTrabalhadas(listaDashboard));
  document.getElementById("percentualConclusao").textContent = `${total ? Math.round((finalizadas / total) * 100) : 0}%`;

  renderizarResumoColaboradores(listaDashboard);
  renderizarGraficosDashboard(listaDashboard);
}

function filtrarRegistrosDashboard() {
  const periodo = obterIntervaloDashboard();

  return atividades.filter((atividade) => {
    const dataReferencia = obterDataReferenciaAtividade(atividade);
    const dentroPeriodo = !dataReferencia || (dataReferencia >= periodo.inicio && dataReferencia <= periodo.fim);
    const correspondeColaborador = !filtrosDashboard.colaborador.value || atividade.colaborador === filtrosDashboard.colaborador.value;
    const correspondeProjeto = !filtrosDashboard.projeto.value || atividade.projeto === filtrosDashboard.projeto.value;
    const identidadeObra = atividade.obraId || `legado:${normalizarNomeObraAgrupamento(atividade.obra)}`;
    const correspondeObra = !filtrosDashboard.obra.value || identidadeObra === filtrosDashboard.obra.value;
    return dentroPeriodo && correspondeColaborador && correspondeProjeto && correspondeObra;
  });
}

function aplicarFiltrosConsolidadosDashboard(lista) {
  return lista.filter((atividade) => {
    const correspondeStatus = !filtrosDashboard.status.value || atividade.status === filtrosDashboard.status.value;
    const correspondePrioridade = !filtrosDashboard.prioridade.value || atividade.prioridade === filtrosDashboard.prioridade.value;
    return correspondeStatus && correspondePrioridade;
  });
}

function filtrarAtividadesDashboard() {
  return aplicarFiltrosConsolidadosDashboard(consolidarAtividades(filtrarRegistrosDashboard()));
}

function obterIntervaloDashboard() {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const inicioHoje = new Date(hoje);
  inicioHoje.setHours(0, 0, 0, 0);

  if (["semana-atual", "semana-anterior"].includes(filtrosDashboard.periodo.value)) {
    const inicio = obterInicioSemana(inicioHoje);
    
    if (filtrosDashboard.periodo.value === "semana-anterior") {
      inicio.setDate(inicio.getDate() - 7);
    }
    
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return { inicio, fim };
  }

  if (filtrosDashboard.periodo.value === "ano-atual") {
    return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: new Date(hoje.getFullYear(), 11, 31, 23, 59, 59, 999) };
  }

  if (filtrosDashboard.periodo.value === "mes-anterior") {
    return { inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), fim: new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999) };
  }

  if (filtrosDashboard.periodo.value === "personalizado" && filtrosDashboard.dataInicio.value && filtrosDashboard.dataFim.value) {
    return { inicio: new Date(`${filtrosDashboard.dataInicio.value}T00:00:00`), fim: new Date(`${filtrosDashboard.dataFim.value}T23:59:59.999`) };
  }

  return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999) };
}

function obterPeriodoRelatorioWord() {
  const { inicio, fim } = obterIntervaloDashboard();
  const tipoFiltro = filtrosDashboard.periodo.value;
  const tipo = tipoFiltro.startsWith("semana") ? "semanal" : tipoFiltro === "ano-atual" ? "anual" : tipoFiltro === "personalizado" ? "personalizado" : "mensal";
  const mes = inicio.toLocaleDateString("pt-BR", { month: "long" }).toUpperCase();
  const ano = String(inicio.getFullYear());
  const numeroSemana = Math.ceil((((inicio - new Date(inicio.getFullYear(), 0, 1)) / 86400000) + new Date(inicio.getFullYear(), 0, 1).getDay() + 1) / 7);
  const rotulo = tipo === "semanal" ? `SEMANA ${numeroSemana}` : tipo === "mensal" ? `${mes} / ${ano}` : tipo === "anual" ? `ANO ${ano}` : `${formatarData(obterDataIsoLocal(inicio))} A ${formatarData(obterDataIsoLocal(fim))}`;
  const competenciaRelatorio = tipo === "anual"
    ? ano
    : `${mes}/${ano}${inicio.getMonth() !== fim.getMonth() || inicio.getFullYear() !== fim.getFullYear()
      ? ` — ${fim.toLocaleDateString("pt-BR", { month: "long" }).toUpperCase()}/${fim.getFullYear()}`
      : ""}`;
  return { tipo, rotulo, dataInicio: obterDataIsoLocal(inicio), dataFim: obterDataIsoLocal(fim), mes, ano, competenciaRelatorio };
}

function formatarIntervaloDatasRelatorio(inicio, fim) {
  const dataInicio = new Date(`${obterDataIsoLocal(inicio)}T12:00:00`);
  const dataFim = new Date(`${obterDataIsoLocal(fim)}T12:00:00`);
  const diaMes = (data) => `${data.getDate()} de ${data.toLocaleDateString("pt-BR", { month: "long" })}`;
  return `${diaMes(dataInicio)} a ${diaMes(dataFim)} de ${dataFim.getFullYear()}`;
}

function obterDataReferenciaAtividade(atividade) {
  const data = atividade.dataInicio || atividade.data_inicio || atividade.criadoEm || atividade.criado_em;
  const dataReferencia = data ? new Date(String(data).includes("T") ? data : `${data}T00:00:00`) : null;
  return dataReferencia && !Number.isNaN(dataReferencia.getTime()) ? dataReferencia : null;
}

// Considera projeto trabalhado como combinação única de obra + projeto.
function contarProjetosTrabalhados(lista) {
  return new Set(lista.map(chaveProjetoAtividade).filter((chave) => chave !== "legado:|")).size;
}

function chaveProjetoAtividade(atividade) {
  const identidadeObra = atividade.obraId || `legado:${normalizarNomeObra(atividade.obra)}`;
  return `${identidadeObra}|${normalizarTexto(atividade.projeto)}`;
}

function renderizarResumoColaboradores(lista) {
  const resumo = agruparPorColaborador(lista);
  const container = document.getElementById("dashboardResumoColaboradores");
  const nomes = Object.keys(resumo);

  if (!nomes.length) {
    container.innerHTML = '<p class="empty dashboard-empty">Nenhum dado para o período selecionado.</p>';
    return;
  }

  container.innerHTML = nomes.map((nome) => `
    <article class="collaborator-card">
      <strong>${escapeHtml(nome)}</strong>
      <span>${resumo[nome].total} atividades • ${resumo[nome].finalizadas} finalizadas • ${resumo[nome].progresso} em progresso • ${resumo[nome].atrasadas} atrasadas</span>
      <small>${escapeHtml(nome)} trabalhou ${formatarHoras(resumo[nome].horas)} em ${resumo[nome].projetos} projeto(s)/obra(s) no período.</small>
    </article>
  `).join("");
}

function agruparPorColaborador(lista) {
  const registros = lista.flatMap((atividade) => atividade.registros || [atividade]);
  return consolidarAtividadesPorColaborador(registros).reduce((acc, atividade) => {
    const nome = atividade.colaborador || "Sem colaborador";
    acc[nome] ||= { total: 0, finalizadas: 0, progresso: 0, atrasadas: 0, horas: 0, projetosSet: new Set(), projetos: 0 };
    acc[nome].total += 1;
    acc[nome].finalizadas += atividade.status === "Finalizado" ? 1 : 0;
    acc[nome].progresso += atividade.status === "Em progresso" ? 1 : 0;
    acc[nome].atrasadas += atividade.status === "Atrasado" ? 1 : 0;
    acc[nome].horas += calcularHorasAtividade(atividade);
    acc[nome].projetosSet.add(chaveProjetoAtividade(atividade));
    acc[nome].projetos = acc[nome].projetosSet.size;
    return acc;
  }, {});
}

function renderizarGraficosDashboard(lista) {
  if (typeof Chart === "undefined") return;
  if (typeof obterRegistrosDetalhadosDashboard === "function") {
    try {
      renderizarGraficosFaseItemDashboard(obterRegistrosDetalhadosDashboard(lista));
    } catch (erro) {
      console.error("Não foi possível renderizar os gráficos de Fase e Item.", erro);
    }
  }

  const porColaborador = agruparPorColaborador(lista);
  const colaboradoresLabels = Object.keys(porColaborador).sort((a, b) => porColaborador[b].horas - porColaborador[a].horas).slice(0, 10);

  criarOuAtualizarGrafico("chartAtividadesColaborador", "bar", colaboradoresLabels, colaboradoresLabels.map((nome) => porColaborador[nome].total), "Atividades", true);
  criarOuAtualizarGrafico("chartHorasColaborador", "bar", colaboradoresLabels, colaboradoresLabels.map((nome) => Number(porColaborador[nome].horas.toFixed(2))), "Horas", true);  criarOuAtualizarGrafico("chartProjetosColaborador", "bar", colaboradoresLabels, colaboradoresLabels.map((nome) => porColaborador[nome].projetos), "Projetos/obras");
  criarOuAtualizarGrafico("chartStatus", "doughnut", statusLista, statusLista.map((status) => lista.filter((a) => a.status === status).length), "Status");
  renderizarAtividadesFinalizadas(lista);
  const disciplinas = projetos.map((projeto) => ({ projeto, total: lista.filter((a) => a.projeto === projeto).length })).filter((item) => item.total).sort((a, b) => b.total - a.total).slice(0, 10);
  criarOuAtualizarGrafico("chartTipoProjeto", "bar", disciplinas.map((item) => item.projeto), disciplinas.map((item) => item.total), "Projetos", true);
  criarOuAtualizarGrafico("chartPrioridade", "bar", prioridades, prioridades.map((prioridade) => lista.filter((a) => a.prioridade === prioridade).length), "Prioridades");
  const obrasPegando = obterObrasPegando(lista);
  criarOuAtualizarGrafico("chartObrasPegando", "bar", obrasPegando.labels, obrasPegando.valores, "Horas por obra", true);
  const porProjeto = agruparIndicadoresPorProjetoObra(lista);
  criarOuAtualizarGrafico("chartAtividadesProjetoRelatorio", "bar", porProjeto.labels, porProjeto.atividades, "Atividades", true);
  criarOuAtualizarGrafico("chartHorasProjetoRelatorio", "bar", porProjeto.labels, porProjeto.horas, "Horas", true);
}
function obterContextoGraficosFaseItemDashboard() {
  const partes = [];
  if (filtrosDashboard.obra.value) partes.push(filtrosDashboard.obra.selectedOptions[0]?.textContent?.trim());
  if (filtrosDashboard.projeto.value) partes.push(filtrosDashboard.projeto.selectedOptions[0]?.textContent?.trim());
  return partes.filter(Boolean).join(" · ");
}

function atualizarTextoAuxiliarGraficoClassificacao(tipo, resultado, totalCategorias) {
  const capitalizado = tipo === "Fase" ? "Fase" : "Item";
  const sufixo = tipo === "Fase" ? "horasSemFase" : "horasSemItem";
  const nota = document.getElementById(`chartHoras${capitalizado}Nota`);
  if (!nota) return;
  const mensagens = [];
  if (resultado[sufixo] > 0) mensagens.push(`Dados históricos: ${formatarHoras(resultado[sufixo])} sem classificação de ${capitalizado}.`);
  if (totalCategorias > 10) mensagens.push(`Exibindo as 10 categorias com maior consumo de horas entre ${totalCategorias} categorias.`);
  nota.textContent = mensagens.join(" ");
  nota.hidden = !mensagens.length;
}

function renderizarGraficoClassificacaoDashboard(tipo, resultado, obterLabel) {
  const canvasId = `chartHoras${tipo}`;
  const canvas = document.getElementById(canvasId);
  const semDados = document.getElementById(`${canvasId}SemDados`);
  if (!canvas || !semDados || typeof ordenarTopHorasDashboard !== "function") return;
  const top = ordenarTopHorasDashboard(resultado.categorias, 10, obterLabel);
  atualizarTextoAuxiliarGraficoClassificacao(tipo, resultado, top.totalCategorias);
  if (!top.categorias.length) {
    if (dashboardCharts[canvasId]) dashboardCharts[canvasId].destroy();
    delete dashboardCharts[canvasId];
    canvas.hidden = true;
    canvas.closest(".classification-chart-canvas")?.setAttribute("hidden", "");
    semDados.hidden = false;
    return;
  }
  canvas.hidden = false;
  canvas.closest(".classification-chart-canvas")?.removeAttribute("hidden");
  semDados.hidden = true;
  const labels = top.categorias.map(obterLabel);
  const valores = top.categorias.map((categoria) => Number(categoria.horas.toFixed(2)));
  const totalClassificado = resultado.totalHorasClassificadas;
  criarOuAtualizarGraficoClassificacao(canvasId, top.categorias, labels, valores, totalClassificado);
}

function renderizarGraficosFaseItemDashboard(registros) {
  const projetosFiltrados = new Set(registros.map((registro) => String(registro.projeto || "Projeto não informado").trim()));
  const multiplosProjetos = projetosFiltrados.size > 1;
  const contexto = obterContextoGraficosFaseItemDashboard();
  ["Fase", "Item"].forEach((tipo) => {
    const elemento = document.getElementById(`chartHoras${tipo}Contexto`);
    if (!elemento) return;
    elemento.textContent = contexto;
    elemento.hidden = !contexto;
  });
  if (typeof agruparHorasPorFaseDashboard !== "function" ||
      typeof agruparHorasPorItemDashboard !== "function" ||
      typeof obterLabelFaseDashboard !== "function" ||
      typeof obterLabelItemDashboard !== "function") return;
  const fases = agruparHorasPorFaseDashboard(registros, calcularHorasAtividade);
  const itens = agruparHorasPorItemDashboard(registros, calcularHorasAtividade);
  renderizarGraficoClassificacaoDashboard("Fase", fases, (categoria) => obterLabelFaseDashboard(categoria, multiplosProjetos));
  renderizarGraficoClassificacaoDashboard("Item", itens, (categoria) => obterLabelItemDashboard(categoria, multiplosProjetos));
}

function quebrarRotuloGrafico(texto, limite = 34) {
  const palavras = String(texto || "").replace(/\s*→\s*/g, " → ").split(/\s+/).filter(Boolean);
  const linhas = [];
  let linha = "";
  palavras.forEach((palavra) => {
    const candidata = linha ? `${linha} ${palavra}` : palavra;
    if (linha && candidata.length > limite) {
      linhas.push(linha);
      linha = palavra;
    } else {
      linha = candidata;
    }
  });
  if (linha) linhas.push(linha);
  return linhas.length ? linhas : [""];
}

const pluginValorFimBarra = {
  id: "valorFimBarra",
  afterDatasetsDraw(chart) {
    const corTexto = getComputedStyle(document.documentElement).getPropertyValue("--text-lighter").trim() || "#f8fafc";
    const contexto = chart.ctx;
    contexto.save();
    contexto.fillStyle = corTexto;
    contexto.font = "600 12px sans-serif";
    contexto.textBaseline = "middle";
    chart.getDatasetMeta(0).data.forEach((barra, indice) => {
      const valor = chart.data.datasets[0].data[indice];
      contexto.fillText(formatarHoras(valor), Math.min(barra.x + 8, chart.width - 48), barra.y);
    });
    contexto.restore();
  }
};

function criarOuAtualizarGraficoClassificacao(canvasId, categorias, labelsCompletos, valores, totalClassificado) {
  const canvas = document.getElementById(canvasId);
  const container = canvas?.closest(".classification-chart-canvas");
  if (!canvas || !container) return;
  if (dashboardCharts[canvasId]) dashboardCharts[canvasId].destroy();
  container.style.height = `${Math.max(300, Math.min(600, categorias.length * 44 + 90))}px`;

  const estilos = getComputedStyle(document.documentElement);
  const corTexto = estilos.getPropertyValue("--text-light").trim() || "#e2e8f0";
  const corGrade = estilos.getPropertyValue("--border-color").trim() || "#334155";
  const corBarra = estilos.getPropertyValue("--accent-blue").trim() || estilos.getPropertyValue("--accent-light").trim() || "#4299e1";
  const limiteRotulo = container.clientWidth < 600 ? 24 : 34;
  dashboardCharts[canvasId] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labelsCompletos.map((label) => quebrarRotuloGrafico(label, limiteRotulo)),
      datasets: [{ label: "Horas", data: valores, backgroundColor: corBarra, borderColor: corBarra, borderWidth: 1, borderRadius: 5, barPercentage: .72 }]
    },
    plugins: [pluginValorFimBarra],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      animation: false,
      layout: { padding: { right: 64 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (itens) => labelsCompletos[itens[0]?.dataIndex] || "",
            label: (contexto) => {
              const horas = categorias[contexto.dataIndex]?.horas || 0;
              const percentual = totalClassificado ? (horas / totalClassificado) * 100 : 0;
              return [formatarHoras(horas), `${percentual.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% das horas classificadas`];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: "Horas", color: corTexto },
          ticks: { color: corTexto, callback: (valor) => `${Number(valor).toLocaleString("pt-BR")}h` },
          grid: { color: corGrade }
        },
        y: { ticks: { color: corTexto, autoSkip: false, font: { size: 13 } }, grid: { display: false } }
      }
    }
  });
}
function obterChaveProjetoObra(atividade) {
  return chaveProjetoAtividade(atividade);
}

function obterEtiquetaProjetoObra(atividade) {
  const codigo = String(atividade.obraCodigo || "").trim();
  const obra = String(atividade.obra || "Obra não informada").trim();
  const projeto = String(atividade.projeto || "Projeto não informado").trim();
  return `${codigo ? `${codigo} — ` : ""}${obra} — ${projeto}`;
}

function agruparIndicadoresPorProjetoObra(lista) {
  const mapa = new Map();
  lista.forEach((atividade) => {
    const chave = obterChaveProjetoObra(atividade);
    const atual = mapa.get(chave) || { etiqueta: obterEtiquetaProjetoObra(atividade), atividades: 0, horas: 0 };
    atual.atividades += 1;
    atual.horas += calcularHorasAtividade(atividade);
    mapa.set(chave, atual);
  });

  const labels = [...mapa.keys()]
    .sort((a, b) => mapa.get(b).horas - mapa.get(a).horas || mapa.get(b).atividades - mapa.get(a).atividades || a.localeCompare(b))
    .slice(0, 10);

  return {
    labels: labels.map((chave) => mapa.get(chave).etiqueta),
    atividades: labels.map((chave) => mapa.get(chave).atividades),
    horas: labels.map((chave) => Number(mapa.get(chave).horas.toFixed(2)))
  };
}

function obterObrasPegando(lista) {
  const mapa = new Map();
  lista.filter((atividade) => atividade.obra).forEach((atividade) => {
    const chave = atividade.obraId || `legado:${normalizarNomeObraAgrupamento(atividade.obra)}`;
    const atual = mapa.get(chave) || { nome: String(atividade.obra).trim(), horas: 0 };
    atual.horas += calcularHorasAtividade(atividade);
    mapa.set(chave, atual);
  });
  // O gráfico 7 destaca somente as obras que mais consumiram horas na competência,
  // evitando que uma cauda longa de obras torne os nomes e os valores ilegíveis.
  const chaves = [...mapa.keys()]
    .sort((a, b) => mapa.get(b).horas - mapa.get(a).horas || mapa.get(a).nome.localeCompare(mapa.get(b).nome))
    .slice(0, 10);
  return { labels: chaves.map((chave) => mapa.get(chave).nome), valores: chaves.map((chave) => Number(mapa.get(chave).horas.toFixed(2))) };
}

function criarOuAtualizarGrafico(canvasId, tipo, labels, valores, label, horizontal = false, opcoesExtras = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (dashboardCharts[canvasId]) dashboardCharts[canvasId].destroy();

  const corTexto = getComputedStyle(document.documentElement).getPropertyValue("--text-light").trim() || "#e2e8f0";
  const corGrade = getComputedStyle(document.documentElement).getPropertyValue("--border-color").trim() || "#334155";

  dashboardCharts[canvasId] = new Chart(canvas, {
    type: tipo,
    data: { labels, datasets: [{ label, data: valores, backgroundColor: obterCoresGrafico(labels), borderColor: "#63b3ed", tension: 0.3 }] },
    options: {
      ...opcoesExtras,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: tipo === "doughnut", labels: { color: corTexto, font: { size: 15 } } },
        ...(opcoesExtras.plugins || {})
      },
      indexAxis: horizontal ? "y" : "x",
      animation: false,
      scales: tipo === "doughnut" ? {} : {
        x: { beginAtZero: horizontal, ticks: { color: corTexto, precision: 0, font: { size: 14 } }, grid: { color: corGrade } },
        y: { beginAtZero: !horizontal, ticks: { color: corTexto, precision: 0, font: { size: 14 } }, grid: { color: corGrade } }
      }
    }
  });
}
function renderizarAtividadesFinalizadas(lista) {
  const container = document.getElementById("listaAtividadesFinalizadas");
  if (!container) return;

  const finalizadas = lista
    .filter((atividade) => atividade.status === "Finalizado")
    .sort((a, b) => {
      const dataA = obterDataReferenciaAtividade(a)?.getTime() || 0;
      const dataB = obterDataReferenciaAtividade(b)?.getTime() || 0;
      return dataB - dataA || String(a.trabalhos || "").localeCompare(String(b.trabalhos || ""));
    });

  if (!finalizadas.length) {
    container.innerHTML = '<p class="empty dashboard-empty completed-activities-empty">Nenhuma atividade finalizada para os filtros selecionados.</p>';
    return;
  }

  container.innerHTML = `
    <ul>
      ${finalizadas.map((atividade) => `
        <li>
          <strong>${escapeHtml(obterNomeAtividade(atividade))}</strong>
          <small>${escapeHtml(obterDetalheAtividadeFinalizada(atividade))}</small>
        </li>
      `).join("")}
    </ul>
  `;
}

function obterNomeAtividade(atividade) {
  const obra = `${atividade.obraCodigo ? `${atividade.obraCodigo} — ` : ""}${atividade.obra || "Obra não informada"}`;
  return `${obra} — ${atividade.projeto || "Projeto não informado"}${atividade.etapa ? ` — ${atividade.etapa}` : ""}`;
}

function obterDetalheAtividadeFinalizada(atividade) {
  const partes = [(atividade.colaboradores || [atividade.colaborador]).filter(Boolean).join(" e "), formatarHoras(calcularHorasAtividade(atividade))].filter(Boolean);
  if (atividade.quantidadeRegistros > 1) partes.push(`${atividade.quantidadeRegistros} lançamentos consolidados`);
  const data = atividade.dataTerminoMaisRecente || atividade.dataTermino || atividade.dataInicio || atividade.criadoEm || atividade.criado_em;
  if (data) partes.push(`Finalizada em ${formatarDataHoraFinalizacao(data, atividade.horaTermino)}`);
  return partes.join(" • ") || "Sem detalhes adicionais";
}

function obterMesesFinalizados(lista) {
  const mapa = new Map();
  lista.filter((a) => a.status === "Finalizado").forEach((atividade) => {
    const data = obterDataReferenciaAtividade(atividade);
    if (!data) return;
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    mapa.set(chave, (mapa.get(chave) || 0) + 1);
  });

  const labels = [...mapa.keys()].sort();
  return { labels, valores: labels.map((label) => mapa.get(label)) };
}

function atualizarOpcoesDashboard() {
  const valorObra = filtrosDashboard.obra.value;
  filtrosDashboard.obra.innerHTML = '<option value="">Todas as obras</option>';
  obrasCadastradas.forEach((obra) => { const option = document.createElement("option"); option.value = obra.id; option.textContent = `${obra.codigo} — ${obra.nome}`; filtrosDashboard.obra.appendChild(option); });
  if ([...filtrosDashboard.obra.options].some((option) => option.value === valorObra)) filtrosDashboard.obra.value = valorObra;
}

async function gerarRelatorioWord() {
  if (!usuarioAtual) {
    alert("Faça login para gerar o relatório Word.");
    return;
  }

  if (!usuarioAtualEhAdmin()) {
    alert("Apenas o administrador da conta pode gerar o relatório Word.");
    return;
  }

  const textoOriginal = btnGerarRelatorioWord?.innerHTML;

  try {
    if (btnGerarRelatorioWord) {
      btnGerarRelatorioWord.disabled = true;
      btnGerarRelatorioWord.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Gerando...';
    }
    atualizarDashboard();
    const registrosAtividadesRelatorio = filtrarRegistrosDashboard();
    const atividadesRelatorio = aplicarFiltrosConsolidadosDashboard(consolidarAtividades(registrosAtividadesRelatorio));
    
    const atividadesSemanaisRelatorio = filtrarAtividadesSemanaisPorPeriodo(obterAtividadesSemanaisFiltradas());
    const periodoRelatorio = obterPeriodoRelatorioWord();
    const registrosOficiaisRelatorio = atividadesRelatorio.flatMap((atividade) => atividade.registros || []);
    const dadosGerenciaisRelatorio = DADOS_GERENCIAIS_RELATORIO.construirDadosGerenciaisRelatorio(registrosOficiaisRelatorio);
    const modoRelatorio = PAYLOAD_RELATORIO.obterModoRelatorio(periodoRelatorio);
    if (btnGerarRelatorioWord && modoRelatorio !== "semanal") btnGerarRelatorioWord.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Preparando relatório mensal consolidado...';
    let nivelGrafico = 0;
    let payload = PAYLOAD_RELATORIO.montarPayloadCompacto({
      atividades: registrosOficiaisRelatorio,
      atividadesSemanais: atividadesSemanaisRelatorio,
      periodoRelatorio,
      tituloRelatorio: obterTituloRelatorioWord(),
      filtros: obterFiltrosDashboardRelatorio(),
      modoRelatorio,
      graficos: await prepararGraficosParaRelatorio(dadosGerenciaisRelatorio, nivelGrafico),
      gantt: await prepararGanttParaRelatorio(registrosOficiaisRelatorio, periodoRelatorio, dadosGerenciaisRelatorio.horasTotais)
    });
    let diagnostico = PAYLOAD_RELATORIO.calcularTamanhoPayloadRelatorio(payload, { log: true });
    while (diagnostico.total > PAYLOAD_RELATORIO.MAX_PAYLOAD_RELATORIO_BYTES && nivelGrafico < 2) {
      nivelGrafico += 1;
      payload.graficos = await prepararGraficosParaRelatorio(dadosGerenciaisRelatorio, nivelGrafico);
      diagnostico = PAYLOAD_RELATORIO.calcularTamanhoPayloadRelatorio(payload, { log: true });
    }
    if (diagnostico.total > PAYLOAD_RELATORIO.MAX_PAYLOAD_RELATORIO_BYTES) throw new Error("O relatório possui volume acima do limite seguro. Os gráficos foram compactados automaticamente, mas o arquivo ainda permanece muito grande.");
    const response = await fetch(API_RELATORIO_WORD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const erro = await response.json().catch(() => null);
      if (response.status === 413) {
        PAYLOAD_RELATORIO.calcularTamanhoPayloadRelatorio(payload, { log: true });
        throw new Error("Não foi possível enviar os dados porque o volume da requisição excedeu o limite permitido, mesmo após a compactação automática.");
      }
      throw new Error(erro?.error || "Erro inesperado ao gerar relatório Word.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const periodoArquivo = obterPeriodoRelatorioWord();
    link.download = `relatorio-atividades-${normalizarTexto(periodoArquivo.rotulo).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (erro) {
    alert(`Não foi possível gerar o relatório Word: ${erro.message}`);
  } finally {
    if (btnGerarRelatorioWord) {
      btnGerarRelatorioWord.disabled = false;
      btnGerarRelatorioWord.innerHTML = textoOriginal;
    }
  }
}
async function obterPlannerParaRelatorio() {
  if (plannerChecklists.length) return plannerChecklists;
  const data = await fetch(API_PLANNER_URL).then(validarResposta);
  return Array.isArray(data.checklists) ? data.checklists : [];
}

async function prepararGanttParaRelatorio(atividadesPermitidas, periodoRelatorio, horasTotais) {
  if (typeof PLANNER_GANTT_RELATORIO === "undefined") return { possuiDados: false, obras: [] };
  const checklists = await obterPlannerParaRelatorio();
  return PLANNER_GANTT_RELATORIO.prepararEstruturaTabular({ checklists, atividadesPermitidas, horasTotais,
    periodo: { inicio: periodoRelatorio.dataInicio, fim: periodoRelatorio.dataFim } });
}
const fundoBrancoRelatorioPlugin = {
  id: "fundoBrancoRelatorio",
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
};

function clonarDadosGraficoRelatorio(data) {
  return {
    labels: [...(data?.labels || [])],
    datasets: (data?.datasets || []).map((dataset) => ({
      ...dataset,
      data: [...(dataset.data || [])],
      borderColor: dataset.borderColor || "#1d4ed8",
      backgroundColor: Array.isArray(dataset.backgroundColor) ? [...dataset.backgroundColor] : dataset.backgroundColor,
      borderWidth: dataset.type === "line" ? 3 : 1.5,
      tension: dataset.tension ?? 0.3
    }))
  };
}

function criarOpcoesGraficoRelatorio(tipo, horizontal = false) {
  return {
    responsive: false,
    maintainAspectRatio: false,
    animation: false,
    devicePixelRatio: 2,
    layout: { padding: horizontal ? { left: 48, right: 24, top: 24, bottom: 24 } : 24 },
    font: { size: 22 },
    plugins: {
      legend: {
        display: tipo === "doughnut",
        position: "bottom",
        labels: { color: "#222222", font: { size: 22, weight: "bold" }, padding: 20, boxWidth: 20 }
      },
      title: { color: "#222222", font: { size: 22, weight: "bold" } }
    },
    indexAxis: horizontal ? "y" : "x",
    scales: tipo === "doughnut" ? {} : {
      x: {
        beginAtZero: horizontal,
        ticks: { color: "#222222", precision: 0, font: { size: 22, weight: "bold" }, maxRotation: 0, minRotation: 0 },
        grid: { color: "#d1d5db" }
      },
      y: {
        beginAtZero: !horizontal,
        ticks: { color: "#222222", precision: 0, font: { size: 22, weight: "bold" } },
        grid: { color: "#d1d5db" }
      }
    }
  };
}

async function capturarGraficoTemporarioRelatorio(canvasId, largura = 1800, altura = 1000) {
  const graficoOrigem = dashboardCharts[canvasId];
  if (!graficoOrigem || typeof Chart === "undefined") return capturarCanvasRelatorio(canvasId);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  canvas.style.cssText = "position:fixed;left:-99999px;top:-99999px;background:#fff;";
  document.body.appendChild(canvas);
  
  let graficoRelatorio;
  try {
    const tipo = graficoOrigem.config.type;
    const horizontal = graficoOrigem.options?.indexAxis === "y";
    graficoRelatorio = new Chart(canvas, {
      type: tipo,
      data: clonarDadosGraficoRelatorio(graficoOrigem.data),
      options: criarOpcoesGraficoRelatorio(tipo, horizontal),
      plugins: [fundoBrancoRelatorioPlugin]
    });
    graficoRelatorio.update("none");
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const imagem = canvas.toDataURL("image/png", 1);
    return imagem;
  } catch (erro) {
    console.warn(`Não foi possível preparar o gráfico ${canvasId} para relatório:`, erro);
    return capturarCanvasRelatorio(canvasId);
  } finally {
    graficoRelatorio?.destroy();
    canvas.remove();
  }
}

async function prepararGraficosParaRelatorio(dadosGerenciais, nivel = 0) {
  if (typeof GRAFICOS_RELATORIO === "undefined") throw new Error("Renderizador de gráficos do relatório indisponível.");
  return GRAFICOS_RELATORIO.gerarTodos({ dadosGerenciais, nivel });
}
function aguardarRenderizacaoGraficos() {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

function capturarCanvasRelatorio(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !canvas.width || !canvas.height) return null;

  try {
    return canvas.toDataURL("image/png");
  } catch (erro) {
    console.warn(`Não foi possível capturar o gráfico ${canvasId}:`, erro);
    return null;
  }
}

function capturarGraficosRelatorio() {
  return {
    atividadesProjeto: capturarCanvasRelatorio("chartAtividadesProjetoRelatorio"),
    horasProjeto: capturarCanvasRelatorio("chartHorasProjetoRelatorio"),
    atividadesColaborador: capturarCanvasRelatorio("chartAtividadesColaborador"),
    horasColaborador: capturarCanvasRelatorio("chartHorasColaborador"),
    status: capturarCanvasRelatorio("chartStatus"),
    tipoProjeto: capturarCanvasRelatorio("chartTipoProjeto"),
    prioridade: capturarCanvasRelatorio("chartPrioridade"),
    obrasPegando: capturarCanvasRelatorio("chartObrasPegando")
  };
}
const MESES_SEMANA = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11
};

function extrairIntervaloSemana(semana) {
  const texto = normalizarTexto(semana).replace(/\s+/g, " ");
  const padrao = /(\d{1,2}) de ([a-zç]+)(?: de (\d{4}))?\s*(?:a|à|ate|até)\s*(\d{1,2}) de ([a-zç]+)(?: de (\d{4}))?/i;
  const correspondencia = texto.match(padrao);
  if (!correspondencia) return null;

  const [, diaInicio, mesInicioNome, anoInicioTexto, diaFim, mesFimNome, anoFimTexto] = correspondencia;
  const mesInicio = MESES_SEMANA[mesInicioNome];
  const mesFim = MESES_SEMANA[mesFimNome];
  const anoFim = Number(anoFimTexto || anoInicioTexto);
  const anoInicio = Number(anoInicioTexto || anoFimTexto);

  if (mesInicio === undefined || mesFim === undefined || !anoInicio || !anoFim) return null;

  const inicio = new Date(anoInicio, mesInicio, Number(diaInicio));
  const fim = new Date(anoFim, mesFim, Number(diaFim));
  fim.setHours(23, 59, 59, 999);

  return Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) ? null : { inicio, fim };
}

function dataDentroDoIntervalo(data, intervalo) {
  return data >= intervalo.inicio && data <= intervalo.fim;
}

function filtrarAtividadesSemanaisPorPeriodo(lista) {
  const periodo = obterIntervaloDashboard();
  return lista.filter((atividadeSemanal) => {
    const intervaloSemana = extrairIntervaloSemana(atividadeSemanal.semana);
    if (intervaloSemana) return intervaloSemana.inicio <= periodo.fim && intervaloSemana.fim >= periodo.inicio;
    const entrega = atividadeSemanal.entregas || atividadeSemanal.entrega || atividadeSemanal.entregaPrevista;
    const dataEntrega = entrega && /^\d{4}-\d{2}-\d{2}/.test(entrega) ? new Date(`${entrega.slice(0, 10)}T12:00:00`) : null;
    return dataEntrega ? dataDentroDoIntervalo(dataEntrega, periodo) : false;
  });
}

function obterTituloRelatorioWord() {
  if (["semana-atual", "semana-anterior"].includes(filtrosDashboard.periodo.value)) {
    const periodo = obterPeriodoRelatorioWord();
    const intervalo = obterIntervaloDashboard();
    return `${periodo.rotulo.replace(/^SEMANA/, "Semana")}: ${formatarIntervaloDatasRelatorio(intervalo.inicio, intervalo.fim)}`;  }

  if (filtrosDashboard.periodo.value === "ano-atual") {
    return "Relatório anual de acompanhamento das atividades do setor.";
  }

  return "Relatório mensal de acompanhamento das atividades do setor.";
}
function obterFiltrosDashboardRelatorio() {
  return {
    periodo: filtrosDashboard.periodo.value,
    dataInicio: filtrosDashboard.dataInicio.value,
    dataFim: filtrosDashboard.dataFim.value,
    colaborador: filtrosDashboard.colaborador.value,
    status: filtrosDashboard.status.value,
    prioridade: filtrosDashboard.prioridade.value,
    projeto: filtrosDashboard.projeto.value,
    obra: filtrosDashboard.obra.value
  };
}

function exportarCSV() {
  if (!atividades.length) {
    alert("Não há atividades para exportar.");
    return;
  }

  const cabecalho = [
    "ID da atividade", "ID da Obra", "Código da Obra", "Nome da Obra", "Projeto/Disciplina",
    "Colaborador",
    "Prioridade",
    "Trabalhos",
    "Fase",
    "Item",
    "Etapa",
    "Data de início",
    "Horário de início",
    "Data de término",
    "Horário de término",
    "Data prevista para entrega",
    "Cadastrado em",
    "Status",
    "Observações"
  ];

  const linhas = atividades.map((a) => [
    a.id, a.obraId, a.obraCodigo, a.obra, a.projeto,
    a.colaborador,
    a.prioridade,
    a.trabalhos,
    a.fase,
    a.item,
    a.etapa,
    a.dataInicio,
    a.horaInicio,
    a.dataTermino,
    a.horaTermino,
    a.dataPrevista,
    formatarDataHoraCadastro(a.criadoEm),
    a.status,
    a.observacoes
  ]);

  const csv = [cabecalho, ...linhas]
    .map((linha) => linha.map((valor) => `"${String(valor || "").replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "atividades_colaboradores.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function carregarAtividades() {
  try {
    carregando = true;
    renderizarTabela();
    atividades = await fetch(API_URL).then(validarResposta);
    atualizarOpcoesDashboard();
    renderizarCalendario();
  } catch (erro) {
    alert(`Não foi possível carregar as atividades do Supabase: ${erro.message}`);
    atividades = [];
  } finally {
    carregando = false;
    renderizarTabela();
  }
}

async function apiRequest(method, atividade) {
  return fetch(API_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(atividade)
  }).then(validarResposta);
}

async function validarResposta(response) {
  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) data = await response.json().catch(() => null);
  else {
    const texto = await response.text();
    data = texto ? { mensagem: texto } : null;
  }
  if (!response.ok) {
    throw new Error(data?.mensagem || data?.message || data?.erro || data?.error || `Erro HTTP ${response.status}`);
  }
  return data;
}

function setFormDisabled(disabled) {
  form.querySelectorAll("button, input, select, textarea").forEach((elemento) => {
    elemento.disabled = disabled;
  });
  if (!disabled) {
    campos.item.disabled = !campos.fase.value;
    atualizarCamposOutros(false);
  }
}

function escapeHtml(valor) {
  return String(valor || "").replace(/[&<>'"]/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[caractere]);
}
function obterIntervaloAtividade(atividade) {
  if (!atividade.dataInicio || !atividade.horaInicio || !atividade.dataTermino || !atividade.horaTermino) return null;

  const inicio = new Date(`${atividade.dataInicio}T${atividade.horaInicio}`);
  const fim = new Date(`${atividade.dataTermino}T${atividade.horaTermino}`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim <= inicio) return null;

  return { inicio, fim };
}

function calcularHorasAtividade(atividade) {
  if (atividade?.consolidada && Number.isFinite(Number(atividade.horasConsolidadas))) return Number(atividade.horasConsolidadas);
  const intervalo = obterIntervaloAtividade(atividade);
  if (!intervalo) return 0;
  return (intervalo.fim - intervalo.inicio) / 36e5;
}

function calcularHorasTrabalhadas(lista) {
  return lista.reduce((total, atividade) => total + calcularHorasAtividade(atividade), 0);
}

function formatarHoras(horas) {
  const horasSeguras = Number.isFinite(horas) ? horas : 0;
  return `${horasSeguras.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}h`;
}

function encontrarConflitoHorario(atividade, lista) {
  const intervalo = obterIntervaloAtividade(atividade);
  if (!intervalo) return null;

  return lista.find((existente) => {
    if (existente.id === atividade.id || existente.colaborador !== atividade.colaborador) return false;
    const intervaloExistente = obterIntervaloAtividade(existente);
    if (!intervaloExistente) return false;
    return intervalo.inicio < intervaloExistente.fim && intervalo.fim > intervaloExistente.inicio;
  }) || null;
}
function formatarData(data) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHoraFinalizacao(data, hora = "") {
  if (!data) return "-";

  const correspondencia = String(data).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!correspondencia) return "-";

  const [, ano, mes, dia, horaData, minutoData, segundoData] = correspondencia;
  const correspondenciaHora = String(hora).match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  const horas = horaData || correspondenciaHora?.[1];
  const minutos = minutoData || correspondenciaHora?.[2];
  const segundos = segundoData || correspondenciaHora?.[3] || "00";
  const dataFormatada = `${dia}/${mes}/${ano}`;

  return horas && minutos ? `${dataFormatada} às ${horas}:${minutos}:${segundos}` : dataFormatada;
}

function formatarDataHora(data, hora) {
  if (!data && !hora) return "-";
  return `${formatarData(data)}${hora ? ` às ${hora}` : ""}`;
}

function formatarDataHoraCadastro(dataHora) {
  if (!dataHora) return "-";

  const data = new Date(dataHora);
  if (Number.isNaN(data.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(data);
}

function classePrioridade(prioridade) {
  return prioridade.toLowerCase();
}

function obterCoresGrafico(labels) {
  const coresPadrao = ["#3182ce", "#48bb78", "#ed8936", "#f56565", "#9f7aea", "#63b3ed"];
  return labels.map((label, index) => coresPrioridade[label] || coresPadrao[index % coresPadrao.length]);
}

function classeStatus(status) {
  return status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-");
}
function normalizarOpcaoPlanner(value) {
  return normalizarChavePlanner(value);
}
function opcoesUnicasPlanner(values) {
  const seen = new Set();
  return values.filter((value) => { const key = normalizarOpcaoPlanner(value); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
function obterCodigosExibicaoPlanner(checklist) {
  const codigo = checklist.codigoProjeto || gerarCodigoProjeto(checklist.projeto);
  return globalThis.obterCodigosProjetoPlanner?.(checklist.projeto, codigo) || [codigo];
}
function renderizarCodigosProjetoPlanner(checklist) {
  return obterCodigosExibicaoPlanner(checklist).map((codigo) => `<span class="planner-code planner-project-code" data-project-code="${escapeHtml(codigo)}">${escapeHtml(codigo)}</span>`).join("");
}
function obterBucketDoProjeto(projeto, codigoProjeto = "") {
  const bucketModelo = globalThis.obterBucketModeloPlanner?.(projeto, codigoProjeto);
  if (bucketModelo) return bucketModelo;
  const texto = `${normalizarOpcaoPlanner(projeto)} ${normalizarOpcaoPlanner(codigoProjeto)}`;
  if (texto.includes("baixa tensao")) return "Projeto Elétrico Baixa Tensão";
  if (texto.includes("alimentador") || texto.includes("prj-ali")) return "Projeto Elétrico de Alimentadores";
  if (texto.includes("iluminacao externa") || texto.includes("prj-ilux")) return "Projeto de Iluminação Externa";
  if (texto.includes("subestacao") || texto.includes("sub")) return "Projeto de Subestação";
  if (texto.includes("spda")) return "Projeto de SPDA";
  if (texto.includes("cabeamento") || texto.includes("prj-cab")) return "Cabeamento";
  if (texto.includes("cftv")) return "CFTV";
  if (texto.includes("logica")) return "Projeto de Lógica Estruturada";
  return "Outros";
}
function obterModeloPlannerSelecionado() {
  return localizarModeloPlanner(plannerEls.projeto?.value, plannerEls.tipo?.value, plannerModelos);
}
function mostrarMensagemPlanner(texto, tipo = "error") {
  if (!plannerEls.formMessage) return;
  plannerEls.formMessage.textContent = texto || "";
  plannerEls.formMessage.dataset.type = texto ? tipo : "";
  if (texto && tipo === "error") plannerEls.formMessage.focus();
}

function atualizarNomeTarefaPlanner() {
  const modelo = obterModeloPlannerSelecionado();
  if (modelo && plannerEls.nomeTarefa && !plannerEls.nomeTarefa.dataset.editado) plannerEls.nomeTarefa.value = `${modelo.projeto} — ${modelo.tipo}`;
}

function inicializarPlanner() {
  if (!plannerEls.form) return;
  preencherSelect(plannerEls.statusTarefa, plannerStatusLista);
  preencherSelect(plannerEls.prioridade, plannerPrioridades);
  preencherSelect(plannerEls.detalheStatus, plannerStatusLista);
  preencherSelect(plannerEls.detalhePrioridade, plannerPrioridades);
  preencherSelect(plannerEls.detalheBucket, plannerBuckets);
  preencherFiltroPlanner(plannerEls.filtroStatus, plannerStatusLista, "Todos");
  preencherFiltroPlanner(plannerEls.filtroPrioridade, plannerPrioridades, "Todas");
  plannerEls.btnNovo?.addEventListener("click", (event) => abrirPlannerModal("", event.currentTarget));
  plannerEls.viewQuadro?.addEventListener("click", () => alterarVisualizacaoPlanner("quadro"));
  plannerEls.viewGantt?.addEventListener("click", () => alterarVisualizacaoPlanner("gantt"));
  plannerEls.btnFechar?.addEventListener("click", fecharPlannerModal);
  plannerEls.btnCancelar?.addEventListener("click", fecharPlannerModal);
  plannerEls.btnFecharDetalhes?.addEventListener("click", fecharDetalhesPlanner);
  plannerEls.btnExcluir?.addEventListener("click", excluirPlannerAtual);
  plannerEls.modal?.addEventListener("click", (event) => { if (event.target === plannerEls.modal) fecharPlannerModal(); });
  plannerEls.detalheModal?.addEventListener("click", (event) => { if (event.target === plannerEls.detalheModal) fecharDetalhesPlanner(); });
  plannerEls.projeto?.addEventListener("change", atualizarTiposPlanner);
  plannerEls.tipo?.addEventListener("change", atualizarNomeTarefaPlanner);
  plannerEls.nomeTarefa?.addEventListener("input", () => { plannerEls.nomeTarefa.dataset.editado = "true"; });
  [plannerEls.busca, plannerEls.filtroStatus, plannerEls.filtroPrioridade, plannerEls.filtroResponsavel, plannerEls.filtroPrazo, plannerEls.agrupar].forEach((el) => el?.addEventListener(el === plannerEls.busca ? "input" : "change", renderizarPlanner));
  plannerEls.board?.addEventListener("click", manipularCliqueBoardPlanner);
  plannerEls.board?.addEventListener("keydown", manipularTecladoBoardPlanner);
  plannerEls.board?.addEventListener("dragstart", iniciarArrastoPlanner);
  plannerEls.board?.addEventListener("dragend", finalizarArrastoPlanner);
  plannerEls.board?.addEventListener("dragover", permitirSoltarPlanner);
  plannerEls.board?.addEventListener("dragleave", sairDestinoPlanner);
  plannerEls.board?.addEventListener("drop", soltarPlanner);
  plannerEls.detalheChecklist?.addEventListener("click", manipularDetalhePlanner);
  plannerEls.itemForm?.addEventListener("submit", salvarDetalhesItemPlanner);
  document.getElementById("btnFecharPlannerItem")?.addEventListener("click", fecharDetalhesItemPlanner);
  document.getElementById("btnFecharPlannerGanttActivities")?.addEventListener("click", fecharAtividadesVinculadasGantt);
  plannerEls.ganttActivitiesModal?.addEventListener("click", (event) => { if (event.target === plannerEls.ganttActivitiesModal) fecharAtividadesVinculadasGantt(); });
  document.getElementById("btnCancelarPlannerItem")?.addEventListener("click", fecharDetalhesItemPlanner);
  document.getElementById("btnLimparPlannerItem")?.addEventListener("click", limparAgendamentoItemPlanner);
  document.getElementById("btnPlannerItemConclusao")?.addEventListener("click", async () => { const achado = localizarItemPlanner(document.getElementById("plannerItemChecklistId").value, document.getElementById("plannerItemId").value); if (achado) await atualizarItensPlannerEmLote([String(achado.item.id)], !achado.item.concluido, achado.checklist.id, true); abrirDetalhesItemPlanner(achado.checklist.id, achado.item.id); });
  habilitarMovimentoPlannerItem();
  plannerEls.form.addEventListener("submit", salvarChecklistPlanner);
  plannerEls.detalheForm?.addEventListener("submit", salvarDetalhesPlanner);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!plannerEls.ganttActivitiesModal?.hidden) fecharAtividadesVinculadasGantt();
    else if (!plannerEls.itemModal?.hidden) fecharDetalhesItemPlanner();
    else if (!plannerEls.detalheModal?.hidden) fecharDetalhesPlanner();
    else if (!plannerEls.modal?.hidden) fecharPlannerModal();
  });
}
function alterarVisualizacaoPlanner(modo) {
  plannerViewMode = modo === "gantt" ? "gantt" : "quadro";
  plannerEls.viewQuadro?.classList.toggle("active", plannerViewMode === "quadro");
  plannerEls.viewGantt?.classList.toggle("active", plannerViewMode === "gantt");
  plannerEls.viewQuadro?.setAttribute("aria-pressed", String(plannerViewMode === "quadro"));
  plannerEls.viewGantt?.setAttribute("aria-pressed", String(plannerViewMode === "gantt"));
  if (plannerEls.agrupar) {
    const noGantt = plannerViewMode === "gantt";
    plannerEls.agrupar.disabled = noGantt;
    plannerEls.agrupar.closest("label")?.toggleAttribute("hidden", noGantt);
  }
  renderizarPlanner();
}
function habilitarMovimentoPlannerItem() {
  const card = plannerEls.itemModal?.querySelector(".planner-item-card");
  const handle = card?.querySelector(".planner-item-header");
  if (!card || !handle) return;

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.matchMedia("(max-width: 600px)").matches) return;
    const inicio = card.getBoundingClientRect();
    const estilos = getComputedStyle(card);
    const deslocamentoX = Number.parseFloat(estilos.getPropertyValue("--planner-item-x")) || 0;
    const deslocamentoY = Number.parseFloat(estilos.getPropertyValue("--planner-item-y")) || 0;
    const origemX = event.clientX;
    const origemY = event.clientY;
    card.classList.add("is-moving");
    handle.setPointerCapture(event.pointerId);

    const mover = (moveEvent) => {
      const limiteX = Math.max(0, window.innerWidth - card.offsetWidth);
      const limiteY = Math.max(0, window.innerHeight - card.offsetHeight);
      const esquerda = Math.min(limiteX, Math.max(0, inicio.left + moveEvent.clientX - origemX));
      const topo = Math.min(limiteY, Math.max(0, inicio.top + moveEvent.clientY - origemY));
      card.style.setProperty("--planner-item-x", `${deslocamentoX + esquerda - inicio.left}px`);
      card.style.setProperty("--planner-item-y", `${deslocamentoY + topo - inicio.top}px`);
    };
    const parar = () => {
      card.classList.remove("is-moving");
      handle.removeEventListener("pointermove", mover);
      handle.removeEventListener("pointerup", parar);
      handle.removeEventListener("pointercancel", parar);
    };

    handle.addEventListener("pointermove", mover);
    handle.addEventListener("pointerup", parar);
    handle.addEventListener("pointercancel", parar);
  });
}
function preencherFiltroPlanner(select, valores, rotulo) {
  if (!select) return;
  select.innerHTML = `<option value="">${rotulo}</option>${opcoesUnicasPlanner(valores).map((valor) => `<option value="${escapeHtml(valor)}">${escapeHtml(valor)}</option>`).join("")}`;
}
function listarResponsaveisPlanner(valor) {
  if (Array.isArray(valor)) return valor.filter((nome) => plannerResponsaveis.includes(nome));
  const texto = String(valor || "").trim();
  if (!texto) return [];
  try { const parsed = JSON.parse(texto); if (Array.isArray(parsed)) return parsed.filter((nome) => plannerResponsaveis.includes(nome)); } catch (_) { /* Compatibilidade com tarefas antigas. */ }
  return texto.split(/\s*(?:\||·|,|;)\s*/).filter((nome) => plannerResponsaveis.includes(nome));
}
function responsaveisSelecionadosPlanner(select) { return [...(select?.selectedOptions || [])].map((option) => option.value).filter(Boolean); }
function selecionarResponsaveisPlanner(select, valor) { const selecionados = new Set(listarResponsaveisPlanner(valor)); [...(select?.options || [])].forEach((option) => { option.selected = selecionados.has(option.value); }); }
function nomesResponsaveisPlanner(checklist) { return listarResponsaveisPlanner(checklist?.responsaveis?.length ? checklist.responsaveis : checklist?.responsavel); }
async function carregarPlanner() {
  if (!plannerEls.board) return;
  try {
    carregandoPlanner = true; renderizarPlanner();
    const data = await fetch(API_PLANNER_URL).then(validarResposta);
    plannerModelos = Array.isArray(data.modelos) && data.modelos.length ? data.modelos : PLANNER_MODELOS;
    plannerChecklists = Array.isArray(data.checklists) ? data.checklists : [];
    atualizarProjetosPlanner(); atualizarFiltrosPlanner();
  } catch (erro) {
    plannerEls.status.textContent = `Não foi possível carregar o Planner: ${erro.message}`;
    plannerModelos = PLANNER_MODELOS; plannerChecklists = [];
    atualizarProjetosPlanner(); atualizarFiltrosPlanner();
  } finally { carregandoPlanner = false; renderizarPlanner(); }
}

function atualizarProjetosPlanner() {
  const source = plannerModelos.length ? plannerModelos.map((m) => m.projeto) : plannerProjetosDisponiveis;
  preencherSelect(plannerEls.projeto, opcoesUnicasPlanner(source)); atualizarTiposPlanner();
}

function atualizarTiposPlanner() {
  const projeto = normalizarProjetoPlanner(plannerEls.projeto?.value);
  const source = plannerModelos.filter((m) => normalizarProjetoPlanner(m.projeto) === projeto).map((m) => m.tipo);
  preencherSelect(plannerEls.tipo, opcoesUnicasPlanner(source)); plannerEls.tipo.disabled = !source.length; atualizarNomeTarefaPlanner();
}

function atualizarFiltrosPlanner() {
  const atual = plannerEls.filtroResponsavel?.value || "";
  preencherFiltroPlanner(plannerEls.filtroResponsavel, plannerChecklists.flatMap(nomesResponsaveisPlanner), "Todos");
  if (plannerEls.filtroResponsavel) plannerEls.filtroResponsavel.value = atual;
  const buckets = opcoesUnicasPlanner([...plannerBuckets, ...plannerChecklists.map((item) => item.bucket).filter(Boolean)]);
  preencherSelect(plannerEls.detalheBucket, buckets);
}
function projetoDoBucket(bucket) {
  return plannerModelos.find((modelo) => obterBucketDoProjeto(modelo.projeto, modelo.codigoProjeto) === bucket)?.projeto || "";
}
function abrirPlannerModal(bucket = "", gatilho = document.activeElement) {
  if (!usuarioAtualEhAdmin()) return;
  plannerFocoAnterior = gatilho;
  plannerEls.form.reset(); plannerEls.nomeTarefa.dataset.editado = ""; plannerEls.id.value = ""; plannerEls.btnSalvar.textContent = "Criar tarefa";
  atualizarProjetosPlanner();
  const projeto = projetoDoBucket(bucket);
  if (projeto) { plannerEls.projeto.value = projeto; atualizarTiposPlanner(); }
  plannerEls.statusTarefa.value = "Não iniciado"; plannerEls.prioridade.value = "P1"; plannerEls.modal.hidden = false; mostrarMensagemPlanner(""); plannerEls.obra.focus();
}

function fecharPlannerModal() { plannerEls.modal.hidden = true; plannerFocoAnterior?.focus?.(); }
function fecharDetalhesPlanner() { plannerEls.detalheModal.hidden = true; plannerDetalheAtualId = null; plannerFocoAnterior?.focus?.(); }

async function salvarChecklistPlanner(event) {
  event.preventDefault();
  if (!plannerEls.obra.value.trim()) return mostrarMensagemPlanner("Informe o nome da obra.");
  if (!plannerEls.projeto.value) return mostrarMensagemPlanner("Selecione um Projeto.");
  if (!plannerEls.tipo.value) return mostrarMensagemPlanner("Selecione um Tipo.");
  const responsaveis = responsaveisSelecionadosPlanner(plannerEls.responsavel);
  if (!responsaveis.length) return mostrarMensagemPlanner("Selecione pelo menos uma pessoa responsável do setor.");
  const modelo = obterModeloPlannerSelecionado();
  if (!modelo) return mostrarMensagemPlanner("Não existe modelo para o Projeto e Tipo selecionados.");
  const payload = { obra: plannerEls.obra.value.trim(), obraId: plannerEls.obraId.value, projeto: modelo.projeto.trim(), tipo: modelo.tipo.trim(), status: plannerEls.statusTarefa.value, prioridade: plannerEls.prioridade.value, dataInicio: plannerEls.dataInicio.value, dataConclusao: plannerEls.dataConclusao.value, bucket: obterBucketDoProjeto(modelo.projeto, modelo.codigoProjeto), responsaveis, anotacoes: plannerEls.anotacoes.value.trim() };
  const nome = plannerEls.nomeTarefa.value.trim(); if (nome) payload.nomeTarefa = nome;
  try {
    plannerEls.btnSalvar.disabled = true;
    const salvo = await fetch(API_PLANNER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(validarResposta);
    plannerChecklists.unshift(salvo); fecharPlannerModal(); atualizarFiltrosPlanner(); renderizarPlanner(); abrirDetalhesPlanner(salvo.id);
  } catch (erro) { mostrarMensagemPlanner(`Não foi possível criar a tarefa: ${erro.message}`); }
  finally { plannerEls.btnSalvar.disabled = false; }
}
function criarModalPlannerAutomatico(titulo, conteudo, botoes) {
  const focoAnterior = document.activeElement;
  const modal = document.createElement("div"); modal.className = "planner-modal planner-auto-modal";
  const configuracaoInicial = titulo === "Configurar Planner do Projeto";
  const confirmacaoConclusao = titulo === "A atividade foi finalizada";
  if (configuracaoInicial) modal.classList.add("planner-auto-setup-modal");
  if (confirmacaoConclusao) modal.classList.add("planner-auto-completion-modal");
  modal.innerHTML = `<div class="planner-modal-card${configuracaoInicial ? " planner-auto-setup-card" : ""}${confirmacaoConclusao ? " planner-auto-completion-card" : ""}" role="dialog" aria-modal="true" aria-labelledby="plannerAutoTitle"><header class="planner-auto-setup-header"><div><h2 id="plannerAutoTitle">${escapeHtml(titulo)}</h2></div><button type="button" class="planner-modal-close" data-auto-close aria-label="Fechar">&times;</button></header><div class="planner-auto-content${configuracaoInicial ? " planner-auto-setup-body" : ""}${confirmacaoConclusao ? " planner-auto-completion-body" : ""}">${conteudo}</div><footer class="form-actions planner-auto-setup-footer">${botoes.map((b, i) => `<button type="button" class="${i ? "secondary" : "primary"}" data-auto-action="${escapeHtml(b.valor)}">${escapeHtml(b.texto)}</button>`).join("")}</footer></div>`;
  document.body.appendChild(modal);
  const atualizarSelecao = () => {
    const itens = [...modal.querySelectorAll("[data-auto-item]")];
    modal.querySelector("[data-planner-global-count]")?.replaceChildren(document.createTextNode(`${itens.filter((item) => item.checked).length} itens selecionados`));
    modal.querySelectorAll("[data-planner-phase]").forEach((fase) => {
      const checkboxes = [...fase.querySelectorAll("[data-auto-item]")]; const selecionados = checkboxes.filter((item) => item.checked).length;
      const todos = fase.querySelector("[data-phase-select-all]");
      if (todos) { todos.checked = Boolean(checkboxes.length) && selecionados === checkboxes.length; todos.indeterminate = selecionados > 0 && selecionados < checkboxes.length; }
      fase.querySelector("[data-phase-count]")?.replaceChildren(document.createTextNode(`${selecionados}/${checkboxes.length}`));
    });
  };
  const atualizarModo = () => { const personalizado = modal.querySelector('[name="plannerAutoModo"]:checked')?.value === "personalizado"; const painel = modal.querySelector("[data-planner-custom]"); if (painel) painel.hidden = !personalizado; const validacao = modal.querySelector("[data-planner-validation]"); if (validacao) validacao.textContent = ""; };
  modal.addEventListener("change", (e) => {
    if (e.target.matches('[name="plannerAutoModo"]')) atualizarModo();
    if (e.target.matches("[data-phase-select-all]")) { e.target.closest("[data-planner-phase]").querySelectorAll("[data-auto-item]").forEach((item) => { item.checked = e.target.checked; }); atualizarSelecao(); }
    if (e.target.matches("[data-auto-item]")) atualizarSelecao();
  });
  modal.addEventListener("click", (e) => {
    const global = e.target.closest("[data-planner-select-all], [data-planner-clear-all]"); if (!global) return;
    const marcar = global.hasAttribute("data-planner-select-all"); modal.querySelectorAll("[data-auto-item]").forEach((item) => { item.checked = marcar; }); atualizarSelecao();
  });
  atualizarModo(); atualizarSelecao();
  return new Promise((resolve) => { const fechar = (valor) => { const dados = { acao: valor, tipo: modal.querySelector("#plannerAutoTipo")?.value || "", modo: modal.querySelector('[name="plannerAutoModo"]:checked')?.value || "dinamico", candidato: modal.querySelector('[name="plannerCandidato"]:checked')?.value || "", itemIds: [...modal.querySelectorAll("[data-concluir-item]:checked")].map((el) => el.value), selecao: [] }; modal.querySelectorAll("[data-auto-item]:checked").forEach((el) => { let grupo = dados.selecao.find((g) => g.etapa === el.dataset.fase); if (!grupo) { grupo = { etapa: el.dataset.fase, estagios: [] }; dados.selecao.push(grupo); } grupo.estagios.push(el.value); }); modal.remove(); document.removeEventListener("keydown", teclado); focoAnterior?.focus?.(); resolve(dados); }; const tentarFechar = (valor) => { if (valor === "salvar" && modal.querySelector('[name="plannerAutoModo"]:checked')?.value === "personalizado" && !modal.querySelector("[data-auto-item]:checked")) { const erro = modal.querySelector("[data-planner-validation]"); erro.textContent = "Selecione pelo menos um item para criar o Planner personalizado."; erro.focus(); return; } fechar(valor); }; const teclado = (e) => { if (e.key === "Escape") fechar(""); }; document.addEventListener("keydown", teclado); modal.addEventListener("click", (e) => { const acao = e.target.closest("[data-auto-action]"); if (acao) tentarFechar(acao.dataset.autoAction); else if (e.target === modal || e.target.closest("[data-auto-close]")) fechar(""); }); (modal.querySelector("#plannerAutoTipo") || modal.querySelector("button[data-auto-action]"))?.focus(); });
}
async function configurarPlannerAutomatico(sync, atividade) {
  const tipos = plannerTiposDisponiveis.map((tipo) => `<option value="${escapeHtml(tipo)}">${escapeHtml(tipo)}</option>`).join("");
  const taxonomiaProjeto = taxonomiaPlannerCompleta(atividade.projeto);
  const modo = await criarModalPlannerAutomatico("Configurar Planner do Projeto", `<div class="planner-setup-project-meta"><strong>${escapeHtml(atividade.obra)}</strong><span aria-hidden="true">·</span><span>${escapeHtml(atividade.projeto)}</span></div><div class="planner-setup-field"><label for="plannerAutoTipo">Tipo da edificação</label><select id="plannerAutoTipo"><option value="">Tipo não definido</option>${tipos}</select></div><fieldset class="planner-setup-modes"><legend>Como deseja criar o Planner?</legend><div class="planner-setup-mode-grid"><label class="planner-setup-mode-card"><input type="radio" name="plannerAutoModo" value="dinamico" checked><span><strong>Dinâmico</strong><b>Adicionar conforme trabalhar</b><small>O Planner será preenchido automaticamente conforme novas atividades forem registradas.</small></span></label><label class="planner-setup-mode-card"><input type="radio" name="plannerAutoModo" value="completo"><span><strong>Modelo completo</strong><b>Criar estrutura completa</b><small>Cria todas as Fases e Itens padronizados para este tipo de Projeto.</small></span></label><label class="planner-setup-mode-card"><input type="radio" name="plannerAutoModo" value="personalizado"><span><strong>Personalizado</strong><b>Escolher Fases e Itens</b><small>Permite selecionar manualmente quais partes do Projeto farão parte do Planner.</small></span></label></div></fieldset><section class="planner-setup-custom" data-planner-custom hidden><div class="planner-setup-custom-header"><div><h3>Personalizar estrutura</h3><p>Selecione as Fases e Itens que fazem parte deste projeto.</p></div><strong data-planner-global-count aria-live="polite">0 itens selecionados</strong></div><div class="planner-setup-custom-toolbar"><button type="button" class="secondary" data-planner-select-all>Selecionar tudo</button><button type="button" class="secondary" data-planner-clear-all>Limpar seleção</button></div><p class="planner-setup-validation" data-planner-validation role="alert" tabindex="-1"></p><div class="planner-setup-phase-grid">${taxonomiaProjeto.map((g, gi) => `<section class="planner-setup-phase-card" data-planner-phase><header class="planner-setup-phase-header"><h4>${escapeHtml(g.etapa)}</h4><span data-phase-count>0/${g.estagios.length}</span></header><label class="planner-setup-select-all"><input type="checkbox" data-phase-select-all><span>Selecionar todos</span></label><div class="planner-setup-items">${g.estagios.map((item, ii) => `<label class="planner-setup-item"><input type="checkbox" data-auto-item data-fase="${escapeHtml(g.etapa)}" value="${escapeHtml(item)}" id="auto-${gi}-${ii}"><span>${escapeHtml(item)}</span></label>`).join("")}</div></section>`).join("")}</div></section>`, [{ texto: "Salvar configuração", valor: "salvar" }, { texto: "Agora não", valor: "" }]);
  if (modo.acao !== "salvar") return;
  try {
    await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "configurarAutomatico", checklistId: sync.checklistId, modo: modo.modo, tipo: modo.tipo, selecao: modo.selecao }) }).then(validarResposta);
    await abrirPlannerPorId(sync.checklistId);
  } catch (erro) { console.error("Falha ao configurar Planner:", erro); alert("Atividade salva, mas não foi possível concluir a configuração do Planner."); }
}
async function escolherPlannerAmbiguo(atividade, sync) {
  const conteudo = `<p>Escolha o Planner desta atividade:</p>${sync.candidatos.map((c, i) => `<label><input type="radio" name="plannerCandidato" value="${escapeHtml(c.id)}" ${i === 0 ? "checked" : ""}> ${escapeHtml(c.nomeTarefa || "Projeto Elétrico BT")} — ${escapeHtml(c.tipo || "Tipo não definido")}</label>`).join("")}`;
  const acao = await criarModalPlannerAutomatico("Escolha o Planner desta atividade", conteudo, sync.candidatos.map((c) => ({ texto: c.nomeTarefa || c.tipo || "Selecionar", valor: c.id })).concat({ texto: "Cancelar", valor: "" }));
  if (acao.acao) await repetirSincronizacaoPlanner(atividade.id, acao.acao || acao.candidato);
}
async function repetirSincronizacaoPlanner(id, checklistId = "") {
  try { const resposta = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "sincronizarPlanner", id, checklistId }) }).then(validarResposta); await tratarResultadoPlanner(resposta); }
  catch (erro) { console.error("Falha ao sincronizar Planner:", erro); alert("Não foi possível atualizar o Planner."); }
}
async function confirmarConclusaoPlanner(atividade, sync) {
  if (normalizarTexto(atividade.status) !== "finalizado" || !sync.itens?.length) return;
  const selecionado = await criarModalPlannerAutomatico("A atividade foi finalizada", `<p>Deseja também concluir no Planner?</p><div class="planner-completion-list">${sync.itens.map((item, i) => `<label class="planner-completion-item"><input type="checkbox" data-concluir-item value="${escapeHtml(item.id)}" ${i < 2 ? "checked" : ""}><span><strong>${escapeHtml(item.fase)}</strong><small>${escapeHtml(item.item)}</small></span></label>`).join("")}</div>`, [{ texto: "Concluir selecionados", valor: "concluir" }, { texto: "Não alterar Planner", valor: "" }]);
  if (selecionado.acao !== "concluir" || !selecionado.itemIds.length) return;
  await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "alterarConclusaoItens", checklistId: sync.checklistId, itemIds: selecionado.itemIds, concluido: true }) }).then(validarResposta);
}
async function tratarResultadoPlanner(atividade) {
  const sync = atividade?.plannerSync; if (!sync || sync.status === "ignorado") return;
  if (sync.status === "erro") { console.error("Sincronização do Planner falhou."); if (confirm("Atividade salva. Não foi possível atualizar o Planner. Tentar novamente?")) await repetirSincronizacaoPlanner(atividade.id); return; }
  if (sync.status === "ambigua") return escolherPlannerAmbiguo(atividade, sync);
  if (sync.status !== "sincronizado") return;
  if (sync.precisaConfigurar) await configurarPlannerAutomatico(sync, atividade);
  else { plannerEls.status.innerHTML = `✓ Planner atualizado: ${escapeHtml(sync.itens?.map((i) => `${i.fase} → ${i.item}`).join(", ") || "atividade vinculada")}. <button type="button" class="link-button" onclick="abrirPlannerPorId('${escapeHtml(sync.checklistId)}')">Abrir Planner</button>`; }
  await carregarPlanner();
  await confirmarConclusaoPlanner(atividade, sync);
}
async function abrirPlannerPorId(checklistId) {
  alternarAba("planner");
  if (!plannerChecklists.some((item) => String(item.id) === String(checklistId))) await carregarPlanner();
  requestAnimationFrame(() => { const card = document.querySelector(`[data-planner-id="${CSS.escape(String(checklistId))}"]`); if (!card) return; card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.add("planner-card-highlight"); setTimeout(() => card.classList.remove("planner-card-highlight"), 2200); });
}
function calcularProgressoPlanner(checklist) { const itens = checklist.itens || []; const total = itens.length; const concluidos = itens.filter((item) => item.concluido).length; return { total, concluidos, percentual: total ? Math.round((concluidos / total) * 100) : 0 }; }
function agruparItensPlannerPorEtapa(itens = []) { const groups = new Map(); itens.forEach((item) => { const etapa = item.etapa || "Outros"; if (!groups.has(etapa)) groups.set(etapa, []); groups.get(etapa).push(item); }); return [...groups.entries()].map(([etapa, items]) => ({ etapa, itens: items })); }
function checklistsPlannerFiltrados() {
  const busca = normalizarOpcaoPlanner(plannerEls.busca?.value);
  return plannerChecklists.reduce((resultado, checklist) => {
    const itens = checklist.itens || [];
    const textoChecklist = [checklist.obraCodigo, checklist.obra, checklist.nomeTarefa, checklist.projeto, checklist.tipo, checklist.responsavel, checklist.codigoProjeto].join(" ");
    const correspondeChecklist = !busca || normalizarOpcaoPlanner(textoChecklist).includes(busca);
    const itensCorrespondentes = correspondeChecklist ? itens : itens.filter((item) => normalizarOpcaoPlanner([item.etapa, item.estagio, item.atividade, item.texto, item.responsavel, item.observacoes].join(" ")).includes(busca));
    const filtrosChecklist = (!plannerEls.filtroStatus?.value || checklist.status === plannerEls.filtroStatus.value) && (!plannerEls.filtroPrioridade?.value || checklist.prioridade === plannerEls.filtroPrioridade.value) && (!plannerEls.filtroResponsavel?.value || nomesResponsaveisPlanner(checklist).includes(plannerEls.filtroResponsavel.value));
    const prazo = !plannerEls.filtroPrazo?.value || itensCorrespondentes.some((item) => { const estado = obterSituacaoPrazoItemPlanner(item); return plannerEls.filtroPrazo.value === "agendados" ? estado !== "sem-prazo" : estado === plannerEls.filtroPrazo.value; });
    if (filtrosChecklist && prazo && (correspondeChecklist || itensCorrespondentes.length)) resultado.push(itensCorrespondentes === itens ? checklist : { ...checklist, itens: itensCorrespondentes });
    return resultado;
  }, []);
}
function gruposPlanner(checklists) {
  const agrupamento = plannerEls.agrupar?.value || "bucket";
  let nomes;
  if (agrupamento === "status") nomes = plannerStatusLista;
  else if (agrupamento === "prioridade") nomes = plannerPrioridades;
  else nomes = opcoesUnicasPlanner([...plannerBuckets, ...plannerChecklists.map((item) => item.bucket || obterBucketDoProjeto(item.projeto, item.codigoProjeto))]);
  return nomes.map((nome) => ({ nome, itens: checklists.filter((item) => (agrupamento === "bucket" ? item.bucket || obterBucketDoProjeto(item.projeto, item.codigoProjeto) : item[agrupamento]) === nome) }));
}
function renderizarPlanner() {
  if (!plannerEls.board) return;
  plannerEls.board.hidden = plannerViewMode !== "quadro";
  if (plannerEls.gantt) plannerEls.gantt.hidden = plannerViewMode !== "gantt";
  if (carregandoPlanner) { plannerEls.status.textContent = "Carregando modelos e tarefas salvas..."; plannerEls.board.innerHTML = ""; if (plannerEls.gantt) plannerEls.gantt.innerHTML = ""; return; }
  plannerEls.status.textContent = plannerModelos.length ? `${plannerModelos.length} combinação(ões) Projeto + Tipo disponíveis.` : "Nenhum modelo foi retornado pela API.";
  const filtrados = checklistsPlannerFiltrados();
  if (plannerViewMode === "gantt") { renderizarPlannerGantt(filtrados); return; }
  if (!filtrados.length && plannerChecklists.length) { plannerEls.board.innerHTML = '<div class="planner-empty">Nenhuma tarefa corresponde à busca e aos filtros.</div>'; return; }
  plannerEls.board.innerHTML = gruposPlanner(filtrados).map(criarBucketPlanner).join("");
}
function intervaloVisivelPlannerGantt(global) {
  if (plannerGanttEscala === "tudo") return global;
  const referencia = new Date(`${plannerGanttReferencia || global.fim}T12:00:00`), inicio = new Date(referencia), fim = new Date(referencia);
  if (plannerGanttEscala === "semana") { inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7)); fim.setTime(inicio.getTime()); fim.setDate(fim.getDate() + 6); }
  else { inicio.setDate(1); fim.setMonth(fim.getMonth() + 1, 0); }
  return { inicio: PLANNER_GANTT.dataCivilIso(inicio), fim: PLANNER_GANTT.dataCivilIso(fim) };
}
function rotuloDataGantt(iso) { return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function gruposSemanasPlannerGantt(dias) {
  return dias.reduce((grupos, iso, indice) => {
    const semana = obterNumeroSemanaAno(new Date(`${iso}T12:00:00`)), anterior = grupos.at(-1);
    if (anterior?.semana === semana) anterior.quantidade += 1;
    else grupos.push({ semana, inicio: indice + 1, quantidade: 1 });
    return grupos;
  }, []);
}
function cabecalhoPlannerGantt(dias) { return dias.map((iso) => { const d = new Date(`${iso}T12:00:00`), fimSemana = d.getDay() === 0 || d.getDay() === 6, inicioSemana = d.getDay() === 1; return `<div class="planner-gantt-day ${fimSemana ? "weekend" : ""} ${inicioSemana ? "planner-gantt-week-boundary" : ""}" title="${rotuloDataGantt(iso)}"><strong>${String(d.getDate()).padStart(2, "0")}</strong><small>${d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</small></div>`; }).join(""); }
function cabecalhoSemanasPlannerGantt(dias) { return gruposSemanasPlannerGantt(dias).map((grupo) => `<div class="planner-gantt-week-header" style="grid-column:${grupo.inicio} / span ${grupo.quantidade}">SEM ${grupo.semana}</div>`).join(""); }
function divisoriasSemanasPlannerGantt(dias) { return dias.map((iso, indice) => new Date(`${iso}T12:00:00`).getDay() === 1 && indice ? `<span class="planner-gantt-week-divider" style="grid-column:${indice + 1}"></span>` : "").join(""); }
function formatarHorasCompactasPlanner(minutos) { return formatarMinutosPlanner(minutos).toLowerCase().replace(/\s+/g, ""); }
function tooltipHorasPlannerGantt(no) { const m = no.metricas; return `No período: ${formatarHorasCompactasPlanner(m.minutosNoPeriodo)}\nAcumulado: ${formatarHorasCompactasPlanner(m.minutosAcumulados)}\nDias ativos: ${m.diasAtivos}`; }
function tooltipOperacionalGantt(no, segmento) { return [no.nome, rotuloDataGantt(segmento.data), `${formatarMinutosPlanner(segmento.minutos)} registradas`, `${segmento.itens?.length || (no.tipo === "item" ? 1 : 0)} itens movimentados`, `${segmento.colaboradores.length} colaboradores`, segmento.itens?.length ? `Itens: ${segmento.itens.map((i) => i.nome).join(" · ")}` : ""].filter(Boolean).join("\n"); }
function conteudoNoGantt(no, intervalo, dias) {
  const janela = plannerGanttMostrarJanela && no.tipo !== "item" && no.metricas.primeiraMovimentacao ? (() => { const ini=Math.max(1,PLANNER_GANTT.diferencaDias(intervalo.inicio,no.metricas.primeiraMovimentacao)+1), fim=Math.min(dias.length,PLANNER_GANTT.diferencaDias(intervalo.inicio,no.metricas.ultimaMovimentacao)+1); return fim>=ini?`<span class="planner-gantt-window" style="grid-column:${ini} / span ${fim-ini+1}"></span>`:""; })() : "";
  return divisoriasSemanasPlannerGantt(dias) + janela + no.segmentosPeriodo.map((segmento) => { const ini=Math.max(1,PLANNER_GANTT.diferencaDias(intervalo.inicio,segmento.data)+1), fim=Math.min(dias.length,PLANNER_GANTT.diferencaDias(intervalo.inicio,segmento.dataFim)+1); if(fim<ini||fim<1||ini>dias.length)return ""; const nivel=segmento.minutos<=240?1:segmento.minutos<=480?2:segmento.minutos<=960?3:4, tooltip=tooltipOperacionalGantt(no,segmento); return `<span class="planner-gantt-bar planner-gantt-bar--${no.tipo} planner-gantt-segment intensity-${nivel} ${no.tipo!=="item"?"aggregate":""}" style="grid-column:${ini} / span ${fim-ini+1}" title="${escapeHtml(tooltip)}"></span>`; }).join("");;
}
function linhaPlannerGantt(no, intervalo, dias) {
  const id=`${no.tipo}:${no.id}`, recolhivel=no.tipo!=="item", recolhido=plannerGanttRecolhidos.has(id), tipoCss=no.tipo==="projeto"?"project":no.tipo==="fase"?"phase":no.tipo;
  const nome=`<button type="button" class="planner-gantt-process-button" data-gantt-node="${escapeHtml(id)}" aria-label="Ver atividades vinculadas a ${escapeHtml(no.nome)}">${escapeHtml(`${no.tipo==="item"&&no.concluido?"✓ ":""}${no.nome}`)}</button>`;
  return `<div class="planner-gantt-row planner-gantt-row--${no.tipo} planner-gantt-${tipoCss}"><div class="planner-gantt-label"><div class="planner-gantt-process-column">${recolhivel?`<button type="button" class="planner-gantt-toggle" data-gantt-toggle="${escapeHtml(id)}" aria-label="${recolhido?"Expandir":"Recolher"} ${escapeHtml(no.nome)}" aria-expanded="${!recolhido}">${recolhido?"▸":"▾"}</button>`:"<span class=\"planner-gantt-toggle-spacer\"></span>"}${nome}</div><span class="planner-gantt-hours-column" tabindex="0" title="${escapeHtml(tooltipHorasPlannerGantt(no))}">${formatarHorasCompactasPlanner(no.metricas.minutosNoPeriodo)}</span></div><div class="planner-gantt-timeline" style="--gantt-days:${dias.length}">${conteudoNoGantt(no,intervalo,dias)}</div></div>`;
}
function filtrosAtividadePlannerGantt() {
  const statusMap = { "Concluído": "Finalizado", "Em andamento": "Em progresso", "Atrasado": "Atrasado", "Pausado": "Pausado", "Não iniciado": "__sem_atividade__" };
  return { responsavel: plannerEls.filtroResponsavel?.value || "", status: statusMap[plannerEls.filtroStatus?.value] || "", prioridade: plannerEls.filtroPrioridade?.value || "" };
}
function registrarContextoNosGantt(estrutura) {
  plannerGanttNosAtuais = new Map();
  estrutura.forEach((obra) => { obra.contexto = "Obra"; plannerGanttNosAtuais.set(`obra:${obra.id}`, obra); obra.projetos.forEach((projeto) => { projeto.contexto = `Projeto · ${obra.nome}`; plannerGanttNosAtuais.set(`projeto:${projeto.id}`, projeto); projeto.fases.forEach((fase) => { fase.contexto = `Fase · ${projeto.nome} · ${obra.nome}`; plannerGanttNosAtuais.set(`fase:${fase.id}`, fase); fase.itens.forEach((item) => { item.contexto = `Item · ${fase.nome} · ${projeto.nome}`; plannerGanttNosAtuais.set(`item:${item.id}`, item); }); }); }); });
}
function fecharAtividadesVinculadasGantt() { if (!plannerEls.ganttActivitiesModal) return; plannerEls.ganttActivitiesModal.hidden = true; plannerGanttAtividadesFocoAnterior?.focus?.(); }
function abrirAtividadesVinculadasGantt(no, gatilho) {
  if (!no || !plannerEls.ganttActivitiesModal) return;
  plannerGanttAtividadesFocoAnterior = gatilho;
  const lista = PLANNER_GANTT.obterAtividadesDoNivelGantt({ node: no, periodo: plannerGanttPeriodoAtual, filtros: filtrosAtividadePlannerGantt() });
  const minutos = lista.reduce((total, atividade) => total + calcularMinutosAtividadeBanco(atividade), 0);
  document.getElementById("plannerGanttActivitiesTitle").textContent = no.nome;
  document.getElementById("plannerGanttActivitiesContext").textContent = no.contexto;
  document.getElementById("plannerGanttActivitiesSummary").textContent = `${lista.length} ${lista.length === 1 ? "atividade" : "atividades"} · ${formatarMinutosPlanner(minutos)} registradas`;
  document.getElementById("plannerGanttActivitiesList").innerHTML = lista.length ? `<div class="planner-linked-table">${lista.map((a) => `<div class="planner-linked-activity-row"><time>${escapeHtml(formatarData(a.data_inicio || a.data_termino))}</time><strong>${escapeHtml(a.colaborador || a.colaborador_nome || "-")}</strong><span>${escapeHtml(a.trabalhos || a.descricao || "-")}</span><span>${formatarMinutosPlanner(calcularMinutosAtividadeBanco(a))}</span><span>${escapeHtml(a.status || "-")}</span></div>`).join("")}</div>` : '<p class="empty planner-linked-empty">Nenhuma atividade vinculada foi identificada para este elemento no período e filtros selecionados.</p>';
  plannerEls.ganttActivitiesModal.hidden = false;
  plannerEls.ganttActivitiesModal.querySelector("[role=dialog]")?.focus();
}
function renderizarPlannerGantt(checklists) {
  if (!plannerEls.gantt) return; const global=PLANNER_GANTT.obterIntervaloGlobalGantt(checklists);
  if(!global){plannerEls.gantt.innerHTML='<div class="planner-gantt-empty"><strong>Nenhuma atividade realizada encontrada para exibir no Gantt.</strong><span>O Gantt é construído exclusivamente das atividades reais vinculadas.</span></div>';return;}
  const intervalo=intervaloVisivelPlannerGantt(global), dias=PLANNER_GANTT.listarDias(intervalo.inicio,intervalo.fim), hoje=obterDataIsoLocal(new Date()), hojeVisivel=dias.includes(hoje);
  plannerGanttPeriodoAtual=intervalo;
  const estrutura=PLANNER_GANTT.construirEstruturaGantt(checklists,{ocultarSemAtividade:plannerGanttOcultarVazios,periodo:intervalo,filtrosAtividade:filtrosAtividadePlannerGantt()});
  registrarContextoNosGantt(estrutura);
  const linhas=PLANNER_GANTT.filtrarLinhasHierarquia(estrutura,{modo:plannerGanttModo,recolhidos:plannerGanttRecolhidos}).map((no)=>linhaPlannerGantt(no,intervalo,dias)).join("");
  const titulo=plannerGanttEscala==="semana"?`SEMANA ${obterNumeroSemanaAno(new Date(`${intervalo.inicio}T12:00:00`))}`:plannerGanttEscala==="mes"?new Date(`${intervalo.inicio}T12:00:00`).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}).toUpperCase():`${rotuloDataGantt(intervalo.inicio)} — ${rotuloDataGantt(intervalo.fim)}`;
  const botoesEscala=["semana","mes","tudo"].map((e)=>`<button data-gantt-scale="${e}" class="${plannerGanttEscala===e?"active":""}">${e[0].toUpperCase()+e.slice(1)}</button>`).join(""), botoesModo=["sintetico","analitico"].map((m)=>`<button data-gantt-mode="${m}" class="${plannerGanttModo===m?"active":""}">${m==="sintetico"?"Sintético":"Analítico"}</button>`).join("");
  plannerEls.gantt.innerHTML=`<div class="planner-gantt-toolbar"><div class="planner-gantt-toolbar-group planner-gantt-period"><span class="planner-gantt-toolbar-label">Período</span><div class="planner-gantt-toolbar-actions"><button data-gantt-nav="-1" aria-label="Período anterior" ${plannerGanttEscala==="tudo"?"disabled":""}>◀</button><strong>${escapeHtml(titulo)}</strong><button data-gantt-nav="1" aria-label="Próximo período" ${plannerGanttEscala==="tudo"?"disabled":""}>▶</button><button data-gantt-today>Hoje</button></div></div><div class="planner-gantt-toolbar-group"><span class="planner-gantt-toolbar-label">Escala</span><div class="planner-gantt-segmented">${botoesEscala}</div></div><div class="planner-gantt-toolbar-group"><span class="planner-gantt-toolbar-label">Visualização</span><div class="planner-gantt-segmented">${botoesModo}</div></div><div class="planner-gantt-toolbar-group planner-gantt-options"><span class="planner-gantt-toolbar-label">Opções</span><div class="planner-gantt-option-list"><label><input type="checkbox" data-gantt-hide-empty ${plannerGanttOcultarVazios?"checked":""}> Somente com movimentação</label><label><input type="checkbox" data-gantt-window ${plannerGanttMostrarJanela?"checked":""}> Janela de execução</label></div></div></div><div class="planner-gantt-scroll"><div class="planner-gantt-grid" style="--gantt-days:${dias.length}"><div class="planner-gantt-header"><div class="planner-gantt-label"><span class="planner-gantt-process-column">Processo</span><span class="planner-gantt-hours-column">Horas</span></div><div class="planner-gantt-calendar-header"><div class="planner-gantt-weeks">${cabecalhoSemanasPlannerGantt(dias)}</div><div class="planner-gantt-days">${cabecalhoPlannerGantt(dias)}</div></div></div>${linhas}${hojeVisivel?`<div class="planner-gantt-today planner-gantt-today-line" style="--today-column:${dias.indexOf(hoje)+1}"><span>Hoje</span></div>`:""}</div></div>`;
  plannerEls.gantt.querySelectorAll("[data-gantt-scale]").forEach((b)=>b.addEventListener("click",()=>{plannerGanttEscala=b.dataset.ganttScale;plannerGanttReferencia=null;renderizarPlanner();}));
  plannerEls.gantt.querySelectorAll("[data-gantt-mode]").forEach((b)=>b.addEventListener("click",()=>{plannerGanttModo=b.dataset.ganttMode;renderizarPlanner();}));
  plannerEls.gantt.querySelectorAll("[data-gantt-nav]").forEach((b)=>b.addEventListener("click",()=>{const d=new Date(`${intervalo.inicio}T12:00:00`);plannerGanttEscala==="semana"?d.setDate(d.getDate()+7*Number(b.dataset.ganttNav)):d.setMonth(d.getMonth()+Number(b.dataset.ganttNav));plannerGanttReferencia=PLANNER_GANTT.dataCivilIso(d);renderizarPlanner();}));
  plannerEls.gantt.querySelector("[data-gantt-today]")?.addEventListener("click",()=>{plannerGanttReferencia=hoje;renderizarPlanner();});
  plannerEls.gantt.querySelector("[data-gantt-window]")?.addEventListener("change",(e)=>{plannerGanttMostrarJanela=e.target.checked;renderizarPlanner();});
  plannerEls.gantt.querySelector("[data-gantt-hide-empty]")?.addEventListener("change",(e)=>{plannerGanttOcultarVazios=e.target.checked;renderizarPlanner();});
  plannerEls.gantt.querySelectorAll("[data-gantt-toggle]").forEach((b)=>b.addEventListener("click",(event)=>{event.stopPropagation();plannerGanttRecolhidos.has(b.dataset.ganttToggle)?plannerGanttRecolhidos.delete(b.dataset.ganttToggle):plannerGanttRecolhidos.add(b.dataset.ganttToggle);renderizarPlanner();}));
  plannerEls.gantt.querySelectorAll("[data-gantt-node]").forEach((b)=>b.addEventListener("click",(event)=>{event.stopPropagation();abrirAtividadesVinculadasGantt(plannerGanttNosAtuais.get(b.dataset.ganttNode),b);}));
}
function centralizarDiaPlannerGantt(iso) { const scroll=plannerEls.gantt?.querySelector(".planner-gantt-scroll"),grid=plannerEls.gantt?.querySelector(".planner-gantt-grid");if(!scroll||!grid)return;const inicio=grid.querySelector(".planner-gantt-day")?.title?.split("/").reverse().join("-");scroll.scrollLeft=Math.max(0,360+PLANNER_GANTT.diferencaDias(inicio,iso)*42-scroll.clientWidth/2); }function criarBucketPlanner(grupo) {
  const podeAdicionar = (plannerEls.agrupar?.value || "bucket") === "bucket" && usuarioAtualEhAdmin();
  return `<section class="planner-bucket-column" data-drop-bucket="${escapeHtml(grupo.nome)}"><header class="planner-bucket-header"><h3>${escapeHtml(grupo.nome)}</h3><span>${grupo.itens.length}</span></header>${podeAdicionar ? `<button type="button" class="planner-add-task" data-add-bucket="${escapeHtml(grupo.nome)}"><i class="fas fa-plus" aria-hidden="true"></i> Adicionar tarefa</button>` : ""}<div class="planner-bucket-cards">${grupo.itens.map(criarCardPlanner).join("")}</div></section>`;
}

function criarCardPlanner(checklist) {
  const p = calcularProgressoPlanner(checklist); const resumo = calcularResumoPrazosPlanner(checklist); const titulo = checklist.nomeTarefa || `${checklist.projeto} — ${checklist.tipo}`;
  const grupos = agruparItensPlannerPorEtapa(checklist.itens);
  const atrasada = checklist.dataConclusao && new Date(`${checklist.dataConclusao}T23:59:59`) < new Date() && p.percentual < 100;
  const responsaveis = nomesResponsaveisPlanner(checklist); const nomes = responsaveis.join(", ");
  const iniciais = responsaveis.length ? responsaveis.map((nome) => nome[0]).join("").slice(0, 3).toUpperCase() : "?";
  return `<article class="planner-card" role="button" tabindex="0" draggable="${usuarioAtualEhAdmin()}" data-planner-id="${escapeHtml(checklist.id)}" aria-label="Abrir tarefa ${escapeHtml(titulo)}"><div class="planner-card-top"><span class="planner-project-codes">${renderizarCodigosProjetoPlanner(checklist)}</span>${checklist.origem === "atividade" ? `<span class="planner-sync-badge">AUTO</span>` : checklist.origem === "hibrido" ? `<span class="planner-sync-badge">SYNC</span>` : ""}<span class="planner-code obra-code">${escapeHtml(checklist.obraCodigo || "—")}</span><span class="planner-avatar" title="${escapeHtml(nomes || "Sem responsável")}">${escapeHtml(iniciais)}</span></div><p class="planner-card-work">${escapeHtml(checklist.obra)}</p><h3>${escapeHtml(titulo)}</h3><p class="planner-card-project">${escapeHtml(checklist.projeto)}</p><p class="planner-card-type">${escapeHtml(checklist.tipo)}</p><div class="planner-card-badges"><span class="badge ${classeStatus(checklist.status || "Não iniciado")}">${escapeHtml(checklist.status || "Não iniciado")}</span><span class="badge ${classePrioridade(checklist.prioridade || "P1")}">${escapeHtml(checklist.prioridade || "P1")}</span></div><p class="planner-due ${atrasada ? "overdue" : ""}"><i class="far fa-calendar"></i> ${checklist.dataConclusao ? formatarData(checklist.dataConclusao) : "Sem conclusão"}</p><div class="planner-card-checklist">${grupos.map(criarGrupoCardPlanner).join("")}</div><footer class="planner-footer"><span><i class="far fa-square-check"></i> ${p.concluidos} / ${p.total}</span>${resumo.agendados ? `<span>📅 ${resumo.agendados}</span>` : ""}${resumo.hoje ? `<span>Hoje ${resumo.hoje}</span>` : ""}${resumo.atrasados ? `<span>⚠ ${resumo.atrasados}</span>` : ""}<strong>${p.percentual}%</strong></footer><div class="planner-progress-bar"><span style="width:${p.percentual}%"></span></div></article>`;
}
function criarDataLocalPlanner(valor) { if (!valor) return null; const [ano, mes, dia] = valor.split("-").map(Number); return ano && mes && dia ? new Date(ano, mes - 1, dia) : null; }
function criarDataHoraLocalPlanner(data, hora = "") { if (!data) return null; const [ano, mes, dia] = data.split("-").map(Number); const [horas = 23, minutos = 59] = hora ? hora.split(":").map(Number) : [23, 59]; return new Date(ano, mes - 1, dia, horas, minutos, 0, 0); }
function obterSituacaoPrazoItemPlanner(item) { if (!item?.dataPrevista) return "sem-prazo"; if (item.concluido) return "futuro"; const agora = new Date(), prazo = criarDataHoraLocalPlanner(item.dataPrevista, item.horaPrevista); if (prazo < agora) return "atrasado"; const hoje = criarDataLocalPlanner(item.dataPrevista), inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()); if (hoje.getTime() === inicioHoje.getTime()) return "hoje"; if (prazo - agora < 86400000) return "proximo"; return "futuro"; }
function formatarPrazoItemPlanner(item) { const data = criarDataLocalPlanner(item?.dataPrevista); if (!data) return ""; const agora = new Date(), amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1); let texto = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); if (data.toDateString() === agora.toDateString()) texto = "Hoje"; else if (data.toDateString() === amanha.toDateString()) texto = "Amanhã"; return `${texto}${item.horaPrevista ? ` às ${String(item.horaPrevista).slice(0, 5)}` : ""}`; }
function obterResponsavelEfetivoItemPlanner(item, checklist) { return item?.responsavel || checklist?.responsavel || ""; }
function usuarioPodeConcluirItemPlanner(item, checklist) {
  if (usuarioAtualEhAdmin()) return true;
  const responsavel = obterResponsavelEfetivoItemPlanner(item, checklist);
  return listarResponsaveisPlanner(responsavel).some((nome) => normalizarTexto(nome) === normalizarTexto(colaboradorDoUsuario()));
}
function usuarioPodePlanejarItemPlanner(checklist) {
  if (usuarioAtualEhAdmin()) return true;
  const colaborador = normalizarTexto(colaboradorDoUsuario());
  return Boolean(colaborador) && nomesResponsaveisPlanner(checklist).some((nome) => normalizarTexto(nome) === colaborador);
}
function formatarMinutosPlanner(minutos) { const total = Number(minutos) || 0; return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, "0")}`; }
function renderizarMetadadosItemPlanner(item, checklist) { const prazo = formatarPrazoItemPlanner(item), responsavel = obterResponsavelEfetivoItemPlanner(item, checklist), situacao = obterSituacaoPrazoItemPlanner(item), count = Number(item.atividadeCount) || 0; if (!prazo && !responsavel && !count) return ""; return `<span class="planner-item-metadata ${situacao === "atrasado" ? "planner-item-overdue" : situacao === "hoje" ? "planner-item-due-today" : situacao === "proximo" ? "planner-item-due-soon" : ""}">${count ? `<span class="planner-activity-state">${item.concluido ? "✓ Concluído" : "● Em andamento"} · ${count} atividade${count === 1 ? "" : "s"} · ${formatarMinutosPlanner(item.minutosRegistrados)}</span><span>${escapeHtml((item.colaboradoresAtividade || []).join(" · "))}</span>` : ""}${prazo ? `<span class="planner-item-date"><i class="far fa-calendar"></i> ${situacao === "atrasado" ? "Atrasado · " : ""}${escapeHtml(prazo)}</span>` : ""}${responsavel ? `<span class="planner-item-owner">${escapeHtml(responsavel)}</span>` : ""}</span>`; }
function calcularResumoPrazosPlanner(checklist) { const estados = (checklist.itens || []).map(obterSituacaoPrazoItemPlanner); return { agendados: estados.filter(e => e !== "sem-prazo").length, hoje: estados.filter(e => e === "hoje").length, atrasados: estados.filter(e => e === "atrasado").length }; }
function localizarItemPlanner(checklistId, itemId) { const checklist = plannerChecklists.find(c => String(c.id) === String(checklistId)); const item = checklist?.itens?.find(i => String(i.id) === String(itemId)); return checklist && item ? { checklist, item } : null; }
let plannerItemFocoAnterior = null;
function fecharDetalhesItemPlanner() { plannerEls.itemModal.hidden = true; plannerItemFocoAnterior?.focus(); }
function preencherResponsaveisItemPlanner(checklist, item) {
  const select = document.getElementById("plannerItemResponsavel");
  const responsaveis = nomesResponsaveisPlanner(checklist);
  select.innerHTML = `<option value="">Todos os responsáveis da tarefa</option>${responsaveis.map((nome) => `<option value="${escapeHtml(nome)}">${escapeHtml(nome)}</option>`).join("")}`;
  select.value = responsaveis.includes(item.responsavel) ? item.responsavel : "";
}
function abrirDetalhesItemPlanner(checklistId, itemId, gatilho) {
  const achado = localizarItemPlanner(checklistId, itemId); if (!achado) return;
  const { checklist, item } = achado; plannerItemFocoAnterior = gatilho || plannerItemFocoAnterior;
  document.getElementById("plannerItemChecklistId").value = checklist.id; document.getElementById("plannerItemId").value = item.id;
  document.getElementById("plannerItemEtapa").textContent = item.etapa; document.getElementById("plannerItemTitulo").textContent = item.estagio || item.atividade || item.texto;
  document.getElementById("plannerItemProjetoTipo").textContent = `${checklist.obra} · ${checklist.projeto} / ${checklist.tipo}`;
  document.getElementById("plannerItemDataPrevista").value = item.dataPrevista || ""; document.getElementById("plannerItemHoraPrevista").value = String(item.horaPrevista || "").slice(0,5);
  preencherResponsaveisItemPlanner(checklist, item); document.getElementById("plannerItemObservacoes").value = item.observacoes || "";
  const responsaveis = nomesResponsaveisPlanner(checklist); document.getElementById("plannerItemResponsavelInfo").textContent = !item.responsavel ? `${responsaveis.join(" · ")} — responsáveis da tarefa` : "";
  const podeConcluir = usuarioPodeConcluirItemPlanner(item, checklist); const botaoConclusao = document.getElementById("btnPlannerItemConclusao"); botaoConclusao.textContent = item.concluido ? "Reabrir estágio" : "Concluir estágio"; botaoConclusao.disabled = !podeConcluir; botaoConclusao.title = podeConcluir ? "" : "Somente o responsável pode marcar este estágio";
  document.getElementById("plannerItemConclusaoInfo").textContent = item.concluido ? `Concluído por ${item.concluidoPorNome || "usuário"}${item.concluidoEm ? ` em ${new Date(item.concluidoEm).toLocaleString("pt-BR")}` : ""}` : "Estágio não concluído";
  const listaAtividades = document.getElementById("plannerLinkedActivitiesList"); if (listaAtividades) listaAtividades.innerHTML = (item.atividadesVinculadas || []).length ? `<div class="planner-linked-table">${item.atividadesVinculadas.map((a) => `<div><time>${escapeHtml(formatarData(a.data_inicio || a.data_termino))}</time><strong>${escapeHtml(a.colaborador || "-")}</strong><span>${escapeHtml(a.trabalhos || "-")}</span><span>${formatarMinutosPlanner(calcularMinutosAtividadeBanco(a))}</span><span>${escapeHtml(a.status || "-")}</span></div>`).join("")}</div>` : `<p class="empty">Nenhuma atividade vinculada.</p>`;
  const admin = usuarioAtualEhAdmin(); const podePlanejar = usuarioPodePlanejarItemPlanner(checklist); ["plannerItemDataPrevista","plannerItemHoraPrevista","plannerItemObservacoes"].forEach(id => document.getElementById(id).disabled = !podePlanejar); document.getElementById("plannerItemResponsavel").disabled = !admin; document.getElementById("btnSalvarPlannerItem").hidden = !podePlanejar; document.getElementById("btnLimparPlannerItem").hidden = !podePlanejar; document.getElementById("plannerItemMessage").textContent = ""; plannerEls.itemModal.hidden = false; (podePlanejar ? document.getElementById("plannerItemDataPrevista") : botaoConclusao).focus();
}
function calcularMinutosAtividadeBanco(a) { if (!a?.data_inicio || !a?.hora_inicio || !a?.data_termino || !a?.hora_termino) return 0; const inicio = new Date(`${a.data_inicio}T${a.hora_inicio}`), fim = new Date(`${a.data_termino}T${a.hora_termino}`); const minutos = Math.round((fim - inicio) / 60000); return Number.isFinite(minutos) && minutos > 0 ? minutos : 0; }
async function atualizarDetalhesItemPlanner(detalhes, mensagem) {
  const resposta = await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "atualizarDetalhesItem", ...detalhes }) }).then(validarResposta);
  const achado = localizarItemPlanner(detalhes.checklistId, detalhes.itemId);
  if (achado && resposta.item) Object.assign(achado.item, resposta.item);
  renderizarPlanner(); if (plannerDetalheAtualId) abrirDetalhesPlanner(plannerDetalheAtualId); abrirDetalhesItemPlanner(detalhes.checklistId, detalhes.itemId);
  document.getElementById("plannerItemMessage").textContent = mensagem;
}
async function salvarDetalhesItemPlanner(event) { event.preventDefault(); const achado = localizarItemPlanner(document.getElementById("plannerItemChecklistId").value, document.getElementById("plannerItemId").value); if (!achado || !usuarioPodePlanejarItemPlanner(achado.checklist)) return; const dataPrevista = document.getElementById("plannerItemDataPrevista").value, horaPrevista = document.getElementById("plannerItemHoraPrevista").value; if (horaPrevista && !dataPrevista) { document.getElementById("plannerItemMessage").textContent = "Para informar um horário, selecione também a data prevista."; return; } const botao = document.getElementById("btnSalvarPlannerItem"), original = botao.textContent; botao.disabled = true; botao.textContent = "Salvando..."; try { await atualizarDetalhesItemPlanner({ checklistId: document.getElementById("plannerItemChecklistId").value, itemId: document.getElementById("plannerItemId").value, dataPrevista, horaPrevista, responsavel: document.getElementById("plannerItemResponsavel").value, observacoes: document.getElementById("plannerItemObservacoes").value }, "Detalhes do estágio salvos."); } catch (erro) { document.getElementById("plannerItemMessage").textContent = erro.message; } finally { botao.disabled = false; botao.textContent = original; } }
async function limparAgendamentoItemPlanner() { const achado = localizarItemPlanner(document.getElementById("plannerItemChecklistId").value, document.getElementById("plannerItemId").value); if (!achado || !usuarioPodePlanejarItemPlanner(achado.checklist) || !confirm("Deseja limpar o planejamento deste estágio?")) return; try { await atualizarDetalhesItemPlanner({ checklistId: document.getElementById("plannerItemChecklistId").value, itemId: document.getElementById("plannerItemId").value, dataPrevista: "", horaPrevista: "", responsavel: document.getElementById("plannerItemResponsavel").value, observacoes: "" }, "Planejamento do estágio limpo."); } catch (erro) { document.getElementById("plannerItemMessage").textContent = erro.message; } }
function criarGrupoCardPlanner(grupo) {
  const gp = calcularProgressoPlanner({ itens: grupo.itens });
  const state = gp.concluidos === gp.total && gp.total ? "true" : gp.concluidos ? "mixed" : "false";
  const ids = grupo.itens.map((item) => item.id).join(",");
  return `<section class="planner-card-group"><div class="planner-card-group-title"><button type="button" class="planner-stage-check ${state === "true" ? "done" : ""}" data-card-stage data-item-ids="${escapeHtml(ids)}" data-concluido="${state !== "true"}" role="checkbox" aria-checked="${state}"><i class="fas fa-check"></i></button><strong>${escapeHtml(grupo.etapa)}</strong><span>${gp.concluidos}/${gp.total}</span></div>${grupo.itens.map((item) => `<div class="planner-task-row ${item.concluido ? "done" : ""}"><button type="button" class="planner-item-check" data-card-item-check data-item-id="${escapeHtml(item.id)}" data-concluido="${!item.concluido}" role="checkbox" aria-checked="${item.concluido}" aria-label="${item.concluido ? "Reabrir" : "Concluir"} ${escapeHtml(item.estagio || item.atividade || item.texto)}"><span class="planner-circle"><i class="fas fa-check"></i></span></button><button type="button" class="planner-item-content" data-card-item-details data-item-id="${escapeHtml(item.id)}" aria-label="Abrir detalhes de ${escapeHtml(item.estagio || item.atividade || item.texto)}"><span class="planner-item-name">${escapeHtml(item.estagio || item.atividade || item.texto)}</span>${renderizarMetadadosItemPlanner(item, plannerChecklists.find(c => (c.itens || []).includes(item)))}</button></div>`).join("")}</section>`;
}
function manipularCliqueBoardPlanner(event) {
  const adicionar = event.target.closest("[data-add-bucket]"); if (adicionar) return abrirPlannerModal(adicionar.dataset.addBucket, adicionar);
  const check = event.target.closest("[data-card-item-check]"); const etapa = event.target.closest("[data-card-stage]"); const detalhes = event.target.closest("[data-card-item-details]"); const card = event.target.closest("[data-planner-id]");
  if (check || etapa) { event.stopPropagation(); return atualizarItensPlannerEmLote(check ? [check.dataset.itemId] : etapa.dataset.itemIds.split(","), (check || etapa).dataset.concluido === "true", card.dataset.plannerId, false); }
  if (detalhes) { event.stopPropagation(); return abrirDetalhesItemPlanner(card.dataset.plannerId, detalhes.dataset.itemId, detalhes); }
  if (card) { plannerFocoAnterior = card; abrirDetalhesPlanner(card.dataset.plannerId); }
}
function manipularTecladoBoardPlanner(event) { if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-planner-id]")) { event.preventDefault(); plannerFocoAnterior = event.target; abrirDetalhesPlanner(event.target.dataset.plannerId); } }
function iniciarArrastoPlanner(event) { const card = event.target.closest("[data-planner-id]"); if (!card || matchMedia("(max-width: 720px)").matches) return event.preventDefault(); plannerArrastandoId = card.dataset.plannerId; card.classList.add("is-dragging"); event.dataTransfer.effectAllowed = "move"; }
function finalizarArrastoPlanner(event) { event.target.closest("[data-planner-id]")?.classList.remove("is-dragging"); plannerEls.board.querySelectorAll(".is-drop-target").forEach((el) => el.classList.remove("is-drop-target")); plannerArrastandoId = null; }
function permitirSoltarPlanner(event) { const bucket = event.target.closest("[data-drop-bucket]"); if (!bucket || (plannerEls.agrupar?.value || "bucket") !== "bucket") return; event.preventDefault(); bucket.classList.add("is-drop-target"); }
function sairDestinoPlanner(event) { const bucket = event.target.closest("[data-drop-bucket]"); if (bucket && !bucket.contains(event.relatedTarget)) bucket.classList.remove("is-drop-target"); }
async function soltarPlanner(event) { const bucket = event.target.closest("[data-drop-bucket]"); if (!bucket || !plannerArrastandoId) return; event.preventDefault(); bucket.classList.remove("is-drop-target"); await moverChecklistPlanner(plannerArrastandoId, bucket.dataset.dropBucket); }
async function moverChecklistPlanner(id, novoBucket) {
  const checklist = plannerChecklists.find((item) => String(item.id) === String(id)); if (!checklist || checklist.bucket === novoBucket) return;
  const anterior = checklist.bucket; checklist.bucket = novoBucket; renderizarPlanner();
  try { const salvo = await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: checklist.id, bucket: novoBucket }) }).then(validarResposta); Object.assign(checklist, salvo); }
  catch (erro) { checklist.bucket = anterior; renderizarPlanner(); plannerEls.status.textContent = `Não foi possível mover a tarefa: ${erro.message}`; }
}

function abrirDetalhesPlanner(id) {
  const checklist = plannerChecklists.find((item) => String(item.id) === String(id)); if (!checklist) return; plannerDetalheAtualId = checklist.id; const p = calcularProgressoPlanner(checklist);
  plannerEls.detalheId.value = checklist.id; plannerEls.detalheTag.innerHTML = renderizarCodigosProjetoPlanner(checklist); plannerEls.detalheTitulo.value = checklist.nomeTarefa || `${checklist.projeto} — ${checklist.tipo}`; plannerEls.detalheObra.textContent = `Obra: ${checklist.obraCodigo ? `${checklist.obraCodigo} — ` : ""}${checklist.obra} • ${checklist.projeto} / ${checklist.tipo}`;
  selecionarResponsaveisPlanner(plannerEls.detalheResponsavel, checklist.responsaveis || checklist.responsavel); plannerEls.detalheStatus.value = checklist.status || "Não iniciado"; plannerEls.detalhePrioridade.value = ["P0","P1","P2","P3"].includes(checklist.prioridade) ? checklist.prioridade : "P1"; plannerEls.detalheDataInicio.value = checklist.dataInicio || ""; plannerEls.detalheDataConclusao.value = checklist.dataConclusao || ""; plannerEls.detalheBucket.value = checklist.bucket || obterBucketDoProjeto(checklist.projeto, checklist.codigoProjeto); plannerEls.detalheAnotacoes.value = checklist.anotacoes || ""; const resumoPrazos = calcularResumoPrazosPlanner(checklist); const partesResumo = [resumoPrazos.agendados && `${resumoPrazos.agendados} agendados`, resumoPrazos.hoje && `${resumoPrazos.hoje} hoje`, resumoPrazos.atrasados && `${resumoPrazos.atrasados} atrasados`].filter(Boolean); plannerEls.detalheChecklistTitulo.textContent = `Lista de verificação (${p.concluidos}/${p.total} · ${p.percentual}%)${partesResumo.length ? ` — ${partesResumo.join(" · ")}` : ""}`;
  plannerEls.detalheChecklist.innerHTML = agruparItensPlannerPorEtapa(checklist.itens).map((grupo) => { const gp = calcularProgressoPlanner({ itens: grupo.itens }); const state = gp.concluidos === gp.total && gp.total ? "true" : gp.concluidos ? "mixed" : "false"; return `<section class="planner-detail-group" data-detail-group><div class="planner-detail-group-head"><button type="button" class="planner-stage-check ${state === "true" ? "done" : ""}" data-stage-toggle data-item-ids="${grupo.itens.map(i=>escapeHtml(i.id)).join(",")}" data-concluido="${state !== "true"}" aria-checked="${state}" role="checkbox"><i class="fas fa-check"></i></button><strong>${escapeHtml(grupo.etapa)}</strong><span>${gp.concluidos}/${gp.total} · ${gp.percentual}%</span><button type="button" class="planner-expand" data-detail-expand aria-expanded="true" aria-label="Recolher etapa">⌄</button></div><div class="planner-stage-progress"><span style="width:${gp.percentual}%"></span></div><div class="planner-detail-items">${grupo.itens.map(item => `<div class="planner-task-row ${item.concluido ? "done" : ""}"><button type="button" class="planner-item-check" data-item-toggle data-item-id="${escapeHtml(item.id)}" data-concluido="${!item.concluido}" role="checkbox" aria-checked="${item.concluido}"><span class="planner-check-circle"><i class="fas fa-check"></i></span></button><button type="button" class="planner-item-content" data-detail-item data-item-id="${escapeHtml(item.id)}"><span class="planner-item-name">${escapeHtml(item.estagio || item.atividade || item.texto)}</span>${renderizarMetadadosItemPlanner(item, checklist)}<span aria-hidden="true">›</span></button></div>`).join("")}</div></section>`; }).join("");
  const admin = usuarioAtualEhAdmin(); [plannerEls.detalheTitulo, plannerEls.detalheResponsavel, plannerEls.detalheStatus, plannerEls.detalhePrioridade, plannerEls.detalheDataInicio, plannerEls.detalheDataConclusao, plannerEls.detalheBucket, plannerEls.detalheAnotacoes].forEach((el) => { if (el) el.disabled = !admin; }); plannerEls.detalheModal.hidden = false; plannerEls.detalheTitulo.focus();
}
function manipularDetalhePlanner(event) {
  const expand = event.target.closest("[data-detail-expand]"); if (expand) { const group = expand.closest("[data-detail-group]"); const items = group.querySelector(".planner-detail-items"); const expanded = expand.getAttribute("aria-expanded") === "true"; expand.setAttribute("aria-expanded", String(!expanded)); items.hidden = expanded; return; }
  const stage = event.target.closest("[data-stage-toggle]"); const item = event.target.closest("[data-item-toggle]"); const detalhes = event.target.closest("[data-detail-item]");
  if (detalhes) return abrirDetalhesItemPlanner(plannerDetalheAtualId, detalhes.dataset.itemId, detalhes);
  if (stage) return atualizarItensPlannerEmLote(stage.dataset.itemIds.split(","), stage.dataset.concluido === "true", plannerDetalheAtualId, true);
  if (item) return atualizarItensPlannerEmLote([item.dataset.itemId], item.dataset.concluido === "true", plannerDetalheAtualId, true);
}
async function atualizarItensPlannerEmLote(itemIds, concluido, checklistId = plannerDetalheAtualId, reabrirDetalhes = true) {
  const checklist = plannerChecklists.find((c) => String(c.id) === String(checklistId)); if (!checklist) return; const antigos = new Map();
  checklist.itens.forEach((i) => { if (itemIds.includes(String(i.id))) { antigos.set(String(i.id), i.concluido); i.concluido = concluido; } }); renderizarPlanner(); if (reabrirDetalhes) abrirDetalhesPlanner(checklist.id);
  try { const resposta = await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "alterarConclusaoItens", checklistId: checklist.id, itemIds, concluido }) }).then(validarResposta); (resposta.itens || []).forEach(atualizado => { const local = checklist.itens.find(i => String(i.id) === String(atualizado.id)); if (local) ["concluido","concluidoEm","concluidoPor","concluidoPorNome"].forEach(campo => local[campo] = atualizado[campo]); }); }
  catch (erro) { checklist.itens.forEach((i) => { if (antigos.has(String(i.id))) i.concluido = antigos.get(String(i.id)); }); renderizarPlanner(); if (reabrirDetalhes) abrirDetalhesPlanner(checklist.id); plannerEls.status.textContent = `Falha ao atualizar o checklist: ${erro.message}`; }
}

async function salvarDetalhesPlanner(event) {
  event.preventDefault(); if (!usuarioAtualEhAdmin()) return; const payload = { id: plannerEls.detalheId.value, nomeTarefa: plannerEls.detalheTitulo.value.trim(), status: plannerEls.detalheStatus.value, prioridade: plannerEls.detalhePrioridade.value, dataInicio: plannerEls.detalheDataInicio.value, dataConclusao: plannerEls.detalheDataConclusao.value, bucket: plannerEls.detalheBucket.value, responsaveis: responsaveisSelecionadosPlanner(plannerEls.detalheResponsavel), anotacoes: plannerEls.detalheAnotacoes.value.trim() };
  try { const salvo = await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(validarResposta); const idx = plannerChecklists.findIndex((item) => String(item.id) === String(salvo.id)); if (idx >= 0) plannerChecklists[idx] = salvo; atualizarFiltrosPlanner(); renderizarPlanner(); abrirDetalhesPlanner(salvo.id); } catch (erro) { plannerEls.status.textContent = `Não foi possível salvar os detalhes: ${erro.message}`; }
}

async function excluirPlannerAtual() {
  if (!usuarioAtualEhAdmin() || !plannerDetalheAtualId || !confirm("Excluir esta tarefa do Planner?")) return;
  try { await fetch(`${API_PLANNER_URL}?id=${encodeURIComponent(plannerDetalheAtualId)}`, { method: "DELETE" }).then(validarResposta); plannerChecklists = plannerChecklists.filter((item) => item.id !== plannerDetalheAtualId); fecharDetalhesPlanner(); atualizarFiltrosPlanner(); renderizarPlanner(); }
  catch (erro) { alert(`Não foi possível excluir: ${erro.message}`); }
}
function gerarCodigoProjeto(projeto) {
  const modelo = plannerModelos.find((item) => normalizarProjetoPlanner(item.projeto) === normalizarProjetoPlanner(projeto));
  if (modelo?.codigoProjeto) return modelo.codigoProjeto;
  const texto = normalizarOpcaoPlanner(projeto);
  const codigos = [["baixa tensao","PRJ-ELE"],["prj-ali","PRJ-ALI"],["alimentador","PRJ-ALI"],[" ali ","PRJ-ALI"],["prj-ilux","PRJ-ILUX"],["iluminacao externa","PRJ-ILUX"],["ilux","PRJ-ILUX"],["subestacao","PRJ-SUB"],["mapa chave","PRJ-SIT"],["situacao","PRJ-SIT"],["logica","PRJ-LOG"],["cabeamento","PRJ-CAB"],["cftv","PRJ-CFTV"],["spda","PRJ-SPDA"],["aterramento","PRJ-ATE"],["automacao","PRJ-ATM"],["sdai","PRJ-SDAI"],["telefonia","PRJ-TEF"],["sonorizacao","PRJ-SOM"],["fotovoltaico","PRJ-FOT"],["solar","PRJ-FOT"],["media tensao","PRJ-ELET"]];
  return codigos.find(([termo]) => texto.includes(termo))?.[1] || `PRJ-${String(projeto || "GER").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "GER"}`;
}
function gerarId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `atividade-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initThemeSelector() {
  const themeToggle = document.getElementById("theme-toggle");
  if (!themeToggle) return;

  const html = document.documentElement;
  const savedTheme = localStorage.getItem("theme") || "dark";
  html.setAttribute("data-theme", savedTheme);
  themeToggle.checked = savedTheme === "light";

  themeToggle.addEventListener("change", function () {
    const theme = this.checked ? "light" : "dark";
    html.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  });
}

initThemeSelector();
