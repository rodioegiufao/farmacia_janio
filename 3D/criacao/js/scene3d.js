import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MM_TO_SCENE, evalValue, parameterMap, pointTo3D } from "./state.js";
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
  makeGeometry(profile, extrusion, params) {
    const shape = new THREE.Shape();
    profile.points.forEach((p, i) => {
      const x = p.x * MM_TO_SCENE,
        y = p.y * MM_TO_SCENE;
      i ? shape.lineTo(x, y) : shape.moveTo(x, y);
    });
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: evalValue(extrusion.depth, params) * MM_TO_SCENE,
      bevelEnabled: false,
    });
  }
  orient(mesh, profile, extrusion) {
    const offset = (Number(extrusion.offset) || 0) * MM_TO_SCENE;
    mesh.rotation.set(0, 0, 0);
    mesh.position.set(0, 0, 0);
    if (profile.view === "top") {
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = offset;
    } else if (profile.view === "right") {
      mesh.rotation.y = Math.PI / 2;
      mesh.position.x = offset;
    } else {
      mesh.position.z = offset;
    }
  }
  sync() {
    const params = parameterMap(this.s);
    const valid = new Set(
      this.s.extrusions.filter((e) => e.visible !== false).map((e) => e.id),
    );
    for (const [id, m] of this.meshes)
      if (!valid.has(id)) {
        m.geometry.dispose();
        m.material.dispose();
        this.scene.remove(m);
        this.meshes.delete(id);
      }
    for (const ex of this.s.extrusions.filter((e) => e.visible !== false)) {
      const prof = this.s.profiles.find(
        (p) => p.id === ex.profileId && p.visible !== false,
      );
      if (!prof) continue;
      let m = this.meshes.get(ex.id);
      if (!m) {
        m = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshStandardMaterial({
            roughness: 0.72,
            metalness: 0.02,
            side: THREE.DoubleSide,
          }),
        );
        this.scene.add(m);
        this.meshes.set(ex.id, m);
      }
      m.geometry.dispose();
      m.geometry = this.makeGeometry(prof, ex, params);
      m.material.color.set(
        ex.id === this.s.selectedElementId
          ? 0x54a7e8
          : ex.material?.color || 0x4aa3df,
      );
      m.material.emissive.set(
        ex.id === this.s.selectedElementId ? 0x123650 : 0x000000,
      );
      this.orient(m, prof, ex);
    }
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}