// LoRA parameter maths: pick a rank and target modules to hit an exact adapter size.
import * as THREE from 'three';
import { box, candyMat, textPlane, label, setLabel, bfs, C, PALETTE } from '../../../shared/kit.js';

const D = 4096;
const FF = 11008;
const LAYERS = 32;
const MODEL = 6.74e9;
const MODULES = [
  { name: 'q_proj', dims: [[D, D]] },
  { name: 'k_proj', dims: [[D, D]] },
  { name: 'v_proj', dims: [[D, D]] },
  { name: 'o_proj', dims: [[D, D]] },
  { name: 'mlp', dims: [[D, FF], [FF, D], [D, FF]] }, // gate, down and up projections
];
const RANKS = [1, 2, 4, 8, 16, 32, 64, 128];
const TARGETS = [4194304, 16777216];

const count = (r, mask) => MODULES.reduce((s, m, i) => (mask & (1 << i) ? s + LAYERS * m.dims.reduce((t, [a, b]) => t + r * (a + b), 0) : s), 0);
const fmt = (n) => n.toLocaleString('en-US');

export default function lora(ctx) {
  const { stage, params } = ctx;
  let ri = 2; // r = 4
  let mask = 1; // q_proj
  let round = 0;

  const par = bfs([ri, mask, 0], ([r, m, k]) => {
    const nx = [[r + 1, m], [r - 1, m], ...MODULES.map((_, i) => [r, m ^ (1 << i)])].filter(([a]) => a >= 0 && a < RANKS.length);
    return nx.map(([a, b]) => {
      let kk = k;
      while (kk < TARGETS.length && count(RANKS[a], b) === TARGETS[kk]) kk++;
      return [a, b, kk];
    });
  }, (s) => s[2] >= TARGETS.length);
  ctx.budget({ par, moves: par + (params.extra ?? 5) });

  const groups = MODULES.map((m, i) => {
    const g = new THREE.Group();
    g.position.set((i - 2) * 3.0, 0, 0);
    const W = box(2.0, 2.0, 0.25, 0xdff3e4, 0.12);
    const ice = label('❄ frozen W', { size: 34, weight: 700, color: '#0f5f33', height: 0.3, pad: 4 });
    ice.position.set(0, 0, 0.3);
    const B = box(0.1, 2.0, 0.3, C.pink, 0.04);
    const A = box(2.0, 0.1, 0.3, C.orange, 0.04);
    const name = textPlane(m.name, { size: 44, weight: 700, color: '#15331f', height: 0.36, pad: 4 });
    name.position.set(0, -1.95, 0.2);
    const tag = label('', { size: 34, weight: 600, color: '#4f6b55', height: 0.3, pad: 4 });
    tag.position.set(0, -2.45, 0.2);
    g.add(W, ice, B, A, name, tag);
    stage.root.add(g);
    return { g, W, B, A, tag };
  });
  const legend = textPlane('B (d × r)  ×  A (r × d) = a low-rank update added to W', { size: 40, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.9)', height: 0.36, pad: 12, radius: 14 });
  legend.position.set(0, 2.55, 0);
  stage.root.add(legend);

  stage.frame({ target: [0, -0.1, 0], w: 15.2, h: 6.6, yaw: 0, pitch: 0.18 });

  ctx.ui.stepper('rank r', RANKS, ri, (_, i) => { ri = i; changed(); }, { cost: 1 });
  const g = ctx.ui.group('adapt:');
  const toggles = MODULES.map((m, i) => ctx.ui.button(m.name, (b) => { mask ^= 1 << i; changed(); }, { parent: g, cls: 'small', cost: 1 }));
  setRound();

  function setRound() {
    ctx.round(round + 1, TARGETS.length);
    ctx.goal(`Train <b>exactly ${fmt(TARGETS[round])}</b> parameters with LoRA (a 7B model: ${LAYERS} layers, hidden size ${D}).`);
    refresh();
  }

  function changed() {
    ctx.sound.pop();
    refresh();
    if (count(RANKS[ri], mask) === TARGETS[round]) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 0.5, 0.5), PALETTE, 30, 4);
      round++;
      while (round < TARGETS.length && count(RANKS[ri], mask) === TARGETS[round]) round++;
      if (round >= TARGETS.length) ctx.win({ note: `Full fine-tuning would train all ${fmt(MODEL)} weights. Your adapter is ${(count(RANKS[ri], mask) / MODEL * 100).toFixed(2)}% of that.` });
      else {
        ctx.toast('Exact match! Next target…', 'good');
        setRound();
      }
    }
  }

  function refresh() {
    const r = RANKS[ri];
    const thick = 0.06 + Math.log2(r) * 0.07;
    groups.forEach((gr, i) => {
      const on = !!(mask & (1 << i));
      gr.B.visible = gr.A.visible = on;
      gr.B.scale.x = thick / 0.1;
      gr.A.scale.y = thick / 0.1;
      gr.B.position.set(-1.0 - thick / 2 - 0.08, 0, 0.1);
      gr.A.position.set(0, 1.0 + thick / 2 + 0.08, 0.1);
      gr.W.material = candyMat(on ? 0xdff3e4 : 0xeaeee2);
      const per = LAYERS * MODULES[i].dims.reduce((t, [a, b]) => t + r * (a + b), 0);
      setLabel(gr.tag, on ? `+${fmt(per)}` : 'off', { size: 34, weight: 600, color: on ? '#a87400' : '#9aa3b5', height: 0.3, pad: 4 });
      toggles[i].innerHTML = `${on ? '✅' : '⬜'} ${MODULES[i].name} <span class="cost">−1</span>`;
      toggles[i].className = `candy-btn small ${on ? 'green' : 'ghost'}`;
    });
    const n = count(r, mask);
    const t = TARGETS[round] ?? TARGETS[TARGETS.length - 1];
    ctx.status(`trainable = ${LAYERS} layers × Σ r·(d_in + d_out) = <b class="${n === t ? 'ok' : ''}">${fmt(n)}</b> · target <b>${fmt(t)}</b> · ${(n / MODEL * 100).toFixed(3)}% of the model`);
  }
}
