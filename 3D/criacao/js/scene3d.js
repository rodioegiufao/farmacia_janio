import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildGeometry, isVoidKind } from "./geometry-engine.js";
export class Scene3D {
  constructor(canvas, store) {
    this.canvas = canvas;
    this.store = store;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f8f8);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
    this.camera.position.set(1.6, 1.4, 1.8);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.25, 0.25, 0);
    this.meshes = new Map();
    this.viewCubeStage = null;
    this.init();
    this.initViewCube();
    new ResizeObserver(() => this.resize()).observe(canvas);
    store.subscribe((s) => {
      this.s = s;
      this.sync();
      this.resize();
    });
    this.animate();
  }
  init() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d = new THREE.DirectionalLight(0xffffff, 0.9);
    d.position.set(3, 5, 4);
    this.scene.add(d);
    this.scene.add(new THREE.GridHelper(2, 20, 0x8aa0a0, 0xd2dddd));
    this.scene.add(new THREE.AxesHelper(0.5));
  }
  initViewCube() {
    const host = document.getElementById("viewCube");
    if (!host) return;
    host.innerHTML = `
      <div class="view-cube__axis view-cube__axis--x"></div>
      <div class="view-cube__axis view-cube__axis--y"></div>
      <div class="view-cube__axis view-cube__axis--z"></div>
      <div class="view-cube__stage">
        <button class="view-cube__face view-cube__face--front" data-cube-view="front" type="button">Frente</button>
        <button class="view-cube__face view-cube__face--back" data-cube-view="back" type="button">Atrás</button>
        <button class="view-cube__face view-cube__face--right" data-cube-view="right" type="button">Direita</button>
        <button class="view-cube__face view-cube__face--left" data-cube-view="left" type="button">Esquerda</button>
        <button class="view-cube__face view-cube__face--top" data-cube-view="top" type="button">Topo</button>
        <button class="view-cube__face view-cube__face--bottom" data-cube-view="bottom" type="button">Base</button>
      </div>`;
    this.viewCubeStage = host.querySelector(".view-cube__stage");
    host.addEventListener("pointerdown", (event) => event.stopPropagation());
    host.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cube-view]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      this.setCubeView(button.dataset.cubeView);
    });
  }
  setCubeView(view) {
    const target = this.controls.target.clone();
    const distance = Math.max(this.camera.position.distanceTo(target), 1.2);
    const directions = {
      front: new THREE.Vector3(0, -1, 0.42),
      back: new THREE.Vector3(0, 1, 0.42),
      right: new THREE.Vector3(1, 0, 0.42),
      left: new THREE.Vector3(-1, 0, 0.42),
      top: new THREE.Vector3(0, 0, 1),
      bottom: new THREE.Vector3(0, 0, -1)
    };
    const direction = (directions[view] || directions.front).normalize();
    this.camera.position.copy(target).add(direction.multiplyScalar(distance));
    this.camera.up.set(0, 0, view === "bottom" ? -1 : 1);
    if (view === "front" || view === "back" || view === "left" || view === "right") {
      this.camera.up.set(0, 0, 1);
    }
    this.controls.update();
  }
  updateViewCube() {
    if (!this.viewCubeStage) return;
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    this.viewCubeStage.style.transform = `rotateX(${-THREE.MathUtils.radToDeg(euler.x)}deg) rotateY(${-THREE.MathUtils.radToDeg(euler.y)}deg) rotateZ(${THREE.MathUtils.radToDeg(euler.z)}deg)`;
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(r.width, r.height, false);
  }
  orient(mesh, form) {
    const offset = (Number(form.offset) || 0) * 0.001;
    mesh.rotation.set(0, 0, 0);
    mesh.position.set(0, 0, offset);
  }
  sync() {
    const visibleForms = (this.s.forms || this.s.extrusions || []).filter((e) => e.visible !== false);
    const valid = new Set(visibleForms.map((e) => e.id));
    for (const [id, m] of this.meshes) if (!valid.has(id)) {
      m.geometry.dispose(); m.material.dispose(); this.scene.remove(m); this.meshes.delete(id);
    }
    for (const form of visibleForms) {
      const geom = buildGeometry(this.s, form);
      if (!geom) continue;
      let m = this.meshes.get(form.id);
      const isVoid = isVoidKind(form.kind);
      if (!m) {
        m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.02, side: THREE.DoubleSide, transparent: isVoid, opacity: isVoid ? 0.28 : 1 }));
        this.scene.add(m); this.meshes.set(form.id, m);
      }
      m.geometry.dispose(); m.geometry = geom;
      m.material.transparent = isVoid; m.material.opacity = isVoid ? 0.28 : 1; m.material.wireframe = isVoid;
      m.material.color.set(form.id === this.s.selectedElementId ? (isVoid ? 0xff7a2b : 0x54a7e8) : form.material?.color || (isVoid ? 0xf36b2d : 0x4aa3df));
      m.material.emissive.set(form.id === this.s.selectedElementId ? 0x123650 : 0x000000);
      this.orient(m, form);
    }
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.updateViewCube();
    this.renderer.render(this.scene, this.camera);
  }
}