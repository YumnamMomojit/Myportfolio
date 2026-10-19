// Dot-product attention: turn the query of "it" and watch softmax(q·k) redistribute the beams.
import * as THREE from 'three';
import { box, label, setLabel, arrow, textPlane, bfs, C, PALETTE } from '../../../shared/kit.js';

const BASE = { The: 200, animal: 30, "didn't": 250, cross: 300, the: 205, street: 120, because: 225, it: 160, was: 265, too: 280 };
const ROUNDS = [
  { words: ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired'], keys: { ...BASE, tired: 65 }, target: 'animal' },
  { words: ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'wide'], keys: { ...BASE, wide: 165 }, target: 'street' },
];
const SCALE = 4; // plays the role of 1/√d
const NEED = 0.6;
const STEPS = [15, -15, 45, -45];

function weights(r, q) {
  const e = r.words.map((w) => Math.exp(SCALE * Math.cos(THREE.MathUtils.degToRad(r.keys[w] - q))));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
}

export default function attention(ctx) {
  const { stage, params } = ctx;
  const start = 270;
  const solved = (r, q) => weights(r, q)[r.words.indexOf(r.target)] >= NEED;
  const par = bfs([start, 0], ([q, r]) => STEPS.map((d) => {
    const nq = (q + d + 360) % 360;
    let nr = r;
    while (nr < ROUNDS.length && solved(ROUNDS[nr], nq)) nr++;
    return [nq, nr];
  }), ([, r]) => r >= ROUNDS.length);
  ctx.budget({ par, moves: par + (params.extra ?? 5) });

  const GAP = 1.45;
  let round = 0;
  let q = start;
  let shownQ = start;
  let tokens = [];
  const beams = new THREE.Group();
  stage.root.add(beams);
  const qArrow = arrow(C.orange, 0.09);
  stage.root.add(qArrow);
  const qTag = label('query of “it”', { size: 40, weight: 700, color: '#ff9f1c', stroke: '#ffffff', height: 0.36, pad: 4 });
  stage.root.add(qTag);

  stage.frame({ target: [0, 0.3, 0], w: 11 * GAP + 0.6, h: 7.4, yaw: 0, pitch: 0.2 });

  STEPS.forEach((d) => ctx.ui.button(`${d > 0 ? '⟲' : '⟳'} ${Math.abs(d)}°`, () => turn(d), { cls: Math.abs(d) === 45 ? 'purple' : 'blue', cost: 1 }));
  setRound();

  function setRound() {
    tokens.forEach((t) => stage.root.remove(t.g));
    const r = ROUNDS[round];
    tokens = r.words.map((w, i) => {
      const g = new THREE.Group();
      g.position.set((i - (r.words.length - 1) / 2) * GAP, 0, 0);
      const isIt = w === 'it';
      const body = box(1.25, 0.8, 0.6, isIt ? C.orange : w === r.target ? C.green : C.white, 0.2);
      const txt = textPlane(w, { size: 50, weight: 700, color: isIt || w === r.target ? '#ffffff' : '#15331f', height: 0.36, pad: 4 });
      txt.position.z = 0.31;
      const kArrow = arrow(C.purple, 0.035);
      const a = THREE.MathUtils.degToRad(r.keys[w]);
      kArrow.set(new THREE.Vector3(0, -1.0, 0.1), new THREE.Vector3(Math.cos(a) * 0.5, -1.0 + Math.sin(a) * 0.5, 0.1));
      const pct = label('', { size: 44, weight: 700, color: '#15331f', height: 0.34, pad: 4 });
      pct.position.set(0, 0.75, 0.2);
      g.add(body, txt, kArrow, pct);
      stage.root.add(g);
      return { g, pct, w };
    });
    const kTag = label('keys', { size: 34, weight: 600, color: '#13753f', height: 0.3, pad: 4 });
    kTag.position.set(-1.0, -1.0, 0.2);
    tokens[0].g.add(kTag);
    ctx.round(round + 1, ROUNDS.length);
    ctx.goal(`“…because it was too <b>${r.words[r.words.length - 1]}</b>.” Turn the query of “it” until ≥ ${NEED * 100}% of its attention goes to <b>${r.target}</b>.`);
    refresh();
  }

  function turn(d) {
    q = (q + d + 360) % 360;
    ctx.sound.pop();
    refresh();
    const r = ROUNDS[round];
    if (solved(r, q)) {
      ctx.sound.gem();
      stage.fx.burst(tokens[r.words.indexOf(r.target)].g.position.clone().setY(1), PALETTE, 26, 4);
      round++;
      if (round >= ROUNDS.length) ctx.win();
      else {
        ctx.toast(`“it” → ${r.target}! Now the sentence changes…`, 'good');
        ctx.busy = true;
        setTimeout(() => { ctx.busy = false; setRound(); }, 900);
      }
    }
  }

  function refresh() {
    const r = ROUNDS[round];
    const w = weights(r, q);
    beams.children.forEach((c) => { c.geometry.dispose(); c.material.dispose(); });
    beams.clear();
    const itPos = tokens[r.words.indexOf('it')].g.position;
    tokens.forEach((t, i) => {
      setLabel(t.pct, `${Math.round(w[i] * 100)}%`, { size: 44, weight: 700, color: w[i] >= 0.15 ? '#a87400' : '#4f6b55', height: 0.34, pad: 4 });
      if (t.w === 'it' && w[i] < 0.02) return;
      const a = itPos.clone().setY(0.45);
      const b = t.g.position.clone().setY(0.45);
      const mid = a.clone().lerp(b, 0.5).setY(1.0 + Math.abs(a.x - b.x) * 0.25);
      if (t.w === 'it') mid.set(a.x, 1.6, 0.6);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.02 + w[i] * 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.25 + w[i] * 0.75, depthWrite: false }));
      beams.add(tube);
    });
    const ti = r.words.indexOf(r.target);
    ctx.status(`softmax(q·k × ${SCALE}) · query at <b>${q}°</b> · attention on <b>${r.target}</b>: <b class="${w[ti] >= NEED ? 'ok' : ''}">${Math.round(w[ti] * 100)}%</b> (goal ≥ ${NEED * 100}%)`);
  }

  return {
    update(dt) {
      let d = q - shownQ;
      d = ((d + 540) % 360) - 180;
      shownQ += d * (1 - Math.exp(-dt * 10));
      const itPos = tokens[ROUNDS[Math.min(round, ROUNDS.length - 1)].words.indexOf('it')]?.g.position;
      if (!itPos) return;
      const a = THREE.MathUtils.degToRad(shownQ);
      const o = new THREE.Vector3(itPos.x, -2.0, 0.2);
      qArrow.set(o, o.clone().add(new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0)));
      qTag.position.set(itPos.x, -2.95, 0.3);
    },
  };
}
