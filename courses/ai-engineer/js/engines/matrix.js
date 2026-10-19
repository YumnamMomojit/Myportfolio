// Edit a 2×2 matrix and watch it reshape the plane until the F matches the ghost.
import * as THREE from 'three';
import { box, arrow, grid, C, PALETTE } from '../kit.js';

const SHAPE = [[0, 0], [0, 0.5], [0, 1], [0, 1.5], [0, 2], [0.5, 2], [1, 2], [1.5, 2], [0.5, 1], [1, 1]];

export default function matrix(ctx) {
  const { stage, params } = ctx;
  const step = params.step ?? 0.5;
  const targets = params.targets;
  const values = [];
  for (let v = -3; v <= 3 + 1e-9; v += step) values.push(+v.toFixed(2));
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  const par = targets.reduce((s, t) => s + (Math.abs(t[0][0] - 1) + Math.abs(t[0][1]) + Math.abs(t[1][0]) + Math.abs(t[1][1] - 1)) / step, 0);
  ctx.budget({ par, moves: par + (params.extra ?? 6) });

  stage.root.add(grid(-3, 3, -3, 3, { step: 0.5, opacity: 0.22 }));
  stage.frame({ target: [0, 0, 0], w: 8, h: 8, yaw: 0, pitch: 0.15 });

  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x13753f, transparent: true, opacity: 0.28, depthWrite: false });
  const ghosts = SHAPE.map(() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.2), ghostMat);
    stage.root.add(m);
    return m;
  });
  const cubes = SHAPE.map((_, i) => {
    const m = box(0.38, 0.38, 0.3, PALETTE[i % PALETTE.length], 0.1);
    stage.root.add(m);
    return m;
  });
  const iHat = arrow(C.pink, 0.06);
  const jHat = arrow(C.blue, 0.06);
  const giHat = arrow(0xb8e6c2, 0.035);
  const gjHat = arrow(0xb8e6c2, 0.035);
  stage.root.add(iHat, jHat, giHat, gjHat);

  let M = [[1, 0], [0, 1]];
  let round = 0;
  const shown = [[1, 0], [0, 1]];

  const g = ctx.ui.group('M =');
  const cells = document.createElement('div');
  cells.style.cssText = 'display:grid;grid-template-columns:auto auto;gap:4px';
  g.append(cells);
  const names = [['a', 'b'], ['c', 'd']];
  const steppers = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([r, c]) =>
    ctx.ui.stepper(names[r][c], values, values.indexOf(M[r][c]), (v) => { M[r][c] = v; changed(); }, { parent: cells, format: fmt, cost: 1 }));

  setRound();

  function setRound() {
    const t = targets[round];
    ctx.round(round + 1, targets.length);
    ctx.goal(`<b>${params.names?.[round] ?? 'Match'}:</b> edit the matrix until the candy F covers the dark green ghost.`);
    SHAPE.forEach((p, i) => ghosts[i].position.set(t[0][0] * p[0] + t[0][1] * p[1], t[1][0] * p[0] + t[1][1] * p[1], -0.02));
    const o = new THREE.Vector3(0, 0, 0.02);
    giHat.set(o, new THREE.Vector3(t[0][0], t[1][0], 0.02));
    gjHat.set(o, new THREE.Vector3(t[0][1], t[1][1], 0.02));
    status();
  }

  function status() {
    ctx.status(`M = [[<b>${fmt(M[0][0])}</b>, <b>${fmt(M[0][1])}</b>], [<b>${fmt(M[1][0])}</b>, <b>${fmt(M[1][1])}</b>]] · <span style="color:#ffd54f">î → (${fmt(M[0][0])}, ${fmt(M[1][0])})</span> · <span style="color:#8fe3b0">ĵ → (${fmt(M[0][1])}, ${fmt(M[1][1])})</span>`);
  }

  function changed() {
    ctx.sound.pop();
    status();
    const t = targets[round];
    if (M.every((row, r) => row.every((v, c) => Math.abs(v - t[r][c]) < 1e-9))) {
      ctx.busy = true;
      setTimeout(() => {
        ctx.sound.gem();
        stage.fx.burst(new THREE.Vector3(0, 0, 0.5), PALETTE, 30, 4);
        round++;
        if (round >= targets.length) {
          ctx.busy = false;
          ctx.win();
          return;
        }
        M = [[1, 0], [0, 1]];
        steppers.forEach((s, k) => s.set(values.indexOf(k === 0 || k === 3 ? 1 : 0)));
        setRound();
        ctx.busy = false;
      }, 650);
    }
  }

  return {
    update(dt) {
      const k = 1 - Math.exp(-dt * 9);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) shown[r][c] += (M[r][c] - shown[r][c]) * k;
      SHAPE.forEach((p, i) => cubes[i].position.set(shown[0][0] * p[0] + shown[0][1] * p[1], shown[1][0] * p[0] + shown[1][1] * p[1], 0.15));
      const o = new THREE.Vector3(0, 0, 0.3);
      iHat.set(o, new THREE.Vector3(shown[0][0], shown[1][0], 0.3));
      jHat.set(o, new THREE.Vector3(shown[0][1], shown[1][1], 0.3));
    },
  };
}
