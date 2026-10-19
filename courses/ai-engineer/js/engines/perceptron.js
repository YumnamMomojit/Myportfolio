// One neuron: tune two weights and a bias to compute logic gates, then face XOR.
import * as THREE from 'three';
import { candy, candyMat, box, label, setLabel, bfs, C, PALETTE } from '../../../shared/kit.js';

const GATES = {
  AND: [0, 0, 0, 1],
  OR: [0, 1, 1, 1],
  NAND: [1, 1, 1, 0],
  NOR: [1, 0, 0, 0],
};
const INPUTS = [[0, 0], [0, 1], [1, 0], [1, 1]];

export default function perceptron(ctx) {
  const { stage, params } = ctx;
  const gates = params.gates;
  const step = params.step ?? 0.5;
  const values = [];
  for (let v = -2; v <= 2 + 1e-9; v += step) values.push(+v.toFixed(2));
  const zero = values.indexOf(0);
  const out = (s, [a, b]) => (values[s[0]] * a + values[s[1]] * b + values[s[2]] > 0 ? 1 : 0);
  const solves = (s, g) => INPUTS.every((x, i) => out(s, x) === GATES[g][i]);

  // Fewest +/- presses to solve every gate in order (a gate counts as soon as it is solved).
  const par = bfs([zero, zero, zero, 0], ([a, b, c, r]) => {
    const nx = [];
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(([da, db, dc]) => {
      const s = [a + da, b + db, c + dc];
      if (s.some((v) => v < 0 || v >= values.length)) return;
      let rr = r;
      while (rr < gates.length && solves(s, gates[rr])) rr++;
      nx.push([...s, rr]);
    });
    return nx;
  }, (s) => s[3] >= gates.length);
  ctx.budget({ par, moves: par + (params.extra ?? 6) });

  // ── the neuron diagram (left)
  const nodePos = { x1: new THREE.Vector3(-5, 1.4, 0), x2: new THREE.Vector3(-5, -1.4, 0), n: new THREE.Vector3(-2.2, 0, 0), o: new THREE.Vector3(-0.4, 0, 0) };
  const inA = candy('ball', C.white, 0.9);
  const inB = candy('ball', C.white, 0.9);
  inA.position.copy(nodePos.x1);
  inB.position.copy(nodePos.x2);
  const neuron = candy('ball', C.pink, 1.5);
  neuron.position.copy(nodePos.n);
  const outBulb = candy('ball', 0x4c5a50, 0.7);
  outBulb.position.copy(nodePos.o);
  stage.root.add(inA, inB, neuron, outBulb);
  [['x₁', nodePos.x1], ['x₂', nodePos.x2]].forEach(([t, p]) => {
    const l = label(t, { size: 54, weight: 700, color: '#15331f', height: 0.45, pad: 4 });
    l.position.copy(p).add(new THREE.Vector3(-0.85, 0, 0.3));
    stage.root.add(l);
  });
  const edgeA = edge(nodePos.x1, nodePos.n);
  const edgeB = edge(nodePos.x2, nodePos.n);
  edge(nodePos.n, nodePos.o).material = candyMat(C.white);
  const wTagA = label('', { size: 42, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.4, pad: 8, radius: 14 });
  const wTagB = label('', { size: 42, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.4, pad: 8, radius: 14 });
  const bTag = label('', { size: 42, weight: 700, color: '#ffffff', bg: '#13753f', height: 0.4, pad: 8, radius: 14 });
  wTagA.position.set(-3.6, 1.25, 0.6);
  wTagB.position.set(-3.6, -1.25, 0.6);
  bTag.position.set(-2.2, 1.25, 0.6);
  stage.root.add(wTagA, wTagB, bTag);

  function edge(a, b) {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, d.length(), 12), candyMat(C.white));
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    m.scale.set(0.05, 1, 0.05);
    stage.root.add(m);
    return m;
  }

  // ── the input space (right): 4 corners and the neuron's dividing line
  const O = new THREE.Vector3(1.4, -1.6, 0);
  const S = 3.2;
  const board = box(S + 1.6, S + 1.6, 0.2, 0xfff7fb, 0.25);
  board.position.set(O.x + S / 2, O.y + S / 2, -0.15);
  stage.root.add(board);
  const tint = new THREE.Mesh(new THREE.PlaneGeometry(S + 1.4, S + 1.4), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { w: { value: new THREE.Vector3() } },
    vertexShader: 'varying vec2 vp; void main(){ vp = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 w; varying vec2 vp; void main(){ vec2 u = vp / ${S.toFixed(2)} + 0.5; float s = w.x*u.x + w.y*u.y + w.z; float edge = smoothstep(0.05, 0.0, abs(s) / max(length(w.xy), 0.001)); vec3 c = s > 0.0 ? vec3(0.37,0.9,0.6) : vec3(0.86,0.86,0.78); gl_FragColor = vec4(mix(c, vec3(0.07,0.19,0.11), edge), 0.35 + 0.5*edge); }`,
  }));
  tint.position.set(O.x + S / 2, O.y + S / 2, -0.03);
  stage.root.add(tint);
  const corners = INPUTS.map(([a, b]) => {
    const g = new THREE.Group();
    g.position.set(O.x + a * S, O.y + b * S, 0.2);
    const ball = candy('ball', C.white, 0.6);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0x2fcf78 }));
    const tag = label(`(${a},${b})`, { size: 38, weight: 600, color: '#4f6b55', height: 0.3, pad: 4 });
    tag.position.set(0, b ? 0.62 : -0.62, 0);
    g.add(ball, ring, tag);
    stage.root.add(g);
    return { ball, ring };
  });
  const gateTag = label('', { size: 52, weight: 700, color: '#ffffff', bg: '#f5b301', height: 0.5, pad: 12, radius: 18 });
  gateTag.position.set(O.x + S / 2, O.y + S + 1.25, 0.3);
  stage.root.add(gateTag);

  stage.frame({ target: [-0.7, 0.2, 0], w: 12.6, h: 7.2, yaw: 0, pitch: 0.1 });

  let s = [zero, zero, zero];
  let round = 0;
  const fmt = (v) => (v > 0 ? '+' : '') + v;
  const names = ['w₁', 'w₂', 'bias b'];
  const g = ctx.ui.group();
  const steppers = names.map((n, i) => ctx.ui.stepper(n, values, zero, (_, idx) => { s[i] = idx; changed(); }, { parent: g, format: fmt, cost: 1 }));
  let quiz = null;
  setRound();

  function setRound() {
    ctx.round(round + 1, gates.length + 1);
    ctx.goal(`Make the neuron compute <b>${gates[round]}</b>: the four corners must light up as the table says.`);
    setLabel(gateTag, `${gates[round]} gate`, { size: 52, weight: 700, color: '#ffffff', bg: '#f5b301', height: 0.5, pad: 12, radius: 18 });
    refresh();
  }

  function refresh() {
    const w = s.map((i) => values[i]);
    setLabel(wTagA, `w₁ = ${fmt(w[0])}`, { size: 42, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.4, pad: 8, radius: 14 });
    setLabel(wTagB, `w₂ = ${fmt(w[1])}`, { size: 42, weight: 700, color: '#ffffff', bg: '#15331f', height: 0.4, pad: 8, radius: 14 });
    setLabel(bTag, `b = ${fmt(w[2])}`, { size: 42, weight: 700, color: '#ffffff', bg: '#13753f', height: 0.4, pad: 8, radius: 14 });
    [edgeA, edgeB].forEach((e, i) => {
      const t = 0.03 + Math.abs(w[i]) * 0.06;
      e.scale.set(t, 1, t);
      e.material = candyMat(w[i] > 0 ? C.pink : w[i] < 0 ? C.blue : C.white);
    });
    tint.material.uniforms.w.value.set(w[0], w[1], w[2]);
    const gate = gates[Math.min(round, gates.length - 1)];
    const rows = INPUTS.map((x, i) => {
      const o = out(s, x);
      const want = GATES[gate][i];
      corners[i].ball.material = candyMat(o ? 0x3ddc84 : 0x5f6b62);
      corners[i].ring.material.color.set(o === want ? 0x2fcf78 : 0xff2a55);
      return `${x.join('')} → <b class="${o === want ? 'ok' : 'bad'}">${o}</b>${o === want ? '' : ` (want ${want})`}`;
    });
    outBulb.material = candyMat(0x4c5a50);
    ctx.status(`out = [w₁x₁ + w₂x₂ + b > 0] · ${rows.join(' · ')}`);
  }

  function changed() {
    ctx.sound.pop();
    refresh();
    if (round < gates.length && solves(s, gates[round])) {
      ctx.sound.gem();
      stage.fx.burst(neuron.position.clone(), PALETTE, 24, 4);
      ctx.toast(`${gates[round]} solved!`, 'good');
      round++;
      if (round < gates.length) setRound();
      else askXor();
    }
  }

  function askXor() {
    steppers.forEach((st) => st.el.querySelectorAll('button').forEach((b) => (b.disabled = true)));
    ctx.round(gates.length + 1, gates.length + 1);
    ctx.goal('Last question: can this single neuron compute <b>XOR</b> (1 when exactly one input is 1)?');
    setLabel(gateTag, 'XOR gate?', { size: 52, weight: 700, color: '#ffffff', bg: '#13753f', height: 0.5, pad: 12, radius: 18 });
    quiz = ctx.ui.group('XOR?');
    ctx.ui.button('Yes, with the right weights', () => {
      ctx.toast('Try it: XOR needs (0,1) and (1,0) on one side and (0,0) and (1,1) on the other. No single straight line does that.', 'bad', 5000);
    }, { parent: quiz, cls: 'blue small', cost: 1 });
    ctx.ui.button('No: it needs a hidden layer', () => {
      ctx.sound.gem();
      ctx.win({ note: 'Right! One neuron draws one straight line, and XOR needs two. That’s why we stack neurons into layers.' });
    }, { parent: quiz, cls: 'green small' });
  }

  return {
    update() {
      const k = (Math.sin(performance.now() / 300) + 1) / 2;
      neuron.scale.setScalar(1.5 * (1 + k * 0.04));
    },
  };
}
