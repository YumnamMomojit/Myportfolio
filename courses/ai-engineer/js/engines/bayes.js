// Bayesian detective: flip the mystery coin, update beliefs, accuse when sure.
import * as THREE from 'three';
import { box, candy, label, setLabel, C, PALETTE } from '../kit.js';

const COLORS = [C.pink, C.blue, C.green, C.orange];

export default function bayes(ctx) {
  const { stage, params } = ctx;
  const S = params.suspects;
  const n = S.length;
  const truth = Math.floor(Math.random() * n);
  let belief = S.map(() => 1 / n);
  const flips = [];

  const gap = 2.2;
  const x0 = -((n - 1) * gap) / 2;
  const bars = S.map((s, i) => {
    const g = new THREE.Group();
    g.position.set(x0 + i * gap, -2.2, 0);
    const bar = box(1.3, 1, 1, COLORS[i], 0.2);
    const base = box(1.7, 0.3, 1.4, C.white, 0.12);
    base.position.y = -0.15;
    const name = label(s.name, { size: 46, weight: 700, color: '#15331f', bg: 'rgba(255,255,255,0.92)', height: 0.42, pad: 12, radius: 18 });
    name.position.set(0, -0.75, 0.5);
    const odds = label(`${Math.round(s.p * 100)}% heads`, { size: 38, weight: 600, color: '#4f6b55', height: 0.32, pad: 4 });
    odds.position.set(0, -1.25, 0.5);
    const pct = label('', { size: 52, weight: 700, color: '#ffffff', stroke: '#123d24', height: 0.5, pad: 6 });
    g.add(bar, base, name, odds, pct);
    stage.root.add(g);
    return { g, bar, pct, h: 0.01 };
  });

  // the coin
  const coin = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.14, 40), [
    new THREE.MeshPhysicalMaterial({ color: 0xe0a800, roughness: 0.3, metalness: 0.6, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.25, metalness: 0.5, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: 0xc9d1e0, roughness: 0.25, metalness: 0.6, clearcoat: 1 }),
  ]);
  disc.rotation.x = Math.PI / 2;
  coin.add(disc);
  const face = label('?', { size: 70, weight: 700, color: '#15331f', height: 0.6, pad: 4 });
  face.position.z = 0.12;
  coin.add(face);
  coin.position.set(0, 3.3, 0);
  stage.root.add(coin);

  const history = new THREE.Group();
  history.position.set(0, 1.9, 0);
  stage.root.add(history);

  const w = n * gap + 1;
  stage.frame({ target: [0, 0.6, 0], w, h: 8.6, yaw: 0, pitch: 0.12 });

  ctx.ui.button('🪙 Flip the coin', flip, { cls: 'orange big', cost: 1 });
  ctx.ui.break();
  const g = ctx.ui.group('Accuse:');
  S.forEach((s, i) => ctx.ui.button(s.name, () => accuse(i), { parent: g, cls: ['', 'blue', 'green', 'orange'][i] + ' small' }));
  update();

  async function flip() {
    const heads = Math.random() < S[truth].p;
    flips.push(heads);
    ctx.busy = true;
    ctx.sound.whoosh();
    setLabel(face, '', { size: 70, weight: 700, height: 0.6, pad: 4 });
    await stage.tweens.add(0.7, (k) => {
      coin.position.y = 3.3 + Math.sin(k * Math.PI) * 1.4;
      coin.rotation.x = k * Math.PI * 6;
    });
    coin.rotation.x = 0;
    setLabel(face, heads ? 'H' : 'T', { size: 70, weight: 700, color: '#15331f', height: 0.6, pad: 4 });
    disc.material[1].color.set(heads ? 0xffd23f : 0xc9d1e0);
    ctx.sound.pickup();
    // Bayes' rule: posterior ∝ likelihood × prior
    belief = belief.map((b, i) => b * (heads ? S[i].p : 1 - S[i].p));
    const z = belief.reduce((a, b) => a + b, 0);
    belief = belief.map((b) => b / z);
    const chip = candy('disc', heads ? 0xffd23f : 0xc9d1e0, 0.32);
    chip.rotation.x = Math.PI / 2;
    history.add(chip);
    history.children.forEach((c, k) => c.position.set((k - (history.children.length - 1) / 2) * 0.36, 0, 0));
    if (history.children.length > 22) history.scale.setScalar(22 / history.children.length);
    update();
    ctx.busy = false;
  }

  function accuse(i) {
    if (flips.length === 0) {
      ctx.toast('Flip the coin at least once first!', 'hint');
      return;
    }
    if (i === truth) {
      ctx.sound.gem();
      stage.fx.burst(bars[i].g.position.clone().setY(bars[i].h - 1.5), PALETTE, 30, 4);
      ctx.win({ note: `It was ${S[i].name}’s coin. You were ${Math.round(belief[i] * 100)}% sure after ${flips.length} flips.` });
    } else {
      ctx.fail(`Wrong! It was <b>${S[truth].name}</b>’s coin (${Math.round(S[truth].p * 100)}% heads). You gave ${S[i].name} ${Math.round(belief[i] * 100)}%, and ${S[truth].name} ${Math.round(belief[truth] * 100)}%.`);
    }
  }

  function update() {
    const h = flips.filter(Boolean).length;
    ctx.status(flips.length ? `Flips: <b>${flips.length}</b> · heads <b>${h}</b> · tails <b>${flips.length - h}</b> · share of heads <b>${Math.round((h / flips.length) * 100)}%</b>` : 'No flips yet: every gambler is equally likely.');
    bars.forEach((b, i) => setLabel(b.pct, `${Math.round(belief[i] * 100)}%`, { size: 52, weight: 700, color: '#ffffff', stroke: '#123d24', height: 0.5, pad: 6 }));
  }

  return {
    update(dt) {
      bars.forEach((b, i) => {
        const target = 0.15 + belief[i] * 4.2;
        b.h += (target - b.h) * (1 - Math.exp(-dt * 8));
        b.bar.scale.y = b.h;
        b.bar.position.y = b.h / 2;
        b.pct.position.set(0, b.h + 0.45, 0.5);
      });
      if (!ctx.busy) coin.rotation.y = Math.sin(performance.now() / 600) * 0.3;
    },
  };
}
