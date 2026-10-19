// Sort cards into bins: each card rides the belt in and the player picks its bin.
// params: { bins: [{ id, label }], items: [{ text, bin, why, src? }], shields = 3 }
import * as THREE from 'three';
import { box, textPlane, label, setLabel, C, PALETTE } from '../../../shared/kit.js';

const BIN_COLORS = [C.blue, C.pink, C.purple, C.orange];
const BTN_CLS = ['blue', '', 'purple', 'orange'];

export default function sort(ctx) {
  const { stage, params } = ctx;
  const bins = params.bins;
  const items = params.items;
  const maxShields = params.shields ?? 3;
  ctx.budget({ moves: items.length, par: null, stars: 'engine' });
  let i = 0;
  let shields = maxShields;
  let mistakes = 0;
  const tall = innerHeight > innerWidth; // phone in portrait: a narrower layout
  const SW = tall ? 7.4 : 14; // scene width

  const belt = box(SW, 0.3, 1.6, 0x3e5446, 0.12);
  belt.position.set(0, -0.2, 0);
  stage.root.add(belt);

  const BW = Math.min(3.4, (SW - 0.5) / bins.length - 0.3);
  const binObjs = bins.map((b, k) => {
    const g = new THREE.Group();
    g.position.set((k - (bins.length - 1) / 2) * (BW + 0.3), -2.3, 0.4);
    const body = box(BW, tall ? 1.5 : 1.2, 1.4, BIN_COLORS[k % BIN_COLORS.length], 0.25);
    const t = textPlane(b.label, { size: 44, weight: 700, color: '#ffffff', stroke: 'rgba(18,48,29,0.5)', height: 0.36, pad: 6 });
    t.scale.setScalar(Math.min(1, (BW - 0.3) / t.geometry.parameters.width));
    t.position.z = 0.72;
    g.add(body, t);
    stage.root.add(g);
    return g;
  });
  const shieldTag = label('', { size: 50, weight: 700, height: 0.48, pad: 6 });
  shieldTag.position.set(SW / 2 - 1.4, tall ? 3.9 : 2.9, 0);
  const counter = label('', { size: 40, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.38, pad: 10, radius: 14 });
  counter.position.set(-SW / 2 + 1.4, tall ? 3.9 : 2.9, 0);
  stage.root.add(shieldTag, counter);

  let card = null;
  stage.frame({ target: [0, tall ? 0.6 : 0.2, 0], w: SW + 0.2, h: tall ? 8.6 : 7.6, yaw: 0, pitch: 0.18 });

  const g = ctx.ui.group();
  bins.forEach((b, k) => ctx.ui.button(b.label, () => decide(k), { parent: g, cls: BTN_CLS[k % BTN_CLS.length], cost: 1 }));
  next();

  function next() {
    const it = items[i];
    card = new THREE.Group();
    const CW = tall ? 7.0 : 8.6;
    const body = box(CW, tall ? 3.0 : 2.2, 0.3, 0xffffff, 0.2);
    const txt = textPlane(wrap(it.text, tall ? 30 : 42), { size: 42, weight: 600, color: '#15331f', height: 0.36, pad: 6, align: 'left' });
    txt.scale.setScalar(Math.min(1, (CW - 0.6) / txt.geometry.parameters.width));
    txt.position.set(0, it.src ? -0.25 : 0, 0.17);
    card.add(body, txt);
    if (it.src) {
      const badge = textPlane(`from: ${it.src}`, { size: 40, weight: 700, color: '#ffffff', bg: it.src === 'User chat' ? '#c98a00' : '#13753f', height: 0.36, pad: 10, radius: 12 });
      badge.position.set(-CW / 2 + badge.geometry.parameters.width / 2 + 0.3, tall ? 1.1 : 0.7, 0.17);
      card.add(badge);
    }
    const cy = tall ? 1.7 : 1.15;
    card.position.set(-12, cy, 0.3);
    stage.root.add(card);
    stage.tweens.move(card, new THREE.Vector3(0, cy, 0.3), 0.55);
    refresh();
  }

  async function decide(k) {
    const it = items[i];
    const right = bins[k].id === it.bin;
    ctx.busy = true;
    const from = card.position.clone();
    const to = binObjs[k].position.clone().add(new THREE.Vector3(0, 0.4, 0));
    const c = card;
    await stage.tweens.add(0.45, (t) => {
      c.position.lerpVectors(from, to, t);
      c.position.y += Math.sin(t * Math.PI) * 1.2;
      c.scale.setScalar(1 - t * 0.8);
    });
    stage.root.remove(c);
    if (right) {
      ctx.sound.collect();
      stage.fx.burst(to, PALETTE, 14, 3);
      ctx.toast(`✔ ${it.why}`, 'good', 3000);
    } else {
      mistakes++;
      shields--;
      ctx.sound.thud();
      ctx.toast(`✘ That was <b>${bins.find((b) => b.id === it.bin).label}</b>. ${it.why}`, 'bad', 4800);
    }
    i++;
    ctx.busy = false;
    if (shields <= 0) {
      refresh();
      ctx.fail('Your shields are gone: too many cards went to the wrong bin. Read each one again and try once more.');
      return;
    }
    if (i >= items.length) {
      refresh();
      ctx.win({ stars: Math.max(1, 3 - mistakes), note: mistakes ? `${mistakes} mistake${mistakes > 1 ? 's' : ''}. Replay for a perfect run!` : 'A perfect sort!' });
      return;
    }
    next();
  }

  function refresh() {
    setLabel(shieldTag, '🛡'.repeat(Math.max(shields, 0)) + '▫'.repeat(maxShields - Math.max(shields, 0)), { size: 50, weight: 700, height: 0.48, pad: 6 });
    setLabel(counter, `card ${Math.min(i + 1, items.length)} / ${items.length}`, { size: 40, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.38, pad: 10, radius: 14 });
    ctx.status(`Mistakes <b>${mistakes}</b> · ★★★ needs a perfect run`);
  }
}

export function wrap(text, n) {
  const words = text.replace(/<[^>]+>/g, '').split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > n) { lines.push(line.trim()); line = w; } else line += ' ' + w;
  }
  lines.push(line.trim());
  return lines.join('\n');
}
