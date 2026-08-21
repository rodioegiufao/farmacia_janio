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
    const lista = classes(), total = duracao(), exige = F.projetoExigeFaseItem(projeto());
    const regra = C.aplicarRegraRateio(lista, total, exige);
    if (lista.length === 1) estado.get(lista[0].chave).minutosDedicados = regra.classificacoes[0].minutosDedicados;
    const r = regra, card = $("rateioTempo"); card.hidden = !C.deveMostrarRateio({ exigeClassificacao: exige, classificacoes: lista, duracaoMinutos: total });
    $("rateioDuracao").textContent = hhmm(total); $("rateioDistribuido").textContent = hhmm(r.distribuido); $("rateioRestante").textContent = `${r.restante < 0 ? "−" : ""}${hhmm(r.restante)}`;
    $("rateioMensagem").textContent = !total ? "Informe o intervalo da atividade." : r.restante > 0 ? `Faltam ${hhmm(r.restante)} para distribuir.` : r.restante < 0 ? `Rateio excede a duração da atividade em ${hhmm(-r.restante)}.` : "Distribuição concluída.";
    $("projeto").setCustomValidity(exige && !lista.length ? "Selecione pelo menos uma Fase e um Item para este Projeto." : "");
    $("btnSalvar").disabled = exige && lista.length > 1 && !r.valido;
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
     $("fasesMultiselect").innerHTML = disponiveis.map((f,i) => `<label class="fase-chip" for="fase-${i}"><input class="visually-hidden" id="fase-${i}" type="checkbox" data-fase="${esc(f)}" ${fases.has(f)?"checked":""}><span>${fases.has(f)?'<i class="fas fa-check" aria-hidden="true"></i> ':""}${esc(f)}</span></label>`).join("");
    $("fasesChips").innerHTML = "";
    $("itensAgrupados").innerHTML = [...fases].map((f,indice) => { const itens=F.obterItensDoProjetoFase(projeto(),f).filter(i=>i!=="Outros"), selecionados=itens.filter(i=>estado.has(C.chaveClassificacao(f,i))).length, tituloId=`fase-card-${indice}`; return `<section class="fase-itens-card" aria-labelledby="${tituloId}"><header><h5 id="${tituloId}">${esc(f)}</h5><span>${selecionados} ${selecionados===1?"selecionado":"selecionados"}</span></header><div class="fase-itens-grid">${itens.map(i=>{const k=C.chaveClassificacao(f,i), marcado=estado.has(k);return `<label class="item-selecao${marcado?" selecionado":""}"><input type="checkbox" data-chave="${esc(k)}" data-fase="${esc(f)}" data-item="${esc(i)}" ${marcado?"checked":""}><span>${esc(i)}</span></label>`}).join("")}</div></section>`; }).join("");
    const temFases=fases.size>0, quantidade=classes().length;
    $("classificacoesVazio").hidden=temFases; $("itensSelecionaveis").hidden=!temFases; $("outrosClassificacoes").hidden=!temFases; $("resumoClassificacoes").hidden=!temFases;
    $("resumoClassificacoes").innerHTML = quantidade ? `<i class="fas fa-check-circle" aria-hidden="true"></i> ${quantidade} ${quantidade===1?"Item selecionado":"Itens selecionados"} em ${fases.size} ${fases.size===1?"Fase":"Fases"}` : "Nenhum Item selecionado.";
    $("itensPersonalizados").querySelectorAll("select").forEach(s => { const atual=s.value;s.innerHTML=[...fases].map(f=>`<option>${esc(f)}</option>`).join("");s.value=atual; }); validar();
  }
  function adicionarPersonalizado(c = {}) { const id = ++personalizados, div=document.createElement("div"); div.className="item-personalizado"; div.dataset.personalizado=id; div.innerHTML=`<label>Nome do Item<input data-nome maxlength="100" value="${esc(c.item||"")}"></label><label>Fase relacionada<select data-fase>${[...fases].map(f=>`<option ${f===c.fase?"selected":""}>${esc(f)}</option>`).join("")}</select></label><button type="button" class="item-personalizado-remover" data-remover aria-label="Remover item personalizado" title="Remover item personalizado"><i class="fas fa-trash-alt" aria-hidden="true"></i></button>`; $("itensPersonalizados").append(div); }
  function removerFase(f) { const n=[...estado.values()].filter(c=>c.fase===f);if(n.length&&!confirm(`${f} possui ${n.length} Itens selecionados. Ao remover esta Fase, esses Itens também serão removidos.`))return false;n.forEach(c=>estado.delete(c.chave));fases.delete(f);return true; }
  function resetarClassificacoesAtividade() {
    fases.clear();
    estado.clear();
    personalizados = 0;
    $("itensPersonalizados").replaceChildren();
    projetoAnterior = projeto();
    render();
  }
  document.addEventListener("change", (e) => {
    if (e.target.matches("#fasesMultiselect input")) { if(e.target.checked) fases.add(e.target.dataset.fase); else if(!removerFase(e.target.dataset.fase)) e.target.checked=true; render(); }
    if (e.target.matches("#itensAgrupados input")) { const {chave,fase,item}=e.target.dataset;e.target.checked?estado.set(chave,{chave,fase,item,minutosDedicados:0}):estado.delete(chave);render(); }
    if (e.target.matches(".rateio-input")) { estado.get(e.target.dataset.chave).minutosDedicados=minutos(e.target.value); validar(); }
    if (e.target.matches(".item-personalizado input,.item-personalizado select")) { const d=e.target.closest(".item-personalizado"), nome=d.querySelector("[data-nome]").value.trim(), fase=d.querySelector("select").value, velha=d.dataset.chave;if(velha)estado.delete(velha);if(nome&&fase){const chave=C.chaveClassificacao(fase,nome);estado.set(chave,{chave,fase,item:nome,itemOutro:true,minutosDedicados:0});d.dataset.chave=chave;}render(); }
    if (["dataInicio","horaInicio","dataTermino","horaTermino"].includes(e.target.id)) validar();
  });
  document.addEventListener("click", (e) => { const alvo=e.target.closest("button"); if(alvo?.id==="adicionarItemPersonalizado"){if(!fases.size)return alert("Selecione uma Fase primeiro.");adicionarPersonalizado();} if(alvo?.dataset.remover!==undefined){const d=alvo.closest(".item-personalizado");if(d.dataset.chave)estado.delete(d.dataset.chave);d.remove();render();} if(alvo?.dataset.removerFase&&removerFase(alvo.dataset.removerFase))render(); if(alvo?.id==="dividirRateio"){C.dividirIgualmente(duracao(),classes().length).forEach((m,i)=>estado.get(classes()[i].chave).minutosDedicados=m);validar();} });
  document.addEventListener("keydown", (e) => { if(e.key==="Enter"&&e.target.matches("#fasesMultiselect input")){e.preventDefault();e.target.click();} });
  let projetoAnterior = projeto();
  ["projeto","projetoOutro"].forEach(id => $(id).addEventListener("change",()=>{
    const novoProjeto = projeto(), possuiDados = estado.size > 0;
    if (novoProjeto !== projetoAnterior && possuiDados && !F.projetoExigeFaseItem(novoProjeto)
      && !confirm("Este Projeto não utiliza Fases e Itens. As classificações e o rateio informados serão removidos.")) {
      if (id === "projeto") $("projeto").value = projetoAnterior;
      else $("projetoOutro").value = projetoAnterior;
      render(); return;
    }
    if (novoProjeto !== projetoAnterior) { fases.clear();estado.clear();$("itensPersonalizados").innerHTML=""; }
    projetoAnterior = projeto(); render();
  }));
  globalThis.ATIVIDADE_CLASSIFICACOES_UI = { obter: classes, carregar(a){ resetarClassificacoesAtividade();if(F.projetoExigeFaseItem(projeto()))C.obterClassificacoesAtividade(a).forEach(c=>{fases.add(c.fase);estado.set(c.chave,{...c});if(c.itemOutro)adicionarPersonalizado(c);});render();}, limpar: resetarClassificacoesAtividade, resetarClassificacoesAtividade, validar };
  render();
})();