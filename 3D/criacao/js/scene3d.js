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
    this.init();
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
    this.renderer.render(this.scene, this.camera);
  }
}