// Forest Island: the Data Grove, a machine-learning field trip. Collect labelled mushroom
// specimens (some high up), grow a decision tree at the Learning Stump, and pass the forest test
// on mushrooms the model has never seen. Passing it opens the root bridge home.
// The mushrooms and their rule are invented for this lesson.
import * as THREE from 'three';
import { drawCanvas, esc, FONT, MONO } from '../utils.js';
import { std, glowMat, mesh, jitter, waterMaterial } from '../helpers.js';
import { frame, forestTrees, fireflies, instanced, slab, pillar, bouncePad, label } from './kit.js';

// features of a mushroom (yes/no) and the field label: poisonous or edible
const FEATURES = [
  { k: 'ring', q: 'Ring?', long: 'a ring (skirt) on its stem' },
  { k: 'spots', q: 'Spots?', long: 'spots on its cap' },
  { k: 'glow', q: 'Glows?', long: 'a glow in the dark' },
  { k: 'red', q: 'Red cap?', long: 'a red cap' },
];
const F = Object.fromEntries(FEATURES.map((f) => [f.k, f]));
// The hidden rule is: poisonous = (ring AND spots) OR (no ring AND glows).
// The five specimens by the path all fit "red cap = poisonous", which fails on everything else.
const SPECIMENS = [
  { id: 1, red: 1, spots: 1, ring: 1, glow: 0, poison: 1, cap: 'red' },
  { id: 2, red: 1, spots: 0, ring: 0, glow: 1, poison: 1, cap: 'red' },
  { id: 3, red: 0, spots: 0, ring: 1, glow: 0, poison: 0, cap: 'brown' },
  { id: 4, red: 0, spots: 0, ring: 0, glow: 0, poison: 0, cap: 'white' },
  { id: 5, red: 1, spots: 1, ring: 1, glow: 1, poison: 1, cap: 'red' },
  { id: 6, red: 1, spots: 0, ring: 1, glow: 1, poison: 0, cap: 'red' },
  { id: 7, red: 0, spots: 1, ring: 1, glow: 0, poison: 1, cap: 'brown' },
  { id: 8, red: 0, spots: 1, ring: 0, glow: 1, poison: 1, cap: 'white' },
  { id: 9, red: 1, spots: 1, ring: 0, glow: 0, poison: 0, cap: 'red' },
  { id: 10, red: 0, spots: 0, ring: 0, glow: 1, poison: 1, cap: 'brown' },
];
// the forest test: six mushrooms the model has never seen
const TESTS = [
  { red: 1, spots: 0, ring: 1, glow: 0, poison: 0, cap: 'red' },
  { red: 0, spots: 1, ring: 1, glow: 1, poison: 1, cap: 'white' },
  { red: 1, spots: 1, ring: 0, glow: 1, poison: 1, cap: 'red' },
  { red: 0, spots: 0, ring: 1, glow: 1, poison: 0, cap: 'brown' },
  { red: 1, spots: 0, ring: 0, glow: 0, poison: 0, cap: 'red' },
  { red: 0, spots: 1, ring: 0, glow: 0, poison: 0, cap: 'white' },
];
const CAP = { red: '#dc2626', brown: '#8a5a2b', white: '#f1ede4' };

// ---------------------------------------------------------------- the decision tree

// node: { q: feature key | null, yes: node, no: node }; a node without q is a leaf
const leaf = () => ({ q: null });
const describe = (s) => `${s.red ? 'red' : s.cap} cap · ${s.spots ? 'spots' : 'no spots'} · ${s.ring ? 'ring' : 'no ring'} · ${s.glow ? 'glows' : 'no glow'}`;
function route(node, s) {
  return node.q ? route(s[node.q] ? node.yes : node.no, s) : node;
}
// each leaf predicts the majority label of the training specimens that reach it
function leafStats(tree, data) {
  const stats = new Map();
  const walk = (n) => (n.q ? (walk(n.yes), walk(n.no)) : stats.set(n, { p: 0, e: 0 }));
  walk(tree);
  for (const s of data) {
    const st = stats.get(route(tree, s));
    s.poison ? st.p++ : st.e++;
  }
  for (const st of stats.values()) st.predict = st.p > st.e ? 1 : st.e > st.p ? 0 : null;
  return stats;
}
function predict(tree, stats, s) {
  return stats.get(route(tree, s)).predict;
}

// ---------------------------------------------------------------- build

export default function build(kit) {
  const { scene, W, I, circle, rng, player, sound, bursts } = kit;
  const M = frame(I);
  const { P } = M;
  const D = kit.data();
  D.collected ||= [];
  D.tree ||= leaf();
  D.best ||= 0;

  const wood = std('#7c4a2d'), bark = std('#5b3a24'), moss = std('#4d7c3a'), rock = std('#7c7a76');
  const labels = [];
  const tag = (text, sub, accent, at, y, h = 0.38) => labels.push(label(scene, text, { sub, accent, height: h, x: at.x, y, z: at.y }));

  // ------------------------------------------------------------ the Learning Stump (lab)
  const lab = P(-6, 7);
  scene.add(mesh(new THREE.CylinderGeometry(2.3, 2.6, 1.1, 14), bark, lab.x, 0.55, lab.y));
  scene.add(mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.04, 28), std('#c8a26a'), lab.x, 1.12, lab.y, false));
  for (let i = 1; i < 5; i++) scene.add(mesh(new THREE.TorusGeometry(i * 0.45, 0.02, 4, 32).rotateX(Math.PI / 2), std('#8b6a3e'), lab.x, 1.15, lab.y, false));
  circle(lab.x, lab.y, 2.4, 1.1);
  const board = drawCanvas(768, 432, (c, w, h) => {
    c.fillStyle = '#062014';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#4ade80';
    c.lineWidth = 6;
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#4ade80';
    c.font = `700 52px ${FONT}`;
    c.fillText('🍄 Learning Stump', 36, 86);
    c.fillStyle = '#d1fae5';
    c.font = `500 32px ${FONT}`;
    ['1 · Collect labelled specimens', '2 · Grow a decision tree', '3 · Pass the forest test'].forEach((t, i) => c.fillText(t, 40, 170 + i * 62));
    c.fillStyle = '#86efac';
    c.font = `600 26px ${MONO}`;
    c.fillText('press E at the stump', 40, h - 40);
  });
  const boardMesh = mesh(new THREE.PlaneGeometry(3.6, 2.03), new THREE.MeshBasicMaterial({ map: board, toneMapped: false, side: THREE.DoubleSide }), 0, 0, 0, false);
  const boardPos = P(-6, 10.2);
  boardMesh.position.set(boardPos.x, 2.7, boardPos.y);
  boardMesh.rotation.y = M.yawU + Math.PI / 2; // faces the path from the bridge
  scene.add(boardMesh);
  for (const k of [-1.6, 1.6]) {
    const q = P(-6 + k, 10.25);
    scene.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.8, 6), wood, q.x, 1.9, q.y));
  }
  // six glass jars: the forest test (they light up when you run it)
  const jars = TESTS.map((s, i) => {
    const q = P(-11.5 + i * 1.1, 2.6);
    const g = new THREE.Group();
    g.position.set(q.x, 0, q.y);
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), wood, 0, 0.06, 0));
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.25, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    glass.position.y = 0.68;
    g.add(glass);
    const shroom = mushroom(s, 0.55);
    shroom.position.y = 0.12;
    g.add(shroom);
    const lid = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 12), new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#94a3b8'), emissiveIntensity: 0.3 }), 0, 1.27, 0, false);
    g.add(lid);
    scene.add(g);
    circle(q.x, q.y, 0.45, 1.3);
    return { g, lid };
  });
  tag('🧪 The forest test', '6 mushrooms the model has never seen', '#4ade80', P(-8.75, 2.6), 2.4, 0.32);
  const lightJars = (ok) => jars.forEach((j, i) => {
    j.lid.material.emissive.set(ok[i] ? '#22c55e' : '#ef4444');
    j.lid.material.emissiveIntensity = 2.4;
  });
  if (kit.isSolved()) lightJars(TESTS.map(() => true));
  W.interactables.push({ id: 'forest:lab', zone: 'forest', label: 'Open the Learning Stump 🌳', x: lab.x, z: lab.y, y: 0, r: 3.4, object: boardMesh });

  // ------------------------------------------------------------ places to explore (and climb)
  const spots = {};
  // easy: five specimens along the path from the bridge
  [[-28, 5], [-24, -6], [-14, 11], [-13, -8], [-1, -3]].forEach(([u, v], i) => {
    const q = P(u, v);
    spots[i + 1] = { x: q.x, z: q.y, y: 0 };
  });

  // 6 · the giant tree: a spiral stair to a lookout deck
  const T = P(12, -8);
  const trunk = mesh(jitter(new THREE.CylinderGeometry(1.4, 2.4, 16, 10, 4), 0.25, rng), bark, T.x, 8, T.y);
  scene.add(trunk);
  W.colliders.push({ type: 'circle', x: T.x, z: T.y, r: 2.3, top: 17, bottom: -99 });
  for (const [x, y, z, r] of [[0, 17, 0, 5.4], [3.4, 15.8, 1.2, 3.8], [-3.2, 16.2, -1.4, 4], [1, 19.4, -1, 3.6]]) scene.add(mesh(jitter(new THREE.IcosahedronGeometry(r, 1), r * 0.18, rng), std('#2f7d3f'), T.x + x, y, T.y + z));
  const stepAt = (k, rad = 3.6) => {
    const a = k * 0.56;
    return P(12 + Math.cos(a) * rad, -8 + Math.sin(a) * rad);
  };
  for (let k = 1; k <= 12; k++) {
    const q = stepAt(k);
    slab(scene, W, { x: q.x, z: q.y, r: 1.05, top: 0.7 * k, thick: 0.25, mat: wood, collide: false });
  }
  const deck = stepAt(13, 4.0);
  slab(scene, W, { x: deck.x, z: deck.y, r: 1.7, top: 9, thick: 0.3, mat: wood, collide: false });
  spots[6] = { x: deck.x, z: deck.y, y: 9 };
  tag('Giant tree', 'climb the spiral stair', '#4ade80', T, 4.2);

  // 7 · the pond islet: stepping stones across the water
  const pond = P(14, 18);
  const water = new THREE.Mesh(new THREE.CircleGeometry(7, 40).rotateX(-Math.PI / 2), waterMaterial({ deep: '#14532d', shallow: '#4ade80', opacity: 0.85 }));
  water.position.set(pond.x, 0.07, pond.y);
  scene.add(water);
  W.lakes.push({ x: pond.x, z: pond.y, r: 6.6, depth: -0.6 });
  for (const [u, v] of [[8.6, 18], [10.5, 18.8], [12.3, 18.2]]) {
    const q = P(u, v);
    pillar(scene, W, { x: q.x, z: q.y, r: 0.8, top: 0.35, mat: rock, sides: 7 });
  }
  pillar(scene, W, { x: pond.x, z: pond.y, r: 1.5, top: 1.3, mat: moss, sides: 9 });
  spots[7] = { x: pond.x, z: pond.y, y: 1.3 };
  tag('Pond islet', 'hop the stepping stones', '#4ade80', pond, 4.4);

  // 8 · the hollow log: walk inside
  const logA = P(22, 2), logB = P(30, 2), logC = P(26, 2);
  const logMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 8, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.95, side: THREE.DoubleSide, flatShading: true }));
  logMesh.position.set(logC.x, 1.3, logC.y);
  logMesh.rotation.order = 'YXZ';
  logMesh.rotation.y = M.yawU;
  logMesh.rotation.x = Math.PI / 2;
  logMesh.castShadow = logMesh.receiveShadow = true;
  scene.add(logMesh);
  scene.add(mesh(new THREE.BoxGeometry(1.6, 0.3, 7.6), moss, logC.x, 2.75, logC.y).rotateY(M.yawU));
  for (const side of [-1.35, 1.35]) {
    const a = P(22, 2 + side), b = P(30, 2 + side);
    W.colliders.push({ type: 'seg', ax: a.x, az: a.y, bx: b.x, bz: b.y, r: 0.15, top: 99, bottom: -99 });
  }
  spots[8] = { x: logC.x, z: logC.y, y: 0 };
  tag('Hollow log', 'something is inside', '#4ade80', logC, 4.2);

  // 9 · the boulder: only the big bouncy mushroom gets you up there
  const boulder = P(26, 14);
  pillar(scene, W, { x: boulder.x, z: boulder.y, r: 2.1, top: 5.5, mat: rock, sides: 8 });
  for (let i = 0; i < 5; i++) {
    const q = P(26 + Math.cos(i * 1.3) * 1.6, 14 + Math.sin(i * 1.3) * 1.6);
    scene.add(mesh(new THREE.DodecahedronGeometry(0.9 + (i % 2) * 0.4, 0), rock, q.x, 1 + i * 0.9, q.y));
  }
  const padAt = P(19.5, 9);
  const padG = new THREE.Group();
  padG.position.set(padAt.x, 0, padAt.y);
  padG.add(mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.4, 8), std('#f5f5f4'), 0, 0.2, 0));
  const padCap = mesh(new THREE.SphereGeometry(1.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c026d3', emissive: '#a21caf', emissiveIntensity: 0.6, roughness: 0.5 }), 0, 0.3, 0);
  padCap.scale.y = 0.45;
  padG.add(padCap);
  scene.add(padG);
  bouncePad(W, { x: padAt.x, z: padAt.y, r: 1.2, y: 0, to: { x: boulder.x, z: boulder.y, top: 5.5 } });
  W.updaters.push((t) => (padCap.scale.y = 0.45 + Math.sin(t * 3) * 0.04));
  spots[9] = { x: boulder.x, z: boulder.y, y: 5.5 };
  tag('Bouncy mushroom', 'step on it!', '#e879f9', padAt, 2.4);

  // 10 · the stump climb to an old snag's nest
  [[-2, -19, 0.9], [1.4, -21.6, 1.8], [4.9, -23.1, 2.7], [8.4, -23.4, 3.6], [11.8, -22.4, 4.5]].forEach(([u, v, top]) => {
    const q = P(u, v);
    pillar(scene, W, { x: q.x, z: q.y, r: 0.95, top, mat: bark, sides: 9 });
    scene.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.04, 16), std('#c8a26a'), q.x, top + 0.02, q.y, false));
  });
  const nest = P(14.9, -20.3);
  scene.add(mesh(new THREE.CylinderGeometry(0.45, 0.6, 5.4, 8), bark, nest.x, 2.7, nest.y));
  slab(scene, W, { x: nest.x, z: nest.y, r: 1.6, top: 5.4, thick: 0.35, mat: wood });
  W.colliders.push({ type: 'circle', x: nest.x, z: nest.y, r: 0.6, top: 5.0, bottom: -99 });
  spots[10] = { x: nest.x, z: nest.y, y: 5.4 };
  tag('Stump climb', 'jump from stump to stump', '#4ade80', P(4.9, -23.1), 4.6);

  // ------------------------------------------------------------ the specimens
  const specimens = SPECIMENS.map((s) => {
    const at = spots[s.id];
    const g = mushroom(s, 0.85);
    g.position.set(at.x, at.y + 0.05, at.z);
    scene.add(g);
    const ring = mesh(new THREE.TorusGeometry(0.75, 0.04, 6, 30).rotateX(Math.PI / 2), glowMat('#4ade80', 1.6), at.x, at.y + 0.06, at.z, false);
    scene.add(ring);
    const lbl = label(scene, `🍄 #${s.id}`, { accent: '#4ade80', height: 0.26, x: at.x, y: at.y + 1.6, z: at.z });
    const it = { id: `forest:spec:${s.id}`, label: `Collect specimen #${s.id} 🍄`, x: at.x, z: at.z, y: at.y, r: 1.4, object: g };
    W.interactables.push(it);
    return { s, g, ring, lbl, it };
  });
  const syncSpecimens = () => {
    for (const sp of specimens) {
      const got = D.collected.includes(sp.s.id);
      sp.g.visible = sp.ring.visible = sp.lbl.visible = !got;
      sp.it.hidden = got;
    }
  };
  syncSpecimens();

  // ------------------------------------------------------------ scenery
  const avoid = (x, z) => {
    const [u, v] = M.local(x, z);
    return (u < 2 && Math.abs(v) < 5) || Math.hypot(u + 6, v - 7) < 6.5 || Math.hypot(u + 8.7, v - 2.6) < 4 || Math.hypot(u - 12, v + 8) < 6.5 ||
      Math.hypot(u - 14, v - 18) < 8.5 || (u > 20 && u < 32 && Math.abs(v - 2) < 3.5) || Math.hypot(u - 26, v - 14) < 4 || Math.hypot(u - 19.5, v - 9) < 3 ||
      (u > -4 && u < 17 && v > -26 && v < -17) || Math.hypot(u - 9, v + 33) < 7 || Object.values(spots).some((s) => Math.hypot(x - s.x, z - s.z) < 2);
  };
  const trees = [];
  for (let tries = 0; tries < 900 && trees.length < 55; tries++) {
    const a = rng() * Math.PI * 2, r = 6 + Math.sqrt(rng()) * (I.r - 8.5);
    const x = I.c[0] + Math.cos(a) * r, z = I.c[1] + Math.sin(a) * r;
    if (!avoid(x, z)) trees.push([x, z, rng()]);
  }
  forestTrees(scene, trees, circle, ['#1f6f3d', '#2a7d46', '#358f52', '#22693b']);
  // little glowing mushrooms everywhere (just for the look)
  const deco = [];
  for (let tries = 0; tries < 400 && deco.length < 40; tries++) {
    const a = rng() * Math.PI * 2, r = 4 + Math.sqrt(rng()) * (I.r - 6);
    const x = I.c[0] + Math.cos(a) * r, z = I.c[1] + Math.sin(a) * r;
    if (!avoid(x, z)) deco.push([x, z, rng()]);
  }
  instanced(scene, new THREE.CylinderGeometry(0.06, 0.08, 0.35, 6), std('#f5f5f4'), deco, ([x, z, k]) => ({ x, y: 0.17, z, s: 1 + k }));
  instanced(scene, new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#7c2d12', emissiveIntensity: 0.4 }), deco, ([x, z, k]) => ({ x, y: 0.33 * (1 + k), z, s: 1 + k, color: k > 0.5 ? '#a78bfa' : '#38bdf8' }));
  fireflies(scene, W, I, rng, '#bef264');

  // ------------------------------------------------------------ collecting
  function collect(id) {
    const sp = specimens.find((x) => x.s.id === id);
    if (!sp || D.collected.includes(id)) return;
    D.collected.push(id);
    kit.persist();
    syncSpecimens();
    sound.gem?.();
    bursts.spawn(sp.g.position.clone().setY(sp.g.position.y + 0.6), '#4ade80', 18, 3, { up: 2.5 });
    kit.reward(25, player.pos.clone().setY(player.pos.y + 2.4), '🍄 +25');
    kit.toast(`Specimen #${id}: ${sp.s.poison ? '☠ poisonous' : '✓ edible'}`, `${describe(sp.s)} · ${D.collected.length}/10 collected`, '🍄');
  }

  // ------------------------------------------------------------ the Learning Stump panel
  let lastTest = null;
  const data = () => SPECIMENS.filter((s) => D.collected.includes(s.id));
  function nodeAt(path) {
    let n = D.tree;
    for (const k of path) n = n[k];
    return n;
  }
  function setQuestion(path, q) {
    const n = nodeAt(path);
    if (q === 'leaf') {
      delete n.yes;
      delete n.no;
      n.q = null;
    } else {
      n.q = q;
      n.yes = leaf();
      n.no = leaf();
    }
    lastTest = null;
    kit.persist();
  }
  const countTag = (st) => `<span class="dt-count"><b class="p">☠ ${st.p}</b> <b class="e">✓ ${st.e}</b></span>`;
  const predTag = (st) => (st.predict === 1 ? '<span class="dt-pred p">predicts ☠ poisonous</span>' : st.predict === 0 ? '<span class="dt-pred e">predicts ✓ edible</span>' : '<span class="dt-pred q">no clear answer (?)</span>');
  function chips(path, current, depth) {
    const used = new Set();
    let n = D.tree;
    for (const k of path) {
      used.add(n.q);
      n = n[k];
    }
    const opts = FEATURES.filter((f) => !used.has(f.k)).map((f) => `<button class="btn small chip ${current === f.k ? 'on' : ''}" data-forest="${path.join('.') || 'root'}:${f.k}">${esc(f.q)}</button>`);
    if (depth > 0) opts.push(`<button class="btn small chip ${!current ? 'on' : ''}" data-forest="${path.join('.')}:leaf">Stop here</button>`);
    return opts.join('');
  }
  function renderNode(node, path, depth, stats, ds) {
    const reach = ds.filter((s) => {
      let n = D.tree;
      for (const k of path) {
        if (!n.q) return false;
        if ((s[n.q] ? 'yes' : 'no') !== k) return false;
        n = n[k];
      }
      return true;
    });
    const st = { p: reach.filter((s) => s.poison).length, e: reach.filter((s) => !s.poison).length };
    const head = depth === 0 ? '<b>Start:</b> all specimens' : `<b>${path[path.length - 1] === 'yes' ? 'Yes' : 'No'}</b>`;
    let html = `<div class="dt-node d${depth}"><div class="dt-row">${head} ${countTag(st)}</div>`;
    if (depth < 2) html += `<div class="dt-ask">${depth === 0 ? 'First question:' : 'Then ask:'} ${chips(path, node.q, depth)}</div>`;
    if (node.q) {
      html += `<div class="dt-q">${esc(F[node.q].q)}</div><div class="dt-kids">${renderNode(node.yes, [...path, 'yes'], depth + 1, stats, ds)}${renderNode(node.no, [...path, 'no'], depth + 1, stats, ds)}</div>`;
    } else if (depth > 0) html += predTag(stats.get(node));
    return html + '</div>';
  }
  function openLab() {
    const ds = data();
    const stats = leafStats(D.tree, ds);
    const trainRight = ds.filter((s) => predict(D.tree, stats, s) === s.poison).length;
    const solved = kit.isSolved();
    const rows = ds.map((s) => `<tr><td>#${s.id}</td>${FEATURES.map((f) => `<td>${s[f.k] ? '●' : '·'}</td>`).join('')}<td class="${s.poison ? 'p' : 'e'}" title="${s.poison ? 'poisonous' : 'edible'}">${s.poison ? '☠' : '✓'}</td></tr>`).join('');
    kit.panel({
      kicker: '🌲 Forest Island · the Learning Stump', title: 'Grow a decision tree', color: I.color,
      html: `<p class="lead">A decision tree asks yes/no questions about a mushroom's <b>features</b> to predict its <b>label</b>. Each leaf predicts what most of the specimens that reach it are.</p>
        <h3>Your dataset · ${ds.length} of 10 specimens</h3>
        <p class="muted ds-legend">● yes · · no · label: ☠ poisonous, ✓ edible</p>
        ${ds.length ? `<div class="ds-wrap"><table class="ds"><tr><th>#</th>${FEATURES.map((f) => `<th>${esc(f.q.replace('?', ''))}</th>`).join('')}<th>Label</th></tr>${rows}</table></div>` : '<p class="muted">No specimens yet: collect some around the island first.</p>'}
        <h3>Your tree</h3>
        <div class="dtree">${renderNode(D.tree, [], 0, stats, ds)}</div>
        <p class="dt-acc">Training accuracy: <b>${ds.length ? `${trainRight}/${ds.length}` : '—'}</b> on the specimens you collected.</p>
        <div class="pager"><button class="btn small" data-forest="reset">Start over</button><button class="btn primary" data-forest="test" ${D.tree.q ? '' : 'disabled'}>🧪 Run the forest test</button></div>
        ${lastTest ? testHTML(lastTest, ds.length) : ''}
        ${solved ? '<div class="callout done-callout">✔ Test passed: the root bridge home is open.</div>' : ''}`,
    });
  }
  function testHTML(r, n) {
    let why = '';
    if (r.score === TESTS.length) why = 'Every unseen mushroom is classified correctly: your tree <b>generalises</b>.';
    else if (D.tree.q === 'red' || [D.tree.yes?.q, D.tree.no?.q].includes('red')) why = `Your tree trusts <b>red caps</b>. That pattern came from the specimens near the path: a <b>sampling bias</b>. ${n < 10 ? 'Collect the specimens hidden around the island and look again.' : 'Look at the counts again: which question splits the specimens most cleanly?'}`;
    else if (n < 10) why = `You trained on ${n} of 10 specimens. More (and more varied) data shows the real pattern: collect the rest.`;
    else if (r.unknown) why = 'Some mushrooms reached a leaf with no clear answer. Add a question there to split it.';
    else why = 'Not yet. Compare the ☠ / ✓ counts: a good question makes each group as pure as possible.';
    return `<div class="dt-test"><h3>🧪 Forest test: ${r.score}/${TESTS.length}</h3>
      <div class="dt-jars">${r.rows.map((x, i) => `<div class="jar ${x.ok ? 'ok' : 'bad'}"><b>${x.ok ? '✔' : '✖'}</b><small>${esc(describe(TESTS[i]))}</small><small>model: ${x.pred === null ? '?' : x.pred ? '☠' : '✓'} · truth: ${TESTS[i].poison ? '☠' : '✓'}</small></div>`).join('')}</div>
      <p>${why}</p></div>`;
  }
  function runTest() {
    const ds = data();
    const stats = leafStats(D.tree, ds);
    const rows = TESTS.map((s) => {
      const pred = predict(D.tree, stats, s);
      return { pred, ok: pred === s.poison };
    });
    const score = rows.filter((x) => x.ok).length;
    lastTest = { rows, score, unknown: rows.some((x) => x.pred === null) };
    D.best = Math.max(D.best, score);
    kit.persist();
    lightJars(rows.map((x) => x.ok));
    if (score === TESTS.length && !kit.isSolved()) {
      sound.achieve?.();
      bursts.spawn(new THREE.Vector3(lab.x, 2.5, lab.y), '#4ade80', 40, 5, { up: 4 });
      kit.solve();
      kit.fireworks?.(10, 8);
      setTimeout(() => debrief(), 3600);
      openLab();
      return;
    }
    sound[score === TESTS.length ? 'collect' : 'thud']?.();
    openLab();
  }
  function debrief() {
    kit.panel({
      kicker: '🌲 The Forest Test · passed', title: 'You trained a real classifier', color: I.color,
      html: `<p class="lead">The root bridge home is open. Here is what you just did, in machine-learning words:</p>
        <div class="parts three">
          <div><b>🧾 Features & labels</b><small>Ring, spots, glow and cap colour are features; poisonous or edible is the label. A labelled example pairs the two.</small></div>
          <div><b>🎯 Sampling bias</b><small>The specimens by the path made “red = poisonous” look perfect. The hard-to-reach ones broke that rule. Easy data isn’t always representative data.</small></div>
          <div><b>🌳 Decision trees</b><small>Real algorithms (like CART) pick each question automatically: the one that makes the groups purest (measured by Gini impurity or entropy).</small></div>
        </div>
        <p><b>Training vs test accuracy:</b> a model can score 100% on the data it learned from and still fail on new data (overfitting). Only a held-out test set tells you whether it <b>generalises</b>.</p>
        <p class="muted">In the real world, decision trees and random forests (many trees voting) help with tasks like medical triage, fraud detection and credit scoring.</p>
        <div class="callout">⚠️ These mushrooms and their rule are invented for this lesson. Never eat a wild mushroom unless an expert has identified it.</div>`,
    });
  }

  return {
    trial: true,
    title: 'The Data Grove',
    mission: `<p>The forest's mushroom guide has gone wrong, and travellers can't tell the safe mushrooms from the poisonous ones. The roots of the bridge home stay closed until you teach the forest a rule that works on mushrooms it has never seen.</p>
      <ol><li>🍄 <b>Collect</b> labelled specimens: 10 hide around the island, some high up.</li>
      <li>🌳 <b>Grow a decision tree</b> at the Learning Stump: pick the questions that split safe from poisonous.</li>
      <li>🧪 <b>Run the forest test</b>: 6 unseen mushrooms. Get all 6 right.</li></ol>`,
    hints: [
      'The specimens near the path aren’t the whole story. The rest hide up the giant tree, on the pond islet, inside the hollow log, on the boulder (try the big bouncy mushroom) and at the top of the stump climb.',
      'A good first question splits the specimens into the purest groups. Try each feature as the first question and watch the ☠ / ✓ counts in each branch.',
      'Ask “Ring?” first. For mushrooms with a ring, ask “Spots?”. For mushrooms without a ring, ask “Glows?”.',
    ],
    quest: () => [
      { text: 'Collect specimens', n: D.collected.length, of: 10, done: D.collected.length === 10 },
      { text: 'Grow a decision tree at the Learning Stump', done: !!D.tree.q },
      { text: 'Pass the forest test', n: D.best, of: 6, done: kit.isSolved() },
    ],
    interact(id) {
      const [, kind, arg] = id.split(':');
      if (kind === 'lab') return openLab(), true;
      if (kind === 'spec') return collect(+arg), true;
      return false;
    },
    handleClick(target) {
      const b = target.closest('[data-forest]');
      if (!b) return false;
      const v = b.dataset.forest;
      if (v === 'test') runTest();
      else if (v === 'reset') {
        D.tree = leaf();
        lastTest = null;
        kit.persist();
        openLab();
      } else {
        const [where, q] = v.split(':');
        setQuestion(where === 'root' ? [] : where.split('.'), q);
        sound.click?.();
        openLab();
      }
      return true;
    },
    // for tests and the debug console
    debug: { spots, specimens, SPECIMENS, TESTS, leafStats, predict, M, collect },
  };
}

// ---------------------------------------------------------------- a mushroom you can read

function mushroom(s, k = 1) {
  const g = new THREE.Group();
  const capCol = CAP[s.cap];
  const capMat = s.glow
    ? new THREE.MeshStandardMaterial({ color: capCol, emissive: new THREE.Color(capCol), emissiveIntensity: 0.9, roughness: 0.5 })
    : std(capCol);
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 10), std('#f5f0e1'), 0, 0.35, 0));
  const cap = mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat, 0, 0.66, 0);
  cap.scale.y = 0.7;
  g.add(cap);
  if (s.ring) g.add(mesh(new THREE.CylinderGeometry(0.16, 0.27, 0.1, 12, 1, true), std('#e7e1d2', { side: THREE.DoubleSide }), 0, 0.5, 0));
  if (s.spots) {
    const dot = std(s.cap === 'white' ? '#57534e' : '#fefce8');
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = i === 0 ? 0 : 0.24;
      const y = 0.66 + Math.sqrt(Math.max(0, 0.42 * 0.42 - r * r)) * 0.7;
      g.add(mesh(new THREE.SphereGeometry(0.045, 6, 4), dot, Math.cos(a) * r, y, Math.sin(a) * r, false));
    }
  }
  if (s.glow) g.add(mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshBasicMaterial({ color: capCol, transparent: true, opacity: 0.12, depthWrite: false }), 0, 0.62, 0, false));
  g.scale.setScalar(k);
  return g;
}
