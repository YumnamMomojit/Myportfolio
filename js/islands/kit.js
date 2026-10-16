// Shared building blocks for the island adventures (loaded with the first island you visit).
import * as THREE from 'three';
import { makeLabel } from '../utils.js';
import { std, mesh } from '../helpers.js';

// A local frame for an island: U points away from Cloud Island, V is perpendicular.
// P(u, v) gives world (x, z) as a Vector2; local(x, z) goes back.
export function frame(I) {
  const C = new THREE.Vector2(I.c[0], I.c[1]);
  const U = C.clone().normalize();
  const V = new THREE.Vector2(-U.y, U.x);
  return {
    C, U, V,
    yawU: Math.atan2(U.x, U.y),
    P: (u, v) => new THREE.Vector2(C.x + U.x * u + V.x * v, C.y + U.y * u + V.y * v),
    local: (x, z) => [(x - C.x) * U.x + (z - C.y) * U.y, (x - C.x) * V.x + (z - C.y) * V.y],
  };
}

export function scatter(I, n, rng, minR, maxR, avoid = () => false) {
  const out = [];
  for (let tries = 0; tries < n * 12 && out.length < n; tries++) {
    const a = rng() * Math.PI * 2, r = minR + Math.sqrt(rng()) * (maxR - minR);
    const x = I.c[0] + Math.cos(a) * r, z = I.c[1] + Math.sin(a) * r;
    if (avoid(x, z)) continue;
    out.push([x, z, rng()]);
  }
  return out;
}

// keep the path from the island's station / bridge to its centre (and the welcome sign) clear
export const clearPath = (I) => (x, z) => {
  const l = Math.hypot(I.c[0], I.c[1]);
  const toward = [-I.c[0] / l, -I.c[1] / l];
  const lx = x - I.c[0], lz = z - I.c[1];
  const along = lx * toward[0] + lz * toward[1], across = Math.abs(-lx * toward[1] + lz * toward[0]);
  return (along > -4 && across < 5) || Math.hypot(lx, lz) < 5;
};

export function instanced(scene, geo, mat, items, place) {
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  items.forEach((it, i) => {
    const t = place(it);
    p.set(t.x, t.y, t.z);
    q.setFromEuler(new THREE.Euler(t.rx || 0, t.ry || 0, t.rz || 0));
    s.set(t.sx ?? t.s, t.sy ?? t.s, t.sz ?? t.s);
    m4.compose(p, q, s);
    im.setMatrixAt(i, m4);
    if (t.color) im.setColorAt(i, new THREE.Color(t.color));
  });
  im.castShadow = im.receiveShadow = true;
  scene.add(im);
  return im;
}

export function forestTrees(scene, trees, circle, greens) {
  if (!trees.length) return;
  instanced(scene, new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6), std('#6b4a2f'), trees, ([x, z, k]) => ({ x, y: 0.9 * (0.8 + k), z, s: 0.8 + k }));
  const broad = trees.filter((t) => t[2] > 0.45), pine = trees.filter((t) => t[2] <= 0.45);
  if (broad.length) instanced(scene, new THREE.IcosahedronGeometry(1.5, 1), std('#ffffff'), broad, ([x, z, k]) => ({ x, y: 2.6 * (0.8 + k), z, s: 0.8 + k, color: greens[Math.floor(k * 37) % greens.length] }));
  if (pine.length) instanced(scene, new THREE.ConeGeometry(1.3, 3.2, 7), std('#ffffff'), pine, ([x, z, k]) => ({ x, y: 2.9 * (0.9 + k), z, s: 0.9 + k, color: greens[Math.floor(k * 53) % greens.length] }));
  for (const [x, z, k] of trees) circle(x, z, 0.35 * (0.8 + k), 5);
}

export function palm(scene, circle, x, z, rng) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const lean = (rng() - 0.5) * 0.4;
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.75, 6), std('#8b6b45'), lean * i * 0.5, 0.375 + i * 0.72, 0));
  for (let i = 0; i < 6; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.35, 2.4, 4), std('#2f9e5a'), lean * 3, 4.4, 0);
    leaf.rotation.set(Math.PI / 2.4, (i / 6) * Math.PI * 2, 0, 'YXZ');
    leaf.position.x += Math.sin((i / 6) * Math.PI * 2) * 0.9;
    leaf.position.z += Math.cos((i / 6) * Math.PI * 2) * 0.9;
    g.add(leaf);
  }
  scene.add(g);
  circle(x, z, 0.3, 5);
}

export function fireflies(scene, W, I, rng, color) {
  const N = 90, pos = new Float32Array(N * 3), seed = [];
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * (I.r - 3);
    seed.push([I.c[0] + Math.cos(a) * r, 0.5 + rng() * 4, I.c[1] + Math.sin(a) * r, rng() * 6]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: new THREE.Color(color).multiplyScalar(2), size: 0.18, transparent: true, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  W.updaters.push((t) => {
    for (let i = 0; i < N; i++) {
      const s = seed[i];
      pos[i * 3] = s[0] + Math.sin(t * 0.5 + s[3]) * 1.2;
      pos[i * 3 + 1] = s[1] + Math.sin(t * 1.3 + s[3] * 2) * 0.4;
      pos[i * 3 + 2] = s[2] + Math.cos(t * 0.4 + s[3]) * 1.2;
    }
    geo.attributes.position.needsUpdate = true;
  });
}

// ---------------------------------------------------------------- things to climb

// A slab you can stand on (a step of up to 0.75 m can simply be walked onto). With `collide`, a slab
// below head height also stops you walking through it, so you have to jump up; stairs leave it off.
export function slab(scene, W, { x, z, r = 1, top, thick = 0.3, mat, geo = null, collide = true }) {
  const m = mesh(geo || new THREE.CylinderGeometry(r, r * 0.92, thick, 12), mat, x, top - thick / 2, z);
  scene.add(m);
  W.platforms.push({ x, z, r, top });
  if (collide && top > 0.75) W.colliders.push({ type: 'circle', x, z, r: Math.max(0.15, r - 0.55), top: top - 0.05, bottom: top - thick - 0.1 });
  return m;
}

// A solid pillar from the ground up to `top` that you can stand on.
export function pillar(scene, W, { x, z, r = 1, top, mat, sides = 10 }) {
  const m = mesh(new THREE.CylinderGeometry(r, r * 1.06, top, sides), mat, x, top / 2, z);
  scene.add(m);
  W.platforms.push({ x, z, r, top });
  if (top > 0.75) W.colliders.push({ type: 'circle', x, z, r: Math.max(0.15, r - 0.55), top: top - 0.05, bottom: -99 });
  return m;
}

// A bounce pad that launches you onto a platform ({x, z, top})
export function bouncePad(W, { x, z, r = 1.2, y = 0, to }) {
  W.pads.push({ x, z, r, y, to });
}

// A floating text label
export function label(scene, text, { sub = '', accent = '#5eead4', height = 0.45, x, y, z }) {
  const l = makeLabel(text, { sub, accent, height });
  l.position.set(x, y, z);
  scene.add(l);
  return l;
}

// A small bobbing, spinning pick-up (its visual is any Object3D)
export function bob(W, obj, { amp = 0.12, speed = 2, spin = 0.8 } = {}) {
  const y0 = obj.position.y, ph = Math.random() * 6;
  W.updaters.push((t, dt) => {
    if (!obj.visible) return;
    obj.position.y = y0 + Math.sin(t * speed + ph) * amp;
    obj.rotation.y += spin * dt;
  });
}
