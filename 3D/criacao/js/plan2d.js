import { MM_TO_SCENE } from "./state.js";
import { buildGeometry, isVoidKind } from "./geometry-engine.js";

const DRAW_TOOL_MODES = {
  "polygon-inscribed": "polygon",
  "polygon-circumscribed": "polygon",
  "start-end-radius-arc": "arc3",
  "center-end-arc": "arc3",
  "tangent-end-arc": "arc3",
  "fillet-arc": "arc3",
  spline: "line",
  ellipse: "circle",
  "partial-ellipse": "arc3",
  "pick-lines": "line",
  "pick-walls": "line",
  "point-element": "line",
  "pick-supports": "line",
};
const drawingMode = (tool) => DRAW_TOOL_MODES[tool] || tool;

const projectionPoint = (view, x, y, z) => {
  if (view === "top") return { x, y: z };
  if (view === "right") return { x: z, y };
  return { x, y };
};
export class Plan2D {
  constructor(canvas, store, { onStatus, onError }) {
Object.assign(this, { c: canvas, ctx: canvas.getContext("2d"), store, onStatus, onError, scale: 0.7, off: { x: 0, y: 0 }, points: [], preview: null, primitiveStart: 0, lastTool: null, drag: null, editVertexDrag: null, moveDrag: null, typedDistance: "" });
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener("wheel", (e) => this.wheel(e), { passive: false });
    canvas.addEventListener("pointerdown", (e) => this.down(e));
    canvas.addEventListener("pointermove", (e) => this.move(e));
    canvas.addEventListener("pointerup", () => { this.drag = null; this.editVertexDrag = null; this.moveDrag = null; });
    canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); this.finish(); });
    window.addEventListener("keydown", (e) => this.key(e));
    store.subscribe((s) => {
      const previousEditId = this.s?.editingProfileId;
      const previousTool = this.lastTool;
      this.s = s;
      const currentTool = this.activeTool();
      if (previousTool && currentTool !== previousTool) {
        this.primitiveStart = this.points.length;
        this.preview = null;
      }
      this.lastTool = currentTool;
      if (s.editMode === "profileEdit" && s.editingProfileId && s.editingProfileId !== previousEditId) {
        const profile = s.profiles.find((p) => p.id === s.editingProfileId);
        this.points = profile ? profile.points.map((pt) => ({ ...pt })) : [];
        this.preview = null;
      }
      this.draw();
    });
  }
  resize() { const r = this.c.getBoundingClientRect(), d = devicePixelRatio || 1; this.c.width = r.width * d; this.c.height = r.height * d; this.ctx.setTransform(d, 0, 0, d, 0, 0); if (!this.off.x) this.off = { x: r.width / 2, y: r.height / 2 }; this.draw(); }
  screen(p) { return { x: p.x * this.scale + this.off.x, y: this.off.y - p.y * this.scale }; }
  world(e) { const r = this.c.getBoundingClientRect(); return { x: (e.clientX - r.left - this.off.x) / this.scale, y: (this.off.y - (e.clientY - r.top)) / this.scale }; }
  activeTool() { return drawingMode(this.s.creationSession?.active ? this.s.creationSession.drawingTool : this.s.activeTool); }
  snap(p, shift = false) {
    let q = { ...p }, kind = "livre";
    if (this.s.settings.snapEnabled) {
      const st = this.s.settings.snapStep; q = { x: Math.round(p.x / st) * st, y: Math.round(p.y / st) * st }; kind = "grade";
      for (const prof of this.s.profiles) for (const pt of prof.points) if (Math.hypot(pt.x - p.x, pt.y - p.y) < 12 / this.scale) { q = { ...pt }; kind = "vértice"; }
      this.points.forEach((pt) => { if (Math.hypot(pt.x - p.x, pt.y - p.y) < 12 / this.scale) { q = { ...pt }; kind = "ponto"; } });
    }
    const last = this.points.at(-1); if ((this.s.settings.ortho || shift) && last) { Math.abs(q.x - last.x) > Math.abs(q.y - last.y) ? (q.y = last.y) : (q.x = last.x); kind += " orto"; }
    return { point: q, kind };
  }
  wheel(e) { e.preventDefault(); const b = this.world(e); this.scale = Math.min(3, Math.max(0.15, this.scale * (e.deltaY < 0 ? 1.1 : 0.9))); const a = this.world(e); this.off.x += (a.x - b.x) * this.scale; this.off.y -= (a.y - b.y) * this.scale; this.draw(); }
  isDrawing() { return this.s?.creationSession?.active || this.s?.editMode === "profileEdit" || ["line", "rectangle", "circle", "polygon", "arc3"].includes(this.activeTool()); }
  key(e) {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    const isNumberKey = /^\d$/.test(e.key) || [",", ".", "Backspace"].includes(e.key);
    if (this.points.length && this.isDrawing() && isNumberKey) {
      e.preventDefault();
      if (e.key === "Backspace") this.typedDistance = this.typedDistance.slice(0, -1);
      else if ((e.key === "." || e.key === ",") && !/[.,]/.test(this.typedDistance)) this.typedDistance += ".";
      else if (/^\d$/.test(e.key)) this.typedDistance += e.key;
      this.applyTypedDistance();
      return;
    }
    if (e.key === "Escape") this.cancel();
    if (e.key === "Enter") {
      e.preventDefault();
      if (this.typedDistance && this.preview) this.commitPreviewPoint();
      else this.finish();
    }
  }
  applyTypedDistance() {
    const distance = Number(this.typedDistance.replace(",", "."));
    const last = this.points.at(-1);
    if (!last || !Number.isFinite(distance)) return;
    const target = this.preview || { x: last.x + 1, y: last.y };
    const vx = target.x - last.x, vy = target.y - last.y;
    const len = Math.hypot(vx, vy) || 1;
    this.preview = { x: last.x + (vx / len) * distance, y: last.y + (vy / len) * distance };
    this.onStatus(this.preview, distance, `distância ${distance} mm`);
    if (this.s.creationSession?.active) this.store.setTemporaryPoints(this.currentDraft());
    this.draw();
  }
  commitPreviewPoint() {
    const point = { ...this.preview };
    this.typedDistance = "";
    this.points.push(point);
    this.preview = null;
    const tool = this.activeTool();
    const primitiveCount = this.points.length - this.primitiveStart;
    const canKeepComposing = this.s.creationSession?.active || this.s.editMode === "profileEdit";
    if (["rectangle", "circle", "polygon"].includes(tool) && primitiveCount === 2) return canKeepComposing ? this.commitPrimitive() : this.finish();
    if (tool === "arc3" && primitiveCount === 3) return canKeepComposing ? this.commitPrimitive() : this.finish();
    if (this.s.creationSession?.active) this.store.setTemporaryPoints(this.currentDraft());
    this.draw();
  }
  down(e) {
    if (e.button === 1 || e.altKey) { this.drag = { x: e.clientX, y: e.clientY, off: { ...this.off } }; return; }
    const { point } = this.snap(this.world(e), e.shiftKey), tool = this.activeTool();
    if (this.s.editMode === "profileEdit") {
      if (e.button === 2) return;
      const hit = this.points.findIndex((pt) => Math.hypot(pt.x - point.x, pt.y - point.y) < 14 / this.scale);
      if (hit >= 0) { this.editVertexDrag = hit; return; }
    }
    if (tool === "select") {
      const picked = this.pick(point);
      if (picked) {
        this.store.pushHistory();
        this.moveDrag = { id: picked, last: point };
        this.c.setPointerCapture?.(e.pointerId);
      }
      return;
    }
    if (this.points.length > 2 && Math.hypot(point.x - this.points[0].x, point.y - this.points[0].y) < 15) return this.finish();
    this.points.push(point); this.preview = null; this.typedDistance = "";
    const primitiveCount = this.points.length - this.primitiveStart;
    const canKeepComposing = this.s.creationSession?.active || this.s.editMode === "profileEdit";
    if (["rectangle", "circle", "polygon"].includes(tool) && primitiveCount === 2) {
      if (canKeepComposing) this.commitPrimitive();
      else this.finish();
      return;
    }
    if (tool === "arc3" && primitiveCount === 3) {
      if (canKeepComposing) this.commitPrimitive();
      else this.finish();
      return;
    }
    if (this.s.creationSession?.active) this.store.setTemporaryPoints(this.currentDraft());
    this.draw();
  }
  move(e) { if (this.drag) { this.off = { x: this.drag.off.x + e.clientX - this.drag.x, y: this.drag.off.y + e.clientY - this.drag.y }; return this.draw(); } const sn = this.snap(this.world(e), e.shiftKey); if (this.moveDrag) { const delta2 = { x: sn.point.x - this.moveDrag.last.x, y: sn.point.y - this.moveDrag.last.y }; if (Math.hypot(delta2.x, delta2.y) > 0) { this.store.moveElement(this.moveDrag.id, this.deltaForWorkView(delta2), { history: false }); this.moveDrag.last = sn.point; } this.onStatus(sn.point, 0, sn.kind); return; } if (this.editVertexDrag !== null) { this.points[this.editVertexDrag] = sn.point; this.preview = null; this.onStatus(sn.point, 0, sn.kind); return this.draw(); } this.preview = sn.point; const last = this.points.at(-1); this.onStatus(sn.point, last ? Math.hypot(sn.point.x - last.x, sn.point.y - last.y) : 0, sn.kind); if (this.s.creationSession?.active) this.store.setTemporaryPoints(this.currentDraft()); this.draw(); }
  deltaForWorkView(delta) {
    if (this.s.workView === "top") return { x: delta.x, y: 0, z: delta.y };
    if (this.s.workView === "right") return { x: 0, y: delta.y, z: delta.x };
    return { x: delta.x, y: delta.y, z: 0 };
  }
  currentDraft() { const pts = [...this.points]; if (this.preview) pts.push(this.preview); return this.composePrimitive(pts); }
  composePrimitive(pts) {
    const start = Math.min(this.primitiveStart || 0, pts.length);
    const head = pts.slice(0, start), tail = pts.slice(start);
    const primitive = this.makePrimitive(tail);
    return primitive ? head.concat(primitive) : pts;
  }
  commitPrimitive() {
    this.points = this.currentDraft().map((p) => ({ ...p }));
    this.preview = null;
    this.primitiveStart = this.points.length;
    if (this.s.creationSession?.active) this.store.setTemporaryPoints(this.points);
    this.draw();
  }
  makePrimitive(pts) {
    const tool = this.activeTool(); if (pts.length < 2) return null; const a = pts[0], b = pts[1];
    if (tool === "rectangle") return [{ x:a.x,y:a.y },{ x:b.x,y:a.y },{ x:b.x,y:b.y },{ x:a.x,y:b.y }];
    if (tool === "circle" || tool === "polygon") { const n = tool === "circle" ? 48 : Number(document.querySelector("#polygonSides")?.value) || 6, r = Math.hypot(b.x-a.x,b.y-a.y); return Array.from({ length: Math.max(3,n) }, (_, i) => ({ x: a.x + Math.cos(i/n*Math.PI*2)*r, y: a.y + Math.sin(i/n*Math.PI*2)*r })); }
    if (tool === "arc3" && pts.length >= 3) return this.arcPoints(pts[0], pts[1], pts[2]);
    return null;
  }
  arcPoints(a,b,c){ const d=2*(a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y)); if(Math.abs(d)<1e-6) return [a,b,c]; const ux=((a.x*a.x+a.y*a.y)*(b.y-c.y)+(b.x*b.x+b.y*b.y)*(c.y-a.y)+(c.x*c.x+c.y*c.y)*(a.y-b.y))/d, uy=((a.x*a.x+a.y*a.y)*(c.x-b.x)+(b.x*b.x+b.y*b.y)*(a.x-c.x)+(c.x*c.x+c.y*c.y)*(b.x-a.x))/d; const aa=Math.atan2(a.y-uy,a.x-ux), cc=Math.atan2(c.y-uy,c.x-ux), bb=Math.atan2(b.y-uy,b.x-ux); let end=cc; const between=(x,s,e)=>s<e?x>s&&x<e:x>s||x<e; if(!between(bb,aa,end)) end += end<aa ? Math.PI*2 : -Math.PI*2; return Array.from({length:24},(_,i)=>{const t=i/23, ang=aa+(end-aa)*t, r=Math.hypot(a.x-ux,a.y-uy); return {x:ux+Math.cos(ang)*r,y:uy+Math.sin(ang)*r};}); }
  validate(points, closed) { if (points.length < (closed ? 3 : 2)) throw new Error(closed ? "Crie ao menos três pontos." : "Crie ao menos dois pontos."); for (let i=1;i<points.length;i++) if (Math.hypot(points[i].x-points[i-1].x, points[i].y-points[i-1].y) < 1e-6) throw new Error("Remova pontos consecutivos duplicados."); if (closed) for (let i=0;i<points.length;i++) for (let j=i+1;j<points.length;j++) { if (Math.abs(i-j)<2 || (i===0 && j===points.length-1)) continue; if (this.intersects(points[i], points[(i+1)%points.length], points[j], points[(j+1)%points.length])) throw new Error("Perfil com auto-interseção."); } }
  intersects(a,b,c,d){ const ccw=(p,q,r)=>(r.y-p.y)*(q.x-p.x)>(q.y-p.y)*(r.x-p.x); return ccw(a,c,d)!==ccw(b,c,d)&&ccw(a,b,c)!==ccw(a,b,d); }
  finish() { try { const cs = this.s.creationSession, step = cs?.step; const tool = this.activeTool(); let pts = this.composePrimitive(this.points); const closed = !cs || !["path","axis"].includes(step); this.validate(pts, closed); if (this.s.editMode === "profileEdit") { this.store.finishProfileEdit(pts); this.points=[]; this.preview=null; this.primitiveStart=0; this.draw(); return; } if (cs?.active) { const color = cs.operation === "void" ? "#f36b2d" : "#ff00cc"; if (step === "path" || step === "axis") { const path=this.store.addPath(pts.map((p)=>({...p,z:0})),{name: step === "axis" ? "Eixo de revolução" : "Caminho"}); this.store.advanceCreationStep(step === "axis" ? {axisId:path.id,pathId:path.id}:{pathId:path.id}); } else { this.store.addProfile(pts,{name:"Perfil de criação",material:{color}}); try { this.store.advanceCreationStep({profileId:this.store.state.selectedElementId}); } catch (err) { this.onError(err.message); } } } else if (tool === "line") this.store.addPath(pts.map((p)=>({...p,z:0}))); else this.store.addProfile(pts); this.points=[]; this.preview=null; this.primitiveStart=0; this.draw(); } catch (err) { this.onError(err.message); } }
  cancel() { this.points = []; this.preview = null; this.typedDistance = ""; this.primitiveStart = 0; this.editVertexDrag = null; if (this.s?.editMode === "profileEdit") this.store.cancelProfileEdit(); if (this.s?.creationSession?.active) this.store.cancelCreationSession(); this.draw(); }
  pointSegmentDistance(p, a, b) { const vx=b.x-a.x, vy=b.y-a.y, len=vx*vx+vy*vy || 1; const t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/len)); return Math.hypot(p.x-(a.x+vx*t), p.y-(a.y+vy*t)); }
  pick(p) {
    let best=null, bd=1e9;
    for (const form of (this.s.forms||this.s.extrusions||[]).filter((f)=>f.visible!==false)) for (const [a,b] of this.projectedSegments(form)) { const d=this.pointSegmentDistance(p,a,b); if(d<bd){bd=d; best=form;} }
    for (const path of (this.s.paths||[]).filter((x)=>x.visible!==false)) for (let i=1;i<path.points.length;i++) { const d=this.pointSegmentDistance(p,path.points[i-1],path.points[i]); if(d<bd){bd=d; best=path;} }
    for (const prof of this.s.profiles.filter((x)=>x.visible!==false&&x.view===this.s.workView)) for (const pt of prof.points) { const d=Math.hypot(pt.x-p.x,pt.y-p.y); if(d<bd){bd=d; best=prof;} }
    this.store.select(bd < 25 / this.scale ? best?.id || null : null);
    return bd < 25 / this.scale ? best?.id || null : null;
  }
  drawPoly(points, close, color, selected = false, stroke = null) { const ctx=this.ctx; if(!points.length) return; ctx.beginPath(); points.map((p)=>this.screen(p)).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); if(close) ctx.closePath(); ctx.fillStyle=color; ctx.strokeStyle=stroke || (selected ? "#0a5fb4" : "#2d4b55"); ctx.lineWidth=selected?3:2; if(close) ctx.fill(); ctx.stroke(); }
  projectedSegments(form) {
    const geom = buildGeometry(this.s, form);
    const pos = geom?.attributes?.position;
    if (!pos) return [];
    const index = geom.index?.array;
    const edgeKeys = new Set(), segments = [];
    const read = (i) => projectionPoint(this.s.workView, pos.getX(i) / MM_TO_SCENE, pos.getY(i) / MM_TO_SCENE, pos.getZ(i) / MM_TO_SCENE);
    const add = (a, b) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      const p = read(a), q = read(b);
      if (Math.hypot(p.x - q.x, p.y - q.y) > 0.01) segments.push([p, q]);
    };
    if (index) for (let i = 0; i < index.length; i += 3) { add(index[i], index[i + 1]); add(index[i + 1], index[i + 2]); add(index[i + 2], index[i]); }
    else for (let i = 0; i < pos.count; i += 3) { add(i, i + 1); add(i + 1, i + 2); add(i + 2, i); }
    geom.dispose();
    return segments;
  }
  drawProjection(form) {
    const ctx = this.ctx, isVoid = isVoidKind(form.kind), selected = form.id === this.s.selectedElementId;
    ctx.save(); ctx.strokeStyle = selected ? (isVoid ? "#d95b18" : "#0a5fb4") : (isVoid ? "#f36b2d99" : "#225b7a66"); ctx.lineWidth = selected ? 2.5 : 1.4; ctx.setLineDash(isVoid ? [7, 5] : []);
    this.projectedSegments(form).forEach(([a,b]) => { const p=this.screen(a), q=this.screen(b); ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); });
    ctx.restore();
  }
  draw() { if(!this.s) return; const r=this.c.getBoundingClientRect(), ctx=this.ctx; ctx.clearRect(0,0,r.width,r.height); if(this.s.settings.showGrid){ const minor=this.s.settings.snapStep*this.scale, major=this.s.settings.majorGrid*this.scale; ctx.lineWidth=1; for(const [st,col] of [[minor,"#edf2f2"],[major,"#cad8d8"]]){ ctx.strokeStyle=col; for(let x=this.off.x%st;x<r.width;x+=st){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,r.height);ctx.stroke();} for(let y=this.off.y%st;y<r.height;y+=st){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke();}} } const o=this.screen({x:0,y:0}); ctx.strokeStyle="#b55"; ctx.beginPath(); ctx.moveTo(o.x-10,o.y);ctx.lineTo(o.x+10,o.y);ctx.moveTo(o.x,o.y-10);ctx.lineTo(o.x,o.y+10);ctx.stroke(); (this.s.forms||this.s.extrusions||[]).filter((f)=>f.visible!==false).forEach((f)=>this.drawProjection(f)); (this.s.paths||[]).filter((p)=>p.visible!==false).forEach((path)=>this.drawPoly(path.points,false,path.id===this.s.selectedElementId?"#f6a13a88":"#f6a13a55",path.id===this.s.selectedElementId)); this.s.profiles.filter((p)=>p.visible!==false&&p.view===this.s.workView).forEach((p)=>this.drawPoly(p.points,true,p.id===this.s.selectedElementId?"#76b7f055":"#8dd6c455",p.id===this.s.selectedElementId)); const draft=this.currentDraft(); this.drawPoly(draft,false,"#ff00cc22",true,this.s.creationSession?.operation==="void"?"#f36b2d":"#ff00cc"); if(this.preview){ const sp=this.screen(this.preview); ctx.fillStyle="#ff00cc"; ctx.beginPath(); ctx.arc(sp.x,sp.y,4,0,Math.PI*2); ctx.fill(); } }
}