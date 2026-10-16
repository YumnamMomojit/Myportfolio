// The archipelago: themed islands around Cloud Island, linked by a living root
// bridge, a road bridge, a hidden stone bridge, two train lines and a cable car.
// This file builds only what every visitor needs: the island bases, the bridges and
// transports, the level gates and the exit seals. Each island's adventure lives in
// js/islands/<id>.js and is loaded only when that island is unlocked and you come near
// (see js/islands/manager.js); until then it stays hidden in mist.
import * as THREE from 'three';
import { makeLabel, drawCanvas, mulberry32, FONT } from './utils.js';
import { std, glowMat, mesh, jitter, softSpriteTexture } from './helpers.js';
import { hashAnswer } from './hash.js';

const norm = (x, z) => { const l = Math.hypot(x, z); return [x / l, z / l]; };
const DIR = {
  manipur: norm(0.94, 0.34),
  forest: norm(-0.97, 0.24),
  desert: norm(0.6, -0.8),
  water: norm(-0.2, 0.98),
  city: norm(-0.2, -0.98),
};
const at = (d, k) => [d[0] * k, d[1] * k];
const MAIN_R = 64;

export const ISLANDS = [
  {
    id: 'manipur', name: 'Manipur Island', sub: 'heritage · festivals · Sagol Kangjei', icon: '🏇', req: 3, r: 38, c: at(DIR.manipur, 150), top: '#6cbf6a', side: '#8a6a4c', color: '#fb923c', via: 'the train (east station)',
    topic: 'Manipur heritage: the Meitei calendar and its festivals, the story of Sagol Kangjei and pony polo',
    purpose: 'Discover Manipuri culture: a lunar calendar written in Meitei Mayek, the festivals that mark its year, and the game that became modern polo.',
    learn: ['The 12 months of the Meitei calendar, in Meitei Mayek and English', 'Which festival belongs to which month', 'Sagol Kangjei: the Manipuri origins of polo'],
    trial: 'The Festival Lanterns', task: 'lanterns', cert: 'heritage', load: () => import('./islands/manipur.js'),
  },
  {
    id: 'forest', name: 'Forest Island', sub: 'machine-learning field trip', icon: '🌲', req: 4, r: 40, c: at(DIR.forest, 150), top: '#4f9e4f', side: '#6f5440', color: '#4ade80', via: 'the living root bridge (west, past the AI Lab)',
    topic: 'Machine learning in the field: collect labelled specimens, grow a decision tree, pass the forest test',
    purpose: 'Learn how machines learn from data by doing a field data scientist\u2019s job: collect examples, train a model and test it on data it has never seen.',
    learn: ['Features, labels and datasets', 'Sampling bias: why easy-to-collect data can mislead', 'Decision trees: choosing the questions that split data best', 'Training accuracy vs test accuracy (overfitting)'],
    trial: 'The Forest Test', task: 'forest-quest', cert: 'fieldml', load: () => import('./islands/forest.js'),
  },
  {
    id: 'desert', name: 'Desert Island', sub: 'algorithms expedition', icon: '🏜️', req: 6, r: 42, c: at(DIR.desert, 152), top: '#e6c58a', side: '#c49a63', color: '#f59e0b', via: 'the road bridge (north-east, past the Brain Arena)',
    topic: 'Algorithms: search, sort and find the shortest path across the dunes',
    purpose: 'Think like an algorithm: search smarter, sort faster and find the shortest way across the dunes.',
    learn: ['Binary search: why 5 probes are enough for 32 mounds', 'Sorting with comparisons (bubble sort)', 'Shortest paths: BFS for equal steps, Dijkstra for weighted ones'],
    trial: 'The Lost Caravan', task: 'desert-quest', cert: 'algo', load: () => import('./islands/desert.js'),
  },
  {
    id: 'water', name: 'Water Island', sub: 'networking harbour', icon: '🌊', req: 8, r: 36, c: at(DIR.water, 156), top: '#efdcae', side: '#b98f62', color: '#38bdf8', via: 'the cable car (south, by the Fun Park)',
    topic: 'Networking: packets, addresses, DNS and the TCP handshake across a harbour of islets',
    purpose: 'See how the internet moves data: packets, addresses, routing and the TCP handshake.',
    learn: ['Packets and IP addresses', 'DNS', 'Routing', 'The TCP handshake'],
    task: 'water-quest', cert: 'network', load: () => import('./islands/water.js'),
  },
  {
    id: 'city', name: 'City Island', sub: 'learn by building', icon: '🏙️', req: 10, r: 42, c: at(DIR.city, 162), top: '#7c8594', side: '#5b6170', color: '#a78bfa', via: 'the train (north station)',
    topic: 'Cloud architecture: build a city of cloud services, then survive a traffic spike',
    purpose: 'Design resilient systems by building them: load balancers, replicas, caches and autoscaling.',
    learn: ['Load balancing', 'Replication and failover', 'Caching and autoscaling'],
    task: 'city-quest', cert: 'architect', load: () => import('./islands/city.js'),
  },
  {
    id: 'mystery', name: 'Mysterious Island', sub: 'cybersecurity escape', icon: '🗿', req: 12, r: 32, c: [-150, 140], top: '#3d4a3b', side: '#3b3a45', color: '#c084fc', via: 'the hidden stone bridge on Forest Island (solve its riddle)',
    topic: 'Cybersecurity escape: ciphers, phishing traps and a locked temple',
    purpose: 'Think like a defender: crack ciphers, spot phishing and build strong secrets.',
    learn: ['Classical ciphers', 'Spotting phishing', 'Strong passwords and hashing'],
    task: 'mystery-quest', cert: 'cyber', load: () => import('./islands/mystery.js'),
  },
];
const ISLE = Object.fromEntries(ISLANDS.map((i) => [i.id, i]));

// endpoints shared with world.js (to keep trees off station platforms and bridgeheads)
const rimPoint = (d, k = MAIN_R - 1.7) => at(d, k);
export const STATIONS = {
  east: at(DIR.manipur, 55),
  north: at(DIR.city, 55),
  cable: at(DIR.water, 55),
  rootBridge: rimPoint(DIR.forest),
  roadBridge: rimPoint(DIR.desert),
};

// The mysterious island's riddle (answers stored as hashes)
const RIDDLE = {
  q: 'The more of me you take, the more you leave behind. What am I?',
  hashes: ['footsteps', 'footstep', 'footprints', 'steps'].map(hashAnswer),
};
export const checkRiddle = (input) => RIDDLE.hashes.includes(hashAnswer(input));
export const RIDDLE_TEXT = RIDDLE.q;

// =====================================================================

export function buildArchipelago(scene, W, circle, interact, quality) {
  const rng = mulberry32(777);
  W.decks = [];
  W.gates = [];
  W.seals = [];
  W.shrouds = {};
  W.transports = {};
  W.islandList = ISLANDS;

  for (const I of ISLANDS) {
    buildIslandBase(scene, I, rng);
    W.isles.push({ id: I.id, x: I.c[0], z: I.c[1], r: I.r - 1.4 });
    const lbl = makeLabel(`${I.icon} ${I.name}`, { sub: `${I.sub} · unlocks at LV ${I.req}`, accent: I.color, height: 2.2 });
    lbl.position.set(I.c[0], 22, I.c[1]);
    scene.add(lbl);
    // the island's welcome sign; its adventure loads later, hidden in mist until then
    signboard(scene, I, circle, interact);
    shroud(scene, W, I, rng);
  }

  // ---------------------------------------------------------------- bridges
  const F = ISLE.forest, D = ISLE.desert, M = ISLE.mystery;
  const rootB = v3(F.c[0] - DIR.forest[0] * (F.r - 1.7), 0, F.c[1] - DIR.forest[1] * (F.r - 1.7));
  rootBridge(scene, W, circle, v3(...STATIONS.rootBridge), rootB, F, rng);
  seal(scene, W, rootB, v3(DIR.forest[0], 0, DIR.forest[1]), 2.6, F);
  const roadB = v3(D.c[0] - DIR.desert[0] * (D.r - 1.7), 0, D.c[1] - DIR.desert[1] * (D.r - 1.7));
  roadBridge(scene, W, circle, v3(...STATIONS.roadBridge), roadB, D);
  seal(scene, W, roadB, v3(DIR.desert[0], 0, DIR.desert[1]), 5, D);
  const fm = norm(M.c[0] - F.c[0], M.c[1] - F.c[1]);
  const stoneA = v3(F.c[0] + fm[0] * (F.r - 1.7), 0, F.c[1] + fm[1] * (F.r - 1.7)), stoneB = v3(M.c[0] - fm[0] * (M.r - 1.7), 0, M.c[1] - fm[1] * (M.r - 1.7));
  stoneBridge(scene, W, circle, interact, stoneA, stoneB, M, rng);
  seal(scene, W, stoneA, v3(-fm[0], 0, -fm[1]), 3.2, F);
  seal(scene, W, stoneB, v3(fm[0], 0, fm[1]), 3.2, M);

  // ---------------------------------------------------------------- trains & cable car
  const mp = ISLE.manipur, cy = ISLE.city, wa = ISLE.water;
  trainLine(scene, W, circle, interact, {
    id: 'train-east', color: '#dc2626', A: STATIONS.east, B: [mp.c[0] - DIR.manipur[0] * 28, mp.c[1] - DIR.manipur[1] * 28],
    names: ['Cloud Island', mp.name], isle: mp, aRim: MAIN_R - 1, bRim: mp.r - 1,
  });
  trainLine(scene, W, circle, interact, {
    id: 'train-north', color: '#2563eb', A: STATIONS.north, B: [cy.c[0] - DIR.city[0] * 30, cy.c[1] - DIR.city[1] * 30],
    names: ['Cloud Island', cy.name], isle: cy, aRim: MAIN_R - 1, bRim: cy.r - 1,
  });
  cableCar(scene, W, circle, interact, {
    id: 'cable-water', A: STATIONS.cable, B: [wa.c[0] - DIR.water[0] * 27, wa.c[1] - DIR.water[1] * 27], names: ['Cloud Island', wa.name], isle: wa,
  });

  W.setLevel = (level, state) => {
    for (const g of W.gates) {
      const open = level >= g.req && (!g.riddle || state.riddles?.includes(g.id));
      g.collider.enabled = !open;
      g.open = open;
      if (g.deck) g.deck.enabled = open;
    }
  };
  W.isSafe = (x, z) => W.isles.some((s) => (x - s.x) ** 2 + (z - s.z) ** 2 < (s.r - 6) ** 2);
}

const v3 = (x, y, z) => (z === undefined ? new THREE.Vector3(x, 0, y) : new THREE.Vector3(x, y, z));

// ---------------------------------------------------------------- island bases

function buildIslandBase(scene, I, rng) {
  const [x, z] = I.c, R = I.r;
  const top = mesh(new THREE.CylinderGeometry(R, R - 0.4, 0.8, 56), std(I.top), x, -0.4, z);
  top.castShadow = false;
  scene.add(top);
  scene.add(mesh(jitter(new THREE.CylinderGeometry(R - 0.4, R - 4.5, 5, 40, 2), 1.2, rng, (px, py) => py > 2.4), std(I.side), x, -3.3, z));
  const cone = new THREE.ConeGeometry(R - 4.5, R * 0.8, 24, 4);
  jitter(cone, 3, rng, (px, py) => py < -R * 0.4 + 0.01);
  cone.rotateX(Math.PI);
  scene.add(mesh(cone, std('#6b5f57'), x, -5.8 - R * 0.4, z));
}

function signboard(scene, I, circle, interact) {
  const toward = norm(-I.c[0], -I.c[1]);
  const x = I.c[0] + toward[0] * (I.r * 0.45), z = I.c[1] + toward[1] * (I.r * 0.45);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(toward[0], toward[1]);
  const wood = std('#7c4a2d');
  for (const sx of [-1.3, 1.3]) g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), wood, sx, 1.2, 0));
  const tex = drawCanvas(512, 300, (c, w, h) => {
    c.fillStyle = '#0b1330';
    c.fillRect(0, 0, w, h);
    c.fillStyle = I.color;
    c.font = `700 40px ${FONT}`;
    c.fillText(`${I.icon} ${I.name}`, 26, 60);
    c.fillStyle = '#e2e8f0';
    c.font = `500 25px ${FONT}`;
    const words = I.topic.split(' ');
    let line = '', y = 112;
    for (const wd of words) {
      if (c.measureText(line + wd).width > w - 52) { c.fillText(line, 26, y); line = ''; y += 34; }
      line += wd + ' ';
    }
    c.fillText(line, 26, y);
    c.fillStyle = '#fbbf24';
    c.font = `700 24px ${FONT}`;
    c.fillText(I.trial ? `🎯 Trial: ${I.trial} · 🎓 certificate` : '🚧 Adventure arriving in a coming update', 26, h - 26);
  });
  g.add(mesh(new THREE.BoxGeometry(2.9, 1.7, 0.08), [wood, wood, wood, wood, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), wood], 0, 1.9, 0));
  scene.add(g);
  circle(x, z, 0.5, 3);
  interact({ id: `isle:${I.id}`, zone: I.id, label: `About ${I.name}`, x: x + toward[0] * 1.4, z: z + toward[1] * 1.4, r: 2.4, object: g });
}

// ---------------------------------------------------------------- mist + exit seals

// Until an island's adventure has loaded (it needs to be unlocked and near), it hides in mist.
function shroud(scene, W, I, rng) {
  const g = new THREE.Group();
  const tex = softSpriteTexture('232,238,248');
  const sprites = [];
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.6 }));
    const a = (i / 16) * Math.PI * 2 + rng() * 0.4, r = I.r * (0.15 + rng() * 0.7);
    s.position.set(I.c[0] + Math.cos(a) * r, 2.5 + rng() * 7, I.c[1] + Math.sin(a) * r);
    s.scale.setScalar(I.r * (0.6 + rng() * 0.4));
    s.userData.ph = rng() * 6;
    s.userData.y = s.position.y;
    g.add(s);
    sprites.push(s);
  }
  scene.add(g);
  const S = { k: 1, target: 1, loading: false };
  S.reveal = () => (S.target = 0);
  S.setLoading = (v) => (S.loading = v);
  W.shrouds[I.id] = S;
  W.updaters.push((t, dt) => {
    if (!g.visible) return;
    S.k = THREE.MathUtils.damp(S.k, S.target, 1.6, dt);
    for (const s of sprites) {
      s.material.opacity = 0.6 * S.k * (S.loading ? 0.75 + Math.sin(t * 3 + s.userData.ph) * 0.25 : 1);
      s.position.y = s.userData.y + Math.sin(t * 0.3 + s.userData.ph) * 0.8 + (1 - S.k) * 6;
    }
    if (S.target === 0 && S.k < 0.01) g.visible = false;
  });
}

// A glowing seal across a bridge, just off the island. While the island's trial is unsolved
// it closes behind you (js/islands/manager.js decides), so the only way home is to solve it.
function seal(scene, W, end, into, w, isle) {
  const gx = end.x - into.x * 2.6, gz = end.z - into.z * 2.6;
  const nx = -into.z, nz = into.x;
  const collider = { type: 'seg', ax: gx + nx * (w / 2 + 0.4), az: gz + nz * (w / 2 + 0.4), bx: gx - nx * (w / 2 + 0.4), bz: gz - nz * (w / 2 + 0.4), r: 0.3, top: 99, bottom: -99, enabled: false };
  W.colliders.push(collider);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.8, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(isle.color).multiplyScalar(1.4), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  wall.position.set(gx, 1.4, gz);
  wall.rotation.y = Math.atan2(into.x, into.z);
  wall.visible = false;
  scene.add(wall);
  const lbl = makeLabel('🔒 Sealed', { sub: `complete ${isle.trial || 'the island trial'} to leave`, accent: isle.color, height: 0.45 });
  lbl.position.set(gx, 3.6, gz);
  lbl.visible = false;
  scene.add(lbl);
  const S = { isle: isle.id, collider, locked: false, x: gx, z: gz };
  S.set = (v) => {
    S.locked = v;
    collider.enabled = v;
  };
  W.seals.push(S);
  W.updaters.push((t, dt) => {
    const target = S.locked ? 0.35 + Math.sin(t * 3) * 0.08 : 0;
    wall.material.opacity = THREE.MathUtils.damp(wall.material.opacity, target, 4, dt);
    wall.visible = wall.material.opacity > 0.01;
    lbl.visible = S.locked;
  });
}

// ---------------------------------------------------------------- bridges

function deck(W, A, B, w, h) {
  const len = Math.hypot(B.x - A.x, B.z - A.z);
  const d = { ax: A.x, az: A.z, dx: (B.x - A.x) / len, dz: (B.z - A.z) / len, len, w, h, enabled: true };
  W.decks.push(d);
  return d;
}
function rails(W, A, B, w) {
  const len = Math.hypot(B.x - A.x, B.z - A.z);
  const nx = -(B.z - A.z) / len, nz = (B.x - A.x) / len;
  for (const s of [-1, 1]) W.colliders.push({ type: 'seg', ax: A.x + nx * s * (w / 2 + 0.2), az: A.z + nz * s * (w / 2 + 0.2), bx: B.x + nx * s * (w / 2 + 0.2), bz: B.z + nz * s * (w / 2 + 0.2), r: 0.15, top: 99, bottom: -99 });
}
function gate(scene, W, A, B, w, req, isle, extra = {}) {
  const len = Math.hypot(B.x - A.x, B.z - A.z);
  const dx = (B.x - A.x) / len, dz = (B.z - A.z) / len;
  const gx = A.x + dx * 1.2, gz = A.z + dz * 1.2;
  const nx = -dz, nz = dx;
  const collider = { type: 'seg', ax: gx + nx * (w / 2 + 0.4), az: gz + nz * (w / 2 + 0.4), bx: gx - nx * (w / 2 + 0.4), bz: gz - nz * (w / 2 + 0.4), r: 0.3, top: 99, bottom: -99, enabled: true };
  W.colliders.push(collider);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.8, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(isle.color).multiplyScalar(1.3), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  wall.position.set(gx, 1.6, gz);
  wall.rotation.y = Math.atan2(dx, dz);
  scene.add(wall);
  const lbl = makeLabel(`🔒 ${isle.name}`, { sub: extra.riddle ? `reach LV ${req} and solve the riddle` : `reach LV ${req} to cross`, accent: isle.color, height: 0.5 });
  lbl.position.set(gx, 3.8, gz);
  scene.add(lbl);
  const g = { id: isle.id, req, collider, open: false, ...extra };
  W.gates.push(g);
  W.updaters.push((t, dt) => {
    const target = g.open ? 0 : 0.3 + Math.sin(t * 3) * 0.08;
    wall.material.opacity = THREE.MathUtils.damp(wall.material.opacity, target, 4, dt);
    wall.visible = wall.material.opacity > 0.01;
    lbl.visible = !g.open;
  });
  return g;
}

function rootBridge(scene, W, circle, A, B, isle, rng) {
  const w = 2.6, sag = 1.4;
  const hFn = (t) => -sag * Math.sin(Math.PI * t);
  const d = deck(W, A, B, w, hFn);
  rails(W, A, B, w);
  gate(scene, W, A, B, w, isle.req, isle);
  const len = d.len, nx = -d.dz, nz = d.dx;
  const point = (t, side, lift = 0) => new THREE.Vector3(A.x + d.dx * len * t + nx * side, hFn(t) + lift, A.z + d.dz * len * t + nz * side);
  const root = std('#6b4a2f'), moss = std('#4d7c3a');
  // interwoven roots forming the walkway and the handrails
  for (let k = 0; k < 7; k++) {
    const side = -w / 2 + (k / 6) * w;
    const pts = Array.from({ length: 12 }, (_, i) => point(i / 11, side + (rng() - 0.5) * 0.3, -0.12 + (rng() - 0.5) * 0.15));
    scene.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.16 + rng() * 0.06, 5), k % 3 ? root : moss));
  }
  for (const s of [-1, 1]) {
    const pts = Array.from({ length: 12 }, (_, i) => point(i / 11, s * (w / 2 + 0.15), 1.0 + Math.sin(i) * 0.08));
    scene.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.1, 5), root));
    for (let i = 1; i < 16; i++) {
      const t = i / 16;
      const a = point(t, s * (w / 2 + 0.15), 0), b = point(t, s * (w / 2 + 0.15), 1.0);
      scene.add(beam3(a, b, 0.05, root));
    }
  }
  // flat stepping stones on top so it reads as walkable
  const slab = std('#9ca3af');
  for (let i = 1; i < 26; i++) {
    const p = point(i / 26, (rng() - 0.5) * 0.4, 0.02);
    const s = mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 7), slab, p.x, p.y, p.z);
    s.rotation.y = rng() * 3;
    scene.add(s);
  }
  // hanging vines
  for (let i = 0; i < 18; i++) {
    const p = point(rng(), (rng() < 0.5 ? -1 : 1) * (w / 2 + 0.1), -0.2);
    const v = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5 + rng() * 2, 4), moss, p.x, p.y - 1, p.z, false);
    scene.add(v);
  }
  const sign = makeLabel('Living Root Bridge', { sub: 'grown, not built — like Meghalaya’s bridges', accent: '#4ade80', height: 0.5 });
  sign.position.copy(point(0.02, 0, 4.4));
  scene.add(sign);
}

function roadBridge(scene, W, circle, A, B, isle) {
  const w = 5, arch = 2.2;
  const hFn = (t) => arch * Math.sin(Math.PI * t);
  const d = deck(W, A, B, w, hFn);
  rails(W, A, B, w);
  gate(scene, W, A, B, w, isle.req, isle);
  const len = d.len, nx = -d.dz, nz = d.dx;
  const N = 40;
  const asphalt = std('#374151'), steel = std('#e5e7eb', { metalness: 0.5, roughness: 0.4 }), stripe = std('#facc15');
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2;
    const segLen = Math.hypot(len / N, hFn(t1) - hFn(t0));
    const seg = mesh(new THREE.BoxGeometry(w, 0.3, segLen + 0.05), asphalt, A.x + d.dx * len * tm, hFn(tm) - 0.15, A.z + d.dz * len * tm);
    seg.rotation.order = 'YXZ';
    seg.rotation.y = Math.atan2(d.dx, d.dz);
    seg.rotation.x = -Math.atan2(hFn(t1) - hFn(t0), len / N);
    scene.add(seg);
    if (i % 2 === 0) {
      const st = mesh(new THREE.BoxGeometry(0.12, 0.02, segLen * 0.6), stripe, A.x + d.dx * len * tm, hFn(tm) + 0.01, A.z + d.dz * len * tm, false);
      st.rotation.copy(seg.rotation);
      scene.add(st);
    }
  }
  // railings, lamp posts and arch supports underneath
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    for (const s of [-1, 1]) {
      const bx = A.x + d.dx * len * t + nx * s * (w / 2 + 0.2), bz = A.z + d.dz * len * t + nz * s * (w / 2 + 0.2);
      scene.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), steel, bx, hFn(t) + 0.5, bz));
      if (i % 5 === 0) {
        scene.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 6), steel, bx, hFn(t) + 2, bz));
        scene.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), glowMat('#fde68a', 2.4), bx, hFn(t) + 4.1, bz, false));
      }
    }
    if (i > 0 && i < 20) {
      const cx = A.x + d.dx * len * t, cz = A.z + d.dz * len * t;
      const under = -6 - 3 * Math.sin(Math.PI * t);
      scene.add(beam3(new THREE.Vector3(cx, hFn(t) - 0.3, cz), new THREE.Vector3(cx, under, cz), 0.12, steel));
    }
  }
  for (const s of [-1, 1]) {
    const pts = Array.from({ length: 21 }, (_, i) => {
      const t = i / 20;
      return new THREE.Vector3(A.x + d.dx * len * t + nx * s * (w / 2 + 0.2), hFn(t) + 1, A.z + d.dz * len * t + nz * s * (w / 2 + 0.2));
    });
    scene.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 5), steel, 0, 0, 0, false));
    const archPts = Array.from({ length: 21 }, (_, i) => {
      const t = i / 20;
      return new THREE.Vector3(A.x + d.dx * len * t + nx * s * (w / 2 - 0.3), -6 - 3 * Math.sin(Math.PI * t), A.z + d.dz * len * t + nz * s * (w / 2 - 0.3));
    });
    scene.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 60, 0.3, 6), steel));
  }
  const sign = makeLabel('Road Bridge', { sub: 'walk — or ride the bike across', accent: '#f59e0b', height: 0.5 });
  sign.position.set(A.x + d.dx * 2, 5.4, A.z + d.dz * 2);
  scene.add(sign);
}

function stoneBridge(scene, W, circle, interact, A, B, isle, rng) {
  const w = 3.2;
  const d = deck(W, A, B, w, () => 0);
  d.enabled = false;
  rails(W, A, B, w);
  gate(scene, W, A, B, w, isle.req, isle, { riddle: true, deck: d });
  const len = d.len;
  const stone = std('#6b6875');
  const stones = [];
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 18;
    const s = mesh(jitter(new THREE.BoxGeometry(w, 0.6, len / 18 - 0.15, 2, 1, 2), 0.08, rng), stone, A.x + d.dx * len * t, -0.3, A.z + d.dz * len * t);
    s.rotation.y = Math.atan2(d.dx, d.dz);
    s.userData.delay = i * 0.12;
    scene.add(s);
    stones.push(s);
  }
  const gateRef = W.gates[W.gates.length - 1];
  let raisedAt = null;
  W.updaters.push((t) => {
    if (gateRef.open && raisedAt === null) raisedAt = t;
    stones.forEach((s, i) => {
      if (!gateRef.open) {
        s.position.y = -9 + Math.sin(t * 0.7 + i) * 0.4; // sunk in the mist, waiting
      } else {
        const k = Math.min(1, Math.max(0, (t - raisedAt - s.userData.delay) / 1.2));
        s.position.y = -9 + (8.7 * (1 - (1 - k) ** 3));
      }
    });
  });
  // the riddle stone
  const rx = A.x - d.dx * 2.5 + -d.dz * 2.5, rz = A.z - d.dz * 2.5 + d.dx * 2.5;
  const rs = mesh(jitter(new THREE.BoxGeometry(1.4, 2.2, 0.6, 2, 2, 1), 0.1, rng), std('#57534e'), rx, 1.1, rz);
  rs.rotation.y = Math.atan2(d.dx, d.dz);
  scene.add(rs);
  scene.add(mesh(new THREE.OctahedronGeometry(0.25, 0), glowMat('#c084fc', 2.4), rx, 2.6, rz, false));
  circle(rx, rz, 0.8, 3);
  interact({ id: 'riddle:mystery', zone: 'forest', label: 'Read the riddle stone 🗿', x: rx, z: rz, r: 2.4, object: rs });
}

function beam3(a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = mesh(new THREE.CylinderGeometry(r, r, dir.length(), 6), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// ---------------------------------------------------------------- rideable transports

function stationPlatform(scene, circle, x, z, yaw, color, title, sub) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  g.add(mesh(new THREE.BoxGeometry(4, 0.3, 9), std('#cbd5e1'), 2.6, 0.15, 0));
  for (const zz of [-3.5, 3.5]) g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), std('#475569'), 4, 1.5, zz));
  const roof = mesh(new THREE.BoxGeometry(3.4, 0.2, 9.4), std(color), 3.2, 3.05, 0);
  roof.rotation.z = -0.1;
  g.add(roof);
  const lbl = makeLabel(title, { sub, accent: color, height: 0.5 });
  lbl.position.set(2.6, 4.2, 0);
  g.add(lbl);
  scene.add(g);
  return g;
}

function trainLine(scene, W, circle, interact, o) {
  const A = new THREE.Vector3(o.A[0], 0, o.A[1]), B = new THREE.Vector3(o.B[0], 0, o.B[1]);
  const dir = new THREE.Vector3().subVectors(B, A).setY(0).normalize();
  const len = A.distanceTo(B);
  const aRim = Math.hypot(A.x, A.z), bRimDist = Math.hypot(B.x - o.isle.c[0], B.z - o.isle.c[1]);
  const offA = o.aRim - aRim + 2, offB = o.bRim - bRimDist + 2;
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const s = (i / 30) * len;
    const rise = Math.min(1, Math.max(0, (s - offA + 4) / 6)) * Math.min(1, Math.max(0, (len - offB + 4 - s) / 6));
    pts.push(A.clone().addScaledVector(dir, s).setY(0.35 + rise * 1.05));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  // viaduct deck, rails, sleepers and piers
  const viaLen = len - offA - offB;
  const mid = A.clone().addScaledVector(dir, offA + viaLen / 2);
  const yaw = Math.atan2(dir.x, dir.z);
  const deckM = mesh(new THREE.BoxGeometry(3, 0.6, viaLen), std('#9ca3af'), mid.x, 1.05, mid.z);
  deckM.rotation.y = yaw;
  scene.add(deckM);
  const nx = -dir.z, nz = dir.x;
  for (const s of [-0.7, 0.7]) {
    const rail = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.06, 4), std('#d1d5db', { metalness: 0.7, roughness: 0.3 }));
    rail.position.set(nx * s, 0, nz * s);
    scene.add(rail);
  }
  const sleeperGeo = new THREE.BoxGeometry(2.1, 0.12, 0.35);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, std('#78350f'), Math.floor(len / 1.2));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  for (let i = 0; i < sleepers.count; i++) {
    const p = curve.getPointAt(i / sleepers.count);
    m4.compose(new THREE.Vector3(p.x, p.y - 0.1, p.z), q, new THREE.Vector3(1, 1, 1));
    sleepers.setMatrixAt(i, m4);
  }
  scene.add(sleepers);
  for (let s = offA + 5; s < len - offB - 2; s += 10) {
    const p = A.clone().addScaledVector(dir, s);
    scene.add(mesh(new THREE.CylinderGeometry(0.6, 0.9, 28, 8), std('#94a3b8'), p.x, -13, p.z));
  }

  // stations at both ends
  stationPlatform(scene, circle, A.x, A.z, yaw, o.color, `🚆 ${o.names[0]} Station`, `train to ${o.names[1]} · LV ${o.isle.req}`);
  stationPlatform(scene, circle, B.x, B.z, yaw + Math.PI, o.color, `🚆 ${o.names[1]} Station`, `train to ${o.names[0]}`);

  // the train: a locomotive and an open panoramic carriage
  const train = new THREE.Group();
  const paint = std(o.color, { metalness: 0.35, roughness: 0.35 });
  const white = std('#f8fafc', { metalness: 0.2, roughness: 0.4 });
  const loco = new THREE.Group();
  loco.position.z = 3;
  loco.add(mesh(new THREE.BoxGeometry(2.2, 1.9, 4.6), paint, 0, 1.55, 0));
  loco.add(mesh(new THREE.BoxGeometry(2.25, 0.5, 2), glowMat('#93c5fd', 0.8), 0, 2.1, 1.3, false));
  loco.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 16, 1, false, 0, Math.PI), paint, 0, 1.55, 2.3).rotateZ(Math.PI / 2).rotateY(Math.PI / 2));
  loco.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), glowMat('#fef9c3', 3), 0, 1.4, 3.45, false));
  train.add(loco);
  const car = new THREE.Group();
  car.position.z = -2.6;
  car.add(mesh(new THREE.BoxGeometry(2.2, 0.9, 5.2), white, 0, 1.05, 0));
  car.add(mesh(new THREE.BoxGeometry(2.25, 0.18, 5.25), paint, 0, 1.45, 0));
  for (const s of [-1, 1]) car.add(mesh(new THREE.BoxGeometry(0.08, 0.6, 5.2), new THREE.MeshStandardMaterial({ color: '#bae6fd', transparent: true, opacity: 0.35 }), s * 1.08, 1.85, 0, false));
  train.add(car);
  for (const zz of [-4.2, -1, 1.6, 4.4]) for (const s of [-1, 1]) train.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12), std('#111827'), s * 1.0, 0.45, zz).rotateZ(Math.PI / 2));
  scene.add(train);

  const T = registerTransport(W, interact, o, curve, train, new THREE.Vector3(0, 0.6, -2.6), 10, A, B, yaw);
  T.kind = 'train';
}

function cableCar(scene, W, circle, interact, o) {
  const A = new THREE.Vector3(o.A[0], 0, o.A[1]), B = new THREE.Vector3(o.B[0], 0, o.B[1]);
  const dir = new THREE.Vector3().subVectors(B, A).normalize();
  const yaw = Math.atan2(dir.x, dir.z);
  const H = 4.4, lift = 7; // cabins dock at platform height and arch high over the sea
  const cablePts = Array.from({ length: 31 }, (_, i) => {
    const t = i / 30;
    return A.clone().lerp(B, t).setY(H + lift * Math.sin(Math.PI * t));
  });
  const cableCurve = new THREE.CatmullRomCurve3(cablePts);
  const steel = std('#cbd5e1', { metalness: 0.6, roughness: 0.3 });
  for (const s of [-0.6, 0.6]) {
    const c = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 120, 0.04, 4), std('#1f2937'));
    c.position.set(-dir.z * s, 0, dir.x * s);
    scene.add(c);
  }
  for (const P of [A, B]) {
    for (const s of [-1, 1]) scene.add(beam3(new THREE.Vector3(P.x - dir.z * s * 1.2, 0, P.z + dir.x * s * 1.2), new THREE.Vector3(P.x - dir.z * s * 0.6, H + 0.6, P.z + dir.x * s * 0.6), 0.14, steel));
    scene.add(mesh(new THREE.BoxGeometry(2, 0.4, 0.6), std('#0ea5e9'), P.x, H + 0.6, P.z).rotateY(yaw + Math.PI / 2));
    circle(P.x, P.z, 1.4, 99);
  }
  stationPlatform(scene, circle, A.x - dir.z * 3, A.z + dir.x * 3, yaw, '#0ea5e9', `🚡 ${o.names[0]} Cable Car`, `to ${o.names[1]} · LV ${o.isle.req}`);
  stationPlatform(scene, circle, B.x - dir.z * 3, B.z + dir.x * 3, yaw + Math.PI, '#0ea5e9', `🚡 ${o.names[1]} Cable Car`, `to ${o.names[0]}`);

  // the cabin hangs below the cable; the rider stands inside
  const cabin = new THREE.Group();
  const frame = std('#0ea5e9', { metalness: 0.4, roughness: 0.35 });
  cabin.add(mesh(new THREE.BoxGeometry(2.2, 0.15, 2.6), frame, 0, -3.05, 0));
  cabin.add(mesh(new THREE.BoxGeometry(2.3, 0.18, 2.7), frame, 0, -0.4, 0));
  for (const [x, z] of [[-1, -1.2], [1, -1.2], [-1, 1.2], [1, 1.2]]) cabin.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), frame, x, -1.7, z));
  cabin.add(mesh(new THREE.BoxGeometry(2.2, 1.1, 2.6), new THREE.MeshStandardMaterial({ color: '#bae6fd', transparent: true, opacity: 0.18, depthWrite: false }), 0, -2.4, 0, false));
  cabin.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), steel, 0, -0.1, 0));
  cabin.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12), std('#111827'), 0, 0.15, 0).rotateZ(Math.PI / 2));
  scene.add(cabin);
  const T = registerTransport(W, interact, o, cableCurve, cabin, new THREE.Vector3(0, -2.98, 0), 12, A.clone().add(new THREE.Vector3(-dir.z * 3, 0, dir.x * 3)), B.clone().add(new THREE.Vector3(-dir.z * 3, 0, dir.x * 3)), yaw, true);
  T.kind = 'cable';
}

function registerTransport(W, interact, o, curve, vehicle, seat, dur, A, B, yaw, hanging = false) {
  const T = {
    id: o.id, req: o.isle.req, isle: o.isle.id, curve, vehicle, dur, names: o.names, at: 0, heading: yaw,
    // platforms sit 2.6 to the side of the line (local +x of each station)
    exits: [
      { x: A.x + Math.cos(yaw) * 2.6, z: A.z - Math.sin(yaw) * 2.6, yaw: yaw + Math.PI / 2 },
      { x: B.x - Math.cos(yaw) * 2.6, z: B.z + Math.sin(yaw) * 2.6, yaw: yaw - Math.PI / 2 },
    ],
    place(u, reverse = false) {
      const p = curve.getPointAt(Math.min(1, Math.max(0, u)));
      const tg = curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
      vehicle.position.copy(p);
      const h = Math.atan2(tg.x, tg.z) + (reverse ? Math.PI : 0);
      vehicle.rotation.order = 'YXZ';
      vehicle.rotation.set(hanging ? 0 : -Math.asin(Math.max(-1, Math.min(1, tg.y))) * (reverse ? -1 : 1), h, 0);
      T.heading = h;
    },
    seatWorld(out) {
      return vehicle.localToWorld(out.copy(seat));
    },
  };
  T.place(0);
  W.transports[o.id] = T;
  interact({ id: `travel:${o.id}:0`, zone: null, label: `Board to ${o.names[1]} (LV ${o.isle.req})`, x: T.exits[0].x, z: T.exits[0].z, r: 3, object: vehicle });
  interact({ id: `travel:${o.id}:1`, zone: null, label: `Board back to ${o.names[0]}`, x: T.exits[1].x, z: T.exits[1].z, r: 3, object: vehicle });
  return T;
}
