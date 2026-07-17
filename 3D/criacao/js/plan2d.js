export class Plan2D {
  constructor(canvas, store, { onStatus, onError }) {
    Object.assign(this, { c: canvas, ctx: canvas.getContext("2d"), store, onStatus, onError, scale: 0.7, off: { x: 0, y: 0 }, points: [], preview: null, drag: null });
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener("wheel", (e) => this.wheel(e), { passive: false });
    canvas.addEventListener("pointerdown", (e) => this.down(e));
    canvas.addEventListener("pointermove", (e) => this.move(e));
    canvas.addEventListener("pointerup", () => (this.drag = null));
    canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); this.finish(); });
    window.addEventListener("keydown", (e) => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; if (e.key === "Escape") this.cancel(); if (e.key === "Enter") this.finish(); });
    store.subscribe((s) => { this.s = s; this.draw(); });
  }
  resize() { const r = this.c.getBoundingClientRect(), d = devicePixelRatio || 1; this.c.width = r.width * d; this.c.height = r.height * d; this.ctx.setTransform(d, 0, 0, d, 0, 0); if (!this.off.x) this.off = { x: r.width / 2, y: r.height / 2 }; this.draw(); }
  screen(p) { return { x: p.x * this.scale + this.off.x, y: this.off.y - p.y * this.scale }; }
  world(e) { const r = this.c.getBoundingClientRect(); return { x: (e.clientX - r.left - this.off.x) / this.scale, y: (this.off.y - (e.clientY - r.top)) / this.scale }; }
  activeTool() { return this.s.creationSession?.active ? this.s.creationSession.drawingTool : this.s.activeTool; }
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
  down(e) {
    if (e.button === 1 || e.altKey) { this.drag = { x: e.clientX, y: e.clientY, off: { ...this.off } }; return; }
    const { point } = this.snap(this.world(e), e.shiftKey), tool = this.activeTool();
    if (tool === "select") return this.pick(point);
    if (this.points.length > 2 && Math.hypot(point.x - this.points[0].x, point.y - this.points[0].y) < 15) return this.finish();
    this.points.push(point); this.preview = null;
    if (["rectangle", "circle", "polygon"].includes(tool) && this.points.length === 2) this.finish();
    if (tool === "arc3" && this.points.length === 3) this.finish();
    if (this.s.creationSession?.active) this.store.setTemporaryPoints(this.currentDraft());
    this.draw();
  }
  move(e) { if (this.drag) { this.off = { x: this.drag.off.x + e.clientX - this.drag.x, y: this.drag.off.y + e.clientY - this.drag.y }; return this.draw(); } const sn = this.snap(this.world(e), e.shiftKey); this.preview = sn.point; const last = this.points.at(-1); this.onStatus(sn.point, last ? Math.hypot(sn.point.x - last.x, sn.point.y - last.y) : 0, sn.kind); if (this.s.creationSession?.active) this.store.setTemporaryPoints(this.currentDraft()); this.draw(); }
  currentDraft() { const pts = [...this.points]; if (this.preview) pts.push(this.preview); return this.makePrimitive(pts) || pts; }
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
  finish() { try { const cs = this.s.creationSession, step = cs?.step; const tool = this.activeTool(); let pts = this.makePrimitive(this.points) || [...this.points]; const closed = !cs || !["path","axis"].includes(step); this.validate(pts, closed); if (cs?.active) { const color = cs.operation === "void" ? "#f36b2d" : "#ff00cc"; if (step === "path" || step === "axis") { const path=this.store.addPath(pts.map((p)=>({...p,z:0})),{name: step === "axis" ? "Eixo de revolução" : "Caminho"}); this.store.advanceCreationStep(step === "axis" ? {axisId:path.id,pathId:path.id}:{pathId:path.id}); } else { this.store.addProfile(pts,{name:"Perfil de criação",material:{color}}); try { this.store.advanceCreationStep({profileId:this.store.state.selectedElementId}); } catch (err) { this.onError(err.message); } } } else if (tool === "line") this.store.addPath(pts.map((p)=>({...p,z:0}))); else this.store.addProfile(pts); this.points=[]; this.preview=null; this.draw(); } catch (err) { this.onError(err.message); } }
  cancel() { this.points = []; this.preview = null; if (this.s?.creationSession?.active) this.store.cancelCreationSession(); this.draw(); }
  pick(p) { let best=null, bd=1e9; for (const prof of this.s.profiles) for (const pt of prof.points) { const d=Math.hypot(pt.x-p.x,pt.y-p.y); if(d<bd){bd=d; best=prof;} } this.store.select(bd < 25 ? best.id : null); }
  drawPoly(points, close, color, selected = false, stroke = null) { const ctx=this.ctx; if(!points.length) return; ctx.beginPath(); points.map((p)=>this.screen(p)).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); if(close) ctx.closePath(); ctx.fillStyle=color; ctx.strokeStyle=stroke || (selected ? "#0a5fb4" : "#2d4b55"); ctx.lineWidth=selected?3:2; if(close) ctx.fill(); ctx.stroke(); }
  draw() { if(!this.s) return; const r=this.c.getBoundingClientRect(), ctx=this.ctx; ctx.clearRect(0,0,r.width,r.height); if(this.s.settings.showGrid){ const minor=this.s.settings.snapStep*this.scale, major=this.s.settings.majorGrid*this.scale; ctx.lineWidth=1; for(const [st,col] of [[minor,"#edf2f2"],[major,"#cad8d8"]]){ ctx.strokeStyle=col; for(let x=this.off.x%st;x<r.width;x+=st){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,r.height);ctx.stroke();} for(let y=this.off.y%st;y<r.height;y+=st){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke();}} } const o=this.screen({x:0,y:0}); ctx.strokeStyle="#b55"; ctx.beginPath(); ctx.moveTo(o.x-10,o.y);ctx.lineTo(o.x+10,o.y);ctx.moveTo(o.x,o.y-10);ctx.lineTo(o.x,o.y+10);ctx.stroke(); (this.s.paths||[]).filter((p)=>p.visible!==false).forEach((path)=>this.drawPoly(path.points,false,path.id===this.s.selectedElementId?"#f6a13a88":"#f6a13a55",path.id===this.s.selectedElementId)); this.s.profiles.filter((p)=>p.visible!==false&&p.view===this.s.workView).forEach((p)=>this.drawPoly(p.points,true,p.id===this.s.selectedElementId?"#76b7f055":"#8dd6c455",p.id===this.s.selectedElementId)); const draft=this.currentDraft(); this.drawPoly(draft,false,"#ff00cc22",true,this.s.creationSession?.operation==="void"?"#f36b2d":"#ff00cc"); if(this.preview){ const sp=this.screen(this.preview); ctx.fillStyle="#ff00cc"; ctx.beginPath(); ctx.arc(sp.x,sp.y,4,0,Math.PI*2); ctx.fill(); } }
}