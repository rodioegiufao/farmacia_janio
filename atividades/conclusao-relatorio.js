(function (root, factory) {
  const classificacoes = root?.CLASSIFICACOES_ATIVIDADE || (typeof require === "function" ? require("./classificacoes") : null);
  const api = factory(classificacoes);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CONCLUSAO_RELATORIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (CLASSIFICACOES) {
  "use strict";

  /*
   * Motor da conclusão dos relatórios.
   *
   * Regras de ouro:
   *  1. A conclusão NÃO repete o resumo executivo: ela interpreta (comparação,
   *     concentração, desvios) e propõe encaminhamentos.
   *  2. Todo ponto de atenção só aparece se a regra realmente disparar, e
   *     sempre cita o caso concreto (obra, disciplina, pessoa, data).
   *  3. Nenhum número é inventado: tudo sai dos registros recebidos.
   */

  const LIMITES = Object.freeze({
    concentracaoObra: 0.6,          // uma obra com 60%+ das horas, havendo outras obras
    disciplinaGenerica: 0.15,       // 15%+ das horas lançadas em "Todos", "Geral"...
    fatorSobrecarga: 1.5,           // colaborador com 1,5x a participação média
    participacaoMinimaSobrecarga: 0.4,
    variacaoRelevante: 0.1,         // abaixo disso: "em linha com" o período anterior
    quedaRelevante: 0.4,            // queda de 40%+ vira ponto de atenção
    horasObraInterrompida: 8,       // obra com 8 h+ no período anterior e zero agora
    maxItensListados: 5
  });
  const DISCIPLINAS_GENERICAS = new Set(["todos", "todas", "geral", "diversos", "diversas", "outros", "varios", "varias", "nao informado", "nao informada"]);
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const PESO_PRIORIDADE = { P3: 0, P2: 1, P1: 2, P0: 3 };

  // ---------- utilidades de texto ----------
  const texto = (v) => String(v ?? "").trim();
  const normal = (v) => texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const plural = (n, singular, pluralForma) => `${Number(n).toLocaleString("pt-BR")} ${Number(n) === 1 ? singular : pluralForma}`;
  const horas = (v) => `${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
  const pct = (v) => `${Math.round(Number(v || 0) * 100).toLocaleString("pt-BR")}%`;
  function juntar(itens) { const l = itens.filter(Boolean); return l.length <= 1 ? (l[0] || "") : `${l.slice(0, -1).join(", ")} e ${l.at(-1)}`; }
  function listarLimitado(itens, max = LIMITES.maxItensListados) { return itens.length > max ? `${itens.slice(0, max).join(", ")} e mais ${itens.length - max}` : juntar(itens); }
  function horasRegistro(r) { if (CLASSIFICACOES?.horasAtividade) return Number(CLASSIFICACOES.horasAtividade(r)) || 0; return Number(r.horas || r.duracao_horas || 0) || 0; }

  // ---------- datas ----------
  function iso(v) { const s = texto(v).slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ""; }
  function lerData(v) { const s = texto(v); const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (br) return `${br[3]}-${br[2]}-${br[1]}`; return iso(s); }
  function br(v, { ano = true } = {}) { const s = iso(v); return s ? `${s.slice(8, 10)}/${s.slice(5, 7)}${ano ? `/${s.slice(0, 4)}` : ""}` : ""; }
  function deslocarDias(v, dias) { const d = new Date(`${iso(v)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); }
  function diasEntre(a, b) { return Math.round((new Date(`${iso(b)}T12:00:00Z`) - new Date(`${iso(a)}T12:00:00Z`)) / 864e5); }
  function hojeIso() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

  function tipoPeriodo(periodo = {}) {
    const t = normal(periodo.tipo);
    if (t === "semanal" || /^semana\s+\d+/i.test(texto(periodo.rotulo))) return "semanal";
    if (t === "mensal" || t === "anual") return t;
    const ini = iso(periodo.dataInicio), fim = iso(periodo.dataFim);
    if (ini && fim && ini.slice(0, 7) === fim.slice(0, 7) && ini.endsWith("-01") && deslocarDias(fim, 1).endsWith("-01")) return "mensal";
    return "personalizado";
  }

  /** Período imediatamente anterior, com a mesma natureza do atual. */
  function calcularPeriodoAnterior(periodo = {}) {
    const ini = iso(periodo.dataInicio), fim = iso(periodo.dataFim); if (!ini || !fim) return null;
    const tipo = tipoPeriodo(periodo);
    if (tipo === "mensal") { const d = new Date(`${ini}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); const inicio = d.toISOString().slice(0, 7) + "-01"; return { tipo, dataInicio: inicio, dataFim: deslocarDias(ini, -1) }; }
    if (tipo === "anual") { const ano = Number(ini.slice(0, 4)) - 1; return { tipo, dataInicio: `${ano}-01-01`, dataFim: `${ano}-12-31` }; }
    const duracao = diasEntre(ini, fim) + 1;
    return { tipo, dataInicio: deslocarDias(ini, -duracao), dataFim: deslocarDias(ini, -1) };
  }

  function descreverPeriodo(periodo = {}) {
    const tipo = tipoPeriodo(periodo), ini = iso(periodo.dataInicio), fim = iso(periodo.dataFim);
    const numeroSemana = texto(periodo.rotulo).match(/semana\s+(\d+)/i)?.[1];
    if (tipo === "mensal" && ini) return `Em ${MESES[Number(ini.slice(5, 7)) - 1]} de ${ini.slice(0, 4)}`;
    if (tipo === "anual" && ini) return `Em ${ini.slice(0, 4)}`;
    if (tipo === "semanal") return `Na semana${numeroSemana ? ` ${numeroSemana}` : ""} (${br(ini, { ano: false })} a ${br(fim)})`;
    return `No período de ${br(ini)} a ${br(fim)}`;
  }
  function descreverPeriodoAnterior(anterior = {}) {
    const tipo = tipoPeriodo(anterior), ini = iso(anterior.dataInicio);
    if (tipo === "mensal" && ini) return `em ${MESES[Number(ini.slice(5, 7)) - 1]} de ${ini.slice(0, 4)}`;
    if (tipo === "anual" && ini) return `em ${ini.slice(0, 4)}`;
    if (tipo === "semanal") return "na semana anterior";
    return `no período anterior (${br(ini)} a ${br(anterior.dataFim)})`;
  }

  // ---------- agregações ----------
  function rotuloObra(r) { const codigo = texto(r.obraCodigo || r.obra_codigo), nome = texto(r.obra) || "Obra não informada"; return codigo ? `${codigo} — ${nome}` : nome; }
  function chaveObra(r) { return texto(r.obraId || r.obra_id) || `nome:${normal(r.obra)}`; }
  function somarPor(registros, chave, rotulo) {
    const mapa = new Map();
    registros.forEach((r) => { const h = horasRegistro(r); if (h <= 0) return; const k = chave(r); const atual = mapa.get(k) || { chave: k, label: rotulo(r), horas: 0, registros: [] }; atual.horas += h; atual.registros.push(r); mapa.set(k, atual); });
    return [...mapa.values()].sort((a, b) => b.horas - a.horas || a.label.localeCompare(b.label, "pt-BR"));
  }

  /** Resumo leve do período anterior (enviado pelo navegador para comparação). */
  function resumirPeriodo(registros = [], periodo = {}) {
    const obras = somarPor(registros, chaveObra, rotuloObra);
    return { tipo: tipoPeriodo(periodo), dataInicio: iso(periodo.dataInicio), dataFim: iso(periodo.dataFim), horas: Number(obras.reduce((s, o) => s + o.horas, 0).toFixed(2)), lancamentos: registros.length, horasPorObra: obras.slice(0, 30).map((o) => ({ chave: o.chave, obra: o.label, horas: Number(o.horas.toFixed(2)) })) };
  }

  function itensPlanejamento(semanais = []) {
    const vistos = new Map();
    semanais.forEach((i) => {
      const nome = texto(i.atividade || i.descricao); if (!nome) return;
      const data = lerData(i.entregas || i.entrega || i.entregaPrevista);
      const prioridade = texto(i.prioridade).toUpperCase();
      const k = `${normal(nome)}|${data}`;
      const atual = vistos.get(k);
      if (!atual || (PESO_PRIORIDADE[prioridade] ?? 9) < (PESO_PRIORIDADE[atual.prioridade] ?? 9)) vistos.set(k, { nome, data, prioridade });
    });
    return [...vistos.values()];
  }
  const ordenarPlanejamento = (a, b) => (PESO_PRIORIDADE[a.prioridade] ?? 9) - (PESO_PRIORIDADE[b.prioridade] ?? 9) || a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome, "pt-BR");
  const rotuloPlanejamento = (i) => `${i.nome} (${br(i.data, { ano: false })}${i.prioridade ? `, ${i.prioridade}` : ""})`;
  const rotuloFrente = (a) => `${texto(a.obra) || "Obra não informada"} · ${texto(a.projeto) || "Disciplina não informada"}`;
  const responsaveisDe = (lista) => juntar([...new Set(lista.flatMap((a) => a.colaboradores || [a.colaborador]).filter(Boolean))]);

  /**
   * Analisa o período e devolve a conclusão estruturada:
   *  { sintese: string[], pontos: [{ tipo, ponto, encaminhamento }], proximasEntregas: string }
   */
  function analisarConclusao({ registros = [], atividades = [], semanais = [], periodo = {}, colaboradores = [], periodoAnterior = null, consistencia = null, dataReferencia = hojeIso() } = {}) {
    const totalHoras = registros.reduce((s, r) => s + horasRegistro(r), 0);
    const sintese = [], pontos = [];
    const fimPeriodo = iso(periodo.dataFim);
    const periodoEncerrado = !fimPeriodo || fimPeriodo < iso(dataReferencia);
    const referencia = periodoEncerrado ? fimPeriodo : iso(dataReferencia);
    if (!registros.length) return { sintese: [`${descreverPeriodo(periodo)}, não houve horas registradas pelo setor.`], pontos, proximasEntregas: "" };

    // 1) Volume e comparação com o período anterior
    const obras = somarPor(registros, chaveObra, rotuloObra);
    let frase = `${descreverPeriodo(periodo)}, o setor registrou ${horas(totalHoras)} distribuídas em ${plural(obras.length, "obra", "obras")}`;
    const anteriorHoras = Number(periodoAnterior?.horas || 0);
    if (periodoAnterior && anteriorHoras > 0) {
      const variacao = (totalHoras - anteriorHoras) / anteriorHoras, onde = descreverPeriodoAnterior(periodoAnterior);
      frase += Math.abs(variacao) < LIMITES.variacaoRelevante
        ? `, volume em linha com o registrado ${onde} (${horas(anteriorHoras)})`
        : `, ${pct(Math.abs(variacao))} ${variacao > 0 ? "acima" : "abaixo"} do registrado ${onde} (${horas(anteriorHoras)})`;
      if (!periodoEncerrado) frase += ", considerando que o período ainda está em andamento";
      if (periodoEncerrado && variacao <= -LIMITES.quedaRelevante) pontos.push({ tipo: "queda", ponto: `As horas registradas caíram ${pct(-variacao)} em relação ao período anterior (${horas(anteriorHoras)} para ${horas(totalHoras)}).`, encaminhamento: "Verificar se há lançamentos pendentes da equipe ou se houve redução real de demanda." });
    }
    sintese.push(`${frase}.`);

    // 2) Onde o esforço se concentrou
    const principal = obras[0], participacao = totalHoras ? principal.horas / totalHoras : 0;
    const disciplinasPrincipal = somarPor(principal.registros, (r) => normal(r.projeto), (r) => texto(r.projeto) || "Disciplina não informada").filter((d) => !DISCIPLINAS_GENERICAS.has(normal(d.label))).slice(0, 2);
    const detalheDisciplinas = disciplinasPrincipal.length ? `, principalmente em ${juntar(disciplinasPrincipal.map((d) => `${d.label} (${horas(d.horas)})`))}` : "";
    if (obras.length === 1) sintese.push(`Todo o esforço foi dedicado à obra ${principal.label}${detalheDisciplinas}.`);
    else if (participacao >= 0.4) sintese.push(`A obra ${principal.label} concentrou ${pct(participacao)} das horas${detalheDisciplinas}.`);
    else sintese.push(`O esforço ficou distribuído entre as obras, com destaque para ${juntar(obras.slice(0, 3).map((o) => `${o.label} (${horas(o.horas)})`))}.`);

    // 3) Situação das atividades (sem repetir a tabela: só o que importa)
    const porStatus = (s) => atividades.filter((a) => normal(a.status) === normal(s));
    const atrasadas = porStatus("Atrasado"), pausadas = porStatus("Pausado"), andamento = porStatus("Em progresso");
    if (!atrasadas.length && !pausadas.length && !andamento.length) sintese.push(atividades.length === 1 ? "A atividade registrada consta como finalizada." : "Todas as atividades registradas constam como finalizadas.");
    else sintese.push(`Ao fim do período, ${juntar([andamento.length && `${plural(andamento.length, "atividade permanecia", "atividades permaneciam")} em andamento`, pausadas.length && `${plural(pausadas.length, "estava pausada", "estavam pausadas")}`, atrasadas.length && `${plural(atrasadas.length, "estava atrasada", "estavam atrasadas")}`])}.`);

    // ---------- pontos de atenção (só o que disparou) ----------
    if (atrasadas.length) pontos.push({ tipo: "atraso", ponto: `${plural(atrasadas.length, "atividade atrasada", "atividades atrasadas")}: ${listarLimitado([...new Set(atrasadas.map(rotuloFrente))])}.`, encaminhamento: `Registrar o impedimento e um novo prazo para cada uma. Responsáveis: ${responsaveisDe(atrasadas) || "não informados"}.` });
    if (pausadas.length) pontos.push({ tipo: "pausa", ponto: `${plural(pausadas.length, "atividade pausada", "atividades pausadas")}: ${listarLimitado([...new Set(pausadas.map(rotuloFrente))])}.`, encaminhamento: `Confirmar o motivo da interrupção e a data de retomada. Responsáveis: ${responsaveisDe(pausadas) || "não informados"}.` });

    const planejamento = itensPlanejamento(semanais);
    const vencidas = planejamento.filter((i) => i.data && i.data <= referencia).sort(ordenarPlanejamento);
    if (vencidas.length) pontos.push({ tipo: "prazo_planejamento", ponto: `${plural(vencidas.length, "entrega do planejamento está", "entregas do planejamento estão")} com prazo encerrado sem conclusão registrada: ${listarLimitado(vencidas.map(rotuloPlanejamento))}.`, encaminhamento: vencidas.length === 1 ? "Confirmar se foi emitida e atualizar o planejamento; se não foi, registrar novo prazo e o motivo do adiamento." : "Confirmar quais foram emitidas e atualizar o planejamento; as que não foram devem receber novo prazo e o motivo do adiamento." });
    const semPrazo = planejamento.filter((i) => !i.data);
    if (semPrazo.length) pontos.push({ tipo: "sem_prazo", ponto: `${plural(semPrazo.length, "item do planejamento está", "itens do planejamento estão")} sem data de entrega: ${listarLimitado(semPrazo.map((i) => i.nome))}.`, encaminhamento: "Definir data prevista para cada item." });

    if (obras.length > 1 && participacao >= LIMITES.concentracaoObra) {
      const demais = totalHoras - principal.horas;
      pontos.push({ tipo: "concentracao_obra", ponto: `Concentração de esforço: ${pct(participacao)} das horas foram para ${principal.label}; ${obras.length === 2 ? "a outra obra somou" : `as outras ${obras.length - 1} obras somaram`} ${horas(demais)}.`, encaminhamento: "Avaliar se os prazos das demais obras estão protegidos ou se é necessário redistribuir a equipe." });
    }

    const genericas = somarPor(registros.filter((r) => DISCIPLINAS_GENERICAS.has(normal(r.projeto))), (r) => normal(r.projeto), (r) => texto(r.projeto) || "Não informada");
    const horasGenericas = genericas.reduce((s, g) => s + g.horas, 0);
    if (totalHoras && horasGenericas / totalHoras >= LIMITES.disciplinaGenerica) pontos.push({ tipo: "disciplina_generica", ponto: `${horas(horasGenericas)} (${pct(horasGenericas / totalHoras)} do total) foram lançadas sem disciplina específica (${juntar(genericas.map((g) => `“${g.label}”`))}).`, encaminhamento: "Orientar a equipe a lançar na disciplina correta, para que as horas por projeto reflitam o esforço real." });

    const equipe = (colaboradores || []).filter((c) => Number(c.horas) > 0);
    const somaEquipe = equipe.reduce((s, c) => s + Number(c.horas), 0);
    if (equipe.length >= 2 && somaEquipe) {
      const lider = [...equipe].sort((a, b) => b.horas - a.horas)[0], parte = lider.horas / somaEquipe;
      if (parte >= LIMITES.participacaoMinimaSobrecarga && parte >= LIMITES.fatorSobrecarga / equipe.length) pontos.push({ tipo: "sobrecarga", ponto: `${lider.nome} concentrou ${pct(parte)} das horas da equipe (${horas(lider.horas)}), acima da média de ${pct(1 / equipe.length)} por pessoa.`, encaminhamento: `Avaliar a redistribuição de demandas para reduzir a dependência de ${lider.nome}.` });
    }

    if (periodoAnterior?.horasPorObra?.length && periodoEncerrado) {
      const atuais = new Set(obras.map((o) => o.chave));
      const interrompidas = periodoAnterior.horasPorObra.filter((o) => o.horas >= LIMITES.horasObraInterrompida && !atuais.has(o.chave));
      if (interrompidas.length) pontos.push({ tipo: "obra_interrompida", ponto: `${plural(interrompidas.length, "obra teve", "obras tiveram")} atividade no período anterior e nenhuma hora neste: ${listarLimitado(interrompidas.map((o) => `${o.obra} (${horas(o.horas)} antes)`))}.`, encaminhamento: "Confirmar se a etapa foi concluída ou se a obra está parada aguardando insumo." });
    }

    if (consistencia?.totalInconsistencias > 0) pontos.push({ tipo: "consistencia", ponto: `A base possui ${plural(consistencia.totalInconsistencias, "inconsistência", "inconsistências")} de registro (ver Verificações de Consistência).`, encaminhamento: "Corrigir os lançamentos antes de divulgar os números deste relatório." });

    const futuras = planejamento.filter((i) => i.data && i.data > referencia).sort((a, b) => a.data.localeCompare(b.data) || ordenarPlanejamento(a, b));
    const proximasEntregas = futuras.length ? `Para o próximo período, estão previstas as entregas de ${listarLimitado(futuras.map(rotuloPlanejamento))}.` : "";
    return { sintese, pontos, proximasEntregas };
  }

  return { LIMITES, analisarConclusao, calcularPeriodoAnterior, descreverPeriodo, descreverPeriodoAnterior, resumirPeriodo, itensPlanejamento, lerData, tipoPeriodo, plural, juntar };
});
