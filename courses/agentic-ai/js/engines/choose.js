// A path of decisions: at each stepping stone, pick what the agent should do next.
// params: { steps: [{ text, options, answer, why }], shields = 3 }
import * as THREE from 'three';
import { box, candy, candyMat, textPlane, label, setLabel, disposeTree, C, PALETTE } from '../../../shared/kit.js';
import { wrap } from './sort.js';

export default function choose(ctx) {
  const { stage, params } = ctx;
  const steps = params.steps;
  const maxShields = params.shields ?? 3;
  ctx.budget({ moves: steps.length + maxShields - 1, par: null, stars: 'engine' });
  let i = 0;
  let shields = maxShields;
  let mistakes = 0;
  const tall = innerHeight > innerWidth; // phone in portrait: a narrower layout
  const SW = tall ? 7.2 : 12;

  // stepping stones rising to the right
  const stonePos = (k) => new THREE.Vector3(-SW / 2 + k * (SW / Math.max(steps.length, 1)), -2.4 + k * 0.25, 0);
  const stones = [...Array(steps.length + 1)].map((_, k) => {
    const s = candy('disc', k === steps.length ? C.yellow : C.white, 1);
    s.scale.set(tall ? 1.1 : 1.6, 0.6, tall ? 1.1 : 1.6);
    s.position.copy(stonePos(k));
    stage.root.add(s);
    return s;
  });
  const flag = label('🏁', { size: 60, height: 0.6, pad: 4 });
  flag.position.copy(stonePos(steps.length)).add(new THREE.Vector3(0, 0.8, 0));
  stage.root.add(flag);

  const bot = new THREE.Group();
  const head = candy('ball', C.white, 0.8);
  const visor = box(0.56, 0.3, 0.2, C.ink, 0.1);
  visor.position.set(0, 0.04, 0.33);
  const eye = new THREE.MeshBasicMaterial({ color: 0x67f5ff });
  [-0.12, 0.12].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), eye); e.position.set(x, 0.05, 0.43); bot.add(e); });
  bot.add(head, visor);
  bot.position.copy(stonePos(0)).add(new THREE.Vector3(0, 0.7, 0));
  stage.root.add(bot);

  const shieldTag = label('', { size: 50, weight: 700, height: 0.48, pad: 6 });
  shieldTag.position.set(SW / 2 - 0.6, tall ? 4.6 : 3.4, 0);
  stage.root.add(shieldTag);

  let card = null;
  stage.frame({ target: [0, tall ? 0.9 : 0.4, 0], w: SW + 2.2, h: tall ? 9.4 : 8, yaw: 0, pitch: 0.12 });
  const opts = ctx.ui.group();
  show();

  function show() {
    const st = steps[i];
    if (card) { stage.root.remove(card); disposeTree(card); }
    card = new THREE.Group();
    const CW = tall ? 7.6 : 11.4;
    const txt = textPlane(wrap(st.text, tall ? 30 : 46), { size: 42, weight: 600, color: '#15331f', height: 0.36, pad: 8, align: 'left' });
    const s = Math.min(1, (CW - 0.9) / txt.geometry.parameters.width);
    txt.scale.setScalar(s);
    const h = txt.geometry.parameters.height * s + 0.6;
    const body = box(CW, Math.max(h, 1.4), 0.3, 0xffffff, 0.22);
    txt.position.z = 0.17;
    const step = label(`step ${i + 1} / ${steps.length}`, { size: 36, weight: 700, color: '#ffffff', bg: '#13753f', height: 0.32, pad: 10, radius: 12 });
    step.position.set(-CW / 2 + 1.0, Math.max(h, 1.4) / 2 + 0.1, 0.3);
    card.add(body, txt, step);
    card.position.set(0, tall ? 2.0 : 1.6, 0.2);
    stage.root.add(card);
    card.scale.setScalar(0.3);
    stage.tweens.scale(card, 1, 0.35);
    opts.innerHTML = '';
    st.options.forEach((o, k) => ctx.ui.button(o, () => decide(k), { parent: opts, cls: ['blue', '', 'purple', 'orange'][k % 4], cost: 1 }));
    refresh();
  }

  async function decide(k) {
    const st = steps[i];
    if (k === st.answer) {
      ctx.busy = true;
      ctx.sound.collect();
      stones[i].material = candyMat(C.green);
      const from = bot.position.clone();
      const to = stonePos(i + 1).add(new THREE.Vector3(0, 0.7, 0));
      await stage.tweens.add(0.5, (t) => { bot.position.lerpVectors(from, to, t); bot.position.y += Math.sin(t * Math.PI) * 1.0; });
      stage.fx.burst(to, PALETTE, 12, 3);
      ctx.toast(`✔ ${st.why}`, 'good', 3200);
      i++;
      ctx.busy = false;
      if (i >= steps.length) {
        refresh();
        ctx.win({ stars: Math.max(1, 3 - mistakes), note: mistakes ? `${mistakes} wrong turn${mistakes > 1 ? 's' : ''}. Replay for a perfect path!` : 'A perfect path!' });
        return;
      }
      show();
    } else {
      mistakes++;
      shields--;
      ctx.sound.thud();
      const x = bot.position.x;
      stage.tweens.add(0.35, (t) => (bot.position.x = x + Math.sin(t * Math.PI * 6) * 0.15 * (1 - t)));
      ctx.toast(`✘ Not quite. ${st.why}`, 'bad', 4800);
      refresh();
      if (shields <= 0) ctx.fail('Your shields are gone. Read each situation again and try once more.');
    }
  }

  function refresh() {
    setLabel(shieldTag, '🛡'.repeat(Math.max(shields, 0)) + '▫'.repeat(maxShields - Math.max(shields, 0)), { size: 50, weight: 700, height: 0.48, pad: 6 });
    ctx.status(`Step <b>${Math.min(i + 1, steps.length)}</b> of ${steps.length} · wrong turns <b>${mistakes}</b> · ★★★ needs a perfect path`);
  }

  return { update() { bot.rotation.y = Math.sin(performance.now() / 500) * 0.3; } };
}
