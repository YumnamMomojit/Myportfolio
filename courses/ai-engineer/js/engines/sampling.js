// Next-token sampling: temperature reshapes the odds, top-p cuts the tail.
import * as THREE from 'three';
import { box, candyMat, label, setLabel, textPlane, candy, bfs, PALETTE } from '../kit.js';

const TOKENS = [['mat', 3.2], ['floor', 2.6], ['sofa', 2.3], ['roof', 1.6], ['keyboard', 1.2], ['moon', 0.2], ['banana', -0.5], ['quantum', -1.2]];
const NONSENSE = ['moon', 'banana', 'quantum'];
const TS = [0.1, 0.3, 0.5, 0.7, 1.0, 1.3, 1.6, 2.0];
const PS = [0.4, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0];

export function probs(T, p) {
  const e = TOKENS.map(([, l]) => Math.exp(l / T));
  const z = e.reduce((a, b) => a + b, 0);
  const pr = e.map((v) => v / z);
  // nucleus: keep the smallest set of top tokens whose total reaches p
  const order = pr.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const keep = new Set();
  let cum = 0;
  for (const [v, i] of order) {
    keep.add(i);
    cum += v;
    if (p < 1 && cum >= p - 1e-12) break; // top-p = 1 keeps every token
  }
  const kz = [...keep].reduce((s, i) => s + pr[i], 0);
  return pr.map((v, i) => (keep.has(i) ? v / kz : 0));
}

const MISSIONS = [
  { text: 'Make the answer predictable: the top token must have <b>at least 90%</b> of the probability.', ok: (pr) => Math.max(...pr) >= 0.9 },
  { text: 'Make it creative but sensible: <b>at least 4 tokens with 8% or more</b>, and <b>moon, banana and quantum impossible</b> (0%).', ok: (pr) => pr.filter((v) => v >= 0.08).length >= 4 && NONSENSE.every((w) => pr[TOKENS.findIndex(([t]) => t === w)] === 0) },
];

export default function sampling(ctx) {
  const { stage, params } = ctx;
  let ti = 3, pi = PS.length - 1, round = 0;

  const par = bfs([ti, pi, 0], ([a, b, r]) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]]
    .filter(([x, y]) => x >= 0 && x < TS.length && y >= 0 && y < PS.length)
    .map(([x, y]) => {
      let rr = r;
      while (rr < MISSIONS.length && MISSIONS[rr].ok(probs(TS[x], PS[y]))) rr++;
      return [x, y, rr];
    }), (s) => s[2] >= MISSIONS.length);
  ctx.budget({ par, moves: par + (params.extra ?? 4) });

  const prompt = textPlane('The cat sat on the ____', { size: 60, weight: 700, color: '#15331f', bg: 'rgba(255,255,255,0.95)', height: 0.62, pad: 18, radius: 22 });
  prompt.position.set(0, 4.3, 0);
  stage.root.add(prompt);

  const GAP = 1.4;
  const bars = TOKENS.map(([w], i) => {
    const g = new THREE.Group();
    g.position.set((i - (TOKENS.length - 1) / 2) * GAP, -2.2, 0);
    const bar = box(1.0, 1, 0.8, PALETTE[i % PALETTE.length], 0.2);
    const name = textPlane(w, { size: 44, weight: 700, color: '#15331f', height: 0.34, pad: 4 });
    name.position.set(0, -0.35, 0.45);
    const pct = label('', { size: 44, weight: 700, color: '#15331f', height: 0.36, pad: 4 });
    const cut = label('✂', { size: 50, height: 0.42, pad: 4 });
    g.add(bar, name, pct, cut);
    stage.root.add(g);
    return { g, bar, pct, cut, h: 0.05, color: PALETTE[i % PALETTE.length] };
  });

  stage.frame({ target: [0, 0.9, 0], w: TOKENS.length * GAP + 0.6, h: 7.8, yaw: 0, pitch: 0.16 });

  const tStep = ctx.ui.stepper('temperature', TS, ti, (_, i) => { ti = i; changed(); }, { cost: 1 });
  const pStep = ctx.ui.stepper('top-p', PS, pi, (_, i) => { pi = i; changed(); }, { cost: 1 });
  ctx.ui.button('🎲 Sample a token', sample, { cls: 'orange' });
  setRound();

  function setRound() {
    ctx.round(round + 1, MISSIONS.length);
    ctx.goal(MISSIONS[round].text);
    refresh();
  }

  function changed() {
    ctx.sound.pop();
    refresh();
    if (MISSIONS[round].ok(probs(TS[ti], PS[pi]))) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 1, 0.5), PALETTE, 30, 4);
      round++;
      while (round < MISSIONS.length && MISSIONS[round].ok(probs(TS[ti], PS[pi]))) round++;
      if (round >= MISSIONS.length) ctx.win();
      else {
        ctx.toast('Mission complete! Next mission…', 'good');
        setRound();
      }
    }
  }

  function refresh() {
    const pr = probs(TS[ti], PS[pi]);
    bars.forEach((b, i) => {
      b.target = 0.06 + pr[i] * 5.2;
      b.cut.visible = pr[i] === 0;
      b.bar.material = candyMat(pr[i] === 0 ? 0xd6dccb : b.color);
      setLabel(b.pct, pr[i] === 0 ? '0%' : `${(pr[i] * 100).toFixed(pr[i] < 0.1 ? 1 : 0)}%`, { size: 44, weight: 700, color: pr[i] === 0 ? '#9aa3b5' : '#15331f', height: 0.36, pad: 4 });
    });
    const kept = pr.filter((v) => v > 0).length;
    ctx.status(`T = <b>${TS[ti]}</b> divides the logits · top-p = <b>${PS[pi]}</b> keeps <b>${kept}</b> token${kept === 1 ? '' : 's'} · ✂ = cut by top-p`);
  }

  async function sample() {
    const pr = probs(TS[ti], PS[pi]);
    let r = Math.random();
    let k = 0;
    while (k < pr.length - 1 && (r -= pr[k]) > 0) k++;
    while (pr[k] === 0) k--;
    const word = TOKENS[k][0];
    ctx.busy = true;
    const c = candy('bean', bars[k].color, 0.9);
    const from = bars[k].g.position.clone().setY(bars[k].h - 2.0);
    const to = new THREE.Vector3(1.7, 3.45, 0.4);
    stage.root.add(c);
    ctx.sound.pickup();
    await stage.tweens.add(0.6, (t) => { c.position.lerpVectors(from, to, t); c.position.y += Math.sin(t * Math.PI) * 1.2; });
    stage.root.remove(c);
    setLabelPlane(word);
    ctx.busy = false;
  }

  let sampled = null;
  function setLabelPlane(word) {
    if (sampled) stage.root.remove(sampled);
    sampled = textPlane(word, { size: 60, weight: 700, color: '#ffffff', bg: '#f5b301', height: 0.55, pad: 14, radius: 18 });
    sampled.position.set(1.7, 3.45, 0.05);
    sampled.scale.setScalar(0.3);
    stage.root.add(sampled);
    stage.tweens.scale(sampled, 1, 0.35);
  }

  return {
    update(dt) {
      bars.forEach((b) => {
        b.h += ((b.target ?? 0.06) - b.h) * (1 - Math.exp(-dt * 8));
        b.bar.scale.y = b.h;
        b.bar.position.y = b.h / 2;
        b.pct.position.set(0, b.h + 0.35, 0.3);
        b.cut.position.set(0, b.h + 0.95, 0.3);
      });
    },
  };
}
