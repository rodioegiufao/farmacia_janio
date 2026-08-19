const AUTH_URL = "/api/auth";
const USUARIOS_URL = "/api/usuarios";
const OBRAS_ADMIN_URL = "/api/obras-admin";
const OBRAS_URL = "/api/obras";
let obrasAdmin = [];
let obraAberta = null;

const adminPanel = document.getElementById("adminPanel");
const accessDeniedPanel = document.getElementById("accessDeniedPanel");
const cadastroForm = document.getElementById("cadastroForm");
const usuariosLista = document.getElementById("usuariosLista");
const btnLogout = document.getElementById("btnLogout");
const btnPerfil = document.getElementById("btnPerfil");
const userMenu = document.getElementById("userMenu");
const userMenuTrigger = document.getElementById("userMenuTrigger");
const userMenuPanel = document.getElementById("userMenuPanel");
const usuarioIniciais = document.getElementById("usuarioIniciais");
const usuarioIniciaisMenu = document.getElementById("usuarioIniciaisMenu");
const usuarioLogado = document.getElementById("usuarioLogado");
const usuarioPerfil = document.getElementById("usuarioPerfil");
const adminLink = document.getElementById("adminLink");
const passwordModal = document.getElementById("passwordModal");
const passwordForm = document.getElementById("passwordForm");

inicializarAdmin();

async function inicializarAdmin() {
  cadastroForm.addEventListener("submit", cadastrarUsuario);
  btnLogout.addEventListener("click", sair);
  btnPerfil?.addEventListener("click", abrirPerfil);
  userMenuTrigger.addEventListener("click", alternarMenuUsuario);
  usuariosLista.addEventListener("click", tratarAcaoUsuario);
  passwordForm.addEventListener("submit", salvarNovaSenha);
  document.getElementById("passwordModalClose").addEventListener("click", fecharModalSenha);
  document.getElementById("passwordCancel").addEventListener("click", fecharModalSenha);
  passwordModal.addEventListener("click", (event) => { if (event.target === passwordModal) fecharModalSenha(); });
  document.addEventListener("click", fecharMenuUsuarioAoClicarFora);
  document.addEventListener("keydown", fecharMenuUsuarioComTeclado);
  initThemeSelector();
  inicializarModuloObras();
  await verificarAcessoAdmin();
}

async function verificarAcessoAdmin() {
  try {
    const data = await fetch(AUTH_URL).then(validarResposta);
    const user = data.user;
    const adminLogado = user?.perfil === "admin";

    aplicarUsuarioNoMenu(user);
    adminPanel.hidden = !adminLogado;
    accessDeniedPanel.hidden = adminLogado;

    if (adminLogado) { await carregarUsuarios(); if (new URLSearchParams(location.search).get("obra")) ativarAba("obras"); }
  } catch (_erro) {
    aplicarUsuarioNoMenu(null);
    adminPanel.hidden = true;
    accessDeniedPanel.hidden = false;
  }
}

function aplicarUsuarioNoMenu(user) {
  const adminLogado = user?.perfil === "admin";
  userMenu.hidden = !user;
  adminLink.hidden = !adminLogado;
  usuarioLogado.textContent = user?.nome || "";
  usuarioPerfil.textContent = user?.perfil || "";
  const iniciais = obterIniciais(user?.nome);
  usuarioIniciais.textContent = iniciais;
  usuarioIniciaisMenu.textContent = iniciais;
  if (!user) fecharMenuUsuario();
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
  if (event.key === "Escape") {
    fecharMenuUsuario();
    fecharModalPerfil();
    fecharModalSenha();
  }
}


function garantirModalPerfil() {
  let modal = document.getElementById("profileModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "profileModal";
  modal.className = "profile-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
      <button type="button" class="profile-modal-close" id="profileModalClose" aria-label="Fechar perfil">×</button>
      <h2 id="profileModalTitle">Perfil</h2>
      <p class="profile-modal-help">Atualize seu nome, login ou senha. Deixe a nova senha em branco se não quiser alterá-la.</p>
      <form id="profileForm" class="profile-form">
        <label>Nome<input type="text" id="profileNome" required></label>
        <label>Login<input type="text" id="profileUsuario" autocomplete="username" required></label>
        <label>Senha atual <small>(necessária para trocar a senha)</small><span class="profile-password-field"><input type="password" id="profileSenhaAtual" autocomplete="current-password"><button type="button" class="profile-password-toggle" data-target="profileSenhaAtual" aria-label="Mostrar senha atual" aria-pressed="false">👁</button></span></label>
        <label>Nova senha<span class="profile-password-field"><input type="password" id="profileNovaSenha" autocomplete="new-password" minlength="6"><button type="button" class="profile-password-toggle" data-target="profileNovaSenha" aria-label="Mostrar nova senha" aria-pressed="false">👁</button></span></label>
        <div class="profile-modal-actions">
          <button type="button" id="profileCancel">Cancelar</button>
          <button type="submit">Salvar perfil</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => { if (event.target === modal) fecharModalPerfil(); });
  document.getElementById("profileModalClose")?.addEventListener("click", fecharModalPerfil);
  document.getElementById("profileCancel")?.addEventListener("click", fecharModalPerfil);
  document.getElementById("profileForm")?.addEventListener("submit", salvarPerfil);
  modal.querySelectorAll(".profile-password-toggle").forEach((button) => {
    button.addEventListener("click", alternarVisibilidadeSenhaPerfil);
  });
  return modal;
}
function obterIconeSenhaPerfil(estaVisivel) {
  return estaVisivel
    ? `<svg class="profile-password-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5c5.05 0 8.63 4.06 10 7-1.37 2.94-4.95 7-10 7S3.37 14.94 2 12c1.37-2.94 4.95-7 10-7Zm0 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><circle cx="12" cy="12" r="2.15"/></svg>`
    : `<svg class="profile-password-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3.28 2 18.72 18.72-1.28 1.28-3.3-3.3A10.7 10.7 0 0 1 12 20C6.95 20 3.37 15.94 2 13c.7-1.49 2.01-3.28 3.8-4.71L2 4.49 3.28 2Zm6.22 9.43a3 3 0 0 0 3.91 3.91L9.5 11.43Zm2.5-6.43c5.05 0 8.63 4.06 10 7a13.53 13.53 0 0 1-3.1 4.17l-2.84-2.84A4 4 0 0 0 10.67 7.94L8.85 6.12A10.1 10.1 0 0 1 12 5Z"/></svg>`;
}

function atualizarBotaoSenhaPerfil(button, estaVisivel) {
  button.setAttribute("aria-pressed", String(estaVisivel));
  button.setAttribute("aria-label", `${estaVisivel ? "Ocultar" : "Mostrar"} ${button.dataset.target === "profileSenhaAtual" ? "senha atual" : "nova senha"}`);
  button.innerHTML = obterIconeSenhaPerfil(estaVisivel);
}
function alternarVisibilidadeSenhaPerfil(event) {
  const button = event.currentTarget;
  const input = document.getElementById(button.dataset.target);
  if (!input) return;
  const mostrarSenha = input.type === "password";
  input.type = mostrarSenha ? "text" : "password";
  atualizarBotaoSenhaPerfil(button, false);
}

function redefinirVisibilidadeSenhasPerfil() {
  document.querySelectorAll("#profileSenhaAtual, #profileNovaSenha").forEach((input) => { input.type = "password"; });
  document.querySelectorAll(".profile-password-toggle").forEach((button) => {
    atualizarBotaoSenhaPerfil(button, false);
  });
}
async function abrirPerfil() {
  const data = await fetch(AUTH_URL).then(validarResposta);
  const modal = garantirModalPerfil();
  document.getElementById("profileNome").value = data.user?.nome || "";
  document.getElementById("profileUsuario").value = data.user?.usuario || "";
  document.getElementById("profileSenhaAtual").value = "";
  document.getElementById("profileNovaSenha").value = "";
  redefinirVisibilidadeSenhasPerfil();
  fecharMenuUsuario();
  modal.hidden = false;
  document.getElementById("profileNome")?.focus();
}

function fecharModalPerfil() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.hidden = true;
}

async function salvarPerfil(event) {
  event.preventDefault();
  try {
    const data = await fetch(AUTH_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: document.getElementById("profileNome").value,
        usuario: document.getElementById("profileUsuario").value,
        senhaAtual: document.getElementById("profileSenhaAtual").value,
        novaSenha: document.getElementById("profileNovaSenha").value
      })
    }).then(validarResposta);
    aplicarUsuarioNoMenu(data.user);
    fecharModalPerfil();
    alert("Perfil atualizado com sucesso.");
  } catch (erro) {
    alert(`Não foi possível atualizar o perfil: ${erro.message}`);
  }
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
    await carregarUsuarios();
  } catch (erro) {
    alert(`Não foi possível cadastrar: ${erro.message}`);
  }
}

async function carregarUsuarios() {
  try {
    const usuarios = await fetch(USUARIOS_URL).then(validarResposta);
    usuariosLista.innerHTML = usuarios.map((user) => `
      <article class="user-card">
        <strong>${escapeHtml(user.nome)}</strong>
        <span>Usuário: ${escapeHtml(user.usuario)}</span>
        <span>Perfil: ${escapeHtml(user.perfil)}</span>
        <span>Status: ${user.ativo ? "Ativo" : "Inativo"}</span>
        <button type="button" class="user-password-button" data-user-id="${escapeHtml(user.id)}" data-user-name="${escapeHtml(user.nome)}">
          <i class="fa-solid fa-key" aria-hidden="true"></i>
          Alterar senha
        </button>
      </article>
    `).join("");
  } catch (erro) {
    usuariosLista.innerHTML = `<p class="help-text">${escapeHtml(erro.message)}</p>`;
  }
}
function tratarAcaoUsuario(event) {
  const button = event.target.closest(".user-password-button");
  if (!button) return;

  passwordForm.reset();
  document.getElementById("passwordUserId").value = button.dataset.userId;
  document.getElementById("passwordUserName").textContent = button.dataset.userName;
  passwordModal.hidden = false;
  document.getElementById("passwordNew").focus();
}

function fecharModalSenha() {
  passwordModal.hidden = true;
  passwordForm.reset();
}

async function salvarNovaSenha(event) {
  event.preventDefault();
  const senha = document.getElementById("passwordNew").value;
  const confirmacao = document.getElementById("passwordConfirm").value;

  if (senha !== confirmacao) {
    alert("As senhas informadas não coincidem.");
    return;
  }

  try {
    const data = await fetch(USUARIOS_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: document.getElementById("passwordUserId").value,
        senha
      })
    }).then(validarResposta);

    fecharModalSenha();
    alert(`Senha de ${data.nome} alterada com sucesso.`);
  } catch (erro) {
    alert(`Não foi possível alterar a senha: ${erro.message}`);
  }
}
async function sair() {
  await fetch(AUTH_URL, { method: "DELETE" }).catch(() => null);
  window.location.href = "/atividades/";
}

async function validarResposta(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Erro inesperado na comunicação com o servidor.");
  }
  return data;
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
const TIPOLOGIAS_SEGMENTO = {
  "Saúde": ["Hospital", "Clínica", "UBS", "UPA", "Laboratório", "Centro de Diagnóstico", "Hemocentro", "Outro"], "Educação": ["Creche", "Escola", "Universidade", "Centro de Formação", "Campus", "Outro"],
  "Institucional": ["Administrativo", "Tribunal", "Fórum", "Órgão Público", "Prefeitura", "Câmara", "Outro"], "Penitenciário": ["Penitenciária", "Cadeia Pública", "Centro de Detenção", "Bloco Prisional", "Outro"],
  "Comercial": ["Loja", "Shopping", "Supermercado", "Restaurante", "Posto de Combustível", "Escritório", "Outro"], "Industrial": ["Indústria", "Fábrica", "Oficina", "Galpão Industrial", "Outro"],
  "Residencial": ["Residência", "Edifício Residencial", "Condomínio", "Outro"], "Hotelaria": ["Hotel", "Pousada", "Resort", "Outro"], "Cultural": ["Teatro", "Auditório", "Museu", "Biblioteca", "Centro Cultural", "Outro"],
  "Esportivo": ["Ginásio", "Estádio", "Quadra", "Centro Esportivo", "Outro"], "Laboratorial": ["Laboratório de Pesquisa", "Laboratório Clínico", "Biotério", "Planta Piloto", "Outro"], "Infraestrutura": ["Subestação", "Rede Externa", "Urbanização", "Via", "Loteamento", "Outro"], "Outro": ["Outro"]
};
const INTERVENCOES_ADMIN = ["Obra nova", "Reforma", "Ampliação", "Retrofit", "Adequação", "Regularização", "As built", "Outro"];
const rotuloStatus = { cadastro_minimo: "⚪ Cadastro mínimo", parcial: "🟡 Parcial", caracterizada: "🟢 Caracterizada", nao_aplicavel: "⚫ Não aplicável" };
const rotuloCategoria = { empreendimento: "Empreendimento físico", interno: "Atividade interna", estudo: "Estudo / oportunidade", outro: "Outro" };

function inicializarModuloObras() {
  document.querySelectorAll("[data-admin-tab]").forEach((button) => button.addEventListener("click", () => ativarAba(button.dataset.adminTab)));
  ["obrasBusca", "obrasFiltroFicha", "obrasFiltroCategoria", "obrasFiltroNatureza", "obrasFiltroBenchmark", "obrasFiltroAtivo"].forEach((id) => document.getElementById(id)?.addEventListener("input", renderizarObras));
  document.getElementById("novaObra")?.addEventListener("click", criarObraAdmin);
  document.getElementById("obrasTabela")?.addEventListener("click", (event) => { const id = event.target.closest("[data-obra-id]")?.dataset.obraId; if (id) abrirFicha(id); });
}
async function ativarAba(aba) {
  document.querySelectorAll("[data-admin-tab]").forEach((item) => item.classList.toggle("active", item.dataset.adminTab === aba));
  document.getElementById("adminUsuarios").hidden = aba !== "usuarios"; document.getElementById("adminObras").hidden = aba !== "obras";
  if (aba === "obras" && !obrasAdmin.length) await carregarObras();
}
async function carregarObras() {
  document.getElementById("obrasTabela").innerHTML = "<p>Carregando obras...</p>";
  try { obrasAdmin = await fetch(OBRAS_ADMIN_URL).then(validarResposta); renderizarIndicadores(); renderizarObras(); const direta = new URLSearchParams(location.search).get("obra"); if (direta) await abrirFicha(direta); }
  catch (erro) { document.getElementById("obrasTabela").innerHTML = `<p class="admin-message error">${escapeHtml(erro.message)}</p>`; }
}
function renderizarIndicadores() {
  const contagem = (status) => obrasAdmin.filter((obra) => obra.statusFicha === status).length;
  const dados = [[obrasAdmin.length, "Total de obras"], [contagem("cadastro_minimo"), "Cadastros mínimos"], [contagem("parcial"), "Parciais"], [contagem("caracterizada"), "Caracterizadas"], [contagem("nao_aplicavel"), "Não aplicáveis"], [obrasAdmin.filter((o) => o.caracteristica?.benchmark_status === "incluir").length, "Benchmark"]];
  document.getElementById("obrasIndicadores").innerHTML = dados.map(([n, r]) => `<div><strong>${n}</strong><span>${r}</span></div>`).join("");
}
function renderizarObras() {
  const busca = document.getElementById("obrasBusca").value.trim().toLowerCase(); const ficha = document.getElementById("obrasFiltroFicha").value; const categoria = document.getElementById("obrasFiltroCategoria").value; const natureza = document.getElementById("obrasFiltroNatureza").value; const benchmark = document.getElementById("obrasFiltroBenchmark").value; const ativo = document.getElementById("obrasFiltroAtivo").value;
  const lista = obrasAdmin.filter((o) => (!busca || `${o.codigo} ${o.nome}`.toLowerCase().includes(busca)) && (!ficha || o.statusFicha === ficha) && (!categoria || o.caracteristica?.categoria_registro === categoria) && (!natureza || o.caracteristica?.natureza === natureza) && (!benchmark || (o.caracteristica?.benchmark_status || "nao_avaliado") === benchmark) && (ativo === "" || String(o.ativo) === ativo));
  if (!lista.length) return void (document.getElementById("obrasTabela").innerHTML = "<p>Nenhuma obra encontrada.</p>");
  document.getElementById("obrasTabela").innerHTML = `<table><thead><tr><th>Código</th><th>Obra</th><th>Categoria</th><th>Caracterização</th><th>Benchmark</th><th>Projetos</th><th>Status</th><th>Ações</th></tr></thead><tbody>${lista.map((o) => `<tr><td><strong>${escapeHtml(o.codigo)}</strong></td><td>${escapeHtml(o.nome)}</td><td>${escapeHtml(rotuloCategoria[o.caracteristica?.categoria_registro] || "—")}</td><td>${rotuloStatus[o.statusFicha]}</td><td>${o.caracteristica?.benchmark_status === "incluir" ? "✓ Incluir" : o.caracteristica?.benchmark_status === "excluir" ? "Excluir" : "Não avaliado"}</td><td>${o.quantidadeProjetos || "—"}</td><td>${o.ativo ? "Ativa" : "Inativa"}</td><td><button data-obra-id="${o.id}">${o.statusFicha === "cadastro_minimo" ? "Caracterizar" : "Abrir"}</button></td></tr>`).join("")}</tbody></table>`;
}
async function criarObraAdmin() {
  const nome = prompt("Nome da obra:"); if (!nome?.trim()) return;
  try { const obra = await fetch(OBRAS_ADMIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "criar", nome }) }).then(validarResposta); await carregarObras(); await abrirFicha(obra.id); }
  catch (erro) { mostrarMensagemObra(erro.message, true); }
}
async function abrirFicha(id) {
  try { obraAberta = await fetch(`${OBRAS_ADMIN_URL}?id=${encodeURIComponent(id)}`).then(validarResposta); history.replaceState(null, "", `?obra=${encodeURIComponent(id)}`); renderizarFicha(); }
  catch (erro) { mostrarMensagemObra(erro.message, true); }
}
function opcoes(valores, atual = "") { return `<option value="">Selecione</option>${valores.map((v) => `<option ${v === atual ? "selected" : ""}>${escapeHtml(v)}</option>`).join("")}`; }
function renderizarFicha() {
  const o = obraAberta, c = o.caracteristica || {}, principal = o.tipologias.find((t) => t.principal) || {}, complementares = o.tipologias.filter((t) => !t.principal).map((t) => t.tipologia).join(", ");
  const projetosCanonicos = (globalThis.PROJETOS_PLANNER || []).map((p) => `<option value="${escapeHtml(p.projeto)}" data-codigo="${escapeHtml(p.codigoProjeto)}"></option>`).join("");
  document.getElementById("adminObrasLista").hidden = true; const painel = document.getElementById("adminObraFicha"); painel.hidden = false;
  painel.innerHTML = `<button type="button" id="voltarObras" class="admin-back">← Voltar para Obras</button><form id="obraFichaForm" class="admin-obra-ficha-form">
  <header class="admin-obra-ficha-header"><div><span>${escapeHtml(o.codigo)}</span><h2>${escapeHtml(o.nome)}</h2><p>${rotuloStatus[o.statusFicha]} · Ficha técnica: ${o.completude}%</p></div><div><button type="button" id="alternarObra">${o.ativo ? "Desativar obra" : "Reativar obra"}</button><button class="primary" id="salvarFicha">Salvar alterações</button></div></header><div id="obraMensagem"></div>
  <section><h3>1. Identificação</h3><div class="admin-obra-ficha-grid"><label>Código<input value="${escapeHtml(o.codigo)}" readonly></label><label>Nome da obra<input id="fNome" value="${escapeHtml(o.nome)}" required></label><label>Status<input value="${o.ativo ? "Ativa" : "Inativa"}" readonly></label></div></section>
  <section><h3>2. Classificação e tipologias</h3><div class="admin-obra-ficha-grid"><label>Este registro representa<select id="fCategoria">${[["","Selecione"],["empreendimento","Empreendimento físico"],["interno","Atividade interna / administrativa"],["estudo","Estudo / oportunidade"],["outro","Outro"]].map(([v,r])=>`<option value="${v}" ${c.categoria_registro===v?"selected":""}>${r}</option>`).join("")}</select></label><label>Natureza<select id="fNatureza"><option value="">Selecione</option>${[["publico","Público"],["privado","Privado"],["misto","Misto"],["nao_informado","Não informado"]].map(([v,r])=>`<option value="${v}" ${c.natureza===v?"selected":""}>${r}</option>`).join("")}</select></label><label>Segmento principal<select id="fSegmento">${opcoes(Object.keys(TIPOLOGIAS_SEGMENTO), principal.segmento)}</select></label><label>Tipologia principal<select id="fTipologia"></select></label><label>Tipologias complementares<input id="fComplementares" value="${escapeHtml(complementares)}" placeholder="Separadas por vírgula"></label></div><label class="admin-check"><input type="checkbox" id="fNaoAplicavel" ${c.caracterizacao_nao_aplicavel?"checked":""}> Caracterização física não aplicável</label></section>
  <section id="camposFisicos"><h3>3. Características físicas</h3><div class="admin-obra-ficha-grid">${[["fAreaTotal","Área total construída (m²)",c.area_total_construida],["fAreaIntervencao","Área de intervenção (m²)",c.area_intervencao],["fAreaExterna","Área externa de intervenção (m²)",c.area_externa_intervencao],["fAreaCobertura","Área de cobertura (m²)",c.area_cobertura],["fPavimentos","Pavimentos acima do solo",c.pavimentos_acima],["fSubsolos","Subsolos",c.subsolos],["fBlocos","Blocos / edificações",c.numero_blocos]].map(([id,r,v],i)=>`<label>${r}<input id="${id}" type="number" min="0" ${i>3?'step="1"':'step="any"'} value="${v??""}"></label>`).join("")}</div></section>
  <section><h3>4. Intervenções</h3><div class="admin-checkboxes">${INTERVENCOES_ADMIN.map((v)=>`<label><input type="checkbox" name="intervencao" value="${v}" ${o.intervencoes.includes(v)?"checked":""}> ${v}</label>`).join("")}</div></section>
  <section><h3>5. Projetos da Obra</h3><datalist id="projetosCanonicos">${projetosCanonicos}</datalist><div id="projetosFicha">${o.projetos.map(linhaProjeto).join("")}</div><button type="button" id="adicionarProjeto">+ Adicionar projeto</button>${o.projetosDetectados.length?`<div class="admin-detectados"><strong>Projetos detectados no histórico:</strong><p>${o.projetosDetectados.map(p=>`✓ ${escapeHtml(p.projeto)}`).join(" · ")}</p><button type="button" id="sincronizarProjetos">Sincronizar projetos detectados</button></div>`:""}</section>
  <section><h3>6. Elegibilidade para análises históricas</h3><div class="admin-obra-ficha-grid"><label>Benchmark<select id="fBenchmark"><option value="nao_avaliado" ${(!c.benchmark_status||c.benchmark_status==='nao_avaliado')?'selected':''}>Não avaliado</option><option value="incluir" ${c.benchmark_status==='incluir'?'selected':''}>Incluir no Benchmark</option><option value="excluir" ${c.benchmark_status==='excluir'?'selected':''}>Excluir do Benchmark</option></select></label><label id="motivoWrap">Motivo<select id="fMotivo">${[["","Selecione"],["atividade_interna","Atividade interna"],["dados_incompletos","Dados históricos incompletos"],["projeto_excepcional","Projeto excepcional"],["escopo_nao_comparavel","Escopo não comparável"],["projeto_cancelado","Projeto cancelado"],["outro","Outro"]].map(([v,r])=>`<option value="${v}" ${c.benchmark_motivo===v?'selected':''}>${r}</option>`).join("")}</select></label><label id="motivoOutroWrap">Outro motivo<input id="fMotivoOutro" value="${escapeHtml(c.benchmark_motivo_outro||"")}"></label></div></section>
  <section><h3>7. Observações e auditoria</h3><label>Observações da ficha<textarea id="fObservacoes" rows="4">${escapeHtml(c.observacoes||"")}</textarea></label><p class="admin-auditoria">Origem: ${escapeHtml(o.origemCriacao||"sistema")} · Criada em ${escapeHtml(o.criadoEm||"não informado")} · Última alteração ${escapeHtml(c.atualizado_em||"ainda não realizada")}</p></section></form>`;
  configurarFicha(principal.tipologia);
}
function linhaProjeto(p={}) { return `<div class="admin-projeto-row"><input class="pNome" list="projetosCanonicos" placeholder="Projeto" value="${escapeHtml(p.projeto||"")}"><input class="pCodigo" placeholder="Código" value="${escapeHtml(p.codigo_projeto||"")}"><input class="pArea" type="number" min="0" step="any" placeholder="Área intervenção" value="${p.area_intervencao??""}"><input class="pExterna" type="number" min="0" step="any" placeholder="Área externa" value="${p.area_externa??""}"><input class="pCobertura" type="number" min="0" step="any" placeholder="Área cobertura" value="${p.area_cobertura??""}"><input class="pPavimentos" type="number" min="0" step="1" placeholder="Pavimentos" value="${p.pavimentos_atendidos??""}"><input class="pObs" placeholder="Observações" value="${escapeHtml(p.observacoes||"")}"><input class="pOrigem" type="hidden" value="${escapeHtml(p.origem||"manual")}"><button type="button" class="removerProjeto" aria-label="Remover">×</button></div>`; }
function configurarFicha(tipologiaAtual) {
  const segmento = document.getElementById("fSegmento"), tipologia = document.getElementById("fTipologia");
  const atualizarTipologias = () => { const atual = tipologia.value || tipologiaAtual; tipologia.innerHTML = opcoes(TIPOLOGIAS_SEGMENTO[segmento.value] || [], atual); tipologiaAtual = ""; };
  const atualizarCondicionais = () => { const nao = document.getElementById("fNaoAplicavel").checked; document.getElementById("camposFisicos").hidden = nao; if (nao && document.getElementById("fBenchmark").value === "incluir") document.getElementById("fBenchmark").value = "nao_avaliado"; const excluir = document.getElementById("fBenchmark").value === "excluir"; document.getElementById("motivoWrap").hidden = !excluir; document.getElementById("motivoOutroWrap").hidden = !excluir || document.getElementById("fMotivo").value !== "outro"; };
  atualizarTipologias(); atualizarCondicionais(); segmento.addEventListener("change", atualizarTipologias); document.getElementById("fNaoAplicavel").addEventListener("change", atualizarCondicionais); document.getElementById("fBenchmark").addEventListener("change", atualizarCondicionais); document.getElementById("fMotivo").addEventListener("change", atualizarCondicionais);
  document.getElementById("voltarObras").addEventListener("click", voltarObras); document.getElementById("obraFichaForm").addEventListener("submit", salvarFicha);
  document.getElementById("alternarObra").addEventListener("click", alternarObra); document.getElementById("adicionarProjeto").addEventListener("click", () => document.getElementById("projetosFicha").insertAdjacentHTML("beforeend", linhaProjeto()));
  document.getElementById("projetosFicha").addEventListener("click", (e) => e.target.closest(".removerProjeto")?.closest(".admin-projeto-row")?.remove());
  document.getElementById("sincronizarProjetos")?.addEventListener("click", sincronizarProjetos);
}
function voltarObras() { history.replaceState(null, "", location.pathname); document.getElementById("adminObraFicha").hidden = true; document.getElementById("adminObrasLista").hidden = false; obraAberta = null; }
function valor(id) { return document.getElementById(id).value; }
function projetosFormulario() { return [...document.querySelectorAll(".admin-projeto-row")].map((r) => ({ projeto: r.querySelector(".pNome").value, codigoProjeto: r.querySelector(".pCodigo").value, areaIntervencao: r.querySelector(".pArea").value, areaExterna: r.querySelector(".pExterna").value, areaCobertura: r.querySelector(".pCobertura").value, pavimentosAtendidos: r.querySelector(".pPavimentos").value, observacoes: r.querySelector(".pObs").value, origem: r.querySelector(".pOrigem").value })).filter((p) => p.projeto.trim()); }
async function salvarFicha(event) {
  event.preventDefault(); const botao = document.getElementById("salvarFicha"); botao.disabled = true; botao.textContent = "Salvando...";
  try {
    if (valor("fNome").trim() !== obraAberta.nome) await fetch(OBRAS_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: obraAberta.id, nome: valor("fNome"), ativo: obraAberta.ativo }) }).then(validarResposta);
    const principal = valor("fTipologia") ? [{ segmento: valor("fSegmento"), tipologia: valor("fTipologia"), principal: true }] : [];
    const complementares = valor("fComplementares").split(",").map((v) => v.trim()).filter(Boolean).map((tipologia) => ({ segmento: valor("fSegmento") || "Outro", tipologia, principal: false }));
    const body = { obraId: obraAberta.id, categoriaRegistro: valor("fCategoria"), natureza: valor("fNatureza"), caracterizacaoNaoAplicavel: document.getElementById("fNaoAplicavel").checked, areaTotalConstruida: valor("fAreaTotal"), areaIntervencao: valor("fAreaIntervencao"), areaExternaIntervencao: valor("fAreaExterna"), areaCobertura: valor("fAreaCobertura"), pavimentosAcima: valor("fPavimentos"), subsolos: valor("fSubsolos"), numeroBlocos: valor("fBlocos"), tipologias: [...principal, ...complementares], intervencoes: [...document.querySelectorAll('[name="intervencao"]:checked')].map((i) => i.value), projetos: projetosFormulario(), benchmarkStatus: valor("fBenchmark"), benchmarkMotivo: valor("fMotivo"), benchmarkMotivoOutro: valor("fMotivoOutro"), observacoes: valor("fObservacoes") };
    await fetch(OBRAS_ADMIN_URL, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(validarResposta); mostrarMensagemObra("✓ Ficha técnica atualizada."); await carregarObras(); await abrirFicha(obraAberta.id);
  } catch (erro) { mostrarMensagemObra(`⚠ ${erro.message}`, true); } finally { botao.disabled = false; botao.textContent = "Salvar alterações"; }
}
async function alternarObra() { try { await fetch(OBRAS_URL, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: obraAberta.id, nome: valor("fNome"), ativo: !obraAberta.ativo }) }).then(validarResposta); await carregarObras(); await abrirFicha(obraAberta.id); } catch (erro) { mostrarMensagemObra(erro.message, true); } }
async function sincronizarProjetos() { try { await fetch(OBRAS_ADMIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "sincronizarProjetos", obraId: obraAberta.id }) }).then(validarResposta); await abrirFicha(obraAberta.id); } catch (erro) { mostrarMensagemObra(erro.message, true); } }
function mostrarMensagemObra(mensagem, erro = false) { const alvo = document.getElementById("obraMensagem") || document.getElementById("obrasTabela"); if (alvo) alvo.innerHTML = `<p class="admin-message ${erro ? "error" : "success"}">${escapeHtml(mensagem)}</p>`; }