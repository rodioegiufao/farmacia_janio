const colaboradores = ["Rodrigo", "Hellen", "Bruno", "Estagiário"];
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
  "Automação"
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
const AUTH_URL = "/api/auth";
const USUARIOS_URL = "/api/usuarios";

const authPanel = document.getElementById("authPanel");
const authGrid = document.getElementById("authGrid");
const appContent = document.getElementById("appContent");
const loginForm = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");
const btnLogout = document.getElementById("btnLogout");
const usuarioLogado = document.getElementById("usuarioLogado");
const adminLink = document.getElementById("adminLink");

const form = document.getElementById("atividadeForm");
const tabela = document.getElementById("atividadesTabela");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const btnLimparTudo = document.getElementById("btnLimparTudo");
const btnExportarCSV = document.getElementById("btnExportarCSV");

let atividades = [];
let carregando = false;
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

inicializar();

async function inicializar() {
  loginForm.addEventListener("submit", entrar);
  cadastroForm.addEventListener("submit", cadastrarUsuario);
  btnLogout.addEventListener("click", sair);
  await verificarSessao();
  
  preencherSelect(campos.colaborador, colaboradores);
  preencherSelect(campos.prioridade, prioridades);
  preencherSelect(campos.projeto, projetos);
  preencherSelect(campos.etapa, etapas);
  preencherSelect(campos.status, statusLista);

  preencherSelect(filtros.colaborador, colaboradores, "Todos os colaboradores");
  preencherSelect(filtros.status, statusLista, "Todos os status");
  preencherSelect(filtros.prioridade, prioridades, "Todas as prioridades");

  form.addEventListener("submit", salvarAtividade);
  btnCancelarEdicao.addEventListener("click", cancelarEdicao);
  btnLimparTudo.addEventListener("click", limparTodosRegistros);
  btnExportarCSV.addEventListener("click", exportarCSV);

  Object.values(filtros).forEach((filtro) => {
    filtro.addEventListener("input", renderizarTabela);
    filtro.addEventListener("change", renderizarTabela);
  });

   if (usuarioAtual) await carregarAtividades();
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
  cadastroForm.hidden = Boolean(user);
  authPanel.hidden = Boolean(user);
  appContent.hidden = !user;
  btnLogout.hidden = !user;
  adminLink.hidden = !adminLogado;
  usuarioLogado.textContent = user ? `${user.nome} (${user.perfil})` : "";
  btnLimparTudo.hidden = !adminLogado;
  document.getElementById("cadastroPerfilWrapper").hidden = !adminLogado;
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
  } catch (erro) {
    alert(`Não foi possível entrar: ${erro.message}`);
  }
}

async function sair() {
  await fetch(AUTH_URL, { method: "DELETE" }).catch(() => null);
  aplicarUsuarioLogado(null);
  atividades = [];
  renderizarTabela();
}

async function cadastrarUsuario(event) {
  event.preventDefault();
  try {
    const data = await fetch(USUARIOS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: document.getElementById("cadastroNome").value,
        usuario: document.getElementById("cadastroUsuario").value,
        senha: document.getElementById("cadastroSenha").value,
        perfil: document.getElementById("cadastroPerfil").value
      })
    }).then(validarResposta);
    cadastroForm.reset();
    alert(`Usuário ${data.nome} cadastrado com sucesso.`);
  } catch (erro) {
    alert(`Não foi possível cadastrar: ${erro.message}`);
  }
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
    colaborador: campos.colaborador.value,
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
    campos.id.value = "";
    btnCancelarEdicao.style.display = "none";
    document.getElementById("btnSalvar").textContent = "Salvar atividade";
    renderizarTabela();
  } catch (erro) {
    alert(`Não foi possível salvar no Supabase: ${erro.message}`);
  } finally {
    setFormDisabled(false);
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
    tabela.innerHTML = `<tr><td colspan="12" class="empty">Carregando atividades do Supabase...</td></tr>`;
    atualizarDashboard();
    return;
  }

  if (!listaFiltrada.length) {
    tabela.innerHTML = `<tr><td colspan="12" class="empty">Nenhuma atividade encontrada.</td></tr>`;
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
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirAtividade(id) {
  const confirmar = confirm("Deseja excluir esta atividade do Supabase?");
  if (!confirmar) return;

  try {
    await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then(validarResposta);
    atividades = atividades.filter((item) => item.id !== id);
    renderizarTabela();
  } catch (erro) {
    alert(`Não foi possível excluir no Supabase: ${erro.message}`);
  }
}

function cancelarEdicao() {
  form.reset();
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
    renderizarTabela();
  } catch (erro) {
    alert(`Não foi possível limpar os registros no Supabase: ${erro.message}`);
  }
}

function atualizarDashboard() {
  document.getElementById("totalAtividades").textContent = atividades.length;
  document.getElementById("totalProgresso").textContent = atividades.filter((a) => a.status === "Em progresso").length;
  document.getElementById("totalAtrasado").textContent = atividades.filter((a) => a.status === "Atrasado").length;
  document.getElementById("totalFinalizado").textContent = atividades.filter((a) => a.status === "Finalizado").length;
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

function formatarData(data) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(data, hora) {
  if (!data && !hora) return "-";
  return `${formatarData(data)}${hora ? ` às ${hora}` : ""}`;
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
