// Read an agent trace as a waterfall of spans and click the step that caused the problem.
// params: { rounds: [{ q, spans: [{ name, ms, tokens, bad? }], why }] }
import * as THREE from 'three';
import { box, candyMat, textPlane, disposeTree, C, PALETTE } from '../../../shared/kit.js';

export default function trace(ctx) {
  const { stage, params } = ctx;
  const rounds = params.rounds;
  const par = rounds.length;
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 4) });
  let round = 0;
  let group = null;

  const tall = innerHeight > innerWidth; // phone in portrait: name above the bar
  const W = tall ? 7.4 : 13;
  stage.frame({ target: [0, 0, 0], w: W + 0.6, h: tall ? 9 : 7.4, yaw: 0, pitch: 0.12 });
  setRound();

  function setRound() {
    const r = rounds[round];
    if (group) { stage.root.remove(group); disposeTree(group); stage.pickables = []; }
    group = new THREE.Group();
    stage.root.add(group);
    ctx.round(round + 1, rounds.length);
    ctx.goal(r.q);
    const n = r.spans.length;
    const totalMs = r.spans.reduce((s, sp) => s + Math.max(sp.ms, 0), 0) || 1;
    const maxTok = Math.max(...r.spans.map((sp) => sp.tokens), 1);
    const ROW = tall ? Math.min(1.6, 8.2 / n) : Math.min(1.25, 6.2 / n);
    let t = 0;
    const barX0 = tall ? -W / 2 + 0.3 : -W / 2 + 5.2;
    const barW = tall ? W - 0.6 : W - 5.6;
    r.spans.forEach((sp, k) => {
      const g = new THREE.Group();
      const y = ((n - 1) / 2 - k) * ROW;
      g.position.set(0, y, 0);
      const row = box(W, ROW * 0.86, 0.25, k % 2 ? 0xf3f7e8 : C.white, 0.12);
      const name = textPlane(sp.name, { size: 34, weight: 600, color: '#15331f', height: 0.28, pad: 4, align: 'left' });
      name.scale.setScalar(Math.min(1, (tall ? W - 0.4 : 4.8) / name.geometry.parameters.width));
      name.position.set(-W / 2 + 0.2 + (name.geometry.parameters.width * name.scale.x) / 2, tall ? ROW * 0.2 : 0, 0.14);
      const w = Math.max((sp.ms / totalMs) * barW, 0.12);
      const bar = box(w, tall ? ROW * 0.2 : ROW * 0.42, 0.3, sp.ms > totalMs * 0.5 ? C.orange : C.blue, 0.08);
      bar.position.set(barX0 + (t / totalMs) * barW + w / 2, tall ? -ROW * 0.12 : 0.08, 0.15);
      const meta = textPlane(`${sp.ms.toLocaleString()} ms · ${sp.tokens.toLocaleString()} tok`, { size: 30, weight: 700, color: sp.tokens > maxTok * 0.5 ? '#a87400' : '#4f6b55', height: 0.22, pad: 2 });
      meta.position.set(barX0 + barW - (meta.geometry.parameters.width) / 2, tall ? -ROW * 0.33 : -ROW * 0.26, 0.15);
      t += Math.max(sp.ms, 0);
      g.add(row, name, bar, meta);
      group.add(g);
      stage.clickable(g, () => pick(k, g, row));
    });
    ctx.status('Click the step (row) where things went wrong. Long orange bars took most of the time.');
  }

  function pick(k, g, row) {
    if (ctx.over || ctx.busy || !ctx.move()) return;
    const r = rounds[round];
    if (r.spans[k].bad) {
      ctx.sound.gem();
      row.material = candyMat(C.green);
      stage.fx.burst(g.position.clone().setZ(0.5), PALETTE, 24, 4);
      ctx.toast(`✔ ${r.why}`, 'good', 5200);
      round++;
      if (round >= rounds.length) ctx.win();
      else {
        ctx.busy = true;
        setTimeout(() => { ctx.busy = false; setRound(); }, 1300);
      }
    } else {
      ctx.sound.thud();
      row.material = candyMat(0xffd6dd);
      ctx.toast('That step looks fine. Look for the first step that disagrees with the goal, or the one that ate the time or tokens.', 'bad', 3600);
    }
  }
}
