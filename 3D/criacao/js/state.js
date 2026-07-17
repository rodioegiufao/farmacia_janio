export const STORAGE_KEY = "engrodrigo-family-studio-v1";
export const MM_TO_SCENE = 0.001;
export const UNIT = "mm";

const now = () => new Date().toISOString();
const clone = (value) => structuredClone(value);

export const CATEGORIES = ["Mobiliário", "Equipamento", "Modelo genérico", "Esquadria", "Hidrossanitário"];
export const VIEWS = [
  { id: "front", name: "Frontal", plane: "XY" },
  { id: "top", name: "Superior", plane: "XZ" },
  { id: "right", name: "Lateral", plane: "YZ" },
];

export function uuid(prefix = "id") {
  return crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
export function createInitialState() {
  return {
    format: "engrodrigo-family-json",
    formatVersion: 1,
    appName: "EngRodrigo Family Studio",
    name: "Nova família paramétrica",
    category: "Mobiliário",
    createdAt: now(),
    updatedAt: now(),
    activeTool: "profile",
    view: "split",
    workView: "front",
    selectedElementId: null,
    settings: { snapStep: 10, majorGrid: 100, snapEnabled: true, showGrid: true, ortho: false },
    parameters: [
      { id: uuid("param"), name: "Largura", value: 600, unit: UNIT },
      { id: uuid("param"), name: "Profundidade", value: 400, unit: UNIT },
      { id: uuid("param"), name: "Altura", value: 800, unit: UNIT },
      { id: uuid("param"), name: "Espessura", value: 20, unit: UNIT },
    ],
    types: [{ id: uuid("type"), name: "Padrão", values: { Largura: 600, Profundidade: 400, Altura: 800, Espessura: 20 } }],
    currentTypeId: null,
    referencePlanes: [
      { id: "ref-center-v", name: "Centro vertical", view: "front", axis: "x", offset: 0, visible: true },
      { id: "ref-base", name: "Base", view: "front", axis: "y", offset: 0, visible: true },
    ],
    profiles: [],
    extrusions: [],
    history: { undo: [], redo: [] },
  };
}
export function parameterMap(state) {
  return Object.fromEntries(state.parameters.map((p) => [p.name, Number(p.value) || 0]));
}
export function evalValue(value, params = {}) {
  if (typeof value === "number") return value;
  const text = String(value ?? "0").trim();
  if (!text) return 0;
  if (Object.prototype.hasOwnProperty.call(params, text)) return params[text];
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}
export function pointTo3D(point, viewId, depth = 0) {
  if (viewId === "top") return { x: point.x, y: depth, z: point.y };
  if (viewId === "right") return { x: depth, y: point.y, z: point.x };
  return { x: point.x, y: point.y, z: depth };
}
export function profileBounds(points) {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export class Store {
  constructor() { this.state = createInitialState(); this.state.currentTypeId = this.state.types[0].id; this.listeners = new Set(); }
  subscribe(fn) { this.listeners.add(fn); fn(this.state); return () => this.listeners.delete(fn); }
  emit() { this.state.updatedAt = now(); this.listeners.forEach((fn) => fn(this.state)); }
  snapshot() { const s = clone(this.state); s.history = { undo: [], redo: [] }; return s; }
  pushHistory() { this.state.history.undo.push(this.snapshot()); if (this.state.history.undo.length > 80) this.state.history.undo.shift(); this.state.history.redo = []; }
  set(partial, { history = false } = {}) { if (history) this.pushHistory(); Object.assign(this.state, partial); this.emit(); }
  updateSettings(p) { this.set({ settings: { ...this.state.settings, ...p } }); }
  addProfile(points) { this.pushHistory(); const item = { id: uuid("profile"), name: `Perfil ${this.state.profiles.length + 1}`, view: this.state.workView, points, visible: true, material: { color: "#8dd6c4" } }; this.state.profiles.push(item); this.state.selectedElementId = item.id; this.emit(); }
  addExtrusion(profileId, depth = "Profundidade", offset = 0) { const profile = this.state.profiles.find((p) => p.id === profileId); if (!profile) return; this.pushHistory(); const item = { id: uuid("extrusion"), name: `Extrusão ${this.state.extrusions.length + 1}`, profileId, depth, offset, visible: true, material: { color: "#4aa3df" } }; this.state.extrusions.push(item); this.state.selectedElementId = item.id; this.emit(); }
  updateElement(id, patch) { this.pushHistory(); for (const key of ["profiles", "extrusions"]) this.state[key] = this.state[key].map((e) => e.id === id ? { ...e, ...patch } : e); this.emit(); }
  select(id) { this.state.selectedElementId = id; this.emit(); }
  deleteSelected() { const id = this.state.selectedElementId; if (!id) return false; this.pushHistory(); this.state.profiles = this.state.profiles.filter((p) => p.id !== id); this.state.extrusions = this.state.extrusions.filter((e) => e.id !== id && e.profileId !== id); this.state.selectedElementId = null; this.emit(); return true; }
  addParameter(name, value) { this.pushHistory(); this.state.parameters.push({ id: uuid("param"), name, value: Number(value) || 0, unit: UNIT }); this.emit(); }
  updateParameter(id, patch) { this.pushHistory(); this.state.parameters = this.state.parameters.map((p) => p.id === id ? { ...p, ...patch, value: Number(patch.value ?? p.value) || 0 } : p); this.emit(); }
  addType() { this.pushHistory(); this.state.types.push({ id: uuid("type"), name: `Tipo ${this.state.types.length + 1}`, values: parameterMap(this.state) }); this.emit(); }
  applyType(id) { const type = this.state.types.find((t) => t.id === id); if (!type) return; this.pushHistory(); this.state.currentTypeId = id; this.state.parameters = this.state.parameters.map((p) => ({ ...p, value: type.values[p.name] ?? p.value })); this.emit(); }
  undo() { const p = this.state.history.undo.pop(); if (!p) return; this.state.history.redo.push(this.snapshot()); this.state = { ...p, history: this.state.history }; this.emit(); }
  redo() { const n = this.state.history.redo.pop(); if (!n) return; this.state.history.undo.push(this.snapshot()); this.state = { ...n, history: this.state.history }; this.emit(); }
  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot())); }
  loadSaved() { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return false; this.replace(validateFamily(JSON.parse(raw))); return true; }
  replace(project) { this.state = { ...project, history: { undo: [], redo: [] }, selectedElementId: null }; this.emit(); }
}
export function validateFamily(data) {
  if (!data || data.format !== "engrodrigo-family-json") throw new Error("JSON de família inválido ou incompatível.");
  const base = createInitialState();
  return { ...base, ...data, settings: { ...base.settings, ...data.settings }, parameters: Array.isArray(data.parameters) ? data.parameters : base.parameters, types: Array.isArray(data.types) ? data.types : base.types, profiles: Array.isArray(data.profiles) ? data.profiles : [], extrusions: Array.isArray(data.extrusions) ? data.extrusions : [] };
}