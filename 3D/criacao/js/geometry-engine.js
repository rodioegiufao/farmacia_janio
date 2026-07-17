import * as THREE from "three";
import { MM_TO_SCENE, evalValue, parameterMap } from "./state.js";
import { collectVoidCutters } from "./csg-engine.js";

const EPS = 1e-6;
export const SOLID_KINDS = ["extrusion", "blend", "revolve", "sweep", "sweptBlend"];
export const VOID_KINDS = ["voidExtrusion", "voidBlend", "voidRevolve", "voidSweep", "voidSweptBlend"];
export const isVoidKind = (kind) => VOID_KINDS.includes(kind);
export const isSolidKind = (kind) => SOLID_KINDS.includes(kind);
const v2 = (p) => new THREE.Vector2(p.x * MM_TO_SCENE, p.y * MM_TO_SCENE);
const v3 = (p) => new THREE.Vector3(p.x * MM_TO_SCENE, p.y * MM_TO_SCENE, p.z * MM_TO_SCENE);

export function signedArea(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + (p.x * q.y - q.x * p.y);
  }, 0) / 2;
}
export function normalizedLoop(points, ccw = true) {
  const pts = points.map((p) => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
  const shouldReverse = ccw ? signedArea(pts) < 0 : signedArea(pts) > 0;
  return shouldReverse ? pts.reverse() : pts;
}
export function resampleLoop(points, count) {
  const pts = normalizedLoop(points);
  const lengths = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length].x - p.x, pts[(i + 1) % pts.length].y - p.y));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const out = [];
  for (let s = 0; s < count; s++) {
    let target = (s / count) * total;
    let i = 0;
    while (target > lengths[i] && i < lengths.length - 1) target -= lengths[i++];
    const a = pts[i], b = pts[(i + 1) % pts.length], t = lengths[i] ? target / lengths[i] : 0;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}
function rotateToBestMatch(a, b) {
  let best = b, bestScore = Infinity;
  for (let shift = 0; shift < b.length; shift++) {
    const rot = b.map((_, i) => b[(i + shift) % b.length]);
    const score = a.reduce((sum, p, i) => sum + Math.hypot(p.x - rot[i].x, p.y - rot[i].y), 0);
    if (score < bestScore) { bestScore = score; best = rot; }
  }
  return best;
}
function shapeFromLoop(points, holes = []) {
  const loop = normalizedLoop(points, true);
  const shape = new THREE.Shape(loop.map(v2));
  holes.forEach((hole) => shape.holes.push(new THREE.Path(normalizedLoop(hole, false).map(v2))));
  return shape;
}
function extrusion(profile, form, params, holes = []) {
  const depth = Math.max(evalValue(form.depth ?? form.end ?? "Profundidade", params), 1) * MM_TO_SCENE;
  return new THREE.ExtrudeGeometry(shapeFromLoop(profile.points, holes), { depth, bevelEnabled: false });
}
function blend(profileA, profileB, form, params) {
  const n = Math.max(profileA.points.length, profileB.points.length, 12);
  const a = resampleLoop(profileA.points, n);
  const b = rotateToBestMatch(a, resampleLoop(profileB.points, n));
  const dist = Math.max(evalValue(form.distance ?? form.depth ?? "Profundidade", params), 1) * MM_TO_SCENE;
  return loftSections([a, b], [0, dist]);
}
function revolve(profile, form) {
  const pts = normalizedLoop(profile.points).map((p) => new THREE.Vector2(Math.max(Math.abs(p.x), 1) * MM_TO_SCENE, p.y * MM_TO_SCENE));
  const start = THREE.MathUtils.degToRad(Number(form.startAngle ?? 0));
  const end = THREE.MathUtils.degToRad(Number(form.endAngle ?? 360));
  return new THREE.LatheGeometry(pts, Number(form.segments) || 48, start, end - start);
}
function pathPoints(path) { return (path?.points?.length ? path.points : [{x:0,y:0,z:0},{x:0,y:0,z:800}]).map((p) => ({ x:p.x??0, y:p.y??0, z:p.z??0 })); }
function sweep(profile, path) { return sweepBetween(profile.points, profile.points, pathPoints(path)); }
function sweptBlend(profileA, profileB, path) { return sweepBetween(profileA.points, profileB.points, pathPoints(path)); }
function sweepBetween(pointsA, pointsB, path) {
  const n = Math.max(pointsA.length, pointsB.length, 12);
  const a = resampleLoop(pointsA, n); const b = rotateToBestMatch(a, resampleLoop(pointsB, n));
  const sections = path.map((_, i) => a.map((p, j) => ({ x: p.x + (b[j].x - p.x) * (i / Math.max(path.length - 1, 1)), y: p.y + (b[j].y - p.y) * (i / Math.max(path.length - 1, 1)) })));
  return loftSections(sections, path.map((p) => p.z * MM_TO_SCENE), path);
}
function loftSections(sections, zs, path = null) {
  const vertices = [], indices = [], n = sections[0].length;
  sections.forEach((sec, si) => sec.forEach((p) => vertices.push(p.x * MM_TO_SCENE + (path?.[si]?.x || 0) * MM_TO_SCENE, p.y * MM_TO_SCENE + (path?.[si]?.y || 0) * MM_TO_SCENE, zs[si])));
  for (let s = 0; s < sections.length - 1; s++) for (let i = 0; i < n; i++) indices.push(s*n+i, s*n+(i+1)%n, (s+1)*n+(i+1)%n, s*n+i, (s+1)*n+(i+1)%n, (s+1)*n+i);
  for (let i = 1; i < n-1; i++) indices.push(0, i, i+1, (sections.length-1)*n, (sections.length-1)*n+i+1, (sections.length-1)*n+i);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
export function buildGeometry(state, form) {
  const params = parameterMap(state), profiles = state.profiles;
  const p1 = profiles.find((p) => p.id === form.profileId) || profiles[0];
  const p2 = profiles.find((p) => p.id === form.endProfileId) || p1;
  const path = state.paths?.find((p) => p.id === form.pathId);
  if (!p1) return null;
  if (form.kind.includes("Blend") || form.kind === "blend" || form.kind === "voidBlend") return blend(p1, p2, form, params);
  if (form.kind.includes("Revolve") || form.kind === "revolve" || form.kind === "voidRevolve") return revolve(p1, form);
  if (form.kind.includes("SweptBlend") || form.kind === "sweptBlend" || form.kind === "voidSweptBlend") return sweptBlend(p1, p2, path);
  if (form.kind.includes("Sweep") || form.kind === "sweep" || form.kind === "voidSweep") return sweep(p1, path);
  const holes = collectVoidCutters(state, form).map((f) => profiles.find((p) => p.id === f.profileId)?.points).filter(Boolean);
  return extrusion(p1, form, params, isVoidKind(form.kind) ? [] : holes);
}