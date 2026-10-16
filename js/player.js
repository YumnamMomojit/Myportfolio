import * as THREE from 'three';
import { dampAngle } from './utils.js';

const GRAVITY = 30;
const WALK = 7;
const SPRINT = 12.5;
const JUMP = 11;

function part(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function buildRobot() {
  const shell = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.35, metalness: 0.15 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4, metalness: 0.3 });
  const accent = new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.5 });
  const glow = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#5eead4', emissiveIntensity: 2.6 });

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  body.add(part(new THREE.CapsuleGeometry(0.42, 0.5, 6, 14), shell, 0, 1.05, 0));
  body.add(part(new THREE.TorusGeometry(0.43, 0.05, 6, 24), accent, 0, 0.95, 0).rotateX(Math.PI / 2));
  // chest light
  body.add(part(new THREE.CircleGeometry(0.1, 16), glow, 0, 1.2, 0.425));
  // backpack ("cloud jetpack")
  body.add(part(new THREE.BoxGeometry(0.5, 0.55, 0.26), dark, 0, 1.12, -0.44));
  body.add(part(new THREE.BoxGeometry(0.34, 0.08, 0.04), glow, 0, 1.2, -0.58));

  const head = new THREE.Group();
  head.position.y = 1.95;
  const skull = part(new THREE.SphereGeometry(0.46, 20, 14), shell);
  skull.scale.set(1.05, 0.85, 0.95);
  head.add(skull);
  const visor = part(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), dark, 0, 0.02, 0.33);
  visor.rotation.z = Math.PI / 2;
  visor.scale.set(1, 1, 0.55);
  head.add(visor);
  for (const x of [-0.13, 0.13]) head.add(part(new THREE.SphereGeometry(0.065, 10, 8), glow, x, 0.03, 0.42));
  head.add(part(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), dark, 0, 0.5, 0));
  const tip = part(new THREE.SphereGeometry(0.08, 10, 8), glow, 0, 0.7, 0);
  head.add(tip);
  body.add(head);

  const limb = (len, r) => new THREE.CapsuleGeometry(r, len, 4, 8);
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.53, 1.38, 0);
    pivot.add(part(limb(0.38, 0.11), shell, 0, -0.28, 0));
    pivot.add(part(new THREE.SphereGeometry(0.13, 10, 8), dark, 0, -0.55, 0));
    body.add(pivot);
    return pivot;
  });
  const legs = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.2, 0.56, 0);
    pivot.add(part(limb(0.26, 0.13), dark, 0, -0.27, 0));
    pivot.add(part(new THREE.BoxGeometry(0.26, 0.12, 0.36), shell, 0, -0.5, 0.05));
    root.add(pivot);
    return pivot;
  });

  // blob shadow helper is the real shadow map; nothing else needed
  return { root, body, head, arms, legs, tip, glow };
}

// ---------------------------------------------------------------- vehicles

const RIDE = {
  bicycle: { max: 11, boost: 14.5, accel: 9, turn: 2.6, lift: 0.42, wheelR: 0.42 },
  motorbike: { max: 19, boost: 25, accel: 15, turn: 2.3, lift: 0.5, wheelR: 0.42 },
  pony: { max: 9, boost: 14, accel: 10, turn: 3, lift: 0.95, wheelR: 1 },
};

function vbeam(group, a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), 6), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  group.add(m);
  return m;
}

// Vehicles face +z. Returns { group, wheels, crank }.
export function buildVehicle(kind) {
  const group = new THREE.Group();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const dark = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.7, roughness: 0.3 });
  const wheels = [];
  const wheel = (z, r, tube) => {
    const w = new THREE.Group();
    w.position.set(0, r, z);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 28), dark);
    tyre.rotation.y = Math.PI / 2;
    tyre.castShadow = true;
    w.add(tyre);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 2 - tube, 0.02), metal);
      s.rotation.x = (i / 4) * Math.PI;
      w.add(s);
    }
    group.add(w);
    wheels.push(w);
  };
  let crank = null;
  if (kind === 'bicycle') {
    const frame = new THREE.MeshStandardMaterial({ color: '#14b8a6', metalness: 0.4, roughness: 0.35 });
    wheel(-0.62, 0.42, 0.045);
    wheel(0.62, 0.42, 0.045);
    const rear = V(0, 0.42, -0.62), front = V(0, 0.42, 0.62), bb = V(0, 0.36, -0.02);
    const seatTop = V(0, 0.98, -0.2), head = V(0, 0.95, 0.46);
    vbeam(group, rear, bb, 0.03, frame);
    vbeam(group, rear, seatTop, 0.03, frame);
    vbeam(group, bb, seatTop, 0.035, frame);
    vbeam(group, bb, head, 0.035, frame);
    vbeam(group, seatTop, head, 0.03, frame);
    vbeam(group, head, front, 0.03, metal);
    vbeam(group, V(-0.32, 1.12, 0.42), V(0.32, 1.12, 0.42), 0.025, dark);
    vbeam(group, head, V(0, 1.12, 0.42), 0.025, metal);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.32), dark);
    seat.position.set(0, 1.02, -0.22);
    group.add(seat);
    crank = new THREE.Group();
    crank.position.copy(bb);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.34), metal);
      arm.position.set(s * 0.12, 0, s * 0.08);
      arm.rotation.x = s > 0 ? 0 : Math.PI;
      crank.add(arm);
    }
    group.add(crank);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.2 }));
    bell.position.set(0.22, 1.15, 0.42);
    group.add(bell);
  } else if (kind === 'pony') {
    return buildPony();
  } else {
    const paint = new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.5, roughness: 0.3 });
    wheel(-0.75, 0.4, 0.12);
    wheel(0.78, 0.4, 0.12);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 1.05), paint);
    body.position.set(0, 0.72, 0);
    body.castShadow = true;
    group.add(body);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.5), paint);
    tank.position.set(0, 0.98, 0.2);
    tank.castShadow = true;
    group.add(tank);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.62), dark);
    seat.position.set(0, 0.95, -0.3);
    group.add(seat);
    vbeam(group, V(0, 0.4, 0.78), V(0, 1.12, 0.5), 0.045, metal);
    vbeam(group, V(0, 0.4, -0.75), V(0, 0.75, -0.2), 0.05, metal);
    vbeam(group, V(-0.38, 1.18, 0.48), V(0.38, 1.18, 0.48), 0.03, dark);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fef9c3', emissiveIntensity: 3 }));
    lamp.position.set(0, 1.0, 0.64);
    group.add(lamp);
    vbeam(group, V(0.2, 0.45, -0.1), V(0.24, 0.6, -0.85), 0.05, metal);
  }
  return { group, wheels, crank };
}

// A Manipuri pony (sagol) — small, sturdy, bay-coloured. Faces +z; legs gallop.
export function buildPony({ coat = '#7a4a26', dark = '#2b1a10', saddle = '#b91c1c', material = null } = {}) {
  const group = new THREE.Group();
  const m = (c) => material || new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const C = m(coat), D = m(dark), S = m(saddle);
  const part = (geo, mat, x, y, z) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    group.add(o);
    return o;
  };
  part(new THREE.CapsuleGeometry(0.42, 1.1, 6, 12), C, 0, 1.25, 0).rotation.x = Math.PI / 2;
  const neck = part(new THREE.CylinderGeometry(0.2, 0.32, 0.9, 10), C, 0, 1.72, 0.72);
  neck.rotation.x = 0.7;
  const head = part(new THREE.BoxGeometry(0.28, 0.32, 0.62), C, 0, 2.02, 1.12);
  head.rotation.x = 0.5;
  part(new THREE.BoxGeometry(0.2, 0.2, 0.22), D, 0, 1.86, 1.38);
  for (const s of [-1, 1]) part(new THREE.ConeGeometry(0.05, 0.16, 4), C, s * 0.09, 2.27, 0.98);
  const mane = part(new THREE.BoxGeometry(0.06, 0.5, 0.75), D, 0, 1.92, 0.62);
  mane.rotation.x = 0.7;
  const tail = part(new THREE.CylinderGeometry(0.05, 0.12, 0.8, 6), D, 0, 1.15, -0.95);
  tail.rotation.x = -0.5;
  part(new THREE.BoxGeometry(0.9, 0.1, 0.7), S, 0, 1.68, -0.05);
  part(new THREE.BoxGeometry(0.95, 0.35, 0.05), S, 0, 1.5, -0.05);
  const legs = [];
  for (const [x, z, ph] of [[0.22, 0.5, 0], [-0.22, 0.5, Math.PI], [0.22, -0.5, Math.PI * 0.5], [-0.22, -0.5, Math.PI * 1.5]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.0, z);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.75, 4, 8), C);
    leg.position.y = -0.45;
    leg.castShadow = true;
    pivot.add(leg);
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.2), D);
    hoof.position.y = -0.92;
    pivot.add(hoof);
    pivot.userData.ph = ph;
    group.add(pivot);
    legs.push(pivot);
  }
  return { group, wheels: [], crank: null, legs, tail };
}

// The kangjei: a long cane mallet with an angled wooden head.
function buildMallet() {
  const g = new THREE.Group();
  const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.9, 6), new THREE.MeshStandardMaterial({ color: '#d6b46a', roughness: 0.6 }));
  cane.position.y = -0.95;
  g.add(cane);
  const headM = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.32), new THREE.MeshStandardMaterial({ color: '#7c4a2d' }));
  headM.position.set(0, -1.9, 0.1);
  headM.rotation.x = 0.4;
  g.add(headM);
  g.position.set(0, -0.55, 0);
  return g;
}

// =====================================================================

export class Player {
  constructor(scene) {
    this.rig = buildRobot();
    scene.add(this.rig.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.onGround = true;
    this.coyote = 0;
    this.jumps = 0;
    this.launched = false;
    this.phase = 0;
    this.radius = 0.5;
    this.lastSafe = new THREE.Vector3();
    this.safeTimer = 0;
    this.airTime = 0;
    this.ramp = null;
    this.rampAir = false;
    this.surface = null;
    this.vehicle = null;
    this.ride = null;
    this.speedF = 0;
    this.steer = 0;
    this.swingT = 0;
    this.mallet = null;
  }

  // swing the polo mallet (pony only)
  swing() {
    if (this.vehicle === 'pony' && this.swingT <= 0) this.swingT = 0.45;
  }

  place(x, y, z, yaw = Math.PI) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.speedF = 0;
    this.yaw = yaw;
    this.launched = false;
    this.lastSafe.copy(this.pos);
    this.sync();
  }

  get speed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  mount(kind, yaw) {
    this.dismount();
    this.vehicle = kind;
    this.ride = buildVehicle(kind);
    this.rig.root.add(this.ride.group);
    if (kind === 'pony') {
      this.mallet = buildMallet();
      this.rig.arms[1].add(this.mallet);
    }
    this.yaw = yaw;
    this.speedF = 0;
    this.vel.set(0, this.vel.y, 0);
  }

  dismount() {
    if (this.ride) this.rig.root.remove(this.ride.group);
    if (this.mallet) this.mallet.parent.remove(this.mallet);
    this.mallet = null;
    this.ride = null;
    this.vehicle = null;
    this.speedF = 0;
    this.vel.x = this.vel.z = 0;
    const { body, legs } = this.rig;
    body.position.y = 0;
    legs.forEach((l) => (l.position.y = 0.56));
  }

  // input: { x, y (forward), sprint, jump }
  update(dt, input, camYaw, world, events) {
    const p = this.pos;
    this.surface = world.surfaceAt(p.x, p.z, p.y);
    if (this.vehicle) {
      // vehicles steer: W/S throttle & brake, A/D turn
      const R = RIDE[this.vehicle];
      const top = (input.sprint ? R.boost : R.max) * (this.surface === 'water' ? 0.45 : 1);
      if (this.onGround) {
        if (input.y > 0.1) this.speedF = Math.min(top, this.speedF + R.accel * input.y * dt);
        else if (input.y < -0.1) this.speedF = Math.max(-3, this.speedF + R.accel * 1.6 * input.y * dt);
        else this.speedF *= Math.exp(-(this.surface === 'ice' ? 0.2 : 1.1) * dt);
        if (this.speedF > top) this.speedF = THREE.MathUtils.damp(this.speedF, top, 2.5, dt);
      }
      this.steer = input.x;
      const turn = R.turn * Math.min(1, Math.abs(this.speedF) / 4 + 0.3) * (this.speedF < 0 ? -1 : 1);
      this.yaw -= input.x * turn * dt;
      this.vel.x = Math.sin(this.yaw) * this.speedF;
      this.vel.z = Math.cos(this.yaw) * this.speedF;
    } else if (!this.launched) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      let mx = rx * input.x + fx * input.y;
      let mz = rz * input.x + fz * input.y;
      const len = Math.hypot(mx, mz);
      if (len > 1) { mx /= len; mz /= len; }
      const target = (input.sprint ? SPRINT : WALK) * (this.surface === 'water' ? 0.5 : 1);
      const grip = this.surface === 'ice' ? 1.6 : 14;
      const k = 1 - Math.exp(-(this.onGround ? grip : 5) * dt);
      this.vel.x += (mx * target - this.vel.x) * k;
      this.vel.z += (mz * target - this.vel.z) * k;
    }

    if (input.jump && this.vehicle) events.vehicleAction?.();
    if (input.jump && !this.vehicle) {
      if (this.onGround || this.coyote > 0) {
        this.vel.y = JUMP;
        this.jumps = 1;
        this.onGround = false;
        this.coyote = 0;
        events.jump?.(1);
      } else if (this.jumps < 2 && !this.launched) {
        this.vel.y = JUMP * 0.9;
        this.jumps = 2;
        events.jump?.(2);
      }
    }

    this.vel.y -= GRAVITY * dt;
    const prevY = p.y;
    p.addScaledVector(this.vel, dt);
    if (world.resolve(p, this.radius, Math.max(prevY, p.y)) && this.vehicle) this.speedF *= Math.exp(-6 * dt);

    const ground = world.groundAt(p.x, p.z, Math.max(prevY, p.y));
    if (p.y <= ground && this.vel.y <= 0) {
      if (!this.onGround) events.land?.(-this.vel.y, this.airTime, this.rampAir);
      p.y = ground;
      this.vel.y = 0;
      this.onGround = true;
      this.coyote = 0.12;
      this.jumps = 0;
      this.launched = false;
      this.airTime = 0;
      this.rampAir = false;
      this.ramp = ground > 0.05 ? world.rampAt(p.x, p.z) : null;
    } else {
      if (this.onGround) {
        this.coyote = 0.12;
        // leaving a ramp turns forward speed into lift
        if (this.ramp && this.vel.y <= 0) {
          const along = this.vel.x * this.ramp.dx + this.vel.z * this.ramp.dz;
          if (along > 2) {
            this.vel.y = along * this.ramp.slope * 1.15;
            this.rampAir = true;
            events.rampLaunch?.(along);
          }
        }
      }
      this.onGround = false;
      this.ramp = null;
      this.coyote -= dt;
      this.airTime += dt;
    }

    // remember a safe spot on the main island for respawns
    this.safeTimer -= dt;
    if (this.onGround && p.y === 0 && this.safeTimer <= 0 && world.isSafe(p.x, p.z)) {
      this.lastSafe.copy(p);
      this.safeTimer = 0.4;
    }

    // bounce pads: each one launches you onto its target platform
    if (this.onGround) {
      for (const pad of world.pads) {
        if (Math.hypot(p.x - pad.x, p.z - pad.z) < (pad.r || 1.3) && Math.abs(p.y - (pad.y || 0)) < 0.5) {
          this.launchTo(pad.to, events);
          break;
        }
      }
    }

    this.animate(dt);
    this.sync();
  }

  // Ballistic launch that lands on the target platform.
  launchTo(plat, events) {
    const vy = 28;
    const h = plat.top + 0.5 - this.pos.y;
    const t = (vy + Math.sqrt(vy * vy - 2 * GRAVITY * h)) / GRAVITY;
    this.vel.set((plat.x - this.pos.x) / t, vy, (plat.z - this.pos.z) / t);
    this.speedF = 0;
    this.launched = true;
    this.onGround = false;
    this.jumps = 2;
    events.bounce?.();
  }

  animate(dt) {
    const { body, arms, legs, head, tip } = this.rig;
    const sp = this.speed;
    if (this.vehicle) {
      const R = RIDE[this.vehicle];
      this.phase += dt * this.speedF * 1.4;
      body.position.y = R.lift;
      body.rotation.x = THREE.MathUtils.damp(body.rotation.x, this.vehicle === 'motorbike' ? 0.35 : 0.22, 8, dt);
      legs.forEach((l, i) => {
        l.position.y = 0.56 + R.lift;
        l.rotation.x = this.vehicle === 'bicycle' ? -1.15 + Math.sin(this.phase + i * Math.PI) * 0.45 : -1.25;
        l.rotation.z = (i ? -1 : 1) * (this.vehicle === 'motorbike' ? 0.18 : 0.05);
      });
      arms.forEach((a, i) => {
        a.rotation.x = -1.2;
        a.rotation.z = (i ? 1 : -1) * 0.12;
      });
      for (const w of this.ride.wheels) w.rotation.x += (this.speedF * dt) / R.wheelR;
      if (this.ride.legs) {
        // gallop: each leg swings with its own phase; the body bobs with the stride
        const amt = Math.min(Math.abs(this.speedF) / 6, 1);
        this.phase += dt * Math.abs(this.speedF) * 0.9;
        for (const l of this.ride.legs) l.rotation.x = Math.sin(this.phase * 2 + l.userData.ph) * 0.7 * amt;
        this.ride.group.position.y = Math.abs(Math.sin(this.phase * 2)) * 0.12 * amt;
        this.ride.tail.rotation.x = -0.5 - Math.sin(this.phase * 2) * 0.25 * amt;
        legs.forEach((l, i) => (l.rotation.z = (i ? -1 : 1) * 0.45));
        // the mallet arm: held up, then a fast downward swing
        this.swingT = Math.max(0, this.swingT - dt);
        const k = this.swingT > 0 ? Math.sin((1 - this.swingT / 0.45) * Math.PI) : 0;
        arms[1].rotation.x = -2.4 + k * 3.4;
        arms[1].rotation.z = 0.25;
      }
      if (this.ride.crank) this.ride.crank.rotation.x = this.phase;
      this.ride.group.rotation.z = THREE.MathUtils.damp(this.ride.group.rotation.z, -this.steer * 0.22 * Math.min(Math.abs(this.speedF) / 8, 1), 6, dt);
      body.rotation.z = this.ride.group.rotation.z;
      head.rotation.z = 0;
      tip.position.y = 0.7 + Math.sin(performance.now() * 0.006) * 0.03;
      return;
    }
    legs.forEach((l) => (l.rotation.z = 0));
    body.rotation.z = 0;
    if (sp > 0.4 && this.surface !== 'ice') this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 12, dt);
    else if (sp > 0.4) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 4, dt);
    const moving = Math.min(sp / WALK, 1.6);
    this.phase += dt * (4 + sp * 1.1);
    if (this.onGround) {
      const sw = Math.sin(this.phase) * 0.75 * Math.min(moving, 1.2) * (this.surface === 'ice' ? 0.3 : 1);
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.9;
      arms[1].rotation.x = sw * 0.9;
      // arms flail for balance on ice
      arms[0].rotation.z = this.surface === 'ice' ? Math.sin(this.phase * 0.7) * 0.4 - 0.8 : 0;
      arms[1].rotation.z = -arms[0].rotation.z;
      body.position.y = Math.abs(Math.sin(this.phase)) * 0.07 * moving;
      body.rotation.x = THREE.MathUtils.damp(body.rotation.x, moving * 0.12, 8, dt);
    } else {
      legs[0].rotation.x = THREE.MathUtils.damp(legs[0].rotation.x, -0.6, 10, dt);
      legs[1].rotation.x = THREE.MathUtils.damp(legs[1].rotation.x, 0.3, 10, dt);
      arms[0].rotation.z = THREE.MathUtils.damp(arms[0].rotation.z, -1.1, 10, dt);
      arms[1].rotation.z = THREE.MathUtils.damp(arms[1].rotation.z, 1.1, 10, dt);
      arms[0].rotation.x = arms[1].rotation.x = 0;
      body.position.y = 0;
    }
    head.rotation.z = Math.sin(this.phase * 0.5) * 0.05 * moving;
    tip.position.y = 0.7 + Math.sin(performance.now() * 0.006) * 0.03;
  }

  sync() {
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
  }
}
