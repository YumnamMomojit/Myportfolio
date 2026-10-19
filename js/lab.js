// AI Learning Lab: three learning stations and a live AI-agent drone that
// perceives → thinks → acts, so the AI Agents lesson has something real to point at.
import * as THREE from 'three';
import { makeLabel, drawCanvas, mulberry32 } from './utils.js';
import { std, glowMat, mesh } from './helpers.js';

export const LAB = { x: -46, z: 2, r: 8.5 };

const STATIONS = [
  { id: 'learn:agent', title: 'AI Agents', sub: 'perceive · think · act', color: '#22d3ee', angle: Math.PI },
  { id: 'learn:three', title: 'How this 3D world works', sub: 'Three.js explained', color: '#a78bfa', angle: Math.PI - 0.85 },
  { id: 'learn:ml', title: 'Machine Learning', sub: 'train your own model', color: '#f472b6', angle: Math.PI + 0.85 },
  { id: 'learn:nn', title: 'Neural Networks', sub: 'neurons · layers · learning', color: '#fbbf24', angle: Math.PI - 1.7 },
  { id: 'learn:cnn', title: 'Convolutional Networks', sub: 'how AI sees images', color: '#4ade80', angle: Math.PI + 1.7 },
];
// the course kiosk stands on the island-facing side, clear of the stations and the entrance
const SAGA = { angle: 0.7, r: 6.2, color: '#f5b301' };

export function buildLab(scene, W, circle, interact) {
  const rng = mulberry32(314);
  const C = new THREE.Vector3(LAB.x, 0, LAB.z);

  // circuit-board floor
  const floorTex = drawCanvas(1024, 1024, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#0f2a44');
    g.addColorStop(1, '#0a1628');
    c.fillStyle = g;
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(34,211,238,0.35)';
    c.lineWidth = 3;
    for (let i = 0; i < 70; i++) {
      let x = rng() * w, y = rng() * h;
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        if (rng() < 0.5) x += (rng() - 0.5) * 180;
        else y += (rng() - 0.5) * 180;
        c.lineTo(x, y);
      }
      c.stroke();
      c.fillStyle = 'rgba(34,211,238,0.6)';
      c.beginPath();
      c.arc(x, y, 5, 0, Math.PI * 2);
      c.fill();
    }
  });
  const floor = mesh(new THREE.CircleGeometry(LAB.r, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.3, emissive: '#0e7490', emissiveIntensity: 0.15, polygonOffset: true, polygonOffsetFactor: -1 }), C.x, 0.035, C.z, false);
  floor.receiveShadow = true;
  scene.add(floor);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#22d3ee').multiplyScalar(1.6), transparent: true, opacity: 0.85 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(LAB.r - 0.25, LAB.r, 72).rotateX(-Math.PI / 2), ringMat);
  ring.position.set(C.x, 0.06, C.z);
  scene.add(ring);

  // hovering halo arch over the lab
  const halo = mesh(new THREE.TorusGeometry(3.2, 0.08, 8, 64), glowMat('#22d3ee', 2), C.x, 6.4, C.z, false);
  halo.rotation.x = Math.PI / 2;
  scene.add(halo);

  // stations
  const kiosk = std('#1e293b', { metalness: 0.5, roughness: 0.4 });
  const visuals = {};
  for (const s of STATIONS) {
    const dir = new THREE.Vector3(Math.cos(s.angle), 0, Math.sin(s.angle));
    const p = C.clone().addScaledVector(dir, 5.6);
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = Math.atan2(-dir.x, -dir.z); // face the lab centre
    g.add(mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.9, 8), kiosk, 0, 0.45, 0));
    g.add(mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 32), glowMat(s.color, 2), 0, 0.92, 0, false).rotateX(Math.PI / 2));
    const lbl = makeLabel(s.title, { sub: s.sub, accent: s.color, height: 0.5 });
    lbl.position.y = 4.1;
    g.add(lbl);
    scene.add(g);
    circle(p.x, p.z, 1.15, 3);
    interact({ id: s.id, zone: 'lab', label: `Start lesson: ${s.title} 🎓`, x: p.x - dir.x * 1.7, z: p.z - dir.z * 1.7, r: 2.4, object: g });
    visuals[s.id] = g;
  }

  // AI Engineer Saga kiosk: a giant wrapped candy by the lab entrance that opens the course
  const sagaP = C.clone().add(new THREE.Vector3(Math.cos(SAGA.angle), 0, Math.sin(SAGA.angle)).multiplyScalar(SAGA.r));
  {
    const dir = new THREE.Vector3(Math.cos(SAGA.angle), 0, Math.sin(SAGA.angle));
    const g = new THREE.Group();
    g.position.copy(sagaP);
    g.rotation.y = Math.atan2(dir.x, dir.z); // face out towards the island
    g.add(mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.9, 8), kiosk, 0, 0.45, 0));
    g.add(mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 32), glowMat(SAGA.color, 2), 0, 0.92, 0, false).rotateX(Math.PI / 2));
    const candy = new THREE.Group();
    candy.position.y = 2.1;
    const body = mesh(new THREE.SphereGeometry(0.5, 20, 14), std(SAGA.color, { roughness: 0.25, metalness: 0.1, emissive: '#a16207', emissiveIntensity: 0.35, flatShading: false }), 0, 0, 0);
    body.scale.x = 1.3;
    candy.add(body);
    const stripe = glowMat('#86efac', 1.4);
    for (const k of [-0.32, 0, 0.32]) candy.add(mesh(new THREE.TorusGeometry(0.47 - Math.abs(k) * 0.35, 0.035, 6, 28), stripe, k * 1.3, 0, 0, false).rotateY(Math.PI / 2));
    const wrap = std('#fde68a', { roughness: 0.4, emissive: '#f59e0b', emissiveIntensity: 0.3 });
    for (const s of [-1, 1]) {
      const twist = mesh(new THREE.ConeGeometry(0.34, 0.55, 8), wrap, s * 0.85, 0, 0);
      twist.rotation.z = s * Math.PI / 2;
      candy.add(twist);
    }
    g.add(candy);
    const lbl = makeLabel('🍬 AI Engineer Saga', { sub: 'a playable 39-level course', accent: SAGA.color, height: 0.5 });
    lbl.position.y = 3.6;
    g.add(lbl);
    scene.add(g);
    circle(sagaP.x, sagaP.z, 1.15, 3);
    interact({ id: 'course:ai-engineer', zone: 'lab', label: 'Play the AI Engineer Saga 🍬', x: sagaP.x + dir.x * 1.7, z: sagaP.z + dir.z * 1.7, r: 2.4, object: g });
    W.updaters.push((t) => {
      candy.rotation.y = t * 0.9;
      candy.rotation.z = Math.sin(t * 1.3) * 0.18;
      candy.position.y = 2.1 + Math.sin(t * 2) * 0.12;
    });
  }

  // Three.js station: a mesh that flips between geometry (wireframe) and material (solid)
  {
    const g = visuals['learn:three'];
    const knotGeo = new THREE.TorusKnotGeometry(0.55, 0.18, 90, 12);
    const solid = new THREE.MeshStandardMaterial({ color: '#a78bfa', metalness: 0.4, roughness: 0.25, emissive: '#4c1d95', emissiveIntensity: 0.4 });
    const wire = new THREE.MeshBasicMaterial({ color: new THREE.Color('#c4b5fd').multiplyScalar(1.5), wireframe: true });
    const knot = mesh(knotGeo, solid, 0, 2.3, 0);
    g.add(knot);
    const axes = new THREE.AxesHelper(1.1);
    axes.position.y = 1.2;
    g.add(axes);
    W.updaters.push((t) => {
      knot.rotation.y = t * 0.8;
      knot.rotation.x = Math.sin(t * 0.5) * 0.4;
      knot.material = Math.floor(t / 2.2) % 2 ? wire : solid;
    });
  }

  // ML station: a 3D scatter of two classes and a plane that "trains" to split them
  {
    const g = visuals['learn:ml'];
    const N = 46;
    const pts = [];
    const normal = new THREE.Vector3(0.6, 0.7, -0.4).normalize();
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).multiplyScalar(0.9);
      if (Math.abs(v.dot(normal)) < 0.12) { i--; continue; }
      pts.push(v);
    }
    const sphere = new THREE.SphereGeometry(0.06, 8, 6);
    const pos = new THREE.InstancedMesh(sphere, glowMat('#f472b6', 2), N);
    const neg = new THREE.InstancedMesh(sphere, glowMat('#38bdf8', 2), N);
    let a = 0, b = 0;
    const m4 = new THREE.Matrix4();
    for (const v of pts) {
      m4.makeTranslation(v.x, v.y + 2.3, v.z);
      if (v.dot(normal) > 0) pos.setMatrixAt(a++, m4);
      else neg.setMatrixAt(b++, m4);
    }
    pos.count = a;
    neg.count = b;
    g.add(pos, neg);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    plane.position.y = 2.3;
    g.add(plane);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const target = new THREE.Quaternion().setFromUnitVectors(zAxis, normal);
    const startQ = new THREE.Quaternion();
    W.updaters.push((t) => {
      const cyc = t % 7;
      if (cyc < 0.05) startQ.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
      const k = Math.min(1, cyc / 4);
      plane.quaternion.slerpQuaternions(startQ, target, 1 - (1 - k) ** 3);
      plane.material.opacity = cyc > 4 ? 0.4 + Math.sin(t * 6) * 0.08 : 0.25;
    });
  }

  // Neural-network station: layers of neurons with signals flowing along the connections
  {
    const g = visuals['learn:nn'];
    const layers = [3, 4, 2].map((n, li) =>
      Array.from({ length: n }, (_, i) => new THREE.Vector3((li - 1) * 0.9, 1.6 + (i - (n - 1) / 2) * 0.55, 0)));
    const nodeMat = glowMat('#fbbf24', 1.8);
    for (const L of layers) for (const p of L) g.add(mesh(new THREE.SphereGeometry(0.12, 12, 8), nodeMat, p.x, p.y, p.z, false));
    const edges = [];
    const lineMat = new THREE.LineBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.35 });
    for (let li = 0; li < 2; li++) for (const a of layers[li]) for (const b of layers[li + 1]) {
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat));
      edges.push([a, b]);
    }
    const pulses = Array.from({ length: 8 }, (_, i) => {
      const m = mesh(new THREE.SphereGeometry(0.05, 8, 6), glowMat('#fff7ed', 3), 0, 0, 0, false);
      g.add(m);
      return { m, e: edges[(i * 5) % edges.length], ph: i / 8 };
    });
    W.updaters.push((t) => {
      for (const p of pulses) {
        const k = (t * 0.7 + p.ph) % 1;
        if (k < 0.02) p.e = edges[Math.floor(rng() * edges.length)];
        p.m.position.lerpVectors(p.e[0], p.e[1], k);
      }
      nodeMat.emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.5;
    });
  }

  // CNN station: an "image" of tiles with a 3×3 filter sliding across it
  {
    const g = visuals['learn:cnn'];
    const N = 6, S = 0.26;
    const img = [
      '..##..', '.#..#.', '#....#', '######', '#....#', '#....#',
    ];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const on = img[r][c] === '#';
      g.add(mesh(new THREE.BoxGeometry(S * 0.9, S * 0.9, 0.04), on ? glowMat('#4ade80', 1.4) : std('#1e293b'), (c - (N - 1) / 2) * S, 2.4 - r * S, 0, false));
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(S * 3, S * 3, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fde68a').multiplyScalar(1.6), wireframe: true }));
    g.add(frame);
    W.updaters.push((t) => {
      const i = Math.floor(t * 2.5) % ((N - 2) * (N - 2));
      const r = Math.floor(i / (N - 2)), c = i % (N - 2);
      frame.position.set((c + 1 - (N - 1) / 2) * S, 2.4 - (r + 1) * S, 0.03);
    });
  }

  // ------------------------------------------------------------ the AI agent drone
  const agent = new THREE.Group();
  agent.position.set(C.x + 2, 2.2, C.z);
  const shell = mesh(new THREE.SphereGeometry(0.42, 18, 12), std('#e2e8f0', { metalness: 0.3, roughness: 0.3 }), 0, 0, 0);
  shell.scale.y = 0.75;
  agent.add(shell);
  const eye = mesh(new THREE.SphereGeometry(0.13, 12, 8), glowMat('#22d3ee', 3), 0, 0.02, 0.36, false);
  agent.add(eye);
  const rotors = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), std('#334155'), Math.cos(a) * 0.4, 0.15, Math.sin(a) * 0.4);
    arm.rotation.y = -a + Math.PI / 2;
    agent.add(arm);
    const rotor = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 12), new THREE.MeshBasicMaterial({ color: '#94a3b8', transparent: true, opacity: 0.55 }), Math.cos(a) * 0.62, 0.22, Math.sin(a) * 0.62, false);
    agent.add(rotor);
    rotors.push(rotor);
  }
  // sensor cone (what the agent can "see")
  const SENSE = 6.5;
  const coneMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, SENSE, 24, 1, true), coneMat);
  // apex at the drone, opening forward and slightly down
  cone.rotation.x = -Math.PI / 2 + 0.35;
  cone.position.set(0, -Math.sin(0.35) * SENSE / 2, Math.cos(0.35) * SENSE / 2);
  agent.add(cone);
  scene.add(agent);

  // planned path line
  const pathGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const pathLine = new THREE.Line(pathGeo, new THREE.LineDashedMaterial({ color: new THREE.Color('#fde68a').multiplyScalar(1.5), dashSize: 0.3, gapSize: 0.2 }));
  pathLine.visible = false;
  scene.add(pathLine);

  // data cubes for the agent to collect
  const cubeGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const cubes = [];
  const spawnCube = () => {
    for (let tries = 0; tries < 20; tries++) {
      const a = rng() * Math.PI * 2, r = 1.5 + rng() * 5;
      const p = new THREE.Vector3(C.x + Math.cos(a) * r, 0.35, C.z + Math.sin(a) * r);
      if (STATIONS.some((s) => p.distanceTo(C.clone().add(new THREE.Vector3(Math.cos(s.angle), 0, Math.sin(s.angle)).multiplyScalar(5.6))) < 2)) continue;
      if (Math.hypot(p.x - sagaP.x, p.z - sagaP.z) < 2) continue;
      const m = mesh(cubeGeo, glowMat(['#fde68a', '#86efac', '#f9a8d4'][cubes.length % 3], 1.6), p.x, p.y, p.z, false);
      scene.add(m);
      cubes.push(m);
      return;
    }
  };
  for (let i = 0; i < 3; i++) spawnCube();

  let label = null;
  const setLabel = (text, color) => {
    if (label) {
      agent.remove(label);
      label.material.map.dispose();
      label.material.dispose();
    }
    label = makeLabel(text, { accent: color, height: 0.36 });
    label.position.y = 1.05;
    agent.add(label);
  };

  const A = { state: 'PERCEIVE', detail: 'scanning for data cubes', collected: 0, timer: 0, target: null, greetCool: 0, wander: null };
  const STATE_COLOR = { PERCEIVE: '#22d3ee', THINK: '#fbbf24', ACT: '#4ade80', GREET: '#f472b6' };
  const go = (state, detail) => {
    A.state = state;
    A.detail = detail;
    A.timer = 0;
    setLabel(state === 'GREET' ? detail : `${state === 'PERCEIVE' ? '👁' : state === 'THINK' ? '💭' : '⚡'} ${state}`, STATE_COLOR[state]);
  };
  go('PERCEIVE', 'scanning for data cubes');
  W.agent = A;

  const look = (p, dt, k = 4) => {
    const yaw = Math.atan2(p.x - agent.position.x, p.z - agent.position.z);
    let d = yaw - agent.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    agent.rotation.y += d * (1 - Math.exp(-k * dt));
  };

  W.updaters.push((t, dt) => {
    for (const r of rotors) r.rotation.y += dt * 30;
    shell.position.y = Math.sin(t * 2.2) * 0.06;
    halo.rotation.z = t * 0.3;
    halo.position.y = 6.4 + Math.sin(t * 0.8) * 0.15;
    cubes.forEach((c, i) => (c.rotation.y = t + i));
    A.timer += dt;
    A.greetCool -= dt;
    const player = W.playerPos;

    // notice the explorer (perceive the environment, including you)
    if (player && A.state !== 'GREET' && A.greetCool <= 0 && player.distanceTo(agent.position) < 4.5) {
      A.greetCool = 12;
      A.returnTo = A.state;
      go('GREET', `Hello, ${W.explorerName || 'Guest'}! 👋`);
    }

    if (A.state === 'GREET') {
      if (player) look(player, dt, 6);
      if (A.timer > 2.2) go('PERCEIVE', 'scanning for data cubes');
    } else if (A.state === 'PERCEIVE') {
      agent.rotation.y += dt * 1.6; // sweep the sensor around
      coneMat.opacity = 0.06 + Math.sin(t * 8) * 0.03;
      if (A.timer > 1.2) {
        let best = null, bestD = Infinity;
        for (const c of cubes) {
          const to = c.position.clone().sub(agent.position).setY(0);
          const d = to.length();
          if (d < SENSE + 2 && d < bestD) { best = c; bestD = d; }
        }
        if (best) {
          A.target = best;
          go('THINK', `found a data cube ${bestD.toFixed(1)} m away — planning a route`);
        } else {
          const a = rng() * Math.PI * 2;
          A.target = null;
          A.wander = new THREE.Vector3(C.x + Math.cos(a) * 3, 2.2, C.z + Math.sin(a) * 3);
          go('THINK', 'nothing in sight — planning to explore');
        }
      }
    } else if (A.state === 'THINK') {
      const goal = A.target ? A.target.position : A.wander;
      look(goal, dt);
      pathLine.visible = true;
      pathGeo.setFromPoints([agent.position.clone(), goal.clone().setY(A.target ? 0.6 : 2.2)]);
      pathLine.computeLineDistances();
      if (A.timer > 1.0) go('ACT', A.target ? 'flying to collect the cube' : 'exploring');
    } else if (A.state === 'ACT') {
      const goal = (A.target ? A.target.position.clone().setY(1.0) : A.wander).clone();
      look(goal, dt);
      const to = goal.sub(agent.position);
      const d = to.length();
      agent.position.addScaledVector(to.normalize(), Math.min(d, dt * 3.2));
      pathGeo.setFromPoints([agent.position.clone(), (A.target ? A.target.position.clone().setY(0.6) : A.wander.clone())]);
      pathLine.computeLineDistances();
      if (d < 0.15) {
        pathLine.visible = false;
        if (A.target) {
          scene.remove(A.target);
          cubes.splice(cubes.indexOf(A.target), 1);
          A.collected++;
          A.target = null;
          W.onAgentCollect?.(agent.position.clone());
          setTimeout(spawnCube, 2500);
        }
        go('PERCEIVE', 'observing the result, then scanning again');
      }
    }
    if (A.state !== 'ACT') agent.position.y = THREE.MathUtils.damp(agent.position.y, 2.2, 2, dt);
  });
}
