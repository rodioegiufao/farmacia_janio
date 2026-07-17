import {
  CATEGORIES,
  STORAGE_KEY,
  Store,
  VIEWS,
  validateFamily,
} from "./state.js";
import { Plan2D } from "./plan2d.js";
import { Scene3D } from "./scene3d.js";
import { IFC_EXPORTER_VERSION, exportFamilyToIfc } from "./ifc-exporter.js";
console.info(`IFC exporter loaded: ${IFC_EXPORTER_VERSION}`);
const $ = (selector) => document.querySelector(selector);
const store = new Store();
const els = [
  "projectName",
  "category",
  "workView",
  "activeToolLabel",
  "snapStep",
  "majorGrid",
  "showGrid",
  "snapEnabled",
  "parameterList",
  "selectedPanel",
  "planView",
  "threeView",
  "defaultDepth",
  "treeProjectName",
  "treeCategory",
  "profileCount",
  "extrusionCount",
  "profileTree",
  "extrusionTree",
  "typeTree",
].reduce((a, id) => ((a[id] = $("#" + id)), a), {});
function toast(msg, type = "ok") {
  const d = document.createElement("div");
  d.className = `toast ${type}`;
  d.textContent = msg;
  $("#toast").append(d);
  setTimeout(() => d.remove(), 3200);
}
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportIfc(schema) {
  try {
    const ifc = exportFamilyToIfc(store.snapshot(), schema);
    download(`${store.state.name}.${schema}.ifc`, ifc, "application/x-step");
    toast(`IFC ${schema} exportado.`);
  } catch (err) {
    toast(err.message, "error");
  }
}
function positive(v, label) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0)
    throw new Error(`${label} deve ser maior que zero.`);
  return n;
}
function opt(select, items, valueKey = "id", labelKey = "name") {
  select.innerHTML = "";
  items.forEach((i) => {
    const o = document.createElement("option");
    o.value = i[valueKey] ?? i;
    o.textContent = i[labelKey] ?? i;
    select.append(o);
  });
}
opt(els.category, CATEGORIES, "x", "x");
opt(els.workView, VIEWS);
function itemButton(item) {
  const li = document.createElement("li"),
    b = document.createElement("button");
  b.textContent = `${item.visible === false ? "○" : "●"} ${item.name}`;
  b.className = item.id === store.state.selectedElementId ? "selected" : "";
  b.onclick = () => store.select(item.id);
  li.append(b);
  return li;
}
function sync(s) {
  els.projectName.value = s.name;
  els.category.value = s.category;
  els.workView.value = s.workView;
  els.activeToolLabel.value =
    s.activeTool === "profile" ? "Perfil fechado" : "Selecionar";
  els.snapStep.value = s.settings.snapStep;
  els.majorGrid.value = s.settings.majorGrid;
  els.showGrid.checked = s.settings.showGrid;
  els.snapEnabled.checked = s.settings.snapEnabled;
  $("#toolProfile").classList.toggle("active", s.activeTool === "profile");
  $("#toolSelect").classList.toggle("active", s.activeTool === "select");
  $("#orthoToggle").classList.toggle("active", s.settings.ortho);
  els.treeProjectName.textContent = s.name;
  els.treeCategory.textContent = s.category;
  els.profileCount.textContent = s.profiles.length;
  els.extrusionCount.textContent = s.extrusions.length;
  els.profileTree.innerHTML = "";
  s.profiles.forEach((p) => els.profileTree.append(itemButton(p)));
  els.extrusionTree.innerHTML = "";
  s.extrusions.forEach((e) => els.extrusionTree.append(itemButton(e)));
  els.typeTree.innerHTML = "";
  s.types.forEach((t) => {
    const li = document.createElement("li"),
      b = document.createElement("button");
    b.textContent = t.name;
    b.className = t.id === s.currentTypeId ? "selected" : "";
    b.onclick = () => store.applyType(t.id);
    li.append(b);
    els.typeTree.append(li);
  });
  renderParams(s);
  renderSelected(s);
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === s.view));
  els.planView.classList.toggle("hidden", s.view === "three");
  els.threeView.classList.toggle("hidden", s.view === "plan");
  $(".canvas-area").classList.toggle("split", s.view === "split");
  $("#snapStatus").textContent =
    `Snap: ${s.settings.snapEnabled ? "ligado" : "desligado"}`;
  $("#toolStatus").textContent =
    `Ferramenta: ${s.activeTool === "profile" ? "Perfil" : "Selecionar"}`;
}
function renderParams(s) {
  els.parameterList.innerHTML = "";
  s.parameters.forEach((p) => {
    const row = document.createElement("div");
    row.className = "param-row";
    row.innerHTML = `<input value="${p.name}" data-k="name"><input type="number" value="${p.value}" data-k="value"><span>mm</span>`;
    row
      .querySelectorAll("input")
      .forEach(
        (i) =>
          (i.onchange = () =>
            store.updateParameter(p.id, {
              [i.dataset.k]:
                i.dataset.k === "value" ? Number(i.value) : i.value.trim(),
            })),
      );
    els.parameterList.append(row);
  });
}
function renderSelected(s) {
  const p = s.profiles.find((x) => x.id === s.selectedElementId),
    e = s.extrusions.find((x) => x.id === s.selectedElementId);
  if (!p && !e) {
    els.selectedPanel.innerHTML =
      '<h2>Selecionado</h2><p class="muted">Nada selecionado.</p>';
    return;
  }
  const item = p || e;
  els.selectedPanel.innerHTML = `<h2>Selecionado</h2><label>Nome<input id="selName" value="${item.name}"></label><label class="check"><input id="selVisible" type="checkbox" ${item.visible !== false ? "checked" : ""}> Visível</label>${e ? `<label>Profundidade (mm ou parâmetro)<input id="selDepth" value="${e.depth}"></label><label>Deslocamento (mm)<input id="selOffset" type="number" value="${e.offset || 0}"></label>` : `<p>${p.points.length} vértices na vista ${p.view}.</p>`}`;
  $("#selName").onchange = (ev) =>
    store.updateElement(item.id, { name: ev.target.value.trim() || item.name });
  $("#selVisible").onchange = (ev) =>
    store.updateElement(item.id, { visible: ev.target.checked });
  if (e) {
    $("#selDepth").onchange = (ev) =>
      store.updateElement(e.id, { depth: ev.target.value.trim() || 0 });
    $("#selOffset").onchange = (ev) =>
      store.updateElement(e.id, { offset: Number(ev.target.value) || 0 });
  }
}
new Plan2D($("#planCanvas"), store, {
  onStatus: (p, len, kind) => {
    $("#coordX").textContent = `X: ${p.x.toFixed(0)} mm`;
    $("#coordY").textContent = `Y: ${p.y.toFixed(0)} mm`;
    $("#tempLength").textContent =
      `Segmento: ${len ? len.toFixed(0) + " mm" : "—"}`;
    $("#snapStatus").textContent = `Snap: ${kind}`;
  },
  onError: (m) => toast(m, "error"),
});
new Scene3D($("#threeCanvas"), store);
store.subscribe(sync);
$("#toolProfile").onclick = () => store.set({ activeTool: "profile" });
$("#toolSelect").onclick = () => store.set({ activeTool: "select" });
$("#orthoToggle").onclick = () =>
  store.updateSettings({ ortho: !store.state.settings.ortho });
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => store.set({ view: b.dataset.view })));
els.projectName.onchange = (e) =>
  store.set({ name: e.target.value.trim() || "Nova família paramétrica" });
els.category.onchange = (e) => store.set({ category: e.target.value });
els.workView.onchange = (e) => store.set({ workView: e.target.value });
els.snapStep.onchange = (e) => {
  try {
    store.updateSettings({ snapStep: positive(e.target.value, "Snap") });
  } catch (err) {
    toast(err.message, "error");
  }
};
els.majorGrid.onchange = (e) => {
  try {
    store.updateSettings({ majorGrid: positive(e.target.value, "Grade") });
  } catch (err) {
    toast(err.message, "error");
  }
};
els.showGrid.onchange = (e) =>
  store.updateSettings({ showGrid: e.target.checked });
els.snapEnabled.onchange = (e) =>
  store.updateSettings({ snapEnabled: e.target.checked });
$("#extrudeSelected").onclick = () => {
  const id = store.state.selectedElementId;
  if (!store.state.profiles.some((p) => p.id === id))
    return toast("Selecione um perfil para extrudar.", "error");
  store.addExtrusion(id, els.defaultDepth.value || "Profundidade");
  toast("Extrusão criada.");
};
$("#addParam").onclick = () => {
  const name = $("#newParamName").value.trim();
  if (!name) return toast("Informe o nome do parâmetro.", "error");
  store.addParameter(name, $("#newParamValue").value);
  $("#newParamName").value = "";
  $("#newParamValue").value = "";
};
$("#addType").onclick = () => store.addType();
$("#saveProject").onclick = () => {
  store.save();
  toast("Família salva no navegador.");
};
$("#newProject").onclick = () => {
  if (confirm("Criar uma nova família e limpar a atual?")) {
    localStorage.removeItem(STORAGE_KEY);
    store.replace(
      validateFamily({
        ...store.snapshot(),
        ...{
          format: "engrodrigo-family-json",
          profiles: [],
          extrusions: [],
          name: "Nova família paramétrica",
        },
      }),
    );
  }
};
$("#deleteSelected").onclick = $("#deleteSelectedSide").onclick = () =>
  store.deleteSelected()
    ? toast("Elemento excluído.")
    : toast("Nada selecionado.", "error");
$("#undo").onclick = () => store.undo();
$("#redo").onclick = () => store.redo();
$("#exportJson").onclick = () =>
  download(
    `${store.state.name}.efamily.json`,
    JSON.stringify(store.snapshot(), null, 2),
    "application/json",
  );
$("#exportIfc2x3").onclick = () => exportIfc("IFC2X3");
$("#exportIfc4").onclick = () => exportIfc("IFC4");
$("#importJson").onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    store.replace(validateFamily(JSON.parse(await f.text())));
    toast("Família importada.");
  } catch (err) {
    toast(`Falha na importação: ${err.message}`, "error");
  } finally {
    e.target.value = "";
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
    confirm("Restaurar a última família salva neste navegador?")
  )
    store.loadSaved();
} catch {
  toast("Não foi possível restaurar a família salva.", "error");
}