// Brain Arena: puzzle terminals and a playable, flying 3×3 Rubik's Cube.
import * as THREE from 'three';
import { makeLabel, drawCanvas, mulberry32, FONT, MONO } from './utils.js';
import { std, glowMat, mesh } from './helpers.js';

export const ARENA = { x: 18, z: -44, r: 8 };

// standard colour scheme: U white, D yellow, F green, B blue, R red, L orange
const FACES = [
  { n: [1, 0, 0], color: '#dc2626' },
  { n: [-1, 0, 0], color: '#f97316' },
  { n: [0, 1, 0], color: '#f8fafc' },
  { n: [0, -1, 0], color: '#facc15' },
  { n: [0, 0, 1], color: '#16a34a' },
  { n: [0, 0, -1], color: '#2563eb' },
];
// face → rotation axis, layer and clockwise angle (viewed from that face)
const MOVES = {
  U: ['y', 1, -1], D: ['y', -1, 1], R: ['x', 1, -1], L: ['x', -1, 1], F: ['z', 1, -1], B: ['z', -1, 1],
};
const GAP = 0.98;

export function buildArena(scene, W, circle, interact) {
  const rng = mulberry32(99);
  const P = new THREE.Vector3(ARENA.x, 0, ARENA.z);
  const toIsland = new THREE.Vector3(-P.x, 0, -P.z).normalize();
  const tangent = new THREE.Vector3(toIsland.z, 0, -toIsland.x);

  // floor: dark tiles scattered with maths & code glyphs
  const floorTex = drawCanvas(1024, 1024, (c, w, h) => {
    c.fillStyle = '#111827';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    c.clip();
    for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) {
      if (((x + y) / 64) % 2) { c.fillStyle = '#1f2937'; c.fillRect(x, y, 64, 64); }
    }
    const glyphs = ['∑', 'π', '∞', '√', '∫', 'λ', '≠', '{ }', '</>', 'O(n)', 'f(x)', '0101', 'Δ', '∀', 'mod'];
    c.textAlign = 'center';
    for (let i = 0; i < 46; i++) {
      c.fillStyle = `rgba(245,158,11,${0.18 + rng() * 0.3})`;
      c.font = `700 ${28 + rng() * 34}px ${MONO}`;
      c.fillText(glyphs[i % glyphs.length], rng() * w, rng() * h);
    }
    c.restore();
  });
  const floor = mesh(new THREE.CircleGeometry(ARENA.r, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }), P.x, 0.035, P.z, false);
  floor.receiveShadow = true;
  scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA.r - 0.25, ARENA.r, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f59e0b').multiplyScalar(1.6) }));
  ring.position.set(P.x, 0.06, P.z);
  scene.add(ring);

  // ------------------------------------------------------------ puzzle terminals
  const terminal = (id, side, title, glyph, color, sub) => {
    const pos = P.clone().addScaledVector(toIsland, 2.2).addScaledVector(tangent, side * 4.3);
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = Math.atan2(toIsland.x, toIsland.z);
    const dark = std('#0f172a', { metalness: 0.5, roughness: 0.4 });
    g.add(mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.4, 8), dark, 0, 0.7, 0));
    g.add(mesh(new THREE.BoxGeometry(2.2, 1.5, 0.15), dark, 0, 2.05, 0));
    const tex = drawCanvas(512, 340, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0b1230');
      gr.addColorStop(1, '#111827');
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
      c.fillStyle = color;
      c.font = `700 110px ${MONO}`;
      c.textAlign = 'center';
      c.fillText(glyph, w / 2, 150);
      c.fillStyle = '#f8fafc';
      c.font = `700 46px ${FONT}`;
      c.fillText(title, w / 2, 230);
      c.fillStyle = '#94a3b8';
      c.font = `500 26px ${MONO}`;
      c.fillText(sub, w / 2, 290);
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.36), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.set(0, 2.05, 0.08);
    g.add(screen);
    g.add(mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 28), glowMat(color, 2), 0, 0.03, 0, false).rotateX(Math.PI / 2));
    scene.add(g);
    circle(pos.x, pos.z, 0.6, 3);
    interact({ id, zone: 'arena', label: `Solve ${title.toLowerCase()} 🧠`, x: pos.x + toIsland.x * 1.2, z: pos.z + toIsland.z * 1.2, r: 2.2, object: g });
  };
  terminal('puzzles:math', -1, 'Maths Puzzles', '∑ π', '#f59e0b', '6 puzzles · ★ to ★★★');
  terminal('puzzles:code', 1, 'Code Puzzles', '</>', '#38bdf8', '6 puzzles · ★ to ★★★');

  // orbiting glyphs
  const glyphMats = ['∑', 'π', '√', '∞', '{ }', 'λ', '</>', '∫', 'Δ', 'O(n)'].map((gl, i) => new THREE.SpriteMaterial({
    map: drawCanvas(128, 128, (c, w, h) => {
      c.fillStyle = i % 2 ? '#fbbf24' : '#7dd3fc';
      c.font = `700 ${gl.length > 2 ? 40 : 70}px ${MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(gl, w / 2, h / 2);
    }),
    transparent: true,
    depthWrite: false,
  }));
  const glyphs = glyphMats.map((m, i) => {
    const s = new THREE.Sprite(m);
    s.scale.setScalar(0.9);
    s.userData = { a: (i / glyphMats.length) * Math.PI * 2, r: 5.8 + (i % 3) * 0.6, y: 2.2 + (i % 4) * 1.1 };
    scene.add(s);
    return s;
  });

  // ------------------------------------------------------------ the flying cube
  const base = mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.6, 6), std('#1f2937', { metalness: 0.5 }), P.x, 0.3, P.z);
  scene.add(base);
  const padRing = mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 40), glowMat('#f59e0b', 2.2), P.x, 0.62, P.z, false);
  padRing.rotation.x = Math.PI / 2;
  scene.add(padRing);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 3.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(P.x, 2.4, P.z);
  scene.add(beam);
  circle(P.x, P.z, 1.4, 1);
  const lbl = makeLabel("Flying Rubik's Cube", { sub: 'press E to play', accent: '#f59e0b', height: 0.5 });
  lbl.position.set(P.x, 7.1, P.z);
  scene.add(lbl);

  const holder = new THREE.Group(); // floats & spins when idle
  holder.position.set(P.x, 4.4, P.z);
  scene.add(holder);
  const root = new THREE.Group(); // the cube itself (cubies live here)
  root.scale.setScalar(0.8);
  holder.add(root);

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#0b0b0f', roughness: 0.45, metalness: 0.2 });
  const stickerMats = Object.fromEntries(FACES.map((f) => [f.color, new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.35, emissive: f.color, emissiveIntensity: 0.12 })]));
  const bodyGeo = new THREE.BoxGeometry(0.94, 0.94, 0.94);
  const stickerGeo = new THREE.PlaneGeometry(0.8, 0.8);
  let cubies = [];

  function build() {
    for (const c of cubies) root.remove(c);
    cubies = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      const c = new THREE.Group();
      c.position.set(x * GAP, y * GAP, z * GAP);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      c.add(body);
      for (const f of FACES) {
        const [nx, ny, nz] = f.n;
        if ((nx && nx !== x) || (ny && ny !== y) || (nz && nz !== z)) continue;
        const s = new THREE.Mesh(stickerGeo, stickerMats[f.color]);
        const n = new THREE.Vector3(nx, ny, nz);
        s.position.copy(n).multiplyScalar(0.475);
        s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        s.userData = { normal: n, color: f.color };
        c.add(s);
      }
      root.add(c);
      cubies.push(c);
    }
  }
  build();

  // face letters shown while playing, so the notation is easy to learn
  // placed off the faces (near their edges) so they never hide stickers
  const letters = [['U', 0, 2.6, 0], ['D', 0, -2.7, -0.6], ['R', 2.6, 0, 0], ['L', -2.6, 0, 0], ['F', 1.9, -1.9, 1.9], ['B', -1.9, 1.9, -1.9]].map(([t, x, y, z]) => {
    const s = makeLabel(t, { accent: '#f59e0b', height: 0.45 });
    s.position.set(x, y, z);
    s.visible = false;
    root.add(s);
    return s;
  });

  // ------------------------------------------------------------ move engine
  const queue = [];
  let anim = null;
  const history = [];
  const C = {
    center: new THREE.Vector3(),
    focused: false,
    moves: 0,
    startedAt: 0,
    scrambled: false,
    scrambleLen: 0,
    onSolved: null,
    onMove: null,
  };

  const parse = (m) => ({ face: m[0], prime: m.endsWith("'") });
  const inverse = (m) => (m.endsWith("'") ? m[0] : `${m[0]}'`);

  function start(item) {
    const [axis, layer, dir] = MOVES[item.face];
    const pivot = new THREE.Group();
    root.add(pivot);
    for (const c of cubies) if (Math.round(c.position[axis] / GAP) === layer) pivot.attach(c);
    anim = { ...item, axis, pivot, angle: dir * (item.prime ? -1 : 1) * (Math.PI / 2), t: 0 };
  }

  function finish() {
    const { pivot } = anim;
    pivot.rotation[anim.axis] = anim.angle;
    pivot.updateMatrixWorld(true);
    for (const c of [...pivot.children]) {
      root.attach(c);
      c.position.set(Math.round(c.position.x / GAP) * GAP, Math.round(c.position.y / GAP) * GAP, Math.round(c.position.z / GAP) * GAP);
      const e = new THREE.Euler().setFromQuaternion(c.quaternion);
      const snap = (v) => Math.round(v / (Math.PI / 2)) * (Math.PI / 2);
      c.rotation.set(snap(e.x), snap(e.y), snap(e.z));
    }
    root.remove(pivot);
    const done = anim;
    anim = null;
    if (done.user) {
      C.onMove?.(done);
      if (C.scrambled && !queue.length && isSolved()) {
        const time = (performance.now() - C.startedAt) / 1000;
        C.scrambled = false;
        C.onSolved?.({ moves: C.moves, time, scrambleLen: C.scrambleLen });
      }
    }
  }

  function isSolved() {
    const seen = new Map();
    for (const c of cubies) for (const s of c.children) {
      if (!s.userData.color) continue;
      const n = s.userData.normal.clone().applyQuaternion(c.quaternion);
      const k = `${Math.round(n.x)},${Math.round(n.y)},${Math.round(n.z)}`;
      if (!seen.has(k)) seen.set(k, s.userData.color);
      else if (seen.get(k) !== s.userData.color) return false;
    }
    return true;
  }

  Object.assign(C, {
    isSolved,
    busy: () => !!anim || queue.length > 0,
    move(m, { record = true } = {}) {
      const item = { ...parse(m), user: true, speed: 0.2 };
      if (record) {
        history.push(m);
        if (!C.moves && C.scrambled) C.startedAt = performance.now();
        C.moves++;
      }
      queue.push(item);
    },
    undo() {
      const m = history.pop();
      if (!m) return;
      C.moves++;
      queue.push({ ...parse(inverse(m)), user: true, speed: 0.2 });
    },
    scramble(n) {
      const faces = Object.keys(MOVES);
      let last = '';
      for (let i = 0; i < n; i++) {
        let f;
        do f = faces[Math.floor(Math.random() * 6)]; while (f === last);
        last = f;
        queue.push({ face: f, prime: Math.random() < 0.5, user: false, speed: n > 5 ? 0.06 : 0.16 });
      }
      history.length = 0;
      C.moves = 0;
      C.startedAt = performance.now();
      C.scrambled = true;
      C.scrambleLen = n;
    },
    reset() {
      queue.length = 0;
      if (anim) { root.remove(anim.pivot); anim = null; }
      build();
      history.length = 0;
      C.moves = 0;
      C.scrambled = false;
    },
    focus(on) {
      C.focused = on;
      letters.forEach((l) => (l.visible = on));
      lbl.visible = !on;
    },
  });
  W.cube = C;

  W.updaters.push((t, dt) => {
    // flying: bob and spin while idle; settle face-on while being played
    holder.position.y = 4.4 + Math.sin(t * 1.3) * (C.focused ? 0.05 : 0.25);
    if (C.focused) {
      holder.rotation.x = THREE.MathUtils.damp(holder.rotation.x, 0, 5, dt);
      holder.rotation.z = THREE.MathUtils.damp(holder.rotation.z, 0, 5, dt);
      holder.rotation.y = THREE.MathUtils.damp(holder.rotation.y, Math.atan2(toIsland.x, toIsland.z), 5, dt);
    } else {
      holder.rotation.y += dt * 0.5;
      holder.rotation.x = Math.sin(t * 0.6) * 0.35;
      holder.rotation.z = Math.cos(t * 0.45) * 0.25;
    }
    holder.getWorldPosition(C.center);
    beam.material.opacity = 0.1 + Math.sin(t * 2) * 0.04;
    padRing.rotation.z = t * 0.5;
    for (const g of glyphs) {
      const u = g.userData;
      const a = u.a + t * 0.25;
      g.position.set(P.x + Math.cos(a) * u.r, u.y + Math.sin(t + u.a * 3) * 0.3, P.z + Math.sin(a) * u.r);
    }

    // run the move queue
    if (!anim && queue.length) start(queue.shift());
    if (anim) {
      anim.t += dt / anim.speed;
      const k = Math.min(anim.t, 1);
      anim.pivot.rotation[anim.axis] = anim.angle * (1 - (1 - k) ** 3);
      if (anim.t >= 1) finish();
    }
  });

  interact({ id: 'rubik', zone: 'arena', label: "Play the flying Rubik's Cube 🧊", x: P.x + toIsland.x * 2.2, z: P.z + toIsland.z * 2.2, r: 2.6, object: holder });
}
