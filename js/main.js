import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld, ZONES, SPAWN, SKY_ISLAND, ISLAND_R } from './world.js';
import { Player } from './player.js';
import { Sound } from './audio.js';
import { SKILLS, TASKS } from './data.js';
import { createActivities } from './activities.js';
import { dampAngle, makeLabel } from './utils.js';
import { ARENA } from './arena.js';
import { ISLANDS, checkRiddle, RIDDLE_TEXT } from './archipelago.js';
import { createIslandManager } from './islands/manager.js';
import { createDog } from './dog.js';
import { CERTS, GRAND_NEEDS, checkCerts, certById, certCode, certPostText, linkedInAddURL, verifyURL, certsPanelHTML } from './certs.js';
import { esc } from './utils.js';
import * as UI from './ui.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#scene');
const isTouch = matchMedia('(pointer: coarse)').matches;

// ------------------------------------------------------------------ persistence
const SAVE_KEY = 'cloud-island-progress-v1';
const SETTINGS_KEY = 'cloud-island-settings-v1';
const freshState = () => ({ xp: 0, visited: [], orbs: [], opened: [], achievements: [], tasks: {}, done: [], gems: [], puzzles: [], islands: [], riddles: [], certs: [], calendar: [], goldFound: [], goldSpent: 0, crafted: [] });
function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ? { ...fallback, ...v } : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — progress just won't persist */
  }
}
let state = load(SAVE_KEY, freshState());
const settings = load(SETTINGS_KEY, { quality: isTouch ? 'low' : 'high', muted: false, explorer: '' });
const persist = () => save(SAVE_KEY, state);

const ACHIEVEMENTS = {
  explorer: ['Explorer', 'Discovered every zone', '🧭'],
  collector: ['Full-Stack Mind', 'Collected every Skill Orb', '🌳'],
  sky: ['Head in the Clouds', 'Reached the floating sky island', '☁️'],
  diver: ['Cloud Diver', 'Took a dive off the island edge', '🪂'],
  chaos: ['Chaos Engineer', 'Knocked a service crate offline', '💥'],
  champion: ['Island Champion', 'Completed every challenge', '🏆'],
  cubemaster: ['Speedcuber', 'Solved a full 20-move scramble', '🧊'],
};
const TOTALS = { zones: ZONES.length, orbs: SKILLS.length, achievements: Object.keys(ACHIEVEMENTS).length, tasks: TASKS.length, islands: ISLANDS.length };

// ------------------------------------------------------------------ renderer
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  console.error(err);
  noWebGL();
  throw err;
}
renderer.shadowMap.enabled = true;
renderer.info.autoReset = false; // count every pass of a frame (shown in the Three.js lesson)
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1400);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function applyQuality() {
  const high = settings.quality === 'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : 1.25));
  bloom.enabled = high;
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  $('#btn-quality').textContent = high ? 'HQ' : 'LQ';
  $('#btn-quality').setAttribute('aria-label', `Graphics quality: ${high ? 'high' : 'low'} (click to toggle)`);
}

// ------------------------------------------------------------------ world
// 3D signs are drawn on canvases, so wait (briefly) for the web fonts first.
try {
  await Promise.race([
    Promise.all([
      document.fonts.load("700 64px 'Space Grotesk'"),
      document.fonts.load("500 36px 'Space Grotesk'"),
      document.fonts.load("500 32px 'JetBrains Mono'"),
      document.fonts.load("700 44px 'JetBrains Mono'"),
      document.fonts.load("700 64px 'Noto Sans Meetei Mayek'", 'ꯁꯖꯤꯕꯨ'),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
} catch {
  /* fall back to system fonts */
}
const W = buildWorld(scene, { quality: settings.quality });
const player = new Player(scene);
player.place(SPAWN.x, 0, SPAWN.z, Math.PI);
const sound = new Sound();
sound.muted = settings.muted;

// particles
const bursts = (() => {
  const items = [];
  const geo = new THREE.IcosahedronGeometry(0.12, 0);
  for (let i = 0; i < 120; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    m.visible = false;
    scene.add(m);
    items.push({ m, v: new THREE.Vector3(), life: 0, max: 1, size: 1 });
  }
  let next = 0;
  return {
    spawn(pos, color, count = 12, speed = 4, { up = 2, size = 1, life = 0.7, glow = 2 } = {}) {
      for (let k = 0; k < count; k++) {
        const it = items[next++ % items.length];
        it.m.position.copy(pos);
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.4 + Math.random() * 0.6);
        it.v.set(Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s);
        it.life = it.max = life * (0.6 + Math.random() * 0.6);
        it.size = size * (0.6 + Math.random() * 0.8);
        it.m.material.color.set(color).multiplyScalar(glow);
        it.m.visible = true;
      }
    },
    update(dt) {
      for (const it of items) {
        if (!it.m.visible) continue;
        it.life -= dt;
        if (it.life <= 0) {
          it.m.visible = false;
          continue;
        }
        it.v.y -= 5 * dt;
        it.v.multiplyScalar(Math.exp(-2 * dt));
        it.m.position.addScaledVector(it.v, dt);
        const k = it.life / it.max;
        it.m.material.opacity = k;
        it.m.scale.setScalar(it.size * (0.4 + k * 0.6));
      }
    },
  };
})();

// ------------------------------------------------------------------ challenges & rewards
function floatAt(pos, text, color = '#fde68a') {
  const v = pos.clone().project(camera);
  const onScreen = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
  const x = onScreen ? ((v.x + 1) / 2) * innerWidth : innerWidth / 2;
  const y = onScreen ? ((1 - v.y) / 2) * innerHeight : innerHeight * 0.4;
  UI.floatText(text, x, y, color);
}
function reward(pts, pos, text) {
  grantXP(pts);
  floatAt(pos, text);
}
function fireworks(count = 5, height = 6) {
  const cols = ['#fbbf24', '#f472b6', '#5eead4', '#a78bfa', '#fb923c', '#60a5fa'];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4;
      const at = player.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, height + Math.random() * 3, Math.sin(a) * r));
      bursts.spawn(at, cols[i % cols.length], 26, 7, { up: 1, life: 1.1, size: 1.3 });
      sound.pop();
    }, i * 260);
  }
}
const A = createActivities({
  scene, W, player, sound, bursts, camera,
  state: () => state,
  circle: W.circle,
  toast: (title, sub, icon) => UI.toast(title, sub, 'info', icon),
  hint: (text) => UI.hint(text),
  meter: (m) => UI.meter(m),
  reward,
  onProgress: () => {
    persist();
    UI.updateHUD(state, TOTALS);
  },
  onComplete: (task) => {
    sound.fanfare();
    UI.celebrate({ ...task, who: settings.explorer });
    fireworks(6);
    grantXP(task.pts);
    floatAt(player.pos.clone().setY(player.pos.y + 2.4), `${task.icon} +${task.pts}`, '#5eead4');
    if (state.done.length === TASKS.length) {
      setTimeout(() => {
        UI.celebrate({ icon: '🏆', title: 'Every challenge complete — you are an Island Champion!', pts: 0, big: true, who: settings.explorer });
        fireworks(14, 9);
        achieve('champion');
      }, 2800);
    }
  },
});

// Buddy the dog and the Golden Workshop
const dog = createDog({
  scene, W, player, sound, bursts, reward,
  state: () => state,
  toast: (title, sub, icon) => UI.toast(title, sub, 'info', icon),
  progress: (id, v) => A.progress(id, v),
  riding: () => !!ride,
});

// The outer islands: each adventure loads on demand and seals the way home until its trial is solved
const islands = createIslandManager({
  scene, W, player, sound, bursts, UI, reward, fireworks,
  state: () => state,
  persist,
  level: () => UI.levelOf(state.xp),
  riding: () => !!ride,
  progress: (id, v) => A.progress(id, v),
  add: (id, n = 1) => A.progress(id, (state.tasks[id] || 0) + n),
  toast: (title, sub, icon) => UI.toast(title, sub, 'info', icon),
  registerVehicle: (kind, group, it) => A.registerVehicle(kind, group, it),
  certTitle: (id) => CERTS.find((c) => c.id === id)?.title || '',
  panel: (o) => {
    lessons.onClose();
    puzzles.close();
    UI.showRawPanel(o);
    sound.open();
  },
});

// ------------------------------------------------------------------ explorer name
const cleanName = (v) => String(v || '').replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
let nameTag = null;
function setExplorer(name) {
  settings.explorer = cleanName(name);
  save(SETTINGS_KEY, settings);
  W.explorerName = settings.explorer;
  UI.setExplorer(settings.explorer);
  if (nameTag) {
    player.rig.root.remove(nameTag);
    nameTag.material.map.dispose();
    nameTag.material.dispose();
  }
  nameTag = makeLabel(settings.explorer || 'Guest', { accent: '#5eead4', height: 0.3 });
  nameTag.position.y = 3.0;
  player.rig.root.add(nameTag);
}
W.playerPos = player.pos;
W.onAgentCollect = (pos) => bursts.spawn(pos, '#22d3ee', 12, 2.5, { up: 1.5 });

// ------------------------------------------------------------------ live world switches (Three.js lesson)
let timeScale = 1;
let fps = 60;
let objectCount = 0;
const worldFx = (() => {
  const fog = scene.fog;
  const st = { wire: false, sun: true, fog: true, bloom: true, slow: false };
  const apply = {
    wire: (on) => scene.traverse((o) => {
      if (!o.material || o.isSprite || o.isPoints || o.isLine || o === W.sky) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!('wireframe' in m)) continue;
        if (m.userData.baseWire === undefined) m.userData.baseWire = m.wireframe;
        m.wireframe = on || m.userData.baseWire;
      }
      // the bloom blur turns the frame black in wireframe mode, so pause it meanwhile
      bloom.enabled = !on && st.bloom && settings.quality === 'high';
    }),
    sun: (on) => (W.sun.visible = on),
    fog: (on) => (scene.fog = on ? fog : null),
    bloom: (on) => (bloom.enabled = on && !st.wire && settings.quality === 'high'),
    slow: (on) => (timeScale = on ? 0.2 : 1),
  };
  const DEFAULTS = { wire: false, sun: true, fog: true, bloom: true, slow: false };
  return {
    get: (k) => st[k],
    toggle(k) {
      st[k] = !st[k];
      apply[k](st[k]);
      return st[k];
    },
    resetAll() {
      for (const k of Object.keys(st)) if (st[k] !== DEFAULTS[k]) { st[k] = DEFAULTS[k]; apply[k](st[k]); }
    },
    stats() {
      if (!objectCount) scene.traverse(() => objectCount++);
      return { objects: objectCount, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, fps: Math.round(fps) };
    },
  };
})();

// The lessons and the Brain Arena puzzles load the first time you open one,
// so the page starts with only what the world needs.
let lessonsMod = null, puzzlesMod = null, shareMod = null;
const lessons = {
  has: (id) => id.startsWith('learn:'),
  async open(id) {
    lessonsMod ||= (await import('./lessons.js')).createLessons({
      UI,
      explorer: () => settings.explorer,
      isDone: (id) => state.done.includes(id),
      complete: (id) => A.progress(id, 1),
      sound: (n) => sound[n]?.(),
      agent: () => W.agent,
      world: worldFx,
    });
    lessonsMod.open(id);
  },
  onClose: () => lessonsMod?.onClose(),
  handleClick: (target) => lessonsMod?.handleClick(target) || false,
};
const puzzles = {
  async open(cat) {
    puzzlesMod ||= (await import('./puzzles.js')).createPuzzles({
      UI,
      state: () => state,
      sound: (n) => sound[n]?.(),
      solved: (p, count) => {
        sound.collect();
        reward(p.pts, player.pos.clone().setY(player.pos.y + 2.4), `🧠 +${p.pts}`);
        UI.toast(`Puzzle solved: ${p.title}`, p.explain, 'achieve', p.cat === 'math' ? '➗' : '💻');
        A.progress(p.cat === 'math' ? 'puzzle-math' : 'puzzle-code', count);
        persist();
      },
    });
    puzzlesMod.open(cat);
  },
  close: () => puzzlesMod?.close(),
  handleClick: (target) => puzzlesMod?.handleClick(target) || false,
  handleSubmit: (target) => puzzlesMod?.handleSubmit(target) || false,
};
// the share sheet (certificates and snapshots) also loads on first use
const loadShare = async () => (shareMod ||= await import('./share.js'));

// ------------------------------------------------------------------ flying Rubik's cube mode
let cubeMode = false;
let savedCam = null;
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function enterCube() {
  if (player.vehicle) A.action(); // hop off the bike first
  cubeMode = true;
  W.cube.focus(true);
  savedCam = { camDist, camPitch, questsCollapsed: $('#quests').classList.contains('collapsed') };
  camDist = 10.5;
  camPitch = 0.55; // high enough to see the top face too
  $('#quests').classList.add('collapsed'); // keep the cube clear of the HUD
  camYaw = Math.atan2(-ARENA.x, -ARENA.z); // look at the face turned toward the island (F)
  $('#cube-ui').classList.remove('hidden');
  $('#hud').classList.add('cube-mode');
  UI.setPrompt(null);
  shownPrompt = null;
  UI.toast("Rubik's Cube mode", 'U D L R F B turn a face (Shift = reverse) · drag to look · Esc to exit', 'info', '🧊');
}
function exitCube() {
  cubeMode = false;
  W.cube.focus(false);
  if (savedCam) {
    ({ camDist, camPitch } = savedCam);
    $('#quests').classList.toggle('collapsed', savedCam.questsCollapsed);
  }
  $('#cube-ui').classList.add('hidden');
  $('#hud').classList.remove('cube-mode');
}
function cubeAction(a) {
  if (a === 'exit') return exitCube();
  if (a === 'easy') W.cube.scramble(3);
  else if (a === 'full') W.cube.scramble(20);
  else if (a === 'undo') W.cube.undo();
  else if (a === 'reset') W.cube.reset();
  else W.cube.move(a);
  sound.click();
}
W.cube.onSolved = ({ moves, time, scrambleLen }) => {
  sound.fanfare();
  fireworks(8, 4);
  UI.toast(`Cube solved in ${moves} moves · ${fmtTime(time)}`, scrambleLen >= 20 ? 'A full scramble — impressive!' : 'Try a full 20-move scramble next 😉', 'achieve', '🧊');
  if (!state.done.includes('rubik')) A.progress('rubik', 1);
  else reward(50, W.cube.center.clone(), '🧊 +50');
  if (scrambleLen >= 20) achieve('cubemaster');
};

// close the top window; leaving a lesson undoes its live world changes
function closeOverlay() {
  if (!UI.closeTop()) return false;
  sound.close();
  if ($('#panel').classList.contains('hidden')) {
    lessons.onClose();
    puzzles.close();
  }
  return true;
}

// dev aid: open the page with ?debug to inspect the game from the console
if (new URLSearchParams(location.search).has('debug')) window.__island = {
  player, W, A, islands, get state() { return state; },
  // render one 1600×900 frame, optionally from a given camera (for checking scenes)
  shot(view) {
    if (view) {
      camera.position.set(...view.pos);
      camera.lookAt(...view.look);
    }
    return captureScene(false);
  },
  // advance the simulation by `sec` seconds at 60 fps (hidden tabs don't animate)
  step(sec) { for (let i = 0; i < Math.round(sec * 60); i++) tick(1 / 60); render(); },
  grant: (n) => grantXP(n),
  board: (id, end) => board(id, end),
  get keys() { return keys; },
  get camYaw() { return camYaw; },
  set camYaw(v) { camYaw = v; },
};

// restore progress into the world
for (const i of state.orbs) collectOrbVisual(W.orbs[i], true);

// ------------------------------------------------------------------ game state helpers
function grantXP(n) {
  const before = UI.levelOf(state.xp);
  state.xp += n;
  const after = UI.levelOf(state.xp);
  if (after > before) {
    UI.toast(`Level up! LV ${after}`, `New title: ${UI.levelTitle(after)}`, 'level', '⬆');
    sound.level();
    bursts.spawn(player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), '#fbbf24', 24, 5, { up: 4 });
    for (const I of ISLANDS) {
      if (I.req > before && I.req <= after) setTimeout(() => UI.toast(`🔓 ${I.name} unlocked!`, `Travel there by ${I.via}`, 'achieve', I.icon), 1400);
    }
    W.setLevel(after, state);
  }
  awardCerts();
  persist();
  UI.updateHUD(state, TOTALS);
}

// certificates are earned automatically; ten unlock the Grand Certificate
let awarding = false;
function awardCerts() {
  if (awarding) return;
  awarding = true;
  const had = (state.certs || []).length;
  const fresh = checkCerts(state, { zones: ZONES.length });
  for (const c of fresh) {
    UI.celebrate({ icon: c.icon, title: `Certificate earned: ${c.title}`, pts: 200, who: settings.explorer, action: { label: '🎓 View & share', run: () => openCertificate(c.id) } });
    sound.achieve();
  }
  if (fresh.length) {
    grantXP(200 * fresh.length);
    if (had < GRAND_NEEDS && state.certs.length >= GRAND_NEEDS) {
      ensureGrandDate();
      UI.celebrate({ icon: '🎓', title: 'Grand Certificate unlocked!', pts: 0, big: true, who: settings.explorer, action: { label: '🎓 View & share', run: () => openCertificate('grand') } });
      fireworks(12, 8);
    } else UI.toast('Your certificate is ready', 'View it, download it or add it to LinkedIn: 🎓 (K)', 'info', '🎓');
  }
  updateCertBadge();
  awarding = false;
}
// a gold dot on the 🎓 button counts certificates you haven't opened yet
function updateCertBadge() {
  const seen = new Set(state.certsSeen || []);
  const ids = (state.certs || []).map((c) => c.id);
  if (ids.length >= GRAND_NEEDS) ids.push('grand');
  const n = ids.filter((id) => !seen.has(id)).length;
  const b = $('#certs-badge');
  b.textContent = n;
  b.classList.toggle('hidden', !n);
}

const certName = () => settings.certName || settings.explorer || '';
// the Grand Certificate's issue date is fixed the first time it is unlocked
function ensureGrandDate() {
  if (!state.grandDate && (state.certs || []).length >= GRAND_NEEDS) {
    state.grandDate = new Date().toISOString().slice(0, 10);
    persist();
  }
}
function openCerts(editName = false) {
  ensureGrandDate();
  lessons.onClose();
  puzzles.close();
  UI.showRawPanel({ kicker: 'Cloud Island Academy', title: '🎓 Your certificates', color: '#fbbf24', html: certsPanelHTML(state, certName(), { editName }) });
  sound.open();
}
// one certificate: the full image, plus download / LinkedIn profile / LinkedIn post / check link
async function openCertificate(id) {
  const name = certName();
  if (!name) return openCerts(); // ask for the name to print first
  const cert = certById(id);
  if (id === 'grand') ensureGrandDate();
  const date = id === 'grand' ? state.grandDate : (state.certs || []).find((x) => x.id === id)?.date;
  if (!cert || !date) return openCerts();
  const code = certCode(name, id, date), url = verifyURL(name, id, date);
  const list = CERTS.filter((c) => state.certs.some((x) => x.id === c.id));
  const [{ renderCertificate }, { openShareSheet }] = await Promise.all([import('./cert-image.js'), loadShare()]);
  const canvas = renderCertificate({ name, cert, date, code, grand: id === 'grand', list, url });
  state.certsSeen = [...new Set([...(state.certsSeen || []), id])];
  persist();
  updateCertBadge();
  lessons.onClose();
  puzzles.close();
  await openShareSheet({
    UI, canvas, color: '#fbbf24',
    kicker: 'Cloud Island Academy · certificate',
    title: `${cert.icon} ${cert.title}`,
    alt: `${cert.title} certificate awarded to ${name}`,
    filename: `Cloud-Island-${cert.title.replace(/\W+/g, '-')}-${name.replace(/\s+/g, '-')}.png`,
    text: certPostText(cert, url),
    intro: `<p class="lead">Issued to <b>${esc(name)}</b> on ${date} · certificate ID <code>${code}</code></p>
      <p class="muted">Skills: ${cert.skills.map(esc).join(' · ')}</p>`,
    extra: `<a class="btn li" href="${esc(linkedInAddURL(name, cert, date))}" target="_blank" rel="noopener"><b class="li-mark">in</b> Add to profile</a>
      <button class="btn" data-share="link" data-link="${esc(url)}">🔗 Copy check link</button>
      <button class="btn" data-cert-list>← All certificates</button>`,
    note: '“Add to profile” fills in LinkedIn’s licence and certification form with this certificate, its ID and its check link.',
    onAction: sharedOnce,
  });
  sound.open();
}
// a small thank-you the first time someone shares
function sharedOnce(kind) {
  if (!['linkedin', 'native'].includes(kind) || state.shared) return;
  state.shared = true;
  reward(50, player.pos.clone().setY(player.pos.y + 2.4), '📣 Thanks for sharing! +50');
}

// ------------------------------------------------------------------ explorer snapshot (P / 📸)
const camTmp = new THREE.Vector3();
// renders one frame at a fixed 1600×900 (sharp and well framed on any screen), then restores the view
function captureScene(selfie) {
  const pr = renderer.getPixelRatio(), aspect = camera.aspect, fov = camera.fov;
  renderer.setPixelRatio(1);
  renderer.setSize(1600, 900, false);
  composer.setPixelRatio(1);
  composer.setSize(1600, 900);
  camera.aspect = 16 / 9;
  camera.fov = 55;
  camera.updateProjectionMatrix();
  if (selfie) {
    dog.photoPose();
    const f = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
    const side = new THREE.Vector3(f.z, 0, -f.x); // the side Buddy sits on (screen right in the selfie)
    const pair = player.pos.clone().addScaledVector(side, 0.55).add(camTmp.set(0, 1.0, 0)); // robot + Buddy
    camera.position.copy(pair).addScaledVector(f, 5.8).addScaledVector(side, -0.6).add(camTmp.set(0, 0.7, 0));
    camera.position.y = Math.max(camera.position.y, W.groundAt(camera.position.x, camera.position.z, camera.position.y) + 0.6);
    camera.lookAt(pair.addScaledVector(side, -1.7)); // aim left of them, so they stand clear of the scorecard
  }
  render();
  const src = renderer.domElement;
  const shot = document.createElement('canvas');
  shot.width = src.width;
  shot.height = src.height;
  shot.getContext('2d').drawImage(src, 0, 0); // read straight after rendering, before the frame is presented
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = aspect;
  camera.fov = fov;
  camera.updateProjectionMatrix();
  render(); // repaint at screen size straight away, so the view never flickers
  return shot;
}
async function takeSnapshot(selfie = false) {
  if (mode !== 'play') return;
  sound.shutter();
  const shot = captureScene(selfie);
  $('#fade').classList.add('flash');
  setTimeout(() => $('#fade').classList.remove('flash'), 250);
  const lvl = UI.levelOf(state.xp);
  const who = settings.explorer || 'Guest Explorer';
  const home = new URL('./', location.href);
  const n = (a) => (a || []).length;
  const info = {
    name: who, level: lvl, title: UI.levelTitle(lvl), xp: state.xp, inLevel: state.xp % UI.XP_PER_LEVEL, perLevel: UI.XP_PER_LEVEL,
    stats: [
      ['🏆', 'Challenges', n(state.done), TASKS.length],
      ['🎓', 'Certificates', n(state.certs), CERTS.length],
      ['🏝️', 'Islands explored', n(state.islands), ISLANDS.length],
      ['🧭', 'Zones discovered', n(state.visited), ZONES.length],
      ['🪙', 'Gold found', n(state.goldFound), dog.nuggets.length],
      ['⭐', 'Achievements', n(state.achievements), TOTALS.achievements],
    ],
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    url: home.href, host: home.host + home.pathname.replace(/\/$/, ''),
  };
  const [{ composeSnapshot }, { openShareSheet }] = await Promise.all([import('./snapshot.js'), loadShare()]);
  const canvas = composeSnapshot(shot, info);
  lessons.onClose();
  puzzles.close();
  await openShareSheet({
    UI, canvas, color: '#5eead4',
    kicker: 'Explorer snapshot',
    title: '📸 Your Cloud Island moment',
    alt: `Cloud Island snapshot: ${who}, level ${lvl}, ${state.xp} points`,
    filename: `Cloud-Island-${who.replace(/\W+/g, '-')}-LV${lvl}.png`,
    text: `🎮 I'm LV ${lvl} · ${UI.levelTitle(lvl)} on Cloud Island with ${state.xp.toLocaleString('en-US')} points!
✔ ${n(state.done)} of ${TASKS.length} challenges · 🎓 ${n(state.certs)} certificate${n(state.certs) === 1 ? '' : 's'} · 🏝️ ${n(state.islands)} of ${ISLANDS.length} islands explored

Cloud Island is an interactive 3D learning world and portfolio by Yumnam Momojit Singh. Can you beat my score? ${home.href}

#CloudIsland #LearningByPlaying #ArtificialIntelligence`,
    extra: `<button class="btn" data-snap="view">🎥 Retake: my view</button><button class="btn" data-snap="selfie">🤳 Selfie with Buddy</button>`,
    onAction: sharedOnce,
  });
}

// ------------------------------------------------------------------ trains & cable car
let ride = null;
const seatTmp = new THREE.Vector3();
function board(trId, end) {
  const tr = W.transports[trId];
  const lvl = UI.levelOf(state.xp);
  if (lvl < tr.req) {
    UI.toast(`Locked until LV ${tr.req}`, `You're LV ${lvl} — earn points by exploring, playing and learning`, 'info', '🔒');
    sound.thud();
    return;
  }
  if (end === 1 && islands.stranded() === tr.isle) {
    const I = ISLANDS.find((i) => i.id === tr.isle);
    UI.toast('The way home is sealed', `Complete ${I.trial} first. Stuck? Press 💡 Hint in the quest card.`, 'info', '🔒');
    sound.thud();
    return;
  }
  if (end === 0) islands.ensure(tr.isle); // start loading the island while you ride
  if (player.vehicle) A.action();
  if (cubeMode) exitCube();
  tr.at = end;
  tr.place(end, end === 1);
  ride = { tr, from: end, t: 0 };
  sound.bell();
  UI.toast(tr.kind === 'cable' ? 'Cable car departing…' : 'All aboard!', `Next stop: ${tr.names[1 - end]}`, 'info', tr.kind === 'cable' ? '🚡' : '🚆');
}
function updateRide(dt) {
  const { tr, from } = ride;
  ride.t = Math.min(1, ride.t + dt / tr.dur);
  const e = ride.t * ride.t * (3 - 2 * ride.t);
  tr.place(from === 0 ? e : 1 - e, from === 1);
  tr.seatWorld(seatTmp);
  player.pos.copy(seatTmp);
  player.vel.set(0, 0, 0);
  player.onGround = true;
  player.yaw = tr.heading;
  player.animate(0);
  player.sync();
  sound.engine(Math.sin(Math.PI * ride.t) * 14);
  if (ride.t >= 1) {
    const ex = tr.exits[1 - from];
    tr.at = 1 - from;
    ride = null;
    sound.engineStop();
    player.place(ex.x, 0, ex.z, ex.yaw);
    camTarget.copy(player.pos).y += 1.5;
    bursts.spawn(player.pos.clone().setY(1), '#5eead4', 14, 3, { up: 2 });
  }
}

// island info + riddle panels
function openIsle(id) {
  const I = ISLANDS.find((i) => i.id === id);
  if (islands.runtime(id)?.trial) {
    lessons.onClose();
    puzzles.close();
    return islands.openBriefing(id);
  }
  const lvl = UI.levelOf(state.xp);
  UI.showRawPanel({
    kicker: `${I.icon} Island · unlocks at LV ${I.req}`, title: I.name, color: I.color,
    html: `<p class="lead">${esc(I.purpose)}</p>
      <p>Reach it by <b>${esc(I.via)}</b>. ${lvl >= I.req ? '✅ Unlocked for you.' : `🔒 You are LV ${lvl}.`}</p>
      ${I.trial
        ? `<div class="callout">🎯 Trial: <b>${esc(I.trial)}</b>. Once you arrive, the way home seals until you complete it. Reward: the 🎓 <b>${esc(CERTS.find((c) => c.id === I.cert)?.title || '')}</b> certificate.</div>`
        : `<div class="callout">🚧 This island's learning adventure, with its own certificate, arrives in a coming update. Explore it now and come back soon!</div>`}`,
  });
  sound.open();
}
function openWorkshop() {
  lessons.onClose();
  puzzles.close();
  UI.showRawPanel({ kicker: 'Cloud Island · near the Fun Park', title: '🛠️ Golden Workshop', color: '#facc15', html: dog.workshopHTML() });
  sound.open();
}
function openRiddle() {
  const solved = state.riddles.includes('mystery');
  UI.showRawPanel({
    kicker: '🗿 Ancient riddle stone', title: 'The stone speaks…', color: '#c084fc',
    html: solved
      ? `<p class="lead">“${esc(RIDDLE_TEXT)}”</p><p class="why">✔ Solved. ${UI.levelOf(state.xp) >= 12 ? 'The hidden bridge has risen.' : 'The bridge will rise once you reach LV 12.'}</p>`
      : `<p class="lead">“${esc(RIDDLE_TEXT)}”</p><p class="muted">Answer to raise the hidden bridge to the Mysterious Island (it also needs LV 12).</p>
        <form class="pz-form" data-riddle autocomplete="off"><input name="a" placeholder="Your answer" spellcheck="false" /><button class="btn small primary" type="submit">Speak</button></form>`,
  });
  sound.open();
}

function achieve(key) {
  if (state.achievements.includes(key)) return;
  state.achievements.push(key);
  const [title, sub, icon] = ACHIEVEMENTS[key];
  UI.toast(`Achievement: ${title}`, sub, 'achieve', icon);
  sound.achieve();
  grantXP(150);
}

function collectOrbVisual(o, silent = false) {
  o.collected = true;
  o.group.visible = false;
  const fruit = W.fruits[o.index];
  fruit.material.color.set(o.skill.color);
  fruit.material.emissive.set(o.skill.color);
  fruit.material.emissiveIntensity = 2.4;
  if (!silent) bursts.spawn(fruit.getWorldPosition(new THREE.Vector3()), o.skill.color, 16, 3, { up: 2 });
}

function openPanel(id) {
  if (A.interact(id)) return;
  if (islands.interact(id)) return;
  if (lessons.has(id)) {
    if (!state.opened.includes(id)) {
      state.opened.push(id);
      grantXP(25);
    }
    lessons.open(id);
    sound.open();
    return;
  }
  if (id.startsWith('puzzles:')) {
    if (!state.opened.includes(id)) {
      state.opened.push(id);
      grantXP(25);
    }
    lessons.onClose();
    puzzles.open(id.slice(8));
    sound.open();
    return;
  }
  if (id === 'rubik') return enterCube();
  if (id.startsWith('travel:')) {
    const [, trId, end] = id.split(':');
    return board(trId, +end);
  }
  if (id.startsWith('isle:')) return openIsle(id.slice(5));
  if (id === 'riddle:mystery') return openRiddle();
  if (id === 'dog') return dog.pet();
  if (id === 'workshop') return openWorkshop();
  lessons.onClose();
  puzzles.close();
  if (id === 'secret' && W.chest) W.chest.open = true;
  if (!state.opened.includes(id)) {
    state.opened.push(id);
    grantXP(25);
  }
  UI.showPanel(id, state);
  sound.open();
  if (id === 'city:thoubal') A.progress('hometown', 1);
}

// E / Enter / the action button: ride, throw, or open what's in front of you
function doAction() {
  if (A.action()) return;
  if (nearest) openPanel(nearest.id);
}

// ------------------------------------------------------------------ input
const keys = new Set();
const input = { x: 0, y: 0, sprint: false, jump: false };
const joy = { x: 0, y: 0, active: false, id: null };
let mode = 'attract'; // attract → intro → play
let camYaw = 0, camPitch = 0.38, camDist = 11;
let nearest = null;
let shownPrompt = null;

function gameKeysBlocked() {
  return mode !== 'play' || UI.isOverlayOpen();
}

addEventListener('keydown', (e) => {
  const onControl = e.target.closest?.('button, a, input');
  if (e.code === 'Escape') {
    if (!closeOverlay() && cubeMode) exitCube();
    return;
  }
  if (mode !== 'play') return;
  if (cubeMode && !UI.isOverlayOpen() && !onControl) {
    const face = { KeyU: 'U', KeyD: 'D', KeyL: 'L', KeyR: 'R', KeyF: 'F', KeyB: 'B' }[e.code];
    if (face && !e.repeat) cubeAction(e.shiftKey ? `${face}'` : face);
    if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) cubeAction('undo');
    if (face || e.code === 'Space') e.preventDefault();
    if (e.code !== 'KeyM') return;
  }
  if (e.code === 'KeyM' && !onControl) {
    toggleMap();
    return;
  }
  if (UI.isOverlayOpen()) return;
  if (onControl && (e.code === 'Space' || e.code === 'Enter')) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' && !e.repeat) input.jump = true;
  if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) doAction();
  if (e.code === 'KeyH' || e.key === '?') UI.openOverlay($('#help'));
  if (e.code === 'KeyK') openCerts();
  if (e.code === 'KeyG' && !e.repeat) dog.command();
  if (e.code === 'KeyP' && !e.repeat) takeSnapshot();
  if (e.code === 'KeyC') UI.openOverlay($('#classic'));
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

function readKeys() {
  const k = (...c) => c.some((x) => keys.has(x));
  let x = (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0);
  let y = (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0);
  if (joy.active) {
    x = joy.x;
    y = joy.y;
  }
  input.x = x;
  input.y = y;
  input.sprint = k('ShiftLeft', 'ShiftRight') || Math.hypot(joy.x, joy.y) > 0.92;
}

// camera drag + click picking
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let drag = null;
const pickables = () => [...W.interactables.map((i) => i.object), ...W.crates.map((c) => c.mesh)];

function pick(clientX, clientY) {
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(pickables(), true)[0];
  if (!hit) return null;
  const crate = W.crates.find((c) => c.mesh === hit.object);
  if (crate) return { crate, point: hit.point };
  for (let o = hit.object; o; o = o.parent) {
    const it = W.interactables.find((i) => i.object === o);
    if (it) return { it, point: hit.point };
  }
  return null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'play') return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
  try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX;
    drag.y = e.clientY;
    camYaw -= dx * 0.0055;
    camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004, 0.05, 1.25);
    $('#tooltip').classList.add('hidden');
    return;
  }
  if (mode !== 'play' || e.pointerType === 'touch') return;
  const p = pick(e.clientX, e.clientY);
  const tip = $('#tooltip');
  if (p?.it || p?.crate) {
    canvas.style.cursor = 'pointer';
    tip.textContent = p.it ? p.it.label : `${p.crate.name} crate — click to kick`;
    tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    tip.classList.remove('hidden');
  } else {
    canvas.style.cursor = 'grab';
    tip.classList.add('hidden');
  }
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const wasClick = drag.moved < 8;
  drag = null;
  if (!wasClick || mode !== 'play') return;
  const p = pick(e.clientX, e.clientY);
  if (p?.it) {
    const d = Math.hypot(player.pos.x - p.it.x, player.pos.z - p.it.z);
    if (d < 16 && Math.abs(player.pos.y - p.it.y) < 4) openPanel(p.it.id);
    else UI.toast('Too far away', 'Walk closer — or press M to fast-travel', 'info', '📍');
  } else if (p?.crate) {
    const dir = new THREE.Vector3().subVectors(p.crate.pos, camera.position).setY(0).normalize();
    p.crate.vel.set(dir.x * 11, 7, dir.z * 11);
    sound.kick();
    bursts.spawn(p.point, '#fbbf24', 10, 3, { glow: 1.6 });
  }
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => {
  camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.01, 5, 22);
}, { passive: true });

// touch joystick
const stick = $('#joystick'), knob = $('#knob');
stick.addEventListener('pointerdown', (e) => {
  joy.active = true;
  joy.id = e.pointerId;
  try { stick.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  moveJoy(e);
});
stick.addEventListener('pointermove', (e) => e.pointerId === joy.id && moveJoy(e));
const endJoy = (e) => {
  if (e.pointerId !== joy.id) return;
  joy.active = false;
  joy.x = joy.y = 0;
  knob.style.transform = '';
};
stick.addEventListener('pointerup', endJoy);
stick.addEventListener('pointercancel', endJoy);
function moveJoy(e) {
  const r = stick.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const max = r.width / 2 - 10;
  const d = Math.hypot(dx, dy);
  if (d > max) { dx *= max / d; dy *= max / d; }
  joy.x = dx / max;
  joy.y = -dy / max;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
$('#btn-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); input.jump = true; });
$('#btn-act').addEventListener('pointerdown', (e) => { e.preventDefault(); doAction(); });
$('#prompt').addEventListener('click', doAction);

// ------------------------------------------------------------------ overlays & toolbar
$('#panel-close').addEventListener('click', closeOverlay);
document.addEventListener('submit', (e) => {
  if (puzzles.handleSubmit(e.target)) return e.preventDefault();
  if (e.target.matches('[data-riddle]')) {
    e.preventDefault();
    if (checkRiddle(e.target.elements.a.value)) {
      state.riddles.push('mystery');
      W.setLevel(UI.levelOf(state.xp), state);
      sound.gem();
      UI.toast('The riddle is solved!', UI.levelOf(state.xp) >= 12 ? 'Listen… the stone bridge is rising.' : 'The bridge will rise when you reach LV 12.', 'achieve', '🗿');
      grantXP(150);
      openRiddle();
    } else {
      sound.thud();
      UI.toast('The stone stays silent', 'Think about what you leave behind as you walk…', 'info', '🗿');
    }
  }
  if (e.target.matches('[data-cert-name]')) {
    e.preventDefault();
    settings.certName = cleanName(e.target.elements.n.value).slice(0, 40);
    save(SETTINGS_KEY, settings);
    openCerts();
  }
});
document.addEventListener('click', (e) => {
  if (islands.handleClick(e.target)) return;
  if (lessons.handleClick(e.target)) return;
  if (puzzles.handleClick(e.target)) return;
  if (shareMod?.handleShareClick(e.target)) return;
  const cv = e.target.closest('[data-cert-view]');
  if (cv) return openCertificate(cv.dataset.certView);
  if (e.target.closest('[data-cert-list]')) return openCerts();
  if (e.target.closest('[data-cert-rename]')) return openCerts(true);
  const snap = e.target.closest('[data-snap]');
  if (snap) return takeSnapshot(snap.dataset.snap === 'selfie');
  const cr = e.target.closest('[data-craft]');
  if (cr) {
    if (dog.craft(cr.dataset.craft)) openWorkshop();
    return;
  }
  const cb = e.target.closest('[data-cube]');
  if (cb) return cubeAction(cb.dataset.cube);
  const open = e.target.closest('[data-open]');
  if (open) {
    e.preventDefault();
    openPanel(open.dataset.open);
  }
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    navigator.clipboard?.writeText(copy.dataset.copy).then(
      () => UI.toast('Email copied', copy.dataset.copy, 'info', '📋'),
      () => UI.toast('Could not copy', copy.dataset.copy, 'info', '📋')
    );
  }
  const close = e.target.closest('[data-close]');
  if (close) closeOverlay();
});
for (const id of ['#panel', '#map', '#help', '#classic']) {
  $(id).addEventListener('pointerdown', (e) => {
    if (e.target === e.currentTarget) closeOverlay();
  });
}

function toggleMap() {
  if (!$('#map').classList.contains('hidden')) UI.closeTop();
  else { renderMapList(); UI.openOverlay($('#map')); }
}
function renderMapList() {
  const lvl = UI.levelOf(state.xp);
  const isles = ISLANDS.map((I) => {
    const locked = lvl < I.req || (I.id === 'mystery' && !state.riddles.includes('mystery'));
    return `<li><button class="travel ${locked ? 'locked' : ''}" data-travel="isle:${I.id}" style="--c:${I.color}" ${locked ? 'aria-disabled="true"' : ''}>
      <span class="dot"></span><span>${I.icon} ${I.name}</span><small>${locked ? `🔒 LV ${I.req}${I.id === 'mystery' ? ' + riddle' : ''}` : state.islands.includes(I.id) ? 'visited' : 'unlocked'}</small></button></li>`;
  }).join('');
  $('#travel-list').innerHTML = ZONES.map((z) => `<li><button class="travel" data-travel="${z.id}" style="--c:${z.color}">
    <span class="dot"></span><span>${z.name}</span><small>${state.visited.includes(z.id) ? 'visited' : 'undiscovered'}</small></button></li>`).join('') +
    `<li class="travel-head">Islands</li>${isles}`;
}
$('#travel-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-travel]');
  if (b) travelTo(b.dataset.travel);
});
function travelTo(id) {
  const stuck = islands.stranded();
  if (stuck && id !== `isle:${stuck}`) {
    const I = ISLANDS.find((i) => i.id === stuck);
    UI.toast('The way home is sealed', `Complete ${I.trial} on ${I.name} first`, 'info', '🔒');
    sound.thud();
    return;
  }
  if (id.startsWith('isle:')) {
    const I = ISLANDS.find((i) => i.id === id.slice(5));
    const lvl = UI.levelOf(state.xp);
    if (lvl < I.req || (I.id === 'mystery' && !state.riddles.includes('mystery'))) {
      UI.toast(`${I.name} is locked`, I.id === 'mystery' ? `Reach LV ${I.req} and solve the riddle stone on Forest Island` : `Reach LV ${I.req} to travel there`, 'info', '🔒');
      return;
    }
    const L = Math.hypot(...I.c);
    const k = I.r * 0.45 - 3; // in front of the island's signboard, facing inland
    const x = I.c[0] - (I.c[0] / L) * k, zz = I.c[1] - (I.c[1] / L) * k;
    UI.closeTop();
    flash();
    sound.warp();
    player.place(x, 0, zz, Math.atan2(I.c[0] - x, I.c[1] - zz));
    camYaw = Math.atan2(-(I.c[0] - x), -(I.c[1] - zz));
    camTarget.copy(player.pos).y += 1.5;
    return;
  }
  const z = ZONES.find((zz) => zz.id === id);
  let x, zz;
  if (id === 'about') { x = 0; zz = 24; }
  else if (id === 'experience') { x = 16; zz = -2; }
  else if (id === 'journey') { x = 44; zz = 17; } // south edge, so India reads north-up
  else {
    const L = Math.hypot(z.x, z.z) || 1;
    const off = Math.min(z.r * 0.7, 8) + 1.5;
    x = z.id === 'skills' ? 0 : z.x - (z.x / L) * off;
    zz = z.id === 'skills' ? 7 : z.z - (z.z / L) * off;
  }
  UI.closeTop();
  flash();
  sound.warp();
  player.place(x, 0, zz, Math.atan2(z.x - x, z.z - zz));
  camYaw = Math.atan2(-(z.x - x), -(z.z - zz));
  camTarget.copy(player.pos).y += 1.5;
  bursts.spawn(player.pos.clone().setY(1), '#5eead4', 20, 4, { up: 3 });
}
function flash() {
  const f = $('#fade');
  f.classList.add('on');
  setTimeout(() => f.classList.remove('on'), 180);
}

$('#btn-map').addEventListener('click', toggleMap);
$('#btn-help').addEventListener('click', () => UI.openOverlay($('#help')));
$('#btn-certs').addEventListener('click', openCerts);
$('#btn-dog').addEventListener('click', () => dog.command());
$('#btn-snap').addEventListener('click', () => takeSnapshot());
$('#btn-classic').addEventListener('click', () => UI.openOverlay($('#classic')));
$('#btn-classic-start').addEventListener('click', () => UI.openOverlay($('#classic')));
$('#btn-sound').addEventListener('click', () => {
  sound.muted = !sound.muted;
  settings.muted = sound.muted;
  save(SETTINGS_KEY, settings);
  syncSoundBtn();
});
function syncSoundBtn() {
  $('#btn-sound').textContent = sound.muted ? '🔇' : '🔊';
  $('#btn-sound').setAttribute('aria-label', sound.muted ? 'Unmute sound' : 'Mute sound');
}
$('#btn-quality').addEventListener('click', () => {
  settings.quality = settings.quality === 'high' ? 'low' : 'high';
  save(SETTINGS_KEY, settings);
  applyQuality();
  UI.toast(`Graphics: ${settings.quality === 'high' ? 'High (bloom on)' : 'Low (faster)'}`, '', 'info', '⚙');
});
$('#btn-reset').addEventListener('click', () => {
  state = freshState();
  persist();
  location.reload();
});
$('.q-head').addEventListener('click', (e) => {
  const q = $('#quests');
  q.classList.toggle('collapsed');
  e.currentTarget.setAttribute('aria-expanded', String(!q.classList.contains('collapsed')));
});

// start: optional explorer name, or play as a guest
$('#explorer-name').value = settings.explorer;
$('#name-form').addEventListener('submit', (e) => {
  e.preventDefault();
  startGame($('#explorer-name').value);
});
$('#btn-guest').addEventListener('click', () => startGame(''));
$('#rename-form').addEventListener('submit', (e) => {
  e.preventDefault();
  setExplorer($('#rename-input').value);
  UI.toast(settings.explorer ? `Hello, ${settings.explorer}!` : 'Playing as Guest', 'Name updated', 'info', '🪪');
});
function startGame(name) {
  setExplorer(name);
  $('#rename-input').value = settings.explorer;
  sound.unlock();
  $('#start').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  if (isTouch) $('#touch-ui').classList.remove('hidden');
  $('#prompt kbd').textContent = isTouch ? 'TAP' : 'E';
  mode = 'intro';
  introT = 0;
  // if the tab is hidden during the intro (no animation frames), still hand over control
  setTimeout(() => { if (mode === 'intro') mode = 'play'; }, 2200);
  camYaw = 0;
  canvas.focus({ preventScroll: true });
  UI.updateHUD(state, TOTALS);
  setTimeout(() => {
    const who = settings.explorer || 'Guest';
    if (state.xp > 0) UI.toast(`Welcome back, ${who}!`, 'Your island progress was restored', 'info', '💾');
    else UI.toast(`Welcome to Cloud Island, ${who}!`, isTouch ? 'Use the joystick and walk into the glowing zones' : 'WASD to move · walk into the glowing zones', 'info', '☁️');
  }, 1200);
  setTimeout(() => UI.toast(`${TASKS.length} challenges to win points!`, 'Ride, shoot hoops, find gems — or learn AI in the Learning Lab 🎓', 'info', '⭐'), 4200);
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3(SPAWN.x, 1.5, SPAWN.z);
const followPos = new THREE.Vector3();
const attractPos = new THREE.Vector3();
const attractLook = new THREE.Vector3(0, 3, 0);
const lookTmp = new THREE.Vector3();
let introT = 0;
let t = 0;
let currentZone = null;
let dustTimer = 0;
const mini = $('#minimap').getContext('2d');
const bigMap = $('#map-canvas').getContext('2d');

const events = {
  jump: (n) => {
    sound.jump(n);
    if (n === 2) bursts.spawn(player.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), '#5eead4', 10, 2.5, { up: -1 });
  },
  land: (v, airTime, rampAir) => {
    A.onLand(v, airTime, rampAir);
    if (v > 12) {
      sound.land();
      bursts.spawn(player.pos.clone().setY(player.pos.y + 0.1), '#e7dcc0', 10, 3, { up: 1, glow: 1 });
    }
  },
  rampLaunch: () => sound.whoosh(),
  vehicleAction: () => islands.vehicleAction(),
  bounce: () => {
    sound.bounce();
    bursts.spawn(player.pos.clone().setY(0.4), '#5eead4', 26, 5, { up: 6 });
  },
};

function updateCrates(dt) {
  const cs = W.crates;
  for (const c of cs) {
    c.vel.y -= 30 * dt;
    c.pos.addScaledVector(c.vel, dt);

    const dx = c.pos.x - player.pos.x, dz = c.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    const R = c.r + player.radius;
    if (d < R && Math.abs(c.pos.y - c.half - player.pos.y) < 1.4) {
      const nx = dx / (d || 1e-4), nz = dz / (d || 1e-4);
      c.pos.x = player.pos.x + nx * R;
      c.pos.z = player.pos.z + nz * R;
      const along = player.vel.x * nx + player.vel.z * nz;
      const push = Math.max(along * 1.25, 1.5);
      c.vel.x = nx * push + player.vel.x * 0.25;
      c.vel.z = nz * push + player.vel.z * 0.25;
      if (player.speed > 9.5 && c.grounded && (c.cool ?? 0) <= 0) {
        c.vel.y = 6;
        c.cool = 0.4;
        sound.kick();
        bursts.spawn(c.pos, '#fbbf24', 8, 2.5, { glow: 1.6 });
      }
    }
    c.cool = (c.cool ?? 0) - dt;
    W.resolve(c.pos, c.r);

    const g = W.groundAt(c.pos.x, c.pos.z, c.pos.y - c.half);
    if (c.pos.y - c.half <= g) {
      c.pos.y = g + c.half;
      c.vel.y = c.vel.y < -6 ? -c.vel.y * 0.3 : 0;
      const f = Math.exp(-3 * dt);
      c.vel.x *= f;
      c.vel.z *= f;
      c.grounded = true;
    } else c.grounded = false;

    const m = c.mesh;
    const hs = Math.hypot(c.vel.x, c.vel.z);
    if (c.grounded) {
      const snap = (a) => Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      m.rotation.x = THREE.MathUtils.damp(m.rotation.x, snap(m.rotation.x), 10, dt);
      m.rotation.z = THREE.MathUtils.damp(m.rotation.z, snap(m.rotation.z), 10, dt);
      m.rotation.y += hs * dt * 0.25;
    } else {
      m.rotation.x += c.vel.z * dt * 0.8;
      m.rotation.z -= c.vel.x * dt * 0.8;
    }
    m.position.copy(c.pos);

    if (c.pos.y < -45) {
      if (!c.fallen) {
        c.fallen = true;
        achieve('chaos');
      }
      c.pos.copy(c.home).setY(8);
      c.vel.set(0, 0, 0);
      bursts.spawn(c.home.clone().setY(1), '#fbbf24', 14, 3, { up: 3 });
    }
  }
  // crate vs crate
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= a.r + b.r || Math.abs(a.pos.y - b.pos.y) > 1.1) continue;
      const nx = dx / (d || 1e-4), nz = dz / (d || 1e-4);
      const overlap = (a.r + b.r - d) / 2;
      a.pos.x -= nx * overlap; a.pos.z -= nz * overlap;
      b.pos.x += nx * overlap; b.pos.z += nz * overlap;
      const rel = (a.vel.x - b.vel.x) * nx + (a.vel.z - b.vel.z) * nz;
      if (rel > 0) {
        a.vel.x -= rel * nx * 0.9; a.vel.z -= rel * nz * 0.9;
        b.vel.x += rel * nx * 0.9; b.vel.z += rel * nz * 0.9;
      }
    }
  }
}

function updateGame(dt) {
  readKeys();
  if (cubeMode) {
    input.x = input.y = 0;
    input.sprint = input.jump = false;
  }
  if (ride) updateRide(dt);
  else player.update(dt, input, camYaw, W, events);
  input.jump = false;
  A.update(dt, t);
  islands.update(dt, t);
  dog.update(dt);
  const p = player.pos;

  if (player.onGround && player.speed > 9 && p.y < 0.5) {
    dustTimer -= dt;
    if (dustTimer <= 0) {
      dustTimer = 0.07;
      bursts.spawn(p.clone().setY(0.15), '#efe6cf', 2, 1, { up: 0.6, glow: 1, size: 1.2, life: 0.5 });
    }
  }

  // fell off the island
  if (p.y < -28) {
    flash();
    A.onRespawn();
    achieve('diver');
    const back = islands.respawnPoint(player.lastSafe);
    if (back) player.place(back.x, 0, back.z, back.yaw);
    else player.place(player.lastSafe.x, 0, player.lastSafe.z, player.yaw);
    camTarget.copy(player.pos).y += 1.5;
    UI.toast('Respawned', 'The cloud sea caught you', 'info', '☁️');
  }

  if (player.onGround && p.y > SKY_ISLAND.top - 0.1) achieve('sky');

  // orbs
  for (const o of W.orbs) {
    if (o.collected) continue;
    if (o.group.position.distanceTo(p.clone().setY(p.y + 1)) < 1.7) {
      collectOrbVisual(o);
      bursts.spawn(o.group.position, o.skill.color, 22, 5, { up: 3 });
      state.orbs.push(o.index);
      sound.collect();
      UI.toast(`Skill Orb: ${o.skill.name}`, o.skill.items.slice(0, 5).join(' · ') + (o.skill.items.length > 5 ? ' …' : ''), 'orb', '◆');
      grantXP(50);
      if (state.orbs.length === SKILLS.length) achieve('collector');
    }
  }

  // zones
  let zone = null;
  if (p.y < 4) {
    for (const z of ZONES) if (Math.hypot(p.x - z.x, p.z - z.z) < z.r) { zone = z; break; }
  }
  // outer islands
  const isle = ISLANDS.find((I) => Math.hypot(p.x - I.c[0], p.z - I.c[1]) < I.r);
  if (isle && !zone) zone = { id: `isle:${isle.id}`, name: `${isle.icon} ${isle.name}`, color: isle.color, island: isle };
  if (zone !== currentZone && !(zone && currentZone && zone.id === currentZone.id)) {
    currentZone = zone;
    $('#zone-name').textContent = zone ? zone.name : 'Cloud Island';
    $('#zone-name').style.setProperty('--c', zone ? zone.color : '#94a3b8');
    if (zone?.island && !state.islands.includes(zone.island.id)) {
      state.islands.push(zone.island.id);
      UI.zoneBanner(zone.island.name, zone.island.color);
      sound.zone();
      UI.toast(`New island: ${zone.island.name}`, zone.island.topic, 'achieve', zone.island.icon);
      grantXP(150);
    } else if (zone?.island) UI.zoneBanner(zone.island.name, zone.island.color);
    if (zone && !zone.island) {
      UI.zoneBanner(zone.name, zone.color);
      if (!state.visited.includes(zone.id)) {
        state.visited.push(zone.id);
        sound.zone();
        grantXP(100);
        if (state.visited.length === ZONES.length) achieve('explorer');
      }
    }
  }

  // nearest interactable
  let best = null, bestD = Infinity;
  for (const it of W.interactables) {
    if (it.hidden || Math.abs(p.y - it.y) > 2.5) continue;
    const d = Math.hypot(p.x - it.x, p.z - it.z);
    if (d >= it.r) continue;
    const score = d + (it.low ? 4 : 0); // low-priority things (petting Buddy) never hide what you came for
    if (score < bestD) { best = it; bestD = score; }
  }
  nearest = best;
  const promptText = cubeMode || ride ? null : A.prompt() || best?.label || null;
  if (cubeMode) {
    const C = W.cube;
    $('#cube-stats').textContent = `${C.moves} moves · ${C.scrambled && C.moves ? fmtTime((performance.now() - C.startedAt) / 1000) : '0:00'}${C.scrambled ? '' : C.isSolved() ? ' · solved ✓' : ''}`;
  }
  if (promptText !== shownPrompt) {
    shownPrompt = promptText;
    UI.setPrompt(promptText);
    $('#btn-act').classList.toggle('ready', !!promptText);
  }

  // waterfall ambience gets louder as you get closer
  const fd = p.distanceTo(W.spots.fallsSound);
  sound.water(Math.max(0, 1 - fd / 32) ** 2);
}

function updateCamera(dt) {
  if (player.vehicle && !drag && mode === 'play') camYaw = dampAngle(camYaw, player.yaw + Math.PI, 2.2, dt);
  const focus = cubeMode ? W.cube.center : null;
  camTarget.x = THREE.MathUtils.damp(camTarget.x, focus ? focus.x : player.pos.x, 10, dt);
  camTarget.y = THREE.MathUtils.damp(camTarget.y, focus ? focus.y - 1.3 : player.pos.y + 1.5, 6, dt); // cube sits above its controls
  camTarget.z = THREE.MathUtils.damp(camTarget.z, focus ? focus.z : player.pos.z, 10, dt);
  followPos.set(
    camTarget.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
    camTarget.y + Math.sin(camPitch) * camDist,
    camTarget.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist
  );
  const floor = W.groundAt(followPos.x, followPos.z, followPos.y) + 0.6;
  if (followPos.y < floor) followPos.y = floor;

  const a = t * 0.05;
  attractPos.set(Math.sin(a) * 78, 36, Math.cos(a) * 78);

  if (mode === 'attract') {
    camera.position.copy(attractPos);
    camera.lookAt(attractLook);
  } else if (mode === 'intro') {
    introT += dt / 1.8;
    const e = introT >= 1 ? 1 : introT < 0.5 ? 4 * introT ** 3 : 1 - (-2 * introT + 2) ** 3 / 2;
    camera.position.lerpVectors(attractPos, followPos, e);
    camera.lookAt(lookTmp.lerpVectors(attractLook, camTarget, e));
    if (introT >= 1) mode = 'play';
  } else {
    camera.position.copy(followPos);
    camera.lookAt(camTarget);
  }
  W.sky.position.copy(camera.position);
}

function mapData() {
  return {
    zones: ZONES.map((z) => ({ ...z, visited: state.visited.includes(z.id) })),
    orbs: W.orbs.filter((o) => !o.collected).map((o) => ({ x: o.group.position.x, z: o.group.position.z, color: o.skill.color })),
    player: player.pos,
    yaw: player.yaw,
    islandR: ISLAND_R,
    islands: ISLANDS.map((I) => ({ x: I.c[0], z: I.c[1], r: I.r, name: I.name, icon: I.icon, color: I.color, locked: UI.levelOf(state.xp) < I.req })),
    links: [
      ...W.decks.map((d) => [d.ax, d.az, d.ax + d.dx * d.len, d.az + d.dz * d.len, d.enabled ? '#e7d7a8' : 'rgba(231,215,168,0.3)']),
      ...Object.values(W.transports).map((tr) => [tr.exits[0].x, tr.exits[0].z, tr.exits[1].x, tr.exits[1].z, tr.kind === 'cable' ? '#38bdf8' : '#f87171']),
    ],
    india: W.indiaRings,
    home: W.journeyStops?.find((s) => s.home),
    sky: SKY_ISLAND,
  };
}

function frame() {
  const raw = Math.min(clock.getDelta(), 0.05);
  fps += (1 / Math.max(raw, 1e-3) - fps) * 0.05;
  tick(raw * timeScale);
  render();
  requestAnimationFrame(frame);
}

function tick(dt) {
  t += dt;
  if (mode === 'play' && !UI.isOverlayOpen()) updateGame(dt);
  else if (mode === 'play') {
    keys.clear();
    player.animate(dt);
    if (shownPrompt) {
      nearest = null;
      shownPrompt = null;
      UI.setPrompt(null);
    }
    sound.water(0);
  }
  for (const u of W.updaters) u(t, dt);
  W.sun.position.copy(player.pos).addScaledVector(W.sunDir, 90);
  W.sun.target.position.copy(player.pos);
  W.sun.target.updateMatrixWorld();
  updateCrates(dt);
  bursts.update(dt);
  updateCamera(dt);
  if (mode !== 'attract') {
    const md = mapData();
    UI.drawMap(mini, 180, md);
    if (!$('#map').classList.contains('hidden')) UI.drawMap(bigMap, 520, md, { big: true });
  }
}

function render() {
  if (!innerWidth || !innerHeight) return;
  renderer.info.reset();
  if (settings.quality === 'high') composer.render();
  else renderer.render(scene, camera);
}

function fitCamera() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 72 : 55; // wider view on portrait phones
}
fitCamera();
camera.updateProjectionMatrix();

addEventListener('resize', () => {
  if (!innerWidth || !innerHeight) return; // minimised / hidden pane
  fitCamera();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
});

function noWebGL() {
  document.getElementById('loader')?.classList.add('hidden');
  document.getElementById('start')?.classList.add('hidden');
  UI.buildClassic();
  const c = document.getElementById('classic');
  c.classList.remove('hidden');
  c.querySelector('.classic-back')?.remove();
}

// ------------------------------------------------------------------ boot
if (isTouch) {
  $('.controls').innerHTML = '<li><kbd>◎</kbd> joystick to move</li><li><kbd>Drag</kbd> look around</li><li><kbd>E</kbd> interact</li><li><kbd>⤒</kbd> jump ×2</li>';
}
if (innerWidth < 640) $('#quests').classList.add('collapsed'); // keep phones uncluttered
UI.buildClassic();
applyQuality();
syncSoundBtn();
W.setLevel(UI.levelOf(state.xp), state);
UI.updateHUD(state, TOTALS);
updateCertBadge();
{
  const back = islands.restore();
  if (back) {
    player.place(back.x, 0, back.z, back.yaw);
    camYaw = back.yaw + Math.PI;
    camTarget.copy(player.pos).y += 1.5;
  }
}
UI.setExplorer(settings.explorer);
frame();
$('#loader').classList.add('hidden');
$('#start').classList.remove('hidden');
$('#explorer-name').focus();
