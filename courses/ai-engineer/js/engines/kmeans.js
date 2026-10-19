// K-means with sheepdogs: assign each sheep to the nearest dog, move dogs to the middle.
import * as THREE from 'three';
import { candy, candyMat, grid, mulberry32, gauss, C, PALETTE } from '../kit.js';

const DOG_COLORS = [C.orange, C.purple, C.teal];
const SPAN = 5.5;

export default function kmeans(ctx) {
  const { stage, params } = ctx;
  const rng = mulberry32(params.seed ?? 1);
  const sheep = [];
  params.blobs.forEach(([cx, cy]) => {
    for (let i = 0; i < params.n; i++) sheep.push({ x: cx + gauss(rng) * 0.7, y: cy + gauss(rng) * 0.7, k: -1 });
  });
  const dogs = params.dogs.map(([x, y]) => ({ x, y }));

  const inertiaOf = (cs) => sheep.reduce((s, p) => s + Math.min(...cs.map((c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2)), 0);
  // the best answer: k-means started from the true flock centres
  let best = params.blobs.map(([x, y]) => ({ x, y }));
  for (let it = 0; it < 20; it++) best = step(best);
  const target = inertiaOf(best) * 1.08;

  stage.root.add(grid(-SPAN, SPAN, -SPAN, SPAN, { opacity: 0.15, board: 0xd9f7c8 }));
  const sheepMeshes = sheep.map((p) => {
    const g = new THREE.Group();
    const wool = candy('ball', C.white, 0.42);
    const head = candy('ball', 0x3b2a4a, 0.18);
    head.position.set(0.17, 0.08, 0.1);
    g.add(wool, head);
    g.position.set(p.x, p.y, 0.25);
    stage.root.add(g);
    return { g, wool };
  });
  const linkGeo = new THREE.BufferGeometry();
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: 0x15331f, transparent: true, opacity: 0.25 }));
  stage.root.add(links);

  const dogMeshes = dogs.map((d, i) => {
    const g = new THREE.Group();
    const body = candy('bean', DOG_COLORS[i], 0.85);
    const head = candy('ball', DOG_COLORS[i], 0.45);
    head.position.set(0.42, 0.22, 0.12);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), candyMat(0x15331f));
    ear.position.set(0.42, 0.45, 0.12);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffc61a, transparent: true, opacity: 0 }));
    g.add(body, head, ear, ring);
    g.position.set(d.x, d.y, 0.45);
    g.userData.ring = ring;
    stage.root.add(g);
    stage.clickable(g, () => pickDog(i));
    return g;
  });

  stage.frame({ target: [0, 0, 0], w: SPAN * 2 + 1, h: SPAN * 2 + 1, yaw: 0, pitch: 0.28 });
  stage.onGround((p) => placeDog(p), new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));

  ctx.ui.button('🐕 Herd! (one k-means round)', herd, { cls: 'green', cost: 1 });
  let sel = -1;
  status();

  function step(cs) {
    const sums = cs.map(() => ({ x: 0, y: 0, n: 0 }));
    sheep.forEach((p) => {
      let bi = 0, bd = Infinity;
      cs.forEach((c, i) => { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; bi = i; } });
      sums[bi].x += p.x; sums[bi].y += p.y; sums[bi].n++;
    });
    return cs.map((c, i) => (sums[i].n ? { x: sums[i].x / sums[i].n, y: sums[i].y / sums[i].n } : c));
  }

  function assign() {
    sheep.forEach((p) => {
      let bi = 0, bd = Infinity;
      dogs.forEach((c, i) => { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; bi = i; } });
      p.k = bi;
    });
    sheepMeshes.forEach((m, i) => (m.wool.material = candyMat(new THREE.Color(DOG_COLORS[sheep[i].k]).lerp(new THREE.Color(0xffffff), 0.55).getHex())));
    const arr = [];
    sheep.forEach((p) => arr.push(p.x, p.y, 0.2, dogs[p.k].x, dogs[p.k].y, 0.2));
    linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  }

  function pickDog(i) {
    if (ctx.over || ctx.busy) return;
    if (sel >= 0) dogMeshes[sel].userData.ring.material.opacity = 0;
    sel = sel === i ? -1 : i;
    if (sel >= 0) {
      dogMeshes[sel].userData.ring.material.opacity = 1;
      ctx.sound.bark();
      ctx.toast('Now click where this dog should go.', 'hint', 1800);
    }
  }

  async function placeDog(p) {
    if (sel < 0 || ctx.over || ctx.busy) return;
    if (Math.abs(p.x) > SPAN || Math.abs(p.y) > SPAN) return;
    if (!ctx.move()) return;
    const i = sel;
    dogMeshes[i].userData.ring.material.opacity = 0;
    sel = -1;
    dogs[i] = { x: p.x, y: p.y };
    ctx.busy = true;
    await runTo(i);
    ctx.busy = false;
    if (sheep[0].k >= 0) assign();
    check();
  }

  function runTo(i) {
    const m = dogMeshes[i];
    const from = m.position.clone();
    const to = new THREE.Vector3(dogs[i].x, dogs[i].y, 0.45);
    return stage.tweens.add(0.5, (k) => {
      m.position.lerpVectors(from, to, k);
      m.position.z = 0.45 + Math.abs(Math.sin(k * Math.PI * 3)) * 0.3;
    });
  }

  async function herd() {
    ctx.busy = true;
    assign();
    ctx.sound.bark();
    await new Promise((r) => setTimeout(r, 450));
    const next = step(dogs);
    next.forEach((c, i) => (dogs[i] = c));
    await Promise.all(dogs.map((_, i) => runTo(i)));
    assign();
    ctx.busy = false;
    check();
  }

  function status() {
    const v = inertiaOf(dogs);
    ctx.status(`Spread (inertia) <b>${v.toFixed(1)}</b> · goal ≤ <b>${target.toFixed(1)}</b> · = total squared distance from each sheep to its nearest dog`);
    return v;
  }

  function check() {
    if (status() <= target) {
      ctx.sound.gem();
      dogMeshes.forEach((m) => stage.fx.burst(m.position.clone(), PALETTE, 16, 3));
      ctx.win();
    }
  }

  return {
    update() {
      const t = performance.now() / 400;
      sheepMeshes.forEach((m, i) => (m.g.position.z = 0.25 + Math.max(0, Math.sin(t + i)) * 0.05));
    },
  };
}
