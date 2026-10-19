// Swap candy tiles into the right order (code lines, pipeline steps, traces).
import * as THREE from 'three';
import { box, candy, label, textPlane, mulberry32, shuffle, PALETTE, FONT, MONO, C } from '../kit.js';

export default function order(ctx) {
  const { stage, params } = ctx;
  const lines = params.lines;
  const n = lines.length;
  const rng = mulberry32(params.seed ?? 1);

  // perm[slot] = index of the line sitting in that slot
  let perm = [];
  for (let t = 0; t < 300; t++) {
    perm = shuffle([...Array(n).keys()], rng);
    if (perm.filter((v, i) => v === i).length <= (n > 5 ? 1 : 0)) break;
  }
  const par = n - cycles(perm);
  ctx.budget({ par, moves: par + (params.extra ?? 4) });

  const H = 0.74;
  const STEP = H + 0.2;
  const slotY = (s) => ((n - 1) / 2 - s) * STEP;
  const colors = shuffle(PALETTE, rng);

  const texts = lines.map((l) => textPlane(l, {
    font: params.mono ? MONO : FONT, size: params.mono ? 44 : 50, weight: params.mono ? 500 : 600,
    color: '#15331f', align: 'left', height: 0.4, pad: 10,
  }));
  const textW = Math.max(...texts.map((t) => t.geometry.parameters.width));
  const W = Math.max(5.5, textW + 1.3);

  const tiles = lines.map((_, i) => {
    const g = new THREE.Group();
    const body = box(W, H, 0.42, C.white, 0.2);
    const handle = candy('bean', colors[i % colors.length], 0.62);
    handle.position.set(-W / 2 + 0.42, 0, 0.18);
    const t = texts[i];
    t.position.set(-W / 2 + 0.85 + t.geometry.parameters.width / 2, 0, 0.23);
    g.add(body, handle, t);
    g.userData.line = i;
    stage.root.add(g);
    stage.clickable(g, () => pickTile(g));
    return g;
  });

  // slot numbers on the left
  for (let s = 0; s < n; s++) {
    const num = label(String(s + 1), { size: 54, weight: 700, color: '#ffffff', stroke: '#123d24', height: 0.42, pad: 6 });
    num.position.set(-W / 2 - 0.55, slotY(s), 0);
    stage.root.add(num);
  }

  perm.forEach((line, s) => tiles[line].position.set(0, slotY(s), 0));
  stage.frame({ target: [0, 0, 0], w: W + 1.8, h: n * STEP + 0.4, yaw: 0, pitch: 0.18 });

  let sel = null;
  function pickTile(g) {
    if (ctx.over || ctx.busy) return;
    if (!sel) {
      sel = g;
      ctx.sound.pickup();
      stage.tweens.add(0.18, (k) => { g.position.z = k * 0.5; g.scale.setScalar(1 + k * 0.04); });
      return;
    }
    if (sel === g) {
      deselect(g);
      sel = null;
      return;
    }
    if (!ctx.move()) return;
    swap(sel, g);
    sel = null;
  }

  function deselect(g) {
    stage.tweens.add(0.18, (k) => { g.position.z = 0.5 * (1 - k); g.scale.setScalar(1.04 - k * 0.04); });
  }

  async function swap(a, b) {
    ctx.busy = true;
    const sa = perm.indexOf(a.userData.line);
    const sb = perm.indexOf(b.userData.line);
    [perm[sa], perm[sb]] = [perm[sb], perm[sa]];
    ctx.sound.whoosh();
    const ya = a.position.y;
    const yb = b.position.y;
    await Promise.all([
      stage.tweens.add(0.42, (k) => { a.position.set(Math.sin(k * Math.PI) * 0.6, ya + (yb - ya) * k, 0.5 * (1 - k)); a.scale.setScalar(1.04 - 0.04 * k); }),
      stage.tweens.add(0.42, (k) => { b.position.set(-Math.sin(k * Math.PI) * 0.6, yb + (ya - yb) * k, Math.sin(k * Math.PI) * 0.3); }),
    ]);
    ctx.busy = false;
    check();
  }

  function check() {
    const ok = perm.filter((v, i) => v === i).length;
    ctx.status(`<b>${ok}</b> of ${n} in the right place`);
    if (ok === n) {
      ctx.sound.collect();
      tiles.forEach((t, i) => stage.tweens.add(0.3, (k) => (t.position.z = Math.sin(k * Math.PI) * 0.6), undefined, i * 0.08)
        .then(() => stage.fx.burst(t.position.clone().setX(-W / 2 + 0.4), PALETTE, 10, 3)));
      ctx.win();
    }
  }

  ctx.ui.button('🔀 Clear selection', () => { if (sel) deselect(sel); sel = null; }, { cls: 'ghost small' });
  check();
}

function cycles(perm) {
  const seen = new Array(perm.length).fill(false);
  let c = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    c++;
    for (let j = i; !seen[j]; j = perm[j]) seen[j] = true;
  }
  return c;
}
