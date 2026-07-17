import { wallLength } from "./state.js";
export class Plan2D {
  constructor(canvas, store, { onStatus, onError }) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.store = store;
    this.onStatus = onStatus;
    this.onError = onError;
    this.scale = 70;
    this.off = { x: 0, y: 0 };
    this.drag = null;
    this.start = null;
    this.preview = null;
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener("wheel", (e) => this.wheel(e), { passive: false });
    canvas.addEventListener("pointerdown", (e) => this.down(e));
    canvas.addEventListener("pointermove", (e) => this.move(e));
    canvas.addEventListener("pointerup", () => (this.drag = null));
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.cancel();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "Enter") this.cancel();
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
    if (!this.off.x) {
      this.off = { x: r.width / 2, y: r.height / 2 };
    }
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
      const tol = 12 / this.scale;
      for (const w of this.s.walls) {
        for (const ep of [w.start, w.end])
          if (Math.hypot(ep.x - p.x, ep.y - p.y) < tol) {
            q = { ...ep };
            kind = "ponto";
            break;
          }
      }
      if (kind === "livre") {
        const st = this.s.settings.snapStep;
        q = { x: Math.round(p.x / st) * st, y: Math.round(p.y / st) * st };
        kind = "grade";
      }
    }
    if ((this.s.settings.ortho || shift) && this.start) {
      const dx = Math.abs(q.x - this.start.x),
        dy = Math.abs(q.y - this.start.y);
      q = dx > dy ? { x: q.x, y: this.start.y } : { x: this.start.x, y: q.y };
      kind += " orto";
    }
    return { point: q, kind };
  }
  wheel(e) {
    e.preventDefault();
    const before = this.world(e);
    this.scale *= e.deltaY < 0 ? 1.1 : 0.9;
    this.scale = Math.min(260, Math.max(20, this.scale));
    const after = this.world(e);
    this.off.x += (after.x - before.x) * this.scale;
    this.off.y -= (after.y - before.y) * this.scale;
    this.draw();
  }
  down(e) {
    if (e.button === 1 || e.altKey || e.spaceKey) {
      this.drag = { x: e.clientX, y: e.clientY, off: { ...this.off } };
      return;
    }
    const raw = this.world(e),
      sn = this.snap(raw, e.shiftKey),
      p = sn.point;
    if (this.s.activeTool === "select") {
      this.pick(p);
      return;
    }
    if (!this.start) {
      this.start = p;
    } else {
      const len = Math.hypot(p.x - this.start.x, p.y - this.start.y);
      if (len < 0.01) {
        this.onError("Parede com comprimento zero.");
        return;
      }
      this.store.addWall({
        id: crypto.randomUUID(),
        name: `Parede ${String(this.s.walls.length + 1).padStart(3, "0")}`,
        start: this.start,
        end: p,
        height: this.s.settings.defaultHeight,
        thickness: this.s.settings.defaultThickness,
        baseElevation: this.s.settings.defaultBaseElevation,
        levelId: "ground-floor",
        material: { name: "Alvenaria", color: "#d2b48c" },
      });
      this.start = p;
      this.preview = null;
    }
  }
  move(e) {
    if (this.drag) {
      this.off = {
        x: this.drag.off.x + e.clientX - this.drag.x,
        y: this.drag.off.y + e.clientY - this.drag.y,
      };
      this.draw();
      return;
    }
    const sn = this.snap(this.world(e), e.shiftKey);
    this.preview = sn.point;
    const len = this.start
      ? Math.hypot(sn.point.x - this.start.x, sn.point.y - this.start.y)
      : 0;
    this.onStatus(sn.point, len, sn.kind);
    this.draw();
  }
  cancel() {
    this.start = null;
    this.preview = null;
    this.draw();
  }
  pick(p) {
    let best = null,
      bd = 1e9;
    for (const w of this.s.walls) {
      const d = this.distToSeg(p, w.start, w.end);
      if (d < w.thickness / 2 + 8 / this.scale && d < bd) {
        best = w;
        bd = d;
      }
    }
    this.store.selectWall(best?.id || null);
  }
  distToSeg(p, a, b) {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2,
        ),
      );
    return Math.hypot(
      p.x - (a.x + t * (b.x - a.x)),
      p.y - (a.y + t * (b.y - a.y)),
    );
  }
  poly(w) {
    const dx = w.end.x - w.start.x,
      dy = w.end.y - w.start.y,
      l = Math.hypot(dx, dy) || 1,
      nx = ((-dy / l) * w.thickness) / 2,
      ny = ((dx / l) * w.thickness) / 2;
    return [
      { x: w.start.x + nx, y: w.start.y + ny },
      { x: w.end.x + nx, y: w.end.y + ny },
      { x: w.end.x - nx, y: w.end.y - ny },
      { x: w.start.x - nx, y: w.start.y - ny },
    ];
  }
  drawWall(w, preview = false) {
    const ctx = this.ctx,
      pts = this.poly(w).map((p) => this.screen(p));
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = preview
      ? "#079a9244"
      : w.id === this.s.selectedWallId
        ? "#1677c988"
        : "#d2b48caa";
    ctx.strokeStyle = w.id === this.s.selectedWallId ? "#1677c9" : "#3d484a";
    ctx.lineWidth = preview ? 1 : 2;
    ctx.fill();
    ctx.stroke();
  }
  draw() {
    if (!this.s) return;
    const r = this.c.getBoundingClientRect(),
      ctx = this.ctx;
    ctx.clearRect(0, 0, r.width, r.height);
    if (this.s.settings.showGrid) {
      ctx.strokeStyle = "#e5ecec";
      ctx.lineWidth = 1;
      const st = this.s.settings.snapStep * this.scale;
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
      ctx.strokeStyle = "#cdd8d8";
      const mt = 1 * this.scale;
      for (let x = this.off.x % mt; x < r.width; x += mt) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, r.height);
        ctx.stroke();
      }
      for (let y = this.off.y % mt; y < r.height; y += mt) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(r.width, y);
        ctx.stroke();
      }
    }
    const o = this.screen({ x: 0, y: 0 });
    ctx.strokeStyle = "#96a";
    ctx.beginPath();
    ctx.moveTo(o.x - 8, o.y);
    ctx.lineTo(o.x + 8, o.y);
    ctx.moveTo(o.x, o.y - 8);
    ctx.lineTo(o.x, o.y + 8);
    ctx.stroke();
    ctx.fillStyle = "#08a";
    ctx.font = "bold 24px Arial";
    ctx.fillText("N", 30, 45);
    ctx.beginPath();
    ctx.moveTo(42, 55);
    ctx.lineTo(34, 75);
    ctx.lineTo(50, 75);
    ctx.fill();
    this.s.walls.forEach((w) => this.drawWall(w));
    if (this.start && this.preview)
      this.drawWall(
        {
          start: this.start,
          end: this.preview,
          thickness: this.s.settings.defaultThickness,
          id: "preview",
        },
        true,
      );
  }
}