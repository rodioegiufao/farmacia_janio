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
opt($("#workViewRibbon"), VIEWS);
function itemButton(item) {
  const li = document.createElement("li"),
    b = document.createElement("button");
  b.textContent = `${item.visible === false ? "○" : "●"} ${item.name}`;
  b.className = item.id === store.state.selectedElementId ? "selected" : "";
  b.onclick = () => store.select(item.id);
   b.oncontextmenu = (ev) => {
    ev.preventDefault();
    store.select(item.id);
    showElementMenu(ev.clientX, ev.clientY, item);
  };
  li.append(b);
  return li;
}
function showElementMenu(x, y, item) {
  document.querySelector(".element-context-menu")?.remove();
  const menu = document.createElement("div");
  menu.className = "element-context-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "Editar perfil";
  const isProfile = store.state.profiles.some((p) => p.id === item.id);
  edit.disabled = !isProfile;
  edit.onclick = () => {
    menu.remove();
    if (!store.beginProfileEdit(item.id)) return toast("Selecione um perfil para editar.", "error");
    toast("Perfil em edição: ajuste os vértices na vista 2D e clique em Concluir.");
  };
  menu.append(edit);
  document.body.append(menu);
  const close = (ev) => {
    if (!menu.contains(ev.target)) {
      menu.remove();
      document.removeEventListener("pointerdown", close);
    }
  };
  setTimeout(() => document.addEventListener("pointerdown", close), 0);
}
function sync(s) {
  els.projectName.value = s.name;
  els.category.value = s.category;
  els.workView.value = s.workView;
  els.activeToolLabel.value =
    {
      select: "Selecionar",
      profile: "Perfil livre",
      line: "Linha",
      rectangle: "Retângulo",
      circle: "Círculo",
      polygon: "Polígono",
      arc3: "Arco por três pontos",
    }[s.creationSession?.drawingTool || s.activeTool] || s.activeTool;
  els.snapStep.value = s.settings.snapStep;
  els.majorGrid.value = s.settings.majorGrid;
  els.showGrid.checked = s.settings.showGrid;
  els.snapEnabled.checked = s.settings.snapEnabled;
  $("#toolProfile")?.classList.toggle("active", s.activeTool === "profile");
  $("#toolSelect")?.classList.toggle("active", s.activeTool === "select");
  ["Line", "Rectangle", "Circle", "Polygon"].forEach((n) =>
    $("#tool" + n)?.classList.toggle(
      "active",
      s.activeTool === n.toLowerCase(),
    ),
  );
  document
    .querySelectorAll("[data-draw-tool]")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        s.creationSession?.drawingTool === b.dataset.drawTool,
      ),
    );
  $("#orthoToggle")?.classList.toggle("active", s.settings.ortho);
  els.treeProjectName.textContent = s.name;
  els.treeCategory.textContent = s.category;
  els.profileCount.textContent = s.profiles.length;
  els.extrusionCount.textContent = (s.forms || s.extrusions).length;
  els.profileTree.innerHTML = "";
  s.profiles.forEach((p) => els.profileTree.append(itemButton(p)));
  els.extrusionTree.innerHTML = "";
  (s.forms || s.extrusions).forEach((e) =>
    els.extrusionTree.append(itemButton(e)),
  );
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
  $("#toolStatus").textContent = `Ferramenta: ${els.activeToolLabel.value}`;
  const activeCreation = !!s.creationSession?.active;
  const activeProfileEdit = s.editMode === "profileEdit";
  const activeModify = activeCreation || activeProfileEdit;
  $("#createRibbon")?.classList.toggle("hidden", activeModify);
  $("#creationRibbon")?.classList.toggle("hidden", !activeModify);
  $("#optionsBar")?.classList.toggle("hidden", !activeModify);
  $("#workViewRibbon") && ($("#workViewRibbon").value = s.workView);
  if (activeProfileEdit) {
    const profile = s.profiles.find((p) => p.id === s.editingProfileId);
    $("#creationTitle").textContent = `Modificar | Editar perfil — ${profile?.name || "perfil selecionado"}`;
  } else if (activeCreation) {
    const names = {
      extrusion: "extrusão",
      blend: "mesclar",
      revolve: "revolver",
      sweep: "varredura",
      sweptBlend: "mesclar com varredura",
    };
    const steps = {
      profile: "desenhe o perfil",
      startProfile: "Etapa 1 de 2: desenhe o perfil inicial",
      endProfile: "Etapa 2 de 2: desenhe o perfil final",
      path: "desenhe o caminho",
      axis: "desenhe o eixo de revolução",
    };
    $("#creationTitle").textContent =
      `Modificar | Criar ${names[s.creationSession.formType]}${s.creationSession.operation === "void" ? " vazia" : ""} — ${steps[s.creationSession.step] || "desenhe"}`;
  }
}
function renderParams(s) {
  els.parameterList.innerHTML = "";
  s.parameters.forEach((p) => {
    const row = document.createElement("div");
    row.className = "param-row";
    row.innerHTML = `<input value="${p.name}" data-k="name"><input type="number" value="${p.value}" data-k="value"><span>mm</span>`;
    row.querySelectorAll("input").forEach(
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
    e = (s.forms || s.extrusions).find((x) => x.id === s.selectedElementId);
  if (!p && !e) {
    els.selectedPanel.innerHTML =
      '<h2>Selecionado</h2><p class="muted">Nada selecionado.</p>';
    return;
  }
  const item = p || e;
  const isRevolve =
    e &&
    (e.kind === "revolve" ||
      e.kind === "voidRevolve" ||
      String(e.kind).includes("Revolve"));
  const revolveControls = isRevolve
    ? `<label>Ângulo inicial (graus)<input id="selStartAngle" type="number" value="${e.startAngle ?? 0}"></label><label>Ângulo final (graus)<input id="selEndAngle" type="number" value="${e.endAngle ?? 360}"></label><label>Segmentos da revolução<input id="selSegments" type="number" min="8" max="128" value="${e.segments ?? 48}"></label><p class="muted">Eixo: ${e.pathId ? "linha desenhada na etapa do eixo" : "eixo vertical padrão"}.</p>`
    : "";
  els.selectedPanel.innerHTML = `<h2>Selecionado</h2><label>Nome<input id="selName" value="${item.name}"></label><label class="check"><input id="selVisible" type="checkbox" ${item.visible !== false ? "checked" : ""}> Visível</label>${e ? `<p>Tipo: ${e.kind || "extrusion"} (${e.operation || "solid"})</p><label>Profundidade/distância<input id="selDepth" value="${e.depth || e.distance || "Profundidade"}"></label><label>Deslocamento (mm)<input id="selOffset" type="number" value="${e.offset || 0}"></label>${revolveControls}` : `<p>${p.points.length} vértices na vista ${p.view}.</p>`}`;
  $("#selName").onchange = (ev) =>
    store.updateElement(item.id, { name: ev.target.value.trim() || item.name });
  $("#selVisible").onchange = (ev) =>
    store.updateElement(item.id, { visible: ev.target.checked });
  if (e) {
    $("#selDepth").onchange = (ev) =>
      store.updateElement(e.id, { depth: ev.target.value.trim() || 0 });
    $("#selOffset").onchange = (ev) =>
      store.updateElement(e.id, { offset: Number(ev.target.value) || 0 });
    if (isRevolve) {
      $("#selStartAngle").onchange = (ev) =>
        store.updateElement(e.id, { startAngle: Number(ev.target.value) || 0 });
      $("#selEndAngle").onchange = (ev) =>
        store.updateElement(e.id, { endAngle: Number(ev.target.value) || 360 });
      $("#selSegments").onchange = (ev) =>
        store.updateElement(e.id, {
          segments: Math.max(8, Number(ev.target.value) || 48),
        });
    }
  }
}
const plan2d = new Plan2D($("#planCanvas"), store, {
  onStatus: (p, len, kind) => {
    $("#coordX").textContent = `X: ${p.x.toFixed(0)} mm`;
    $("#coordY").textContent = `Y: ${p.y.toFixed(0)} mm`;
    $("#tempLength").textContent =
      `Segmento: ${len ? len.toFixed(0) + " mm" : "—"}`;
    $("#snapStatus").textContent = `Snap: ${kind}`;
  },
  onError: (m) => toast(m, "error"),
});
const scene3d = new Scene3D($("#threeCanvas"), store, { onError: (m) => toast(m, "error") });
store.subscribe(sync);
if ($("#toolProfile"))
  $("#toolProfile").onclick = () =>
    store.set({ activeTool: "profile", editMode: "profile" });
if ($("#toolSelect"))
  $("#toolSelect").onclick = () =>
    store.set({ activeTool: "select", editMode: null });
if ($("#toolLine"))
  $("#toolLine").onclick = () =>
    store.set({ activeTool: "line", editMode: "path" });
if ($("#toolRectangle"))
  $("#toolRectangle").onclick = () =>
    store.set({ activeTool: "rectangle", editMode: "profile" });
if ($("#toolCircle"))
  $("#toolCircle").onclick = () =>
    store.set({ activeTool: "circle", editMode: "profile" });
if ($("#toolPolygon"))
  $("#toolPolygon").onclick = () =>
    store.set({ activeTool: "polygon", editMode: "profile" });
if ($("#orthoToggle"))
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
  store.beginCreationSession({ formType: "extrusion", operation: "solid" });
  toast("Criar extrusão: desenhe um perfil fechado na vista 2D ou 3D.");
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
          forms: [],
          paths: [],
          name: "Nova família paramétrica",
        },
      }),
    );
  }
};
const deleteAction = () =>
  store.deleteSelected()
    ? toast("Elemento excluído.")
    : toast("Nada selecionado.", "error");
if ($("#deleteSelected")) $("#deleteSelected").onclick = deleteAction;
$("#deleteSelectedSide").onclick = deleteAction;
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
  if (
    !store.state.creationSession?.active &&
    !edit &&
    (e.key === "Delete" || e.key === "Backspace")
  )
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
document.querySelectorAll("[data-create-form]").forEach(
  (b) =>
    (b.onclick = () => {
      store.beginCreationSession({
        formType: b.dataset.createForm,
        operation: b.dataset.operation,
      });
      toast(`${b.textContent.trim()}: desenhe as etapas na vista 2D ou 3D.`);
    }),
);
document
  .querySelectorAll("[data-draw-tool]")
  .forEach(
    (b) => (b.onclick = () => store.setCreationDrawingTool(b.dataset.drawTool)),
  );
$("#finishEdit").onclick = () => (scene3d.hasDraft() ? scene3d.finish() : plan2d.finish());
$("#cancelEdit").onclick = () => {
  plan2d.cancel();
  scene3d.cancel();
  toast("Criação cancelada.");
};
$("#workViewRibbon").onchange = (e) => store.set({ workView: e.target.value });
$("#orthoOption").onchange = (e) =>
  store.updateSettings({ ortho: e.target.checked });
$("#setPlane").onclick = () =>
  toast("Plano de trabalho definido pela vista selecionada.");
$("#showPlane").onclick = () =>
  store.updateSettings({ showGrid: !store.state.settings.showGrid });
$("#howToDraw").onclick = () => $("#drawHelp").classList.remove("hidden");
$("#closeHelp").onclick = () => $("#drawHelp").classList.add("hidden");
$("#revolveHelp").onclick = () =>
  $("#revolveHelpModal").classList.remove("hidden");
$("#closeRevolveHelp").onclick = () =>
  $("#revolveHelpModal").classList.add("hidden");