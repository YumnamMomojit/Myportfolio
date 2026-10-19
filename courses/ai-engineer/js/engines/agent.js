// Plan an agent's tool calls, then run it and read the trace.
import * as THREE from 'three';
import { box, candy, candyMat, textPlane, label, C, PALETTE } from '../kit.js';

const TOOLS = {
  get_weather: { icon: '🌤', tokens: 40, color: C.blue },
  web_search: { icon: '🔎', tokens: 250, color: C.purple },
  calculator: { icon: '🧮', tokens: 20, color: C.green },
  final_answer: { icon: '💬', tokens: 15, color: C.pink },
  ask_human: { icon: '🙋', tokens: 10, color: C.yellow },
  send_email: { icon: '✉️', tokens: 30, color: C.orange },
  delete_file: { icon: '🗑', tokens: 20, color: C.red },
  list_files: { icon: '📂', tokens: 20, color: C.teal },
  archive_file: { icon: '📦', tokens: 30, color: 0xb5651d },
};

const ROUNDS = {
  weather: {
    goal: 'User: “What’s the temperature in Pune in °F?” Budget: 200 tokens.',
    tools: ['get_weather', 'web_search', 'calculator', 'send_email', 'final_answer'],
    done: (s) => s.answered,
  },
  email: {
    goal: 'User: “Email the team today’s Pune forecast.” Sending needs a human’s OK. Budget: 200 tokens.',
    tools: ['get_weather', 'send_email', 'ask_human', 'delete_file', 'final_answer'],
    done: (s) => s.sent,
  },
  cleanup: {
    goal: 'User: “Old logs are filling the disk. Free some space and tell me what you did.” Budget: 200 tokens.',
    tools: ['list_files', 'delete_file', 'archive_file', 'ask_human', 'final_answer'],
    done: (s) => s.answered,
  },
};
const BUDGET = 200;

// Runs one tool. Returns { obs, error?, fatal? }.
function step(tool, s, round) {
  switch (tool) {
    case 'get_weather': s.weather = true; return { obs: 'Pune: 31 °C, clear sky' };
    case 'web_search': s.weather = true; return { obs: '12 pages about Pune weather…' };
    case 'calculator':
      if (!s.weather) return { error: 'Nothing to convert yet.' };
      s.tempF = true; return { obs: '31 × 9/5 + 32 = 87.8' };
    case 'final_answer':
      if (round === 'weather') { if (!s.tempF) return { error: 'No °F value to answer with yet.' }; s.answered = true; return { obs: 'It’s about 88 °F in Pune.' }; }
      if (round === 'cleanup') { if (!s.archived) return { error: 'Nothing has been done yet.' }; s.answered = true; return { obs: 'Archived 3 old logs, freeing 2.1 GB.' }; }
      if (!s.sent) return { error: 'Answered, but the email was never sent.' };
      return { obs: 'Told the user the email went out.' };
    case 'ask_human': s.approved = true; return { obs: 'Human: “Approved.”' };
    case 'send_email':
      if (!s.weather) return { error: 'Nothing to send yet.' };
      if (!s.approved) return { error: 'Blocked: sending needs a human’s approval first.' };
      s.sent = true; return { obs: 'Email sent to the team.' };
    case 'delete_file': return { error: 'delete_file can’t be undone and isn’t needed. Run stopped!', fatal: true };
    case 'list_files': s.listed = true; return { obs: 'logs/: 3 old files, 2.1 GB' };
    case 'archive_file':
      if (!s.listed) return { error: 'Which files? List them first.' };
      s.archived = true; return { obs: 'Moved 3 logs to cold storage.' };
    default: return { error: 'Unknown tool' };
  }
}

export default function agent(ctx) {
  const { stage, params } = ctx;
  const rounds = params.rounds;
  let round = 0;
  let plan = [];
  let blocks = [];
  let toolButtons = [];
  let traceLabels = [];
  const slotX = (i) => -6.2 + i * 2.05;

  const floor = box(15, 0.3, 3.2, 0xbfeee6, 0.15);
  floor.position.set(0, -0.6, 0);
  stage.root.add(floor);
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 8), candyMat(C.white));
  pole.position.y = 0.55;
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0x2fcf78, side: THREE.DoubleSide }));
  cloth.position.set(0.42, 1.3, 0);
  flag.add(pole, cloth);
  stage.root.add(flag);

  const bot = new THREE.Group();
  const head = candy('ball', C.white, 0.9);
  const visor = box(0.62, 0.34, 0.2, C.ink, 0.12);
  visor.position.set(0, 0.04, 0.37);
  const eye = new THREE.MeshBasicMaterial({ color: 0x67f5ff });
  [-0.13, 0.13].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), eye); e.position.set(x, 0.05, 0.48); bot.add(e); });
  bot.add(head, visor);
  stage.root.add(bot);

  stage.frame({ target: [0, 0.8, 0], w: 15.5, h: 5.6, yaw: 0, pitch: 0.28 });

  const tray = ctx.ui.group('Add tool:');
  ctx.ui.break();
  ctx.ui.button('▶ Run agent', run, { cls: 'green big' });
  ctx.ui.button('✕ Clear plan', () => { if (plan.length && ctx.move()) { plan = []; layout(); } }, { cls: 'ghost small' });
  setRound();

  function setRound() {
    const r = ROUNDS[rounds[round]];
    plan = [];
    ctx.round(round + 1, rounds.length);
    ctx.goal(r.goal);
    toolButtons.forEach((b) => b.remove());
    toolButtons = r.tools.map((t) => ctx.ui.button(`${TOOLS[t].icon} ${t} <small>${TOOLS[t].tokens}t</small>`, () => addTool(t), { parent: tray, cls: 'small ghost', cost: 1 }));
    layout();
  }

  function addTool(t) {
    if (plan.length >= 6) {
      ctx.refund(1);
      ctx.toast('The corridor is full: 6 steps at most.', 'hint');
      return;
    }
    plan.push(t);
    ctx.sound.pickup();
    layout();
  }

  function layout() {
    blocks.forEach((b) => { stage.root.remove(b); stage.unclickable(b); });
    traceLabels.forEach((l) => stage.root.remove(l));
    traceLabels = [];
    blocks = plan.map((t, i) => {
      const g = new THREE.Group();
      g.position.set(slotX(i), 0, 0);
      const b = box(1.8, 0.9, 1.2, TOOLS[t].color, 0.22);
      const txt = textPlane(`${TOOLS[t].icon} ${t}`, { size: 40, weight: 700, color: '#15331f', bg: 'rgba(255,255,255,0.92)', height: 0.3, pad: 8, radius: 10 });
      txt.scale.setScalar(Math.min(1, 1.65 / txt.geometry.parameters.width));
      txt.position.set(0, 0.05, 0.62);
      const num = label(String(i + 1), { size: 44, weight: 700, color: '#ffffff', stroke: '#15331f', height: 0.34, pad: 4 });
      num.position.set(-0.75, 0.6, 0.5);
      g.add(b, txt, num);
      stage.root.add(g);
      stage.clickable(g, () => remove(i));
      return g;
    });
    flag.position.set(slotX(plan.length) - 0.3, -0.45, 0);
    bot.position.set(-7.4, 0.2, 0.3);
    const tokens = plan.reduce((s, t) => s + TOOLS[t].tokens, 0);
    ctx.status(plan.length ? `Plan: <b>${plan.join(' → ')}</b> · <b class="${tokens > BUDGET ? 'bad' : ''}">${tokens}</b> / ${BUDGET} tokens · click a step to remove it` : 'Add tools to the plan, then press Run.');
  }

  function remove(i) {
    if (ctx.over || ctx.busy || !ctx.move()) return;
    plan.splice(i, 1);
    ctx.sound.pop();
    layout();
  }

  async function run() {
    if (!plan.length) {
      ctx.toast('The plan is empty. Add some tools first.', 'hint');
      return;
    }
    const name = rounds[round];
    const s = {};
    let tokens = 0;
    ctx.busy = true;
    layout();
    let failure = null;
    for (let i = 0; i < plan.length; i++) {
      const t = plan[i];
      const target = new THREE.Vector3(slotX(i), 0.9, 0.3);
      const from = bot.position.clone();
      ctx.sound.click();
      await stage.tweens.add(0.45, (k) => { bot.position.lerpVectors(from, target, k); bot.position.y += Math.sin(k * Math.PI) * 0.5; });
      tokens += TOOLS[t].tokens;
      const res = tokens > BUDGET ? { error: `Token budget blown: ${tokens} > ${BUDGET}.` } : step(t, s, name);
      const tl = textPlane(res.error ? `⚠ ${res.error}` : `👀 ${res.obs}`, { size: 34, weight: 600, color: res.error ? '#ffffff' : '#15331f', bg: res.error ? '#ff4d6d' : 'rgba(255,255,255,0.95)', height: 0.28, pad: 10, radius: 10 });
      tl.scale.setScalar(Math.min(1, 2.0 / tl.geometry.parameters.width));
      tl.position.set(slotX(i), i % 2 ? 2.4 : 1.85, 0.4);
      stage.root.add(tl);
      traceLabels.push(tl);
      if (res.error) {
        failure = res;
        blocks[i].children[0].material = candyMat(C.red);
        ctx.sound.thud();
        break;
      }
      await new Promise((r) => setTimeout(r, 380));
    }
    if (!failure && !ROUNDS[name].done(s)) failure = { error: name === 'email' ? 'The plan finished, but no email was sent.' : 'The plan finished without answering the user.' };
    ctx.busy = false;
    if (failure) {
      ctx.toast(`Run failed: ${failure.error}`, 'bad', 4200);
      if (failure.fatal) {
        ctx.fail('Your agent called <b>delete_file</b>. Destructive tools should never be in an agent’s plan when a safe option (archive) exists.');
        return;
      }
      if (!ctx.move()) ctx.fail('Out of moves after a failed run.', 'moves');
      return;
    }
    const from = bot.position.clone();
    await stage.tweens.add(0.45, (k) => bot.position.lerpVectors(from, flag.position.clone().add(new THREE.Vector3(0.4, 1.2, 0.3)), k));
    ctx.sound.gem();
    stage.fx.burst(flag.position.clone().setY(1), PALETTE, 30, 4);
    round++;
    if (round >= rounds.length) ctx.win({ note: `${tokens} tokens on the last run.` });
    else {
      ctx.toast('Task done! Next task…', 'good');
      setTimeout(setRound, 900);
    }
  }

  return {
    update() {
      cloth.rotation.y = Math.sin(performance.now() / 300) * 0.25;
    },
  };
}
