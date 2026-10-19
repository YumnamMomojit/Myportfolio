// Mixed-precision quantization: squeeze layers to fit GPU memory without wrecking accuracy.
import * as THREE from 'three';
import { box, candyMat, textPlane, label, setLabel, C, PALETTE } from '../kit.js';

// A 7B model simplified into 8 equal groups of layers.
const GROUPS = ['embeddings', 'block group 1', 'block group 2', 'block group 3', 'block group 4', 'block group 5', 'block group 6', 'output head'];
const SENS = [3.0, 0.4, 0.3, 0.3, 0.3, 0.4, 0.6, 3.5]; // accuracy points lost at 4-bit
const PARAMS = 0.875e9;
const BASE = 70.0;
const MEM_MAX = 5.0;
const ACC_MIN = 67.0;
const LEVEL_COLORS = { 16: C.blue, 8: C.green, 4: C.orange };

const memory = (bits) => bits.reduce((s, b) => s + (PARAMS * b) / 8 / 1e9, 0);
const accuracy = (bits) => BASE - bits.reduce((s, b, i) => s + (b === 16 ? 0 : b === 8 ? 0.05 * SENS[i] : SENS[i]), 0);

export default function quant(ctx) {
  const { stage } = ctx;
  const bits = GROUPS.map(() => 16);
  let sel = 0;
  const H = 0.62;

  const slabs = GROUPS.map((name, i) => {
    const g = new THREE.Group();
    g.position.set(-1.2, (i - (GROUPS.length - 1) / 2) * (H + 0.12), 0);
    const vox = new THREE.Group();
    g.add(vox);
    const tag = textPlane(name, { size: 36, weight: 700, color: '#15331f', height: 0.3, pad: 4, align: 'left' });
    tag.position.set(-3.3 - tag.geometry.parameters.width / 2 + 0.2, 0, 0.2);
    const bitTag = label('', { size: 38, weight: 700, color: '#ffffff', bg: '#168a4c', height: 0.32, pad: 8, radius: 12 });
    bitTag.position.set(2.0, 0, 0.3);
    const sens = box(Math.max(0.08, SENS[i] * 0.55), 0.22, 0.2, C.red, 0.06);
    sens.position.set(2.8 + Math.max(0.08, SENS[i] * 0.55) / 2, 0, 0);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(3.4, H, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    g.add(tag, bitTag, sens, hit);
    stage.root.add(g);
    stage.clickable(g, () => select(i));
    return { g, vox, bitTag };
  });
  const sensTag = label('sensitivity', { size: 34, weight: 700, color: '#ff4d6d', height: 0.3, pad: 4 });
  sensTag.position.set(3.6, slabs[GROUPS.length - 1].g.position.y + 0.65, 0.2);
  stage.root.add(sensTag);
  const cursor = label('▶', { size: 50, weight: 700, color: '#f5b301', height: 0.4, pad: 2 });
  stage.root.add(cursor);

  stage.frame({ target: [0.2, 0, 0], w: 13.5, h: GROUPS.length * (H + 0.12) + 1.4, yaw: 0, pitch: 0.12 });

  const one = ctx.ui.group('Selected layer:');
  [16, 8, 4].forEach((b) => ctx.ui.button(`${b}-bit`, () => setBits([sel], b), { parent: one, cls: { 16: 'blue', 8: 'green', 4: 'orange' }[b] + ' small', cost: 1 }));
  const all = ctx.ui.group('All layers:');
  [16, 8, 4].forEach((b) => ctx.ui.button(`all ${b}-bit`, () => setBits(GROUPS.map((_, i) => i), b), { parent: all, cls: 'ghost small', cost: 1 }));
  GROUPS.forEach((_, i) => draw(i));
  select(0, true);
  status();

  function select(i, quiet) {
    if (ctx.over) return;
    sel = i;
    cursor.position.set(slabs[i].g.position.x - 1.95, slabs[i].g.position.y, 0.4);
    if (!quiet) ctx.sound.click();
  }

  function setBits(list, b) {
    list.forEach((i) => { bits[i] = b; draw(i); });
    ctx.sound.pop();
    status();
    if (memory(bits) <= MEM_MAX + 1e-9 && accuracy(bits) >= ACC_MIN - 1e-9) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(-1.2, 0, 0.6), PALETTE, 30, 4);
      ctx.win({ note: `${memory(bits).toFixed(2)} GB, ${accuracy(bits).toFixed(1)}% accuracy.` });
    }
  }

  // Each slab is a grid of voxels: fewer bits, chunkier voxels.
  function draw(i) {
    const s = slabs[i];
    s.vox.children.forEach((c) => c.geometry.dispose());
    s.vox.clear();
    const n = bits[i] / 2;
    const w = 3.2 / n;
    const geo = new THREE.BoxGeometry(w * 0.9, H * 0.9, 0.45);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geo, candyMat(LEVEL_COLORS[bits[i]]));
      m.position.set(-1.6 + w * (k + 0.5), 0, 0);
      s.vox.add(m);
    }
    setLabel(s.bitTag, `${bits[i]}-bit`, { size: 38, weight: 700, color: '#ffffff', bg: '#' + new THREE.Color(LEVEL_COLORS[bits[i]]).getHexString(), height: 0.32, pad: 8, radius: 12 });
  }

  function status() {
    const m = memory(bits);
    const a = accuracy(bits);
    ctx.status(`GPU memory <b class="${m <= MEM_MAX ? 'ok' : 'bad'}">${m.toFixed(2)} GB</b> (≤ ${MEM_MAX}) · accuracy <b class="${a >= ACC_MIN ? 'ok' : 'bad'}">${a.toFixed(1)}%</b> (≥ ${ACC_MIN}) · click a layer to select it`);
  }

  return {
    update() {
      cursor.position.x = slabs[sel].g.position.x - 1.95 + Math.sin(performance.now() / 200) * 0.06;
    },
  };
}
