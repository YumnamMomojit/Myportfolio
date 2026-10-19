// Batching diner: wait to fill the GPU batch, but serve before customers lose patience.
import * as THREE from 'three';
import { box, candy, label, setLabel, textPlane, PALETTE } from '../kit.js';

export default function batching(ctx) {
  const { stage, params } = ctx;
  const arrivals = params.arrivals;
  const P = params.patience;
  const MAXB = params.maxBatch;
  const T = arrivals.length;
  const best = minLaunches(arrivals, P, MAXB);
  ctx.budget({ moves: T, par: null, stars: 'engine' });

  let t = 0;
  let launches = 0;
  let served = 0;
  let queue = []; // { age, mesh, ring }
  let nextId = 0;

  // scene: counter, oven, clock
  const counter = box(9, 0.5, 2.2, 0xffe0ef, 0.2);
  counter.position.set(-1.5, -1.6, 0);
  stage.root.add(counter);
  const oven = new THREE.Group();
  oven.position.set(5.2, -0.2, 0);
  const shell = box(2.6, 2.6, 2.0, 0x5b5f73, 0.25);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x331a00, emissive: 0xff7a00, emissiveIntensity: 0.15 });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2), windowMat);
  win.position.set(0, 0.1, 1.01);
  const ovenTag = textPlane('GPU', { size: 50, weight: 700, color: '#ffffff', height: 0.36, pad: 4 });
  ovenTag.position.set(0, -0.95, 1.02);
  oven.add(shell, win, ovenTag);
  stage.root.add(oven);
  const clock = label('', { size: 48, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.45, pad: 12, radius: 16 });
  clock.position.set(-1.5, 2.8, 0);
  stage.root.add(clock);
  const forecast = label('', { size: 38, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.92)', height: 0.36, pad: 10, radius: 14 });
  forecast.position.set(-6.2, 1.9, 0);
  stage.root.add(forecast);

  stage.frame({ target: [-0.4, 0.4, 0], w: 14.5, h: 6.8, yaw: 0, pitch: 0.16 });

  ctx.ui.button('🔥 Serve now', () => tick(true), { cls: 'orange big', cost: 1 });
  ctx.ui.button('⏳ Wait one tick', () => tick(false), { cls: 'blue big', cost: 1 });
  arrive();
  refresh();

  function arrive() {
    for (let k = 0; k < arrivals[t]; k++) {
      const g = new THREE.Group();
      const body = candy('bean', PALETTE[nextId % PALETTE.length], 0.9);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.45;
      const head = candy('ball', 0xffe0c2, 0.45);
      head.position.y = 1.1;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 32, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: 0x2fcf78, side: THREE.DoubleSide }));
      ring.position.set(0, 1.75, 0);
      g.add(body, head, ring);
      g.position.set(-8, -1.35, 0);
      stage.root.add(g);
      queue.push({ age: 0, g, ring, id: nextId++ });
    }
    layoutQueue();
  }

  function layoutQueue() {
    queue.forEach((c, i) => {
      const to = new THREE.Vector3(3.0 - i * 0.95, -1.35, (i % 2) * 0.4 - 0.2);
      stage.tweens.move(c.g, to, 0.4);
      const left = (P - c.age) / P;
      c.ring.geometry.dispose();
      c.ring.geometry = new THREE.RingGeometry(0.28, 0.38, 32, 1, Math.PI / 2, Math.PI * 2 * Math.max(left, 0.02));
      c.ring.material.color.set(left > 0.6 ? 0x2fcf78 : left > 0.3 ? 0xffb800 : 0xff2a55);
    });
  }

  async function tick(serve) {
    ctx.busy = true;
    if (serve) {
      if (!queue.length) ctx.toast('The oven ran empty: that GPU run was wasted.', 'bad');
      launches++;
      const batch = queue.splice(0, MAXB);
      served += batch.length;
      ctx.sound.whoosh();
      await Promise.all(batch.map((c, i) => stage.tweens.move(c.g, oven.position.clone().add(new THREE.Vector3(0, -0.3, 0.4)), 0.35, undefined, i * 0.05)));
      batch.forEach((c) => { stage.root.remove(c.g); });
      windowMat.emissiveIntensity = 2.2;
      stage.fx.burst(oven.position.clone().add(new THREE.Vector3(0, 1.4, 1)), PALETTE, 6 + batch.length * 3, 3);
      ctx.sound.collect();
    } else ctx.sound.click();
    // time passes
    queue.forEach((c) => c.age++);
    const angry = queue.filter((c) => c.age > P);
    t++;
    if (angry.length) {
      layoutQueue();
      ctx.busy = false;
      ctx.fail(`${angry.length} request${angry.length > 1 ? 's' : ''} waited more than ${P} ticks and left. Serve before the patience ring runs out.`);
      return;
    }
    if (t < T) arrive();
    else layoutQueue();
    refresh();
    await new Promise((r) => setTimeout(r, 250));
    ctx.busy = false;
    if (t >= T) {
      if (queue.length) {
        ctx.fail(`Closing time with ${queue.length} request${queue.length > 1 ? 's' : ''} never served.`);
        return;
      }
      const stars = launches <= best ? 3 : launches <= best + 1 ? 2 : 1;
      ctx.win({ stars, note: `Served all ${served} requests in <b>${launches}</b> GPU runs (the fewest possible is ${best}).` });
    }
  }

  function refresh() {
    setLabel(clock, t < T ? `⏰ tick ${t + 1} / ${T}` : '⏰ closing', { size: 48, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.45, pad: 12, radius: 16 });
    const next = arrivals.slice(t + 1, t + 3);
    setLabel(forecast, next.length ? `next ticks: ${next.map((n) => `+${n}`).join(', ')}` : 'no more arrivals', { size: 38, weight: 600, color: '#15331f', bg: 'rgba(255,255,255,0.92)', height: 0.36, pad: 10, radius: 14 });
    const oldest = queue.length ? Math.max(...queue.map((c) => c.age)) : 0;
    ctx.status(`Waiting <b>${queue.length}</b> · oldest has waited <b>${oldest}</b> of ${P} ticks · GPU runs <b>${launches}</b> (★★★ in ${best}) · served <b>${served}</b>`);
  }

  return {
    update(dt) {
      windowMat.emissiveIntensity += (0.15 - windowMat.emissiveIntensity) * (1 - Math.exp(-dt * 3));
    },
  };
}

// Fewest GPU runs that serve everyone in time (tries every serve/wait sequence).
function minLaunches(arr, P, MAXB) {
  let best = Infinity;
  const T = arr.length;
  for (let mask = 0; mask < 1 << T; mask++) {
    let q = [];
    let ok = true;
    let runs = 0;
    for (let t = 0; t < T && ok; t++) {
      for (let k = 0; k < arr[t]; k++) q.push(0);
      if (mask & (1 << t)) { runs++; q = q.slice(MAXB); }
      q = q.map((a) => a + 1);
      if (q.some((a) => a > P)) ok = false;
    }
    if (ok && !q.length) best = Math.min(best, runs);
  }
  return best;
}
