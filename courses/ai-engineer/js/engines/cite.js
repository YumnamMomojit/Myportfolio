// Ground an answer: cite the source behind each claim, trap the hallucinated ones.
import * as THREE from 'three';
import { box, candyMat, textPlane, label, setLabel, C, PALETTE } from '../kit.js';

// Nimbus Notes is a made-up app for this level.
const SOURCES = [
  'Nimbus Notes syncs every 5 minutes on the\nfree plan, and instantly on Pro.',
  'Pro costs $4 a month. Students get Pro\nfree with a school email address.',
  'Notes are encrypted on your device\nbefore they are uploaded.',
];
const CLAIMS = [
  ['The free plan syncs every 5 minutes.', 0],
  ['Nimbus Notes has 10 million users.', -1],
  ['Pro syncs instantly.', 0],
  ['Students can get Pro for free.', 1],
  ['Pro includes 1 TB of storage.', -1],
  ['Your notes are encrypted before upload.', 2],
];
const SRC_COLORS = [C.blue, C.orange, C.green];

export default function cite(ctx) {
  const { stage } = ctx;
  let sel = -1;
  const done = CLAIMS.map(() => false);
  // Side by side on wide screens; claims above sources on tall (phone) screens.
  const tall = innerHeight > innerWidth;
  const claimPos = (i) => (tall ? [0, 6.4 - i * 0.95] : [-3.1, 2.4 - i * 1.0]);
  const srcPos = (i) => (tall ? [0, -0.4 - i * 1.6] : [4.1, 2.3 - i * 1.75]);
  const trapPos = tall ? [0, -5.1] : [4.1, -3.2];
  const SW = tall ? 6.2 : 4.4; // source card width

  const q = textPlane('Q: “What do I get with Nimbus Notes Pro?”', { size: 44, weight: 700, color: '#ffffff', bg: '#13753f', height: 0.42, pad: 14, radius: 16 });
  q.position.set(tall ? 0 : -3.1, tall ? 7.45 : 3.55, 0);
  stage.root.add(q);

  const claims = CLAIMS.map(([text], i) => {
    const g = new THREE.Group();
    g.position.set(...claimPos(i), 0);
    const card = box(6.2, 0.8, 0.35, C.white, 0.2);
    const t = textPlane(text, { size: 40, weight: 600, color: '#15331f', height: 0.36, pad: 4 });
    t.position.set(-0.2, 0, 0.19);
    const tag = label('', { size: 40, weight: 700, color: '#ffffff', bg: '#2fcf78', height: 0.36, pad: 8, radius: 12 });
    tag.position.set(2.75, 0, 0.35);
    tag.visible = false;
    g.add(card, t, tag);
    stage.root.add(g);
    stage.clickable(g, () => pickClaim(i));
    return { g, card, tag };
  });

  const sources = SOURCES.map((text, i) => {
    const g = new THREE.Group();
    g.position.set(...srcPos(i), 0);
    const b = box(SW, 1.45, 0.5, SRC_COLORS[i], 0.2);
    const t = textPlane(text, { size: 34, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.94)', height: 0.28, pad: 10, radius: 10, align: 'left' });
    t.scale.setScalar(Math.min(1, (SW - 0.6) / t.geometry.parameters.width));
    t.position.set(0.1, 0, 0.27);
    const num = label(`[${i + 1}]`, { size: 44, weight: 700, color: '#ffffff', stroke: '#15331f', height: 0.38, pad: 4 });
    num.position.set(-SW / 2 - 0.25, 0.45, 0.4);
    g.add(b, t, num);
    stage.root.add(g);
    stage.clickable(g, () => pickTarget(i));
    return g;
  });

  const trap = new THREE.Group();
  trap.position.set(...trapPos, 0);
  const jar = box(SW, 1.0, 0.5, 0x4f6b55, 0.2);
  const jt = textPlane('👻 Ghost trap: no source says this', { size: 40, weight: 700, color: '#ffffff', height: 0.34, pad: 4 });
  jt.position.z = 0.27;
  trap.add(jar, jt);
  stage.root.add(trap);
  stage.clickable(trap, () => pickTarget(-1));

  stage.frame(tall ? { target: [-0.2, 1.15, 0], w: 7.4, h: 13.8, yaw: 0, pitch: 0.06 } : { target: [0.45, 0.1, 0], w: 14.4, h: 8.2, yaw: 0, pitch: 0.08 });
  status();

  function pickClaim(i) {
    if (ctx.over || ctx.busy || done[i]) return;
    if (sel >= 0) claims[sel].g.position.z = 0;
    sel = sel === i ? -1 : i;
    if (sel >= 0) {
      claims[sel].g.position.z = 0.45;
      ctx.sound.pickup();
    }
    status();
  }

  async function pickTarget(t) {
    if (ctx.over || ctx.busy) return;
    if (sel < 0) {
      ctx.toast('Pick a claim on the left first.', 'hint');
      return;
    }
    if (!ctx.move()) return;
    const i = sel;
    const c = claims[i];
    if (CLAIMS[i][1] === t) {
      done[i] = true;
      sel = -1;
      c.g.position.z = 0;
      ctx.sound.collect();
      if (t >= 0) {
        c.card.material = candyMat(0xd8ffe8);
        setLabel(c.tag, `[${t + 1}]`, { size: 40, weight: 700, color: '#ffffff', bg: '#' + new THREE.Color(SRC_COLORS[t]).getHexString(), height: 0.36, pad: 8, radius: 12 });
        c.tag.visible = true;
        stage.fx.burst(c.g.position.clone().setX(2), PALETTE, 14, 3);
      } else {
        ctx.busy = true;
        const from = c.g.position.clone();
        await stage.tweens.add(0.6, (k) => {
          c.g.position.lerpVectors(from, trap.position.clone().setZ(0.4), k);
          c.g.scale.setScalar(1 - k * 0.9);
        });
        c.g.visible = false;
        stage.unclickable(c.g);
        ctx.busy = false;
        ctx.sound.pop();
        stage.fx.burst(trap.position.clone(), [0xffffff, 0xb8d98a], 20, 3);
      }
      if (done.every(Boolean)) ctx.win();
    } else {
      ctx.sound.thud();
      const x = c.g.position.x;
      stage.tweens.add(0.35, (k) => (c.g.position.x = x + Math.sin(k * Math.PI * 6) * 0.15 * (1 - k)));
      ctx.toast(t < 0 ? 'A source does support this claim. Find it!' : `Source [${t + 1}] doesn’t say that.`, 'bad');
    }
    status();
  }

  function status() {
    const left = done.filter((d) => !d).length;
    ctx.status(sel >= 0 ? `Now click the source that supports “${CLAIMS[sel][0]}”, or the ghost trap.` : `${left} claim${left === 1 ? '' : 's'} left to check · click a claim, then its source`);
  }
}
