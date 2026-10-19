// Orchestrate workers: give each task to an agent, then run the job against a time target.
// params: { workers: [{ name, skills, slow? }], tasks: [{ label, skill, time }], overhead, target }
import * as THREE from 'three';
import { box, candy, candyMat, textPlane, label, setLabel, C, PALETTE } from '../../../shared/kit.js';

const WCOL = [C.blue, C.pink, C.purple, C.orange];

export default function assign(ctx) {
  const { stage, params } = ctx;
  const workers = params.workers;
  const tasks = params.tasks.map((t) => ({ ...t, who: -1 }));
  const par = tasks.length;
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 4) });

  const canDo = (w, t) => w.skills.includes('*') || w.skills.includes(t.skill);
  const dur = (w, t) => t.time * (w.slow || 1);
  const loads = () => workers.map((w, i) => tasks.filter((t) => t.who === i).reduce((s, t) => s + dur(w, t), 0));
  const total = () => {
    const used = loads().filter((l) => l > 0);
    return used.length ? Math.max(...used) + params.overhead * (used.length - 1) : 0;
  };

  const UNIT = 0.55; // world units per hour
  const LANE_X = -1.6;
  const laneY = (i) => 2.2 - i * 1.5;
  workers.forEach((w, i) => {
    const g = new THREE.Group();
    g.position.set(LANE_X - 1.5, laneY(i), 0);
    const head = candy('ball', WCOL[i % WCOL.length], 0.8);
    const name = textPlane(`${w.name}${w.slow ? ' (½ speed)' : ''}`, { size: 34, weight: 700, color: '#15331f', height: 0.28, pad: 4 });
    name.position.set(0, -0.62, 0.2);
    const skill = textPlane(w.skills.includes('*') ? 'can do anything' : w.skills.join(', '), { size: 30, weight: 600, color: '#4f6b55', height: 0.24, pad: 4 });
    skill.position.set(0, -0.9, 0.2);
    g.add(head, name, skill);
    stage.root.add(g);
    stage.clickable(g, () => pickWorker(i));
    const track = box(params.target * UNIT, 0.7, 0.15, 0xe6efd9, 0.1);
    track.position.set(LANE_X + (params.target * UNIT) / 2, laneY(i), -0.1);
    stage.root.add(track);
  });
  const limit = box(0.06, workers.length * 1.5, 0.3, C.red, 0.02);
  limit.position.set(LANE_X + params.target * UNIT, laneY((workers.length - 1) / 2), 0);
  const limitTag = label(`${params.target} h target`, { size: 34, weight: 700, color: '#ffffff', bg: '#ff4d6d', height: 0.3, pad: 8, radius: 10 });
  limitTag.position.set(limit.position.x, laneY(0) + 0.9, 0.2);
  stage.root.add(limit, limitTag);

  const cards = tasks.map((t, k) => {
    const g = new THREE.Group();
    const body = box(1, 0.6, 0.3, C.white, 0.12);
    const txt = textPlane(`${t.label} · ${t.time}h`, { size: 32, weight: 700, color: '#15331f', height: 0.26, pad: 4 });
    txt.position.z = 0.16;
    g.add(body, txt);
    g.userData = { body, txt };
    stage.root.add(g);
    stage.clickable(g, () => pickTask(k));
    return g;
  });
  const totalTag = label('', { size: 44, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.42, pad: 12, radius: 14 });
  totalTag.position.set(LANE_X + 2.5, laneY(workers.length - 1) - 1.4, 0.2);
  stage.root.add(totalTag);

  const right = LANE_X + Math.max(params.target, 8) * UNIT;
  stage.frame({ target: [(-7.6 + right) / 2, laneY((workers.length - 1) / 2) - 0.3, 0], w: right + 8.2, h: workers.length * 1.5 + 3.2, yaw: 0, pitch: 0.1 });

  let sel = -1;
  ctx.ui.button('▶ Run the job', run, { cls: 'green big' });
  layout();

  function layout() {
    const ls = workers.map(() => 0);
    let pool = 0;
    tasks.forEach((t, k) => {
      const g = cards[k];
      let to;
      const w = t.who >= 0 ? workers[t.who] : null;
      const width = w ? dur(w, t) * UNIT - 0.06 : 3.8;
      g.userData.body.scale.x = width;
      g.userData.txt.scale.setScalar(Math.min(1, (width - 0.1) / g.userData.txt.geometry.parameters.width));
      if (w) {
        to = new THREE.Vector3(LANE_X + (ls[t.who] + dur(w, t) / 2) * UNIT, laneY(t.who), 0.1);
        ls[t.who] += dur(w, t);
      } else {
        to = new THREE.Vector3(-6.1, laneY(0) - pool * 0.8, 0.1);
        pool++;
      }
      g.userData.body.material = candyMat(k === sel ? 0xfff1c2 : w ? new THREE.Color(WCOL[t.who % WCOL.length]).lerp(new THREE.Color(0xffffff), 0.55).getHex() : C.white);
      stage.tweens.move(g, to, 0.3);
    });
    const tt = total();
    const unassigned = tasks.filter((t) => t.who < 0).length;
    setLabel(totalTag, unassigned ? `${unassigned} task${unassigned > 1 ? 's' : ''} unassigned` : `total: ${tt} h`, { size: 44, weight: 700, color: '#ffffff', bg: !unassigned && tt <= params.target ? '#1c9e58' : '#15331f', height: 0.42, pad: 12, radius: 14 });
    ctx.status(`Total time = busiest worker + ${params.overhead} h per extra worker · ${sel >= 0 ? `now click a worker for “${tasks[sel].label}”` : 'click a task, then a worker'}`);
  }

  function pickTask(k) {
    if (ctx.over || ctx.busy) return;
    sel = sel === k ? -1 : k;
    ctx.sound.pickup();
    layout();
  }

  function pickWorker(i) {
    if (ctx.over || ctx.busy || sel < 0) return;
    const t = tasks[sel];
    if (t.who === i) return;
    if (!canDo(workers[i], t)) {
      ctx.sound.thud();
      ctx.toast(`${workers[i].name} can’t do “${t.label}” (needs ${t.skill}).`, 'bad');
      return;
    }
    if (!ctx.move()) return;
    t.who = i;
    sel = -1;
    ctx.sound.pop();
    layout();
  }

  async function run() {
    if (tasks.some((t) => t.who < 0)) {
      ctx.toast('Assign every task first.', 'hint');
      return;
    }
    const tt = total();
    ctx.busy = true;
    const sweep = box(0.08, workers.length * 1.5, 0.4, C.yellow, 0.02);
    stage.root.add(sweep);
    await stage.tweens.add(0.9, (k) => sweep.position.set(LANE_X + k * tt * UNIT, laneY((workers.length - 1) / 2), 0.3));
    stage.root.remove(sweep);
    ctx.busy = false;
    if (tt <= params.target) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(LANE_X + tt * UNIT, laneY(0), 0.5), PALETTE, 30, 4);
      ctx.win({ note: `Done in ${tt} hours with ${loads().filter((l) => l > 0).length} worker(s).` });
    } else {
      ctx.sound.thud();
      ctx.toast(`That takes ${tt} h, over the ${params.target} h target. Rebalance and run again.`, 'bad', 3600);
    }
  }
}
