// Reviewer agents vote on answers; choose how many flags it takes to reject one.
import * as THREE from 'three';
import { box, candy, candyMat, textPlane, label, setLabel, bfs, C, PALETTE } from '../../../shared/kit.js';

// Eight answers whose real quality was audited by humans, and how many of 3 reviewers flagged each.
const ANSWERS = [
  { good: false, flags: 3 }, { good: true, flags: 0 }, { good: false, flags: 2 }, { good: true, flags: 1 },
  { good: false, flags: 1 }, { good: true, flags: 0 }, { good: false, flags: 2 }, { good: true, flags: 1 },
];
const KS = [1, 2, 3];
const outcome = (k) => {
  const rejected = ANSWERS.map((a) => a.flags >= k);
  return {
    caught: ANSWERS.filter((a, i) => !a.good && rejected[i]).length,
    badTotal: ANSWERS.filter((a) => !a.good).length,
    wrongRejects: ANSWERS.filter((a, i) => a.good && rejected[i]).length,
  };
};
const MISSIONS = [
  { text: '<b>High stakes (medical advice):</b> reject <i>every</i> bad answer. Wrongly rejecting up to 2 good answers is acceptable.', ok: (o) => o.caught === o.badTotal && o.wrongRejects <= 2 },
  { text: '<b>Low stakes (blog drafts):</b> never reject a good answer, and still catch at least 2 bad ones.', ok: (o) => o.wrongRejects === 0 && o.caught >= 2 },
];

export default function vote(ctx) {
  const { stage, params } = ctx;
  let ki = 2;
  let round = 0;
  const par = bfs([ki, 0], ([i, r]) => [i - 1, i + 1].filter((j) => j >= 0 && j < KS.length).map((j) => {
    let rr = r;
    while (rr < MISSIONS.length && MISSIONS[rr].ok(outcome(KS[j]))) rr++;
    return [j, rr];
  }), ([, r]) => r >= MISSIONS.length);
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 4) });

  const cards = ANSWERS.map((a, i) => {
    const g = new THREE.Group();
    g.position.set((i % 4 - 1.5) * 3.1, i < 4 ? 1.5 : -1.5, 0);
    const body = box(2.7, 2.2, 0.3, C.white, 0.2);
    const title = textPlane(`Answer ${i + 1}`, { size: 38, weight: 700, color: '#15331f', height: 0.3, pad: 4 });
    title.position.set(0, 0.75, 0.17);
    const truth = label(a.good ? '✅ good' : '❌ bad', { size: 36, weight: 700, color: a.good ? '#13753f' : '#c9284b', height: 0.32, pad: 4 });
    truth.position.set(0, 0.25, 0.25);
    const dots = [0, 1, 2].map((j) => {
      const d = candy('ball', j < a.flags ? C.red : 0xbfc6b8, 0.38);
      d.position.set((j - 1) * 0.5, -0.35, 0.25);
      g.add(d);
      return d;
    });
    const verdict = label('', { size: 36, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.3, pad: 8, radius: 10 });
    verdict.position.set(0, -0.85, 0.3);
    g.add(body, title, truth, verdict);
    stage.root.add(g);
    return { g, body, verdict, dots };
  });
  const legend = label('red dots = reviewers that flagged a problem', { size: 34, weight: 600, color: '#4f6b55', height: 0.3, pad: 4 });
  legend.position.set(0, -3.25, 0.2);
  stage.root.add(legend);

  stage.frame({ target: [0, -0.1, 0], w: 13, h: 7.8, yaw: 0, pitch: 0.1 });

  ctx.ui.stepper('reject if flags ≥', KS, ki, (_, i) => { ki = i; changed(); }, { cost: 1 });
  setRound();

  function setRound() {
    ctx.round(round + 1, MISSIONS.length);
    ctx.goal(MISSIONS[round].text);
    refresh();
  }

  function changed() {
    ctx.sound.pop();
    refresh();
    if (MISSIONS[round].ok(outcome(KS[ki]))) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 0, 0.5), PALETTE, 26, 4);
      round++;
      while (round < MISSIONS.length && MISSIONS[round].ok(outcome(KS[ki]))) round++;
      if (round >= MISSIONS.length) ctx.win();
      else {
        ctx.toast('Rule fits! Now a different situation…', 'good');
        setRound();
      }
    }
  }

  function refresh() {
    const k = KS[ki];
    ANSWERS.forEach((a, i) => {
      const rej = a.flags >= k;
      const right = rej !== a.good;
      setLabel(cards[i].verdict, rej ? 'rejected' : 'accepted', { size: 36, weight: 700, color: '#ffffff', bg: rej ? '#c9284b' : '#1c9e58', height: 0.3, pad: 8, radius: 10 });
      cards[i].body.material = candyMat(right ? C.white : 0xffe8e3);
    });
    const o = outcome(k);
    ctx.status(`Rule: reject if <b>${k}</b> or more of 3 reviewers flag it · bad answers caught <b>${o.caught}/${o.badTotal}</b> · good answers wrongly rejected <b>${o.wrongRejects}</b>`);
  }
}
