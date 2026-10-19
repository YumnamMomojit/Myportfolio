// Byte-pair encoding as a candy-matching game: merge neighbouring tokens everywhere at once.
import * as THREE from 'three';
import { box, label, textPlane, disposeTree, PALETTE, MONO } from '../kit.js';

export default function bpe(ctx) {
  const { stage, params } = ctx;
  const words = params.corpus.map(([w, n]) => ({ toks: w.split(''), n }));
  const merges = [];
  let sel = null; // { wi, ti }
  const rowGroups = [];

  const total = () => words.reduce((s, w) => s + w.toks.length * w.n, 0);
  const colorOf = (t) => {
    let h = 0;
    for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[(h + t.length * 3) % PALETTE.length];
  };
  const tileW = (t) => 0.5 + 0.34 * t.length;

  const ROW = 1.25;
  stage.frame({ target: [0.4, 0, 0], w: 10.5, h: words.length * ROW + 1.6, yaw: 0, pitch: 0.18 });
  build();

  function pairCount(a, b) {
    let c = 0;
    words.forEach((w) => { for (let i = 0; i + 1 < w.toks.length; i++) if (w.toks[i] === a && w.toks[i + 1] === b) c += w.n; });
    return c;
  }

  function build(merged = null) {
    rowGroups.forEach((g) => { stage.root.remove(g); disposeTree(g); });
    rowGroups.length = 0;
    stage.pickables = [];
    words.forEach((w, wi) => {
      const g = new THREE.Group();
      g.position.y = ((words.length - 1) / 2 - wi) * ROW;
      const widths = w.toks.map(tileW);
      const totalW = widths.reduce((a, b) => a + b + 0.12, -0.12);
      let x = -totalW / 2 - 0.8;
      w.toks.forEach((t, ti) => {
        const tile = new THREE.Group();
        const body = box(widths[ti], 0.85, 0.5, colorOf(t), 0.22);
        const txt = textPlane(t, { font: MONO, size: 56, weight: 700, color: '#ffffff', stroke: 'rgba(18,48,29,0.55)', height: 0.5, pad: 6 });
        txt.position.z = 0.27;
        tile.add(body, txt);
        tile.position.set(x + widths[ti] / 2, 0, 0);
        tile.userData = { wi, ti };
        x += widths[ti] + 0.12;
        g.add(tile);
        stage.clickable(tile, () => pick(wi, ti));
        if (merged && t === merged) {
          tile.scale.setScalar(0.4);
          stage.tweens.scale(tile, 1, 0.45);
        }
      });
      const cnt = label(`× ${w.n}`, { size: 50, weight: 700, color: '#15331f', bg: 'rgba(255,255,255,0.9)', height: 0.45, pad: 10, radius: 16 });
      cnt.position.set(4.3, 0, 0.2);
      g.add(cnt);
      stage.root.add(g);
      rowGroups.push(g);
    });
    status();
  }

  function tileAt(wi, ti) {
    return rowGroups[wi].children.find((c) => c.userData && c.userData.wi === wi && c.userData.ti === ti);
  }

  function pick(wi, ti) {
    if (ctx.over || ctx.busy) return;
    if (sel && sel.wi === wi && Math.abs(sel.ti - ti) === 1) {
      const [i, j] = sel.ti < ti ? [sel.ti, ti] : [ti, sel.ti];
      const a = words[wi].toks[i];
      const b = words[wi].toks[j];
      if (!ctx.move()) return;
      merge(a, b);
      return;
    }
    if (sel) lift(sel, false);
    if (sel && sel.wi === wi && sel.ti === ti) {
      sel = null;
      status();
      return;
    }
    sel = { wi, ti };
    lift(sel, true);
    ctx.sound.pickup();
    status();
  }

  function lift(s, up) {
    const t = tileAt(s.wi, s.ti);
    if (t) t.position.z = up ? 0.45 : 0;
  }

  function merge(a, b) {
    const before = total();
    words.forEach((w) => {
      const out = [];
      for (let i = 0; i < w.toks.length; i++) {
        if (i + 1 < w.toks.length && w.toks[i] === a && w.toks[i + 1] === b) {
          out.push(a + b);
          i++;
        } else out.push(w.toks[i]);
      }
      w.toks = out;
    });
    sel = null;
    merges.push(`${a}+${b}`);
    const saved = before - total();
    ctx.sound.collect();
    build(a + b);
    ctx.toast(`“${a}” + “${b}” → “${a + b}” saved <b>${saved}</b> tokens`, saved >= 6 ? 'good' : '', 2200);
    rowGroups.forEach((g) => g.children.forEach((t) => {
      if (t.userData?.wi !== undefined && words[t.userData.wi].toks[t.userData.ti] === a + b) stage.fx.burst(t.getWorldPosition(new THREE.Vector3()), PALETTE, 6, 2.5);
    }));
    if (total() <= params.target) {
      ctx.sound.gem();
      ctx.win({ note: `Merges learned: ${merges.join(', ')}. Corpus size: ${total()} tokens (from ${params.corpus.reduce((s, [w, n]) => s + w.length * n, 0)} letters).` });
    }
  }

  function status() {
    let extra = '';
    if (sel) {
      const w = words[sel.wi].toks;
      const opts = [];
      if (sel.ti > 0) opts.push(`“${w[sel.ti - 1]}${w[sel.ti]}” appears <b>${pairCount(w[sel.ti - 1], w[sel.ti])}</b>×`);
      if (sel.ti + 1 < w.length) opts.push(`“${w[sel.ti]}${w[sel.ti + 1]}” appears <b>${pairCount(w[sel.ti], w[sel.ti + 1])}</b>×`);
      extra = ` · ${opts.join(' · ')}`;
    }
    ctx.status(`Tokens <b>${total()}</b> · goal ≤ <b>${params.target}</b> · merges ${merges.length}${extra}`);
  }
}
