// Fly a ship to each star by adding vectors tip to tail.
import * as THREE from 'three';
import { candy, label, arrow, grid, starGeo, candyMat, bfs, C, PALETTE } from '../kit.js';

const COLORS = [C.pink, C.blue, C.orange, C.green];
const NAMES = ['a', 'b', 'c', 'd'];
const X0 = -3, X1 = 9, Y0 = -2, Y1 = 9;

export default function vectors(ctx) {
  const { stage, params } = ctx;
  const vecs = params.vectors;
  const targets = params.targets;

  // Fewest moves for each star, starting from the previous star.
  let par = 0;
  let from = [0, 0];
  for (const t of targets) {
    par += bfs(from, (p) => vecs.map((v) => [p[0] + v[0], p[1] + v[1]]).filter(inside), (p) => p[0] === t[0] && p[1] === t[1]);
    from = t;
  }
  ctx.budget({ par, moves: par + (params.extra ?? 4) });

  stage.root.add(grid(X0, X1, Y0, Y1));
  for (let x = X0; x <= X1; x += 2) addTick(String(x), x, Y0 - 0.55);
  for (let y = Y0; y <= Y1; y += 2) if (y) addTick(String(y), X0 - 0.55, y);
  function addTick(t, x, y) {
    const l = label(t, { size: 40, weight: 600, color: '#4f6b55', height: 0.32, pad: 4 });
    l.position.set(x, y, 0.05);
    stage.root.add(l);
  }

  const ship = new THREE.Group();
  const body = candy('ball', C.white, 0.6);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 16), candyMat(C.pink));
  nose.position.y = 0.4;
  ship.add(body, nose);
  ship.position.set(0, 0, 0.35);
  stage.root.add(ship);

  const star = new THREE.Mesh(starGeo(0.5, 0.22, 0.25), candyMat(0xffc61a, { emissive: 0x996600, emissiveIntensity: 0.4 }));
  stage.root.add(star);

  const pathGroup = new THREE.Group();
  stage.root.add(pathGroup);

  let pos = [0, 0];
  let round = 0;
  let counts = vecs.map(() => 0);
  const history = [];
  let roundStart = 0; // history entries before this belong to earlier stars

  stage.frame({ target: [(X0 + X1) / 2, (Y0 + Y1) / 2, 0], w: X1 - X0 + 2.5, h: Y1 - Y0 + 2.5, yaw: 0, pitch: 0.2 });

  vecs.forEach((v, i) => {
    ctx.ui.button(`<b>+ ${NAMES[i]}</b> (${v[0]}, ${v[1]})`, () => add(i), { cls: ['', 'blue', 'orange', 'green'][i], cost: 1 });
  });
  ctx.ui.button('↶ Undo', undo, { cls: 'ghost', cost: 1 });

  showRound();

  function showRound() {
    const t = targets[round];
    star.position.set(t[0], t[1], 0.4);
    star.scale.setScalar(0.01);
    stage.tweens.scale(star, 1, 0.5);
    ctx.round(round + 1, targets.length);
    counts = vecs.map(() => 0);
    status();
  }

  function status() {
    const t = targets[round];
    const mix = counts.map((c, i) => (c ? `${c}${NAMES[i]}` : '')).filter(Boolean).join(' + ') || '0';
    ctx.status(`Ship at <b>(${pos[0]}, ${pos[1]})</b> = start + ${mix} · ⭐ at <b>(${t[0]}, ${t[1]})</b>`);
  }

  async function add(i) {
    const v = vecs[i];
    const next = [pos[0] + v[0], pos[1] + v[1]];
    if (!inside(next)) {
      ctx.toast('That would fly off the map!', 'bad');
      ctx.refund(1);
      return;
    }
    const a = arrow(COLORS[i], 0.07);
    a.set(new THREE.Vector3(pos[0], pos[1], 0.12), new THREE.Vector3(next[0], next[1], 0.12));
    pathGroup.add(a);
    history.push({ i, a, from: pos });
    counts[i]++;
    await fly(next);
    check();
  }

  async function undo() {
    if (history.length <= roundStart) {
      ctx.toast('Nothing to undo this round.', 'bad');
      ctx.refund(1);
      return;
    }
    const h = history.pop();
    pathGroup.remove(h.a);
    counts[h.i]--;
    await fly(h.from);
    status();
  }

  async function fly(to) {
    ctx.busy = true;
    ctx.sound.whoosh();
    const from = ship.position.clone();
    const end = new THREE.Vector3(to[0], to[1], 0.35);
    await stage.tweens.add(0.45, (k) => {
      ship.position.lerpVectors(from, end, k);
      ship.position.z = 0.35 + Math.sin(k * Math.PI) * 0.8;
    });
    pos = to;
    ctx.busy = false;
  }

  function check() {
    const t = targets[round];
    status();
    if (pos[0] !== t[0] || pos[1] !== t[1]) return;
    ctx.sound.gem();
    stage.fx.burst(star.position.clone(), PALETTE, 24, 4);
    stage.tweens.scale(star, 0.01, 0.3);
    round++;
    roundStart = history.length;
    if (round >= targets.length) {
      ctx.win();
      return;
    }
    setTimeout(showRound, 450);
  }

  return {
    update(dt) {
      star.rotation.z += dt * 1.5;
      ship.rotation.z = Math.sin(performance.now() / 300) * 0.15;
    },
  };
}

function inside(p) {
  return p[0] >= X0 && p[0] <= X1 && p[1] >= Y0 && p[1] <= Y1;
}
