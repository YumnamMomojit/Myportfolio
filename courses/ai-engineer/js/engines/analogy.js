// Fly through a tiny 3D embedding space with vector arithmetic: king − man + woman ≈ queen.
import * as THREE from 'three';
import { candy, label, arrow, bfs, skyTexture, C, PALETTE } from '../../../shared/kit.js';

// Hand-made 3D "embeddings": the axes loosely mean gender, royalty and age,
// and country → capital is one shared direction.
const WORDS = {
  man: [-1, 0, 0], woman: [1, 0, 0], king: [-1, 2, 0], queen: [1, 2, 0],
  boy: [-1, 0, -1.5], girl: [1, 0, -1.5], prince: [-1, 2, -1.5], princess: [1, 2, -1.5],
  france: [3, -2.5, 1], paris: [3, -2.5, 2.5], japan: [5, -2, -0.5], tokyo: [5, -2, 1], india: [4, -3.6, 0.2], delhi: [4, -3.6, 1.7],
  apple: [-3.5, -2.2, 1.8], banana: [-4.2, -2.8, 1.1], cat: [-4.4, 1.6, -1.8], dog: [-3.8, 1.1, -2.4],
};
const ROUNDS = [
  { start: 'king', target: 'queen', ops: ['-man', '+woman', '+boy', '-girl', '+france'] },
  { start: 'paris', target: 'tokyo', ops: ['-france', '+japan', '+india', '-paris', '+queen'] },
  { start: 'king', target: 'princess', ops: ['-man', '+girl', '+woman', '-queen', '+tokyo'] },
];

export default function analogy(ctx) {
  const { stage, params } = ctx;
  const V = (w) => new THREE.Vector3(...WORDS[w]);
  const opVec = (op) => V(op.slice(1)).multiplyScalar(op[0] === '-' ? -1 : 1);
  const nearest = (p) => {
    let best = null, bd = Infinity;
    for (const w of Object.keys(WORDS)) { const d = p.distanceTo(V(w)); if (d < bd) { bd = d; best = w; } }
    return { word: best, dist: bd };
  };
  const key = (p) => p.toArray().map((v) => v.toFixed(2)).join(',');

  let par = 0;
  ROUNDS.forEach((r) => {
    par += bfs(V(r.start), (p) => r.ops.map((op) => p.clone().add(opVec(op))), (p) => p.distanceTo(V(r.target)) < 0.35, key, 5000);
  });
  ctx.budget({ par, moves: par + (params.extra ?? 5) });

  stage.scene.background = skyTexture('#0b2a1a', '#24563a');
  // background star dust
  const dust = new THREE.BufferGeometry();
  const dp = [];
  for (let i = 0; i < 600; i++) dp.push((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, -8 - Math.random() * 20);
  dust.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  stage.root.add(new THREE.Points(dust, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.7 })));

  const stars = {};
  for (const [w, p] of Object.entries(WORDS)) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
    s.position.set(...p);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.25, depthWrite: false }));
    s.add(halo);
    const l = label(w, { size: 44, weight: 600, color: '#ffffff', height: 0.36, pad: 4 });
    l.position.set(0, 0.38, 0);
    s.add(l);
    stage.root.add(s);
    stars[w] = { s, halo };
  }

  const comet = candy('ball', C.pink, 0.42);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf5b301, transparent: true, opacity: 0.3, depthWrite: false }));
  comet.add(glow);
  stage.root.add(comet);
  const trail = new THREE.Group();
  stage.root.add(trail);

  stage.orbit = true;
  stage.frame({ target: [0.4, -0.3, 0.2], w: 11.5, h: 8, yaw: 0.35, pitch: 0.3 });

  let round = 0;
  let pos = new THREE.Vector3();
  const history = [];
  const opsGroup = ctx.ui.group('Add / subtract:');
  const opButtons = [];
  ctx.ui.button('↶ Undo', undo, { cls: 'ghost', cost: 1 });
  setRound();

  function setRound() {
    const r = ROUNDS[round];
    pos = V(r.start);
    comet.position.copy(pos);
    trail.clear();
    history.length = 0;
    Object.values(stars).forEach(({ halo }) => { halo.material.color.set(0xffd23f); halo.scale.setScalar(1); });
    stars[r.target].halo.material.color.set(0x3ddc84);
    stars[r.target].halo.scale.setScalar(1.6);
    ctx.round(round + 1, ROUNDS.length);
    ctx.goal(`Start at <b>${r.start}</b> and land on <b>${r.target}</b> (the green star).`);
    opButtons.forEach((b) => b.remove());
    opButtons.length = 0;
    r.ops.forEach((op, i) => opButtons.push(ctx.ui.button(`${op[0] === '-' ? '−' : '+'} ${op.slice(1)}`, () => apply(op), { parent: opsGroup, cls: (op[0] === '-' ? 'blue' : '') + ' small', cost: 1 })));
    status();
  }

  async function apply(op) {
    const from = pos.clone();
    const to = pos.clone().add(opVec(op));
    const a = arrow(op[0] === '-' ? C.blue : C.pink, 0.04);
    a.set(from, to);
    trail.add(a);
    history.push({ from, a, op });
    await fly(from, to);
    check();
  }

  async function undo() {
    const h = history.pop();
    if (!h) {
      ctx.refund(1);
      ctx.toast('Nothing to undo.', 'hint');
      return;
    }
    trail.remove(h.a);
    await fly(pos.clone(), h.from);
    status();
  }

  async function fly(from, to) {
    ctx.busy = true;
    ctx.sound.warp();
    await stage.tweens.add(0.6, (k) => comet.position.lerpVectors(from, to, k));
    pos = to;
    ctx.busy = false;
  }

  function status() {
    const r = ROUNDS[round];
    const n = nearest(pos);
    const expr = [r.start, ...history.map((h) => `${h.op[0] === '-' ? '−' : '+'} ${h.op.slice(1)}`)].join(' ');
    ctx.status(`<b>${expr}</b> ≈ <b>${n.word}</b> (distance ${n.dist.toFixed(2)}) · drag to look around`);
  }

  function check() {
    const r = ROUNDS[round];
    status();
    if (pos.distanceTo(V(r.target)) < 0.35) {
      ctx.sound.gem();
      stage.fx.burst(pos.clone(), PALETTE, 30, 4);
      round++;
      if (round >= ROUNDS.length) ctx.win();
      else {
        ctx.toast(`Landed on ${r.target}!`, 'good');
        setTimeout(setRound, 600);
      }
    }
  }

  return {
    update(dt) {
      glow.scale.setScalar(1 + Math.sin(performance.now() / 200) * 0.15);
      const t = ROUNDS[Math.min(round, ROUNDS.length - 1)].target;
      stars[t].s.rotation.y += dt;
    },
  };
}
