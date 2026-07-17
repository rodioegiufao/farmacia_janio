import { Store, STORAGE_KEY, validateProject, wallLength } from "./state.js";
import { Plan2D } from "./plan2d.js";
import { Scene3D } from "./scene3d.js";
import { buildIfc, ifcFileName } from "./ifc-exporter.js";
const $ = (s) => document.querySelector(s);
const store = new Store();
const els = {
  projectName: $("#projectName"),
  activeToolLabel: $("#activeToolLabel"),
  defaultHeight: $("#defaultHeight"),
  defaultThickness: $("#defaultThickness"),
  defaultBase: $("#defaultBase"),
  snapStep: $("#snapStep"),
  showGrid: $("#showGrid"),
  snapEnabled: $("#snapEnabled"),
  wallTree: $("#wallTree"),
  wallCount: $("#wallCount"),
  treeProjectName: $("#treeProjectName"),
  selectedPanel: $("#selectedPanel"),
  planView: $("#planView"),
  threeView: $("#threeView"),
  canvasArea: $(".canvas-area"),
};
function toast(msg, type = "ok") {
  const d = document.createElement("div");
  d.className = `toast ${type}`;
  d.textContent = msg;
  $("#toast").append(d);
  setTimeout(() => d.remove(), 3600);
}
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function validPositive(v, label) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0)
    throw new Error(`${label} deve ser maior que zero.`);
  return n;
}
function syncForm(s) {
  els.projectName.value = s.name;
  els.activeToolLabel.value = s.activeTool === "wall" ? "Parede" : "Selecionar";
  els.defaultHeight.value = s.settings.defaultHeight;
  els.defaultThickness.value = s.settings.defaultThickness;
  els.defaultBase.value = s.settings.defaultBaseElevation;
  els.snapStep.value = s.settings.snapStep;
  els.showGrid.checked = s.settings.showGrid;
  els.snapEnabled.checked = s.settings.snapEnabled;
  $("#toolWall").classList.toggle("active", s.activeTool === "wall");
  $("#toolSelect").classList.toggle("active", s.activeTool === "select");
  $("#orthoToggle").classList.toggle("active", s.settings.ortho);
  els.treeProjectName.textContent = s.name;
  els.wallCount.textContent = s.walls.length;
  els.wallTree.innerHTML = "";
  s.walls.forEach((w) => {
    const li = document.createElement("li"),
      b = document.createElement("button");
    b.textContent = w.name;
    b.className = w.id === s.selectedWallId ? "selected" : "";
    b.onclick = () => store.selectWall(w.id);
    li.append(b);
    els.wallTree.append(li);
  });
  renderSelected(s);
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === s.view));
  els.planView.classList.toggle("hidden", s.view === "three");
  els.threeView.classList.toggle("hidden", s.view === "plan");
  els.canvasArea.classList.toggle("split", s.view === "split");
  $("#snapStatus").textContent =
    `Snap: ${s.settings.snapEnabled ? "ligado" : "desligado"}`;
  $("#toolStatus").textContent =
    `Ferramenta: ${s.activeTool === "wall" ? "Parede" : "Selecionar"}`;
}
function renderSelected(s) {
  const w = s.walls.find((x) => x.id === s.selectedWallId);
  if (!w) {
    els.selectedPanel.innerHTML =
      '<h2>Selecionada</h2><p class="muted">Nenhuma parede selecionada.</p>';
    return;
  }
  els.selectedPanel.innerHTML = `<h2>Selecionada</h2><label>Nome<input id="selName" value="${w.name}"></label><p>Comprimento: ${wallLength(w).toFixed(2)} m</p><label>Altura (m)<input id="selHeight" type="number" min="0.01" step="0.01" value="${w.height}"></label><label>Espessura (m)<input id="selThickness" type="number" min="0.01" step="0.01" value="${w.thickness}"></label><label>Elevação (m)<input id="selBase" type="number" step="0.01" value="${w.baseElevation}"></label><p>Início: ${w.start.x.toFixed(2)}, ${w.start.y.toFixed(2)}</p><p>Fim: ${w.end.x.toFixed(2)}, ${w.end.y.toFixed(2)}</p>`;
  $("#selName").onchange = (e) =>
    store.updateWall(w.id, { name: e.target.value.trim() || w.name });
  $("#selHeight").onchange = (e) => {
    try {
      store.updateWall(w.id, {
        height: validPositive(e.target.value, "Altura"),
      });
    } catch (err) {
      toast(err.message, "error");
    }
  };
  $("#selThickness").onchange = (e) => {
    try {
      store.updateWall(w.id, {
        thickness: validPositive(e.target.value, "Espessura"),
      });
    } catch (err) {
      toast(err.message, "error");
    }
  };
  $("#selBase").onchange = (e) =>
    store.updateWall(w.id, { baseElevation: Number(e.target.value) || 0 });
}
new Plan2D($("#planCanvas"), store, {
  onStatus: (p, len, kind) => {
    $("#coordX").textContent = `X: ${p.x.toFixed(2)}`;
    $("#coordY").textContent = `Y: ${p.y.toFixed(2)}`;
    $("#tempLength").textContent =
      `Comprimento: ${len ? len.toFixed(2) + " m" : "—"}`;
    $("#snapStatus").textContent = `Snap: ${kind}`;
  },
  onError: (m) => toast(m, "error"),
});
new Scene3D($("#threeCanvas"), store);
store.subscribe(syncForm);
$("#toolWall").onclick = () => store.set({ activeTool: "wall" });
$("#toolSelect").onclick = () => store.set({ activeTool: "select" });
$("#orthoToggle").onclick = () =>
  store.updateSettings({ ortho: !store.state.settings.ortho });
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => store.set({ view: b.dataset.view })));
["projectName"].forEach(
  (id) =>
    (els[id].onchange = (e) =>
      store.set({ name: e.target.value.trim() || "Projeto sem nome" })),
);
els.defaultHeight.onchange = (e) => {
  try {
    store.updateSettings({
      defaultHeight: validPositive(e.target.value, "Altura"),
    });
  } catch (err) {
    toast(err.message, "error");
  }
};
els.defaultThickness.onchange = (e) => {
  try {
    store.updateSettings({
      defaultThickness: validPositive(e.target.value, "Espessura"),
    });
  } catch (err) {
    toast(err.message, "error");
  }
};
els.defaultBase.onchange = (e) =>
  store.updateSettings({ defaultBaseElevation: Number(e.target.value) || 0 });
els.snapStep.onchange = (e) => {
  try {
    store.updateSettings({ snapStep: validPositive(e.target.value, "Snap") });
  } catch (err) {
    toast(err.message, "error");
  }
};
els.showGrid.onchange = (e) =>
  store.updateSettings({ showGrid: e.target.checked });
els.snapEnabled.onchange = (e) =>
  store.updateSettings({ snapEnabled: e.target.checked });
$("#saveProject").onclick = () => {
  store.save();
  toast("Projeto salvo no navegador.");
};
$("#newProject").onclick = () => {
  if (confirm("Limpar todo o projeto e iniciar novamente?")) {
    localStorage.removeItem(STORAGE_KEY);
    store.replace(validateProject({ walls: [], name: "Projeto sem nome" }));
    toast("Novo projeto criado.");
  }
};
$("#deleteSelected").onclick = $("#deleteSelectedSide").onclick = () =>
  store.deleteSelected()
    ? toast("Parede excluída.")
    : toast("Nenhuma parede selecionada.", "error");
$("#undo").onclick = () => store.undo();
$("#redo").onclick = () => store.redo();
$("#exportJson").onclick = () =>
  download(
    `${store.state.name}.json`,
    JSON.stringify(store.snapshot(), null, 2),
    "application/json",
  );
$("#importJson").onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    store.replace(validateProject(JSON.parse(await f.text())));
    toast("Projeto importado.");
  } catch (err) {
    toast(`Falha na importação: ${err.message}`, "error");
  } finally {
    e.target.value = "";
  }
};
$("#exportIfc").onclick = () => {
  try {
    download(
      ifcFileName(store.state.name),
      buildIfc(store.snapshot()),
      "application/x-step",
    );
    toast("IFC exportado.");
  } catch (err) {
    toast(err.message || "Falha inesperada na geração do IFC.", "error");
  }
};
window.addEventListener("keydown", (e) => {
  const edit = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (!edit && (e.key === "Delete" || e.key === "Backspace"))
    store.deleteSelected();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") store.undo();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") store.redo();
});
document
  .querySelectorAll(".collapse")
  .forEach(
    (b) =>
      (b.onclick = () =>
        document
          .querySelector("." + b.dataset.target)
          .classList.toggle("collapsed")),
  );
try {
  if (
    localStorage.getItem(STORAGE_KEY) &&
    confirm("Restaurar o último projeto salvo neste navegador?")
  )
    store.loadSaved();
} catch (e) {
  toast("Não foi possível restaurar o projeto salvo.", "error");
}