// Candy-style building blocks shared by the saga map and every level:
// glossy candy meshes, text sprites, arrows, tweens and particle bursts.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FONT = "'Fredoka', 'Space Grotesk', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace";

export const C = {
  pink: 0xf5b301, orange: 0xff9f1c, yellow: 0xffd23f, green: 0x3ddc84, blue: 0x168a4c,
  purple: 0x0e7c6b, red: 0xff4d6d, teal: 0x2dd4bf, white: 0xfffdf3, grey: 0x9aa3b5, choc: 0x7b4a2d, ink: 0x12301d,
  gold: 0xf5b301, emerald: 0x1fa45c,
};
export const PALETTE = [C.pink, C.orange, C.yellow, C.green, C.blue, C.purple, C.red, C.teal];
export const hex = (c) => '#' + new THREE.Color(c).getHexString();

const mats = new Map();
export function candyMat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshPhysicalMaterial({
      color, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, ...o,
    }));
  }
  return mats.get(key);
}

const geos = {};
function geo(kind) {
  if (geos[kind]) return geos[kind];
  let g;
  if (kind === 'ball') g = new THREE.SphereGeometry(0.5, 32, 20);
  else if (kind === 'cube') g = new RoundedBoxGeometry(1, 1, 1, 4, 0.18);
  else if (kind === 'bean') { g = new THREE.CapsuleGeometry(0.32, 0.5, 8, 20); g.rotateZ(Math.PI / 2); }
  else if (kind === 'disc') g = new THREE.CylinderGeometry(0.5, 0.5, 0.36, 40);
  else if (kind === 'star') g = starGeo(0.55, 0.26, 0.3);
  else if (kind === 'drop') { g = new THREE.SphereGeometry(0.5, 28, 18); g.scale(1, 1.25, 1); }
  return (geos[kind] = g);
}

export function starGeo(r1, r2, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function candy(kind, color, size = 1, o) {
  const m = new THREE.Mesh(geo(kind), candyMat(color, o));
  m.scale.setScalar(size);
  return m;
}

export function box(w, h, d, color, r = 0.12, o) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), candyMat(color, o));
  return m;
}

// Text drawn on a canvas. Returns { canvas, ctx } sized for the text.
function textCanvas(lines, { font = FONT, size = 64, weight = 600, color = '#fff', bg = null, pad = 26, radius = 28, stroke = null, align = 'center', border = null, minW = 0 }) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const f = `${weight} ${size}px ${font}`;
  ctx.font = f;
  if (font === MONO && 'letterSpacing' in ctx) ctx.letterSpacing = '0.5px'; // keeps == and != from joining into ligatures
  const w = Math.max(minW, ...lines.map((l) => ctx.measureText(l).width));
  const lh = size * 1.22;
  c.width = Math.ceil(w + pad * 2);
  c.height = Math.ceil(lh * lines.length + pad * 1.4);
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(3, 3, c.width - 6, c.height - 6, radius);
    ctx.fill();
    if (border) { ctx.lineWidth = 5; ctx.strokeStyle = border; ctx.stroke(); }
  }
  ctx.font = f;
  if (font === MONO && 'letterSpacing' in ctx) ctx.letterSpacing = '0.5px';
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  const x = align === 'left' ? pad : c.width / 2;
  lines.forEach((l, i) => {
    const y = pad * 0.7 + lh * (i + 0.5);
    if (stroke) { ctx.lineWidth = size / 6; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(l, x, y); }
    ctx.fillStyle = color;
    ctx.fillText(l, x, y);
  });
  return c;
}

function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A billboard label that always faces the camera.
export function label(text, opts = {}) {
  const lines = String(text).split('\n');
  const c = textCanvas(lines, opts);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false, depthTest: opts.depthTest ?? true, toneMapped: false }));
  // `height` is the world height of a one-line label; more lines grow taller.
  const h = (opts.height ?? 0.5) * (c.height / ((opts.size ?? 64) * 1.22 + (opts.pad ?? 26) * 1.4));
  s.scale.set((h * c.width) / c.height, h, 1);
  s.renderOrder = 5;
  s.userData.aspect = c.width / c.height;
  return s;
}

// A flat text panel (does not turn to face the camera), e.g. code on a tile.
export function textPlane(text, opts = {}) {
  const lines = String(text).split('\n');
  const c = textCanvas(lines, opts);
  const h = opts.height ?? 0.5;
  const w = opts.width ?? (h * c.width) / c.height;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, opts.width ? (w * c.height) / c.width : h),
    new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, toneMapped: false }),
  );
  m.renderOrder = 4;
  return m;
}

export function setLabel(sprite, text, opts) {
  // Keeps the sprite's height and adapts its width to the new text.
  const c = textCanvas(String(text).split('\n'), opts);
  sprite.material.map.dispose();
  sprite.material.map = tex(c);
  sprite.scale.x = sprite.scale.y * (c.width / c.height);
  sprite.userData.aspect = c.width / c.height;
}

// An arrow made of a cylinder and a cone; call .set(from, to) to move it.
export function arrow(color, radius = 0.06) {
  const g = new THREE.Group();
  const mat = candyMat(color);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.8, radius * 6, 16), mat);
  g.add(shaft, head);
  const up = new THREE.Vector3(0, 1, 0);
  g.set = (from, to) => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    g.visible = len > 1e-4;
    if (!g.visible) return g;
    const hl = Math.min(radius * 6, len * 0.5);
    shaft.scale.set(1, Math.max(len - hl, 1e-3), 1);
    shaft.position.set(0, (len - hl) / 2, 0);
    head.scale.setScalar(hl / (radius * 6));
    head.position.set(0, len - hl / 2, 0);
    g.position.copy(from);
    g.quaternion.setFromUnitVectors(up, dir.normalize());
    return g;
  };
  return g;
}

export const ease = {
  linear: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  bounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

export class Tweens {
  constructor() { this.list = []; }
  // fn(k) is called with eased progress 0..1. Returns a promise.
  add(dur, fn, e = ease.out, delay = 0) {
    return new Promise((resolve) => this.list.push({ t: -delay, dur: Math.max(dur, 1e-3), fn, e, resolve }));
  }
  move(obj, to, dur = 0.35, e = ease.out, delay = 0) {
    let from;
    return this.add(dur, (k) => {
      from ??= obj.position.clone();
      obj.position.lerpVectors(from, to, k);
    }, e, delay);
  }
  scale(obj, to, dur = 0.3, e = ease.back, delay = 0) {
    let from;
    return this.add(dur, (k) => {
      from ??= obj.scale.x;
      obj.scale.setScalar(from + (to - from) * k);
    }, e, delay);
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(tw.t / tw.dur, 1);
      tw.fn(tw.e(k));
      if (k >= 1) { this.list.splice(i, 1); tw.resolve(); }
    }
  }
  clear() { this.list.forEach((t) => t.resolve()); this.list = []; }
}

const sparkGeo = new THREE.OctahedronGeometry(0.09);
export class Particles {
  constructor(parent) { this.parent = parent; this.list = []; }
  burst(pos, color = C.yellow, n = 18, speed = 3) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: Array.isArray(color) ? color[i % color.length] : color, transparent: true }));
      m.position.copy(pos);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      this.parent.add(m);
      this.list.push({ m, v, life: 0.7 + Math.random() * 0.4, t: 0 });
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      p.v.y -= 6 * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += dt * 6;
      p.m.material.opacity = 1 - p.t / p.life;
      if (p.t >= p.life) { this.parent.remove(p.m); p.m.material.dispose(); this.list.splice(i, 1); }
    }
  }
  clear() { this.list.forEach((p) => { this.parent.remove(p.m); p.m.material.dispose(); }); this.list = []; }
}

// A vertical gradient used as the sky.
export function skyTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(rng) {
  return Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng());
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Breadth-first search for the fewest moves from `start` to a state where goal(s) is true.
export function bfs(start, next, goal, key = (s) => JSON.stringify(s), limit = 20000) {
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let d = 0; frontier.length && seen.size < limit; d++) {
    const nxt = [];
    for (const s of frontier) {
      if (goal(s)) return d;
      for (const n of next(s)) {
        const k = key(n);
        if (!seen.has(k)) { seen.add(k); nxt.push(n); }
      }
    }
    frontier = nxt;
  }
  return Infinity;
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !Object.values(geos).includes(o.geometry) && o.geometry !== sparkGeo) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => {
        if ([...mats.values()].includes(m)) return;
        m.map?.dispose();
        m.dispose();
      });
    }
  });
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Grid lines on the XY plane, with an optional candy board behind them.
export function grid(x0, x1, y0, y1, { step = 1, color = 0x4f6b55, opacity = 0.35, board = 0xfff7fb, axes = true } = {}) {
  const g = new THREE.Group();
  const pts = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) pts.push(x, y0, 0, x, y1, 0);
  for (let y = y0; y <= y1 + 1e-6; y += step) pts.push(x0, y, 0, x1, y, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
  if (axes) {
    const ax = [];
    if (x0 <= 0 && x1 >= 0) ax.push(0, y0, 0.01, 0, y1, 0.01);
    if (y0 <= 0 && y1 >= 0) ax.push(x0, 0, 0.01, x1, 0, 0.01);
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(ax, 3));
    g.add(new THREE.LineSegments(ag, new THREE.LineBasicMaterial({ color: 0x15331f, transparent: true, opacity: 0.7 })));
  }
  if (board != null) {
    const b = box(x1 - x0 + 0.8, y1 - y0 + 0.8, 0.25, board, 0.25);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, -0.16);
    g.add(b);
  }
  return g;
}
