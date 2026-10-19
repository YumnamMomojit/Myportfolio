// Calibrate an LLM judge against human graders: tune the pass threshold and fix its length bias.
import * as THREE from 'three';
import { box, candyMat, textPlane, label, setLabel, bfs, C, PALETTE } from '../../../shared/kit.js';

// Twelve agent answers: the human verdict, whether the answer is long, and the judge's
// score with a correctness-only rubric. The default judge adds +3 for long answers and −1 for short.
const ANSWERS = [
  { good: true, long: false, fair: 8 }, { good: true, long: false, fair: 7 }, { good: true, long: true, fair: 8 },
  { good: true, long: true, fair: 7 }, { good: true, long: false, fair: 9 }, { good: true, long: true, fair: 9 },
  { good: false, long: true, fair: 4 }, { good: false, long: true, fair: 3 }, { good: false, long: false, fair: 3 },
  { good: false, long: false, fair: 4 }, { good: false, long: true, fair: 5 }, { good: false, long: false, fair: 2 },
];
const THRESHOLDS = [3, 4, 5, 6, 7, 8, 9];
const NEED = 0.9;

const score = (a, fairRubric) => (fairRubric ? a.fair : Math.max(1, Math.min(10, a.fair + (a.long ? 3 : -1))));
const agreement = (t, fair) => ANSWERS.filter((a) => (score(a, fair) >= t) === a.good).length / ANSWERS.length;

export default function judge(ctx) {
  const { stage, params } = ctx;
  let ti = THRESHOLDS.indexOf(9);
  let fair = false;
  const par = bfs([ti, 0], ([i, f]) => [[i + 1, f], [i - 1, f], [i, 1 - f]].filter(([j]) => j >= 0 && j < THRESHOLDS.length),
    ([i, f]) => agreement(THRESHOLDS[i], !!f) >= NEED);
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 4) });

  const cards = ANSWERS.map((a, k) => {
    const g = new THREE.Group();
    g.position.set(((k % 6) - 2.5) * 2.15, k < 6 ? 1.6 : -1.6, 0);
    const h = a.long ? 2.3 : 1.3;
    const body = box(1.8, h, 0.3, C.white, 0.18);
    body.position.y = (h - 1.3) / 2;
    const lines = new THREE.Group();
    for (let j = 0; j < (a.long ? 7 : 3); j++) {
      const ln = box(1.3 - (j % 3) * 0.2, 0.08, 0.05, 0xcfe3c0, 0.02);
      const top = (h - 1.3) / 2 + h / 2;
      ln.position.set(-0.1 - (j % 3) * 0.05, top - 0.3 - j * 0.22, 0.17);
      lines.add(ln);
    }
    const human = label(a.good ? '👍' : '👎', { size: 50, height: 0.42, pad: 2 });
    human.position.set(-0.65, -0.95, 0.3);
    const sc = label('', { size: 44, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.38, pad: 8, radius: 12 });
    sc.position.set(0.45, -0.95, 0.3);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff2a55 }));
    ring.position.set(0.45, -0.95, 0.3);
    g.add(body, lines, human, sc, ring);
    stage.root.add(g);
    return { g, body, sc, ring };
  });
  const legend = label('👍/👎 = human grade · number = judge score · red ring = judge disagrees', { size: 34, weight: 600, color: '#4f6b55', height: 0.3, pad: 4 });
  legend.position.set(0, -3.3, 0.2);
  stage.root.add(legend);

  stage.frame({ target: [0, -0.1, 0], w: 13.4, h: 8, yaw: 0, pitch: 0.1 });

  ctx.ui.stepper('pass if score ≥', THRESHOLDS, ti, (_, i) => { ti = i; changed(); }, { cost: 1 });
  const rubric = ctx.ui.button('', () => { fair = !fair; changed(); }, { cls: 'ghost', cost: 1 });
  refresh();

  function changed() {
    ctx.sound.pop();
    refresh();
    if (agreement(THRESHOLDS[ti], fair) >= NEED) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 0, 0.5), PALETTE, 30, 4);
      ctx.win({ note: `The judge now agrees with humans on ${Math.round(agreement(THRESHOLDS[ti], fair) * 100)}% of answers.` });
    }
  }

  function refresh() {
    const t = THRESHOLDS[ti];
    ANSWERS.forEach((a, k) => {
      const s = score(a, fair);
      const pass = s >= t;
      setLabel(cards[k].sc, String(s), { size: 44, weight: 700, color: '#ffffff', bg: pass ? '#1c9e58' : '#c9284b', height: 0.38, pad: 8, radius: 12 });
      cards[k].ring.visible = pass !== a.good;
      cards[k].body.material = candyMat(a.long ? 0xfff1c2 : C.white);
    });
    rubric.innerHTML = `${fair ? '✅' : '⬜'} Rubric: judge correctness, ignore length <span class="cost">−1</span>`;
    rubric.className = `candy-btn ${fair ? 'green' : 'ghost'}`;
    const ag = agreement(t, fair);
    ctx.status(`Judge agrees with humans on <b class="${ag >= NEED ? 'ok' : ''}">${Math.round(ag * 100)}%</b> (goal ≥ ${NEED * 100}%) · long answers are the tall yellow cards`);
  }
}
