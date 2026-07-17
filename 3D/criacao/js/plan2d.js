export class Plan2D {
  constructor(canvas, store, { onStatus, onError }) {
    Object.assign(this, {
      c: canvas,
      ctx: canvas.getContext("2d"),
      store,
      onStatus,
      onError,
      scale: 0.7,
      off: { x: 0, y: 0 },
      points: [],
      preview: null,
      drag: null,
    });
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener("wheel", (e) => this.wheel(e), { passive: false });
    canvas.addEventListener("pointerdown", (e) => this.down(e));
    canvas.addEventListener("pointermove", (e) => this.move(e));
    canvas.addEventListener("pointerup", () => (this.drag = null));
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.finish();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.cancel();
      if (e.key === "Enter") this.finish();
    });
    store.subscribe((s) => {
      this.s = s;
      this.draw();
    });
  }
  resize() {
    const r = this.c.getBoundingClientRect(),
      d = devicePixelRatio || 1;
    this.c.width = r.width * d;
    this.c.height = r.height * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
    if (!this.off.x) this.off = { x: r.width / 2, y: r.height / 2 };
    this.draw();
  }
  screen(p) {
    return {
      x: p.x * this.scale + this.off.x,
      y: this.off.y - p.y * this.scale,
    };
  }
  world(e) {
    const r = this.c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - this.off.x) / this.scale,
      y: (this.off.y - (e.clientY - r.top)) / this.scale,
    };
  }
  snap(p, shift = false) {
    let q = { ...p },
      kind = "livre";
    if (this.s.settings.snapEnabled) {
      const st = this.s.settings.snapStep;
      q = { x: Math.round(p.x / st) * st, y: Math.round(p.y / st) * st };
      kind = "grade";
      for (const prof of this.s.profiles)
        for (const pt of prof.points)
          if (Math.hypot(pt.x - p.x, pt.y - p.y) < 12 / this.scale) {
            q = { ...pt };
            kind = "vértice";
          }
    }
    const last = this.points.at(-1);
    if ((this.s.settings.ortho || shift) && last) {
      Math.abs(q.x - last.x) > Math.abs(q.y - last.y)
        ? (q.y = last.y)
        : (q.x = last.x);
      kind += " orto";
    }
    return { point: q, kind };
  }
  wheel(e) {
    e.preventDefault();
    const b = this.world(e);
    this.scale = Math.min(
      3,
      Math.max(0.15, this.scale * (e.deltaY < 0 ? 1.1 : 0.9)),
    );
    const a = this.world(e);
    this.off.x += (a.x - b.x) * this.scale;
    this.off.y -= (a.y - b.y) * this.scale;
    this.draw();
  }
  down(e) {
    if (e.button === 1 || e.altKey) {
      this.drag = { x: e.clientX, y: e.clientY, off: { ...this.off } };
      return;
    }
    const { point } = this.snap(this.world(e), e.shiftKey);
    if (this.s.activeTool === "select") return this.pick(point);
    if (
      this.points.length > 2 &&
      Math.hypot(point.x - this.points[0].x, point.y - this.points[0].y) < 15
    )
      return this.finish();
    this.points.push(point);
    this.preview = null;
    this.draw();
  }
  move(e) {
    if (this.drag) {
      this.off = {
        x: this.drag.off.x + e.clientX - this.drag.x,
        y: this.drag.off.y + e.clientY - this.drag.y,
      };
      return this.draw();
    }
    const sn = this.snap(this.world(e), e.shiftKey);
    this.preview = sn.point;
    const last = this.points.at(-1);
    this.onStatus(
      sn.point,
      last ? Math.hypot(sn.point.x - last.x, sn.point.y - last.y) : 0,
      sn.kind,
    );
    this.draw();
  }
  finish() {
    if (this.points.length < 3) {
      if (this.points.length)
        this.onError("Crie ao menos três pontos para fechar um perfil.");
      return;
    }
    this.store.addProfile([...this.points]);
    this.cancel();
  }
  cancel() {
    this.points = [];
    this.preview = null;
    this.draw();
  }
  pick(p) {
    let best = null,
      bd = 1e9;
    for (const prof of this.s.profiles)
      for (const pt of prof.points) {
        const d = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (d < bd) {
          bd = d;
          best = prof;
        }
      }
    this.store.select(bd < 25 ? best.id : null);
  }
  drawPoly(points, close, color, selected = false) {
    const ctx = this.ctx;
    if (!points.length) return;
    ctx.beginPath();
    points
      .map((p) => this.screen(p))
      .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (close) ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = selected ? "#0a5fb4" : "#2d4b55";
    ctx.lineWidth = selected ? 3 : 2;
    if (close) ctx.fill();
    ctx.stroke();
  }
  draw() {
    if (!this.s) return;
    const r = this.c.getBoundingClientRect(),
      ctx = this.ctx;
    ctx.clearRect(0, 0, r.width, r.height);
    if (this.s.settings.showGrid) {
      const minor = this.s.settings.snapStep * this.scale,
        major = this.s.settings.majorGrid * this.scale;
      ctx.lineWidth = 1;
      for (const [st, col] of [
        [minor, "#edf2f2"],
        [major, "#cad8d8"],
      ]) {
        ctx.strokeStyle = col;
        for (let x = this.off.x % st; x < r.width; x += st) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, r.height);
          ctx.stroke();
        }
        for (let y = this.off.y % st; y < r.height; y += st) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(r.width, y);
          ctx.stroke();
        }
      }
    }
    const o = this.screen({ x: 0, y: 0 });
    ctx.strokeStyle = "#b55";
    ctx.beginPath();
    ctx.moveTo(o.x - 10, o.y);
    ctx.lineTo(o.x + 10, o.y);
    ctx.moveTo(o.x, o.y - 10);
    ctx.lineTo(o.x, o.y + 10);
    ctx.stroke();
    this.s.profiles
      .filter((p) => p.visible !== false && p.view === this.s.workView)
      .forEach((p) =>
        this.drawPoly(
          p.points,
          true,
          p.id === this.s.selectedElementId ? "#76b7f055" : "#8dd6c455",
          p.id === this.s.selectedElementId,
        ),
      );
    const draft = [...this.points];
    if (this.preview) draft.push(this.preview);
    this.drawPoly(draft, false, "#079a9244", true);
  }
}