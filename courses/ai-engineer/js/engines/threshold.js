// Precision vs recall: slide a decision threshold over model scores.
import * as THREE from 'three';
import { box, candy, label, setLabel, bfs, C, PALETTE } from '../../../shared/kit.js';

const POS = [0.97, 0.92, 0.88, 0.81, 0.74, 0.66, 0.58, 0.45, 0.33];
const NEG = [0.71, 0.52, 0.41, 0.36, 0.28, 0.22, 0.15, 0.12, 0.07, 0.04, 0.02];
const TS = [...Array(19)].map((_, i) => +((i + 1) * 0.05).toFixed(2)); // 0.05 … 0.95
const MOVES = [-2, -1, 1, 2];

function metrics(t) {
  const tp = POS.filter((s) => s >= t).length;
  const fp = NEG.filter((s) => s >= t).length;
  const fn = POS.length - tp;
  const tn = NEG.length - fp;
  return { tp, fp, fn, tn, p: tp + fp ? tp / (tp + fp) : 1, r: tp / POS.length };
}

const MISSIONS = [
  { text: '<b>Spam filter:</b> catch most spam (recall ≥ 75%) but rarely junk a real email (precision ≥ 85%).', ok: (m) => m.r >= 0.75 && m.p >= 0.85 },
  { text: '<b>Malware scanner:</b> catch every threat (recall 100%) and keep precision ≥ 60%.', ok: (m) => m.r >= 1 && m.p >= 0.6 },
];

export default function threshold(ctx) {
  const { stage, params } = ctx;
  let ti = TS.indexOf(0.9);
  let round = 0;

  const par = bfs([ti, 0], ([i, r]) => MOVES.map((d) => i + d).filter((j) => j >= 0 && j < TS.length).map((j) => {
    let rr = r;
    while (rr < MISSIONS.length && MISSIONS[rr].ok(metrics(TS[j]))) rr++;
    return [j, rr];
  }), (s) => s[1] >= MISSIONS.length);
  ctx.budget({ par, moves: par + (params.extra ?? 5) });

  const X = (s) => -6 + s * 12;
  const track = box(12.6, 0.18, 0.5, 0xfff1c2, 0.08);
  stage.root.add(track);
  for (let k = 0; k <= 10; k++) {
    const l = label((k / 10).toFixed(1), { size: 32, weight: 600, color: '#4f6b55', height: 0.28, pad: 2 });
    l.position.set(X(k / 10), -0.45, 0.3);
    stage.root.add(l);
  }
  const place = (scores, color, row) => scores.map((s) => {
    const c = candy('ball', color, 0.46);
    c.position.set(X(s), row, 0.2);
    stage.root.add(c);
    return c;
  });
  place(POS, C.red, 0.55);
  place(NEG, C.green, 1.15);
  const legend = label('red = spam / threat · green = harmless', { size: 34, weight: 600, color: '#15331f', height: 0.3, pad: 4 });
  legend.position.set(0, 2.0, 0.2);
  stage.root.add(legend);

  // flagged zone and the threshold wall
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.2), new THREE.MeshBasicMaterial({ color: 0xf5b301, transparent: true, opacity: 0.12, depthWrite: false }));
  zone.position.set(0, 0.8, 0);
  stage.root.add(zone);
  const wall = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const seg = box(0.12, 0.42, 0.3, k % 2 ? C.white : C.red, 0.04);
    seg.position.y = -0.1 + k * 0.42;
    wall.add(seg);
  }
  const flagTag = label('flagged →', { size: 36, weight: 700, color: '#a87400', height: 0.32, pad: 4 });
  flagTag.position.set(0.95, 2.45, 0.2);
  wall.add(flagTag);
  stage.root.add(wall);

  const matrix = label('', { size: 36, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.95)', height: 1.0, pad: 14, radius: 16 });
  matrix.position.set(0, -2.1, 0.2);
  stage.root.add(matrix);

  stage.frame({ target: [0, 0.1, 0], w: 13.4, h: 6.6, yaw: 0, pitch: 0.12 });

  MOVES.forEach((d) => ctx.ui.button(`${d < 0 ? '◀' : '▶'} ${d < 0 ? '−' : '+'}${(Math.abs(d) * 0.05).toFixed(2)}`, () => shift(d), { cls: Math.abs(d) === 2 ? 'purple' : 'blue', cost: 1 }));
  let shown = TS[ti];
  setRound();

  function setRound() {
    ctx.round(round + 1, MISSIONS.length);
    ctx.goal(MISSIONS[round].text);
    refresh();
  }

  function shift(d) {
    const j = ti + d;
    if (j < 0 || j >= TS.length) {
      ctx.refund(1);
      ctx.toast('The threshold can’t go further that way.', 'hint');
      return;
    }
    ti = j;
    ctx.sound.pop();
    refresh();
    const m = metrics(TS[ti]);
    if (MISSIONS[round].ok(m)) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(X(TS[ti]), 1, 0.4), PALETTE, 26, 4);
      round++;
      while (round < MISSIONS.length && MISSIONS[round].ok(m)) round++;
      if (round >= MISSIONS.length) ctx.win();
      else {
        ctx.toast('Mission met! Next mission…', 'good');
        setRound();
      }
    }
  }

  function refresh() {
    const m = metrics(TS[ti]);
    setLabel(matrix, `flagged: ${m.tp} spam ✔ + ${m.fp} harmless ✘\nmissed: ${m.fn} spam · cleared: ${m.tn} harmless`, { size: 36, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.95)', height: 1.0, pad: 14, radius: 16 });
    ctx.status(`threshold <b>${TS[ti].toFixed(2)}</b> · precision = TP/(TP+FP) = <b>${Math.round(m.p * 100)}%</b> · recall = TP/(TP+FN) = <b>${Math.round(m.r * 100)}%</b>`);
  }

  return {
    update(dt) {
      shown += (TS[ti] - shown) * (1 - Math.exp(-dt * 10));
      wall.position.set(X(shown), 0, 0.25);
      const w = X(1) - X(shown) + 0.3;
      zone.scale.x = w;
      zone.position.x = X(shown) + w / 2;
    },
  };
}
