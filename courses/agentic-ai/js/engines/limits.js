// Guardrails: set step, time and spending limits plus a fallback, then run the test suite.
import * as THREE from 'three';
import { box, candy, textPlane, label, setLabel, C, PALETTE } from '../../../shared/kit.js';

const INF = Infinity;
// Normal tasks must finish; runaways must be stopped within 120 s and $1.00.
const TESTS = [
  { name: 'Summarise a ticket', steps: 8, secPerStep: 3, usdPerStep: 0.04 },
  { name: 'Research and reply', steps: 14, secPerStep: 3.5, usdPerStep: 0.04 },
  { name: 'Update a record', steps: 6, secPerStep: 3, usdPerStep: 0.03 },
  { name: 'Runaway: retries forever', steps: INF, secPerStep: 4, usdPerStep: 0.08, runaway: true },
  { name: 'Runaway: stuck on a slow tool', steps: INF, secPerStep: 20, usdPerStep: 0.01, runaway: true },
];
const STEPS = [5, 10, 20, 50, INF];
const TIMEOUTS = [10, 30, 60, 300, INF];
const BUDGETS = [0.1, 0.5, 1, 5, INF];
const fmt = (v, unit) => (v === INF ? '∞' : `${unit === '$' ? '$' : ''}${v}${unit === 's' ? ' s' : ''}`);

function simulate(t, lim) {
  // walk step by step until the task finishes or a limit stops it
  let sec = 0, usd = 0, n = 0;
  while (n < t.steps) {
    if (n >= lim.steps) return { stopped: 'step limit', sec, usd, n };
    if (sec + t.secPerStep > lim.timeout) return { stopped: 'timeout', sec, usd, n };
    if (usd + t.usdPerStep > lim.budget + 1e-9) return { stopped: 'budget', sec, usd, n };
    n++;
    sec += t.secPerStep;
    usd += t.usdPerStep;
    if (n > 2000) return { stopped: null, sec, usd, n, forever: true };
  }
  return { stopped: null, sec, usd, n };
}

export default function limits(ctx) {
  const { stage } = ctx;
  const lim = { steps: INF, timeout: INF, budget: INF };
  let fallback = false;

  const lanes = TESTS.map((t, i) => {
    const g = new THREE.Group();
    g.position.set(0, 2.2 - i * 1.15, 0);
    const track = box(8.4, 0.5, 0.2, t.runaway ? 0xffe8e3 : 0xe6efd9, 0.12);
    track.position.set(1.6, 0, -0.1);
    const name = textPlane(t.name, { size: 34, weight: 700, color: t.runaway ? '#c9284b' : '#15331f', height: 0.28, pad: 4 });
    name.scale.setScalar(Math.min(1, 4.2 / name.geometry.parameters.width));
    name.position.set(-4.9, 0, 0.1);
    const bot = candy('ball', t.runaway ? C.red : C.green, 0.42);
    bot.position.set(-2.6, 0, 0.3);
    const res = label('', { size: 34, weight: 700, color: '#15331f', height: 0.3, pad: 4 });
    res.position.set(6.6, 0, 0.3);
    g.add(track, name, bot, res);
    stage.root.add(g);
    return { g, bot, res };
  });
  stage.frame({ target: [0.9, -0.1, 0], w: 15.2, h: 7, yaw: 0, pitch: 0.1 });

  const g = ctx.ui.group();
  ctx.ui.stepper('max steps', STEPS, STEPS.length - 1, (v) => { lim.steps = v; }, { parent: g, format: (v) => fmt(v) });
  ctx.ui.stepper('timeout', TIMEOUTS, TIMEOUTS.length - 1, (v) => { lim.timeout = v; }, { parent: g, format: (v) => fmt(v, 's') });
  ctx.ui.stepper('budget', BUDGETS, BUDGETS.length - 1, (v) => { lim.budget = v; }, { parent: g, format: (v) => fmt(v, '$') });
  ctx.ui.break();
  const fb = ctx.ui.button('', () => { fallback = !fallback; drawFallback(); });
  ctx.ui.button('▶ Run the test suite', run, { cls: 'green', cost: 1 });
  drawFallback();
  ctx.status('Limits are free to change; each test run costs a move. Goal: normal tasks finish, runaways stop within 120 s and $1.00, and users get a fallback message.');

  function drawFallback() {
    fb.innerHTML = `${fallback ? '✅' : '⬜'} Fallback message when a limit stops a run`;
    fb.className = `candy-btn small ${fallback ? 'green' : 'ghost'}`;
  }

  async function run() {
    ctx.busy = true;
    const results = TESTS.map((t) => simulate(t, lim));
    let allOk = true;
    const problems = [];
    await Promise.all(TESTS.map((t, i) => {
      const r = results[i];
      const lane = lanes[i];
      const frac = t.runaway ? Math.min(r.n / 30, 1) : r.n / t.steps;
      let ok;
      let text;
      if (!t.runaway) {
        ok = !r.stopped;
        text = ok ? `✅ done in ${r.n} steps` : `❌ cut off by ${r.stopped}`;
        if (!ok) problems.push(`“${t.name}” was cut off by the ${r.stopped}`);
      } else {
        ok = !!r.stopped && r.sec <= 120 && r.usd <= 1 + 1e-9;
        text = r.forever || !r.stopped ? '❌ never stopped' : `${ok ? '✅' : '❌'} stopped after ${Math.round(r.sec)} s, $${r.usd.toFixed(2)}`;
        if (!ok) problems.push(`a runaway ${r.stopped ? `ran ${Math.round(r.sec)} s and cost $${r.usd.toFixed(2)}` : 'never stopped'}`);
      }
      if (!ok) allOk = false;
      setLabel(lane.res, text, { size: 34, weight: 700, color: ok ? '#13753f' : '#c9284b', height: 0.3, pad: 4 });
      return stage.tweens.add(1.1, (k) => lane.bot.position.set(-2.6 + 8.0 * frac * k, Math.abs(Math.sin(k * Math.PI * 4)) * 0.15, 0.3));
    }));
    ctx.busy = false;
    if (allOk && !fallback) {
      allOk = false;
      problems.push('stopped runs end in silence: switch on the fallback message');
    }
    if (allOk) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(1, 0, 0.5), PALETTE, 30, 4);
      ctx.win({ note: `Limits: ${fmt(lim.steps)} steps, ${fmt(lim.timeout, 's')}, ${fmt(lim.budget, '$')} per run, with a fallback message.` });
    } else {
      ctx.sound.thud();
      ctx.toast(`Not yet: ${problems.join('; ')}.`, 'bad', 5200);
    }
  }
}
