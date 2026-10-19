// Least privilege: switch off every permission the agent's tasks don't need.
// params: { rounds: [{ name, scopes: [{ id, label, danger? }], tasks: [{ label, needs }] }] }
import * as THREE from 'three';
import { box, candyMat, textPlane, label, setLabel, disposeTree, C, PALETTE } from '../../../shared/kit.js';

export default function grants(ctx) {
  const { stage, params } = ctx;
  const rounds = params.rounds;
  const neededOf = (r) => new Set(r.tasks.flatMap((t) => t.needs));
  // every scope starts switched on, so par = the scopes no task needs
  const par = rounds.reduce((s, r) => s + r.scopes.filter((sc) => !neededOf(r).has(sc.id)).length, 0);
  ctx.budget({ par, moves: par + (params.extra ?? ctx.level.extra ?? 4) });
  let round = 0;
  let on = {};
  let group = null;
  let scopeObjs = [];
  let taskObjs = [];

  stage.frame({ target: [0.4, 0, 0], w: 14, h: 7.6, yaw: 0, pitch: 0.1 });
  setRound();

  function setRound() {
    const r = rounds[round];
    if (group) { stage.root.remove(group); disposeTree(group); stage.pickables = []; }
    group = new THREE.Group();
    stage.root.add(group);
    on = Object.fromEntries(r.scopes.map((s) => [s.id, true]));
    ctx.round(round + 1, rounds.length);
    ctx.goal(`<b>${r.name}:</b> switch off every permission its tasks don’t need. Every task must still work.`);
    const head = label(`🔐 ${r.name}: permissions`, { size: 42, weight: 700, color: '#ffffff', bg: '#13753f', height: 0.4, pad: 12, radius: 14 });
    head.position.set(-2.6, 3.2, 0.2);
    const head2 = label('📋 Tasks', { size: 42, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.4, pad: 12, radius: 14 });
    head2.position.set(4.6, 3.2, 0.2);
    group.add(head, head2);
    scopeObjs = r.scopes.map((sc, k) => {
      const g = new THREE.Group();
      g.position.set(-2.6, 2.3 - k * 0.92, 0);
      const body = box(6.6, 0.78, 0.35, C.white, 0.18);
      const t = textPlane(`${sc.danger ? '⚠️ ' : ''}${sc.label}`, { size: 38, weight: 600, color: sc.danger ? '#c9284b' : '#15331f', height: 0.3, pad: 4 });
      t.scale.setScalar(Math.min(1, 4.9 / t.geometry.parameters.width));
      t.position.set(-0.6, 0, 0.19);
      const sw = box(1.0, 0.46, 0.3, C.green, 0.22);
      sw.position.set(2.7, 0, 0.12);
      const knob = box(0.38, 0.38, 0.36, C.white, 0.18);
      knob.position.set(2.95, 0, 0.2);
      g.add(body, t, sw, knob);
      group.add(g);
      stage.clickable(g, () => toggle(sc.id));
      return { sc, sw, knob };
    });
    taskObjs = r.tasks.map((tk, k) => {
      const g = new THREE.Group();
      g.position.set(4.6, 2.3 - k * 0.92, 0);
      const body = box(4.4, 0.78, 0.35, C.white, 0.18);
      const t = textPlane(tk.label, { size: 36, weight: 600, color: '#15331f', height: 0.3, pad: 4 });
      t.scale.setScalar(Math.min(1, 3.3 / t.geometry.parameters.width));
      t.position.set(-0.35, 0, 0.19);
      const mark = label('', { size: 44, height: 0.38, pad: 2 });
      mark.position.set(1.8, 0, 0.3);
      g.add(body, t, mark);
      group.add(g);
      return { tk, mark };
    });
    refresh();
  }

  function toggle(id) {
    if (ctx.over || ctx.busy || !ctx.move()) return;
    on[id] = !on[id];
    ctx.sound.pop();
    refresh();
    const r = rounds[round];
    const need = neededOf(r);
    const exact = r.scopes.every((sc) => on[sc.id] === need.has(sc.id));
    if (exact) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 0, 0.5), PALETTE, 26, 4);
      round++;
      if (round >= rounds.length) ctx.win({ note: 'Every task works, with nothing extra switched on.' });
      else {
        ctx.toast('Least privilege achieved! Next agent…', 'good');
        ctx.busy = true;
        setTimeout(() => { ctx.busy = false; setRound(); }, 900);
      }
    } else if (!on[id] && need.has(id)) ctx.toast('A task just broke: it needs that permission.', 'bad');
  }

  function refresh() {
    scopeObjs.forEach(({ sc, sw, knob }) => {
      sw.material = candyMat(on[sc.id] ? C.green : 0xbfc6b8);
      knob.position.x = on[sc.id] ? 2.95 : 2.45;
    });
    let broken = 0;
    taskObjs.forEach(({ tk, mark }) => {
      const ok = tk.needs.every((n) => on[n]);
      if (!ok) broken++;
      setLabel(mark, ok ? '✅' : '❌', { size: 44, height: 0.38, pad: 2 });
    });
    const r = rounds[round];
    const extra = r.scopes.filter((sc) => on[sc.id] && !neededOf(r).has(sc.id)).length;
    const danger = r.scopes.filter((sc) => on[sc.id] && sc.danger).length;
    ctx.status(`Switched on: <b>${Object.values(on).filter(Boolean).length}</b> · dangerous still on: <b class="${danger ? 'bad' : 'ok'}">${danger}</b> · broken tasks: <b class="${broken ? 'bad' : 'ok'}">${broken}</b> · click a permission to switch it${extra && !danger ? ' · some harmless permissions still aren’t needed' : ''}`);
  }
}
