// Manipur Island: heritage and culture. The Meitei calendar in Meitei Mayek and English, the
// Festival Lanterns trial (solving it unseals the way home), the story of Sagol Kangjei at a
// bronze polo rider, a playable pony-polo ground and a Loktak-style lake.
import * as THREE from 'three';
import { drawCanvas, makeLabel, FONT, MONO, esc } from '../utils.js';
import { std, mesh, waterMaterial } from '../helpers.js';
import { buildPony } from '../player.js';
import { frame, pillar, label, bob } from './kit.js';

export const MM_FONT = "'Noto Sans Meetei Mayek'";

// Months of the Meitei calendar (lunar; Gregorian spans are approximate and shift each year).
// Names in Meitei Mayek and festivals follow Wikipedia's "Meitei calendar" article.
export const MONTHS = [
  { mm: 'ꯁꯖꯤꯕꯨ', en: 'Sajibu', greg: 'Mar – Apr', season: '#f472b6', fest: [['ꯁꯖꯤꯕꯨ ꯆꯩꯔꯥꯎꯕ', 'Sajibu Cheiraoba — the Meitei New Year (1st day)']] },
  { mm: 'ꯀꯥꯂꯦꯟ', en: 'Kalen', greg: 'Apr – May', season: '#fb923c', fest: [] },
  { mm: 'ꯏꯉꯥ', en: 'Inga', greg: 'May – Jun', season: '#facc15', fest: [] },
  { mm: 'ꯏꯉꯦꯟ', en: 'Ingen', greg: 'Jun – Jul', season: '#4ade80', fest: [] },
  { mm: 'ꯊꯧꯋꯥꯟ', en: 'Thawan', greg: 'Jul – Aug', season: '#22d3ee', fest: [] },
  { mm: 'ꯂꯥꯡꯕꯟ', en: 'Langban', greg: 'Aug – Sep', season: '#38bdf8', fest: [['ꯍꯩꯀ꯭ꯔꯨ ꯍꯤꯗꯣꯡꯕ', 'Heikru Hidongba (11th day)']] },
  { mm: 'ꯃꯦꯔꯥ', en: 'Mera', greg: 'Sep – Oct', season: '#60a5fa', fest: [['ꯃꯦꯔꯥ ꯆꯥꯎꯔꯦꯜ ꯍꯧꯕ', 'Mera Chaorel Houba (1st)'], ['ꯀ꯭ꯋꯥꯛ ꯇꯥꯟꯕ', 'Kwaak Taanba (10th)'], ['ꯃꯦꯔꯥ ꯍꯧ ꯆꯣꯡꯕ', 'Mera Hou Chongba (15th)']] },
  { mm: 'ꯍꯤꯌꯥꯡꯒꯩ', en: 'Hiyangei', greg: 'Oct – Nov', season: '#a78bfa', fest: [['ꯅꯤꯉꯣꯜ ꯆꯥꯛꯀꯧꯕ', 'Ningol Chakouba (2nd day)']] },
  { mm: 'ꯄꯣꯢꯅꯨ', en: 'Poinu', greg: 'Nov – Dec', season: '#c084fc', fest: [] },
  { mm: 'ꯋꯥꯛꯆꯤꯡ', en: 'Wakching', greg: 'Dec – Jan', season: '#e2e8f0', fest: [['ꯏꯃꯣꯢꯅꯨ ꯏꯔꯥꯠꯄ', 'Imoinu Iratpa (12th day)']] },
  { mm: 'ꯐꯥꯢꯔꯦꯜ', en: 'Phairel', greg: 'Jan – Feb', season: '#94a3b8', fest: [] },
  { mm: 'ꯂꯝꯇꯥ', en: 'Lamta', greg: 'Feb – Mar', season: '#f87171', fest: [['ꯌꯥꯎꯁꯪ', 'Yaosang — full moon (15th day)']] },
];
export const DAYS = [
  ['ꯅꯣꯡꯃꯥꯢꯖꯤꯡ', 'Nongmaijing', 'Sunday'], ['ꯅꯤꯡꯊꯧꯀꯥꯕ', 'Ningthoukaba', 'Monday'], ['ꯂꯩꯕꯥꯛꯄꯣꯛꯄ', 'Leibakpokpa', 'Tuesday'],
  ['ꯌꯨꯝꯁꯀꯩꯁ', 'Yumsakeisa', 'Wednesday'], ['ꯁꯒꯣꯜꯁꯦꯟ', 'Sagolsen', 'Thursday'], ['ꯏꯔꯥꯢ', 'Irai', 'Friday'], ['ꯊꯥꯡꯖ', 'Thangja', 'Saturday'],
];
const CAL_TITLE = 'ꯃꯩꯇꯩ ꯊꯥꯄꯥꯟꯂꯣꯟ';

// The Festival Lanterns trial: six festivals, each belonging to one month (same source as above).
const LANTERNS = [
  { id: 'sajibu', name: 'Sajibu Cheiraoba', mm: 'ꯁꯖꯤꯕꯨ ꯆꯩꯔꯥꯎꯕ', month: 0, day: '1st day — the New Year', color: '#f472b6' },
  { id: 'heikru', name: 'Heikru Hidongba', mm: 'ꯍꯩꯀ꯭ꯔꯨ ꯍꯤꯗꯣꯡꯕ', month: 5, day: '11th day', color: '#38bdf8' },
  { id: 'mera', name: 'Mera Hou Chongba', mm: 'ꯃꯦꯔꯥ ꯍꯧ ꯆꯣꯡꯕ', month: 6, day: '15th day', color: '#60a5fa' },
  { id: 'ningol', name: 'Ningol Chakouba', mm: 'ꯅꯤꯉꯣꯜ ꯆꯥꯛꯀꯧꯕ', month: 7, day: '2nd day', color: '#a78bfa' },
  { id: 'imoinu', name: 'Imoinu Iratpa', mm: 'ꯏꯃꯣꯢꯅꯨ ꯏꯔꯥꯠꯄ', month: 9, day: '12th day', color: '#e2e8f0' },
  { id: 'yaosang', name: 'Yaosang', mm: 'ꯌꯥꯎꯁꯪ', month: 11, day: 'the full moon (15th day)', color: '#f87171' },
];

// Rough current month: Sajibu usually begins near the end of March.
export function currentMonthIndex(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const doy = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 864e5);
  return Math.floor((((doy - 88) % 365) + 365) % 365 / 30.44) % 12;
}

// ---------------------------------------------------------------- build

export default function build(kit) {
  const { scene, W, I, circle, rng, player, sound, bursts } = kit;
  const M = { ...frame(I), stones: [], monthNow: currentMonthIndex() };
  const { P, yawU } = M;
  const D = kit.data();
  D.found ||= [];
  D.placed ||= [];

  // Loktak-style lake with floating phumdis (circular floating vegetation)
  const lk = P(17, -6);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(8, 48).rotateX(-Math.PI / 2), waterMaterial({ deep: '#0f5a73', shallow: '#46b5c9', opacity: 0.9 }));
  lake.position.set(lk.x, 0.07, lk.y);
  scene.add(lake);
  W.lakes.push({ x: lk.x, z: lk.y, r: 7.6, depth: -0.6 });
  const phumdi = std('#5a7d2e');
  for (let i = 0; i < 8; i++) {
    const a = rng() * Math.PI * 2, r = 2.8 + rng() * 4;
    const p = mesh(new THREE.TorusGeometry(0.6 + rng() * 0.7, 0.3, 6, 18), phumdi, lk.x + Math.cos(a) * r, 0.12, lk.y + Math.sin(a) * r);
    p.rotation.x = Math.PI / 2;
    p.scale.z = 0.4;
    scene.add(p);
    const ph = rng() * 6;
    W.updaters.push((t) => (p.position.y = 0.12 + Math.sin(t * 0.8 + ph) * 0.04));
  }
  label(scene, 'Loktak-style lake', { sub: 'phumdis — floating islands of vegetation', accent: '#46b5c9', height: 0.45, x: lk.x, y: 6.6, z: lk.y });
  const sg = P(9, -17);
  scene.add(sangai(sg.x, sg.y, yawU - 1));

  // gentle hills and trees around the rim
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, r = I.r - 6 - rng() * 3;
    const x = M.C.x + Math.cos(a) * r, z = M.C.y + Math.sin(a) * r;
    const [lu, lv] = M.local(x, z);
    if (lu < -20 || Math.hypot(lu - 24, lv - 12) < 9) continue; // keep the station side and the lookout clear
    const k = rng();
    const h = mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std('#5aa85a'), x, 0, z);
    h.scale.set(4 + k * 3, 2 + k * 2.5, 4 + k * 3);
    scene.add(h);
  }
  const busy = (x, z) => {
    const [lu, lv] = M.local(x, z);
    return (lu > -13 && lu < 17 && lv > 7 && lv < 25) || Math.hypot(lu + 2, lv + 14) < 12 || Math.hypot(lu - 17, lv + 6) < 10 ||
      Math.hypot(lu + 10, lv) < 5 || (lu < -12 && Math.abs(lv) < 6) || Math.hypot(lu - 9, lv + 17) < 3 || Math.hypot(lu + 17, lv - 11) < 5 ||
      Math.hypot(lu - 24, lv - 12) < 8 || Math.hypot(lu + 22, lv + 6) < 3;
  };
  const trunk = std('#6b4a2f'), greens = ['#2f8f4e', '#3a9d55', '#4caf6a'];
  for (let i = 0, n = 0; i < 200 && n < 22; i++) {
    const a = rng() * Math.PI * 2, r = 6 + Math.sqrt(rng()) * (I.r - 9);
    const x = M.C.x + Math.cos(a) * r, z = M.C.y + Math.sin(a) * r;
    if (busy(x, z)) continue;
    const s = 0.8 + rng() * 0.6;
    scene.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6), trunk, x, 0.9 * s, z));
    scene.add(mesh(new THREE.IcosahedronGeometry(1.4 * s, 1), std(greens[n % 3]), x, 2.5 * s, z));
    circle(x, z, 0.35 * s, 5);
    n++;
  }

  buildCalendar(scene, W, M, kit);
  buildStatue(scene, W, M, kit);
  buildPoloGround(scene, W, M, kit);
  const spots = buildLanternSpots(scene, W, M, kit);

  // ------------------------------------------------------------ the lanterns
  const lanterns = LANTERNS.map((L) => {
    const s = spots[L.id];
    const obj = lanternMesh(L.color);
    obj.position.set(s.x, s.y + 0.45, s.z);
    scene.add(obj);
    bob(W, obj, { amp: 0.08, speed: 1.6, spin: 0.6 });
    const tag = label(scene, `🏮 ${L.name}`, { accent: L.color, height: 0.3, x: s.x, y: s.y + 1.35, z: s.z });
    const it = { id: `manipur:lantern:${L.id}`, label: `Pick up the ${L.name} lantern 🏮`, x: s.x, z: s.z, y: s.y, r: s.r ?? 1.4, object: obj };
    W.interactables.push(it);
    return { ...L, obj, tag, it };
  });
  const byId = Object.fromEntries(lanterns.map((l) => [l.id, l]));
  const carriedObj = new THREE.Group();
  carriedObj.position.y = 2.75;
  player.rig.root.add(carriedObj);
  let carrying = null;

  function hang(L) {
    const st = M.stones[L.month];
    const lamp = lanternMesh(L.color, 1.4);
    lamp.position.set(0, 3.75, 0.45);
    st.group.add(lamp);
    st.ring.material.emissive.set(L.color);
    st.ring.material.emissiveIntensity = 3;
  }
  function syncLanterns() {
    for (const L of lanterns) {
      const placed = D.placed.includes(L.id), held = carrying === L;
      L.obj.visible = L.tag.visible = !placed && !held;
      L.it.hidden = placed || held;
    }
    for (const s of M.stones) s.it.label = carrying ? `Hang the ${carrying.name} lantern on ${MONTHS[s.i].en} 🏮` : `Read the month ${MONTHS[s.i].en} (${MONTHS[s.i].mm})`;
    carriedObj.clear();
    if (carrying) carriedObj.add(lanternMesh(carrying.color, 0.9));
  }
  for (const id of D.placed) hang(byId[id]);
  syncLanterns();

  function pickUp(id) {
    const L = byId[id];
    if (!L || D.placed.includes(id)) return;
    if (carrying) {
      kit.toast(`You're carrying the ${carrying.name} lantern`, 'Hang it on its month stone first', '🏮');
      return;
    }
    carrying = L;
    sound.pickup?.();
    if (!D.found.includes(id)) {
      D.found.push(id);
      kit.reward(20, player.pos.clone().setY(player.pos.y + 2.4), '🏮 +20');
    }
    kit.persist();
    kit.toast(`Found: the ${L.name} lantern`, `${L.mm} · now find its month on the calendar ring`, '🏮');
    syncLanterns();
  }

  function tryHang(i) {
    const L = carrying;
    const m = MONTHS[i];
    if (L.month !== i) {
      sound.thud?.();
      kit.toast(`Not ${m.en}`, `${L.name} isn't in ${m.en}. Read the month stones: which one lists it?`, '🏮');
      return;
    }
    carrying = null;
    D.placed.push(L.id);
    kit.persist();
    hang(L);
    syncLanterns();
    sound.collect?.();
    const st = M.stones[i];
    bursts.spawn(new THREE.Vector3(st.group.position.x, 3.9, st.group.position.z), L.color, 26, 4, { up: 2.5 });
    kit.reward(40, player.pos.clone().setY(player.pos.y + 2.4), '🏮 +40');
    kit.toast(`${L.name} belongs to ${m.en}`, `${L.mm} · ${L.day} of ${m.en} (${m.mm})`, '✔');
    if (D.placed.length === LANTERNS.length) {
      kit.solve();
      kit.fireworks?.(10, 8);
      setTimeout(() => {
        if (!kit.UI.isOverlayOpen()) debrief();
      }, 4200);
    }
  }

  function debrief() {
    kit.panel({
      kicker: '🏮 The Festival Lanterns · complete', title: 'The calendar is lit!', color: I.color,
      html: `<p class="lead">You matched every festival to its month. The train home runs again.</p>
        <table class="cal"><tr><th>Festival</th><th>Month</th><th>When</th></tr>
        ${LANTERNS.map((L) => `<tr><td><span class="mm">${esc(L.mm)}</span><br>${esc(L.name)}</td><td><span class="mm">${esc(MONTHS[L.month].mm)}</span><br>${esc(MONTHS[L.month].en)}</td><td>${esc(L.day)}</td></tr>`).join('')}
        </table>
        <p class="muted">The Meitei calendar is lunar, so these festivals move against the Gregorian calendar from year to year.</p>
        <div class="callout">🎓 For the <b>Manipur Heritage</b> certificate, also walk all 12 month stones, hear the Sagol Kangjei story at the bronze rider, score 3 polo goals, and visit Thoubal on the India map back on Cloud Island.</div>`,
    });
  }

  // ------------------------------------------------------------ polo + calendar visits
  const G = M.ground, B = M.ball;
  const resetBall = () => {
    const c = P(G.cu, G.cv);
    B.pos.set(c.x, 0.22, c.y);
    B.vel.set(0, 0, 0);
  };
  let resetIn = 0; // seconds until the ball returns to the centre after a goal
  for (const s of M.stones) if (kit.state().calendar.includes(s.i) && !D.placed.some((id) => byId[id].month === s.i)) s.ring.material.emissiveIntensity = 2.2;

  function update(dt) {
    const p = player.pos;
    const st = kit.state();
    // calendar: standing in front of a month stone marks it visited
    for (const s of M.stones) {
      if (st.calendar.includes(s.i)) continue;
      if (Math.hypot(p.x - s.x, p.z - s.z) < 1.8 && p.y < 1) {
        st.calendar.push(s.i);
        if (!D.placed.some((id) => byId[id].month === s.i)) s.ring.material.emissiveIntensity = 2.2;
        const m = MONTHS[s.i];
        sound.collect();
        kit.toast(`${m.en} · ${m.mm}`, `≈ ${m.greg}${m.fest.length ? ` · ${m.fest[0][1]}` : ''}`, '🗓️');
        kit.progress('calendar', st.calendar.length);
      }
    }

    // polo ball
    if (resetIn > 0 && (resetIn -= dt) <= 0) resetBall();
    B.cool -= dt;
    B.vel.multiplyScalar(Math.exp(-0.9 * dt));
    B.pos.addScaledVector(B.vel, dt);
    const [u, v] = M.local(B.pos.x, B.pos.z);
    const lu = u - G.cu, lv = v - G.cv;
    if (Math.abs(lu) <= G.half + 2 && Math.abs(lv) > G.wid - 0.3 && Math.abs(lv) < G.wid + 1) {
      // bounce off the side boards
      const nv = Math.sign(lv);
      const back = P(u, G.cv + nv * (G.wid - 0.3));
      B.pos.x = back.x;
      B.pos.z = back.y;
      const vn = B.vel.x * M.V.x + B.vel.z * M.V.y;
      if (vn * nv > 0) {
        B.vel.x -= 1.6 * vn * M.V.x;
        B.vel.z -= 1.6 * vn * M.V.y;
        sound.thud();
      }
    }
    if (resetIn <= 0 && Math.abs(lv) < G.wid && Math.abs(lu) > G.half) {
      resetIn = 0.9;
      sound.swish();
      bursts.spawn(B.pos.clone().setY(0.6), lu > 0 ? '#ef4444' : '#3b82f6', 30, 5, { up: 3 });
      kit.reward(30, B.pos.clone().setY(1.5), '🏇 Goal! +30');
      kit.add('polo', 1);
    }
    // the pony (or a walking robot) nudges the ball
    const dx = B.pos.x - p.x, dz = B.pos.z - p.z, d = Math.hypot(dx, dz);
    const reach = player.vehicle === 'pony' ? 1.2 : 0.7;
    if (d < reach && p.y < 1.5 && B.cool <= 0) {
      const nx = dx / (d || 1), nz = dz / (d || 1);
      const along = Math.max(player.vel.x * nx + player.vel.z * nz, 1.5);
      B.vel.set(nx * along * 1.15 + player.vel.x * 0.3, 0, nz * along * 1.15 + player.vel.z * 0.3);
      B.pos.x = p.x + nx * reach;
      B.pos.z = p.z + nz * reach;
    }
    if (Math.hypot(B.pos.x - M.C.x, B.pos.z - M.C.y) > 34) resetBall();
    B.mesh.position.copy(B.pos);
    B.mesh.rotation.x += (B.vel.length() * dt) / 0.22;
  }

  // ------------------------------------------------------------ panels
  function openCalendar() {
    if (!D.calendarOpened) {
      D.calendarOpened = true;
      kit.reward(25, player.pos.clone().setY(player.pos.y + 2.4), '🗓️ +25');
    }
    kit.panel(calendarPanel(kit.state().calendar, D.placed.map((id) => byId[id].month)));
  }

  return {
    trial: true,
    title: 'The Festival Lanterns',
    mission: `<p>The wind has scattered the six festival lanterns of the Meitei year across the island. Find each one and hang it on the right month stone of the calendar ring.</p>
      <ol><li>Explore: the lanterns hide high up, so climb and jump.</li>
      <li>Read the month stones: each one lists its festivals in Meitei Mayek and English.</li>
      <li>Hang every lantern on its month to light the calendar.</li></ol>
      <p class="muted">Also here: the story of Sagol Kangjei at the bronze rider, and pony polo on the ground.</p>`,
    hints: [
      'Every month stone shows its festivals on its face. Read the stones, or open the full calendar at the moon in the middle of the ring.',
      'Lanterns hide by the station path, on the bronze statue’s pedestal, in the watch-hut on the lake, on the stable roof, on the lookout rocks and beside the moon (step onto its dais).',
      'Sajibu Cheiraoba → Sajibu · Heikru Hidongba → Langban · Mera Hou Chongba → Mera · Ningol Chakouba → Hiyangei · Imoinu Iratpa → Wakching · Yaosang → Lamta.',
    ],
    quest() {
      const st = kit.state();
      const done = (id) => st.done.includes(id);
      return [
        ...(carrying ? [{ text: `🏮 Carrying ${carrying.name}: find its month stone`, done: false }] : []),
        { text: 'Find the 6 festival lanterns', n: D.found.length, of: 6, done: D.found.length === 6 },
        { text: 'Hang each one on its month stone', n: D.placed.length, of: 6, done: D.placed.length === 6 },
        { text: '🎓 Walk all 12 month stones', n: st.calendar.length, of: 12, done: done('calendar') },
        { text: '🎓 Hear the Sagol Kangjei story', done: done('polo-story') },
        { text: '🎓 Score 3 polo goals', n: Math.min(3, st.tasks.polo || 0), of: 3, done: done('polo') },
        { text: '🎓 Visit Thoubal (India map, Cloud Island)', done: done('hometown') },
      ];
    },
    update,
    interact(id) {
      const [, kind, arg] = id.split(':');
      if (kind === 'calendar') return openCalendar(), true;
      if (kind === 'lantern') return pickUp(arg), true;
      if (kind === 'month') {
        const i = +arg, s = M.stones[i];
        // with a lantern in hand and standing at the stone, E hangs it; otherwise read the month
        if (carrying && Math.hypot(player.pos.x - s.x, player.pos.z - s.z) < 2.6) tryHang(i);
        else kit.panel(monthPanel(i, D.placed.map((x) => byId[x].month)));
        return true;
      }
      return false;
    },
    // Space on the pony: swing the mallet; hits the ball if it's close
    vehicleAction() {
      if (player.vehicle !== 'pony') return;
      player.swing();
      sound.whoosh();
      const p = player.pos;
      if (Math.hypot(B.pos.x - p.x, B.pos.z - p.z) < 2.8) {
        B.vel.set(Math.sin(player.yaw) * 17, 0, Math.cos(player.yaw) * 17);
        B.cool = 0.35;
        setTimeout(() => sound.thud(), 120);
        bursts.spawn(B.pos.clone().setY(0.4), '#fde68a', 10, 3, { up: 1.5, glow: 1.4 });
      }
    },
    // for tests and the debug console
    debug: { lanterns, spots, M, place: (id) => { carrying = byId[id]; tryHang(byId[id].month); } },
  };
}

// ---------------------------------------------------------------- scenery helpers

function sangai(x, z, yaw) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const fur = std('#8b5a2b'), dark = std('#3f2a1a');
  g.add(mesh(new THREE.CapsuleGeometry(0.42, 1.1, 4, 8), fur, 0, 1.25, 0).rotateZ(Math.PI / 2));
  for (const [lx, lz] of [[0.5, 0.2], [0.5, -0.2], [-0.5, 0.2], [-0.5, -0.2]]) g.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 1, 6), dark, lx, 0.5, lz));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.7, 6), fur, 0.85, 1.65, 0).rotateZ(-0.6));
  const head = mesh(new THREE.ConeGeometry(0.2, 0.6, 6), fur, 1.25, 1.95, 0);
  head.rotation.z = -Math.PI / 2;
  g.add(head);
  // the brow-tines curve forward over the eyes — the Sangai's signature antlers
  for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.35, 0.03, 4, 12, Math.PI * 1.1), dark, 1.05, 2.3, s * 0.15).rotateY(Math.PI / 2));
  const lbl = makeLabel('Sangai', { sub: 'brow-antlered deer of Manipur', accent: '#fbbf24', height: 0.4 });
  lbl.position.y = 3.2;
  g.add(lbl);
  return g;
}

// a paper lantern: glowing body, dark caps
function lanternMesh(color, s = 1) {
  const g = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(color), emissiveIntensity: 1.9, roughness: 0.6 });
  const cap = std('#3f2a1a');
  const bulb = mesh(new THREE.SphereGeometry(0.28, 14, 10), glow, 0, 0, 0, false);
  bulb.scale.set(1, 0.85, 1);
  g.add(bulb);
  for (const y of [-0.23, 0.23]) g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 10), cap, 0, y, 0, false));
  g.add(mesh(new THREE.TorusGeometry(0.08, 0.015, 4, 10), cap, 0, 0.3, 0, false));
  g.scale.setScalar(s);
  return g;
}

// ---------------------------------------------------------------- the calendar ring

function monthTexture(m, i) {
  return drawCanvas(512, 768, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1f2937');
    g.addColorStop(1, '#0f172a');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = m.season;
    c.fillRect(0, 0, w, 18);
    c.textAlign = 'center';
    c.fillStyle = '#94a3b8';
    c.font = `600 30px ${MONO}`;
    c.fillText(`${i + 1} / 12`, w / 2, 76);
    c.fillStyle = '#fde68a';
    c.font = `700 ${m.mm.length > 5 ? 96 : 118}px ${MM_FONT}, ${FONT}`;
    c.fillText(m.mm, w / 2, 250);
    c.fillStyle = '#f8fafc';
    c.font = `700 64px ${FONT}`;
    c.fillText(m.en, w / 2, 360);
    c.fillStyle = m.season;
    c.font = `600 38px ${MONO}`;
    c.fillText(`≈ ${m.greg}`, w / 2, 430);
    let y = 520;
    for (const [mm, en] of m.fest) {
      c.font = `700 34px ${MM_FONT}, ${FONT}`;
      c.fillStyle = '#fbbf24';
      c.fillText(mm, w / 2, y);
      c.font = `500 25px ${FONT}`;
      c.fillStyle = '#cbd5e1';
      c.fillText(en.length > 34 ? `${en.slice(0, 33)}…` : en, w / 2, y + 36);
      y += 86;
      if (y > 720) break;
    }
  });
}

function buildCalendar(scene, W, M, kit) {
  const c = M.P(-2, -14);
  const R = 8.5;
  const plaza = mesh(new THREE.CircleGeometry(R + 2.2, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d6cdb8', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), c.x, 0.035, c.y, false);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const stoneMat = std('#78716c');
  MONTHS.forEach((m, i) => {
    // Sajibu (the new year) at the top of the ring, months running clockwise
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const dir = new THREE.Vector2(Math.cos(a) * M.U.x + Math.sin(a) * M.V.x, Math.cos(a) * M.U.y + Math.sin(a) * M.V.y);
    const p = new THREE.Vector2(c.x + dir.x * R, c.y + dir.y * R);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.y);
    g.rotation.y = Math.atan2(-dir.x, -dir.y); // face the moon dais
    const face = new THREE.MeshBasicMaterial({ map: monthTexture(m, i), toneMapped: false });
    g.add(mesh(new THREE.BoxGeometry(2.1, 3.15, 0.45), [stoneMat, stoneMat, stoneMat, stoneMat, face, face], 0, 1.75, 0)); // readable from both sides
    g.add(mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.2, 8), std('#57534e'), 0, 0.1, 0));
    // a hook on top for a festival lantern
    g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 0.6), std('#3f2a1a'), 0, 3.4, 0.25));
    const ring = mesh(new THREE.TorusGeometry(0.95, 0.05, 6, 28), new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color(m.season), emissiveIntensity: 0.25 }), 0, 0.22, 0.7, false);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    if (i === M.monthNow) {
      const now = makeLabel('Now (approx.)', { accent: '#fde68a', height: 0.38 });
      now.position.y = 4.6;
      g.add(now);
    }
    scene.add(g);
    kit.circle(p.x, p.y, 1.05, 4);
    const front = new THREE.Vector2(p.x - dir.x * 1.6, p.y - dir.y * 1.6);
    const it = { id: `manipur:month:${i}`, zone: 'manipur', label: '', x: front.x, z: front.y, y: 0, r: 1.6, object: g };
    W.interactables.push(it);
    M.stones.push({ i, x: front.x, z: front.y, ring, group: g, it });
  });

  // the moon dais: step up onto it; a moon cycles through its phases above (Meitei months follow the moon)
  scene.add(mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.7, 14), std('#a8a29e'), c.x, 0.35, c.y));
  W.platforms.push({ x: c.x, z: c.y, r: 2.2, top: 0.7 });
  const phase = { value: new THREE.Vector3(1, 0, 0) };
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.ShaderMaterial({
    uniforms: { sunDir: phase },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 sunDir; varying vec3 vN;
      void main(){ float l = smoothstep(-0.08, 0.08, dot(vN, sunDir));
        vec3 c = mix(vec3(0.08, 0.09, 0.14), vec3(1.6, 1.5, 1.2), l);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  moon.position.set(c.x, 2.4, c.y);
  scene.add(moon);
  W.colliders.push({ type: 'circle', x: c.x, z: c.y, r: 0.75, top: 3.4, bottom: 1.4 });
  W.updaters.push((t) => {
    const a = t * 0.35;
    phase.value.set(Math.sin(a), 0.15, Math.cos(a)).normalize();
    moon.rotation.y = M.yawU;
    moon.position.y = 2.4 + Math.sin(t * 0.9) * 0.1;
  });
  const title = drawCanvas(1024, 256, (g, w, h) => {
    g.fillStyle = 'rgba(7,11,26,0.82)';
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, 36);
    g.fill();
    g.strokeStyle = '#fb923c';
    g.lineWidth = 5;
    g.stroke();
    g.textAlign = 'center';
    g.fillStyle = '#fde68a';
    g.font = `700 84px ${MM_FONT}, ${FONT}`;
    g.fillText(CAL_TITLE, w / 2, 112);
    g.fillStyle = '#f8fafc';
    g.font = `600 44px ${FONT}`;
    g.fillText('Meitei Thapanlon · the Meitei calendar', w / 2, 196);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: title, transparent: true, depthWrite: false }));
  sp.scale.set(5.6, 1.4, 1);
  sp.position.set(c.x, 5.6, c.y);
  scene.add(sp);
  const dz = M.P(-2, -14 + 3.2);
  W.interactables.push({ id: 'manipur:calendar', zone: 'manipur', label: 'Open the Meitei calendar 🗓️', x: dz.x, z: dz.y, y: 0, r: 2.4, object: moon });
}

// ---------------------------------------------------------------- the statue (now climbable)

function buildStatue(scene, W, M, kit) {
  const s = M.P(-10, 0);
  const bronze = new THREE.MeshStandardMaterial({ color: '#a8743f', metalness: 0.75, roughness: 0.35 });
  const stone = std('#cbd5e1');
  const g = new THREE.Group();
  g.position.set(s.x, 0, s.y);
  g.rotation.y = M.yawU + Math.PI / 2; // side-on to arriving visitors
  scene.add(g);
  // a two-tier pedestal you can climb
  pillar(scene, W, { x: s.x, z: s.y, r: 3.2, top: 1.0, mat: stone, sides: 10 });
  pillar(scene, W, { x: s.x, z: s.y, r: 2.1, top: 2.2, mat: stone, sides: 10 });
  const pony = buildPony({ material: bronze });
  pony.group.scale.setScalar(1.9);
  pony.group.position.y = 2.2;
  pony.legs.forEach((l, i) => (l.rotation.x = [0.5, -0.3, -0.4, 0.3][i]));
  g.add(pony.group);
  const rider = new THREE.Group();
  rider.position.set(0, 2.2 + 1.9 * 1.7, -0.1);
  rider.add(mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), bronze, 0, 0.7, 0));
  rider.add(mesh(new THREE.SphereGeometry(0.28, 12, 10), bronze, 0, 1.55, 0.05));
  rider.add(mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.18, 10), bronze, 0, 1.78, 0.05)); // turban
  const arm = new THREE.Group();
  arm.position.set(0.35, 1.1, 0);
  arm.rotation.z = -2.5;
  arm.add(mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 6), bronze, 0, -0.35, 0));
  arm.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.4, 6), bronze, 0, -1.6, 0));
  arm.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), bronze, 0, -2.8, 0.1));
  rider.add(arm);
  for (const sx of [-1, 1]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.1, 0.6, 4, 6), bronze, sx * 0.42, 0.15, 0.1);
    leg.rotation.z = sx * 0.5;
    rider.add(leg);
  }
  g.add(rider);
  // the horse stands along the island's V axis
  for (const k of [-1.2, 1.2]) {
    const q = M.P(-10, k);
    W.colliders.push({ type: 'circle', x: q.x, z: q.y, r: 0.9, top: 12, bottom: -99 });
  }
  label(scene, 'Sagol Kangjei', { sub: 'the story of Manipuri polo — press E', accent: '#fb923c', height: 0.6, x: s.x, y: 11.5, z: s.y });
  const f = M.P(-14, 0);
  W.interactables.push({ id: 'learn:polo', zone: 'manipur', label: 'Hear the story of Sagol Kangjei 📜', x: f.x, z: f.y, y: 0, r: 2.2, object: g });
}

// ---------------------------------------------------------------- climbing spots for the lanterns

function buildLanternSpots(scene, W, M, kit) {
  const { P } = M;
  const stone = std('#a8a29e'), wood = std('#7c4a2d'), hay = std('#e3c35a'), thatch = std('#b08d57');
  const spots = {};

  // 1 · by the station path: a low stone (a gentle start)
  const a1 = P(-22, -6);
  pillar(scene, W, { x: a1.x, z: a1.y, r: 0.9, top: 0.6, mat: stone, sides: 7 });
  spots.sajibu = { x: a1.x, z: a1.y, y: 0.6 };

  // 2 · on the bronze statue's upper pedestal (jump onto each tier)
  const a2 = P(-11.65, 0);
  spots.heikru = { x: a2.x, z: a2.y, y: 2.2, r: 1.2 };

  // 3 · the watch-hut on stilts in the lake: hop across the posts
  const hut = P(17, -6);
  [[10.6, 0.6], [12.7, 1.4], [14.7, 2.2]].forEach(([u, top]) => {
    const q = P(u, -6);
    pillar(scene, W, { x: q.x, z: q.y, r: 0.85, top, mat: wood, sides: 8 });
  });
  scene.add(mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.25, 12), wood, hut.x, 2.9, hut.y));
  W.platforms.push({ x: hut.x, z: hut.y, r: 1.9, top: 3.0 });
  W.colliders.push({ type: 'circle', x: hut.x, z: hut.y, r: 1.35, top: 2.95, bottom: 2.5 });
  for (const [du, dv] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
    const q = P(17 + du, -6 + dv);
    scene.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, 6.2, 6), wood, q.x, 2.5, q.y));
  }
  const roof = mesh(new THREE.ConeGeometry(2.6, 1.4, 8), thatch, hut.x, 6.2, hut.y);
  scene.add(roof);
  spots.mera = { x: hut.x, z: hut.y, y: 3.0 };

  // 4 · the stable roof, up two hay bales
  for (const [u, v, top] of [[-19.4, 12.6, 0.9], [-18.4, 11, 1.8]]) {
    const q = P(u, v);
    pillar(scene, W, { x: q.x, z: q.y, r: 0.85, top, mat: hay, sides: 8 });
  }
  const st = P(-16, 10);
  W.platforms.push({ x: st.x, z: st.y, r: 1.55, top: 2.9 });
  spots.ningol = { x: st.x, z: st.y, y: 2.9 };

  // 5 · the lookout rocks: climb the stepping stones to the cairn
  const hill = P(24, 12);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7, r = 1.6 + (i % 3) * 0.5;
    const q = P(24 + Math.cos(a) * r, 12 + Math.sin(a) * r);
    const rock = mesh(new THREE.DodecahedronGeometry(0.45 + (i % 3) * 0.15, 0), std('#8b8178'), q.x, 0.2, q.y);
    rock.rotation.set(i, i * 2, 0);
    scene.add(rock);
  }
  for (let i = 0; i < 4; i++) {
    const a = 2.4 + i * 1.05;
    const q = P(24 + Math.cos(a) * 4.6, 12 + Math.sin(a) * 4.6);
    pillar(scene, W, { x: q.x, z: q.y, r: 0.85, top: 0.85 * (i + 1), mat: stone, sides: 7 });
  }
  pillar(scene, W, { x: hill.x, z: hill.y, r: 1.4, top: 4.25, mat: stone, sides: 8 });
  spots.imoinu = { x: hill.x, z: hill.y, y: 4.25 };
  label(scene, 'Lookout rocks', { sub: 'climb the stones', accent: '#4ade80', height: 0.35, x: hill.x, y: 7.2, z: hill.y });

  // 6 · Yaosang, the full-moon festival: step onto the moon dais, just under the moon
  const moon = P(-2, -14 + 1.6);
  spots.yaosang = { x: moon.x, z: moon.y, y: 2.6, r: 1.3 }; // out of reach from the ground
  return spots;
}

// ---------------------------------------------------------------- the polo ground

function buildPoloGround(scene, W, M, kit) {
  const { P, yawU } = M;
  // a goal is scored when the ball crosses an end line — there are no goal posts
  const G = { cu: 2, cv: 16, half: 13, wid: 6.5 };
  M.ground = G;
  const c = P(G.cu, G.cv);
  const grass = mesh(new THREE.PlaneGeometry(G.wid * 2, G.half * 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8fd48a', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }), c.x, 0.03, c.y, false);
  grass.rotation.y = yawU;
  grass.receiveShadow = true;
  scene.add(grass);
  const white = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  for (const end of [-1, 1]) {
    const e = P(G.cu + end * G.half, G.cv);
    const line = mesh(new THREE.PlaneGeometry(G.wid * 2, 0.25).rotateX(-Math.PI / 2), white, e.x, 0.05, e.y, false);
    line.rotation.y = yawU;
    scene.add(line);
    const flagM = new THREE.MeshStandardMaterial({ color: end < 0 ? '#2563eb' : '#dc2626', side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const f = P(G.cu + end * G.half, G.cv + side * (G.wid + 0.6));
      scene.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), std('#e5e7eb'), f.x, 0.8, f.y));
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), flagM);
      fl.position.set(f.x, 1.4, f.y);
      scene.add(fl);
    }
  }
  scene.add(mesh(new THREE.RingGeometry(1.4, 1.6, 32).rotateX(-Math.PI / 2), white, c.x, 0.05, c.y, false));
  // low side boards keep the ball in play (the ends stay open)
  const board = std('#92400e');
  for (const side of [-1, 1]) {
    const a = P(G.cu - G.half, G.cv + side * G.wid), b = P(G.cu + G.half, G.cv + side * G.wid);
    const bd = mesh(new THREE.BoxGeometry(0.15, 0.45, a.distanceTo(b)), board, (a.x + b.x) / 2, 0.22, (a.y + b.y) / 2);
    bd.rotation.y = yawU;
    scene.add(bd);
  }
  label(scene, 'Sagol Kangjei ground', { sub: 'ride the pony · Space swings the mallet', accent: '#fb923c', height: 0.55, x: c.x, y: 4.6, z: c.y });

  // the stable and its pony
  const st = P(-16, 10);
  const roof = mesh(new THREE.BoxGeometry(3.4, 0.2, 3), std('#7c2d12'), st.x, 2.8, st.y);
  roof.rotation.y = yawU;
  scene.add(roof);
  for (const [du, dv] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) {
    const q = P(-16 + du, 10 + dv);
    scene.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6), std('#78350f'), q.x, 1.4, q.y));
  }
  const pony = buildPony();
  pony.group.position.set(st.x, 0, st.y);
  pony.group.rotation.y = yawU;
  scene.add(pony.group);
  const it = { id: 'ride:pony', label: 'Ride the Manipuri pony 🐎', x: st.x, z: st.y, y: 0, r: 2.2, object: pony.group };
  W.interactables.push(it);
  kit.registerVehicle('pony', pony.group, it);
  label(scene, 'Manipuri pony', { sub: 'sagol · 11–13 hands', accent: '#fbbf24', height: 0.4, x: st.x, y: 4.4, z: st.y });

  // the ball: bamboo-root, about 10 cm (scaled up so it's easy to see)
  const ball = mesh(new THREE.SphereGeometry(0.22, 14, 10), std('#f5f0e1'), c.x, 0.22, c.y);
  scene.add(ball);
  M.ball = { mesh: ball, pos: new THREE.Vector3(c.x, 0.22, c.y), vel: new THREE.Vector3(), cool: 0 };
}

// ---------------------------------------------------------------- panels

const mm = (t) => `<span class="mm">${esc(t)}</span>`;

export function monthPanel(i, litMonths = []) {
  const m = MONTHS[i];
  return {
    kicker: `Meitei calendar · month ${i + 1} of 12`, title: `${m.en}`, color: m.season,
    html: `<p class="mm-big">${mm(m.mm)}</p>
      <p class="lead">${esc(m.en)} — roughly <b>${esc(m.greg)}</b>.${litMonths.includes(i) ? ' 🏮 Its lantern is hung.' : ''}</p>
      ${m.fest.length ? `<h3>Festivals and important days</h3><ul class="fest">${m.fest.map(([a, b]) => `<li>${mm(a)}<span>${esc(b)}</span></li>`).join('')}</ul>` : '<p class="muted">No major festival is listed for this month in our source.</p>'}
      <p class="muted">The Meitei calendar is lunar, so the Gregorian dates of its months shift from year to year.</p>
      <div class="pager">
        <button class="btn small" data-open="manipur:month:${(i + 11) % 12}">← ${esc(MONTHS[(i + 11) % 12].en)}</button>
        <button class="btn small" data-open="manipur:calendar">All months</button>
        <button class="btn small" data-open="manipur:month:${(i + 1) % 12}">${esc(MONTHS[(i + 1) % 12].en)} →</button>
      </div>`,
  };
}

export function calendarPanel(visited, litMonths = []) {
  const now = currentMonthIndex();
  return {
    kicker: 'Manipur Island', title: 'The Meitei calendar', color: '#fb923c',
    html: `<p class="mm-big">${mm(CAL_TITLE)}</p>
      <p class="lead">Meitei Thapanlon — the lunar calendar of the Meitei people of Manipur, used for religious, agricultural and cultural life. Its new year, <b>Sajibu Cheiraoba</b>, falls on the 1st day of Sajibu.</p>
      <p class="muted">Walk around the ring and stand in front of each month stone — ${visited.length}/12 visited · 🏮 ${litMonths.length}/6 lanterns hung.</p>
      <table class="cal">
        <tr><th>#</th><th>Meitei Mayek</th><th>Month</th><th>≈ Gregorian</th></tr>
        ${MONTHS.map((m, i) => `<tr class="${i === now ? 'now' : ''} ${visited.includes(i) ? 'seen' : ''}"><td>${i + 1}</td><td>${mm(m.mm)}</td><td><button class="linkish" data-open="manipur:month:${i}">${esc(m.en)}</button>${i === now ? ' <small>now</small>' : ''}${litMonths.includes(i) ? ' 🏮' : ''}</td><td>${esc(m.greg)}</td></tr>`).join('')}
      </table>
      <h3>Days of the week</h3>
      <table class="cal days">${DAYS.map(([a, b, c]) => `<tr><td>${mm(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</table>
      <p class="muted">Month and day names in Meitei Mayek follow Wikipedia’s “Meitei calendar” article. Gregorian spans are approximate.</p>`,
  };
}
