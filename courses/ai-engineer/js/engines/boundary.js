// A linear classifier you steer by hand: turn and slide the wall to split two classes.
import * as THREE from 'three';
import { candy, box, grid, mulberry32, gauss, bfs, C, PALETTE } from '../../../shared/kit.js';

const SPAN = 5;

export default function boundary(ctx) {
  const { stage, params } = ctx;
  const rng = mulberry32(params.seed ?? 1);
  const n = params.n ?? 22;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const cls = i % 2;
    const c = cls ? [1.6, -1.2] : [-1.6, 1.3];
    pts.push({ x: c[0] + gauss(rng) * 0.8, y: c[1] + gauss(rng) * 0.8, cls });
  }
  pts.forEach((p) => { p.x = THREE.MathUtils.clamp(p.x, -SPAN + 0.3, SPAN - 0.3); p.y = THREE.MathUtils.clamp(p.y, -SPAN + 0.3, SPAN - 0.3); });

  const angles = 24; // 15° steps for the wall's normal
  const offs = [];
  for (let d = -5; d <= 5 + 1e-9; d += 0.5) offs.push(+d.toFixed(1));
  const acc = (ai, oi) => {
    const a = THREE.MathUtils.degToRad(ai * 15);
    const nx = Math.cos(a), ny = Math.sin(a);
    return pts.filter((p) => (nx * p.x + ny * p.y > offs[oi] ? 1 : 0) === p.cls).length / n;
  };
  let best = 0;
  for (let ai = 0; ai < angles; ai++) for (let oi = 0; oi < offs.length; oi++) best = Math.max(best, acc(ai, oi));
  const target = Math.min(params.targetAcc ?? 1, best);

  let ai = Math.round((params.angle0 ?? 0) / 15);
  let oi = offs.indexOf(params.offset0 ?? 3);
  const par = bfs([ai, oi], ([a, o]) => [[(a + 1) % angles, o], [(a + angles - 1) % angles, o], [a, o + 1], [a, o - 1]].filter(([, q]) => q >= 0 && q < offs.length),
    ([a, o]) => acc(a, o) >= target - 1e-9);
  ctx.budget({ par, moves: par + (params.extra ?? 5) });

  stage.root.add(grid(-SPAN, SPAN, -SPAN, SPAN, { opacity: 0.18 }));
  // tinted half-planes
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(SPAN * 2, SPAN * 2), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { n: { value: new THREE.Vector2(1, 0) }, d: { value: 0 } },
    vertexShader: 'varying vec2 vp; void main(){ vp = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec2 n; uniform float d; varying vec2 vp; void main(){ float s = dot(n, vp) - d; vec3 c = s > 0.0 ? vec3(0.09,0.54,0.30) : vec3(0.96,0.70,0.0); gl_FragColor = vec4(c, 0.16 + 0.1 * smoothstep(0.6, 0.0, abs(s))); }',
  }));
  tint.position.z = 0.005;
  stage.root.add(tint);

  const balls = pts.map((p) => {
    const b = candy('ball', p.cls ? C.blue : C.pink, 0.42);
    b.position.set(p.x, p.y, 0.25);
    stage.root.add(b);
    return b;
  });
  const missMat = new THREE.MeshBasicMaterial({ color: 0xff2a55 });
  const misses = pts.map((p) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 8, 28), missMat);
    r.position.set(p.x, p.y, 0.25);
    stage.root.add(r);
    return r;
  });

  const wall = new THREE.Group();
  const stripes = 14;
  for (let k = 0; k < stripes; k++) {
    const seg = box(0.26, 1.0, 0.5, k % 2 ? C.white : C.red, 0.1);
    seg.position.y = (k - (stripes - 1) / 2) * 1.0;
    wall.add(seg);
  }
  stage.root.add(wall);

  stage.frame({ target: [0, 0, 0], w: SPAN * 2 + 1, h: SPAN * 2 + 1, yaw: 0, pitch: 0.2 });

  ctx.ui.button('⟲ Turn', () => turn(1), { cls: 'blue', cost: 1 });
  ctx.ui.button('⟳ Turn', () => turn(-1), { cls: 'blue', cost: 1 });
  ctx.ui.button('⬅ Slide', () => slide(-1), { cls: 'purple', cost: 1 });
  ctx.ui.button('Slide ➡', () => slide(1), { cls: 'purple', cost: 1 });

  let shownA = ai * 15;
  let shownD = offs[oi];
  update(false);

  function turn(d) {
    ai = (ai + d + angles) % angles;
    ctx.sound.pop();
    update();
  }
  function slide(d) {
    if (oi + d < 0 || oi + d >= offs.length) {
      ctx.refund(1);
      ctx.toast('The wall can’t go further that way.', 'hint');
      return;
    }
    oi += d;
    ctx.sound.pop();
    update();
  }

  function update(canWin = true) {
    const a = acc(ai, oi);
    const rad = THREE.MathUtils.degToRad(ai * 15);
    const nx = Math.cos(rad), ny = Math.sin(rad);
    pts.forEach((p, i) => (misses[i].visible = (nx * p.x + ny * p.y > offs[oi] ? 1 : 0) !== p.cls));
    ctx.status(`Accuracy <b class="${a >= target ? 'ok' : ''}">${Math.round(a * 100)}%</b> · goal ${Math.round(target * 100)}% · red rings = misclassified · w·x + b = 0 with w at ${ai * 15}°`);
    if (canWin && a >= target - 1e-9) {
      ctx.sound.gem();
      stage.fx.burst(new THREE.Vector3(0, 0, 0.5), PALETTE, 30, 4);
      ctx.win();
    }
  }

  return {
    update(dt) {
      const k = 1 - Math.exp(-dt * 10);
      let da = ai * 15 - shownA;
      da = ((da + 540) % 360) - 180;
      shownA += da * k;
      shownD += (offs[oi] - shownD) * k;
      const rad = THREE.MathUtils.degToRad(shownA);
      const nx = Math.cos(rad), ny = Math.sin(rad);
      tint.material.uniforms.n.value.set(nx, ny);
      tint.material.uniforms.d.value = shownD;
      wall.position.set(nx * shownD, ny * shownD, 0.25);
      wall.rotation.z = rad;
      // keep the wall inside the board
      wall.children.forEach((s) => {
        const wp = new THREE.Vector3(0, s.position.y, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), rad).add(wall.position);
        s.visible = Math.abs(wp.x) < SPAN + 0.2 && Math.abs(wp.y) < SPAN + 0.2;
      });
      balls.forEach((b, i) => { if (misses[i].visible) b.scale.setScalar(0.42 * (1 + Math.sin(performance.now() / 150) * 0.08)); else b.scale.setScalar(0.42); });
    },
  };
}
