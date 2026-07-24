const colaboradores = ["Rodrigo", "Hellen", "Bruno", "Rian", "Geovanna"];
const prioridades = ["P0", "P1", "P2", "P3"];
const plannerStatusLista = ["Não iniciado", "Em andamento", "Concluído", "Atrasado", "Pausado"];
const plannerPrioridades = ["P0", "P1", "P2", "P3"];
const plannerBuckets = ["Projeto Elétrico Baixa Tensão", "SPDA", "Subestação", "Alimentador", "Cabeamento", "CFTV", "Iluminação Externa", "Outros"];
const plannerProjetosDisponiveis = ["Projetos Elétricos de Baixa Tensão"];
const plannerTiposDisponiveis = [
  "Prédios Públicos Gerais",
  "Prédios Públicos de Saúde sem IT-Médico",
  "Prédios Públicos de Saúde com IT-Médico",
  "Prédios Privados Gerais",
  "Prédios Privados Pequenos (<200m²)"
];
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

const campos = {
  id: document.getElementById("atividadeId"),
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
  etapasPreview: document.getElementById("plannerEtapasPreview"),
  formMessage: document.getElementById("plannerFormMessage"),
  selecionarTodos: document.getElementById("plannerSelecionarTodos"),
  limparSelecao: document.getElementById("plannerLimparSelecao"),
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
    await carregarAtividades();
    await carregarAtividadesSemanais();
    if (usuarioAtualEhAdmin()) await carregarPlanner();
  }
}

function alternarSecao(event) {
  const targetId = event.currentTarget.dataset.sectionTarget;
  if (targetId === "plannerSection" && !usuarioAtualEhAdmin()) return;

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
  const podeAcessarPlanner = usuarioAtualEhAdmin();
  if (plannerTab) plannerTab.hidden = !podeAcessarPlanner;
  if (plannerEls.btnNovo) plannerEls.btnNovo.hidden = !podeAcessarPlanner;
  if (plannerEls.btnSalvarDetalhes) plannerEls.btnSalvarDetalhes.hidden = !podeAcessarPlanner;
  if (plannerEls.btnExcluir) plannerEls.btnExcluir.hidden = !podeAcessarPlanner;
  if (plannerPanel) plannerPanel.hidden = !podeAcessarPlanner || plannerPanel.hidden;
  if (plannerEls.modal) plannerEls.modal.hidden = true;
  if (!podeAcessarPlanner && plannerTab?.classList.contains("active")) alternarAba("atividade");
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
    const indice = atividades.findIndex((item) => item.id === atividade.id);

    if (indice >= 0) {
      atividades[indice] = atividadeSalva;
    } else {
      atividades.unshift(atividadeSalva);
    }

    form.reset();
    preencherColaboradoresPermitidos();
    campos.id.value = "";
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
    const textoBusca = `${atividade.obra} ${atividade.trabalhos} ${atividade.observacoes}`.toLowerCase();

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

  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    botoes.push({ texto: String(pagina), pagina, atual: pagina === paginaAtividadesAtual });
  }

  botoes.push({ texto: "Próxima", pagina: paginaAtividadesAtual + 1, desabilitado: paginaAtividadesAtual === totalPaginas });

  botoes.forEach(({ texto, pagina, atual, desabilitado }) => {
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
    descricao: camposSemanais.descricao.value.trim()
  };

  try {
    setFormSemanalDisabled(true);
    const atividadeSalva = await apiRequestSemanal(camposSemanais.id.value ? "PUT" : "POST", atividadeSemanal);
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
    const textoBusca = `${atividadeSemanal.semana} ${atividadeSemanal.atividade} ${atividadeSemanal.descricao} ${atividadeSemanal.prioridade} ${atividadeSemanal.entregas}`.toLowerCase();
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
  return `${atividade.colaborador || "Sem colaborador"} - ${atividade.trabalhos || "Atividade"} (${atividade.status || "Sem status"})`;
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
    const correspondeObra = !filtrosDashboard.obra.value || atividade.obra === filtrosDashboard.obra.value;

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
  return new Set(lista.map((a) => `${normalizarTexto(a.obra)}|${normalizarTexto(a.projeto)}`).filter((chave) => chave !== "|")).size;
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
  const obras = [...new Set(atividades.map((a) => a.obra).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  preencherSelect(filtrosDashboard.obra, obras, "Todas as obras");
  if (obras.includes(valorObra)) filtrosDashboard.obra.value = valorObra;
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
    "Colaborador",
    "Nome da obra",
    "Prioridade",
    "Projeto",
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
    a.colaborador,
    a.obra,
    a.prioridade,
    a.projeto,
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
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Erro inesperado na comunicação com o servidor.");
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
  return String(value || "").trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function opcoesUnicasPlanner(values) {
  const seen = new Set();
  return values.filter((value) => { const key = normalizarOpcaoPlanner(value); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
function obterModeloPlannerSelecionado() {
  const projeto = normalizarOpcaoPlanner(plannerEls.projeto?.value);
  const tipo = normalizarOpcaoPlanner(plannerEls.tipo?.value);
  return plannerModelos.find((modelo) => normalizarOpcaoPlanner(modelo.projeto) === projeto && normalizarOpcaoPlanner(modelo.tipo) === tipo) || null;
}
function mostrarMensagemPlanner(texto, tipo = "error") {
  if (!plannerEls.formMessage) return;
  plannerEls.formMessage.textContent = texto || "";
  plannerEls.formMessage.dataset.type = texto ? tipo : "";
  if (texto && tipo === "error") plannerEls.formMessage.focus();
}
function atualizarEstadoCheckboxEtapa(container) {
  const pai = container.querySelector('[data-planner-etapa]');
  const filhos = [...container.querySelectorAll('[data-planner-estagio]')];
  const selecionados = filhos.filter((item) => item.checked).length;
  pai.checked = filhos.length > 0 && selecionados === filhos.length;
  pai.indeterminate = selecionados > 0 && selecionados < filhos.length;
  pai.setAttribute("aria-checked", pai.indeterminate ? "mixed" : String(pai.checked));
  const count = container.querySelector("[data-planner-count]");
  if (count) count.textContent = `${selecionados} de ${filhos.length} selecionados`;
}
function renderizarSelecaoEtapasPlanner() {
  const modelo = obterModeloPlannerSelecionado();
  if (!modelo) { plannerEls.etapasPreview.innerHTML = "<p>Selecione um Projeto e um Tipo válidos.</p>"; plannerEls.btnSalvar.disabled = true; return; }
  plannerEls.etapasPreview.innerHTML = (modelo.etapas || []).map((grupo, index) => {
    const estagios = grupo.estagios || grupo.atividades || [];
    return `<section class="planner-etapa-group" data-preview-group><div class="planner-etapa-head"><input type="checkbox" id="planner-etapa-${index}" data-planner-etapa checked aria-checked="true"><label for="planner-etapa-${index}">${escapeHtml(grupo.etapa)}</label><span data-planner-count>${estagios.length} de ${estagios.length} selecionados</span><button type="button" class="planner-expand" data-toggle-group aria-expanded="true" aria-label="Recolher ${escapeHtml(grupo.etapa)}">⌄</button></div><div class="planner-estagios">${estagios.map((estagio, itemIndex) => `<label><input type="checkbox" data-planner-estagio data-etapa="${escapeHtml(grupo.etapa)}" value="${escapeHtml(estagio)}" id="planner-estagio-${index}-${itemIndex}" checked><span>${escapeHtml(estagio)}</span></label>`).join("")}</div></section>`;
  }).join("");
  plannerEls.btnSalvar.disabled = false;
  mostrarMensagemPlanner("");
}
function obterItensPlannerSelecionados() {
  return [...plannerEls.etapasPreview.querySelectorAll('[data-planner-estagio]:checked')].map((input) => ({ etapa: input.dataset.etapa, estagio: input.value }));
}
function atualizarNomeTarefaPlanner() {
  const modelo = obterModeloPlannerSelecionado();
  if (modelo && plannerEls.nomeTarefa && !plannerEls.nomeTarefa.dataset.editado) plannerEls.nomeTarefa.value = `${modelo.projeto} — ${modelo.tipo}`;
}
function atualizarSelecaoPlanner(event) {
  const group = event.target.closest("[data-preview-group]");
  if (event.target.matches("[data-planner-etapa]")) group.querySelectorAll("[data-planner-estagio]").forEach((item) => { item.checked = event.target.checked; });
  if (group && event.target.matches("[data-planner-etapa], [data-planner-estagio]")) atualizarEstadoCheckboxEtapa(group);
  if (event.target.matches("[data-toggle-group]")) { const list = group.querySelector(".planner-estagios"); const expanded = event.target.getAttribute("aria-expanded") === "true"; event.target.setAttribute("aria-expanded", String(!expanded)); list.hidden = expanded; }
}
function inicializarPlanner() {
  if (!plannerEls.form) return;
  preencherSelect(plannerEls.statusTarefa, plannerStatusLista); preencherSelect(plannerEls.prioridade, plannerPrioridades);
  preencherSelect(plannerEls.detalheStatus, plannerStatusLista); preencherSelect(plannerEls.detalhePrioridade, plannerPrioridades); preencherSelect(plannerEls.detalheBucket, plannerBuckets);
  plannerEls.btnNovo?.addEventListener("click", abrirPlannerModal); plannerEls.btnFechar?.addEventListener("click", fecharPlannerModal); plannerEls.btnCancelar?.addEventListener("click", fecharPlannerModal);
  plannerEls.btnFecharDetalhes?.addEventListener("click", fecharDetalhesPlanner); plannerEls.btnExcluir?.addEventListener("click", excluirPlannerAtual);
  plannerEls.modal?.addEventListener("click", (event) => { if (event.target === plannerEls.modal) fecharPlannerModal(); });
  plannerEls.detalheModal?.addEventListener("click", (event) => { if (event.target === plannerEls.detalheModal) fecharDetalhesPlanner(); });
  plannerEls.projeto?.addEventListener("change", atualizarTiposPlanner);
  plannerEls.tipo?.addEventListener("change", () => { renderizarSelecaoEtapasPlanner(); atualizarNomeTarefaPlanner(); });
  plannerEls.nomeTarefa?.addEventListener("input", () => { plannerEls.nomeTarefa.dataset.editado = "true"; });
  plannerEls.etapasPreview?.addEventListener("click", atualizarSelecaoPlanner); plannerEls.etapasPreview?.addEventListener("change", atualizarSelecaoPlanner);
  plannerEls.selecionarTodos?.addEventListener("click", () => { plannerEls.etapasPreview.querySelectorAll("input[type=checkbox]").forEach((i) => { i.checked = true; }); plannerEls.etapasPreview.querySelectorAll("[data-preview-group]").forEach(atualizarEstadoCheckboxEtapa); });
  plannerEls.limparSelecao?.addEventListener("click", () => { plannerEls.etapasPreview.querySelectorAll("input[type=checkbox]").forEach((i) => { i.checked = false; }); plannerEls.etapasPreview.querySelectorAll("[data-preview-group]").forEach(atualizarEstadoCheckboxEtapa); });
  plannerEls.board?.addEventListener("click", (e) => { const card = e.target.closest("[data-planner-id]"); if (card) abrirDetalhesPlanner(card.dataset.plannerId); });
  plannerEls.board?.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-planner-id]")) abrirDetalhesPlanner(e.target.dataset.plannerId); });
  plannerEls.detalheChecklist?.addEventListener("click", manipularDetalhePlanner);
  plannerEls.form.addEventListener("submit", salvarChecklistPlanner); plannerEls.detalheForm?.addEventListener("submit", salvarDetalhesPlanner);
}

async function carregarPlanner() {
  if (!plannerEls.board || !usuarioAtualEhAdmin()) return;
  try { carregandoPlanner = true; renderizarPlanner(); const data = await fetch(API_PLANNER_URL).then(validarResposta); plannerModelos = data.modelos || []; plannerChecklists = data.checklists || []; atualizarProjetosPlanner(); }
  catch (erro) { plannerEls.status.textContent = `Não foi possível carregar o Planner: ${erro.message}`; plannerModelos = []; plannerChecklists = []; }
  finally { carregandoPlanner = false; renderizarPlanner(); }
}

function atualizarProjetosPlanner() {
  const source = plannerModelos.length ? plannerModelos.map((m) => m.projeto) : plannerProjetosDisponiveis;
  preencherSelect(plannerEls.projeto, opcoesUnicasPlanner(source)); atualizarTiposPlanner();
}

function atualizarTiposPlanner() {
  const projeto = normalizarOpcaoPlanner(plannerEls.projeto?.value);
  const source = plannerModelos.length ? plannerModelos.filter((m) => normalizarOpcaoPlanner(m.projeto) === projeto).map((m) => m.tipo) : plannerTiposDisponiveis;
  preencherSelect(plannerEls.tipo, opcoesUnicasPlanner(source)); plannerEls.tipo.disabled = !source.length;
  renderizarSelecaoEtapasPlanner(); atualizarNomeTarefaPlanner();
}

function abrirPlannerModal() {
  if (!usuarioAtualEhAdmin()) return;
  plannerEls.form.reset(); plannerEls.nomeTarefa.dataset.editado = ""; plannerEls.id.value = ""; plannerEls.btnSalvar.textContent = "Criar tarefa";
  atualizarProjetosPlanner(); plannerEls.statusTarefa.value = "Não iniciado"; plannerEls.prioridade.value = "P1"; plannerEls.modal.hidden = false; mostrarMensagemPlanner(""); plannerEls.obra.focus();
}

function fecharPlannerModal() { plannerEls.modal.hidden = true; }
function fecharDetalhesPlanner() { plannerEls.detalheModal.hidden = true; plannerDetalheAtualId = null; }

async function salvarChecklistPlanner(event) {
  event.preventDefault(); const modelo = obterModeloPlannerSelecionado(); const itensSelecionados = obterItensPlannerSelecionados();
  if (!plannerEls.obra.value.trim()) return mostrarMensagemPlanner("Informe o nome da obra.");
  if (!modelo) return mostrarMensagemPlanner("Selecione um Projeto e um Tipo válidos.");
  if (!itensSelecionados.length) return mostrarMensagemPlanner("Selecione ao menos um estágio para criar a tarefa.");
  const payload = { obra: plannerEls.obra.value.trim(), projeto: modelo.projeto, tipo: modelo.tipo, status: plannerEls.statusTarefa.value, prioridade: plannerEls.prioridade.value, dataInicio: plannerEls.dataInicio.value, dataConclusao: plannerEls.dataConclusao.value, bucket: "Outros", responsavel: plannerEls.responsavel.value.trim(), anotacoes: plannerEls.anotacoes.value.trim(), itensSelecionados };
  const nome = plannerEls.nomeTarefa.value.trim(); if (nome) payload.nomeTarefa = nome;
  try { plannerEls.btnSalvar.disabled = true; const salvo = await fetch(API_PLANNER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(validarResposta); plannerChecklists.unshift(salvo); fecharPlannerModal(); renderizarPlanner(); abrirDetalhesPlanner(salvo.id); }
  catch (erro) { mostrarMensagemPlanner(`Não foi possível criar a tarefa: ${erro.message}`); }
  finally { plannerEls.btnSalvar.disabled = false; }
}

function calcularProgressoPlanner(checklist) { const itens = checklist.itens || []; const total = itens.length; const concluidos = itens.filter((item) => item.concluido).length; return { total, concluidos, percentual: total ? Math.round((concluidos / total) * 100) : 0 }; }
function agruparItensPlannerPorEtapa(itens = []) { const groups = new Map(); itens.forEach((item) => { const etapa = item.etapa || "Outros"; if (!groups.has(etapa)) groups.set(etapa, []); groups.get(etapa).push(item); }); return [...groups.entries()].map(([etapa, items]) => ({ etapa, itens: items })); }

function renderizarPlanner() {
  if (!plannerEls.board) return; if (carregandoPlanner) { plannerEls.status.textContent = "Carregando modelos da planilha e tarefas salvas..."; plannerEls.board.innerHTML = ""; return; }
  plannerEls.status.textContent = plannerModelos.length ? `${plannerModelos.length} combinação(ões) Projeto + Tipo carregadas da aba Descricionado.` : "Planilha indisponível: usando opções de fallback.";
  if (!plannerChecklists.length) { plannerEls.board.innerHTML = `<div class="weekly-empty-state empty">Nenhuma tarefa criada${usuarioAtualEhAdmin() ? ". Clique em “+ Adicionar tarefa”." : "."}</div>`; return; }
  plannerEls.board.innerHTML = plannerChecklists.map(criarCardPlanner).join("");
}

function criarCardPlanner(checklist) {
  const p = calcularProgressoPlanner(checklist); const titulo = checklist.nomeTarefa || `${checklist.projeto} — ${checklist.tipo}`;
  return `<article class="planner-card" role="button" tabindex="0" data-planner-id="${escapeHtml(checklist.id)}"><div class="planner-card-top"><span class="planner-code">${escapeHtml(checklist.codigoProjeto || gerarCodigoProjeto(checklist.projeto))}</span><span class="planner-bucket">${escapeHtml(checklist.bucket || "Outros")}</span></div><h3>${escapeHtml(titulo)}</h3><p class="planner-meta">${escapeHtml(checklist.obra)}${checklist.responsavel ? ` • ${escapeHtml(checklist.responsavel)}` : ""}</p><div class="planner-card-badges"><span class="badge ${classeStatus(checklist.status || "Não iniciado")}">${escapeHtml(checklist.status || "Não iniciado")}</span><span class="badge ${classePrioridade(checklist.prioridade || "P1")}">${escapeHtml(checklist.prioridade || "P1")}</span></div><p class="planner-meta"><i class="far fa-calendar"></i> ${checklist.dataInicio ? formatarData(checklist.dataInicio) : "Sem início"} → ${checklist.dataConclusao ? formatarData(checklist.dataConclusao) : "Sem conclusão"}</p><footer class="planner-footer"><span><i class="far fa-square-check"></i> ${p.concluidos} / ${p.total} · ${p.percentual}%</span><div class="planner-progress-bar"><span style="width:${p.percentual}%"></span></div></footer></article>`;
}

function abrirDetalhesPlanner(id) {
  const checklist = plannerChecklists.find((item) => String(item.id) === String(id)); if (!checklist) return; plannerDetalheAtualId = checklist.id; const p = calcularProgressoPlanner(checklist);
  plannerEls.detalheId.value = checklist.id; plannerEls.detalheTag.textContent = checklist.codigoProjeto || gerarCodigoProjeto(checklist.projeto); plannerEls.detalheTitulo.value = checklist.nomeTarefa || `${checklist.projeto} — ${checklist.tipo}`; plannerEls.detalheObra.textContent = `${checklist.obra} • ${checklist.projeto} / ${checklist.tipo}`;
  plannerEls.detalheResponsavel.value = checklist.responsavel || ""; plannerEls.detalheStatus.value = checklist.status || "Não iniciado"; plannerEls.detalhePrioridade.value = ["P0","P1","P2","P3"].includes(checklist.prioridade) ? checklist.prioridade : "P1"; plannerEls.detalheDataInicio.value = checklist.dataInicio || ""; plannerEls.detalheDataConclusao.value = checklist.dataConclusao || ""; plannerEls.detalheBucket.value = checklist.bucket || "Outros"; plannerEls.detalheAnotacoes.value = checklist.anotacoes || ""; plannerEls.detalheChecklistTitulo.textContent = `Lista de verificação (${p.concluidos}/${p.total} · ${p.percentual}%)`;
  plannerEls.detalheChecklist.innerHTML = agruparItensPlannerPorEtapa(checklist.itens).map((grupo, gi) => { const gp = calcularProgressoPlanner({ itens: grupo.itens }); const state = gp.concluidos === gp.total ? "true" : gp.concluidos ? "mixed" : "false"; return `<section class="planner-detail-group" data-detail-group><div class="planner-detail-group-head"><button type="button" class="planner-stage-check ${state === "true" ? "done" : ""}" data-stage-toggle data-item-ids="${grupo.itens.map(i=>escapeHtml(i.id)).join(",")}" data-concluido="${state !== "true"}" aria-checked="${state}" role="checkbox"><i class="fas fa-check"></i></button><strong>${escapeHtml(grupo.etapa)}</strong><span>${gp.concluidos}/${gp.total} · ${gp.percentual}%</span><button type="button" class="planner-expand" data-detail-expand aria-expanded="true">⌄</button></div><div class="planner-stage-progress"><span style="width:${gp.percentual}%"></span></div><div class="planner-detail-items">${grupo.itens.map(item => `<button type="button" class="planner-checklist-row ${item.concluido ? "done" : ""}" data-item-toggle data-item-id="${escapeHtml(item.id)}" data-concluido="${!item.concluido}"><span class="planner-check-circle"><i class="fas fa-check"></i></span><span>${escapeHtml(item.estagio || item.atividade || item.texto)}</span></button>`).join("")}</div></section>`; }).join("");
  const admin = usuarioAtualEhAdmin(); [plannerEls.detalheTitulo, plannerEls.detalheResponsavel, plannerEls.detalheStatus, plannerEls.detalhePrioridade, plannerEls.detalheDataInicio, plannerEls.detalheDataConclusao, plannerEls.detalheBucket, plannerEls.detalheAnotacoes].forEach((el) => { if (el) el.disabled = !admin; }); plannerEls.detalheModal.hidden = false;
}
async function manipularDetalhePlanner(event) {
  const expand = event.target.closest("[data-detail-expand]"); if (expand) { const group = expand.closest("[data-detail-group]"); const items = group.querySelector(".planner-detail-items"); const open = expand.getAttribute("aria-expanded") === "true"; expand.setAttribute("aria-expanded", String(!open)); items.hidden = open; return; }
  const stage = event.target.closest("[data-stage-toggle]"); const item = event.target.closest("[data-item-toggle]");
  if (stage) return atualizarItensPlannerEmLote(stage.dataset.itemIds.split(","), stage.dataset.concluido === "true");
  if (item) return atualizarItensPlannerEmLote([item.dataset.itemId], item.dataset.concluido === "true");
}
async function atualizarItensPlannerEmLote(itemIds, concluido) {
  const checklist = plannerChecklists.find((c) => String(c.id) === String(plannerDetalheAtualId)); if (!checklist) return; const antigos = new Map();
  checklist.itens.forEach((i) => { if (itemIds.includes(String(i.id))) { antigos.set(String(i.id), i.concluido); i.concluido = concluido; } }); renderizarPlanner(); abrirDetalhesPlanner(checklist.id);
  try { await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checklistId: checklist.id, itemIds, concluido }) }).then(validarResposta); }
  catch (erro) { checklist.itens.forEach((i) => { if (antigos.has(String(i.id))) i.concluido = antigos.get(String(i.id)); }); renderizarPlanner(); abrirDetalhesPlanner(checklist.id); console.error("Falha ao atualizar checklist", erro); }
}

async function salvarDetalhesPlanner(event) {
  event.preventDefault(); if (!usuarioAtualEhAdmin()) return; const payload = { id: plannerEls.detalheId.value, nomeTarefa: plannerEls.detalheTitulo.value.trim(), status: plannerEls.detalheStatus.value, prioridade: plannerEls.detalhePrioridade.value, dataInicio: plannerEls.detalheDataInicio.value, dataConclusao: plannerEls.detalheDataConclusao.value, bucket: plannerEls.detalheBucket.value, responsavel: plannerEls.detalheResponsavel.value.trim(), anotacoes: plannerEls.detalheAnotacoes.value.trim() };
  try { const salvo = await fetch(API_PLANNER_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(validarResposta); const idx = plannerChecklists.findIndex((item) => item.id === salvo.id); if (idx >= 0) plannerChecklists[idx] = salvo; renderizarPlanner(); abrirDetalhesPlanner(salvo.id); } catch (erro) { console.error("Não foi possível salvar os detalhes", erro); }
}

async function excluirPlannerAtual() {
  if (!usuarioAtualEhAdmin() || !plannerDetalheAtualId || !confirm("Excluir esta tarefa do Planner?")) return;
  try {
    await fetch(`${API_PLANNER_URL}?id=${encodeURIComponent(plannerDetalheAtualId)}`, { method: "DELETE" }).then(validarResposta);
    plannerChecklists = plannerChecklists.filter((item) => item.id !== plannerDetalheAtualId);
    fecharDetalhesPlanner(); renderizarPlanner();
  } catch (erro) { alert(`Não foi possível excluir: ${erro.message}`); }
}
function gerarCodigoProjeto(projeto) {
  const texto = normalizarTexto(projeto);
  if (texto.includes("eletr")) return "PRJ-ELE";
  return `PRJ-${String(projeto || "GER").slice(0, 3).toUpperCase()}`;
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
