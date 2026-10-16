// Desert Island: the Lost Caravan, an algorithms expedition. A sandstorm has scattered the caravan,
// and three trial stones, each up something you climb, teach one idea each: binary search (find the
// buried chest in 5 probes), sorting (order the crates on a balance scale) and shortest paths (mark
// the trail to the oasis: fewest steps with BFS, then cheapest past quicksand with Dijkstra). Every
// answer is checked against the real algorithm, run here in code. Solving all three opens the road home.
import * as THREE from 'three';
import { drawCanvas, canvasTexture, makeLabel, FONT, MONO } from '../utils.js';
import { std, glowMat, mesh, beam, jitter, waterMaterial } from '../helpers.js';
import { frame, instanced, palm, slab, pillar, label } from './kit.js';

// ---------------------------------------------------------------- 1 · binary search
const MOUNDS = 32, PROBES = 5; // 2⁵ = 32: five halvings take 32 mounds down to 1

// the mounds still possible after the probes so far (a range lo..hi)
function range(probes) {
  let lo = 1, hi = MOUNDS;
  for (const p of probes) {
    if (p.ans === 'up') lo = Math.max(lo, p.n + 1);
    else if (p.ans === 'down') hi = Math.min(hi, p.n - 1);
    else lo = hi = p.n;
  }
  return [lo, hi];
}
const newChest = () => ({ at: 1 + Math.floor(Math.random() * MOUNDS), probes: [], found: 0 });

// ---------------------------------------------------------------- 2 · sorting
const CRATES = [
  { id: 'A', color: '#f59e0b' }, { id: 'B', color: '#38bdf8' }, { id: 'C', color: '#f472b6' },
  { id: 'D', color: '#a78bfa' }, { id: 'E', color: '#4ade80' }, { id: 'F', color: '#fb7185' },
];
const COLOR = Object.fromEntries(CRATES.map((c) => [c.id, c.color]));
const KG = [14, 21, 27, 33, 40, 48];
const MAX_WEIGHS = 15; // bubble sort never needs more for 6 crates: 5 + 4 + 3 + 2 + 1

function newCrates() {
  const kg = [...KG].sort(() => Math.random() - 0.5);
  const w = Object.fromEntries(CRATES.map((c, i) => [c.id, kg[i]]));
  let order;
  do order = CRATES.map((c) => c.id).sort(() => Math.random() - 0.5);
  while (inversions(order, w) < 7); // well shuffled, never nearly sorted
  return { order, w, log: [], weighs: 0, swaps: 0, last: null };
}
function inversions(order, w) {
  let n = 0;
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) if (w[order[i]] > w[order[j]]) n++;
  return n;
}
// what the weighings prove: lt[a][b] when a is lighter than b (A < B and B < C prove A < C too)
function proven(log) {
  const lt = Object.fromEntries(CRATES.map((c) => [c.id, {}]));
  for (const [a, b] of log) lt[a][b] = true;
  for (const k of CRATES) for (const i of CRATES) for (const j of CRATES) if (lt[i.id][k.id] && lt[k.id][j.id]) lt[i.id][j.id] = true;
  return lt;
}

// ---------------------------------------------------------------- 3 · shortest paths
// The trail map from the camp (S) to the oasis (O): '.' sand, '#' rock, '~' the old trail, which
// spring water turns to quicksand in round two. Quicksand halves your speed, so it costs 2.
const MAP = [
  '....#....',
  '.#..#..#.',
  '......#..',
  'S~~~~.#.O',
  '.##.#.#..',
  '....#....',
  '.###.....',
];
const COLS = MAP[0].length, ROWS = MAP.length, QUICK = 2;
const locate = (ch) => {
  const r = MAP.findIndex((row) => row.includes(ch));
  return [MAP[r].indexOf(ch), r];
};
const CAMP = locate('S'), OASIS = locate('O');
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const blocked = (c, r) => r < 0 || r >= ROWS || c < 0 || c >= COLS || MAP[r][c] === '#';
const tileCost = (c, r, quick) => (quick && MAP[r][c] === '~' ? QUICK : 1);
const table = (v) => MAP.map((row) => [...row].map(() => v));

// Breadth-first search: every tile's distance in steps from the camp, explored ring by ring.
function bfs() {
  const d = table(Infinity);
  d[CAMP[1]][CAMP[0]] = 0;
  const queue = [CAMP];
  while (queue.length) {
    const [c, r] = queue.shift();
    for (const [dc, dr] of N4) {
      const nc = c + dc, nr = r + dr;
      if (blocked(nc, nr) || d[nr][nc] !== Infinity) continue;
      d[nr][nc] = d[r][c] + 1;
      queue.push([nc, nr]);
    }
  }
  return d;
}
// Dijkstra's algorithm: the cheapest cost to every tile when tiles cost different amounts. It settles
// the cheapest tile reached so far, so a settled tile's cost is final.
function dijkstra() {
  const d = table(Infinity), settled = table(false);
  d[CAMP[1]][CAMP[0]] = 0;
  for (;;) {
    let best = null; // the cheapest unsettled tile (big maps keep these in a priority queue)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) if (!settled[r][c] && d[r][c] < Infinity && (!best || d[r][c] < d[best[1]][best[0]])) best = [c, r];
    }
    if (!best) return d;
    const [c, r] = best;
    settled[r][c] = true;
    for (const [dc, dr] of N4) {
      const nc = c + dc, nr = r + dr;
      if (!blocked(nc, nr)) d[nr][nc] = Math.min(d[nr][nc], d[r][c] + tileCost(nc, nr, true));
    }
  }
}
const routeCost = (route, quick) => route.slice(1).reduce((s, [c, r]) => s + tileCost(c, r, quick), 0);
const quickOn = (route) => route.filter(([c, r]) => MAP[r][c] === '~').length;
// a real trail: starts at the camp, one tile at a time (up, down, left, right), no rocks, no repeats
function isTrail(route) {
  const seen = new Set();
  return route.length > 0 && route[0][0] === CAMP[0] && route[0][1] === CAMP[1] && route.every(([c, r], i) => {
    if (blocked(c, r) || seen.has(r * COLS + c)) return false;
    seen.add(r * COLS + c);
    return !i || Math.abs(c - route[i - 1][0]) + Math.abs(r - route[i - 1][1]) === 1;
  });
}

// ---------------------------------------------------------------- build

export default function build(kit) {
  const { scene, W, I, circle, rng, player, sound, bursts } = kit;
  const M = frame(I);
  const { P, yawU } = M;
  const D = kit.data();
  D.chest ||= newChest();
  D.sort ||= newCrates();
  D.trail ||= { route: [CAMP], tries: 0 };
  if (!isTrail(D.trail.route)) D.trail = { route: [CAMP], tries: 0 };

  const sandMat = std('#e2bf83'), stone = std('#d6b27a'), stoneDark = std('#b48a57'), wood = std('#7c4a2d'), rockMat = std('#a8724c');
  const AMBER = '#f59e0b';
  const sites = {};

  // a frame-aligned stone block you can stand on. Taller than a step, you jump up; its walls sit back
  // from the edge (like the kit's pillars), so a jump that reaches the rim lands you on it.
  function block(u, v, half, top, mat, bottom = 0) {
    const c = P(u, v);
    const m = mesh(new THREE.BoxGeometry(half * 2, top - bottom, half * 2), mat, c.x, (top + bottom) / 2, c.y);
    m.rotation.y = yawU;
    scene.add(m);
    const corners = (k) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P(u + a * (half - k), v + b * (half - k)));
    const ring = corners(0).map((q) => [q.x, q.y]);
    const xs = ring.map((q) => q[0]), zs = ring.map((q) => q[1]);
    W.polyPlatforms.push({ rings: [ring], top, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) });
    if (top - bottom > 0.75) {
      const w = corners(0.65);
      for (let i = 0; i < 4; i++) {
        const a = w[i], b = w[(i + 1) % 4];
        W.colliders.push({ type: 'seg', ax: a.x, az: a.y, bx: b.x, bz: b.y, r: 0.1, top: top - 0.05, bottom });
      }
    }
    return m;
  }
  // a trial stone: a carved stele with a gem that turns green when its trial is solved
  function stele(u, v, y, faceU, faceV, { icon, title, sub }) {
    const c = P(u, v), f = P(faceU, faceV);
    const g = new THREE.Group();
    g.position.set(c.x, y, c.y);
    g.rotation.y = Math.atan2(f.x - c.x, f.y - c.y);
    const face = drawCanvas(512, 640, (x, w, h) => {
      const grad = x.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#e7c993');
      grad.addColorStop(1, '#c49a63');
      x.fillStyle = grad;
      x.fillRect(0, 0, w, h);
      x.strokeStyle = '#7c5a32';
      x.lineWidth = 10;
      x.strokeRect(22, 22, w - 44, h - 44);
      x.textAlign = 'center';
      x.font = `120px ${FONT}`;
      x.fillText(icon, w / 2, 200);
      x.fillStyle = '#3b2a17';
      x.font = `700 58px ${FONT}`;
      x.fillText(title, w / 2, 330);
      x.fillStyle = '#5b4126';
      x.font = `600 40px ${FONT}`;
      x.fillText(sub, w / 2, 400);
      x.font = `600 30px ${MONO}`;
      x.fillText('press E', w / 2, h - 70);
    });
    const faceMat = new THREE.MeshStandardMaterial({ map: face, roughness: 0.9 });
    g.add(mesh(new THREE.BoxGeometry(1.3, 1.9, 0.36), [stone, stone, stone, stone, faceMat, stone], 0, 0.95, 0));
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.2, 0.6), stoneDark, 0, 0.1, 0));
    const gem = mesh(new THREE.OctahedronGeometry(0.24, 0), glowMat(AMBER, 2.2), 0, 2.3, 0, false);
    g.add(gem);
    scene.add(g);
    circle(c.x, c.y, 0.5, y + 2, y);
    W.updaters.push((t) => (gem.rotation.y = t * 1.2));
    return { g, gem };
  }
  const tag = (text, sub, at, y, h = 0.42) => label(scene, text, { sub, accent: AMBER, height: h, x: at.x, y, z: at.y });

  // ------------------------------------------------------------ 1 · the stepped pyramid and its 32 mounds
  const PYR = { u: 7, v: -18 }, RING = 10.5;
  [[5.5, 1.2], [4.3, 2.4], [3.1, 3.6], [1.9, 4.8]].forEach(([half, top], i) => block(PYR.u, PYR.v, half, top, i % 2 ? stone : stoneDark, top - 1.2));
  const searchStone = stele(PYR.u + 0.8, PYR.v, 4.8, PYR.u - 5, PYR.v, { icon: '🔍', title: 'Stone of Search', sub: 'binary search' });
  const top = P(PYR.u, PYR.v);
  sites.search = { x: top.x, z: top.y, y: 4.8 };
  W.interactables.push({ id: 'desert:search', zone: 'desert', label: 'Read the Stone of Search 🔍', x: top.x, z: top.y, y: 4.8, r: 2.4, object: searchStone.g });
  tag('Stone of Search', 'binary search · jump up the tiers', top, 8.6);

  // the mounds, numbered around the pyramid; mound 1 starts by the seam that faces the bridge
  const seam = Math.atan2(0 - PYR.v, -16 - PYR.u);
  const moundGeo = new THREE.SphereGeometry(0.75, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  const moundMat = std('#dcb675'), outMat = std('#a88553');
  const mounds = [];
  for (let n = 1; n <= MOUNDS; n++) {
    const a = seam - (n - 0.5) * ((Math.PI * 2) / MOUNDS);
    const q = P(PYR.u + Math.cos(a) * RING, PYR.v + Math.sin(a) * RING);
    const m = mesh(moundGeo, moundMat, q.x, 0, q.y);
    m.scale.y = 0.6;
    scene.add(m);
    const plat = { x: q.x, z: q.y, r: 0.6, top: 0.4 };
    W.platforms.push(plat);
    const num = label(scene, String(n), { accent: AMBER, height: 0.34, x: q.x, y: 1.3, z: q.y });
    const it = { id: `desert:mound:${n}`, zone: 'desert', label: '', x: q.x, z: q.y, y: 0, r: 1.1, object: m };
    W.interactables.push(it);
    mounds.push({ n, m, plat, num, it, x: q.x, z: q.y, h: 0.6, flag: null });
  }
  const seamAt = P(PYR.u + Math.cos(seam) * (RING + 1.6), PYR.v + Math.sin(seam) * (RING + 1.6));
  scene.add(mesh(new THREE.BoxGeometry(0.4, 1.8, 0.4), stoneDark, seamAt.x, 0.9, seamAt.y));
  circle(seamAt.x, seamAt.y, 0.35, 1.8);
  label(scene, '32 numbered mounds', { sub: 'mound 1 is on your right', accent: AMBER, height: 0.34, x: seamAt.x, y: 2.5, z: seamAt.y });
  const digSign = makeLabel('⛏ dig here', { accent: '#4ade80', height: 0.36 });
  digSign.visible = false;
  scene.add(digSign);

  // the caravan's chest: buried until you find it
  const chest = new THREE.Group();
  const gold = std('#fbbf24', { metalness: 0.7, roughness: 0.3 });
  chest.add(mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), std('#8b5a2b'), 0, 0.25, 0));
  for (const x of [-0.3, 0.3]) chest.add(mesh(new THREE.BoxGeometry(0.08, 0.52, 0.62), gold, x, 0.25, 0));
  const lid = new THREE.Group();
  lid.position.set(0, 0.5, -0.3);
  lid.add(mesh(new THREE.BoxGeometry(0.92, 0.16, 0.62), std('#9a6634'), 0, 0.08, 0.31));
  chest.add(lid);
  const loot = mesh(new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glowMat('#fbbf24', 1.8), 0, 0.42, 0, false);
  chest.add(loot);
  chest.visible = false;
  scene.add(chest);
  const chestAnim = { y: -0.8, target: -0.8 };

  // ------------------------------------------------------------ 2 · Camel Rock: the balance scale
  const ROCK = { u: 26, v: -3, r: 4.4, top: 4.5 };
  const rc = P(ROCK.u, ROCK.v);
  const mesa = mesh(jitter(new THREE.CylinderGeometry(ROCK.r, ROCK.r + 0.6, ROCK.top, 14, 3), 0.4, rng, (x, y) => y > ROCK.top / 2 - 0.01), rockMat, rc.x, ROCK.top / 2, rc.y);
  scene.add(mesa);
  scene.add(mesh(new THREE.CylinderGeometry(ROCK.r - 0.15, ROCK.r - 0.15, 0.06, 28), std('#d9b27a'), rc.x, ROCK.top + 0.01, rc.y));
  W.platforms.push({ x: rc.x, z: rc.y, r: ROCK.r, top: ROCK.top });
  W.colliders.push({ type: 'circle', x: rc.x, z: rc.y, r: ROCK.r - 0.55, top: ROCK.top - 0.05, bottom: -99 });
  // stepping pillars up the side that faces the island centre
  [0.9, 1.8, 2.7, 3.6].forEach((h, i) => {
    const a = ((145 + i * 23) * Math.PI) / 180;
    const q = P(ROCK.u + Math.cos(a) * 6.3, ROCK.v + Math.sin(a) * 6.3);
    pillar(scene, W, { x: q.x, z: q.y, r: 0.85, top: h, mat: stone, sides: 8 });
  });
  const orderStone = stele(ROCK.u + 3.2, ROCK.v, ROCK.top, ROCK.u - 4, ROCK.v, { icon: '⚖️', title: 'Stone of Order', sub: 'sorting' });
  tag('Stone of Order', 'sorting · jump up the pillars', rc, 7.8);
  // the bench of crates (slot 1 on your left as you face the stone) and the balance scale
  const bench = P(ROCK.u + 1.7, ROCK.v);
  scene.add(mesh(new THREE.BoxGeometry(5.9, 0.3, 0.8), wood, bench.x, ROCK.top + 0.15, bench.y).rotateY(yawU));
  const slotAt = (k) => P(ROCK.u + 1.7, ROCK.v - 2.4 + k * 0.96);
  const crates = Object.fromEntries(CRATES.map((c) => {
    const tex = drawCanvas(128, 128, (x, w, h) => {
      x.fillStyle = '#9a6a3a';
      x.fillRect(0, 0, w, h);
      x.fillStyle = c.color;
      x.fillRect(0, 0, w, 26);
      x.fillRect(0, h - 26, w, 26);
      x.fillStyle = '#fff7e6';
      x.font = `800 64px ${MONO}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(c.id, w / 2, h / 2 + 2);
    });
    const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    const g = mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), [side, side, std('#8b5a2b'), std('#8b5a2b'), side, side], 0, 0, 0);
    g.rotation.y = yawU;
    scene.add(g);
    return [c.id, { g, at: new THREE.Vector3() }];
  }));
  const scaleBase = P(ROCK.u - 0.9, ROCK.v);
  const scaleG = new THREE.Group();
  scaleG.position.set(scaleBase.x, ROCK.top, scaleBase.y);
  scaleG.rotation.y = yawU;
  scaleG.add(mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.7, 8), std('#b08d57', { metalness: 0.5 }), 0, 0.85, 0));
  const pivot = new THREE.Group();
  pivot.position.y = 1.75;
  pivot.add(mesh(new THREE.BoxGeometry(2.3, 0.08, 0.1), gold, 0, 0, 0));
  scaleG.add(pivot);
  const pans = [1, -1].map((side) => {
    const pan = new THREE.Group();
    pan.add(mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.06, 16), gold, 0, 0, 0));
    for (const [dx, dz] of [[0.3, 0], [-0.15, 0.26], [-0.15, -0.26]]) pan.add(beam(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 0.75, 0), 0.012, gold));
    scaleG.add(pan);
    return { pan, side };
  });
  scene.add(scaleG);
  circle(scaleBase.x, scaleBase.y, 0.3, ROCK.top + 1.7, ROCK.top);
  const tilt = { now: 0, target: 0 };
  sites.order = { x: rc.x, z: rc.y, y: ROCK.top };
  const orderSpot = P(ROCK.u - 1.2, ROCK.v);
  W.interactables.push({ id: 'desert:order', zone: 'desert', label: 'Use the balance scale ⚖️', x: orderSpot.x, z: orderSpot.y, y: ROCK.top, r: 3.4, object: scaleG });
  // (clicking the stele opens the same panel; it never wins as "nearest", so E always means the scale)
  W.interactables.push({ id: 'desert:order', zone: 'desert', label: 'Read the Stone of Order ⚖️', x: orderStone.g.position.x, z: orderStone.g.position.z, y: ROCK.top, r: 0.1, object: orderStone.g });

  // ------------------------------------------------------------ 3 · the trail map, the watchtower, the oasis
  const GRID = { u: -6, v: 8 }, T = 2.4;
  const tileAt = (c, r) => P(GRID.u + (c + 0.5) * T, GRID.v + (r + 0.5) * T);
  const sandTiles = [], marks = {}, quick = [];
  const markMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(AMBER).multiplyScalar(1.4), transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -3 });
  const doneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#4ade80').multiplyScalar(1.3), transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -3 });
  const quickMat = waterMaterial({ deep: '#6b4a24', shallow: '#c39a5e', opacity: 0.96, scale: 1.6 });
  const markGeo = new THREE.PlaneGeometry(T - 0.7, T - 0.7).rotateX(-Math.PI / 2);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const q = tileAt(c, r), ch = MAP[r][c];
      if (ch === '#') {
        const b = mesh(jitter(new THREE.DodecahedronGeometry(0.95, 0), 0.3, rng), rockMat, q.x, 0.55, q.y);
        b.rotation.set(rng() * 3, rng() * 3, 0);
        scene.add(b);
        circle(q.x, q.y, 0.85, 1.3);
        W.platforms.push({ x: q.x, z: q.y, r: 0.6, top: 1.3 });
        continue;
      }
      sandTiles.push([q.x, q.y, (c + r) % 2, ch]);
      const mk = mesh(markGeo, markMat, q.x, 0.1, q.y, false);
      mk.rotation.y = yawU;
      mk.visible = false;
      scene.add(mk);
      marks[`${c},${r}`] = mk;
      if (ch === '~') {
        const qs = mesh(new THREE.PlaneGeometry(T - 0.14, T - 0.14).rotateX(-Math.PI / 2), quickMat, q.x, 0.075, q.y, false);
        qs.rotation.y = yawU;
        qs.visible = false;
        scene.add(qs);
        quick.push({ mesh: qs, x: q.x, z: q.y, lake: { x: q.x, z: q.y, r: T / 2 - 0.08, depth: -0.15 } });
      }
    }
  }
  instanced(scene, new THREE.BoxGeometry(T - 0.14, 0.06, T - 0.14), std('#ffffff'), sandTiles, ([x, z, k, ch]) => ({ x, y: 0.03, z, ry: yawU, s: 1, color: ch === '~' ? '#c7a067' : k ? '#e9cf9c' : '#dfc08a' }));
  const campTile = tileAt(...CAMP), oasisTile = tileAt(...OASIS);
  scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), wood, campTile.x - 0.6, 1.3, campTile.y));
  const pennant = mesh(new THREE.ConeGeometry(0.3, 0.9, 3), std(AMBER), campTile.x - 0.6, 2.35, campTile.y + 0.42);
  pennant.rotation.x = Math.PI / 2;
  scene.add(pennant);
  label(scene, '⛺ Camp', { sub: 'the trail starts here', accent: AMBER, height: 0.36, x: campTile.x, y: 3.3, z: campTile.y });
  label(scene, '🌴 Oasis', { sub: 'the trail ends here', accent: '#5eead4', height: 0.36, x: oasisTile.x, y: 3.3, z: oasisTile.y });

  // the oasis pond and its palms
  const pond = P(GRID.u + COLS * T + 4.2, GRID.v + 3.5 * T);
  const water = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40).rotateX(-Math.PI / 2), waterMaterial({ deep: '#0e7490', shallow: '#5eead4' }));
  water.position.set(pond.x, 0.07, pond.y);
  scene.add(water);
  W.lakes.push({ x: pond.x, z: pond.y, r: 3.9, depth: -0.6 });
  for (let i = 0; i < 6; i++) {
    const a = -1.9 + i * 0.76;
    const q = P(GRID.u + COLS * T + 4.2 + Math.cos(a) * 5.6, GRID.v + 3.5 * T + Math.sin(a) * 5.6);
    palm(scene, circle, q.x, q.y, rng);
  }

  // the watchtower: a spiral stair up to a deck with the map table (the Stone of Paths)
  const TW = { u: -11, v: 27 }, DECK = 7.7;
  const tw = P(TW.u, TW.v);
  scene.add(mesh(new THREE.CylinderGeometry(1.25, 1.55, DECK - 0.3, 12), std('#c9a06a'), tw.x, (DECK - 0.3) / 2, tw.y));
  W.colliders.push({ type: 'circle', x: tw.x, z: tw.y, r: 1.0, top: DECK - 0.35, bottom: -99 });
  slab(scene, W, { x: tw.x, z: tw.y, r: 2.4, top: DECK, thick: 0.35, mat: wood });
  const plank = new THREE.BoxGeometry(1.5, 0.22, 1.9);
  for (let k = 1; k <= 10; k++) {
    const a = -1.05 + k * 0.53;
    const q = P(TW.u + Math.cos(a) * 3.3, TW.v + Math.sin(a) * 3.3);
    const step = slab(scene, W, { x: q.x, z: q.y, r: 0.9, top: 0.7 * k, thick: 0.22, mat: wood, geo: plank, collide: false });
    step.rotation.y = Math.atan2(q.x - tw.x, q.y - tw.y); // planks point out from the tower
    const inner = P(TW.u + Math.cos(a) * 1.4, TW.v + Math.sin(a) * 1.4);
    scene.add(beam(new THREE.Vector3(inner.x, 0.7 * k - 0.2, inner.y), new THREE.Vector3(q.x, 0.7 * k - 0.2, q.y), 0.07, wood));
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), wood, tw.x + Math.cos(a) * 2.3, DECK + 0.45, tw.y + Math.sin(a) * 2.3));
  }
  scene.add(mesh(new THREE.TorusGeometry(2.3, 0.04, 4, 32).rotateX(Math.PI / 2), wood, tw.x, DECK + 0.88, tw.y, false));
  // the map table: the trail map, carved on top (and your trail, drawn as you mark it)
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = COLS * 48;
  mapCanvas.height = ROWS * 48;
  const mapTex = canvasTexture(mapCanvas);
  scene.add(mesh(new THREE.BoxGeometry(1.5, 0.9, 1.9), stoneDark, tw.x, DECK + 0.45, tw.y).rotateY(yawU));
  const mapTop = mesh(new THREE.PlaneGeometry(1.8, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: mapTex, toneMapped: false }), tw.x, DECK + 0.91, tw.y, false);
  mapTop.rotation.y = yawU - Math.PI / 2; // canvas right → away from Cloud Island, like the trail map
  scene.add(mapTop);
  circle(tw.x, tw.y, 0.7, DECK + 0.9, DECK);
  const gemPaths = mesh(new THREE.OctahedronGeometry(0.24, 0), glowMat(AMBER, 2.2), tw.x, DECK + 1.6, tw.y, false);
  scene.add(gemPaths);
  W.updaters.push((t) => (gemPaths.rotation.y = t * 1.2));
  sites.paths = { x: tw.x, z: tw.y, y: DECK };
  W.interactables.push({ id: 'desert:paths', zone: 'desert', label: 'Read the Stone of Paths: the trail map 🧭', x: tw.x, z: tw.y, y: DECK, r: 2.5, object: mapTop });
  tag('Stone of Paths', 'shortest paths · climb the stairs', tw, DECK + 3.4);

  // ------------------------------------------------------------ the caravan camp (the story starts here)
  const board = drawCanvas(768, 432, (c, w, h) => {
    c.fillStyle = '#2a1a0c';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = AMBER;
    c.lineWidth = 6;
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#fbbf24';
    c.font = `700 52px ${FONT}`;
    c.fillText('🐪 The Lost Caravan', 36, 86);
    c.fillStyle = '#fde9c4';
    c.font = `500 31px ${FONT}`;
    ['🔍 Stone of Search · on the pyramid', '⚖️ Stone of Order · on Camel Rock', '🧭 Stone of Paths · up the watchtower'].forEach((t, i) => c.fillText(t, 40, 168 + i * 60));
    c.fillStyle = '#fcd34d';
    c.font = `600 26px ${MONO}`;
    c.fillText('press E for the briefing', 40, h - 40);
  });
  const boardAt = P(-8.6, 10.4), arrive = P(-16, 0);
  const boardG = new THREE.Group();
  boardG.position.set(boardAt.x, 0, boardAt.y);
  boardG.rotation.y = Math.atan2(arrive.x - boardAt.x, arrive.y - boardAt.y);
  boardG.add(mesh(new THREE.PlaneGeometry(3.4, 1.91), new THREE.MeshBasicMaterial({ map: board, toneMapped: false, side: THREE.DoubleSide }), 0, 2.5, 0.06, false));
  for (const x of [-1.5, 1.5]) boardG.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.5, 6), wood, x, 1.75, 0));
  scene.add(boardG);
  circle(boardAt.x, boardAt.y, 0.5, 3.5);
  W.interactables.push({ id: 'desert:board', zone: 'desert', label: 'Read the caravan board 📜', x: boardAt.x, z: boardAt.y, y: 0, r: 2.6, object: boardG });
  const fabric = std('#ead7b0'), dark = std('#4a3220');
  for (const [u, v, s] of [[-13, 12.4, 1], [-14.4, 19.8, 0.85]]) {
    const q = P(u, v);
    const tent = mesh(new THREE.ConeGeometry(1.9 * s, 2.5 * s, 4), fabric, q.x, 1.25 * s, q.y);
    tent.rotation.y = yawU + Math.PI / 4;
    scene.add(tent);
    const door = P(u + 1.25 * s, v);
    const d = mesh(new THREE.ConeGeometry(0.55 * s, 1.3 * s, 3), dark, door.x, 0.65 * s, door.y);
    d.rotation.y = yawU;
    scene.add(d);
    circle(q.x, q.y, 1.3 * s, 2.5 * s);
  }
  const fire = P(-10.2, 16.4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    scene.add(mesh(new THREE.DodecahedronGeometry(0.17, 0), std('#78716c'), fire.x + Math.cos(a) * 0.55, 0.12, fire.y + Math.sin(a) * 0.55));
  }
  for (const a of [0.6, 2.2]) scene.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), wood, fire.x, 0.12, fire.y).rotateZ(Math.PI / 2).rotateY(a));
  const flame = mesh(new THREE.ConeGeometry(0.26, 0.7, 7), glowMat('#fb923c', 2.6), fire.x, 0.45, fire.y, false);
  scene.add(flame);
  W.updaters.push((t) => {
    flame.scale.y = 0.85 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.06;
    flame.material.emissiveIntensity = 2.3 + Math.sin(t * 13) * 0.4;
  });
  circle(fire.x, fire.y, 0.6, 0.6);
  // the overturned cart the storm left behind
  const cartAt = P(-16.4, 15.6);
  const cart = new THREE.Group();
  cart.position.set(cartAt.x, 0, cartAt.y);
  cart.rotation.y = yawU + 0.5;
  const body = mesh(new THREE.BoxGeometry(1.6, 0.7, 2.4), wood, 0, 0.62, 0);
  body.rotation.z = 0.32;
  cart.add(body);
  cart.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12), std('#5b3a24'), 0.95, 0.55, 0.6).rotateZ(Math.PI / 2));
  cart.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12), std('#5b3a24'), 1.6, 0.06, -1.3));
  scene.add(cart);
  circle(cartAt.x, cartAt.y, 1.3, 1.3);
  camel(scene, circle, P(-16.6, 11.2), yawU - 0.6, true);
  const thirsty = P(27, 21.5); // across the oasis, facing the water
  camel(scene, circle, thirsty, Math.atan2(pond.x - thirsty.x, pond.y - thirsty.y), false);

  // ------------------------------------------------------------ dunes you can run up, cacti, rocks
  const duneGeo = new THREE.SphereGeometry(1, 22, 9, 0, Math.PI * 2, 0, Math.PI / 2);
  const dunes = [[-27, -17, 5.5, 2.2], [-29, 12, 4.2, 1.7], [-6, -31, 4.6, 2], [31, -15, 4.2, 1.8], [32, 9, 4, 1.6], [7, 32, 4.4, 1.9], [14, -1, 3, 1.2]];
  for (const [u, v, R, H] of dunes) {
    const q = P(u, v);
    const d = mesh(duneGeo, sandMat, q.x, 0, q.y);
    d.scale.set(R, H, R);
    scene.add(d);
    // terraces a step apart, so you can walk up to the crest
    for (let k = 1; k <= 6; k++) {
      const h = (H * k) / 6.5;
      W.platforms.push({ x: q.x, z: q.y, r: R * Math.sqrt(1 - (h / H) ** 2), top: h });
    }
  }
  const busy = (x, z) => {
    const [u, v] = M.local(x, z);
    return (u < 5 && Math.abs(v) < 6) || Math.hypot(u - PYR.u, v - PYR.v) < RING + 2.5 || Math.hypot(u - ROCK.u, v - ROCK.v) < 8.5 ||
      (u > GRID.u - 2 && u < GRID.u + COLS * T + 12 && v > GRID.v - 2 && v < GRID.v + ROWS * T + 2) || (u > -19 && u < -5 && v > 7 && v < 24) ||
      Math.hypot(u - TW.u, v - TW.v) < 5.5 || dunes.some(([du, dv, R]) => Math.hypot(u - du, v - dv) < R + 1.2);
  };
  const cactusMat = std('#3f8f4a');
  for (let tries = 0, n = 0; tries < 600 && n < 16; tries++) {
    const a = rng() * Math.PI * 2, r = 6 + Math.sqrt(rng()) * (I.r - 9);
    const x = I.c[0] + Math.cos(a) * r, z = I.c[1] + Math.sin(a) * r, k = rng();
    if (busy(x, z)) continue;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const h = 1.6 + k * 1.6;
    g.add(mesh(new THREE.CapsuleGeometry(0.28, h, 4, 8), cactusMat, 0, h / 2 + 0.2, 0));
    g.add(mesh(new THREE.CapsuleGeometry(0.17, 0.7, 4, 8), cactusMat, 0.45, h * 0.6, 0));
    g.add(mesh(new THREE.CapsuleGeometry(0.17, 0.6, 4, 8), cactusMat, -0.42, h * 0.45, 0));
    g.rotation.y = k * 6;
    scene.add(g);
    circle(x, z, 0.35, 3);
    n++;
  }
  const pebbles = [];
  for (let tries = 0; tries < 300 && pebbles.length < 26; tries++) {
    const a = rng() * Math.PI * 2, r = 8 + Math.sqrt(rng()) * (I.r - 10);
    const x = I.c[0] + Math.cos(a) * r, z = I.c[1] + Math.sin(a) * r;
    if (!busy(x, z)) pebbles.push([x, z, rng()]);
  }
  instanced(scene, new THREE.DodecahedronGeometry(0.4, 0), std('#b98d5f'), pebbles, ([x, z, k]) => ({ x, y: 0.12, z, s: 0.5 + k * 0.9, rx: k * 5, ry: k * 9 }));

  // ------------------------------------------------------------ keeping the world in step with the save
  function syncMounds() {
    const ch = D.chest, [lo, hi] = range(ch.probes);
    for (const md of mounds) {
      const p = ch.probes.find((x) => x.n === md.n);
      const out = md.n < lo || md.n > hi;
      md.m.material = out ? outMat : moundMat;
      md.h = out ? 0.18 : 0.6;
      md.plat.top = out ? 0.1 : 0.4;
      md.num.material.opacity = out && !p ? 0.3 : 1;
      if (p && p.ans !== 'here' && !md.flag) {
        const f = new THREE.Group();
        f.position.set(md.x, 0, md.z);
        f.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), wood, 0.45, 0.7, 0));
        const lbl = makeLabel(p.ans === 'up' ? '▲ higher' : '▼ lower', { accent: p.ans === 'up' ? '#38bdf8' : '#fb7185', height: 0.3 });
        lbl.position.set(0, 2.0, 0);
        f.add(lbl);
        scene.add(f);
        md.flag = f;
      }
      if (!p && md.flag) {
        scene.remove(md.flag);
        md.flag.traverse((o) => o.isSprite && (o.material.map.dispose(), o.material.dispose()));
        md.flag = null;
      }
      md.it.label = !D.rod ? `Mound ${md.n} · the dowsing rod is on the pyramid`
        : ch.found ? (md.n === ch.found ? 'The caravan’s chest 💰' : `Mound ${md.n}`)
        : out ? `Mound ${md.n} · ruled out`
        : lo === hi ? `Dig up the chest at mound ${md.n} ⛏️`
        : `Probe mound ${md.n} 🔍 (${PROBES - ch.probes.length} left)`;
    }
    const last = !ch.found && lo === hi ? mounds[lo - 1] : null;
    digSign.visible = !!last;
    if (last) digSign.position.set(last.x, 2.35, last.z);
    const at = ch.found || (ch.failed ? ch.at : 0);
    chest.visible = !!at;
    if (at) {
      chest.position.set(mounds[at - 1].x, 0, mounds[at - 1].z);
      chest.rotation.y = yawU + Math.PI;
      chestAnim.target = 0.3;
    } else chestAnim.y = chestAnim.target = -0.8;
    lid.rotation.x = ch.found ? -1.9 : 0;
    loot.visible = !!ch.found;
  }
  W.updaters.push((t, dt) => {
    for (const md of mounds) md.m.scale.y = THREE.MathUtils.damp(md.m.scale.y, md.h, 5, dt);
    chestAnim.y = THREE.MathUtils.damp(chestAnim.y, chestAnim.target, 3, dt);
    chest.position.y = chestAnim.y + (D.chest.found ? Math.sin(t * 2) * 0.05 : 0);
  });

  // crates sit on the bench in slot order; the last pair weighed sits on the scale, heavier side down
  function syncCrates(snap = false) {
    const S = D.sort, on = S.last && !S.last.free ? S.last.k : -1;
    tilt.target = on < 0 ? 0 : S.last.heavy === S.order[on] ? -0.22 : 0.22;
    scaleG.updateMatrixWorld();
    S.order.forEach((id, k) => {
      const c = crates[id];
      if (k === on || k === on + 1) {
        const side = k === on ? 1 : -1; // the left crate goes in the left pan
        c.at.copy(scaleG.localToWorld(new THREE.Vector3(side * 1.05, 1.0 + side * Math.sin(tilt.target) * 1.05 + 0.34, 0)));
      } else {
        const q = slotAt(k);
        c.at.set(q.x, ROCK.top + 0.61, q.y);
      }
      if (snap) c.g.position.copy(c.at);
    });
  }
  W.updaters.push((t, dt) => {
    tilt.now = THREE.MathUtils.damp(tilt.now, tilt.target, 4, dt);
    pivot.rotation.z = tilt.now;
    for (const { pan, side } of pans) pan.position.set(side * 1.05, 1.0 + side * Math.sin(tilt.now) * 1.05, 0);
    for (const c of Object.values(crates)) c.g.position.lerp(c.at, 1 - Math.exp(-6 * dt));
  });

  function drawTable() {
    const x = mapCanvas.getContext('2d'), s = 48;
    const stage2 = !!D.bfs, route = D.trail.route;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = MAP[r][c];
        x.fillStyle = ch === '#' ? '#5b4630' : ch === '~' && stage2 ? '#8a6a3a' : (c + r) % 2 ? '#e9cf9c' : '#dfc08a';
        x.fillRect(c * s, r * s, s, s);
      }
    }
    x.fillStyle = D.dijkstra ? '#4ade80' : AMBER;
    for (const [c, r] of route) x.fillRect(c * s + 10, r * s + 10, s - 20, s - 20);
    x.font = `${s * 0.6}px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('⛺', (CAMP[0] + 0.5) * s, (CAMP[1] + 0.5) * s);
    x.fillText('🌴', (OASIS[0] + 0.5) * s, (OASIS[1] + 0.5) * s);
    mapTex.needsUpdate = true;
  }
  function syncTrail() {
    const on = new Set(D.trail.route.map(([c, r]) => `${c},${r}`));
    for (const [k, mk] of Object.entries(marks)) {
      mk.visible = on.has(k);
      mk.material = D.dijkstra ? doneMat : markMat;
    }
    for (const q of quick) {
      q.mesh.visible = !!D.bfs;
      const i = W.lakes.indexOf(q.lake);
      if (D.bfs && i < 0) W.lakes.push(q.lake);
    }
    drawTable();
  }
  function syncGems() {
    for (const [gem, ok] of [[searchStone.gem, D.search], [orderStone.gem, D.sorted], [gemPaths, D.dijkstra]]) gem.material.emissive.set(ok ? '#4ade80' : AMBER);
  }
  if (D.chest.failed) D.chest = newChest(); // left mid-reveal: the sands have already shifted
  syncMounds();
  syncCrates(true);
  syncTrail();
  syncGems();

  // ------------------------------------------------------------ panels (re-rendered in place, keeping your scroll)
  let shown = null;
  const panelOpen = (kind) => {
    const body = document.getElementById('panel-body');
    return !document.getElementById('panel').classList.contains('hidden') && !!body.querySelector(`[data-desert-panel="${kind}"]`);
  };
  function show(kind, o) {
    o.html = `<div data-desert-panel="${kind}">${o.html}</div>`;
    if (shown !== kind || !panelOpen(kind)) {
      shown = kind;
      kit.panel(o);
      return;
    }
    const body = document.getElementById('panel-body');
    const top = body.scrollTop, focus = document.activeElement?.closest?.('[data-desert]')?.dataset.desert;
    kit.UI.showRawPanel(o);
    body.scrollTop = top;
    if (focus) body.querySelector(`[data-desert="${focus}"]`)?.focus({ preventScroll: true });
  }
  const say = (text, good = true) => `<p class="why ${good ? '' : 'bad'}">${text}</p>`;

  // ------------------------------------------------------------ 1 · probing the mounds
  function probe(n) {
    const ch = D.chest;
    if (!D.rod) {
      sound.thud?.();
      kit.toast('The mound stays silent', 'Climb the stepped pyramid and read the Stone of Search: it gives you the dowsing rod.', '🔍');
      return;
    }
    if (ch.failed) return;
    if (ch.found) {
      kit.toast(ch.found === n ? 'The caravan’s chest is safe' : `Mound ${n}`, 'Want to search again? “Bury it again” at the Stone of Search.', '💰');
      return;
    }
    const [lo, hi] = range(ch.probes);
    if (n < lo || n > hi) {
      sound.thud?.();
      kit.toast(`Mound ${n} is ruled out`, `The chest is ${n < lo ? `higher than ${lo - 1}` : `lower than ${hi + 1}`}. Probe a mound from ${lo} to ${hi}. (No probe used.)`, '🔍');
      return;
    }
    if (lo === hi) return dig(n);
    const ans = n === ch.at ? 'here' : ch.at > n ? 'up' : 'down';
    ch.probes.push({ n, ans });
    kit.persist();
    syncMounds();
    if (ans === 'here') return dig(n);
    sound.dig?.();
    bursts.spawn(new THREE.Vector3(mounds[n - 1].x, 0.6, mounds[n - 1].z), '#e2bf83', 14, 2.5, { up: 2 });
    const [lo2, hi2] = range(ch.probes);
    const left = hi2 - lo2 + 1, used = ch.probes.length;
    kit.toast(`${ans === 'up' ? 'Higher' : 'Lower'} than ${n}`, left === 1 ? `Only mound ${lo2} is left: dig it up! (probe ${used} of ${PROBES})` : `Mounds ${lo2}–${hi2} are still possible (${left}) · probe ${used} of ${PROBES}`, ans === 'up' ? '▲' : '▼');
    // was it the middle? A middle probe leaves at most half of what was possible
    const size = hi - lo + 1, worst = Math.max(n - lo, hi - n), mid = Math.floor((lo + hi) / 2);
    if (worst > Math.floor(size / 2)) {
      setTimeout(() => kit.toast('Tip: probe the middle', `Mound ${n} could have left ${worst} of ${size} mounds. The middle (${mid}) leaves at most ${Math.floor(size / 2)}, whatever the answer.`, '💡'), 1200);
    }
    if (used >= PROBES && left > 1) {
      ch.failed = true;
      kit.persist();
      syncMounds();
      sound.thud?.();
      bursts.spawn(new THREE.Vector3(mounds[ch.at - 1].x, 1, mounds[ch.at - 1].z), '#fb7185', 24, 4, { up: 3 });
      setTimeout(() => kit.toast('Out of probes', `${left} mounds were still possible. The chest was under mound ${ch.at}. The sands shift and bury it again: probe the middle each time, and 5 probes are always enough.`, '⏳'), 2400);
      setTimeout(() => {
        if (D.chest !== ch) return; // already reburied from the stone
        D.chest = newChest();
        kit.persist();
        syncMounds();
      }, 5200);
    }
  }
  function dig(n) {
    const ch = D.chest, first = !D.search, used = ch.probes.length;
    ch.found = n;
    D.search = true;
    kit.persist();
    syncMounds();
    syncGems();
    sound.dig?.();
    setTimeout(() => sound.gem?.(), 350);
    bursts.spawn(new THREE.Vector3(mounds[n - 1].x, 0.8, mounds[n - 1].z), '#fbbf24', 30, 4, { up: 3.5 });
    if (first) kit.reward(40, player.pos.clone().setY(player.pos.y + 2.4), '💰 +40');
    kit.toast(`The caravan’s chest! Mound ${n}`, `Found with ${used} probe${used === 1 ? '' : 's'}. Each middle probe rules out at least half: 32 → 16 → 8 → 4 → 2 → 1.`, '💰');
    checkAll();
  }
  function openSearch() {
    if (!D.rod) {
      D.rod = true;
      kit.persist();
      syncMounds();
      kit.toast('You take the dowsing rod', 'Walk up to a mound and press E to probe it', '🔍');
    }
    const ch = D.chest, [lo, hi] = range(ch.probes), used = ch.probes.length;
    const cells = mounds.map(({ n }) => {
      const p = ch.probes.find((x) => x.n === n);
      const cls = ch.found === n ? 'here' : p ? p.ans : n < lo || n > hi ? 'out' : lo === hi ? 'last' : '';
      return `<span class="${cls}">${n}</span>`;
    }).join('');
    const status = ch.found ? `💰 Found under mound <b>${ch.found}</b> with <b>${used}</b> probe${used === 1 ? '' : 's'}.`
      : ch.failed ? `⏳ Out of probes: the chest was under mound <b>${ch.at}</b>. The sands are shifting…`
      : lo === hi ? `Only mound <b>${lo}</b> is left: dig it up (no probe needed).`
      : `Probes used: <b>${used} of ${PROBES}</b> · still possible: mounds <b>${lo}–${hi}</b> (${hi - lo + 1})`;
    show('search', {
      kicker: '🏜️ Desert Island · the Stone of Search', title: 'Find the buried chest', color: I.color,
      html: `<p class="lead">The caravan’s chest is buried under one of 32 numbered mounds around this pyramid. Walk to a mound and press E to probe it: the rod answers <b>▲ higher</b>, <b>▼ lower</b> or <b>⛏ here</b>. You have <b>5 probes</b>.</p>
        <p>${status}</p>
        <div class="bs-strip" aria-label="The 32 mounds">${cells}</div>
        <p class="muted">▲ / ▼ mark your probes; faded mounds are ruled out.</p>
        <div class="callout"><b>Why 5 probes are enough:</b> probe the middle of the mounds still possible. Whatever the rod says, at least half are ruled out: 32 → 16 → 8 → 4 → 2 → 1. That’s 5 halvings, because 2⁵ = 32 (log₂ 32 = 5). When one mound is left you know where the chest is, so digging there needs no probe.</div>
        <p class="muted">This is <b>binary search</b>. Checking the mounds one by one (1, 2, 3 …) is <b>linear search</b>, and it can take 31 probes.</p>
        <div class="pager"><button class="btn small" data-desert="bs:rebury">↺ ${ch.found ? 'Bury it again (practice)' : 'Start over'}</button></div>`,
    });
  }

  // ------------------------------------------------------------ 2 · the balance scale
  let sortNote = '';
  function weigh(k) {
    const S = D.sort, a = S.order[k], b = S.order[k + 1];
    const lt = proven(S.log);
    if (lt[a][b] || lt[b][a]) {
      const heavy = lt[a][b] ? b : a, light = heavy === a ? b : a;
      S.last = { k, heavy, free: true };
      sortNote = say(`You already know this: your weighings show <b>${heavy}</b> is heavier than <b>${light}</b>. ${heavy === a ? 'The heavier one is on the left, so swap them.' : 'They’re already in order.'} (No weighing used.)`);
    } else if (S.weighs >= MAX_WEIGHS) {
      sortNote = say(`No weighings left: ${MAX_WEIGHS} is all bubble sort ever needs for 6 crates. Finish with swaps, or start over with new crates.`, false);
      sound.thud?.();
      return renderOrder();
    } else {
      S.weighs++;
      const heavy = S.w[a] > S.w[b] ? a : b, light = heavy === a ? b : a;
      S.log.push([light, heavy]);
      S.last = { k, heavy };
      sortNote = say(`⚖️ <b>${heavy}</b> is heavier than <b>${light}</b>. ${heavy === a ? 'The heavier one is on the left: swap them.' : 'Lighter on the left: they’re in order.'}`);
    }
    sound.click?.();
    kit.persist();
    syncCrates();
    renderOrder();
  }
  function swapPair(k) {
    const S = D.sort, a = S.order[k], b = S.order[k + 1];
    const lt = proven(S.log);
    S.order[k] = b;
    S.order[k + 1] = a;
    S.swaps++;
    S.last = null;
    sortNote = lt[a][b] ? say(`Careful: your weighings show <b>${a}</b> is lighter than <b>${b}</b>, so they were already in order. Swap them back?`, false) : say(`⇄ Swapped <b>${a}</b> and <b>${b}</b>.`);
    sound.swish?.();
    kit.persist();
    syncCrates();
    renderOrder();
  }
  function loadCamels() {
    const S = D.sort;
    if (inversions(S.order, S.w) === 0) {
      const first = !D.sorted;
      D.sorted = S.loaded = true;
      kit.persist();
      syncGems();
      sound.collect?.();
      bursts.spawn(new THREE.Vector3(bench.x, ROCK.top + 1.5, bench.y), '#fbbf24', 30, 4, { up: 3 });
      if (first) kit.reward(40, player.pos.clone().setY(player.pos.y + 2.4), '⚖️ +40');
      sortNote = say(`✔ Lightest to heaviest: ${S.order.map((id) => `<b>${id}</b> ${S.w[id]} kg`).join(' · ')}. Sorted with <b>${S.weighs}</b> weighing${S.weighs === 1 ? '' : 's'} (bubble sort never needs more than ${MAX_WEIGHS} for 6 crates).`);
      renderOrder();
      checkAll();
      return;
    }
    const lt = proven(S.log);
    const bad = S.order.findIndex((id, k) => k < S.order.length - 1 && lt[S.order[k + 1]][id]);
    sound.thud?.();
    sortNote = bad >= 0
      ? say(`The camels won’t go yet: your weighings show <b>${S.order[bad]}</b> (slot ${bad + 1}) is heavier than <b>${S.order[bad + 1]}</b> (slot ${bad + 2}), but it’s on the left.`, false)
      : say('The camels won’t go yet: the crates aren’t in order, and your weighings can’t show where. Weigh the neighbours you haven’t compared.', false);
    renderOrder();
  }
  function renderOrder() {
    const S = D.sort, last = S.last, off = S.loaded ? 'disabled' : '';
    const crateHTML = S.order.map((id, k) => `<div class="crate" style="--c:${COLOR[id]};grid-column:${k + 1}"><b>${id}</b><small>slot ${k + 1}</small></div>`).join('');
    const pairs = S.order.slice(0, -1).map((id, k) => {
      const hot = last?.k === k && last.heavy === id;
      return `<button class="btn small pair" style="grid-column:${k + 1} / span 2" data-desert="sort:weigh:${k}" title="Weigh slots ${k + 1} and ${k + 2}" aria-label="Weigh slots ${k + 1} and ${k + 2}" ${off}>⚖️</button>
        <button class="btn small pair swap ${hot ? 'hot' : ''}" style="grid-column:${k + 1} / span 2" data-desert="sort:swap:${k}" title="Swap slots ${k + 1} and ${k + 2}" aria-label="Swap slots ${k + 1} and ${k + 2}" ${off}>⇄</button>`;
    }).join('');
    const facts = S.log.map(([a, b]) => `<span class="chip" style="--c:${COLOR[a]}">${a} &lt; ${b}</span>`).join('');
    let scale = '';
    if (last) {
      const a = S.order[last.k], b = S.order[last.k + 1], deg = last.heavy === a ? -12 : 12;
      scale = `<div class="scale-view" aria-hidden="true"><div class="beam" style="transform:rotate(${deg}deg)"><span style="--c:${COLOR[a]}">${a}</span><span style="--c:${COLOR[b]}">${b}</span></div></div>`;
    }
    show('order', {
      kicker: '🏜️ Desert Island · the Stone of Order', title: 'Sort the camel crates', color: I.color,
      html: `<p class="lead">Load the camels lightest → heaviest, left to right. The crates look alike: only the balance scale tells you which of two neighbours is heavier.</p>
        <div class="crates">${crateHTML}${pairs}</div>
        <p class="muted">⚖️ weighs the two crates above it · ⇄ swaps them</p>
        ${scale}${sortNote}
        <p>Weighings: <b>${S.weighs} of ${MAX_WEIGHS}</b> · swaps: <b>${S.swaps}</b></p>
        ${facts ? `<div class="chips" aria-label="What your weighings show">${facts}</div>` : ''}
        <div class="pager"><button class="btn small" data-desert="sort:new">↺ New crates</button>${S.loaded ? '' : '<button class="btn primary" data-desert="sort:load">🐪 Load the camels</button>'}</div>
        <h3>Bubble sort: a simple method</h3>
        <ol class="bullets"><li>Weigh slots 1–2. If the left crate is heavier, swap them.</li><li>Move one step right (2–3, 3–4 …) to the end. The heaviest crate has now “bubbled” to slot 6.</li><li>Repeat for slots 1–5, then 1–4, and so on. That’s at most 5 + 4 + 3 + 2 + 1 = <b>15</b> weighings.</li></ol>
        <p class="muted">If your weighings already prove which crate is heavier, you don’t need the scale again: that’s free.</p>
        ${D.sorted ? '<div class="callout done-callout">✔ Stone of Order: complete.</div>' : ''}`,
    });
  }

  // ------------------------------------------------------------ 3 · the trail map
  let trailNote = '', showNums = false;
  const stage = () => (D.bfs ? 2 : 1);
  function tap(c, r) {
    if (D.dijkstra) return;
    const route = D.trail.route, [ec, er] = route[route.length - 1];
    const i = route.findIndex(([x, y]) => x === c && y === r);
    trailNote = '';
    if (i >= 0) {
      // tap the end to step back; tap an earlier tile to cut the trail back to it
      route.length = i === route.length - 1 ? Math.max(1, i) : i + 1;
      sound.click?.();
    } else if (MAP[r][c] === '#') {
      trailNote = say('Rocks block the way.', false);
      sound.thud?.();
    } else if (ec === OASIS[0] && er === OASIS[1]) {
      trailNote = say('Your trail already reaches the oasis. Tap a trail tile to cut it back.', false);
    } else {
      // a straight run from the trail's end (handy on phones); otherwise one tile at a time
      const line = [];
      const dc = Math.sign(c - ec), dr = Math.sign(r - er);
      if (!dc || !dr) {
        for (let x = ec + dc, y = er + dr; ; x += dc, y += dr) {
          if (blocked(x, y) || route.some(([a, b]) => a === x && b === y) || (x === OASIS[0] && y === OASIS[1] && (x !== c || y !== r))) { line.length = 0; break; }
          line.push([x, y]);
          if (x === c && y === r) break;
        }
      }
      if (!line.length) {
        trailNote = say(dc && dr
          ? 'The trail moves up, down, left or right from its end (the outlined tile), never diagonally.'
          : 'A rock or your own trail is in the way. Go round it, one row or column at a time.', false);
        sound.thud?.();
      } else {
        route.push(...line);
        sound.click?.();
      }
    }
    kit.persist();
    syncTrail();
    const [lc, lr] = route[route.length - 1];
    if (lc === OASIS[0] && lr === OASIS[1]) checkTrail();
    else openPaths();
  }
  function checkTrail() {
    const route = D.trail.route, steps = route.length - 1;
    if (!isTrail(route)) {
      D.trail = { route: [CAMP], tries: D.trail.tries };
      trailNote = say('That trail wasn’t valid, so it has been cleared. Start again from the camp.', false);
      return openPaths();
    }
    if (stage() === 1) {
      const best = bfs()[OASIS[1]][OASIS[0]];
      if (steps === best) {
        D.bfs = true;
        D.trailBFS = route.map((x) => [...x]);
        D.trail = { route: [CAMP], tries: 0 };
        showNums = false;
        kit.persist();
        syncTrail();
        sound.collect?.();
        kit.reward(30, player.pos.clone().setY(player.pos.y + 2.4), '🧭 +30');
        trailNote = say(`✔ ${steps} steps: a shortest trail. BFS agrees: exploring ring by ring from the camp, it first reaches the oasis in ring ${best}.`) +
          say('💧 But spring water has risen under the old trail and turned it to quicksand. Round two below.', true);
        setTimeout(() => kit.toast('The old trail turns to quicksand', 'Walk on it: it halves your speed. That’s why each quicksand tile costs 2.', '⏳'), 600);
      } else {
        D.trail.tries++;
        sound.thud?.();
        trailNote = say(`Your trail takes <b>${steps}</b> steps, but the shortest takes <b>${best}</b>. Cut it back and look for a way that doesn’t wander, or tap “Show the BFS rings” to see how BFS counts.`, false);
      }
    } else {
      const best = dijkstra()[OASIS[1]][OASIS[0]], cost = routeCost(route, true), qs = quickOn(route);
      if (cost === best) {
        D.dijkstra = true;
        kit.persist();
        syncTrail();
        syncGems();
        sound.collect?.();
        kit.reward(30, player.pos.clone().setY(player.pos.y + 2.4), '🧭 +30');
        const old = D.trailBFS ? routeCost(D.trailBFS, true) : null;
        trailNote = say(`✔ Cost ${cost} in ${steps} steps: the quickest trail, and Dijkstra’s algorithm agrees.${old ? ` Your old ${D.trailBFS.length - 1}-step trail would now cost ${old}: fewer steps isn’t always quicker.` : ''}`);
        checkAll();
      } else {
        D.trail.tries++;
        sound.thud?.();
        trailNote = say(`Your trail costs <b>${cost}</b> (${steps} steps${qs ? `, ${qs} of them quicksand` : ''}), but the quickest costs <b>${best}</b>. ${qs ? 'Each quicksand tile costs 2: is there a way round on firm sand?' : 'Look for fewer steps on firm sand.'} You can also tap “Show Dijkstra’s costs”.`, false);
      }
    }
    openPaths();
  }
  function openPaths() {
    const s = stage(), done = s === 2 && D.dijkstra;
    const route = D.trail.route, end = route[route.length - 1];
    const onRoute = new Map(route.map(([c, r], i) => [r * COLS + c, i]));
    const ghost = s === 2 && D.trailBFS ? new Set(D.trailBFS.map(([c, r]) => r * COLS + c)) : null;
    const nums = showNums || done ? (s === 1 ? bfs() : dijkstra()) : null;
    let cells = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = MAP[r][c], i = onRoute.get(r * COLS + c);
        const kind = ch === '#' ? 'rock' : ch === '~' && s === 2 ? 'quick' : 'sand';
        const cls = [kind, ch === 'S' && 'camp', ch === 'O' && 'oasis', i !== undefined && 'on', end[0] === c && end[1] === r && 'end', ghost?.has(r * COLS + c) && 'ghost'].filter(Boolean).join(' ');
        const txt = ch === 'S' ? '⛺' : ch === 'O' ? '🌴' : ch === '#' ? '' : nums ? (nums[r][c] < Infinity ? nums[r][c] : '') : i !== undefined ? i : '';
        const name = ch === 'S' ? 'the camp' : ch === 'O' ? 'the oasis' : ch === '#' ? 'rock' : kind === 'quick' ? 'quicksand' : 'sand';
        cells += `<button class="${cls}" data-desert="trail:${c}:${r}" aria-label="Row ${r + 1}, column ${c + 1}: ${name}${i ? `, trail step ${i}` : ''}" ${done ? 'disabled' : ''}>${txt}</button>`;
      }
    }
    const steps = route.length - 1, cost = routeCost(route, s === 2);
    const lead = s === 1
      ? 'Mark the caravan’s trail from the camp ⛺ to the oasis 🌴 in the <b>fewest steps</b>. Tap tiles to extend it (up, down, left or right); tap a trail tile to cut the trail back.'
      : 'Spring water has turned the old trail to <b>quicksand</b>. It halves your speed (walk on it and see), so a quicksand tile costs <b>2</b> and firm sand costs 1. Mark the <b>quickest</b> trail: the lowest total cost.';
    const howto = s === 1
      ? '<b>Breadth-first search (BFS)</b> explores in rings: first every tile 1 step from the camp, then every tile 2 steps away, and so on. The first ring that reaches the oasis gives the fewest steps; stepping back through the rings (12, 11, 10 …) traces a shortest trail.'
      : 'When steps cost different amounts, counting steps isn’t enough. <b>Dijkstra’s algorithm</b> always settles the cheapest tile reached so far, then updates its neighbours. Its numbers are the cheapest cost from the camp to each tile.';
    show('paths', {
      kicker: `🏜️ Desert Island · the Stone of Paths · round ${s} of 2`, title: s === 1 ? 'The shortest trail' : 'The quickest trail', color: I.color,
      html: `<p class="lead">${lead}</p>
        <div class="trail-map ${done ? 'done' : ''}" role="group" aria-label="Trail map, ${COLS} by ${ROWS} tiles">${cells}</div>
        <p class="trail-legend muted">⛺ camp · 🌴 oasis · dark tiles are rocks${s === 2 ? ' · rippled tiles are quicksand · blue outline: your round-1 trail' : ''}</p>
        <p>Steps: <b>${steps}</b>${s === 2 ? ` · cost: <b>${cost}</b>` : ''}</p>
        ${trailNote}
        <div class="pager"><button class="btn small" data-desert="trail:undo" ${done || steps === 0 ? 'disabled' : ''}>↶ Step back</button><button class="btn small" data-desert="trail:clear" ${done || steps === 0 ? 'disabled' : ''}>Clear</button>${D.trail.tries && !done ? `<button class="btn small" data-desert="trail:nums">${showNums ? 'Hide the numbers' : s === 1 ? 'Show the BFS rings' : 'Show Dijkstra’s costs'}</button>` : ''}</div>
        <div class="callout">${howto}</div>
        ${done ? '<div class="callout done-callout">✔ Both trails found: the shortest by steps (BFS) and the quickest by cost (Dijkstra).</div>' : ''}`,
    });
  }

  // ------------------------------------------------------------ all three stones
  function checkAll() {
    if (kit.isSolved() || !(D.search && D.sorted && D.bfs && D.dijkstra)) return;
    sound.achieve?.();
    kit.solve();
    kit.fireworks?.(10, 8);
    setTimeout(() => {
      if (!kit.UI.isOverlayOpen() || ['search', 'order', 'paths'].some(panelOpen)) debrief();
    }, 3600);
  }
  function debrief() {
    show('debrief', {
      kicker: '🏜️ The Lost Caravan · complete', title: 'Three algorithms, one caravan', color: I.color,
      html: `<p class="lead">The caravan is on its way and the road bridge home is open. Here is what each stone taught, in computer-science words:</p>
        <div class="parts three">
          <div><b>🔍 Binary search</b><small>Each probe in the middle ruled out at least half of what was possible: 32 → 16 → 8 → 4 → 2 → 1, so 5 probes always do (log₂ 32 = 5). A million sorted items need only about 20.</small></div>
          <div><b>⚖️ Sorting</b><small>You sorted using only comparisons, like a computer. Bubble sort needs up to n(n−1)/2 of them: 15 for 6 crates, 499,500 for 1,000. Merge sort needs fewer than 10,000 for 1,000.</small></div>
          <div><b>🧭 Shortest paths</b><small>BFS finds the fewest steps by exploring ring by ring. When steps cost different amounts, like quicksand, Dijkstra’s algorithm finds the cheapest route.</small></div>
        </div>
        <p><b>They work together:</b> binary search only works on sorted data, which is one reason sorting matters so much.</p>
        <p class="muted">Route planners in map apps build on Dijkstra’s algorithm, with speed-ups such as A* search.</p>`,
    });
  }

  // ------------------------------------------------------------ every frame
  function update() {
    // the first time you wade into the quicksand, say why it costs more
    if (D.bfs && !D.felt && player.surface === 'water' && quick.some((q) => Math.hypot(player.pos.x - q.x, player.pos.z - q.z) < T / 2)) {
      D.felt = true;
      kit.persist();
      kit.toast('Quicksand!', 'It halves your speed: that’s why each quicksand tile costs 2 on the trail map.', '⏳');
    }
  }

  return {
    trial: true,
    title: 'The Lost Caravan',
    mission: `<p>A sandstorm scattered the caravan, and the road bridge home stays sealed until its three trial stones are satisfied. Each one teaches an algorithm:</p>
      <ol><li>🔍 <b>Stone of Search</b>, on top of the stepped pyramid: find the buried chest under one of 32 mounds in at most 5 probes.</li>
      <li>⚖️ <b>Stone of Order</b>, on Camel Rock: sort 6 crates by weight using a balance scale.</li>
      <li>🧭 <b>Stone of Paths</b>, up the watchtower: mark the shortest trail to the oasis, then the quickest one past the quicksand.</li></ol>`,
    hints: [
      'The stones are up high: the Stone of Search on top of the stepped pyramid (jump up its tiers), the Stone of Order on Camel Rock (jump up the pillars) and the Stone of Paths on the watchtower by the camp (walk up its stairs).',
      'Chest: always probe the middle of the mounds still possible (16 first). Crates: bubble sort. Weigh slots 1–2 and swap if the left one is heavier, then 2–3, 3–4 … to the end; repeat until a whole pass needs no swap.',
      'Trail: the fewest steps run straight along the old trail from the camp, then down and round the rocks (12 steps). Once it’s quicksand, go up one row first and stay on firm sand: 14 steps, but it costs 14 instead of 16.',
    ],
    quest: () => [
      { text: '🔍 Find the chest in ≤ 5 probes', done: !!D.search },
      { text: '⚖️ Sort the 6 camel crates', done: !!D.sorted },
      { text: '🧭 Shortest trail to the oasis (BFS)', done: !!D.bfs },
      { text: '🧭 Quickest trail past quicksand (Dijkstra)', done: !!D.dijkstra },
    ],
    update,
    interact(id) {
      const [, kind, arg] = id.split(':');
      if (kind === 'board') return kit.openBriefing(), true;
      if (kind === 'search') return openSearch(), true;
      if (kind === 'mound') return probe(+arg), true;
      if (kind === 'order') {
        sortNote = '';
        return renderOrder(), true;
      }
      if (kind === 'paths') {
        trailNote = '';
        return openPaths(), true;
      }
      return false;
    },
    handleClick(target) {
      const b = target.closest('[data-desert]');
      if (!b) return false;
      const [kind, a, c] = b.dataset.desert.split(':');
      if (kind === 'bs') {
        D.chest = newChest();
        kit.persist();
        syncMounds();
        sound.whoosh?.();
        openSearch();
      } else if (kind === 'sort') {
        if (a === 'weigh') weigh(+c);
        else if (a === 'swap') swapPair(+c);
        else if (a === 'load') loadCamels();
        else if (a === 'new') {
          const solved = D.sorted;
          D.sort = newCrates();
          sortNote = solved ? say('New crates to practise on. Your trial is already complete.') : '';
          kit.persist();
          syncCrates();
          sound.whoosh?.();
          renderOrder();
        }
      } else if (kind === 'trail') {
        if (a === 'undo' || a === 'clear') {
          const route = D.trail.route;
          route.length = a === 'undo' ? Math.max(1, route.length - 1) : 1;
          trailNote = '';
          kit.persist();
          syncTrail();
          sound.click?.();
          openPaths();
        } else if (a === 'nums') {
          showNums = !showNums;
          openPaths();
        } else tap(+a, +c);
      }
      return true;
    },
    // for tests and the debug console
    debug: { M, sites, mounds, MAP, CAMP, OASIS, bfs, dijkstra, range, probe, dig, weigh, swapPair, loadCamels, tap, checkTrail, debrief },
  };
}

// ---------------------------------------------------------------- a low-poly camel (head toward +z)

function camel(scene, circle, at, yaw, sitting) {
  const g = new THREE.Group();
  g.position.set(at.x, 0, at.y);
  g.rotation.y = yaw;
  const fur = std('#c9955c'), hoof = std('#6b4423');
  const y = sitting ? 0.55 : 1.45;
  g.add(mesh(new THREE.CapsuleGeometry(0.5, 1.2, 4, 10), fur, 0, y, 0).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.SphereGeometry(0.48, 10, 8), fur, 0, y + 0.42, -0.1));
  g.add(beam(new THREE.Vector3(0, y + 0.1, 0.8), new THREE.Vector3(0, y + 0.95, 1.35), 0.17, fur));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 0.62), fur, 0, y + 1.05, 1.55));
  g.add(beam(new THREE.Vector3(0, y + 0.1, -0.95), new THREE.Vector3(0, y - 0.5, -1.15), 0.05, hoof));
  if (sitting) for (const s of [-1, 1]) g.add(mesh(new THREE.CapsuleGeometry(0.14, 1.3, 4, 6), fur, s * 0.45, 0.16, 0.1).rotateX(Math.PI / 2));
  else for (const [lx, lz] of [[0.25, 0.6], [-0.25, 0.6], [0.25, -0.6], [-0.25, -0.6]]) g.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, y, 6), hoof, lx, y / 2, lz));
  scene.add(g);
  for (const k of [-0.6, 0.7]) circle(at.x + Math.sin(yaw) * k, at.y + Math.cos(yaw) * k, 0.6, y + 0.9);
}
