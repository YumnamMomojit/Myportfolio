// Buddy, the explorer's dog: follows you everywhere, sniffs out buried gold (G key),
// and the gold builds things at the Golden Workshop.
import * as THREE from 'three';
import { makeLabel, mulberry32, esc, dampAngle } from './utils.js';
import { std, mesh } from './helpers.js';

export const DOG_NAME = 'Buddy';
export const WORKSHOP = { x: 17, z: 32 };
export const CRAFTS = [
  { id: 'kennel', icon: '🏠', title: 'Golden kennel', cost: 3, pts: 100, desc: `A cosy home for ${DOG_NAME}, right beside the workshop.` },
  { id: 'collar', icon: '📿', title: 'Golden collar', cost: 3, pts: 150, desc: `${DOG_NAME} wears it everywhere you go.` },
  { id: 'statue', icon: '🤖', title: 'Golden explorer statue', cost: 4, pts: 250, desc: 'A shining statue of you, the explorer, next to the workshop.' },
];
// where the buried gold is: how many nuggets on each island
const HIDE = { main: 7, manipur: 2, forest: 1, desert: 1, water: 1, city: 1 };

const goldMat = () => new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.9, roughness: 0.25, emissive: '#b45309', emissiveIntensity: 0.5 });
const ghostMat = () => new THREE.MeshBasicMaterial({ color: '#fde68a', wireframe: true, transparent: true, opacity: 0.18, depthWrite: false });

// ---------------------------------------------------------------- the dog model (faces +z)
function buildDog() {
  const group = new THREE.Group();
  const coat = std('#d29b55'), dark = std('#7a4a24'), black = std('#111827');
  const body = new THREE.Group(); // pitches when sitting
  group.add(body);
  body.add(mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 10), coat, 0, 0.55, 0).rotateX(Math.PI / 2));
  const head = new THREE.Group();
  head.position.set(0, 0.82, 0.36);
  body.add(head);
  head.add(mesh(new THREE.BoxGeometry(0.3, 0.27, 0.3), coat, 0, 0, 0));
  head.add(mesh(new THREE.BoxGeometry(0.17, 0.14, 0.2), std('#e8c08a'), 0, -0.05, 0.22));
  head.add(mesh(new THREE.BoxGeometry(0.07, 0.06, 0.05), black, 0, -0.01, 0.33));
  for (const s of [-1, 1]) {
    head.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), black, s * 0.08, 0.05, 0.15));
    const ear = mesh(new THREE.BoxGeometry(0.06, 0.2, 0.13), dark, s * 0.17, -0.02, -0.02);
    ear.rotation.z = s * 0.25;
    head.add(ear);
  }
  const mouth = new THREE.Object3D();
  mouth.position.set(0, -0.12, 0.3);
  head.add(mouth);
  const tail = new THREE.Group();
  tail.position.set(0, 0.68, -0.34);
  tail.add(mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.34, 6), dark, 0, 0.15, 0));
  tail.rotation.x = -0.7;
  body.add(tail);
  const legs = [];
  for (const [x, z, ph] of [[0.11, 0.24, 0], [-0.11, 0.24, Math.PI], [0.11, -0.24, Math.PI], [-0.11, -0.24, 0]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.44, z);
    pivot.add(mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 6), coat, 0, -0.22, 0));
    pivot.add(mesh(new THREE.BoxGeometry(0.09, 0.05, 0.12), dark, 0, -0.42, 0.02));
    pivot.userData.ph = ph;
    pivot.userData.rear = z < 0;
    body.add(pivot);
    legs.push(pivot);
  }
  const collar = mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 18), goldMat(), 0, 0.74, 0.3);
  collar.rotation.x = Math.PI / 2 - 0.5;
  collar.visible = false;
  body.add(collar);
  const tag = makeLabel(`🐶 ${DOG_NAME}`, { accent: '#fbbf24', height: 0.26 });
  tag.position.y = 1.35;
  group.add(tag);
  return { group, body, head, tail, legs, mouth, collar };
}

function buildNugget() {
  const g = new THREE.Group();
  const m = goldMat();
  g.add(mesh(new THREE.IcosahedronGeometry(0.13, 0), m, 0, 0, 0));
  g.add(mesh(new THREE.IcosahedronGeometry(0.08, 0), m, 0.1, -0.03, 0.04));
  return g;
}

// ---------------------------------------------------------------- the Golden Workshop
function buildWorkshop(scene, W) {
  const { x, z } = WORKSHOP;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.16, 24), std('#a8a29e'), 0, 0.08, 0));
  const wood = std('#7c4a2d');
  for (const [px, pz] of [[-2.2, -1.4], [2.2, -1.4], [-2.2, 1.4], [2.2, 1.4]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.8, 6), wood, px, 1.4, pz));
    W.circle(x + px, z + pz, 0.2, 3);
  }
  const roof = mesh(new THREE.ConeGeometry(3.4, 1.3, 4), std('#b45309'), 0, 3.4, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.75;
  g.add(roof);
  // workbench + anvil + a glowing forge
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.12, 0.9), wood, 0, 0.95, -0.6));
  for (const sx of [-0.95, 0.95]) g.add(mesh(new THREE.BoxGeometry(0.1, 0.9, 0.8), wood, sx, 0.45, -0.6));
  g.add(mesh(new THREE.BoxGeometry(0.5, 0.22, 0.26), std('#374151', { metalness: 0.6 }), -0.4, 1.12, -0.6));
  const forge = mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.5, 10), std('#57534e'), 0.6, 1.25, -0.6);
  g.add(forge);
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fb923c', emissiveIntensity: 2.6 }));
  fire.position.set(0.6, 1.55, -0.6);
  g.add(fire);
  W.updaters.push((t) => fire.scale.setScalar(1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 13.7) * 0.05));
  W.circle(x, z - 0.6, 1.2, 1.2);
  const lbl = makeLabel('🛠️ Golden Workshop', { sub: `gold from ${DOG_NAME} → crafts · press G to send him`, accent: '#facc15', height: 0.55 });
  lbl.position.y = 4.9;
  g.add(lbl);
  scene.add(g);

  // the three builds: a faint wireframe "blueprint" until crafted
  const builds = {};
  const kennel = new THREE.Group();
  kennel.position.set(x + 4.6, 0, z + 0.8);
  kennel.rotation.y = -0.5;
  kennel.add(mesh(new THREE.BoxGeometry(1.3, 0.9, 1.2), std('#92400e'), 0, 0.45, 0));
  const kRoof = mesh(new THREE.ConeGeometry(1.05, 0.6, 4), goldMat(), 0, 1.2, 0);
  kRoof.rotation.y = Math.PI / 4;
  kennel.add(kRoof);
  kennel.add(mesh(new THREE.BoxGeometry(0.5, 0.55, 0.05), std('#1f2937'), 0, 0.3, 0.61));
  builds.kennel = kennel;
  const statue = new THREE.Group();
  statue.position.set(x - 4.6, 0, z + 0.8);
  statue.add(mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.9, 8), std('#e5e7eb'), 0, 0.45, 0));
  const gm = goldMat();
  statue.add(mesh(new THREE.CapsuleGeometry(0.42, 0.55, 6, 12), gm, 0, 1.75, 0));
  statue.add(mesh(new THREE.SphereGeometry(0.42, 16, 12), gm, 0, 2.65, 0));
  statue.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), gm, 0, 3.2, 0));
  statue.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), gm, 0, 3.4, 0));
  for (const s of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 6), gm, s * 0.6, 2.1, 0);
    arm.rotation.z = s * -2.4; // both arms raised in triumph
    statue.add(arm);
  }
  builds.statue = statue;
  for (const [id, b] of Object.entries(builds)) {
    scene.add(b);
    const ghost = b.clone();
    ghost.traverse((o) => { if (o.isMesh) o.material = ghostMat(); });
    scene.add(ghost);
    b.visible = false;
    builds[id] = { real: b, ghost };
  }
  W.circle(x + 4.6, z + 0.8, 0.8, 1.5);
  W.circle(x - 4.6, z + 0.8, 0.95, 3.5);
  W.interactables.push({ id: 'workshop', zone: 'park', label: 'Open the Golden Workshop 🛠️', x, z: z + 0.6, y: 0, r: 2.8, object: g });
  return builds;
}

// ---------------------------------------------------------------- runtime

export function createDog(ctx) {
  const { scene, W, player, sound, bursts } = ctx;
  const S = () => ctx.state();
  const dog = buildDog();
  scene.add(dog.group);
  const builds = buildWorkshop(scene, W);

  // bury the gold: seeded, so every visitor's island hides it in the same places
  const rng = mulberry32(9001);
  const probe = new THREE.Vector3();
  const nuggets = [];
  for (const isle of W.isles) {
    const want = HIDE[isle.id] || 0;
    for (let tries = 0, n = 0; tries < 400 && n < want; tries++) {
      const a = rng() * Math.PI * 2, r = (isle.id === 'main' ? 12 : 5) + Math.sqrt(rng()) * (isle.r - (isle.id === 'main' ? 16 : 9));
      const x = isle.x + Math.cos(a) * r, z = isle.z + Math.sin(a) * r;
      if (W.groundAt(x, z, 0) !== 0 || W.surfaceAt(x, z, 0)) continue;
      probe.set(x, 0, z);
      if (W.resolve(probe, 1.3)) continue;
      if (Math.hypot(x - WORKSHOP.x, z - WORKSHOP.z) < 8) continue;
      nuggets.push({ i: nuggets.length, x, z, isle: isle.id });
      n++;
    }
  }
  W.goldNuggets = nuggets;
  const carried = buildNugget();
  carried.visible = false;
  dog.mouth.add(carried);

  const isleOf = (x, z) => W.isles.find((s) => (x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r)?.id || null;
  const isleName = (id) => (id === 'main' ? 'Cloud Island' : W.islandList?.find((i) => i.id === id)?.name || id);
  const compass = (dx, dz) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((Math.atan2(dx, -dz) / (Math.PI * 2)) * 8 + 8)) % 8];
  const pouch = () => S().goldFound.length - S().goldSpent;

  const D = { pos: new THREE.Vector3(), yaw: 0, speed: 0, mode: 'follow', target: null, timer: 0, idle: 0, phase: 0, happy: 0, away: false };
  const it = { id: 'dog', label: `Pet ${DOG_NAME} 🐶`, x: 0, z: 0, y: 0, r: 1.7, object: dog.group, low: true };
  W.interactables.push(it);

  function placeBehind(poof = true) {
    const f = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const x = player.pos.x - f.x * 1.6, z = player.pos.z - f.z * 1.6;
    const g = W.groundAt(x, z, player.pos.y + 0.5);
    if (g > -50) D.pos.set(x, Math.max(g, -0.3), z);
    else D.pos.copy(player.pos);
    D.yaw = player.yaw;
    if (poof) bursts.spawn(D.pos.clone().setY(D.pos.y + 0.4), '#e7dcc0', 10, 2, { up: 1.5, glow: 1 });
  }
  placeBehind(false);
  const syncCraft = () => {
    for (const c of CRAFTS) {
      const built = S().crafted.includes(c.id);
      if (builds[c.id]) {
        builds[c.id].real.visible = built;
        builds[c.id].ghost.visible = !built;
      }
      if (c.id === 'collar') dog.collar.visible = built;
    }
  };
  syncCraft();

  function moveToward(goal, speed, dt) {
    const dx = goal.x - D.pos.x, dz = goal.z - D.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-3) return 0;
    const step = Math.min(speed * dt, d);
    const nx = D.pos.x + (dx / d) * step, nz = D.pos.z + (dz / d) * step;
    const g = W.groundAt(nx, nz, D.pos.y + 0.6);
    if (g < -50) return 0; // never walk off an edge
    const before = D.pos.clone();
    D.pos.x = nx;
    D.pos.z = nz;
    W.resolve(D.pos, 0.28);
    D.pos.y = THREE.MathUtils.damp(D.pos.y, Math.max(g, -0.3), 14, dt);
    D.yaw = dampAngle(D.yaw, Math.atan2(dx, dz), 10, dt);
    return before.distanceTo(D.pos) / dt;
  }

  function update(dt) {
    D.happy = Math.max(0, D.happy - dt);
    // hidden while you ride the train or cable car; reappears beside you after
    if (ctx.riding()) {
      dog.group.visible = false;
      it.hidden = true;
      D.away = true;
      return;
    }
    if (D.away) {
      D.away = false;
      dog.group.visible = true;
      if (D.mode === 'follow') placeBehind();
    }
    const p = player.pos;
    const dPlayer = Math.hypot(p.x - D.pos.x, p.z - D.pos.z);
    let speed = 0;
    D.timer += dt;
    if (D.mode === 'follow') {
      if ((dPlayer > 26 || Math.abs(p.y - D.pos.y) > 3) && player.onGround) placeBehind();
      const f = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      const goal = new THREE.Vector3(p.x - f.x * 1.5 + f.z * 0.7, 0, p.z - f.z * 1.5 - f.x * 0.7);
      if (Math.hypot(goal.x - D.pos.x, goal.z - D.pos.z) > 0.7) {
        const run = Math.max(6.5, Math.min(16, (player.speed || 0) + 2.5));
        speed = moveToward(goal, Math.min(run, dPlayer * 2.4 + 1), dt);
      } else D.yaw = dampAngle(D.yaw, Math.atan2(p.x - D.pos.x, p.z - D.pos.z), 4, dt);
    } else if (D.mode === 'seek') {
      speed = moveToward(D.target, 8.5, dt);
      if (D.timer > 14) { D.pos.set(D.target.x, 0, D.target.z); D.timer = 0; }
      if (Math.hypot(D.target.x - D.pos.x, D.target.z - D.pos.z) < 0.45) {
        D.mode = 'dig';
        D.timer = 0;
        sound.dig?.();
      }
    } else if (D.mode === 'dig') {
      if (Math.random() < dt * 14) bursts.spawn(dog.mouth.getWorldPosition(new THREE.Vector3()).setY(D.pos.y + 0.1), '#a16207', 3, 1.6, { up: 2.4, glow: 0.8, life: 0.5 });
      if (D.timer > 1.3) {
        D.mode = 'return';
        D.timer = 0;
        carried.visible = true;
        bursts.spawn(D.pos.clone().setY(D.pos.y + 0.5), '#facc15', 18, 3, { up: 3 });
        sound.gem();
      }
    } else if (D.mode === 'return') {
      speed = moveToward(p, 8.5, dt);
      if (D.timer > 16 && player.onGround) placeBehind();
      if (dPlayer < 1.5) deliver();
    }

    // animation: trot, wag, sit when idle, dig with the front paws
    const amt = Math.min(speed / 6, 1);
    D.phase += dt * (4 + speed * 1.6);
    D.idle = speed > 0.3 || D.mode !== 'follow' ? 0 : D.idle + dt;
    const sit = D.idle > 2.5 ? Math.min(1, (D.idle - 2.5) * 3) : 0;
    for (const l of dog.legs) {
      let r = Math.sin(D.phase + l.userData.ph) * 0.8 * amt;
      if (l.userData.rear) r -= sit * 1.3;
      if (D.mode === 'dig' && !l.userData.rear) r = Math.sin(D.timer * 30 + l.userData.ph) * 0.9 - 0.6;
      l.rotation.x = r;
    }
    dog.body.rotation.x = -sit * 0.45 + (D.mode === 'dig' ? 0.35 : 0);
    dog.body.position.y = -sit * 0.12 + Math.abs(Math.sin(D.phase)) * 0.04 * amt;
    dog.tail.rotation.z = Math.sin(D.phase * (D.happy > 0 ? 3 : 1.2)) * (D.happy > 0 ? 0.9 : 0.4);
    dog.head.rotation.x = D.mode === 'dig' ? 0.5 : sit * -0.2;
    dog.group.position.copy(D.pos);
    dog.group.rotation.y = D.yaw;
    it.x = D.pos.x;
    it.z = D.pos.z;
    it.y = D.pos.y;
    it.hidden = D.mode !== 'follow';
  }

  function deliver() {
    const st = S();
    carried.visible = false;
    D.mode = 'follow';
    D.happy = 2.5;
    if (!st.goldFound.includes(D.target.i)) st.goldFound.push(D.target.i);
    D.target = null;
    ctx.reward(25, D.pos.clone().setY(D.pos.y + 1.4), '🪙 +25');
    ctx.toast(`${DOG_NAME} brought you gold!`, `${pouch()} in your pouch · ${st.goldFound.length}/${nuggets.length} found · craft at the Golden Workshop`, '🪙');
    ctx.progress('dog-gold', st.goldFound.length);
  }

  return {
    update,
    busy: () => D.mode !== 'follow',
    nuggets,
    // sit beside the explorer, facing the same way, for a selfie
    photoPose() {
      if (ctx.riding() || D.mode !== 'follow') return false;
      const f = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      const x = player.pos.x + f.z * 1.1 + f.x * 0.3, z = player.pos.z - f.x * 1.1 + f.z * 0.3;
      const g = W.groundAt(x, z, player.pos.y + 0.5);
      if (g < -50) return false;
      D.pos.set(x, Math.max(g, -0.3), z);
      D.yaw = player.yaw;
      D.idle = 4;
      D.happy = 2;
      for (const l of dog.legs) l.rotation.x = l.userData.rear ? -1.3 : 0;
      dog.body.rotation.x = -0.45;
      dog.body.position.y = -0.12;
      dog.head.rotation.x = -0.2;
      dog.group.position.copy(D.pos);
      dog.group.rotation.y = D.yaw;
      return true;
    },
    // G: sniff out the nearest buried gold on the island you're on
    command() {
      if (ctx.riding()) return ctx.toast(`${DOG_NAME} is waiting for you`, 'Get off the train first', '🐶');
      if (D.mode !== 'follow') return ctx.toast(`${DOG_NAME} is already on it!`, D.mode === 'return' ? 'He is bringing the gold back to you' : 'Follow him — he has the scent', '🐶');
      const st = S();
      const left = nuggets.filter((n) => !st.goldFound.includes(n.i));
      sound.bark?.();
      D.happy = 1.5;
      if (!left.length) return ctx.toast(`${DOG_NAME} found every nugget!`, 'All the gold is dug up — spend it at the Golden Workshop', '🐶');
      const p = player.pos;
      const here = isleOf(p.x, p.z);
      const near = left.filter((n) => n.isle === here && isleOf(D.pos.x, D.pos.z) === here).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (near) {
        D.mode = 'seek';
        D.target = near;
        D.timer = 0;
        const dist = Math.round(Math.hypot(near.x - p.x, near.z - p.z));
        return ctx.toast(`${DOG_NAME} caught a scent!`, `Gold is buried about ${dist} m to the ${compass(near.x - p.x, near.z - p.z)} — follow him`, '🐶');
      }
      const far = left.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      ctx.toast(`${DOG_NAME} sniffs the air…`, `No gold left ${here ? 'on this island' : 'right here'}. The nearest is on ${isleName(far.isle)}, to the ${compass(far.x - p.x, far.z - p.z)}.`, '🐶');
    },
    pet() {
      const st = S();
      D.happy = 3;
      D.idle = 0;
      sound.bark?.();
      bursts.spawn(D.pos.clone().setY(D.pos.y + 1.1), '#f472b6', 12, 1.8, { up: 2.5, glow: 1.4 });
      if (!st.opened.includes('dog')) {
        st.opened.push('dog');
        ctx.reward(20, D.pos.clone().setY(D.pos.y + 1.4), '🐶 +20');
        ctx.toast(`${DOG_NAME} loves you!`, 'Press G (or the 🐶 button) and he will sniff out buried gold', '🐶');
      }
    },
    workshopHTML() {
      const st = S();
      return `<p class="lead">${DOG_NAME} digs up buried gold — press <kbd>G</kbd> or the 🐶 button and follow him. Bring the gold here to build things.</p>
        <div class="gold-pouch"><b>🪙 ${pouch()}</b><span>gold in your pouch · ${st.goldFound.length}/${nuggets.length} nuggets found across the islands</span></div>
        <div class="craft-list">${CRAFTS.map((c) => {
          const built = st.crafted.includes(c.id);
          const can = !built && pouch() >= c.cost;
          return `<div class="craft ${built ? 'built' : ''}"><span class="ci">${c.icon}</span>
            <div><b>${esc(c.title)}</b><small>${esc(c.desc)} · +${c.pts} pts</small></div>
            ${built ? '<span class="tag">✔ built</span>' : `<button class="btn small ${can ? 'primary' : ''}" data-craft="${c.id}" ${can ? '' : 'disabled'}>Craft · 🪙 ${c.cost}</button>`}
          </div>`;
        }).join('')}</div>
        <p class="muted">Gold hides on Cloud Island and on the outer islands, so some of it only turns up once you can travel there.</p>`;
    },
    craft(id) {
      const st = S();
      const c = CRAFTS.find((k) => k.id === id);
      if (!c || st.crafted.includes(id) || pouch() < c.cost) return false;
      st.goldSpent += c.cost;
      st.crafted.push(id);
      syncCraft();
      const at = builds[id] ? builds[id].real.position.clone().setY(2) : D.pos.clone().setY(D.pos.y + 1.2);
      bursts.spawn(at, '#facc15', 40, 6, { up: 4 });
      sound.achieve();
      ctx.reward(c.pts, at, `${c.icon} +${c.pts}`);
      ctx.toast(`Crafted: ${c.title}`, c.desc, c.icon);
      ctx.progress('craft', st.crafted.length);
      return true;
    },
  };
}
