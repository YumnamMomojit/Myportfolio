// Fun Park activities, hidden gems and the challenge (task) system.
import * as THREE from 'three';
import { makeLabel, drawCanvas, FONT, MONO } from './utils.js';
import { std, glowMat, mesh, glowRing } from './helpers.js';
import { buildVehicle } from './player.js';
import { project } from './world.js';
import { TASKS } from './data.js';

const HOOP = { x: -5, z: 37.2, y: 3.05, r: 0.45 };
const BOARD_Z = 36.62;
const COURT = { x: -5, z: 40.8, r: 4.8 };
const RACK = { x: -8.6, z: 43.6 };
const TRAMP = { x: 4, z: 52, r: 1.5, top: 0.55 };
const STATION = { x: 9, z: 38 };
const RAMP = { ox: 21, oz: 47, dx: -1, dz: 0, len: 5.5, w: 3.2, h: 1.7 };
const BOARD = { x: 5, z: 28, yaw: Math.atan2(-5, 3) };
const BALL_R = 0.2;
const BALL_G = 20;

export function createActivities(ctx) {
  const { scene, W, player, sound, bursts, camera } = ctx;
  const TASK = Object.fromEntries(TASKS.map((t) => [t.id, t]));
  const S = () => ctx.state();

  // ------------------------------------------------------------ task bookkeeping
  const isDone = (id) => S().done.includes(id);
  function progress(id, value) {
    if (isDone(id)) return;
    const st = S();
    st.tasks[id] = Math.min(TASK[id].goal, Math.max(st.tasks[id] || 0, value));
    if (st.tasks[id] >= TASK[id].goal) {
      st.done.push(id);
      ctx.onComplete(TASK[id]);
    } else ctx.onProgress(TASK[id]);
  }
  const add = (id, n = 1) => progress(id, (S().tasks[id] || 0) + n);

  // ------------------------------------------------------------ Ride Station + vehicles
  {
    const g = new THREE.Group();
    g.position.set(STATION.x, 0, STATION.z);
    const wood = std('#92400e');
    for (const x of [-2.6, 2.6]) g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.8, 8), wood, x, 1.4, -0.9));
    const roof = mesh(new THREE.BoxGeometry(6, 0.18, 2.4), std('#f97316'), 0, 2.85, -0.4);
    roof.rotation.x = 0.12;
    g.add(roof);
    g.add(mesh(new THREE.BoxGeometry(5.6, 0.08, 1.6), std('#cbd5e1'), 0, 0.04, 0));
    const lbl = makeLabel('Ride Station', { sub: '🚲 bicycle · 🏍 motorbike', accent: '#f97316', height: 0.55 });
    lbl.position.set(0, 3.6, -0.4);
    g.add(lbl);
    scene.add(g);
  }
  const vehicles = ['bicycle', 'motorbike'].map((kind, i) => {
    const v = buildVehicle(kind);
    const x = STATION.x - 1.3 + i * 2.6, z = STATION.z;
    v.group.position.set(x, 0, z);
    v.group.rotation.y = Math.PI / 2;
    scene.add(v.group);
    const it = { id: `ride:${kind}`, label: kind === 'bicycle' ? 'Ride the bicycle 🚲' : 'Ride the motorbike 🏍', x, z, y: 0, r: 1.8, object: v.group };
    W.interactables.push(it);
    return { kind, v, it };
  });

  function mount(kind) {
    const car = vehicles.find((c) => c.kind === kind);
    if (Math.hypot(player.pos.x - car.it.x, player.pos.z - car.it.z) > 3.5) {
      ctx.toast('Walk up to it first', `The ${kind} is parked over there`, '📍');
      return;
    }
    dropBall();
    car.v.group.visible = false;
    car.it.hidden = true;
    player.pos.x = car.it.x;
    player.pos.z = car.it.z;
    player.mount(kind, car.v.group.rotation.y);
    kind === 'bicycle' ? sound.bell() : sound.engineStart();
    ctx.toast(kind === 'bicycle' ? 'On the bicycle!' : 'Vroom! On the motorbike', 'W/S throttle · A/D steer · Shift boost · E get off', kind === 'bicycle' ? '🚲' : '🏍️');
  }
  function dismount() {
    const kind = player.vehicle;
    const car = vehicles.find((c) => c.kind === kind);
    player.dismount();
    const side = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    car.v.group.position.set(player.pos.x, Math.max(0, player.pos.y), player.pos.z);
    car.v.group.rotation.y = player.yaw;
    car.v.group.visible = true;
    car.it.x = player.pos.x;
    car.it.z = player.pos.z;
    car.it.y = Math.max(0, player.pos.y);
    car.it.hidden = false;
    player.pos.addScaledVector(side, 1.1);
    if (kind === 'motorbike') sound.engineStop();
  }

  // ------------------------------------------------------------ stunt ramp
  W.ramps.push(RAMP);
  {
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(RAMP.len, 0), new THREE.Vector2(RAMP.len, RAMP.h)]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: RAMP.w, bevelEnabled: false });
    geo.translate(0, 0, -RAMP.w / 2);
    const ramp = mesh(geo, [std('#f97316'), std('#7c2d12')], RAMP.ox, 0, RAMP.oz);
    ramp.rotation.y = Math.atan2(-RAMP.dz, RAMP.dx);
    scene.add(ramp);
    for (let i = 0; i < 3; i++) {
      const u = 1 + i * 1.6;
      const chev = mesh(new THREE.BoxGeometry(0.25, 0.04, RAMP.w * 0.8), glowMat('#fde68a', 1.6), RAMP.ox + RAMP.dx * u, (RAMP.h * u) / RAMP.len + 0.04, RAMP.oz + RAMP.dz * u, false);
      chev.rotation.z = RAMP.dx < 0 ? -Math.atan(RAMP.h / RAMP.len) : Math.atan(RAMP.h / RAMP.len);
      scene.add(chev);
    }
    const lbl = makeLabel('Stunt Ramp', { sub: 'boost in on the motorbike!', accent: '#f97316', height: 0.5 });
    lbl.position.set(RAMP.ox + RAMP.dx * RAMP.len * 0.5, 3.4, RAMP.oz);
    scene.add(lbl);
  }

  // ------------------------------------------------------------ basketball court
  {
    const tex = drawCanvas(512, 512, (c, w, h) => {
      c.fillStyle = '#c2723a';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      c.fill();
      for (let i = 0; i < 18; i++) {
        c.fillStyle = i % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
        c.fillRect(0, i * 29, w, 29);
      }
      const px = (x) => ((x - COURT.x) / COURT.r + 1) / 2 * w;
      const pz = (z) => ((z - COURT.z) / COURT.r + 1) / 2 * h;
      c.strokeStyle = '#fff7ed';
      c.lineWidth = 6;
      c.strokeRect(px(HOOP.x - 1.1), pz(BOARD_Z), px(HOOP.x + 1.1) - px(HOOP.x - 1.1), pz(BOARD_Z + 3.6) - pz(BOARD_Z));
      c.beginPath();
      c.arc(px(HOOP.x), pz(BOARD_Z + 3.6), px(HOOP.x + 1.1) - px(HOOP.x), 0, Math.PI);
      c.stroke();
      c.beginPath();
      c.arc(px(HOOP.x), pz(HOOP.z), px(HOOP.x + 4.2) - px(HOOP.x), 0.15, Math.PI - 0.15);
      c.stroke();
      c.fillStyle = 'rgba(255,247,237,0.85)';
      c.font = `700 30px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('3 BASKETS = 200 PTS', w / 2, pz(COURT.z + 3.6));
    });
    const court = new THREE.Mesh(new THREE.CircleGeometry(COURT.r, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1 }));
    court.position.set(COURT.x, 0.035, COURT.z);
    court.receiveShadow = true;
    scene.add(court);

    const white = std('#f8fafc'), pole = std('#334155', { metalness: 0.5 });
    scene.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.9, 10), pole, HOOP.x, 1.95, BOARD_Z - 0.55));
    scene.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.55), pole, HOOP.x, 3.6, BOARD_Z - 0.28));
    const bTex = drawCanvas(256, 160, (c, w, h) => {
      c.fillStyle = '#f8fafc';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#ef4444';
      c.lineWidth = 8;
      c.strokeRect(6, 6, w - 12, h - 12);
      c.strokeRect(w / 2 - 40, h / 2 - 10, 80, 60);
    });
    scene.add(mesh(new THREE.BoxGeometry(1.8, 1.15, 0.06), [white, white, white, white, new THREE.MeshStandardMaterial({ map: bTex }), white], HOOP.x, 3.45, BOARD_Z - 0.03));
    const ring = mesh(new THREE.TorusGeometry(HOOP.r, 0.03, 8, 32), glowMat('#fb923c', 1.6), HOOP.x, HOOP.y, HOOP.z, false);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(HOOP.r, 0.28, 0.5, 12, 2, true), new THREE.MeshBasicMaterial({ color: '#f1f5f9', wireframe: true, transparent: true, opacity: 0.7 }));
    net.position.set(HOOP.x, HOOP.y - 0.26, HOOP.z);
    scene.add(net);
    ctx.circle(HOOP.x, BOARD_Z - 0.55, 0.2, 5);
    const lbl = makeLabel('Hoops', { sub: 'grab a ball · press E to shoot', accent: '#fb923c', height: 0.5 });
    lbl.position.set(HOOP.x, 4.9, BOARD_Z);
    scene.add(lbl);
    W.hoopNet = net;
  }

  // ball rack
  const ballTex = drawCanvas(256, 128, (c, w, h) => {
    c.fillStyle = '#ea580c';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#1c1917';
    c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    for (const x of [w / 4, (3 * w) / 4]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.beginPath(); c.ellipse(w / 2, h / 2, 26, h / 2, 0, 0, Math.PI * 2); c.stroke();
  });
  const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.7 });
  const ballGeo = new THREE.SphereGeometry(BALL_R, 18, 12);
  {
    const g = new THREE.Group();
    g.position.set(RACK.x, 0, RACK.z);
    const metal = std('#475569', { metalness: 0.6 });
    for (const x of [-0.6, 0.6]) g.add(mesh(new THREE.BoxGeometry(0.06, 0.8, 0.5), metal, x, 0.4, 0));
    g.add(mesh(new THREE.BoxGeometry(1.3, 0.05, 0.5), metal, 0, 0.62, 0));
    for (let i = 0; i < 3; i++) g.add(mesh(ballGeo, ballMat, -0.4 + i * 0.4, 0.84, 0));
    scene.add(g);
    ctx.circle(RACK.x, RACK.z, 0.6, 1);
    W.interactables.push({ id: 'ball:rack', label: 'Pick up a basketball 🏀', x: RACK.x, z: RACK.z, y: 0, r: 2.2, object: g });
  }
  const held = mesh(ballGeo, ballMat, 0.32, 1.35, 0.45);
  held.visible = false;
  player.rig.root.add(held);
  let holding = false;
  const balls = [];
  function dropBall() {
    holding = false;
    held.visible = false;
  }
  function throwBall() {
    holding = false;
    held.visible = false;
    const start = new THREE.Vector3(player.pos.x, player.pos.y + 1.7, player.pos.z);
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const to = new THREE.Vector3(HOOP.x - start.x, 0, HOOP.z - start.z);
    const d = to.length();
    const vel = new THREE.Vector3();
    if (d < 12 && fwd.dot(to.clone().normalize()) > 0.55) {
      // aimed shot: solve the arc to the ring, with a little human error
      const err = 0.06 + d * 0.035;
      const a = Math.random() * Math.PI * 2, e = Math.sqrt(Math.random()) * err;
      const target = new THREE.Vector3(HOOP.x + Math.cos(a) * e, HOOP.y + 0.05, HOOP.z + Math.sin(a) * e);
      const T = 0.6 + d * 0.06;
      vel.subVectors(target, start).divideScalar(T);
      vel.y += 0.5 * BALL_G * T;
    } else {
      vel.copy(fwd).multiplyScalar(9);
      vel.y = 6.5;
    }
    player.yaw = Math.atan2(vel.x, vel.z);
    let b = balls.find((x) => !x.active);
    if (!b) {
      b = balls.length < 6 ? { mesh: mesh(ballGeo, ballMat) } : balls.reduce((o, x) => (x.age > o.age ? x : o));
      if (!balls.includes(b)) { scene.add(b.mesh); balls.push(b); }
    }
    Object.assign(b, { active: true, age: 0, scored: false, pos: start.clone(), vel });
    b.mesh.visible = true;
    sound.throwBall();
  }

  // ------------------------------------------------------------ trampoline
  W.platforms.push({ x: TRAMP.x, z: TRAMP.z, r: TRAMP.r - 0.05, top: TRAMP.top });
  const trampMat = mesh(new THREE.CylinderGeometry(TRAMP.r - 0.1, TRAMP.r - 0.1, 0.05, 28), std('#111827'), TRAMP.x, TRAMP.top - 0.02, TRAMP.z);
  {
    scene.add(trampMat);
    const frame = mesh(new THREE.TorusGeometry(TRAMP.r, 0.1, 8, 32), std('#2563eb', { metalness: 0.3 }), TRAMP.x, TRAMP.top, TRAMP.z);
    frame.rotation.x = Math.PI / 2;
    scene.add(frame);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, TRAMP.top, 6), std('#94a3b8'), TRAMP.x + Math.cos(a) * TRAMP.r, TRAMP.top / 2, TRAMP.z + Math.sin(a) * TRAMP.r));
    }
    const lbl = makeLabel('Trampoline', { sub: 'keep bouncing for 5 s!', accent: '#60a5fa', height: 0.5 });
    lbl.position.set(TRAMP.x, 3.2, TRAMP.z);
    scene.add(lbl);
  }
  let squash = 0;

  // ------------------------------------------------------------ challenge board
  {
    const g = new THREE.Group();
    g.position.set(BOARD.x, 0, BOARD.z);
    g.rotation.y = BOARD.yaw; // faces the spawn point
    const wood = std('#92400e');
    const rowH = 36;
    const texH = 110 + TASKS.length * rowH;
    const tex = drawCanvas(640, texH, (c, w) => {
      c.fillStyle = '#0b1330';
      c.fillRect(0, 0, w, texH);
      c.fillStyle = '#fbbf24';
      c.font = `700 50px ${FONT}`;
      c.fillText('⭐ CHALLENGES', 32, 66);
      c.font = `600 24px ${FONT}`;
      TASKS.forEach((t, i) => {
        c.fillStyle = t.learn ? '#a5f3fc' : '#e2e8f0';
        c.fillText(`${t.icon}  ${t.title}`, 32, 118 + i * rowH);
        c.fillStyle = '#5eead4';
        c.textAlign = 'right';
        c.fillText(`+${t.pts}`, w - 28, 118 + i * rowH);
        c.textAlign = 'left';
      });
    });
    const bh = (3.2 * texH) / 640;
    for (const x of [-1.4, 1.4]) g.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, 1 + bh, 8), wood, x, (1 + bh) / 2, -0.06));
    const board = mesh(new THREE.BoxGeometry(3.2, bh, 0.1), [wood, wood, wood, wood, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), wood], 0, 0.9 + bh / 2, 0);
    g.add(board);
    scene.add(g);
    ctx.circle(BOARD.x, BOARD.z, 1.5, 4);
    W.interactables.push({ id: 'tasks', label: 'Read the challenge board ⭐', x: BOARD.x + Math.sin(BOARD.yaw) * 1.6, z: BOARD.z + Math.cos(BOARD.yaw) * 1.6, y: 0, r: 2.6, object: g });
  }

  // ------------------------------------------------------------ hidden gems
  const [ax, az] = project(93.75, 12.4);
  const gemSpots = [
    W.spots.caveGem, // behind the waterfall
    W.spots.snowGem, // behind the snowman
    new THREE.Vector3(-35.7, 0.8, 25.1), // behind the library books
    new THREE.Vector3(ax, 0.8, az), // in the Andaman Sea on the India map
    new THREE.Vector3(0, 0.8, -44.6), // behind the Signal Beacon
    new THREE.Vector3(-37.9, 0.8, -22.7), // behind the server racks
  ];
  const gemGeo = new THREE.OctahedronGeometry(0.28, 0);
  const gems = gemSpots.map((p, i) => {
    const m = mesh(gemGeo, glowMat(['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa'][i], 1.8), p.x, p.y, p.z, false);
    m.visible = !S().gems.includes(i);
    scene.add(m);
    return { i, m, base: p.y };
  });

  // ------------------------------------------------------------ live state
  let streak = 0, groundT = 0, bikeAcc = 0, saveT = 0, hintOn = false;

  function update(dt, t) {
    const p = player.pos;

    // trampoline bounce
    if (player.onGround && Math.abs(p.y - TRAMP.top) < 0.05 && Math.hypot(p.x - TRAMP.x, p.z - TRAMP.z) < TRAMP.r) {
      player.vel.y = 17;
      player.onGround = false;
      player.jumps = 1;
      squash = 1;
      sound.boing();
      bursts.spawn(p.clone().setY(TRAMP.top + 0.1), '#60a5fa', 8, 2, { up: 1 });
    }
    squash = Math.max(0, squash - dt * 4);
    trampMat.position.y = TRAMP.top - 0.02 - squash * 0.25;

    // jump streak
    if (!player.vehicle) {
      groundT = player.onGround ? groundT + dt : 0;
      streak = groundT > 0.3 ? 0 : streak + dt;
    } else streak = 0;
    let meter = null;
    if (!isDone('jump') && streak > 0.4) {
      meter = { label: '🦘 Keep jumping!', frac: streak / 5, text: `${Math.min(streak, 5).toFixed(1)} / 5.0 s` };
      if (streak >= 5) progress('jump', 5);
    }

    // bicycle distance
    if (player.vehicle === 'bicycle' && !isDone('bike')) {
      bikeAcc += player.speed * dt;
      const total = (S().tasks.bike || 0) + bikeAcc;
      meter = { label: '🚲 Ride 150 m', frac: total / 150, text: `${Math.floor(total)} / 150 m` };
      saveT -= dt;
      if (total >= 150 || saveT <= 0) {
        progress('bike', total);
        bikeAcc = 0;
        saveT = 1;
      }
    }
    if (player.vehicle === 'motorbike') sound.engine(Math.abs(player.speedF));
    ctx.meter(meter);

    // summit
    const sm = W.summit;
    if (player.onGround && p.y > sm.top - 0.2 && Math.hypot(p.x - sm.x, p.z - sm.z) < 2) {
      if (!isDone('summit')) {
        sm.raised = true;
        bursts.spawn(p.clone().setY(p.y + 2), '#f97316', 30, 6, { up: 5 });
      }
      progress('summit', 1);
    }
    if (isDone('summit')) sm.raised = true;

    // lagoon splash
    if (player.surface === 'water' && p.y < -0.2) {
      progress('splash', 1);
      if (player.speed > 2 && Math.random() < dt * 12) bursts.spawn(p.clone().setY(0.1), '#7dd3fc', 3, 1.6, { up: 2.5, glow: 1.2, life: 0.5 });
    }

    // gems
    let near = false;
    for (const gm of gems) {
      if (!gm.m.visible) continue;
      gm.m.rotation.y = t * 2;
      gm.m.position.y = gm.base + Math.sin(t * 2.5 + gm.i) * 0.12;
      const d = gm.m.position.distanceTo(p.clone().setY(p.y + 0.9));
      if (d < 1.25) {
        gm.m.visible = false;
        S().gems.push(gm.i);
        bursts.spawn(gm.m.position, '#a5f3fc', 24, 4, { up: 3 });
        sound.gem();
        ctx.reward(50, gm.m.position, '💎 +50');
        add('gems', 1);
        if (!isDone('gems')) ctx.toast(`Hidden gem found! (${S().gems.length}/6)`, 'Keep looking — they love hiding behind things', '💎');
      } else if (d < 7) near = true;
    }
    if (near !== hintOn) {
      hintOn = near;
      ctx.hint(near ? '💎 Something sparkles nearby…' : null);
    }

    // balls
    for (const b of balls) {
      if (!b.active) continue;
      b.age += dt;
      const prevY = b.pos.y, prevZ = b.pos.z;
      b.vel.y -= BALL_G * dt;
      b.pos.addScaledVector(b.vel, dt);
      if (b.vel.z < 0 && prevZ - BALL_R >= BOARD_Z && b.pos.z - BALL_R < BOARD_Z && Math.abs(b.pos.x - HOOP.x) < 0.9 && b.pos.y > 2.85 && b.pos.y < 4.05) {
        b.pos.z = BOARD_Z + BALL_R;
        b.vel.z *= -0.45;
        sound.thud();
      }
      if (!b.scored && prevY > HOOP.y && b.pos.y <= HOOP.y && b.vel.y < 0 && Math.hypot(b.pos.x - HOOP.x, b.pos.z - HOOP.z) < HOOP.r - 0.06) {
        b.scored = true;
        b.vel.x *= 0.2;
        b.vel.z *= 0.2;
        sound.swish();
        bursts.spawn(new THREE.Vector3(HOOP.x, HOOP.y, HOOP.z), '#fb923c', 22, 3.5, { up: 2 });
        ctx.reward(20, new THREE.Vector3(HOOP.x, HOOP.y + 0.6, HOOP.z), '🏀 Swish! +20');
        add('hoops', 1);
        W.hoopNet.scale.y = 1.4;
      }
      const g = W.groundAt(b.pos.x, b.pos.z, b.pos.y - BALL_R);
      if (b.pos.y - BALL_R < g) {
        b.pos.y = g + BALL_R;
        if (b.vel.y < -1.5) {
          b.vel.y *= -0.62;
          sound.dribble(Math.min(1, -b.vel.y / 8));
        } else b.vel.y = 0;
        const f = Math.exp(-1.4 * dt);
        b.vel.x *= f;
        b.vel.z *= f;
      }
      if (W.resolve(b.pos, BALL_R)) { b.vel.x *= -0.4; b.vel.z *= -0.4; }
      const dx = b.pos.x - p.x, dz = b.pos.z - p.z, dd = Math.hypot(dx, dz);
      if (dd < 0.7 && Math.abs(b.pos.y - p.y - 0.5) < 1 && b.age > 0.4) {
        b.vel.x = (dx / (dd || 1)) * Math.max(3, player.speed * 1.2);
        b.vel.z = (dz / (dd || 1)) * Math.max(3, player.speed * 1.2);
        b.vel.y = 2.5;
      }
      b.mesh.position.copy(b.pos);
      b.mesh.rotation.x += (b.vel.z * dt) / BALL_R;
      b.mesh.rotation.z -= (b.vel.x * dt) / BALL_R;
      if (b.pos.y < -40 || b.age > 40) { b.active = false; b.mesh.visible = false; }
    }
    W.hoopNet.scale.y = THREE.MathUtils.damp(W.hoopNet.scale.y, 1, 6, dt);
  }

  // ------------------------------------------------------------ public API
  return {
    TASK,
    progress,
    isDone,
    update,
    // returns true when the id belongs to an activity (and handles it)
    interact(id) {
      if (id.startsWith('ride:')) { mount(id.slice(5)); return true; }
      if (id === 'ball:rack') {
        if (player.vehicle) dismount();
        holding = true;
        held.visible = true;
        sound.pickup();
        ctx.toast('Got a ball!', 'Face the hoop and press E (or tap) to shoot', '🏀');
        return true;
      }
      return false;
    },
    // E / action button: returns true if it consumed the press
    action() {
      if (player.vehicle) { dismount(); return true; }
      if (holding) { throwBall(); return true; }
      return false;
    },
    prompt() {
      if (player.vehicle) return `Get off the ${player.vehicle}`;
      if (holding) return Math.hypot(player.pos.x - HOOP.x, player.pos.z - HOOP.z) < 12 ? 'Shoot at the hoop 🏀' : 'Throw the ball';
      return null;
    },
    onLand(v, airTime, rampAir) {
      if (!rampAir) return;
      if (player.vehicle === 'motorbike' && airTime > 0.45) {
        if (!isDone('moto')) progress('moto', 1);
        else ctx.reward(25, player.pos.clone().setY(player.pos.y + 2), '🏍️ Stunt! +25');
      } else if (player.vehicle === 'bicycle' && airTime > 0.3) {
        ctx.reward(10, player.pos.clone().setY(player.pos.y + 2), '🚲 Air time! +10');
      }
    },
    onRespawn() {
      if (player.vehicle) dismount();
    },
  };
}
