// Autoscaling tycoon: add servers before traffic peaks (they take an hour to boot), drop them after.
import * as THREE from 'three';
import { box, candy, candyMat, label, setLabel, C, PALETTE } from '../../../shared/kit.js';

export default function autoscale(ctx) {
  const { stage, params } = ctx;
  const traffic = params.traffic;
  const CAP = params.cap;
  const H = traffic.length;
  const total = traffic.reduce((a, b) => a + b, 0);
  ctx.budget({ moves: H, par: null, stars: 'engine' });

  let hour = 0;
  let prevN = 1; // one server already running
  let N = 1;
  let cost = 0;
  let served = 0;
  let dropped = 0;

  // ground and road
  const ground = box(16, 0.3, 6, 0xd8f3ff, 0.2);
  ground.position.set(0, -0.15, 0);
  stage.root.add(ground);
  const road = box(16, 0.06, 1.0, 0x5f6b62, 0.03);
  road.position.set(0, 0.03, 2.1);
  stage.root.add(road);

  // forecast bars along the back
  const maxT = Math.max(...traffic);
  const bars = traffic.map((v, i) => {
    const g = new THREE.Group();
    g.position.set(-6.6 + i * 1.2, 0, -2.4);
    const b = box(0.85, 1, 0.6, C.purple, 0.12);
    const tag = label('', { size: 34, weight: 700, color: '#15331f', height: 0.3, pad: 4 });
    const hr = label(`${i + 9 > 12 ? i - 3 : i + 9}${i + 9 >= 12 ? 'pm' : 'am'}`, { size: 30, weight: 600, color: '#4f6b55', height: 0.26, pad: 2 });
    hr.position.set(0, -0.25, 0.4);
    g.add(b, tag, hr);
    stage.root.add(g);
    return { g, b, tag };
  });
  const capLine = box(1.1, 0.06, 0.7, C.red, 0.02);
  stage.root.add(capLine);

  // servers
  const towers = [];
  const MAXN = 10;
  for (let i = 0; i < MAXN; i++) {
    const g = new THREE.Group();
    g.position.set(-4.2 + (i % 5) * 1.5, 0, i < 5 ? 0.2 : -1.1);
    const body = box(1.0, 1.6, 0.9, C.teal, 0.15);
    body.position.y = 0.8;
    const lights = [0, 1, 2].map((k) => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), new THREE.MeshBasicMaterial({ color: 0xb6fff2 }));
      l.position.set(0, 0.4 + k * 0.4, 0.46);
      g.add(l);
      return l;
    });
    g.add(body);
    g.visible = false;
    stage.root.add(g);
    towers.push({ g, body, lights });
  }
  const cars = new THREE.Group();
  stage.root.add(cars);
  const clock = label('', { size: 46, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.42, pad: 12, radius: 16 });
  clock.position.set(4.6, 2.6, 0.5);
  const money = label('', { size: 42, weight: 700, color: '#15331f', bg: 'rgba(255,255,255,0.94)', height: 0.4, pad: 10, radius: 14 });
  money.position.set(4.6, 1.85, 0.5);
  stage.root.add(clock, money);

  stage.frame({ target: [0, 0.6, 0], w: 16, h: 6.5, yaw: 0, pitch: 0.5 });

  const nStep = ctx.ui.stepper('servers this hour', [...Array(MAXN + 1).keys()], 1, (v) => { N = v; refresh(); });
  ctx.ui.button('▶ Run this hour', runHour, { cls: 'green big', cost: 1 });
  refresh();

  function refresh() {
    bars.forEach((b, i) => {
      const known = i <= hour + 2;
      const h = known ? 0.15 + (traffic[i] / maxT) * 2.4 : 0.35;
      b.b.scale.y = h;
      b.b.position.y = h / 2;
      b.b.material = candyMat(!known ? 0xe2e2d0 : i === hour ? C.pink : i < hour ? 0xcfe3c0 : C.purple);
      setLabel(b.tag, known ? String(traffic[i]) : '?', { size: 34, weight: 700, color: '#15331f', height: 0.3, pad: 4 });
      b.tag.position.set(0, h + 0.3, 0.3);
    });
    if (hour < H) {
      const capH = 0.15 + (Math.min(prevN, N) * CAP / maxT) * 2.4;
      capLine.position.set(bars[hour].g.position.x, Math.min(capH, 3.2), -2.4);
      capLine.visible = true;
    } else capLine.visible = false;
    const ready = Math.min(prevN, N);
    const booting = Math.max(0, N - prevN);
    towers.forEach((tw, i) => {
      tw.g.visible = i < N;
      const isReady = i < ready;
      tw.body.material = candyMat(isReady ? C.teal : 0xbfc6b8);
      tw.lights.forEach((l) => (l.material.color.set(isReady ? 0xb6fff2 : 0x8a9488)));
    });
    setLabel(clock, hour < H ? `🕘 ${bars[hour] ? (hour + 9 > 12 ? hour - 3 : hour + 9) + (hour + 9 >= 12 ? ' pm' : ' am') : ''} · hour ${hour + 1}/${H}` : '🕘 day over', { size: 46, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.42, pad: 12, radius: 16 });
    setLabel(money, `💰 $${cost} of $${params.budget}`, { size: 42, weight: 700, color: cost > params.budget ? '#ff4d6d' : '#15331f', bg: 'rgba(255,255,255,0.94)', height: 0.4, pad: 10, radius: 14 });
    const sla = served + dropped ? (served / (served + dropped)) * 100 : 100;
    ctx.status(hour < H
      ? `This hour: <b>${traffic[hour]}</b> req/s · ready capacity <b>${ready * CAP}</b> (${ready} ready${booting ? `, ${booting} booting` : ''}) · served so far <b>${sla.toFixed(1)}%</b> (goal ≥ 98%)`
      : `Served ${sla.toFixed(1)}% · cost $${cost}`);
  }

  async function runHour() {
    const ready = Math.min(prevN, N);
    const cap = ready * CAP;
    const s = Math.min(traffic[hour], cap);
    served += s;
    dropped += traffic[hour] - s;
    cost += N;
    ctx.busy = true;
    ctx.sound.whoosh();
    // cars: green ones get served, red ones bounce
    const nCars = Math.round(traffic[hour] / 60);
    const ok = Math.round((s / traffic[hour]) * nCars);
    const runs = [];
    for (let k = 0; k < nCars; k++) {
      const car = candy('cube', k < ok ? C.green : C.red, 0.28);
      car.position.set(-8, 0.25, 2.1);
      cars.add(car);
      const good = k < ok;
      const dest = good && ready ? towers[k % ready].g.position.clone().add(new THREE.Vector3(0, 0.3, 0.5)) : new THREE.Vector3(8, 0.25, 2.1);
      runs.push(stage.tweens.add(0.7, (t) => {
        car.position.set(-8 + (dest.x + 8) * t, 0.25 + (good ? Math.sin(t * Math.PI) * 0.5 : Math.abs(Math.sin(t * Math.PI * 3)) * 0.6), 2.1 + (dest.z - 2.1) * t * t);
      }, undefined, k * 0.03).then(() => cars.remove(car)));
    }
    await Promise.all(runs);
    if (dropped / total > 0.02 + 1e-9) {
      ctx.busy = false;
      refresh();
      ctx.fail(`Too many requests were dropped: ${dropped} so far, over the 2% the SLA allows (${Math.floor(total * 0.02)}). Add servers an hour <i>before</i> the traffic arrives.`);
      return;
    }
    if (cost > params.budget) {
      ctx.busy = false;
      refresh();
      ctx.fail(`Over budget: $${cost} of $${params.budget}. Remove servers as soon as traffic drops.`);
      return;
    }
    prevN = N;
    hour++;
    refresh();
    ctx.busy = false;
    if (hour >= H) {
      const stars = cost <= params.three ? 3 : cost <= params.two ? 2 : 1;
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 2, 0), PALETTE, 30, 4);
      ctx.win({ stars, note: `Served ${(served / total * 100).toFixed(1)}% of requests for $${cost}. ★★★ needs $${params.three} or less.` });
    } else if (traffic[hour] > Math.min(prevN, N) * CAP) {
      ctx.toast(`Next hour brings ${traffic[hour]} req/s: only ${Math.min(prevN, N) * CAP} capacity is ready.`, 'hint', 3000);
    }
  }
}
