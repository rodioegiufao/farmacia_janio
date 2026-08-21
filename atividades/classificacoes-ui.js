(function () {
  "use strict";
  const C = globalThis.CLASSIFICACOES_ATIVIDADE, F = globalThis.FASE_ITEM_ATIVIDADE;
  const $ = (id) => document.getElementById(id), estado = new Map(); let fases = new Set(), personalizados = 0;
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const hhmm = (m) => `${String(Math.floor(Math.abs(m) / 60)).padStart(2,"0")}:${String(Math.abs(m) % 60).padStart(2,"0")}`;
  const minutos = (v) => { const m = /^(\d{1,4}):([0-5]\d)$/.exec(v || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
  const projeto = () => $("projeto").value === "Outros" ? $("projetoOutro").value.trim() : $("projeto").value;
  const classes = () => [...estado.values()].filter((c) => c.fase && c.item).map((c) => ({ ...c, minutosDedicados: Number(c.minutosDedicados) || 0 }));
  function duracao() { return C.duracaoAtividadeMinutos({ dataInicio: $("dataInicio").value, horaInicio: $("horaInicio").value, dataTermino: $("dataTermino").value, horaTermino: $("horaTermino").value }); }
  function validar() {
    const lista = classes(), total = duracao();
    if (lista.length === 1) { lista[0].minutosDedicados = total; estado.get(lista[0].chave).minutosDedicados = total; }
    const r = C.validarRateio(lista, total), card = $("rateioTempo"); card.hidden = !lista.length;
    $("rateioDuracao").textContent = hhmm(total); $("rateioDistribuido").textContent = hhmm(r.distribuido); $("rateioRestante").textContent = `${r.restante < 0 ? "−" : ""}${hhmm(r.restante)}`;
    $("rateioMensagem").textContent = !total ? "Informe o intervalo da atividade." : r.restante > 0 ? `Faltam ${hhmm(r.restante)} para distribuir.` : r.restante < 0 ? `Rateio excede a duração da atividade em ${hhmm(-r.restante)}.` : "Distribuição concluída.";
    $("btnSalvar").disabled = F.projetoExigeFaseItem(projeto()) && !r.valido;
    renderRateio();
  }
  function renderRateio() {
    const lista = classes(), porFase = Map.groupBy ? Map.groupBy(lista, c => c.fase) : lista.reduce((m,c)=>(m.set(c.fase,[...(m.get(c.fase)||[]),c]),m),new Map());
    $("rateioLinhas").innerHTML = lista.length <= 1 ? (lista[0] ? `<p>Tempo atribuído: <strong>${hhmm(lista[0].minutosDedicados)}</strong></p>` : "") : [...porFase].map(([fase, cs]) => `<fieldset><legend>${esc(fase)}</legend>${cs.map(c => `<label>${esc(c.item)}<input class="rateio-input" data-chave="${esc(c.chave)}" inputmode="numeric" pattern="\\d+:[0-5]\\d" value="${hhmm(c.minutosDedicados)}" aria-label="Tempo dedicado a ${esc(fase)} — ${esc(c.item)}"></label>`).join("")}</fieldset>`).join("");
  }
  function render() {
    const suportado = F.projetoExigeFaseItem(projeto()); $("classificacoesField").hidden = !suportado;
    if (!suportado) { fases.clear(); estado.clear(); validar(); return; }
    const disponiveis = F.obterFasesDoProjeto(projeto()).filter(f => f !== "Outros");
    $("fasesMultiselect").innerHTML = disponiveis.map(f => `<label><input type="checkbox" data-fase="${esc(f)}" ${fases.has(f)?"checked":""}> ${esc(f)}</label>`).join("");
    $("fasesChips").innerHTML = [...fases].map(f => `<button type="button" data-remover-fase="${esc(f)}">${esc(f)} ×</button>`).join("");
    $("itensAgrupados").innerHTML = [...fases].map(f => `<fieldset><legend>${esc(f)}</legend>${F.obterItensDoProjetoFase(projeto(),f).filter(i=>i!=="Outros").map(i=>{const k=C.chaveClassificacao(f,i);return `<label><input type="checkbox" data-chave="${esc(k)}" data-fase="${esc(f)}" data-item="${esc(i)}" ${estado.has(k)?"checked":""}> ${esc(i)}</label>`}).join("")}</fieldset>`).join("");
    $("resumoClassificacoes").textContent = `${classes().length} ${classes().length===1?"item selecionado":"itens selecionados"} em ${fases.size} ${fases.size===1?"Fase":"Fases"}.`;
    $("itensPersonalizados").querySelectorAll("select").forEach(s => { const atual=s.value;s.innerHTML=[...fases].map(f=>`<option>${esc(f)}</option>`).join("");s.value=atual; }); validar();
  }
  function adicionarPersonalizado(c = {}) { const id = ++personalizados, div=document.createElement("div"); div.className="item-personalizado"; div.dataset.personalizado=id; div.innerHTML=`<label>Nome do Item<input data-nome maxlength="100" value="${esc(c.item||"")}"></label><label>Fase relacionada<select data-fase>${[...fases].map(f=>`<option ${f===c.fase?"selected":""}>${esc(f)}</option>`).join("")}</select></label><button type="button" data-remover>Remover</button>`; $("itensPersonalizados").append(div); }
  document.addEventListener("change", (e) => {
    if (e.target.matches("#fasesMultiselect input")) { e.target.checked ? fases.add(e.target.dataset.fase) : fases.delete(e.target.dataset.fase); render(); }
    if (e.target.matches("#itensAgrupados input")) { const {chave,fase,item}=e.target.dataset;e.target.checked?estado.set(chave,{chave,fase,item,minutosDedicados:0}):estado.delete(chave);render(); }
    if (e.target.matches(".rateio-input")) { estado.get(e.target.dataset.chave).minutosDedicados=minutos(e.target.value); validar(); }
    if (e.target.matches(".item-personalizado input,.item-personalizado select")) { const d=e.target.closest(".item-personalizado"), nome=d.querySelector("[data-nome]").value.trim(), fase=d.querySelector("select").value, velha=d.dataset.chave;if(velha)estado.delete(velha);if(nome&&fase){const chave=C.chaveClassificacao(fase,nome);estado.set(chave,{chave,fase,item:nome,itemOutro:true,minutosDedicados:0});d.dataset.chave=chave;}render(); }
    if (["dataInicio","horaInicio","dataTermino","horaTermino"].includes(e.target.id)) validar();
  });
  document.addEventListener("click", (e) => { if(e.target.id==="adicionarItemPersonalizado"){if(!fases.size)return alert("Selecione uma Fase primeiro.");adicionarPersonalizado();} if(e.target.dataset.remover!==undefined){const d=e.target.closest(".item-personalizado");if(d.dataset.chave)estado.delete(d.dataset.chave);d.remove();render();} if(e.target.dataset.removerFase){const f=e.target.dataset.removerFase,n=[...estado.values()].filter(c=>c.fase===f);if(n.length&&!confirm(`${f} possui ${n.length} Itens selecionados. Ao remover esta Fase, esses Itens também serão removidos.`))return;n.forEach(c=>estado.delete(c.chave));fases.delete(f);render();} if(e.target.id==="dividirRateio"){C.dividirIgualmente(duracao(),classes().length).forEach((m,i)=>estado.get(classes()[i].chave).minutosDedicados=m);validar();} });
  ["projeto","projetoOutro"].forEach(id => $(id).addEventListener("change",()=>{fases.clear();estado.clear();$("itensPersonalizados").innerHTML="";render();}));
  globalThis.ATIVIDADE_CLASSIFICACOES_UI = { obter: classes, carregar(a){ fases.clear();estado.clear();$("itensPersonalizados").innerHTML="";C.obterClassificacoesAtividade(a).forEach(c=>{fases.add(c.fase);estado.set(c.chave,{...c});if(c.itemOutro)adicionarPersonalizado(c);});render();}, limpar(){fases.clear();estado.clear();$("itensPersonalizados").innerHTML="";render();}, validar };
  render();
})();