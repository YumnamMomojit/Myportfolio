// The 3D stage each level plays on: scene, lights, framing, clicks and effects.
import * as THREE from 'three';
import { Tweens, Particles, skyTexture, disposeTree } from './kit.js';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    this.root = new THREE.Group();
    this.scene.add(this.root);

    const hemi = new THREE.HemisphereLight(0xfff4fb, 0x6b5a8e, 1.6);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 10, 8);
    const rim = new THREE.DirectionalLight(0xffd6f0, 0.8);
    rim.position.set(-6, 3, -6);
    this.scene.add(hemi, sun, rim);

    this.tweens = new Tweens();
    this.fx = new Particles(this.root);
    this.pickables = [];
    this.groundFn = null;
    this.ray = new THREE.Raycaster();
    this.ptr = new THREE.Vector2();
    this.parallax = new THREE.Vector2();
    this.frameOpts = { target: [0, 0, 0], w: 10, h: 8, yaw: 0, pitch: 0.12 };
    this.insets = { top: 90, bottom: 120 };
    this.orbit = false;
    this.active = false;
    this.bindPointer();
  }

  begin(world) {
    disposeTree(this.root);
    this.root.clear();
    this.tweens.clear();
    this.fx.clear();
    this.pickables = [];
    this.groundFn = null;
    this.orbit = false;
    this.scene.background?.dispose?.();
    this.scene.background = skyTexture(world.sky[0], world.sky[1]);
    this.scene.fog = null;
  }

  // Frame a w×h region around target. yaw/pitch tilt the camera (radians).
  frame(opts) {
    this.frameOpts = { ...this.frameOpts, ...opts };
    this.applyFrame();
  }

  applyFrame() {
    const { target, w, h, yaw, pitch } = this.frameOpts;
    const W = this.canvas.clientWidth || innerWidth;
    const H = this.canvas.clientHeight || innerHeight;
    const availH = Math.max(H - this.insets.top - this.insets.bottom, H * 0.35);
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(h / (2 * t * (availH / H)), w / (2 * t * (W / H))) * 1.08;
    this.dist = dist;
    const tgt = new THREE.Vector3(...target);
    this.target = tgt;
    const y = yaw + this.parallax.x * 0.04;
    const p = pitch + this.parallax.y * 0.03;
    this.camera.position.set(tgt.x + Math.sin(y) * Math.cos(p) * dist, tgt.y + Math.sin(p) * dist, tgt.z + Math.cos(y) * Math.cos(p) * dist);
    this.camera.lookAt(tgt);
    this.camera.aspect = W / H;
    // Shift the picture so the framed region sits between the HUD and the dock.
    const shift = (this.insets.bottom - this.insets.top) / 2;
    this.camera.setViewOffset(W, H, 0, shift, W, H);
    this.camera.updateProjectionMatrix();
  }

  // obj (or any child) becomes clickable.
  clickable(obj, fn) {
    obj.userData.onPick = fn;
    this.pickables.push(obj);
    return obj;
  }

  unclickable(obj) {
    this.pickables = this.pickables.filter((o) => o !== obj);
  }

  // Clicks that miss every clickable land on this plane: fn(point).
  onGround(fn, plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)) {
    this.groundFn = fn;
    this.groundPlane = plane;
  }

  bindPointer() {
    let down = null;
    const toNdc = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      down = { x: e.clientX, y: e.clientY, yaw: this.frameOpts.yaw, pitch: this.frameOpts.pitch };
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      toNdc(e);
      this.parallax.set(this.ptr.x, this.ptr.y);
      if (down && this.orbit && e.buttons) {
        this.frameOpts.yaw = down.yaw - (e.clientX - down.x) * 0.006;
        this.frameOpts.pitch = THREE.MathUtils.clamp(down.pitch + (e.clientY - down.y) * 0.004, 0.08, 1.35);
      }
      const hit = this.hit();
      this.canvas.style.cursor = hit ? 'pointer' : this.orbit ? 'grab' : this.groundFn ? 'crosshair' : 'default';
    });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!this.active || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8) return;
      toNdc(e);
      const hit = this.hit();
      if (hit) hit.userData.onPick(hit);
      else if (this.groundFn) {
        const p = new THREE.Vector3();
        this.ray.setFromCamera(this.ptr, this.camera);
        if (this.ray.ray.intersectPlane(this.groundPlane, p)) this.groundFn(p);
      }
    });
  }

  hit() {
    if (!this.pickables.length) return null;
    this.ray.setFromCamera(this.ptr, this.camera);
    const hits = this.ray.intersectObjects(this.pickables, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.onPick) o = o.parent;
      if (o && o.visible !== false) return o;
    }
    return null;
  }

  update(dt) {
    this.tweens.update(dt);
    this.fx.update(dt);
    this.applyFrame();
  }

  resize() {
    this.applyFrame();
  }
}
