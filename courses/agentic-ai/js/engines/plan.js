// Execute a plan graph: run tasks only after their prerequisites, skip ones the goal
// doesn't need, and recover when a step fails.
// params: { goal, tasks: [{ id, label, deps, fails?, alt?, hidden? }] }
import * as THREE from 'three';
import { box, candyMat, textPlane, arrow, label, C, PALETTE } from '../../../shared/kit.js';

export default function plan(ctx) {
  const { stage, params } = ctx;
  const tasks = params.tasks.map((t) => ({ ...t, deps: [...t.deps], state: t.hidden ? 'hidden' : 'todo' }));
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const goal = byId[params.goal];

  // Par: every task the goal needs once failures are swapped for their backups, plus the failed attempts.
  const finalDeps = (t) => t.deps.map((d) => (byId[d].fails ? byId[d].alt : d));
  const needed = new Set();
  const visit = (id) => { if (needed.has(id)) return; needed.add(id); finalDeps(byId[id]).forEach(visit); };
  visit(goal.id);
  const failedNeeded = tasks.filter((t) => t.fails && [...needed].some((id) => byId[id].deps.includes(t.id))).length;
  const par = needed.size + failedNeeded;
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 4) });

  // layout: columns by depth
  const depth = {};
  const dOf = (t) => (depth[t.id] ??= t.deps.length ? 1 + Math.max(...t.deps.map((d) => dOf(byId[d]))) : 0);
  tasks.forEach(dOf);
  tasks.filter((t) => t.hidden).forEach((t) => { const src = tasks.find((x) => x.alt === t.id); if (src) depth[t.id] = depth[src.id]; });
  const cols = Math.max(...Object.values(depth)) + 1;
  const perCol = {};
  const NW = 2.8, NH = 0.9;
  tasks.forEach((t) => {
    const c = depth[t.id];
    perCol[c] = (perCol[c] || 0) + 1;
    t.slot = perCol[c] - 1;
  });
  const tall = innerHeight > innerWidth; // phone in portrait: the graph flows downwards
  const STEP = tall ? 1.35 : 3.4; // distance between depths
  const SPREAD = tall ? 3.1 : 1.45; // distance between tasks at the same depth
  tasks.forEach((t) => {
    const n = perCol[depth[t.id]];
    const a = (depth[t.id] - (cols - 1) / 2) * STEP;
    const b = ((n - 1) / 2 - t.slot) * SPREAD;
    t.pos = tall ? new THREE.Vector3(-b, -a, 0) : new THREE.Vector3(a, b, 0);
  });

  const nodes = {};
  tasks.forEach((t) => {
    const g = new THREE.Group();
    g.position.copy(t.pos);
    const body = box(NW, NH, 0.4, C.white, 0.2);
    const txt = textPlane(t.label, { size: 36, weight: 700, color: '#15331f', height: 0.3, pad: 4 });
    txt.scale.setScalar(Math.min(1, (NW - 0.25) / txt.geometry.parameters.width));
    txt.position.z = 0.21;
    g.add(body, txt);
    if (t.id === goal.id) {
      const star = label('🎯', { size: 50, height: 0.42, pad: 2 });
      star.position.set(NW / 2, NH / 2 + 0.1, 0.3);
      g.add(star);
    }
    g.visible = t.state !== 'hidden';
    stage.root.add(g);
    stage.clickable(g, () => runTask(t));
    nodes[t.id] = { g, body };
  });
  const arrows = new THREE.Group();
  stage.root.add(arrows);

  const across = Math.max(...Object.values(perCol));
  stage.frame(tall
    ? { target: [0, 0, 0], w: across * 3.1 + 0.4, h: cols * 1.35 + 1.2, yaw: 0, pitch: 0.12 }
    : { target: [0, 0, 0], w: cols * 3.4 + 0.8, h: across * 1.45 + 1.4, yaw: 0, pitch: 0.12 });
  draw();

  function ready(t) {
    return t.deps.every((d) => byId[d].state === 'done');
  }

  function draw() {
    arrows.children.forEach((a) => a.children.forEach((m) => m.geometry.dispose()));
    arrows.clear();
    tasks.forEach((t) => {
      if (t.state === 'hidden') return;
      const n = nodes[t.id];
      n.g.visible = true;
      const color = t.state === 'done' ? C.green : t.state === 'failed' ? C.red : ready(t) ? C.white : 0xd6dccb;
      n.body.material = candyMat(color);
      t.deps.forEach((d) => {
        const from = byId[d].pos.clone().add(tall ? new THREE.Vector3(0, -NH / 2, 0) : new THREE.Vector3(NW / 2, 0, 0));
        const to = t.pos.clone().add(tall ? new THREE.Vector3(0, NH / 2, 0) : new THREE.Vector3(-NW / 2, 0, 0));
        const a = arrow(byId[d].state === 'done' ? C.green : 0x8a9488, 0.035);
        a.set(from, to);
        arrows.add(a);
      });
    });
    const left = [...needed].filter((id) => byId[id].state !== 'done').length;
    ctx.status(`White tasks are ready; grey ones wait on a prerequisite · <b>${left}</b> task${left === 1 ? '' : 's'} left before 🎯`);
  }

  async function runTask(t) {
    if (ctx.over || ctx.busy || t.state === 'done' || t.state === 'failed') return;
    if (!ctx.move()) return;
    const n = nodes[t.id];
    if (!ready(t)) {
      const missing = t.deps.filter((d) => byId[d].state !== 'done').map((d) => byId[d].label);
      ctx.sound.thud();
      ctx.toast(`Blocked: “${t.label}” needs ${missing.join(' and ')} first.`, 'bad');
      const x = n.g.position.x;
      stage.tweens.add(0.35, (k) => (n.g.position.x = x + Math.sin(k * Math.PI * 6) * 0.12 * (1 - k)));
      return;
    }
    ctx.busy = true;
    await stage.tweens.add(0.35, (k) => (n.g.position.z = Math.sin(k * Math.PI) * 0.6));
    ctx.busy = false;
    if (t.fails) {
      t.state = 'failed';
      ctx.sound.thud();
      const alt = byId[t.alt];
      alt.state = 'todo';
      tasks.forEach((x) => { x.deps = x.deps.map((d) => (d === t.id ? alt.id : d)); });
      ctx.toast(`❌ ${t.fails} Backup plan: “${alt.label}”. Everything already done still counts.`, 'bad', 5000);
      stage.fx.burst(alt.pos.clone(), [0xffd54f, 0xffffff], 14, 3);
      draw();
      return;
    }
    t.state = 'done';
    ctx.sound.collect();
    if (!needed.has(t.id)) ctx.toast(`“${t.label}” didn’t help the goal: a wasted move.`, 'hint');
    draw();
    if (t === goal) {
      ctx.sound.gem();
      stage.fx.burst(t.pos.clone(), PALETTE, 30, 4);
      ctx.win();
    }
  }
}
