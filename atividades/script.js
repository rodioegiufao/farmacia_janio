const colaboradores = ["Rodrigo", "Hellen", "Bruno", "Rian", "Geovanna"];
const prioridades = ["P0", "P1", "P2", "P3"];
const plannerStatusLista = ["Não iniciado", "Em andamento", "Concluído", "Atrasado", "Pausado"];
const plannerPrioridades = ["P0", "P1", "P2", "P3"];
const plannerResponsaveis = ["Geovanna", "Bruno", "Rodrigo", "Hellen", "Rian"];
const plannerBuckets = ["Projeto Elétrico Baixa Tensão", "Projeto Elétrico de Alimentadores", "Projeto de Iluminação Externa", "Projeto de Subestação", "Projeto de Lógica Estruturada", "Projeto de SPDA", "Cabeamento", "CFTV", "Outros"];
const plannerProjetosDisponiveis = ["Projetos Elétricos de Baixa Tensão"];
const plannerTiposDisponiveis = [
  "Prédios Públicos Gerais",
  "Prédios Públicos de Saúde sem IT-Médico",
  "Prédios Públicos de Saúde com IT-Médico",
  "Prédios Privados Gerais",
  "Prédios Privados Pequenos (<200m²)"
];
const plannerEtapasBase = [
  { etapa: "Lançamento", estagios: ["Pontos e iluminação", "Tomadas de uso geral", "Tomadas de uso específico", "Pontos de emergência", "Pontos de climatização", "Pontos de exaustão"] },
  { etapa: "Distribuição", estagios: ["Eletrocalhas", "Perfilados", "Cabos PP", "Eletrodutos", "Pontos de conexão"] },
  { etapa: "Plotagem", estagios: ["Iluminação", "Tomadas de uso geral", "Tomadas de uso específico", "Emergência", "Climatização", "Exaustão"] },
  { etapa: "Compatibilização", estagios: ["Elétrico com outras disciplinas"] },
  { etapa: "Estudos", estagios: ["NBR 5413 e ABNT NBR ISO/CIE 8995-1", "NBR 5410", "Livros Mamede", "Manual de Plotagem"] }
];
function criarModelosFallbackPlanner() {
  return plannerTiposDisponiveis.map((tipo) => {
    const etapas = plannerEtapasBase.map((grupo) => ({ etapa: grupo.etapa, estagios: [...grupo.estagios] }));
    if (tipo.includes("Saúde")) etapas.find((grupo) => grupo.etapa === "Estudos").estagios.push("RDC/SOMASUS");
    if (tipo.includes("com IT-Médico")) {
      etapas.find((grupo) => grupo.etapa === "Lançamento").estagios.push("Pontos de IT-médico");
      etapas.find((grupo) => grupo.etapa === "Plotagem").estagios.push("IT-médico");
    }
    if (tipo === "Prédios Privados Gerais") etapas.find((grupo) => grupo.etapa === "Distribuição").estagios = ["Eletrocalhas, perfilados, cabos PP e eletrodutos", "Pontos de conexão"];
    if (tipo.includes("Pequenos")) {
      etapas.find((grupo) => grupo.etapa === "Distribuição").estagios = ["Eletrodutos", "Pontos de conexão"];
      etapas.find((grupo) => grupo.etapa === "Plotagem").estagios = ["Iluminação", "Tomadas de uso geral, específico, emergência e climatização"];
    }
    return { projeto: plannerProjetosDisponiveis[0], tipo, codigoProjeto: "PRJ-ELE", etapas };
  });
}
const coresPrioridade = {
  P0: "#48bb78",
  P1: "#ecc94b",
  P2: "#ed8936",
  P3: "#f56565"
};
const projetos = [
  "Site",
  "Todos",
  "CFTV",
  "Cabeamento",
  "Telefonia",
  "Elétrico Baixa Tensão",
  "Iluminação Externa",
  "SPDA",
  "Subestação",
  "Alimentador",
  "Mapa Chave/Situação",
  "Sonorização",
  "Solar",
  "Automação",
  "Outros",
];
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

const campos = {
  id: document.getElementById("atividadeId"),
  obraId: document.getElementById("obraId"),
  colaborador: document.getElementById("colaborador"),
  obra: document.getElementById("obra"),
  prioridade: document.getElementById("prioridade"),
  projeto: document.getElementById("projeto"),
  trabalhos: document.getElementById("trabalhos"),
  etapa: document.getElementById("etapa"),
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
  preencherSelect(campos.etapa, etapas);
  preencherSelect(campos.status, statusLista);

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
  if (filtrosCalendario.dataReferencia && !filtrosCalendario.dataReferencia.value) filtrosCalendario.dataReferencia.value = obterDataIsoLocal(new Date());

  form.addEventListener("submit", salvarAtividade);
  btnCancelarEdicao.addEventListener("click", cancelarEdicao);
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

  if (targetId === "dashboardSection") atualizarDashboard();
  if (targetId === "calendarioSection") renderizarCalendario();
  if (targetId === "semanaSection" && usuarioAtual && !atividadesSemanais.length) carregarAtividadesSemanais();
  if (targetId === "plannerSection" && !plannerChecklists.length) carregarPlanner();
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
    if (identificacao) identificacao.textContent = obra ? `${obra.codigo} — ${obra.nome}` : (!input.value.trim() && opcional ? "Sem obra vinculada." : "Uma nova obra será cadastrada ao salvar.");
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
  opcoes.forEach((opcao) => {
    const option = document.createElement("option");
    option.value = opcao;
    option.textContent = opcao;
    select.appendChild(option);
  });
}

async function salvarAtividade(event) {
  event.preventDefault();

  const atividade = {
    id: campos.id.value || gerarId(),
    colaborador: usuarioAtual?.perfil === "admin" ? campos.colaborador.value : colaboradorDoUsuario(),
    obra: campos.obra.value.trim(),
    obraId: campos.obraId.value,
    prioridade: campos.prioridade.value,
    projeto: campos.projeto.value,
    trabalhos: campos.trabalhos.value.trim(),
    etapa: campos.etapa.value,
    dataInicio: campos.dataInicio.value,
    horaInicio: campos.horaInicio.value,
    dataTermino: campos.dataTermino.value,
    horaTermino: campos.horaTermino.value,
    dataPrevista: campos.dataPrevista.value,
    status: statusAtualizado(campos.status.value, campos.dataPrevista.value),
    observacoes: campos.observacoes.value.trim(),
    criadoEm: campos.id.value ? atividades.find((item) => item.id === campos.id.value)?.criadoEm : new Date().toISOString()
  };
  
  const conflito = encontrarConflitoHorario(atividade, atividades);
  if (conflito) {
    alert(`Este horário já possui atividade registrada para ${atividade.colaborador}: ${conflito.trabalhos} (${formatarDataHora(conflito.dataInicio, conflito.horaInicio)} até ${formatarDataHora(conflito.dataTermino, conflito.horaTermino)}).`);
    return;
  }

  try {
    setFormDisabled(true);
    const atividadeSalva = await apiRequest(campos.id.value ? "PUT" : "POST", atividade);
    await carregarObras();
    const indice = atividades.findIndex((item) => item.id === atividade.id);

    if (indice >= 0) {
      atividades[indice] = atividadeSalva;
    } else {
      atividades.unshift(atividadeSalva);
    }

    form.reset();
    preencherColaboradoresPermitidos();
    campos.id.value = "";
    campos.obraId.value = "";
    btnCancelarEdicao.style.display = "none";
    document.getElementById("btnSalvar").textContent = "Salvar atividade";
    atualizarOpcoesDashboard();
    renderizarTabela();
    renderizarCalendario();
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
    const textoBusca = `${atividade.obraCodigo} ${atividade.obra} ${atividade.projeto} ${atividade.trabalhos} ${atividade.observacoes}`.toLowerCase();

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
    tabela.innerHTML = `<tr><td colspan="13" class="empty">Carregando atividades do Supabase...</td></tr>`;
    atualizarDashboard();
    return;
  }

  if (!listaFiltrada.length) {
    tabela.innerHTML = `<tr><td colspan="13" class="empty">Nenhuma atividade encontrada.</td></tr>`;
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

  Object.keys(campos).forEach((campo) => {
    if (campo === "id") campos[campo].value = atividade.id;
    else campos[campo].value = atividade[campo] || "";
  });

  btnCancelarEdicao.style.display = "inline-block";
  document.getElementById("btnSalvar").textContent = "Atualizar atividade";
  if (usuarioAtual?.perfil !== "admin") {
    campos.colaborador.value = colaboradorDoUsuario();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirAtividade(id) {
  const confirmar = confirm("Deseja excluir esta atividade do Supabase?");
  if (!confirmar) return;

  try {
    await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then(validarResposta);
    atividades = atividades.filter((item) => item.id !== id);
    atualizarOpcoesDashboard();
    renderizarTabela();
    renderizarCalendario();
  } catch (erro) {
    alert(`Não foi possível excluir no Supabase: ${erro.message}`);
  }
}

function cancelarEdicao() {
  form.reset();
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
  const dataUtc = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  const diaSemana = dataUtc.getUTCDay() || 7;
  dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(dataUtc.getUTCFullYear(), 0, 1));
  return Math.ceil((((dataUtc - inicioAno) / 86400000) + 1) / 7);
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
  const listaDashboard = filtrarAtividadesDashboard();
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

function filtrarAtividadesDashboard() {
  const periodo = obterIntervaloDashboard();

  return atividades.filter((atividade) => {
    const dataReferencia = obterDataReferenciaAtividade(atividade);
    const dentroPeriodo = !dataReferencia || (dataReferencia >= periodo.inicio && dataReferencia <= periodo.fim);
    const correspondeColaborador = !filtrosDashboard.colaborador.value || atividade.colaborador === filtrosDashboard.colaborador.value;
    const correspondeStatus = !filtrosDashboard.status.value || atividade.status === filtrosDashboard.status.value;
    const correspondePrioridade = !filtrosDashboard.prioridade.value || atividade.prioridade === filtrosDashboard.prioridade.value;
    const correspondeProjeto = !filtrosDashboard.projeto.value || atividade.projeto === filtrosDashboard.projeto.value;
    const correspondeObra = !filtrosDashboard.obra.value || (atividade.obraId || `legado:${normalizarNomeObra(atividade.obra)}`) === filtrosDashboard.obra.value;

    return dentroPeriodo && correspondeColaborador && correspondeStatus && correspondePrioridade && correspondeProjeto && correspondeObra;
  });
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
    return { inicio: new Date(hoje.getFullYear(), 0, 1), fim: hoje };
  }

  return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1), fim: hoje };
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
  return lista.reduce((acc, atividade) => {
    const nome = atividade.colaborador || "Sem colaborador";
    acc[nome] ||= { total: 0, finalizadas: 0, progresso: 0, atrasadas: 0, horas: 0, projetosSet: new Set(), projetos: 0 };
    acc[nome].total += 1;
    acc[nome].finalizadas += atividade.status === "Finalizado" ? 1 : 0;
    acc[nome].progresso += atividade.status === "Em progresso" ? 1 : 0;
    acc[nome].atrasadas += atividade.status === "Atrasado" ? 1 : 0;
    acc[nome].horas += calcularHorasAtividade(atividade);
    acc[nome].projetosSet.add(`${normalizarTexto(atividade.obra)}|${normalizarTexto(atividade.projeto)}`);
    acc[nome].projetos = acc[nome].projetosSet.size;
    return acc;
  }, {});
}

function renderizarGraficosDashboard(lista) {
  if (typeof Chart === "undefined") return;

  const porColaborador = agruparPorColaborador(lista);
  const colaboradoresLabels = Object.keys(porColaborador);

  criarOuAtualizarGrafico("chartAtividadesColaborador", "bar", colaboradoresLabels, colaboradoresLabels.map((nome) => porColaborador[nome].total), "Atividades");
  criarOuAtualizarGrafico("chartHorasColaborador", "bar", colaboradoresLabels, colaboradoresLabels.map((nome) => Number(porColaborador[nome].horas.toFixed(2))), "Horas");
  criarOuAtualizarGrafico("chartProjetosColaborador", "bar", colaboradoresLabels, colaboradoresLabels.map((nome) => porColaborador[nome].projetos), "Projetos/obras");
  criarOuAtualizarGrafico("chartStatus", "doughnut", statusLista, statusLista.map((status) => lista.filter((a) => a.status === status).length), "Status");
  renderizarAtividadesFinalizadas(lista);
  criarOuAtualizarGrafico("chartTipoProjeto", "bar", projetos, projetos.map((projeto) => lista.filter((a) => a.projeto === projeto).length), "Projetos");
  criarOuAtualizarGrafico("chartPrioridade", "bar", prioridades, prioridades.map((prioridade) => lista.filter((a) => a.prioridade === prioridade).length), "Prioridades");
  const obrasPegando = obterObrasPegando(lista);
  criarOuAtualizarGrafico("chartObrasPegando", "bar", obrasPegando.labels, obrasPegando.valores, "Horas por obra");
  const porProjeto = agruparIndicadoresPorProjetoObra(lista);
  criarOuAtualizarGrafico("chartAtividadesProjetoRelatorio", "bar", porProjeto.labels, porProjeto.atividades, "Atividades", true);
  criarOuAtualizarGrafico("chartHorasProjetoRelatorio", "bar", porProjeto.labels, porProjeto.horas, "Horas", true);
}

function obterChaveProjetoObra(atividade) {
  const obra = (atividade.obra || "Obra não informada").trim();
  const projeto = (atividade.projeto || "Projeto não informado").trim();
  return `${obra} — ${projeto}`;
}

function agruparIndicadoresPorProjetoObra(lista) {
  const mapa = new Map();
  lista.forEach((atividade) => {
    const chave = obterChaveProjetoObra(atividade);
    const atual = mapa.get(chave) || { atividades: 0, horas: 0 };
    atual.atividades += 1;
    atual.horas += calcularHorasAtividade(atividade);
    mapa.set(chave, atual);
  });

  const labels = [...mapa.keys()]
    .sort((a, b) => mapa.get(b).horas - mapa.get(a).horas || mapa.get(b).atividades - mapa.get(a).atividades || a.localeCompare(b))
    .slice(0, 10);

  return {
    labels,
    atividades: labels.map((label) => mapa.get(label).atividades),
    horas: labels.map((label) => Number(mapa.get(label).horas.toFixed(2)))
  };
}

function obterObrasPegando(lista) {
  const mapa = new Map();
  lista
    .filter((atividade) => atividade.obra)
    .forEach((atividade) => {
      const obra = atividade.obra.trim();
      const horas = calcularHorasAtividade(atividade);
      mapa.set(obra, (mapa.get(obra) || 0) + horas);
    });

  const labels = [...mapa.keys()].sort((a, b) => mapa.get(b) - mapa.get(a) || a.localeCompare(b));
  return { labels, valores: labels.map((label) => Number(mapa.get(label).toFixed(2))) };
}

function criarOuAtualizarGrafico(canvasId, tipo, labels, valores, label, horizontal = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (dashboardCharts[canvasId]) dashboardCharts[canvasId].destroy();

  const corTexto = getComputedStyle(document.documentElement).getPropertyValue("--text-light").trim() || "#e2e8f0";
  const corGrade = getComputedStyle(document.documentElement).getPropertyValue("--border-color").trim() || "#334155";

  dashboardCharts[canvasId] = new Chart(canvas, {
    type: tipo,
    data: { labels, datasets: [{ label, data: valores, backgroundColor: obterCoresGrafico(labels), borderColor: "#63b3ed", tension: 0.3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: tipo === "doughnut", labels: { color: corTexto } } },
      indexAxis: horizontal ? "y" : "x",
      animation: false,
      scales: tipo === "doughnut" ? {} : {
        x: { beginAtZero: horizontal, ticks: { color: corTexto, precision: 0 }, grid: { color: corGrade } },
        y: { beginAtZero: !horizontal, ticks: { color: corTexto, precision: 0 }, grid: { color: corGrade } }
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
  return atividade.trabalhos || atividade.etapa || atividade.projeto || atividade.obra || "Atividade sem nome";
}

function obterDetalheAtividadeFinalizada(atividade) {
  const partes = [atividade.colaborador, atividade.obra, atividade.projeto].filter(Boolean);
  const data = atividade.dataTermino || atividade.dataInicio || atividade.criadoEm || atividade.criado_em;
  if (data) partes.push(`Finalizada em ${formatarData(data)}`);
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
    const atividadesRelatorio = filtrarAtividadesDashboard();
    
    const atividadesSemanaisRelatorio = filtrarAtividadesSemanaisPorPeriodo(obterAtividadesSemanaisFiltradas());
    const payload = {
      atividades: atividadesRelatorio,
      atividadesSemanais: atividadesSemanaisRelatorio,
      tituloRelatorio: obterTituloRelatorioWord(atividadesSemanaisRelatorio),
      filtros: obterFiltrosDashboardRelatorio(),
      graficos: await prepararGraficosParaRelatorio(atividadesRelatorio)
    };

    const response = await fetch(API_RELATORIO_WORD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const erro = await response.json().catch(() => null);
      throw new Error(erro?.error || "Erro inesperado ao gerar relatório Word.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-atividades-setor-${new Date().toISOString().slice(0, 10)}.docx`;
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
    layout: { padding: 18 },
    plugins: {
      legend: {
        display: tipo === "doughnut",
        position: "bottom",
        labels: { color: "#000000", font: { size: 13, weight: "bold" }, padding: 18 }
      },
      title: { color: "#000000", font: { size: 15, weight: "bold" } }
    },
    indexAxis: horizontal ? "y" : "x",
    scales: tipo === "doughnut" ? {} : {
      x: {
        beginAtZero: horizontal,
        ticks: { color: "#000000", precision: 0, font: { size: 12, weight: "bold" } },
        grid: { color: "#d1d5db" }
      },
      y: {
        beginAtZero: !horizontal,
        ticks: { color: "#000000", precision: 0, font: { size: 12, weight: "bold" } },
        grid: { color: "#d1d5db" }
      }
    }
  };
}

function capturarGraficoTemporarioRelatorio(canvasId, largura = 1400, altura = 800) {
  const graficoOrigem = dashboardCharts[canvasId];
  if (!graficoOrigem || typeof Chart === "undefined") return capturarCanvasRelatorio(canvasId);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  canvas.style.cssText = "position:fixed;left:-99999px;top:-99999px;background:#fff;";
  document.body.appendChild(canvas);

  try {
    const tipo = graficoOrigem.config.type;
    const horizontal = graficoOrigem.options?.indexAxis === "y";
    const graficoRelatorio = new Chart(canvas, {
      type: tipo,
      data: clonarDadosGraficoRelatorio(graficoOrigem.data),
      options: criarOpcoesGraficoRelatorio(tipo, horizontal),
      plugins: [fundoBrancoRelatorioPlugin]
    });
    graficoRelatorio.update("none");
    const imagem = canvas.toDataURL("image/png", 1);
    graficoRelatorio.destroy();
    return imagem;
  } catch (erro) {
    console.warn(`Não foi possível preparar o gráfico ${canvasId} para relatório:`, erro);
    return capturarCanvasRelatorio(canvasId);
  } finally {
    canvas.remove();
  }
}

async function prepararGraficosParaRelatorio(lista) {
  if (typeof Chart === "undefined") return capturarGraficosRelatorio();
  renderizarGraficosDashboard(lista);
  await aguardarRenderizacaoGraficos();
  return {
    atividadesProjeto: capturarGraficoTemporarioRelatorio("chartAtividadesProjetoRelatorio", 1500, 850),
    horasProjeto: capturarGraficoTemporarioRelatorio("chartHorasProjetoRelatorio", 1500, 850),
    atividadesColaborador: capturarGraficoTemporarioRelatorio("chartAtividadesColaborador", 1400, 800),
    horasColaborador: capturarGraficoTemporarioRelatorio("chartHorasColaborador", 1400, 800),
    status: capturarGraficoTemporarioRelatorio("chartStatus", 1200, 760),
    tipoProjeto: capturarGraficoTemporarioRelatorio("chartTipoProjeto", 1400, 800),
    prioridade: capturarGraficoTemporarioRelatorio("chartPrioridade", 1200, 760),
    obrasPegando: capturarGraficoTemporarioRelatorio("chartObrasPegando", 1400, 800)
  };
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
  if (!["semana-atual", "semana-anterior"].includes(filtrosDashboard.periodo.value)) return lista;

  const periodo = obterIntervaloDashboard();
  const dataReferencia = new Date(periodo.inicio);
  dataReferencia.setHours(12, 0, 0, 0);
  const filtradas = lista.filter((atividadeSemanal) => {
    const intervaloSemana = extrairIntervaloSemana(atividadeSemanal.semana);
    return intervaloSemana ? dataDentroDoIntervalo(dataReferencia, intervaloSemana) : false;
  });

  return filtradas.length ? filtradas : lista;
}

function obterTituloRelatorioWord(atividadesSemanaisRelatorio) {
  if (["semana-atual", "semana-anterior"].includes(filtrosDashboard.periodo.value)) {
    const semanas = [...new Set((atividadesSemanaisRelatorio || []).map((item) => item.semana).filter(Boolean))];
    return semanas.length ? semanas.join("; ") : "Relatório semanal de acompanhamento das atividades do setor.";
  }

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
function obterBucketDoProjeto(projeto, codigoProjeto = "") {
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
  document.getElementById("btnCancelarPlannerItem")?.addEventListener("click", fecharDetalhesItemPlanner);
  document.getElementById("btnLimparPlannerItem")?.addEventListener("click", limparAgendamentoItemPlanner);
  document.getElementById("btnPlannerItemConclusao")?.addEventListener("click", async () => { const achado = localizarItemPlanner(document.getElementById("plannerItemChecklistId").value, document.getElementById("plannerItemId").value); if (achado) await atualizarItensPlannerEmLote([String(achado.item.id)], !achado.item.concluido, achado.checklist.id, true); abrirDetalhesItemPlanner(achado.checklist.id, achado.item.id); });
  habilitarMovimentoPlannerItem();
  plannerEls.form.addEventListener("submit", salvarChecklistPlanner);
  plannerEls.detalheForm?.addEventListener("submit", salvarDetalhesPlanner);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!plannerEls.itemModal?.hidden) fecharDetalhesItemPlanner();
    else if (!plannerEls.detalheModal?.hidden) fecharDetalhesPlanner();
    else if (!plannerEls.modal?.hidden) fecharPlannerModal();
  });
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

function calcularProgressoPlanner(checklist) { const itens = checklist.itens || []; const total = itens.length; const concluidos = itens.filter((item) => item.concluido).length; return { total, concluidos, percentual: total ? Math.round((concluidos / total) * 100) : 0 }; }
function agruparItensPlannerPorEtapa(itens = []) { const groups = new Map(); itens.forEach((item) => { const etapa = item.etapa || "Outros"; if (!groups.has(etapa)) groups.set(etapa, []); groups.get(etapa).push(item); }); return [...groups.entries()].map(([etapa, items]) => ({ etapa, itens: items })); }
function checklistsPlannerFiltrados() {
  const busca = normalizarOpcaoPlanner(plannerEls.busca?.value);
  return plannerChecklists.filter((checklist) => {
    const texto = [checklist.obraCodigo, checklist.obra, checklist.nomeTarefa, checklist.projeto, checklist.tipo, checklist.responsavel, checklist.codigoProjeto, ...(checklist.itens || []).flatMap((item) => [item.etapa, item.estagio, item.atividade, item.texto, item.responsavel, item.observacoes, formatarPrazoItemPlanner(item)])].join(" ");
    return (!busca || normalizarOpcaoPlanner(texto).includes(busca)) && (!plannerEls.filtroStatus?.value || checklist.status === plannerEls.filtroStatus.value) && (!plannerEls.filtroPrioridade?.value || checklist.prioridade === plannerEls.filtroPrioridade.value) && (!plannerEls.filtroResponsavel?.value || nomesResponsaveisPlanner(checklist).includes(plannerEls.filtroResponsavel.value)) && (!plannerEls.filtroPrazo?.value || (checklist.itens || []).some((item) => { const estado = obterSituacaoPrazoItemPlanner(item); return plannerEls.filtroPrazo.value === "agendados" ? estado !== "sem-prazo" : estado === plannerEls.filtroPrazo.value; }));
  });
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
  if (carregandoPlanner) { plannerEls.status.textContent = "Carregando modelos e tarefas salvas..."; plannerEls.board.innerHTML = ""; return; }
  plannerEls.status.textContent = plannerModelos.length ? `${plannerModelos.length} combinação(ões) Projeto + Tipo disponíveis.` : "Nenhum modelo foi retornado pela API.";
  const filtrados = checklistsPlannerFiltrados();
  if (!filtrados.length && plannerChecklists.length) { plannerEls.board.innerHTML = '<div class="planner-empty">Nenhuma tarefa corresponde à busca e aos filtros.</div>'; return; }
  plannerEls.board.innerHTML = gruposPlanner(filtrados).map(criarBucketPlanner).join("");
}
function criarBucketPlanner(grupo) {
  const podeAdicionar = (plannerEls.agrupar?.value || "bucket") === "bucket" && usuarioAtualEhAdmin();
  return `<section class="planner-bucket-column" data-drop-bucket="${escapeHtml(grupo.nome)}"><header class="planner-bucket-header"><h3>${escapeHtml(grupo.nome)}</h3><span>${grupo.itens.length}</span></header>${podeAdicionar ? `<button type="button" class="planner-add-task" data-add-bucket="${escapeHtml(grupo.nome)}"><i class="fas fa-plus" aria-hidden="true"></i> Adicionar tarefa</button>` : ""}<div class="planner-bucket-cards">${grupo.itens.map(criarCardPlanner).join("")}</div></section>`;
}

function criarCardPlanner(checklist) {
  const p = calcularProgressoPlanner(checklist); const resumo = calcularResumoPrazosPlanner(checklist); const titulo = checklist.nomeTarefa || `${checklist.projeto} — ${checklist.tipo}`;
  const grupos = agruparItensPlannerPorEtapa(checklist.itens);
  const atrasada = checklist.dataConclusao && new Date(`${checklist.dataConclusao}T23:59:59`) < new Date() && p.percentual < 100;
  const responsaveis = nomesResponsaveisPlanner(checklist); const nomes = responsaveis.join(", ");
  const iniciais = responsaveis.length ? responsaveis.map((nome) => nome[0]).join("").slice(0, 3).toUpperCase() : "?";
  return `<article class="planner-card" role="button" tabindex="0" draggable="${usuarioAtualEhAdmin()}" data-planner-id="${escapeHtml(checklist.id)}" aria-label="Abrir tarefa ${escapeHtml(titulo)}"><div class="planner-card-top"><span class="planner-code">${escapeHtml(checklist.codigoProjeto || gerarCodigoProjeto(checklist.projeto))}</span><span class="planner-code obra-code">${escapeHtml(checklist.obraCodigo || "—")}</span><span class="planner-avatar" title="${escapeHtml(nomes || "Sem responsável")}">${escapeHtml(iniciais)}</span></div><p class="planner-card-work">${escapeHtml(checklist.obra)}</p><h3>${escapeHtml(titulo)}</h3><p class="planner-card-project">${escapeHtml(checklist.projeto)}</p><p class="planner-card-type">${escapeHtml(checklist.tipo)}</p><div class="planner-card-badges"><span class="badge ${classeStatus(checklist.status || "Não iniciado")}">${escapeHtml(checklist.status || "Não iniciado")}</span><span class="badge ${classePrioridade(checklist.prioridade || "P1")}">${escapeHtml(checklist.prioridade || "P1")}</span></div><p class="planner-due ${atrasada ? "overdue" : ""}"><i class="far fa-calendar"></i> ${checklist.dataConclusao ? formatarData(checklist.dataConclusao) : "Sem conclusão"}</p><div class="planner-card-checklist">${grupos.map(criarGrupoCardPlanner).join("")}</div><footer class="planner-footer"><span><i class="far fa-square-check"></i> ${p.concluidos} / ${p.total}</span>${resumo.agendados ? `<span>📅 ${resumo.agendados}</span>` : ""}${resumo.hoje ? `<span>Hoje ${resumo.hoje}</span>` : ""}${resumo.atrasados ? `<span>⚠ ${resumo.atrasados}</span>` : ""}<strong>${p.percentual}%</strong></footer><div class="planner-progress-bar"><span style="width:${p.percentual}%"></span></div></article>`;
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
function renderizarMetadadosItemPlanner(item, checklist) { const prazo = formatarPrazoItemPlanner(item), responsavel = obterResponsavelEfetivoItemPlanner(item, checklist), situacao = obterSituacaoPrazoItemPlanner(item); if (!prazo && !responsavel) return ""; return `<span class="planner-item-metadata ${situacao === "atrasado" ? "planner-item-overdue" : situacao === "hoje" ? "planner-item-due-today" : situacao === "proximo" ? "planner-item-due-soon" : ""}">${prazo ? `<span class="planner-item-date"><i class="far fa-calendar"></i> ${situacao === "atrasado" ? "Atrasado · " : ""}${escapeHtml(prazo)}</span>` : ""}${responsavel ? `<span class="planner-item-owner">${escapeHtml(responsavel)}</span>` : ""}</span>`; }
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
  const admin = usuarioAtualEhAdmin(); const podePlanejar = usuarioPodePlanejarItemPlanner(checklist); ["plannerItemDataPrevista","plannerItemHoraPrevista","plannerItemObservacoes"].forEach(id => document.getElementById(id).disabled = !podePlanejar); document.getElementById("plannerItemResponsavel").disabled = !admin; document.getElementById("btnSalvarPlannerItem").hidden = !podePlanejar; document.getElementById("btnLimparPlannerItem").hidden = !podePlanejar; document.getElementById("plannerItemMessage").textContent = ""; plannerEls.itemModal.hidden = false; (podePlanejar ? document.getElementById("plannerItemDataPrevista") : botaoConclusao).focus();
}
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
  plannerEls.detalheId.value = checklist.id; plannerEls.detalheTag.textContent = checklist.codigoProjeto || gerarCodigoProjeto(checklist.projeto); plannerEls.detalheTitulo.value = checklist.nomeTarefa || `${checklist.projeto} — ${checklist.tipo}`; plannerEls.detalheObra.textContent = `Obra: ${checklist.obraCodigo ? `${checklist.obraCodigo} — ` : ""}${checklist.obra} • ${checklist.projeto} / ${checklist.tipo}`;
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
  const texto = normalizarOpcaoPlanner(projeto);
  const codigos = [["baixa tensao","PRJ-ELE"],["alimentador","PRJ-ALI"],["iluminacao externa","PRJ-ILUX"],["subestacao","PRJ-SUB"],["logica","PRJ-LOG"],["cabeamento","PRJ-CAB"],["cftv","PRJ-CFTV"],["spda","PRJ-SPDA"],["aterramento","PRJ-ATE"],["automacao","PRJ-ATM"],["sdai","PRJ-SDAI"],["telefonia","PRJ-TEF"],["sonorizacao","PRJ-SOM"],["fotovoltaico","PRJ-FOT"]];
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
