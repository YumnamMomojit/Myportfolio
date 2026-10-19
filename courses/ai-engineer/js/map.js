// The 3D saga map: a winding candy path of level nodes through 12 themed worlds.
import * as THREE from 'three';
import { candy, candyMat, box, label, textPlane, arrow, starGeo, Tweens, ease, mulberry32, C } from './kit.js';

const SP = 3.3; // distance between levels
const GAP = 4.2; // extra space at each world gate

export class SagaMap {
  constructor(canvas, worlds, levels) {
    this.canvas = canvas;
    this.worlds = worlds;
    this.levels = levels;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.tweens = new Tweens();
    this.active = false;
    this.z = 0;
    this.zt = 0;
    this.vz = 0;
    this.t = 0;
    this.worldIdx = -1;
    this.nodes = [];
    this.isUnlocked = () => true;
    this.starsOf = () => 0;
    this.onSelect = () => {};
    this.onWorld = () => {};
    this.bindPointer();
  }

  build() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xffffff, 0x8a6fb0, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(6, 12, 6);
    s.add(sun);
    this.bg = new THREE.Color(this.worlds[0].sky[0]);
    s.background = this.bg;
    s.fog = new THREE.Fog(this.bg.clone(), 26, 60);

    // Level positions along a winding path.
    let z = 0;
    this.pos = this.levels.map((l, i) => {
      if (i > 0 && l.world !== this.levels[i - 1].world) z -= GAP;
      const p = new THREE.Vector3(Math.sin(i * 0.82) * 3.1, 0, z);
      z -= SP;
      return p;
    });
    this.minZ = this.pos[this.pos.length - 1].z;

    // Ground per world, gates and props.
    this.worldRanges = [];
    this.worlds.forEach((w, wi) => {
      const idx = this.levels.map((l, i) => (l.world === wi ? i : -1)).filter((i) => i >= 0);
      const z0 = this.pos[idx[0]].z + (wi === 0 ? 30 : GAP * 0.5 + SP * 0.5);
      const z1 = this.pos[idx[idx.length - 1]].z - (wi === this.worlds.length - 1 ? 14 : SP * 0.5 + GAP * 0.5);
      this.worldRanges.push([z0, z1]);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(60, z0 - z1), new THREE.MeshStandardMaterial({ color: new THREE.Color(w.ground).multiplyScalar(0.82), roughness: 0.95 }));
      g.rotation.x = -Math.PI / 2;
      g.position.set(0, -0.02, (z0 + z1) / 2);
      s.add(g);
      // a soft stripe under the path
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(10.5, z0 - z1), new THREE.MeshStandardMaterial({ color: 0xf6e7b0, roughness: 1 })); // a golden road
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(0, -0.01, (z0 + z1) / 2);
      s.add(lane);
      this.gate(w, wi, this.pos[idx[0]].z + GAP * 0.5 + 0.9);
      this.props(w, wi, z0, z1);
    });

    // Candy dots between the nodes.
    const curve = new THREE.CatmullRomCurve3(this.pos.map((p) => p.clone().setY(0.06)));
    const n = (this.pos.length - 1) * 6;
    this.dots = [];
    for (let k = 1; k < n; k++) {
      if (k % 6 === 0) continue;
      const p = curve.getPoint(k / n);
      const d = candy('ball', C.white, 0.34);
      d.scale.y = 0.14;
      d.position.copy(p);
      d.userData.seg = Math.floor(k / 6);
      s.add(d);
      this.dots.push(d);
    }

    // Level nodes.
    this.levels.forEach((l, i) => {
      const g = new THREE.Group();
      g.position.copy(this.pos[i]);
      const r = l.boss ? 1.9 : 1.5;
      const disc = candy('disc', C.grey, 1);
      disc.scale.set(r, 0.9, r);
      disc.position.y = 0.16;
      disc.userData.index = i;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.5, 0.07, 10, 40), candyMat(C.gold));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.33;
      const num = label(String(i + 1), { size: 76, weight: 700, color: '#ffffff', stroke: '#123d24', height: l.boss ? 1.05 : 0.9, pad: 10 });
      num.position.set(0, 0.95, 0);
      const stars = [-1, 0, 1].map((k) => {
        const st = new THREE.Mesh(starGeo(0.55, 0.25, 0.25), candyMat(0xffc61a, { emissive: 0x7a5200, emissiveIntensity: 0.25 }));
        st.scale.setScalar(0.42);
        st.position.set(k * 0.5, 0.45 + (k === 0 ? 0.12 : 0), 0.95);
        st.rotation.x = -0.5;
        g.add(st);
        return st;
      });
      const lock = label('🔒', { size: 60, height: 0.6, pad: 6 });
      lock.position.set(0, 0.95, 0);
      g.add(disc, rim, num, lock);
      if (l.boss) {
        const crown = label('👑', { size: 60, height: 0.75, pad: 6 });
        crown.position.set(0, 1.75, 0);
        g.add(crown);
      }
      this.scene.add(g);
      this.nodes.push({ g, disc, num, stars, lock });
    });

    // The player's robot.
    const bot = new THREE.Group();
    const head = candy('ball', C.white, 0.9);
    const visor = box(0.62, 0.34, 0.2, C.ink, 0.12);
    visor.position.set(0, 0.04, 0.37);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x67f5ff });
    [-0.13, 0.13].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), eyeMat);
      e.position.set(x, 0.05, 0.48);
      bot.add(e);
    });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), candyMat(C.grey));
    stick.position.y = 0.55;
    const ball = candy('ball', C.gold, 0.2);
    ball.position.y = 0.75;
    bot.add(head, visor, stick, ball);
    bot.scale.setScalar(0.9);
    this.bot = bot;
    this.botBase = new THREE.Vector3();
    s.add(bot);

    // Pulsing ring under the next level to play.
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 10, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    this.ring.rotation.x = Math.PI / 2;
    s.add(this.ring);

    this.refresh();
  }

  gate(w, wi, z) {
    const g = new THREE.Group();
    g.position.set(0, 0, z);
    [-5.6, 5.6].forEach((x) => {
      for (let k = 0; k < 6; k++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 16), candyMat(k % 2 ? C.gold : C.emerald));
        seg.position.set(x, 0.25 + k * 0.5, 0);
        g.add(seg);
      }
      const top = candy('ball', C.gold, 0.85);
      top.position.set(x, 3.25, 0);
      g.add(top);
    });
    // A banner leaning back on the ground, so it never hides the path.
    const sign = textPlane(`${w.emoji} ${w.name}`, { size: 64, weight: 700, color: '#123d24', bg: 'rgba(255,255,255,0.96)', border: '#' + new THREE.Color(w.color).getHexString(), height: 1.05 });
    const sub = textPlane(`World ${wi + 1} · ${w.tagline}`, { size: 44, weight: 600, color: '#ffffff', stroke: '#123d24', height: 0.55, pad: 8 });
    sign.rotation.x = sub.rotation.x = -1.0;
    sign.position.set(0, 0.75, 0);
    sub.position.set(0, 0.22, 0.55);
    g.add(sign, sub);
    this.scene.add(g);
  }

  props(w, wi, z0, z1) {
    const rng = mulberry32(wi * 97 + 13);
    const count = Math.round((z0 - z1) / 2.4);
    for (let k = 0; k < count; k++) {
      const side = k % 2 ? 1 : -1;
      const x = side * (7 + rng() * 9);
      const z = z1 + 1 + rng() * (z0 - z1 - 2);
      const p = prop(w, rng);
      p.position.set(x, 0, z);
      p.rotation.y = rng() * Math.PI * 2;
      p.scale.multiplyScalar(0.8 + rng() * 0.6);
      this.scene.add(p);
    }
  }

  refresh() {
    let current = -1;
    this.nodes.forEach((n, i) => {
      const l = this.levels[i];
      const open = this.isUnlocked(i);
      const stars = this.starsOf(i);
      const color = !open ? C.grey : stars ? C.emerald : C.gold;
      n.disc.material = candyMat(color);
      n.lock.visible = !open;
      n.num.visible = open;
      n.stars.forEach((s, k) => (s.visible = k < stars));
      if (open && !stars && current < 0) current = i;
    });
    if (current < 0) current = this.levels.length - 1;
    this.current = current;
    this.dots.forEach((d) => {
      const done = this.starsOf(d.userData.seg) > 0;
      d.material = candyMat(done ? C.gold : C.white);
    });
    this.placeBot(current);
  }

  placeBot(i) {
    this.botBase.copy(this.pos[i]).add(new THREE.Vector3(this.levels[i].boss ? 1.55 : 1.3, 0.75, 0.35));
    this.ring.position.copy(this.pos[i]).setY(0.05);
    this.ring.scale.setScalar(this.levels[i].boss ? 1.25 : 1);
  }

  focus(i, animate = true) {
    this.zt = THREE.MathUtils.clamp(this.pos[i].z, this.minZ, 0);
    if (!animate) this.z = this.zt;
  }

  // Scroll to the newly unlocked level and hop the robot onto it.
  async hopTo(i) {
    this.placeBot(i - 1);
    this.focus(i - 1, false);
    this.zt = this.pos[i].z;
    const from = this.botBase.clone();
    this.hopping = true;
    await this.tweens.add(0.5, () => {}, ease.linear, 0.25);
    this.placeBot(i);
    const to = this.botBase.clone();
    await this.tweens.add(0.85, (k) => {
      this.bot.position.lerpVectors(from, to, k);
      this.bot.position.y += Math.sin(k * Math.PI) * 2.2;
      this.bot.rotation.y = k * Math.PI * 2;
    }, ease.inOut);
    this.bot.rotation.y = 0;
    this.hopping = false;
  }

  bindPointer() {
    let down = null;
    let lastY = 0;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      lastY = e.clientY;
      this.vz = 0;
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const r = this.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (down) {
        const dy = e.clientY - lastY;
        lastY = e.clientY;
        const k = 28 / r.height;
        // dragging down pulls the map down, revealing the levels ahead
        this.zt = THREE.MathUtils.clamp(this.zt - dy * k, this.minZ - 2, 4);
        this.vz = -dy * k;
      } else {
        ray.setFromCamera(ndc, this.camera);
        const hit = ray.intersectObjects(this.nodes.map((n) => n.disc))[0];
        this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      }
    });
    const up = (e) => {
      if (!this.active || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8) return;
      const r = this.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObjects(this.nodes.map((n) => n.disc))[0];
      if (hit) this.onSelect(hit.object.userData.index);
    };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', () => (down = null));
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.zt = THREE.MathUtils.clamp(this.zt + e.deltaY * 0.012, this.minZ - 2, 4);
    }, { passive: false });
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.key === 'ArrowUp' || e.key === 'PageUp') this.zt = Math.max(this.zt - (e.key === 'PageUp' ? 12 : 3), this.minZ - 2);
      if (e.key === 'ArrowDown' || e.key === 'PageDown') this.zt = Math.min(this.zt + (e.key === 'PageDown' ? 12 : 3), 4);
    });
  }

  update(dt) {
    this.t += dt;
    this.tweens.update(dt);
    // drag inertia
    if (Math.abs(this.vz) > 0.001) {
      this.zt = THREE.MathUtils.clamp(this.zt + this.vz, this.minZ - 2, 4);
      this.vz *= Math.exp(-dt * 6);
    }
    this.z += (this.zt - this.z) * (1 - Math.exp(-dt * 7));

    const aspect = this.camera.aspect;
    const far = aspect < 1 ? 1 + (1 - aspect) * 1.1 : 1;
    this.camera.position.set(0, 10.5 * far, this.z + 9.5 * far);
    this.camera.lookAt(0, 0, this.z - 2.5);

    // world tint and chip
    let wi = this.worldRanges.findIndex(([z0, z1]) => this.z <= z0 && this.z > z1);
    if (wi < 0) wi = this.z > 0 ? 0 : this.worlds.length - 1;
    if (wi !== this.worldIdx) {
      this.worldIdx = wi;
      this.onWorld(wi);
    }
    const target = new THREE.Color(this.worlds[wi].sky[0]);
    this.bg.lerp(target, 1 - Math.exp(-dt * 3));
    this.scene.fog.color.copy(this.bg);

    if (!this.hopping) {
      this.bot.position.copy(this.botBase);
      this.bot.position.y += Math.sin(this.t * 3) * 0.12;
      this.bot.rotation.y = Math.sin(this.t * 1.3) * 0.4;
    }
    const k = (Math.sin(this.t * 4) + 1) / 2;
    this.ring.material.opacity = 0.35 + k * 0.5;
    this.ring.scale.x = this.ring.scale.y = (this.levels[this.current]?.boss ? 1.25 : 1) * (1 + k * 0.12);
    this.nodes.forEach((n, i) => {
      if (i === this.current) n.disc.position.y = 0.16 + Math.abs(Math.sin(this.t * 3)) * 0.12;
      n.stars.forEach((s, j) => (s.rotation.y = Math.sin(this.t * 2 + i + j) * 0.35));
    });
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

// One decorative prop that fits the world's theme.
function prop(w, rng) {
  const g = new THREE.Group();
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  const col = (r, h, color, x = 0, y = 0, z = 0) => add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), candyMat(color)), x, y + h / 2, z);
  switch (w.id) {
    case 'python': {
      if (rng() < 0.35) {
        for (let k = 0; k < 5; k++) col(0.55 - k * 0.05, 0.6, k % 2 ? C.white : C.red, 0, k * 0.6);
        add(candy('ball', C.yellow, 0.6), 0, 3.3);
      } else if (rng() < 0.6) {
        add(box(1, 1, 1, 0xc98a4b), 0, 0.5);
        add(box(0.8, 0.8, 0.8, 0xdea365), 0.2, 1.4, 0.1);
      } else {
        const water = new THREE.Mesh(new THREE.CircleGeometry(1.6, 28), candyMat(0x5cc8ff));
        water.rotation.x = -Math.PI / 2;
        add(water, 0, 0.02);
        const boat = box(1.4, 0.4, 0.6, C.orange);
        add(boat, 0, 0.25);
        col(0.04, 1.1, C.white, 0, 0.4);
        const sail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 3), candyMat(C.white));
        add(sail, 0.2, 1.0);
      }
      break;
    }
    case 'vectors': {
      if (rng() < 0.5) {
        const a = arrow(pick([C.purple, C.pink, C.blue]), 0.12);
        a.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(rng() - 0.5, 2 + rng() * 1.5, rng() - 0.5));
        g.add(a);
      } else {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), candyMat(pick([C.purple, 0xb8d98a, C.blue])));
        add(c, 0, 0.9);
        c.scale.y = 1.6;
      }
      break;
    }
    case 'gradient': {
      const h = 2 + rng() * 2;
      add(new THREE.Mesh(new THREE.ConeGeometry(1.6, h, 7), candyMat(pick([0x4fcf8a, 0x37b878, 0x7bdc9e]))), 0, h / 2);
      add(new THREE.Mesh(new THREE.ConeGeometry(0.62, h * 0.36, 7), candyMat(C.white)), 0, h * 0.82);
      break;
    }
    case 'casino': {
      if (rng() < 0.55) {
        const d = box(1, 1, 1, C.white, 0.16);
        add(d, 0, 0.5);
        const dot = new THREE.SphereGeometry(0.09, 10, 8);
        [[0, 0], [-0.25, -0.25], [0.25, 0.25]].forEach(([a, b]) => add(new THREE.Mesh(dot, candyMat(C.red)), a, 1.0, b));
      } else {
        for (let k = 0; k < 4; k++) col(0.6, 0.18, k % 2 ? C.white : pick([C.red, C.purple, C.blue]), 0, k * 0.2);
      }
      break;
    }
    case 'forest': {
      const h = 1.2 + rng();
      col(0.07, h, C.white);
      add(candy('ball', pick([C.pink, C.green, C.orange, C.red]), 1.1 + rng() * 0.4), 0, h + 0.4);
      break;
    }
    case 'neuron': {
      const pts = [0, 1, 2].map(() => new THREE.Vector3((rng() - 0.5) * 2.4, 0.6 + rng() * 2, (rng() - 0.5) * 2.4));
      pts.forEach((p) => add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshStandardMaterial({ color: C.pink, emissive: C.pink, emissiveIntensity: 0.6 })), p.x, p.y, p.z));
      for (let a = 0; a < 3; a++) {
        const b = (a + 1) % 3;
        const d = new THREE.Vector3().subVectors(pts[b], pts[a]);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, d.length(), 6), candyMat(C.white));
        m.position.copy(pts[a]).addScaledVector(d, 0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        g.add(m);
      }
      break;
    }
    case 'attention': {
      const h = 2 + rng() * 2.5;
      col(0.6, h, pick([C.orange, C.yellow, 0xffb86b]));
      add(new THREE.Mesh(new THREE.ConeGeometry(0.85, 1, 12), candyMat(C.pink)), 0, h + 0.5);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })), 0, h + 1.15);
      break;
    }
    case 'library': {
      let y = 0;
      for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) {
        const b = box(1.4 - rng() * 0.3, 0.3, 1, pick([C.red, C.blue, C.green, C.purple, C.orange]), 0.06);
        b.rotation.y = (rng() - 0.5) * 0.4;
        add(b, 0, y + 0.15);
        y += 0.3;
      }
      break;
    }
    case 'agents': {
      add(box(0.8, 0.9, 0.6, pick([C.teal, C.blue, C.purple]), 0.15), 0, 0.45);
      add(candy('ball', C.white, 0.6), 0, 1.2);
      const v = box(0.42, 0.18, 0.1, C.ink, 0.06);
      add(v, 0, 1.22, 0.27);
      break;
    }
    case 'forge': {
      add(box(1.1, 0.5, 0.6, 0x5b5f73, 0.08), 0, 0.25);
      add(box(1.6, 0.35, 0.7, 0x6c7086, 0.08), 0, 0.7);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 10), new THREE.MeshStandardMaterial({ color: C.orange, emissive: 0xff6a00, emissiveIntensity: 1 }));
      add(f, 1.4, 0.45);
      break;
    }
    case 'cloud': {
      if (rng() < 0.5) {
        [[0, 0, 0.9], [0.7, -0.1, 0.7], [-0.7, -0.1, 0.7], [0.3, 0.4, 0.6]].forEach(([x, y, r]) => add(candy('ball', C.white, r * 1.6), x, 2.6 + y));
      } else {
        const h = 1.5 + rng() * 2.5;
        add(box(1, h, 1, pick([C.blue, 0x8fe3b0, C.teal]), 0.1), 0, h / 2);
        add(box(0.6, 0.1, 1.02, 0xe8fbff, 0.03), 0, h * 0.7);
      }
      break;
    }
    case 'fortress': {
      col(0.7, 2.6, pick([C.purple, 0xb8d98a]));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        add(box(0.3, 0.35, 0.3, C.white, 0.05), Math.cos(a) * 0.6, 2.75, Math.sin(a) * 0.6);
      }
      break;
    }
  }
  return g;
}
