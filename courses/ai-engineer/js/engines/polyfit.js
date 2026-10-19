// Fit polynomial curves: too simple underfits, too wiggly overfits; ridge regularisation tames it.
import * as THREE from 'three';
import { candy, box, grid, label, mulberry32, gauss, C, PALETTE } from '../../../shared/kit.js';

const SX = 5; // x in [−1, 1] → [−5, 5]
const SY = 3;

export default function polyfit(ctx) {
  const { stage, params } = ctx;
  const { train, val } = makeData(params.seed ?? 9);
  const lambdaMode = params.mode === 'lambda';

  stage.root.add(grid(-SX, SX, -4, 4, { opacity: 0.15 }));
  train.forEach(([x, y]) => {
    const b = candy('ball', C.pink, 0.36);
    b.position.set(x * SX, y * SY, 0.25);
    stage.root.add(b);
  });
  val.forEach(([x, y]) => {
    const b = candy('ball', C.blue, 0.24);
    b.position.set(x * SX, y * SY, 0.2);
    stage.root.add(b);
  });

  // error bars on the right
  const bars = new THREE.Group();
  bars.position.set(SX + 2.2, -3.6, 0);
  stage.root.add(bars);
  const trBar = box(0.8, 1, 0.6, C.pink, 0.15);
  const vaBar = box(0.8, 1, 0.6, C.blue, 0.15);
  trBar.position.x = -0.55;
  vaBar.position.x = 0.55;
  const scaleErr = (e) => 0.05 + Math.min(e / 0.1, 1) * 6.4;
  const goalLine = box(1.4, 0.06, 0.7, C.red, 0.02);
  goalLine.position.set(0.55, scaleErr(params.target), 0);
  const goalTag = label(`goal ${params.target}`, { size: 34, weight: 700, color: '#ffffff', bg: '#ff4d6d', height: 0.32, pad: 6, radius: 12 });
  goalTag.position.set(0.55, scaleErr(params.target) + 0.35, 0.4);
  const trTag = label('train', { size: 34, weight: 700, color: '#a87400', height: 0.32, pad: 4 });
  const vaTag = label('validation', { size: 34, weight: 700, color: '#0f5f33', height: 0.32, pad: 4 });
  trTag.position.set(-0.55, -0.4, 0.4);
  vaTag.position.set(0.75, -0.75, 0.4);
  bars.add(trBar, vaBar, goalLine, goalTag, trTag, vaTag);
  trBar.visible = vaBar.visible = false;

  let curve = null;
  stage.frame({ target: [1.4, 0, 0], w: SX * 2 + 6.2, h: 9, yaw: 0, pitch: 0.12 });

  const degrees = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let degStep = null, lamStep = null;
  if (lambdaMode) {
    lamStep = ctx.ui.stepper('λ', params.lambdas, 0, () => {}, { format: (v) => (v === 0 ? '0' : v >= 0.1 ? String(v) : v.toExponential(0)) });
    ctx.ui.group(`degree locked at ${params.deg0}`);
  } else {
    degStep = ctx.ui.stepper('degree', degrees, degrees.indexOf(params.deg0 ?? 9), () => {});
  }
  ctx.ui.button('📈 Fit the curve', fit, { cls: 'green', cost: 1 });
  ctx.status('Gold = training points (used to fit). Green = validation points (kept hidden from the fit).');

  function fit() {
    const deg = lambdaMode ? params.deg0 : degStep.value;
    const lam = lambdaMode ? lamStep.value : 0;
    const w = ridge(train, deg, lam);
    const tr = mse(w, train);
    const va = mse(w, val);
    drawCurve(w);
    ctx.sound.whoosh();
    trBar.visible = vaBar.visible = true;
    animateBar(trBar, scaleErr(tr));
    animateBar(vaBar, scaleErr(va));
    const ok = va <= params.target;
    ctx.status(`degree <b>${deg}</b>${lambdaMode ? ` · λ = <b>${lam}</b>` : ''} · train error <b>${tr.toFixed(4)}</b> · validation error <b class="${ok ? 'ok' : 'bad'}">${va.toFixed(4)}</b> (goal ≤ ${params.target})`);
    if (ok) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 0, 0.5), PALETTE, 30, 4);
      ctx.win();
    } else if (tr < 0.004) ctx.toast('Almost zero training error, but look at the validation bar: it memorised the noise.', 'hint', 3600);
    else if (tr > 0.05) ctx.toast('Too simple: it misses the shape of the hill even on the training points.', 'hint', 3600);
  }

  function animateBar(bar, h) {
    const from = bar.scale.y;
    stage.tweens.add(0.5, (k) => {
      bar.scale.y = from + (h - from) * k;
      bar.position.y = bar.scale.y / 2;
    });
  }

  function drawCurve(w) {
    if (curve) {
      stage.root.remove(curve);
      curve.geometry.dispose();
    }
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const x = -1 + (2 * i) / 160;
      const y = THREE.MathUtils.clamp(evalPoly(w, x), -1.3, 1.3);
      pts.push(new THREE.Vector3(x * SX, y * SY, 0.15));
    }
    curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.07, 8), new THREE.MeshPhysicalMaterial({ color: C.purple, clearcoat: 1, roughness: 0.3 }));
    stage.root.add(curve);
  }
}

function makeData(seed) {
  const f = (x) => Math.sin(2.6 * x) * 0.8 + 0.2 * x;
  const r = mulberry32(seed);
  const train = [];
  const val = [];
  for (let i = 0; i < 10; i++) {
    const x = -0.95 + (1.9 * i) / 9 + (r() - 0.5) * 0.08;
    train.push([x, f(x) + 0.18 * gauss(r)]);
  }
  for (let i = 0; i < 24; i++) {
    const x = -0.97 + (1.94 * (i + 0.5)) / 24;
    val.push([x, f(x) + 0.18 * gauss(r)]);
  }
  return { train, val };
}

// Ridge regression on polynomial features (the constant term is not penalised).
function ridge(pts, deg, lam) {
  const n = deg + 1;
  const A = [...Array(n)].map(() => Array(n).fill(0));
  const b = Array(n).fill(0);
  for (const [x, y] of pts) {
    const p = [...Array(n)].map((_, i) => x ** i);
    for (let i = 0; i < n; i++) {
      b[i] += p[i] * y;
      for (let j = 0; j < n; j++) A[i][j] += p[i] * p[j];
    }
  }
  for (let i = 1; i < n; i++) A[i][i] += lam;
  return solve(A, b);
}

function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

const evalPoly = (w, x) => w.reduce((s, c, i) => s + c * x ** i, 0);
const mse = (w, pts) => pts.reduce((s, [x, y]) => s + (evalPoly(w, x) - y) ** 2, 0) / pts.length;
