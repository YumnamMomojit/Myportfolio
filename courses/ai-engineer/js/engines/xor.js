// Train a real 2-2-1 network on XOR with backpropagation, live in the browser.
import * as THREE from 'three';
import { candy, candyMat, box, label, setLabel, mulberry32, C, PALETTE } from '../kit.js';

const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
const Y = [0, 1, 1, 0];
const ACTS = {
  tanh: { f: Math.tanh, d: (y) => 1 - y * y },
  sigmoid: { f: (x) => 1 / (1 + Math.exp(-x)), d: (y) => y * (1 - y) },
  relu: { f: (x) => Math.max(0, x), d: (y) => (y > 0 ? 1 : 0) },
};

export default function xor(ctx) {
  const { stage, params } = ctx;
  const H = 2;
  let seedIdx = 0;
  let net = init(params.seeds[0]);
  const losses = [];

  // ── network diagram
  const P = {
    in: [new THREE.Vector3(-6, 1.3, 0), new THREE.Vector3(-6, -1.3, 0)],
    hid: [new THREE.Vector3(-3.6, 1.3, 0), new THREE.Vector3(-3.6, -1.3, 0)],
    out: new THREE.Vector3(-1.3, 0, 0),
  };
  [...P.in, ...P.hid].forEach((p, i) => {
    const b = candy('ball', i < 2 ? C.white : C.pink, i < 2 ? 0.8 : 1.0);
    b.position.copy(p);
    stage.root.add(b);
  });
  const outBall = candy('ball', C.purple, 1.1);
  outBall.position.copy(P.out);
  stage.root.add(outBall);
  const edges = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < 2; i++) edges.push({ m: edge(P.in[i], P.hid[j]), get: () => net.W1[j][i] });
  for (let j = 0; j < H; j++) edges.push({ m: edge(P.hid[j], P.out), get: () => net.W2[j] });
  function edge(a, b) {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, d.length(), 10), candyMat(C.white));
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    stage.root.add(m);
    return m;
  }
  [['x₁', P.in[0]], ['x₂', P.in[1]], ['out', P.out]].forEach(([t, p]) => {
    const l = label(t, { size: 46, weight: 700, color: '#15331f', height: 0.38, pad: 4 });
    l.position.copy(p).add(new THREE.Vector3(0, -0.9, 0.3));
    stage.root.add(l);
  });
  const hidTag = label('hidden layer', { size: 38, weight: 600, color: '#a87400', height: 0.34, pad: 4 });
  hidTag.position.set(-3.6, 2.4, 0.3);
  stage.root.add(hidTag);

  // ── decision surface
  const RES = 48;
  const data = new Uint8Array(RES * RES * 4);
  const tex = new THREE.DataTexture(data, RES, RES);
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const SURF = 4.4;
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(SURF, SURF), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  surf.position.set(2.6, 0.3, 0);
  const frameBox = box(SURF + 0.4, SURF + 0.4, 0.2, C.white, 0.2);
  frameBox.position.set(2.6, 0.3, -0.14);
  stage.root.add(frameBox, surf);
  const toSurf = (a, b) => new THREE.Vector3(2.6 + ((a + 0.25) / 1.5 - 0.5) * SURF, 0.3 + ((b + 0.25) / 1.5 - 0.5) * SURF, 0.25);
  const dots = X.map((x, i) => {
    const d = candy('ball', Y[i] ? C.pink : C.blue, 0.5);
    d.position.copy(toSurf(...x));
    stage.root.add(d);
    return d;
  });

  // ── loss chart
  const chart = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xa87400 }));
  chart.position.set(5.5, -2.0, 0);
  const chartBg = box(3.2, 2.4, 0.15, 0xfff7fb, 0.15);
  chartBg.position.set(7.0, -0.9, -0.1);
  const chartTag = label('loss', { size: 40, weight: 700, color: '#4f6b55', height: 0.34, pad: 4 });
  chartTag.position.set(7.0, 0.65, 0.2);
  stage.root.add(chartBg, chart, chartTag);
  const lossTag = label('', { size: 44, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.4, pad: 8, radius: 14 });
  lossTag.position.set(7.0, -2.55, 0.3);
  stage.root.add(lossTag);

  stage.frame({ target: [0.7, -0.1, 0], w: 16.2, h: 6.8, yaw: 0, pitch: 0.1 });

  const act = ctx.ui.stepper('activation', params.acts, 0, () => refresh());
  const lr = ctx.ui.stepper('learning rate', params.lrs, 1, () => {});
  ctx.ui.break();
  ctx.ui.button(`🏋 Train ${params.epochs} epochs`, train, { cls: 'green', cost: 1 });
  ctx.ui.button('🎲 Re-initialise', reinit, { cls: 'purple', cost: 1 });
  refresh();

  function init(seed) {
    const r = mulberry32(seed);
    const g = () => r() * 2 - 1;
    return { W1: [...Array(H)].map(() => [g(), g()]), b1: Array(H).fill(0), W2: [...Array(H)].map(g), b2: 0 };
  }

  function forward(x) {
    const f = ACTS[act.value].f;
    const h = net.W1.map((w, j) => f(w[0] * x[0] + w[1] * x[1] + net.b1[j]));
    const o = 1 / (1 + Math.exp(-h.reduce((s, v, j) => s + v * net.W2[j], net.b2)));
    return { h, o };
  }

  function loss() {
    return X.reduce((s, x, i) => {
      const o = forward(x).o;
      return s - (Y[i] * Math.log(o + 1e-9) + (1 - Y[i]) * Math.log(1 - o + 1e-9));
    }, 0) / 4;
  }

  // Full-batch gradient descent with backpropagation.
  function epoch(rate) {
    const a = ACTS[act.value];
    const gW1 = net.W1.map(() => [0, 0]);
    const gb1 = net.b1.map(() => 0);
    const gW2 = net.W2.map(() => 0);
    let gb2 = 0;
    X.forEach((x, i) => {
      const { h, o } = forward(x);
      const d = o - Y[i]; // dLoss/dlogit for sigmoid + cross-entropy
      gb2 += d;
      h.forEach((hv, j) => {
        gW2[j] += d * hv;
        const dh = d * net.W2[j] * a.d(hv);
        gb1[j] += dh;
        gW1[j][0] += dh * x[0];
        gW1[j][1] += dh * x[1];
      });
    });
    net.b2 -= (rate * gb2) / 4;
    net.W2 = net.W2.map((w, j) => w - (rate * gW2[j]) / 4);
    net.b1 = net.b1.map((b, j) => b - (rate * gb1[j]) / 4);
    net.W1 = net.W1.map((w, j) => [w[0] - (rate * gW1[j][0]) / 4, w[1] - (rate * gW1[j][1]) / 4]);
  }

  async function train() {
    ctx.busy = true;
    ctx.sound.whoosh();
    const chunks = 10;
    for (let c = 0; c < chunks; c++) {
      for (let e = 0; e < params.epochs / chunks; e++) epoch(lr.value);
      losses.push(loss());
      refresh();
      await new Promise((r) => setTimeout(r, 45));
    }
    ctx.busy = false;
    const L = loss();
    const correct = X.every((x, i) => Math.round(forward(x).o) === Y[i]);
    if (L < 0.05 && correct) {
      ctx.sound.gem();
      stage.fx.burst(outBall.position.clone(), PALETTE, 30, 4);
      ctx.win({ note: `Final loss ${L.toFixed(3)}. The two hidden neurons each drew one line; together they carve out XOR.` });
    } else if (L > 0.2 && Math.abs(L - losses[Math.max(0, losses.length - 11)]) < 0.01) {
      ctx.toast('The loss has stopped falling: the network is stuck in a bad spot.', 'hint', 3600);
    }
  }

  function reinit() {
    seedIdx = (seedIdx + 1) % params.seeds.length;
    net = init(params.seeds[seedIdx]);
    losses.length = 0;
    ctx.sound.warp();
    refresh();
  }

  function refresh() {
    // surface
    for (let yy = 0; yy < RES; yy++) {
      for (let xx = 0; xx < RES; xx++) {
        const o = forward([-0.25 + (1.5 * (xx + 0.5)) / RES, -0.25 + (1.5 * (yy + 0.5)) / RES]).o;
        const c = new THREE.Color(0x8fe3b0).lerp(new THREE.Color(0xffd54f), o);
        const k = (yy * RES + xx) * 4;
        data[k] = c.r * 255; data[k + 1] = c.g * 255; data[k + 2] = c.b * 255; data[k + 3] = 255;
      }
    }
    tex.needsUpdate = true;
    edges.forEach((e) => {
      const w = e.get();
      const t = 0.025 + Math.min(Math.abs(w), 6) * 0.025;
      e.m.scale.set(t, 1, t);
      e.m.material = candyMat(w >= 0 ? C.pink : C.blue);
    });
    // chart
    const pts = losses.map((l, i) => new THREE.Vector3((i / Math.max(losses.length - 1, 1)) * 3, Math.min(l, 0.8) / 0.8 * 2.2, 0.05));
    chart.geometry.dispose();
    chart.geometry = new THREE.BufferGeometry().setFromPoints(pts.length > 1 ? pts : [new THREE.Vector3(), new THREE.Vector3()]);
    const L = loss();
    setLabel(lossTag, `loss ${L.toFixed(3)}`, { size: 44, weight: 700, color: '#ffffff', bg: L < 0.05 ? '#1c9e58' : '#15331f', height: 0.4, pad: 8, radius: 14 });
    const preds = X.map((x) => forward(x).o);
    ctx.status(`Predictions ${X.map((x, i) => `${x.join('')}→<b class="${Math.round(preds[i]) === Y[i] ? 'ok' : 'bad'}">${preds[i].toFixed(2)}</b>`).join(' · ')} · goal: loss &lt; 0.05`);
    dots.forEach((d, i) => d.scale.setScalar(Math.round(preds[i]) === Y[i] ? 0.5 : 0.62));
  }
}
