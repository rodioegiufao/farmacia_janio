const colaboradores = ["Rodrigo", "Hellen", "Bruno", "Rian", "Estagiário"];
const prioridades = ["P0", "P1", "P2", "P3"];
const projetos = [
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
  "QI Builder",
  "AutoCAD",
  "Revit",
  "Word",
  "Excel",
  "Avaliação",
  "Reunião",
  "Visita in-loco",
  "Outros"
];
const statusLista = ["Atrasado", "Em progresso", "Pausado", "Finalizado"];

const API_URL = "/api/atividades";
const API_SEMANA_URL = "/api/atividades-semanais";
const AUTH_URL = "/api/auth";

const authPanel = document.getElementById("authPanel");
const appContent = document.getElementById("appContent");
const loginForm = document.getElementById("loginForm");
const btnLogout = document.getElementById("btnLogout");
const userMenu = document.getElementById("userMenu");
const userMenuTrigger = document.getElementById("userMenuTrigger");
const userMenuPanel = document.getElementById("userMenuPanel");
const usuarioIniciais = document.getElementById("usuarioIniciais");
const usuarioIniciaisMenu = document.getElementById("usuarioIniciaisMenu");
const usuarioLogado = document.getElementById("usuarioLogado");
const usuarioPerfil = document.getElementById("usuarioPerfil");
const adminLink = document.getElementById("adminLink");
const loginSenha = document.getElementById("loginSenha");
const toggleLoginSenha = document.getElementById("toggleLoginSenha");

const form = document.getElementById("atividadeForm");
const tabela = document.getElementById("atividadesTabela");
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

let atividades = [];
let atividadesSemanais = [];
let carregando = false;
let carregandoSemanais = false;
let usuarioAtual = null;

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
  colaborador: document.getElementById("filtroColaborador"),
  status: document.getElementById("filtroStatus"),
  prioridade: document.getElementById("filtroPrioridade")
};

const camposSemanais = {
  id: document.getElementById("atividadeSemanalId"),
  semana: document.getElementById("semanaAtividade"),
  atividade: document.getElementById("tituloAtividadeSemanal"),
  descricao: document.getElementById("descricaoAtividadeSemanal")
};

const filtrosSemanais = {
  busca: document.getElementById("filtroBuscaSemana"),
  semana: document.getElementById("filtroSemana")
};

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

inicializar();

async function inicializar() {
  loginForm.addEventListener("submit", entrar);
  btnLogout.addEventListener("click", sair);
  userMenuTrigger.addEventListener("click", alternarMenuUsuario);
  document.addEventListener("click", fecharMenuUsuarioAoClicarFora);
  document.addEventListener("keydown", fecharMenuUsuarioComTeclado);
  toggleLoginSenha.addEventListener("click", alternarVisibilidadeSenha);
  await verificarSessao();
  
  preencherColaboradoresPermitidos();
  preencherSelect(campos.prioridade, prioridades);
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

  form.addEventListener("submit", salvarAtividade);
  btnCancelarEdicao.addEventListener("click", cancelarEdicao);
  btnLimparTudo.addEventListener("click", limparTodosRegistros);
  btnExportarCSV.addEventListener("click", exportarCSV);
  formSemanal.addEventListener("submit", salvarAtividadeSemanal);
  btnCancelarEdicaoSemanal.addEventListener("click", limparFormularioSemanal);
  btnLimparFormularioSemanal.addEventListener("click", limparFormularioSemanal);
  btnNovaAtividadeSemanal?.addEventListener("click", focarFormularioSemanal);
  sectionTabs.forEach((tab) => tab.addEventListener("click", alternarSecao));

  Object.values(filtros).forEach((filtro) => {
    filtro.addEventListener("input", renderizarTabela);
    filtro.addEventListener("change", renderizarTabela);
  });
  Object.values(filtrosSemanais).forEach((filtro) => {
    filtro.addEventListener("input", renderizarTabelaSemanal);
    filtro.addEventListener("change", renderizarTabelaSemanal);
  });
  Object.values(filtrosDashboard).forEach((filtro) => {
    filtro.addEventListener("input", atualizarDashboard);
    filtro.addEventListener("change", atualizarDashboard);
  });
  if (usuarioAtual) {
    await carregarAtividades();
    await carregarAtividadesSemanais();
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
  if (targetId === "semanaSection" && usuarioAtual && !atividadesSemanais.length) carregarAtividadesSemanais();
}

function alternarAba(aba) {
  const mapa = {
    atividade: "atividadeSection",
    dashboard: "dashboardSection",
    semana: "semanaSection"
  };
  const targetId = mapa[aba];
  const tab = targetId ? document.querySelector(`[data-section-target="${targetId}"]`) : null;
  if (tab) alternarSecao({ currentTarget: tab });
}
function usuarioAtualEhAdmin() {
  return usuarioAtual?.perfil === "admin";
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
async function verificarSessao() {
  try {
    const data = await fetch(AUTH_URL).then(validarResposta);
    aplicarUsuarioLogado(data.user);
  } catch (_erro) {
    aplicarUsuarioLogado(null);
  }
}

function aplicarUsuarioLogado(user) {
  usuarioAtual = user;
  const adminLogado = user?.perfil === "admin";

  loginForm.hidden = Boolean(user);
  authPanel.hidden = Boolean(user);
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

function alternarVisibilidadeSenha() {
  const senhaVisivel = loginSenha.type === "text";
  loginSenha.type = senhaVisivel ? "password" : "text";
  toggleLoginSenha.setAttribute("aria-label", senhaVisivel ? "Mostrar senha" : "Ocultar senha");
  toggleLoginSenha.setAttribute("aria-pressed", String(!senhaVisivel));
  toggleLoginSenha.querySelector("i").className = senhaVisivel ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
}

async function entrar(event) {
  event.preventDefault();
  try {
    const data = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: document.getElementById("loginUsuario").value,
        senha: document.getElementById("loginSenha").value
      })
    }).then(validarResposta);
    loginForm.reset();
    aplicarUsuarioLogado(data.user);
    await carregarAtividades();
    await carregarAtividadesSemanais();
  } catch (erro) {
    alert(`Não foi possível entrar: ${erro.message}`);
  }
}

async function sair() {
  await fetch(AUTH_URL, { method: "DELETE" }).catch(() => null);
  aplicarUsuarioLogado(null);
  atividades = [];
  atividadesSemanais = [];
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

function renderizarTabela() {
  atualizarStatusAtrasadoAutomaticamente();

  const listaFiltrada = atividades.filter((atividade) => {
    const termo = filtros.busca.value.toLowerCase().trim();
    const textoBusca = `${atividade.obra} ${atividade.trabalhos} ${atividade.observacoes}`.toLowerCase();

    const correspondeBusca = !termo || textoBusca.includes(termo);
    const correspondeColaborador = !filtros.colaborador.value || atividade.colaborador === filtros.colaborador.value;
    const correspondeStatus = !filtros.status.value || atividade.status === filtros.status.value;
    const correspondePrioridade = !filtros.prioridade.value || atividade.prioridade === filtros.prioridade.value;

    return correspondeBusca && correspondeColaborador && correspondeStatus && correspondePrioridade;
  });

  tabela.innerHTML = "";
  
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

  listaFiltrada.forEach((atividade) => {
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
    const textoBusca = `${atividadeSemanal.semana} ${atividadeSemanal.atividade} ${atividadeSemanal.descricao}`.toLowerCase();
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
    tabelaSemanal.innerHTML = '<p class="empty weekly-empty-state">Carregando atividades semanais do Supabase...</p>';
    return;
  }

  if (!listaFiltrada.length) {
    tabelaSemanal.innerHTML = '<p class="empty weekly-empty-state">Nenhuma atividade semanal encontrada.</p>';
    return;
  }

  const atividadesPorSemana = agruparAtividadesPorSemana(listaFiltrada);
  tabelaSemanal.innerHTML = Object.entries(atividadesPorSemana)
    .map(([semana, atividadesDaSemana]) => criarBlocoSemana(semana, atividadesDaSemana, podeGerenciarAtividadesSemanais))
    .join("");
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
        <strong>${escapeHtml(atividadeSemanal.atividade || "Atividade sem título")}</strong>
        <p>${escapeHtml(atividadeSemanal.descricao || "Sem descrição cadastrada.")}</p>
        <small>Criado em ${escapeHtml(formatarDataHoraCadastro(atividadeSemanal.criadoEm))}</small>
      </div>
      ${podeGerenciarAtividadesSemanais ? `
        <td>
          <div class="actions">
            <button type="button" class="secondary" onclick="editarAtividadeSemanal('${atividadeSemanal.id}')">Editar</button>
            <button type="button" class="ghost" onclick="excluirAtividadeSemanal('${atividadeSemanal.id}')">Excluir</button>
          </div>
        </td>
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
    .sort((a, b) => a.localeCompare(b));
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

  if (filtrosDashboard.periodo.value === "personalizado") {
    return {
      inicio: filtrosDashboard.dataInicio.value ? new Date(`${filtrosDashboard.dataInicio.value}T00:00:00`) : new Date(0),
      fim: filtrosDashboard.dataFim.value ? new Date(`${filtrosDashboard.dataFim.value}T23:59:59`) : hoje
    };
  }

  if (filtrosDashboard.periodo.value === "mes-anterior") {
    return { inicio: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), fim: new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999) };
  }

  if (filtrosDashboard.periodo.value === "ultimos-30") {
    const inicio = new Date(inicioHoje);
    inicio.setDate(inicio.getDate() - 29);
    return { inicio, fim: hoje };
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
  const finalizadasPorMes = obterMesesFinalizados(lista);
  criarOuAtualizarGrafico("chartFinalizadasMes", "line", finalizadasPorMes.labels, finalizadasPorMes.valores, "Finalizadas");
  criarOuAtualizarGrafico("chartTipoProjeto", "bar", projetos, projetos.map((projeto) => lista.filter((a) => a.projeto === projeto).length), "Projetos");
  criarOuAtualizarGrafico("chartPrioridade", "bar", prioridades, prioridades.map((prioridade) => lista.filter((a) => a.prioridade === prioridade).length), "Prioridades");
}

function criarOuAtualizarGrafico(canvasId, tipo, labels, valores, label) {
  if (dashboardCharts[canvasId]) dashboardCharts[canvasId].destroy();

  const corTexto = getComputedStyle(document.documentElement).getPropertyValue("--text-light").trim() || "#e2e8f0";
  const corGrade = getComputedStyle(document.documentElement).getPropertyValue("--border-color").trim() || "#334155";

  dashboardCharts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: tipo,
    data: { labels, datasets: [{ label, data: valores, backgroundColor: ["#3182ce", "#48bb78", "#ed8936", "#f56565", "#9f7aea", "#63b3ed"], borderColor: "#63b3ed", tension: 0.3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: tipo === "doughnut", labels: { color: corTexto } } },
      scales: tipo === "doughnut" ? {} : {
        x: { ticks: { color: corTexto }, grid: { color: corGrade } },
        y: { beginAtZero: true, ticks: { color: corTexto, precision: 0 }, grid: { color: corGrade } }
      }
    }
  });
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

function classeStatus(status) {
  return status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-");
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
