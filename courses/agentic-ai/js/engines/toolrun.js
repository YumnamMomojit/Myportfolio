// Plan an agent's tool calls for a scenario, then run it and read the trace.
// params: { rounds: [scenario names] }
import * as THREE from 'three';
import { box, candy, candyMat, textPlane, label, C, PALETTE } from '../../../shared/kit.js';

// Every tool the scenarios use: icon, token cost and colour.
const TOOLS = {
  get_weather: { icon: '🌤', tokens: 40, color: C.blue },
  web_search: { icon: '🔎', tokens: 250, color: C.purple },
  calculator: { icon: '🧮', tokens: 20, color: C.green },
  final_answer: { icon: '💬', tokens: 15, color: C.pink },
  ask_human: { icon: '🙋', tokens: 10, color: C.yellow },
  send_email: { icon: '✉️', tokens: 30, color: C.orange },
  lookup_order: { icon: '📦', tokens: 30, color: C.teal },
  issue_refund: { icon: '💸', tokens: 30, color: C.orange },
  check_policy: { icon: '📜', tokens: 40, color: C.purple },
  close_account: { icon: '⛔', tokens: 20, color: C.red },
  check_calendar: { icon: '📅', tokens: 30, color: C.blue },
  find_free_slot: { icon: '🕒', tokens: 20, color: C.teal },
  draft_invite: { icon: '📝', tokens: 30, color: C.green },
  send_invite: { icon: '📨', tokens: 20, color: C.orange },
  delete_event: { icon: '🗑', tokens: 20, color: C.red },
  read_ticket: { icon: '🎫', tokens: 30, color: C.blue },
  search_kb: { icon: '📚', tokens: 50, color: C.teal },
  draft_reply: { icon: '📝', tokens: 40, color: C.green },
  send_reply: { icon: '📨', tokens: 20, color: C.orange },
  delete_ticket: { icon: '🗑', tokens: 20, color: C.red },
};

// What each tool does in each scenario: needs (flags set by earlier tools), sets (a flag),
// approval (needs a human's yes first), error (always fails), fatal (destructive: stops the run).
const SCENARIOS = {
  weather: {
    goal: 'User: “What’s the temperature in Pune in °F?” Budget: 200 tokens.',
    tools: {
      get_weather: { sets: 'temp', obs: 'Pune: 31 °C, clear sky' },
      web_search: { sets: 'temp', obs: '12 pages about Pune weather…' },
      calculator: { needs: ['temp'], sets: 'tempF', obs: '31 × 9/5 + 32 = 87.8', miss: 'Nothing to convert yet.' },
      send_email: { error: 'Nobody asked for an email.' },
      final_answer: { needs: ['tempF'], sets: 'done', obs: 'It’s about 88 °F in Pune.', miss: 'No °F value to answer with yet.' },
    },
  },
  order: {
    goal: 'User: “Where is my order #4521?” Budget: 200 tokens.',
    tools: {
      lookup_order: { sets: 'order', obs: '#4521 shipped 2 May, arrives 6 May' },
      web_search: { obs: 'Generic articles about shipping delays…' },
      issue_refund: { error: 'Nobody asked for a refund.' },
      final_answer: { needs: ['order'], sets: 'done', obs: 'It shipped on 2 May and arrives on 6 May.', miss: 'You don’t know where the order is yet.' },
    },
  },
  meeting: {
    goal: 'User: “Set up a 30-minute sync with Priya and Arun this week.” Invites need my OK. Budget: 200 tokens.',
    tools: {
      check_calendar: { sets: 'cal', obs: '3 calendars loaded' },
      find_free_slot: { needs: ['cal'], sets: 'slot', obs: 'Free: Thu 15:00–15:30', miss: 'Check the calendars first.' },
      draft_invite: { needs: ['slot'], sets: 'draft', obs: 'Draft: “Sync”, Thu 15:00, 3 people', miss: 'No time slot chosen yet.' },
      ask_human: { needs: ['draft'], sets: 'approved', obs: 'User: “Looks good, send it.”', miss: 'Approve what? Draft the invite first.' },
      send_invite: { needs: ['draft'], approval: true, sets: 'done', obs: 'Invite sent to Priya and Arun.', miss: 'There’s no invite to send.' },
      delete_event: { fatal: true, error: 'delete_event removes other people’s meetings. Run stopped!' },
    },
  },
  refund: {
    goal: 'User: “I was charged twice for order #4521. Please refund one charge.” Refunds need a human’s OK. Budget: 200 tokens.',
    tools: {
      lookup_order: { sets: 'order', obs: 'Two $12 charges on 3 May' },
      check_policy: { needs: ['order'], sets: 'eligible', obs: 'Duplicate charge: eligible for refund', miss: 'Which order? Look it up first.' },
      ask_human: { needs: ['eligible'], sets: 'approved', obs: 'Manager: “Approved: refund $12.”', miss: 'Check eligibility before asking for approval.' },
      issue_refund: { needs: ['eligible'], approval: true, sets: 'done', obs: '$12 refunded to the card.', miss: 'Check the policy first.' },
      close_account: { fatal: true, error: 'close_account is destructive and nobody asked for it. Run stopped!' },
    },
  },
  triage: {
    goal: 'Ticket: “I can’t export my notes to PDF.” Answer from the knowledge base; replies need a human’s OK. Budget: 200 tokens.',
    tools: {
      read_ticket: { sets: 'ticket', obs: 'Pro user, Windows, export button greyed out' },
      search_kb: { needs: ['ticket'], sets: 'kb', obs: 'KB-112: export needs desktop app v4+', miss: 'Read the ticket first.' },
      draft_reply: { needs: ['kb'], sets: 'draft', obs: 'Draft: update to v4, then File → Export (KB-112)', miss: 'Find the answer before drafting.' },
      ask_human: { needs: ['draft'], sets: 'approved', obs: 'Team lead: “Approved.”', miss: 'Approve what? Draft a reply first.' },
      send_reply: { needs: ['draft'], approval: true, sets: 'done', obs: 'Reply sent; ticket marked solved.', miss: 'There’s no reply to send.' },
      web_search: { obs: 'Forum posts from 2019…' },
      delete_ticket: { fatal: true, error: 'delete_ticket loses the customer’s request. Run stopped!' },
    },
  },
};
const BUDGET = 200;

// Runs one tool. Returns { obs, error?, fatal? }.
function step(tool, s, scenario) {
  const def = SCENARIOS[scenario].tools[tool];
  if (def.fatal) return { error: def.error, fatal: true };
  if (def.error) return { error: def.error };
  if ((def.needs || []).some((f) => !s[f])) return { error: def.miss };
  if (def.approval && !s.approved) return { error: 'Blocked: this needs a human’s approval first.' };
  if (def.sets) s[def.sets] = true;
  return { obs: def.obs };
}

export default function toolrun(ctx) {
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
    const r = SCENARIOS[rounds[round]];
    plan = [];
    ctx.round(round + 1, rounds.length);
    ctx.goal(r.goal);
    toolButtons.forEach((b) => b.remove());
    toolButtons = Object.keys(r.tools).map((t) => ctx.ui.button(`${TOOLS[t].icon} ${t} <small>${TOOLS[t].tokens}t</small>`, () => addTool(t), { parent: tray, cls: 'small ghost', cost: 1 }));
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
    if (!failure && !s.done) failure = { error: 'The plan finished, but the task isn’t done yet.' };
    ctx.busy = false;
    if (failure) {
      ctx.toast(`Run failed: ${failure.error}`, 'bad', 4200);
      if (failure.fatal) {
        ctx.fail(`${failure.error.replace(' Run stopped!', '')} Destructive tools should never be in an agent’s plan.`);
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
