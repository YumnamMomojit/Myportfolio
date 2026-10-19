// Pack a context (or a handoff note): fit the token budget and keep everything needed.
// params: { capacity, items: [{ label, tokens, need?, bad? }], start: 'all' | 'none' }
import * as THREE from 'three';
import { box, candyMat, textPlane, label, setLabel, C, PALETTE } from '../../../shared/kit.js';

export default function pack(ctx) {
  const { stage, params } = ctx;
  const items = params.items;
  const cap = params.capacity;
  const inside = items.map(() => params.start === 'all');
  const ok = (v) => items.every((it, k) => (it.need ? v[k] : true) && (it.bad ? !v[k] : true)) && used(v) <= cap;
  const used = (v) => items.reduce((s, it, k) => s + (v[k] ? it.tokens : 0), 0);
  const par = items.filter((it, k) => (it.need && !inside[k]) || (it.bad && inside[k])).length;
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 3) });

  const fmt = (n) => n.toLocaleString('en-US');
  const tall = innerHeight > innerWidth; // phone in portrait: one column
  const ROW = 0.85;
  const COLX = tall ? [0, 0] : [-3.4, 3.6];
  const heads = ['📥 In the context', '🗑 Left out'].map((t, k) => {
    const l = label(t, { size: 44, weight: 700, color: '#ffffff', bg: k ? '#5f6b62' : '#13753f', height: 0.42, pad: 12, radius: 14 });
    l.position.set(COLX[k], 3.2, 0.2);
    stage.root.add(l);
    return l;
  });
  const cards = items.map((it, k) => {
    const g = new THREE.Group();
    const body = box(5.8, 0.8, 0.35, C.white, 0.18);
    const t = textPlane(it.label, { size: 36, weight: 600, color: '#15331f', height: 0.3, pad: 4 });
    t.scale.setScalar(Math.min(1, 4.2 / t.geometry.parameters.width));
    t.position.set(-0.6, 0, 0.19);
    const tok = textPlane(`${fmt(it.tokens)} t`, { size: 34, weight: 700, color: '#a87400', height: 0.28, pad: 4 });
    tok.position.set(2.3, 0, 0.19);
    g.add(body, t, tok);
    stage.root.add(g);
    stage.clickable(g, () => toggle(k));
    return { g, body };
  });

  // the token gauge
  const gaugeW = tall ? 6.4 : 12;
  const track = box(gaugeW, 0.36, 0.3, 0xe6efd9, 0.15);
  track.position.set(0.1, 4.0, 0);
  const fill = box(1, 0.34, 0.32, C.green, 0.14);
  const capMark = box(0.08, 0.7, 0.4, C.red, 0.03);
  const gaugeTag = label('', { size: 40, weight: 700, color: '#15331f', height: 0.38, pad: 6 });
  gaugeTag.position.set(0.1, 4.6, 0.3);
  stage.root.add(track, fill, capMark, gaugeTag);
  const scaleMax = Math.max(cap * 1.25, 1);

  stage.frame(tall ? { target: [0.1, -0.6, 0], w: 7.2, h: 12.6, yaw: 0, pitch: 0.1 } : { target: [0.1, 0.5, 0], w: 13.6, h: 9.8, yaw: 0, pitch: 0.12 });
  layout();

  function layout() {
    const rows = [0, 0];
    const nIn = inside.filter(Boolean).length;
    const outTop = tall ? 2.4 - (nIn + 0.9) * ROW : 2.4; // where the second list starts
    heads[1].position.y = tall ? outTop + 0.8 : 3.2;
    items.forEach((_, k) => {
      const col = inside[k] ? 0 : 1;
      const to = new THREE.Vector3(COLX[col], (col ? outTop : 2.4) - rows[col] * ROW, 0);
      rows[col]++;
      stage.tweens.move(cards[k].g, to, 0.35);
    });
    const u = used(inside);
    const w = Math.min(u / scaleMax, 1) * gaugeW;
    fill.scale.x = Math.max(w, 0.01);
    fill.position.set(0.1 - gaugeW / 2 + w / 2, 4.0, 0.02);
    fill.material = candyMat(u > cap ? C.red : C.green);
    capMark.position.set(0.1 - gaugeW / 2 + (cap / scaleMax) * gaugeW, 4.0, 0);
    setLabel(gaugeTag, `${fmt(u)} / ${fmt(cap)} tokens${u > scaleMax ? ' (way over!)' : ''}`, { size: 40, weight: 700, color: u > cap ? '#c9284b' : '#15331f', height: 0.38, pad: 6 });
    ctx.status(`<b>${fmt(u)}</b> of ${fmt(cap)} tokens · click a card to move it in or out`);
  }

  function toggle(k) {
    if (ctx.over || ctx.busy || !ctx.move()) return;
    inside[k] = !inside[k];
    ctx.sound.pop();
    const it = items[k];
    if (!inside[k] && it.need) ctx.toast(`⚠ The agent needs “${it.label}”.`, 'bad', 2600);
    if (inside[k] && it.bad) ctx.toast(`⚠ “${it.label}” is mostly noise for this step.`, 'bad', 2600);
    layout();
    if (ok(inside)) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(COLX[0], 1, 0.5), PALETTE, 30, 4);
      ctx.win({ note: `Packed ${fmt(used(inside))} tokens: everything needed, nothing wasted.` });
    }
  }
}
