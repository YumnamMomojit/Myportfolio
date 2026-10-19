// Kubernetes rescue: a node sinks, and you reschedule its pods under real scheduling rules.
import * as THREE from 'three';
import { box, textPlane, label, C, PALETTE } from '../kit.js';

const APP_COLORS = { db: C.purple, api: C.blue, web: C.pink, cache: C.orange, worker: C.green };

export default function k8s(ctx) {
  const { stage } = ctx;
  const nodes = [
    { id: 'node-1', cpu: 4, ssd: true, x: -5.2, alive: true },
    { id: 'node-2', cpu: 4, ssd: false, x: -1.4, alive: true },
    { id: 'node-3', cpu: 4, ssd: true, x: 2.4, alive: true },
  ];
  const pods = [
    { id: 'db', app: 'db', cpu: 2, ssd: true, node: 'node-1' },
    { id: 'api-1', app: 'api', cpu: 1, node: 'node-1' },
    { id: 'web-1', app: 'web', cpu: 1, node: 'node-1' },
    { id: 'api-2', app: 'api', cpu: 1, node: 'node-2' },
    { id: 'web-2', app: 'web', cpu: 1, node: 'node-2' },
    { id: 'cache', app: 'cache', cpu: 2, node: 'node-2' },
    { id: 'api-3', app: 'api', cpu: 1, node: 'node-3' },
    { id: 'worker', app: 'worker', cpu: 2, node: 'node-3' },
  ];
  let sel = null;
  let added = false;

  const water = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), new THREE.MeshPhysicalMaterial({ color: 0x5cc8ff, roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.9 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.35;
  stage.root.add(water);
  const pier = box(3.4, 0.4, 2.0, 0xc98a4b, 0.1);
  pier.position.set(-5.2, -0.1, 3.3);
  const pierTag = textPlane('Pending pods', { size: 40, weight: 700, color: '#15331f', bg: 'rgba(255,255,255,0.92)', height: 0.34, pad: 10, radius: 12 });
  pierTag.position.set(-5.2, 0.15, 4.35);
  pierTag.rotation.x = -0.6;
  stage.root.add(pier, pierTag);

  const shipObj = {};
  nodes.forEach((n) => buildShip(n));
  const podObj = {};
  pods.forEach((p) => buildPod(p));
  layout(true);

  stage.frame({ target: [0.4, 0.4, 0.6], w: 16.4, h: 8.5, yaw: 0, pitch: 0.62 });

  const addBtn = ctx.ui.button('➕ Add a node (4 CPU, no SSD)', addNode, { cls: 'green', cost: 1 });
  status('A storm hit! <b>node-1</b> is going down…');

  // node-1 sinks, its pods go pending
  ctx.busy = true;
  setTimeout(() => {
    const s = shipObj['node-1'];
    ctx.sound.thud();
    stage.tweens.add(1.2, (k) => {
      s.position.y = -k * 2.2;
      s.rotation.z = k * 0.4;
    }).then(() => {
      s.visible = false;
      nodes[0].alive = false;
      pods.forEach((p) => { if (p.node === 'node-1') { p.node = null; podObj[p.id].visible = true; } });
      layout();
      ctx.busy = false;
      status();
    });
    pods.filter((p) => p.node === 'node-1').forEach((p) => (podObj[p.id].visible = false));
  }, 700);

  function buildShip(n) {
    const g = new THREE.Group();
    g.position.set(n.x, 0, 0);
    const hull = box(3.4, 0.7, 2.0, n.ssd ? 0x13753f : 0x5f6b62, 0.25);
    hull.position.y = -0.05;
    const deck = box(3.2, 0.1, 1.6, 0xfff1dc, 0.04);
    deck.position.y = 0.33;
    for (let s = 0; s < n.cpu; s++) {
      const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), new THREE.MeshBasicMaterial({ color: 0xe8d6bd }));
      slot.rotation.x = -Math.PI / 2;
      slot.position.set(-1.2 + s * 0.8, 0.39, 0);
      g.add(slot);
    }
    const tag = textPlane(`${n.id} · ${n.cpu} CPU${n.ssd ? ' · SSD' : ''}`, { size: 40, weight: 700, color: '#ffffff', bg: n.ssd ? '#0f5f33' : '#4a4458', height: 0.32, pad: 10, radius: 12 });
    tag.position.set(0, -0.05, 1.02);
    g.add(hull, deck, tag);
    stage.root.add(g);
    stage.clickable(g, () => pickNode(n));
    shipObj[n.id] = g;
  }

  function buildPod(p) {
    const g = new THREE.Group();
    const c = box(0.8 * p.cpu - 0.1, 0.7, 1.0, APP_COLORS[p.app], 0.12);
    const t = textPlane(p.id, { size: 40, weight: 700, color: '#ffffff', stroke: 'rgba(18,48,29,0.6)', height: 0.28, pad: 4 });
    t.scale.setScalar(Math.min(1, (0.8 * p.cpu - 0.2) / t.geometry.parameters.width));
    t.position.set(0, 0, 0.51);
    g.add(c, t);
    if (p.ssd) {
      const s = label('needs SSD', { size: 30, weight: 700, color: '#ffffff', bg: '#0f5f33', height: 0.24, pad: 6, radius: 8 });
      s.position.set(0, 0.6, 0);
      g.add(s);
    }
    stage.root.add(g);
    stage.clickable(g, () => pickPod(p));
    podObj[p.id] = g;
  }

  function layout(instant) {
    nodes.filter((n) => n.alive).forEach((n) => {
      let slot = 0;
      pods.filter((p) => p.node === n.id).forEach((p) => {
        const to = new THREE.Vector3(n.x - 1.2 + (slot + (p.cpu - 1) / 2) * 0.8, 0.75, 0);
        slot += p.cpu;
        place(p, to, instant);
      });
    });
    let x = 0;
    pods.filter((p) => !p.node).forEach((p) => {
      place(p, new THREE.Vector3(-6.5 + x + (p.cpu * 0.8) / 2, 0.45, 3.2), instant);
      x += p.cpu * 0.8 + 0.1;
    });
  }

  function place(p, to, instant) {
    const g = podObj[p.id];
    if (instant) g.position.copy(to);
    else stage.tweens.move(g, to, 0.45);
  }

  function used(nodeId) {
    return pods.filter((p) => p.node === nodeId).reduce((s, p) => s + p.cpu, 0);
  }

  function pickPod(p) {
    if (ctx.over || ctx.busy) return;
    if (sel) podObj[sel.id].scale.setScalar(1);
    sel = sel === p ? null : p;
    if (sel) {
      podObj[sel.id].scale.setScalar(1.15);
      ctx.sound.pickup();
    }
    status();
  }

  function pickNode(n) {
    if (ctx.over || ctx.busy || !sel) return;
    if (!n.alive) return;
    if (sel.node === n.id) return;
    const why = reject(sel, n);
    if (why) {
      ctx.sound.thud();
      ctx.toast(`Can’t schedule ${sel.id} on ${n.id}: ${why}`, 'bad', 3200);
      return;
    }
    if (!ctx.move()) return;
    sel.node = n.id;
    podObj[sel.id].scale.setScalar(1);
    sel = null;
    ctx.sound.collect();
    layout();
    status();
    if (pods.every((p) => p.node)) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 1.5, 0), PALETTE, 30, 4);
      ctx.win({ note: 'Every pod is running again, with replicas spread across nodes.' });
    }
  }

  function reject(p, n) {
    if (used(n.id) + p.cpu > n.cpu) return `not enough CPU (${n.cpu - used(n.id)} free, needs ${p.cpu}).`;
    if (p.ssd && !n.ssd) return 'this pod needs an SSD node.';
    if (pods.some((q) => q !== p && q.app === p.app && q.node === n.id)) return `another ${p.app} replica is already there (spread rule).`;
    return null;
  }

  function addNode() {
    if (added) {
      ctx.refund(1);
      ctx.toast('The node pool is at its limit.', 'hint');
      addBtn.disabled = true;
      return;
    }
    added = true;
    addBtn.disabled = true;
    const n = { id: 'node-4', cpu: 4, ssd: false, x: 6.2, alive: true };
    nodes.push(n);
    buildShip(n);
    const s = shipObj[n.id];
    s.position.x = 12;
    stage.tweens.move(s, new THREE.Vector3(6.2, 0, 0), 0.9);
    ctx.sound.whoosh();
    status();
  }

  function status(msg) {
    const pending = pods.filter((p) => !p.node).length;
    const caps = nodes.filter((n) => n.alive).map((n) => `${n.id} ${used(n.id)}/${n.cpu}`).join(' · ');
    ctx.status(msg || (sel ? `Now click a node for <b>${sel.id}</b> (${sel.cpu} CPU${sel.ssd ? ', needs SSD' : ''}).` : `<b>${pending}</b> pending · ${caps}`));
  }

  return {
    update() {
      const t = performance.now() / 700;
      nodes.forEach((n, i) => {
        const s = shipObj[n.id];
        if (n.alive && s && !ctx.busy) s.rotation.z = Math.sin(t + i) * 0.015;
      });
    },
  };
}
