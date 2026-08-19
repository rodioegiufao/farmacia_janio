(function (root, factory) {
  const engine = root?.PLANNER_GANTT || (typeof require === "function" ? require("./planner-gantt") : null);
  const api = factory(engine);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PLANNER_GANTT_RELATORIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (PLANNER_GANTT) {
  "use strict";

  const MAX_LINHAS_CONSOLIDADO = 28;
  const normalizar = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const valor = (atividade, camel, snake) => atividade?.[camel] ?? atividade?.[snake] ?? "";
  function chaveLegada(atividade) {
    return ["dataInicio:data_inicio", "horaInicio:hora_inicio", "dataTermino:data_termino", "horaTermino:hora_termino", "colaborador:colaborador", "obraId:obra_id", "projeto:projeto", "etapa:etapa"]
      .map((campos) => { const [camel, snake] = campos.split(":"); return normalizar(valor(atividade, camel, snake)); }).join("|");
  }
  function estaPermitida(atividade, ids, legadas) {
    const id = atividade?.id;
    return id !== undefined && id !== null && String(id) !== "" ? ids.has(String(id)) : legadas.has(chaveLegada(atividade));
  }
  function normalizarAtividade(atividade) {
    return { ...atividade,
      data_inicio: valor(atividade, "dataInicio", "data_inicio"), hora_inicio: valor(atividade, "horaInicio", "hora_inicio"),
      data_termino: valor(atividade, "dataTermino", "data_termino"), hora_termino: valor(atividade, "horaTermino", "hora_termino") };
  }
  function filtrarChecklistsParaRelatorio(checklists, atividadesPermitidas, periodo) {
    const permitidas = atividadesPermitidas || [];
    const ids = new Set(permitidas.map((a) => a?.id).filter((id) => id !== undefined && id !== null && String(id) !== "").map(String));
    const legadas = new Set(permitidas.filter((a) => a?.id === undefined || a?.id === null || String(a.id) === "").map(chaveLegada));
    return (checklists || []).map((checklist) => ({ ...checklist, itens: (checklist.itens || []).map((item) => {
      const atividadesVinculadas = (item.atividadesVinculadas || []).filter((a) => estaPermitida(a, ids, legadas)).map(normalizarAtividade)
        .filter((a) => PLANNER_GANTT.atividadeEstaNoPeriodo(a, periodo));
      return { ...item, atividadesVinculadas };
    }).filter((item) => item.atividadesVinculadas.length) })).filter((checklist) => checklist.itens.length);
  }
  function prepararEstrutura({ checklists, atividadesPermitidas, periodo }) {
    const filtrados = filtrarChecklistsParaRelatorio(checklists, atividadesPermitidas, periodo);
    const estrutura = PLANNER_GANTT.construirEstruturaGantt(filtrados, { ocultarSemAtividade: true, periodo });
    return { checklists: filtrados, estrutura, dias: PLANNER_GANTT.listarDias(periodo?.inicio, periodo?.fim) };
  }
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const semanas = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  function desenhar(estrutura, dias) {
    const linhas = PLANNER_GANTT.filtrarLinhasHierarquia(estrutura, { modo: "sintetico", recolhidos: new Set() });
    const label = 390, coluna = Math.max(36, Math.min(52, Math.floor(1320 / Math.max(1, dias.length))));
    const largura = label + coluna * dias.length, cabecalho = 94, alturaLinha = 34, altura = cabecalho + linhas.length * alturaLinha + 12, escala = 2;
    const canvas = document.createElement("canvas"); canvas.width = largura * escala; canvas.height = altura * escala;
    const ctx = canvas.getContext("2d"); ctx.scale(escala, escala); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, largura, altura);
    ctx.textBaseline = "middle"; ctx.strokeStyle = "#d8dee8"; ctx.lineWidth = 1;
    dias.forEach((iso, i) => { const d = new Date(`${iso}T12:00:00`), x = label + i * coluna;
      if ([0, 6].includes(d.getDay())) { ctx.fillStyle = "#f7f8fa"; ctx.fillRect(x, 0, coluna, altura); }
      ctx.beginPath(); ctx.moveTo(x, 34); ctx.lineTo(x, altura); ctx.stroke(); ctx.fillStyle = "#202938"; ctx.textAlign = "center";
      ctx.font = "600 12px Arial"; ctx.fillText(String(d.getDate()), x + coluna / 2, 57); ctx.font = "10px Arial"; ctx.fillText(semanas[d.getDay()], x + coluna / 2, 77);
      const anterior = i && new Date(`${dias[i - 1]}T12:00:00`); if (!anterior || anterior.getMonth() !== d.getMonth()) { ctx.textAlign = "left"; ctx.font = "bold 12px Arial"; ctx.fillText(`${meses[d.getMonth()]}/${d.getFullYear()}`, x + 5, 18); }
    });
    ctx.beginPath(); ctx.moveTo(label, 0); ctx.lineTo(label, altura); ctx.stroke();
    linhas.forEach((linha, indice) => { const y = cabecalho + indice * alturaLinha;
      ctx.strokeStyle = "#e7eaf0"; ctx.beginPath(); ctx.moveTo(0, y + alturaLinha); ctx.lineTo(largura, y + alturaLinha); ctx.stroke();
      const recuo = linha.tipo === "obra" ? 8 : linha.tipo === "projeto" ? 26 : 48; ctx.textAlign = "left"; ctx.fillStyle = "#172033";
      ctx.font = linha.tipo === "obra" ? "bold 13px Arial" : linha.tipo === "projeto" ? "600 12px Arial" : "12px Arial";
      const nome = String(linha.nome || ""); ctx.fillText(nome.length > 49 ? `${nome.slice(0, 47)}…` : nome, recuo, y + alturaLinha / 2);
      (linha.segmentosPeriodo || []).forEach((segmento) => { let inicio = Math.max(0, PLANNER_GANTT.diferencaDias(dias[0], segmento.data)); let fim = Math.min(dias.length - 1, PLANNER_GANTT.diferencaDias(dias[0], segmento.dataFim));
        if (fim < 0 || inicio >= dias.length) return; ctx.fillStyle = linha.tipo === "obra" ? "#174b7a" : linha.tipo === "projeto" ? "#2e6e9e" : "#4b8fbd";
        ctx.fillRect(label + inicio * coluna + 3, y + 8, (fim - inicio + 1) * coluna - 6, alturaLinha - 16);
      });
    });
    const imagem = canvas.toDataURL("image/png", 1); canvas.remove?.(); return { imagem, largura: canvas.width, altura: canvas.height, linhas: linhas.length };
  }
  function gerarImagem(opcoes) {
    const dados = prepararEstrutura(opcoes); if (!dados.estrutura.length || !dados.dias.length) return { possuiDados: false, imagens: [] };
    const total = PLANNER_GANTT.filtrarLinhasHierarquia(dados.estrutura, { modo: "sintetico", recolhidos: new Set() }).length;
    const grupos = total > MAX_LINHAS_CONSOLIDADO && dados.estrutura.length > 1 ? dados.estrutura.map((obra) => [obra]) : [dados.estrutura];
    return { possuiDados: true, imagens: grupos.map((grupo) => ({ obra: grupos.length > 1 ? grupo[0].nome : "", ...desenhar(grupo, dados.dias) })) };
  }
  return { filtrarChecklistsParaRelatorio, prepararEstrutura, gerarImagem };
});