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

const STORAGE_KEY = "rl_atividades_colaboradores";

const form = document.getElementById("atividadeForm");
const tabela = document.getElementById("atividadesTabela");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
const btnLimparTudo = document.getElementById("btnLimparTudo");
const btnExportarCSV = document.getElementById("btnExportarCSV");

let atividades = carregarAtividades();

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

function inicializar() {
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

  renderizarTabela();
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

function salvarAtividade(event) {
  event.preventDefault();

  const atividade = {
    id: campos.id.value || crypto.randomUUID(),
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
    criadoEm: new Date().toISOString()
  };

  const indice = atividades.findIndex((item) => item.id === atividade.id);

  if (indice >= 0) {
    atividades[indice] = atividade;
  } else {
    atividades.unshift(atividade);
  }

  salvarNoStorage();
  form.reset();
  campos.id.value = "";
  btnCancelarEdicao.style.display = "none";
  document.getElementById("btnSalvar").textContent = "Salvar atividade";
  renderizarTabela();
}

function statusAtualizado(statusInformado, dataPrevista) {
  if (statusInformado === "Finalizado" || statusInformado === "Pausado") return statusInformado;

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

  if (!listaFiltrada.length) {
    tabela.innerHTML = `<tr><td colspan="12" class="empty">Nenhuma atividade encontrada.</td></tr>`;
    atualizarDashboard();
    return;
  }

  listaFiltrada.forEach((atividade) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${atividade.colaborador}</td>
      <td>${atividade.obra}</td>
      <td><span class="badge ${classePrioridade(atividade.prioridade)}">${atividade.prioridade}</span></td>
      <td>${atividade.projeto}</td>
      <td>${atividade.trabalhos}</td>
      <td>${atividade.etapa}</td>
      <td>${formatarDataHora(atividade.dataInicio, atividade.horaInicio)}</td>
      <td>${formatarDataHora(atividade.dataTermino, atividade.horaTermino)}</td>
      <td>${formatarData(atividade.dataPrevista)}</td>
      <td><span class="badge ${classeStatus(atividade.status)}">${atividade.status}</span></td>
      <td>${atividade.observacoes || "-"}</td>
      <td>
        <div class="actions">
          <button type="button" class="secondary" onclick="editarAtividade('${atividade.id}')">Editar</button>
          <button type="button" class="ghost" onclick="excluirAtividade('${atividade.id}')">Excluir</button>
        </div>
      </td>
    `;
    tabela.appendChild(tr);
  });

  atualizarDashboard();
}

function atualizarStatusAtrasadoAutomaticamente() {
  let houveAlteracao = false;

  atividades = atividades.map((atividade) => {
    const novoStatus = statusAtualizado(atividade.status, atividade.dataPrevista);
    if (novoStatus !== atividade.status) {
      houveAlteracao = true;
      return { ...atividade, status: novoStatus };
    }
    return atividade;
  });

  if (houveAlteracao) salvarNoStorage();
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

function excluirAtividade(id) {
  const confirmar = confirm("Deseja excluir esta atividade?");
  if (!confirmar) return;

  atividades = atividades.filter((item) => item.id !== id);
  salvarNoStorage();
  renderizarTabela();
}

function cancelarEdicao() {
  form.reset();
  campos.id.value = "";
  btnCancelarEdicao.style.display = "none";
  document.getElementById("btnSalvar").textContent = "Salvar atividade";
}

function limparTodosRegistros() {
  const confirmar = confirm("Deseja apagar todos os registros salvos neste navegador?");
  if (!confirmar) return;

  atividades = [];
  salvarNoStorage();
  renderizarTabela();
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

function carregarAtividades() {
  const dados = localStorage.getItem(STORAGE_KEY);

  if (dados) {
    try {
      return JSON.parse(dados);
    } catch (erro) {
      console.error("Erro ao carregar atividades:", erro);
    }
  }

  return [
    {
      id: crypto.randomUUID(),
      colaborador: "Bruno",
      obra: "",
      prioridade: "P3",
      projeto: "Elétrico Baixa Tensão",
      trabalhos: "Plotando o Frajola que o Bruno enviou",
      etapa: "AutoCAD",
      dataInicio: "2026-05-22",
      horaInicio: "15:55",
      dataTermino: "2026-05-22",
      horaTermino: "00:00",
      dataPrevista: "2026-06-05",
      status: "Finalizado",
      observacoes: "Atividade importada como exemplo da planilha enviada.",
      criadoEm: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      colaborador: "Bruno",
      obra: "",
      prioridade: "P3",
      projeto: "Elétrico Baixa Tensão",
      trabalhos: "Plotagem ainda não terminada; foi colocado no Drive o que foi feito.",
      etapa: "AutoCAD",
      dataInicio: "2026-05-22",
      horaInicio: "18:06",
      dataTermino: "",
      horaTermino: "",
      dataPrevista: "",
      status: "Em progresso",
      observacoes: "Atividade importada como exemplo da planilha enviada.",
      criadoEm: new Date().toISOString()
    }
  ];
}

function salvarNoStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atividades));
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
