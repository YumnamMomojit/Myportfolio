// Slide 3×3 kernels over an image and match the target feature maps.
import * as THREE from 'three';
import { box, label, C, PALETTE } from '../../../shared/kit.js';

const KERNELS = {
  vertical: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],
  horizontal: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],
  blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((r) => r.map((v) => v / 9)),
  sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  identity: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
};
const TRAY = ['sharpen', 'vertical', 'identity', 'blur', 'horizontal'];
const GOALS = {
  vertical: 'Light up the <b>left and right</b> edges of the shape (vertical edges).',
  horizontal: 'Light up the <b>top and bottom</b> edges of the shape (horizontal edges).',
  blur: 'Make a <b>soft, blurred</b> copy of the shape.',
};

const N = 8;
const IMG = [...Array(N)].map((_, r) => [...Array(N)].map((_, c) => (r >= 2 && r <= 5 && c >= 1 && c <= 5 ? 1 : 0)));

function convolve(k) {
  const out = [];
  for (let r = 0; r < N - 2; r++) {
    out.push([]);
    for (let c = 0; c < N - 2; c++) {
      let s = 0;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += IMG[r + i][c + j] * k[i][j];
      out[r].push(s);
    }
  }
  return out;
}

export default function conv(ctx) {
  const { stage, params } = ctx;
  const targets = params.targets;
  let round = 0;

  const cell = 0.62;
  const inOrigin = new THREE.Vector3(-6.2, 2.3, 0);
  const outOrigin = new THREE.Vector3(1.2, 1.7, 0);
  const at = (o, r, c) => new THREE.Vector3(o.x + c * cell, o.y - r * cell, o.z);

  // input image
  IMG.forEach((row, r) => row.forEach((v, c) => {
    const b = box(cell * 0.92, cell * 0.92, v ? 0.5 : 0.12, v ? C.white : 0x3e5446, 0.06);
    b.position.copy(at(inOrigin, r, c)).setZ(v ? 0.25 : 0.06);
    stage.root.add(b);
  }));
  const inTag = label('input image 8×8', { size: 40, weight: 700, color: '#15331f', height: 0.36, pad: 4 });
  inTag.position.copy(at(inOrigin, -1, 3.5));
  stage.root.add(inTag);

  // the sliding 3×3 window
  const win = new THREE.Mesh(new THREE.BoxGeometry(cell * 3, cell * 3, 0.7), new THREE.MeshBasicMaterial({ color: 0xffc61a, transparent: true, opacity: 0.25, depthWrite: false }));
  const winEdge = new THREE.LineSegments(new THREE.EdgesGeometry(win.geometry), new THREE.LineBasicMaterial({ color: 0xff9f1c }));
  win.add(winEdge);
  win.visible = false;
  stage.root.add(win);

  // output map and target ghosts
  const outCells = [];
  const ghosts = [];
  for (let r = 0; r < N - 2; r++) {
    for (let c = 0; c < N - 2; c++) {
      const b = box(cell * 0.9, cell * 0.9, 1, C.white, 0.06);
      b.position.copy(at(outOrigin, r, c));
      b.scale.z = 0.05;
      stage.root.add(b);
      outCells.push(b);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(cell * 0.9, cell * 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
      g.position.copy(at(outOrigin, r, c)).add(new THREE.Vector3(0, 0, 0));
      g.position.x += (N - 2) * cell + 0.9;
      stage.root.add(g);
      ghosts.push(g);
    }
  }
  const outTag = label('your feature map', { size: 40, weight: 700, color: '#15331f', height: 0.36, pad: 4 });
  outTag.position.copy(at(outOrigin, -1, 2.5));
  const tgtTag = label('target', { size: 40, weight: 700, color: '#13753f', height: 0.36, pad: 4 });
  tgtTag.position.copy(at(outOrigin, -1, 2.5)).add(new THREE.Vector3((N - 2) * cell + 0.9, 0, 0));
  stage.root.add(outTag, tgtTag);
  const legend = label('gold = positive · green = negative', { size: 34, weight: 600, color: '#4f6b55', height: 0.3, pad: 4 });
  legend.position.copy(at(outOrigin, 6.6, 5.3));
  stage.root.add(legend);

  stage.frame({ target: [0.9, 0.1, 0], w: 16, h: 7.2, yaw: 0, pitch: 0.22 });

  const color = (v, maxAbs) => {
    const k = Math.min(Math.abs(v) / (maxAbs || 1), 1);
    return new THREE.Color(0xf3f7e8).lerp(new THREE.Color(v >= 0 ? 0xf5b301 : 0x168a4c), k);
  };

  // kernel tray: buttons show the numbers, not the names
  TRAY.forEach((name, i) => {
    const k = KERNELS[name];
    const fmt = (v) => (Number.isInteger(v) ? String(v) : '⅑');
    const grid = `<span style="display:inline-grid;grid-template-columns:repeat(3,1.7em);gap:1px;font:600 0.72rem var(--mono)">${k.flat().map((v) => `<span style="background:rgba(255,255,255,.25);border-radius:3px;text-align:center">${fmt(v)}</span>`).join('')}</span>`;
    ctx.ui.button(`<b>${'ABCDE'[i]}</b> ${grid}`, () => apply(name), { cls: ['', 'blue', 'orange', 'green', 'purple'][i], cost: 1, title: `Kernel ${'ABCDE'[i]}` });
  });
  setRound();

  function setRound() {
    const t = convolve(KERNELS[targets[round]]);
    const maxAbs = Math.max(...t.flat().map(Math.abs));
    t.flat().forEach((v, i) => ghosts[i].material.color.copy(color(v, maxAbs)));
    ctx.round(round + 1, targets.length);
    ctx.goal(`${GOALS[targets[round]]} Pick the kernel that turns the input into the target map.`);
    ctx.status('Each kernel button shows its 3×3 weights. Output = Σ (pixel × weight) under the window.');
  }

  async function apply(name) {
    ctx.busy = true;
    const out = convolve(KERNELS[name]);
    const maxAbs = Math.max(...out.flat().map(Math.abs), 1e-9);
    outCells.forEach((b) => { b.scale.z = 0.05; b.position.z = 0.025; b.material = new THREE.MeshPhysicalMaterial({ color: 0xf3f7e8, clearcoat: 1, roughness: 0.3 }); });
    win.visible = true;
    ctx.sound.whoosh();
    for (let r = 0; r < N - 2; r++) {
      for (let c = 0; c < N - 2; c++) {
        win.position.copy(at(inOrigin, r + 1, c + 1)).setZ(0.35);
        const v = out[r][c];
        const b = outCells[r * (N - 2) + c];
        b.material.color.copy(color(v, maxAbs));
        const h = 0.05 + (Math.abs(v) / maxAbs) * 0.9;
        b.scale.z = h;
        b.position.z = h / 2;
        await new Promise((res) => setTimeout(res, 22));
      }
    }
    win.visible = false;
    ctx.busy = false;
    const t = convolve(KERNELS[targets[round]]);
    const same = out.every((row, r) => row.every((v, c) => Math.abs(v - t[r][c]) < 1e-9));
    if (same) {
      ctx.sound.gem();
      stage.fx.burst(at(outOrigin, 2.5, 2.5), PALETTE, 30, 4);
      round++;
      if (round >= targets.length) ctx.win();
      else {
        ctx.toast('Feature map matched!', 'good');
        setTimeout(setRound, 500);
      }
    } else ctx.toast('Not the target pattern. Compare where your map lights up with the target.', 'bad');
  }
}
