const API_MEMORANDO_WORD_URL = "/api/gerar-memorando-word";

const sugestoesTipoAssunto = {
  "Subestação": {
    tituloMemo: "MEMORANDO DE DIRETRIZES PARA SUBESTAÇÃO",
    objetivo: "O presente memorando tem por objetivo apresentar as diretrizes e solicitações necessárias para definição e compatibilização da área destinada à subestação, considerando os requisitos técnicos do projeto elétrico, as condições arquitetônicas e as necessidades de operação e manutenção.",
    diretrizGeral: "As soluções relacionadas à subestação deverão observar os requisitos técnicos de acesso, ventilação, operação, manutenção, segurança, afastamentos mínimos, compatibilização arquitetônica e atendimento às normas aplicáveis.",
    consideracoesFinais: "As informações apresentadas neste memorando deverão ser consideradas como premissas técnicas para a definição, compatibilização e consolidação da solução referente à subestação. Recomenda-se que as adequações indicadas sejam avaliadas em conjunto com os projetos de arquitetura, instalações elétricas e demais disciplinas envolvidas, de modo a garantir o atendimento aos requisitos técnicos, operacionais, normativos e de manutenção. Após a definição da solução, os projetos complementares deverão ser atualizados antes da emissão final."
  },
  "Definição de shafts": {
    tituloMemo: "MEMORANDO DE DEFINIÇÃO DE SHAFTS",
    objetivo: "O presente memorando tem por objetivo solicitar a definição e compatibilização dos shafts necessários ao encaminhamento das instalações, de modo a garantir espaços técnicos adequados para passagem, inspeção, manutenção e integração entre as disciplinas de projeto.",
    diretrizGeral: "Os shafts deverão ser definidos considerando o espaço necessário para passagem das instalações, possibilidade de inspeção e manutenção, compatibilização com elementos estruturais e arquitetônicos, além da integração com as demais disciplinas complementares.",
    consideracoesFinais: "As definições apresentadas neste memorando deverão ser consideradas como referência para a locação, dimensionamento e compatibilização dos shafts necessários ao encaminhamento das instalações. Recomenda-se que as áreas técnicas indicadas sejam validadas junto aos projetos de arquitetura e demais disciplinas, a fim de evitar interferências com elementos estruturais, circulações, ambientes de uso e sistemas complementares. A consolidação dos shafts deverá ocorrer antes da emissão final dos projetos."
  },
  "Solicitação de alteração de locais de equipamentos e objetos": {
    tituloMemo: "MEMORANDO DE SOLICITAÇÃO DE ALTERAÇÃO DE LOCALIZAÇÃO",
    objetivo: "O presente memorando tem por objetivo solicitar a avaliação e alteração de localização de equipamentos e elementos de projeto, visando compatibilizar as soluções técnicas com as condições arquitetônicas, operacionais e de manutenção.",
    diretrizGeral: "As alterações de localização deverão ser analisadas de forma integrada, considerando interferências com arquitetura, estrutura, circulação, acessibilidade, manutenção, operação e demais sistemas técnicos previstos no empreendimento.",
    consideracoesFinais: "As alterações indicadas neste memorando deverão ser avaliadas e compatibilizadas com os projetos envolvidos, considerando os impactos sobre acessibilidade, operação, manutenção, circulação, infraestrutura técnica e interferências com demais disciplinas. Recomenda-se que os novos posicionamentos sejam validados previamente à atualização das pranchas, de forma a evitar retrabalhos e garantir coerência entre arquitetura, instalações e demais projetos complementares."
  },
  "Solicitação de alturas de trabalho de projetos de instalação": {
    tituloMemo: "MEMORANDO DE DEFINIÇÃO DE ALTURAS DE INSTALAÇÃO",
    objetivo: "O presente memorando tem por objetivo solicitar a definição ou confirmação das alturas de instalação dos elementos técnicos previstos em projeto, garantindo compatibilização entre arquitetura, instalações, operação, manutenção e execução.",
    diretrizGeral: "As alturas de instalação deverão ser definidas de modo compatível com os critérios de uso, operação, manutenção, ergonomia, segurança, estética, acessibilidade e viabilidade executiva.",
    consideracoesFinais: "As alturas de instalação indicadas neste memorando deverão ser avaliadas e confirmadas pelas disciplinas envolvidas, considerando critérios de operação, manutenção, acessibilidade, ergonomia, segurança, normas técnicas aplicáveis e compatibilização com o projeto arquitetônico. Recomenda-se que as alturas definidas sejam incorporadas aos projetos antes da emissão final, evitando divergências entre documentação gráfica, memoriais e execução em obra."
  },
  "Outro": {
    tituloMemo: "MEMORANDO TÉCNICO",
    objetivo: "O presente memorando tem por objetivo formalizar diretrizes, solicitações e observações técnicas necessárias à compatibilização e consolidação das soluções de projeto.",
    diretrizGeral: "As informações apresentadas deverão ser analisadas pelas disciplinas envolvidas, considerando a compatibilização entre os projetos, as condições de execução, manutenção, operação e atendimento aos requisitos técnicos aplicáveis.",
    consideracoesFinais: "As informações apresentadas neste memorando deverão ser analisadas pelas disciplinas envolvidas e consideradas na compatibilização dos projetos. Recomenda-se que os ajustes necessários sejam validados previamente à emissão final, garantindo coerência entre as soluções adotadas, os documentos técnicos e as condições de execução."
  }
};

const form = document.getElementById("memoForm");
const codigoSetor = document.getElementById("codigoSetor");
const numeroMemorando = document.getElementById("numeroMemorando");
const anoMemorando = document.getElementById("anoMemorando");
const codigoPreview = document.getElementById("codigoPreview");
const tipoAssunto = document.getElementById("tipoAssunto");
const imagensContainer = document.getElementById("imagensContainer");
const btnAdicionarImagem = document.getElementById("btnAdicionarImagem");
const btnGerar = document.getElementById("btnGerar");
const statusEl = document.getElementById("status");

const camposSugeridos = ["tituloMemo", "objetivo", "diretrizGeral", "consideracoesFinais"];

function normalizarCodigoMemo(setor, numero, ano) {
  const set = String(setor || "").trim().toUpperCase() || "[SET]";
  const xyxBase = String(numero || "").trim();
  const xyx = xyxBase ? xyxBase.padStart(3, "0") : "[XYX]";
  const abc = String(ano || "").trim() || "[ABC]";
  return `MEMO-${set}-${xyx}-${abc}`;
}

function atualizarPreviewCodigo() {
  codigoPreview.textContent = normalizarCodigoMemo(codigoSetor.value, numeroMemorando.value, anoMemorando.value);
}

function aplicarSugestoes() {
  const sugestao = sugestoesTipoAssunto[tipoAssunto.value];
  if (!sugestao) return;
  camposSugeridos.forEach((campo) => {
    const input = document.getElementById(campo);
    if (input && !input.value.trim()) input.value = sugestao[campo];
  });
}

function criarBlocoImagem() {
  const item = document.createElement("fieldset");
  item.className = "image-item";
  item.innerHTML = `
    <legend>Imagem do projeto</legend>
    <label>Arquivo da imagem
      <input type="file" class="imagem-arquivo" accept="image/png,image/jpeg">
    </label>
    <label>Título da imagem
      <input type="text" class="imagem-titulo" placeholder="Figura 1 — Local de interferência">
    </label>
    <label>Descrição da imagem
      <textarea class="imagem-descricao" rows="3" placeholder="Descreva tecnicamente a imagem inserida."></textarea>
    </label>
    <button type="button" class="danger btn-remover-imagem">Remover imagem</button>
  `;
  item.querySelector(".btn-remover-imagem").addEventListener("click", () => item.remove());
  imagensContainer.appendChild(item);
}

function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível ler uma das imagens selecionadas."));
    reader.readAsDataURL(file);
  });
}

async function coletarImagens() {
  const itens = [...document.querySelectorAll(".image-item")];
  const imagens = [];
  for (const item of itens) {
    const arquivo = item.querySelector(".imagem-arquivo")?.files?.[0];
    if (!arquivo) continue;
    imagens.push({
      arquivo: await arquivoParaBase64(arquivo),
      titulo: item.querySelector(".imagem-titulo")?.value || "",
      descricao: item.querySelector(".imagem-descricao")?.value || ""
    });
  }
  return imagens;
}

function nomeArquivoDaResposta(response) {
  const header = response.headers.get("Content-Disposition") || "";
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : `memorando-${new Date().toISOString().slice(0, 10)}.docx`;
}

async function gerarMemorando(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;

  btnGerar.disabled = true;
  statusEl.textContent = "Gerando memorando...";

  try {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.imagens = await coletarImagens();

    const response = await fetch(API_MEMORANDO_WORD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Não foi possível gerar o memorando.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivoDaResposta(response);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    statusEl.textContent = "Memorando gerado com sucesso.";
  } catch (error) {
    statusEl.textContent = error.message;
  } finally {
    btnGerar.disabled = false;
  }
}

[codigoSetor, numeroMemorando, anoMemorando].forEach((input) => input.addEventListener("input", atualizarPreviewCodigo));
tipoAssunto.addEventListener("change", aplicarSugestoes);
btnAdicionarImagem.addEventListener("click", criarBlocoImagem);
form.addEventListener("submit", gerarMemorando);

document.getElementById("data").value = new Date().toISOString().slice(0, 10);
atualizarPreviewCodigo();
const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("memo-theme") || "dark";

document.documentElement.dataset.theme = savedTheme;
if (themeToggle) themeToggle.checked = savedTheme === "light";

if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    const nextTheme = themeToggle.checked ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("memo-theme", nextTheme);
  });
}
