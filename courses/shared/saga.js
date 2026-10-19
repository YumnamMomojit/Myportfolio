// The saga engine shared by every course: the 3D map, the level HUD, moves, stars and popups.
// A course calls startSaga() with its worlds, levels and a way to load its level mechanics.
import * as THREE from 'three';
import { Sound } from '../../js/audio.js';
import { createProgress } from './progress.js';
import { Stage } from './stage.js';
import { SagaMap } from './map.js';
import { esc } from './kit.js';

const CONFETTI = [0xffd54f, 0xf5b301, 0x3ddc84, 0x1fa45c, 0xfffdf3];

// cfg: { worlds, levels, storageKey, title, about, loadEngine(name),
//        levelWord, ideaTag, hudButtons: [{ icon, title, onClick }], actions: { name: fn },
//        afterWin({ index, level, stars, before }) → extra HTML for the result popup,
//        finished({ total, max }) → HTML shown after the last level }
export function startSaga(cfg) {
const WORLDS = cfg.worlds;
const LEVELS = cfg.levels;
const WORD = cfg.levelWord || 'Level';
const IDEA = cfg.ideaTag || '🍬 The idea';
const progress = createProgress(cfg.storageKey);
const $ = (id) => document.getElementById(id);
const canvas = $('gl');
const modal = $('modal');
const card = $('modal-card');
const dock = $('dock');
const statusEl = $('status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const sound = new Sound();
sound.muted = !progress.sound;
addEventListener('pointerdown', () => sound.unlock());

const stage = new Stage(canvas);
const map = new SagaMap(canvas, WORLDS, LEVELS);
map.isUnlocked = unlocked;
map.starsOf = (i) => progress.stars(LEVELS[i].id);
map.onSelect = (i) => {
  sound.click();
  hideTip();
  if (unlocked(i)) openLevelCard(i);
  else toast(`🔒 Finish ${WORD.toLowerCase()} ${i} first to unlock ${WORD.toLowerCase()} ${i + 1}.`, 'bad');
};
map.onWorld = (w) => {
  const world = WORLDS[w];
  $('world-chip').innerHTML = `${world.emoji} ${esc(world.name)} <small>· ${esc(world.tagline)}</small>`;
};

let mode = 'map';
let run = null;
const MAX_STARS = LEVELS.length * 3;
$('max-stars').textContent = `/${MAX_STARS}`;

function unlocked(i) {
  return progress.teacher || i === 0 || progress.stars(LEVELS[i - 1].id) > 0;
}

// ───────────────────────────── toasts and modals
function toast(html, kind = '', ms = 2600) {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = html;
  $('toasts').append(el);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

let modalDismiss = null;
function showModal(html, onDismiss = null) {
  card.innerHTML = html;
  modal.classList.remove('hidden');
  modalDismiss = onDismiss;
  card.scrollTop = 0;
  card.querySelector('[data-focus]')?.focus({ preventScroll: true });
}
function closeModal() {
  modal.classList.add('hidden');
  modalDismiss = null;
}
modal.addEventListener('click', (e) => {
  if (e.target === modal && modalDismiss) {
    const fn = modalDismiss;
    closeModal();
    fn();
  }
});
card.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  sound.click();
  actions[b.dataset.act]?.(b);
});

const actions = {
  close: () => { const fn = modalDismiss; closeModal(); fn?.(); },
  play: (b) => startLevel(+b.dataset.i),
  next: () => { const i = run.i + 1; exitLevel(i); },
  replay: () => startLevel(run.i),
  map: () => exitLevel(),
  resume: () => closeModal(),
  restart: () => startLevel(run.i),
  more: () => {
    run.moves += 5;
    run.extraUsed = true;
    run.over = false;
    closeModal();
    refreshHud();
    toast('+5 moves! This attempt can now earn at most ★.', 'hint');
  },
  sound: (b) => {
    progress.sound = !progress.sound;
    sound.muted = !progress.sound;
    b.setAttribute('aria-checked', progress.sound);
  },
  teacher: (b) => {
    progress.teacher = !progress.teacher;
    b.setAttribute('aria-checked', progress.teacher);
    map.refresh();
  },
  reset: () => {
    if (!confirm('Reset all your stars? This cannot be undone.')) return;
    progress.reset();
    map.refresh();
    updateTotal();
    map.focus(0);
    closeModal();
  },
  copy: (b) => {
    const text = b.previousElementSibling.textContent;
    navigator.clipboard?.writeText(text).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = 'Copy'), 1400); }, () => {});
  },
  ...(cfg.actions || {}),
};

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modal.classList.contains('hidden')) actions.close();
    else if (mode === 'level' && !run?.over) openPause();
  }
  if (mode === 'level' && (e.key === 'h' || e.key === 'H') && modal.classList.contains('hidden')) showHint();
});

// ───────────────────────────── level card
function starsHtml(n, animate = false) {
  return `<div class="big-stars" aria-label="${n} of 3 stars">${[0, 1, 2].map((k) => `<span class="${!animate && k < n ? 'on' : ''}">★</span>`).join('')}</div>`;
}

function openLevelCard(i) {
  const level = LEVELS[i];
  const world = WORLDS[level.world];
  const facts = [];
  if (level.boss) facts.push('<span class="fact">👑 Boss level</span>');
  if (level.moves) facts.push(`<span class="fact">👣 ${level.moves} moves</span>`);
  if (level.lab) facts.push('<span class="fact">🧪 Hands-on lab</span>');
  showModal(`
    <button class="close-x" data-act="close" aria-label="Close">✕</button>
    <div class="ribbon ${level.boss ? 'boss' : ''}">${WORD} ${i + 1}</div>
    <div class="eyebrow">${world.emoji} ${esc(world.name)} · ${esc(world.tagline)}</div>
    <h2>${esc(level.title)}</h2>
    ${starsHtml(progress.stars(level.id))}
    <div class="idea"><div class="tag">${IDEA}</div><p>${level.concept}</p></div>
    <h3>🎯 Your goal</h3><p>${level.goal}</p>
    <div class="facts">${facts.join('')}</div>
    <div class="actions"><button class="candy-btn green big" data-act="play" data-i="${i}" data-focus>▶ Play</button></div>
  `, () => {});
}

// ───────────────────────────── the level HUD and dock
function refreshHud() {
  if (!run) return;
  const left = run.moves - run.used;
  $('moves').textContent = Math.max(left, 0);
  $('moves').parentElement.classList.toggle('low', left <= 3 && !run.over);
  const meter = $('star-meter');
  if (run.starMode === 'engine') {
    meter.innerHTML = '<span>★</span><span>★</span><span>★</span><small class="meter-note">stars depend on how well you do</small>';
  } else {
    const s = run.extraUsed ? 1 : parStars(run.used);
    meter.innerHTML = [0, 1, 2].map((k) => `<span class="${k < s ? '' : 'lost'}">★</span>`).join('') + (run.par != null ? `<small class="meter-note">★★★ in ${run.par} move${run.par === 1 ? '' : 's'} or fewer</small>` : '');
  }
}

function parStars(used) {
  if (run.par == null) return 3;
  if (used <= run.par) return 3;
  if (used <= run.par + Math.ceil((run.moves - run.par) / 2)) return 2;
  return 1;
}

// Runs an engine action; if it throws, unlock the level instead of leaving it stuck.
function guard(fn) {
  Promise.resolve().then(fn).catch((err) => {
    console.error(err);
    ctx.busy = false;
    toast('Oops, something went wrong in this level. Try again or restart it.', 'bad');
  });
}

const ui = {
  clear() { dock.innerHTML = ''; },
  group(labelText = '', parent = dock) {
    const g = document.createElement('div');
    g.className = 'group';
    if (labelText) g.innerHTML = `<span class="glabel">${labelText}</span>`;
    parent.append(g);
    return g;
  },
  break() {
    const b = document.createElement('div');
    b.className = 'break';
    dock.append(b);
  },
  // A button. cost = moves it spends (shown as a chip); fn runs only if the moves are available.
  button(labelHtml, fn, { parent = dock, cls = '', cost = 0, title = '' } = {}) {
    const b = document.createElement('button');
    b.className = `candy-btn ${cls}`;
    b.innerHTML = labelHtml + (cost ? ` <span class="cost">−${cost}</span>` : '');
    if (title) b.title = title;
    b.addEventListener('click', () => {
      if (!run || run.over || ctx.busy) return;
      if (cost && !ctx.move(cost)) return;
      sound.click();
      guard(() => fn(b));
    });
    parent.append(b);
    return b;
  },
  // A − value + stepper over a list of values.
  stepper(labelText, values, index, onChange, { parent = dock, format = (v) => v, cost = 0 } = {}) {
    const el = document.createElement('div');
    el.className = 'stepper';
    el.innerHTML = `<span class="sl">${labelText}</span><button aria-label="Decrease ${labelText}">−</button><span class="sv"></span><button aria-label="Increase ${labelText}">+</button>`;
    const [minus, plus] = el.querySelectorAll('button');
    const sv = el.querySelector('.sv');
    const api = {
      el,
      index,
      get value() { return values[api.index]; },
      set(i) {
        api.index = i;
        sv.textContent = format(values[i]);
        minus.disabled = i <= 0;
        plus.disabled = i >= values.length - 1;
      },
    };
    const go = (d) => {
      const i = api.index + d;
      if (!run || run.over || ctx.busy || i < 0 || i >= values.length) return;
      if (cost && !ctx.move(cost)) return;
      sound.click();
      const old = api.index;
      api.set(i);
      guard(() => { if (onChange(values[i], i, old) === false) api.set(old); });
    };
    minus.addEventListener('click', () => go(-1));
    plus.addEventListener('click', () => go(1));
    api.set(index);
    parent.append(el);
    return api;
  },
};

const ctx = {
  THREE, stage, sound, ui, toast, busy: false,
  get params() { return run.level.params || {}; },
  get level() { return run.level; },
  get world() { return run.world; },
  get movesLeft() { return run.moves - run.used; },
  get over() { return run.over; },
  // Engines that work out the fewest moves (par) set the budget here.
  budget({ moves, par, stars } = {}) {
    if (moves != null) run.moves = moves;
    if (par !== undefined) run.par = par;
    if (stars) run.starMode = stars;
    refreshHud();
  },
  move(n = 1) {
    if (run.over) return false;
    if (run.moves - run.used < n) {
      toast(n > 1 ? `That needs ${n} moves.` : 'No moves left!', 'bad');
      return false;
    }
    run.used += n;
    run.checkAt = performance.now() + 700;
    refreshHud();
    return true;
  },
  refund(n) {
    run.used = Math.max(0, run.used - n);
    refreshHud();
  },
  goal(html) { $('goal').innerHTML = html; },
  round(i, n) {
    $('round').textContent = `Round ${i} of ${n}`;
    $('round').classList.toggle('hidden', n <= 1);
  },
  status(html) {
    statusEl.innerHTML = html || '';
    statusEl.classList.toggle('hidden', !html);
    layout();
  },
  // opts.stars overrides the move-based stars; opts.note adds a line to the result.
  win(opts = {}) {
    if (run.over) return;
    run.over = true;
    run.won = true;
    setTimeout(() => finishWin(opts), opts.delay ?? 900);
  },
  fail(reason, kind = 'fail') {
    if (run.over) return;
    run.over = true;
    setTimeout(() => finishFail(reason, kind), 900);
  },
};

async function startLevel(i) {
  closeModal();
  const level = LEVELS[i];
  const world = WORLDS[level.world];
  let mod;
  try {
    mod = await cfg.loadEngine(level.engine);
  } catch (err) {
    console.error(err);
    toast('This level failed to load. Check your connection and try again.', 'bad');
    return;
  }
  run?.engine?.dispose?.();
  mode = 'level';
  map.active = false;
  stage.active = true;
  stage.begin(world);
  ctx.busy = false;
  run = { i, level, world, moves: level.moves ?? 20, par: level.par ?? null, used: 0, over: false, won: false, extraUsed: false, hint: 0, starMode: 'par', checkAt: 0 };
  $('map-hud').classList.add('hidden');
  $('world-chip').classList.add('hidden');
  hideTip();
  $('level-hud').classList.remove('hidden');
  dock.classList.remove('hidden');
  $('lvl-tag').textContent = `${level.boss ? '👑 ' : ''}${WORD} ${i + 1} · ${level.title}`;
  ctx.goal(level.goal);
  ctx.round(1, 1);
  ctx.status('');
  ui.clear();
  try {
    run.engine = mod.default(ctx) || {};
  } catch (err) {
    console.error(err);
    exitLevel();
    toast('This level hit an error while loading. Please try another level.', 'bad');
    return;
  }
  refreshHud();
  layout();
  sound.zone();
}

function exitLevel(nextIndex = null) {
  closeModal();
  const prev = run;
  prev?.engine?.dispose?.();
  stage.active = false;
  stage.begin(prev ? prev.world : WORLDS[0]);
  mode = 'map';
  map.active = true;
  $('level-hud').classList.add('hidden');
  dock.classList.add('hidden');
  statusEl.classList.add('hidden');
  $('map-hud').classList.remove('hidden');
  $('world-chip').classList.remove('hidden');
  map.refresh();
  updateTotal();
  if (prev?.newlyUnlocked != null) map.hopTo(prev.newlyUnlocked).then(() => nextIndex != null && openLevelCard(nextIndex));
  else {
    map.focus(nextIndex ?? prev?.i ?? 0);
    if (nextIndex != null && nextIndex < LEVELS.length) openLevelCard(nextIndex);
  }
  run = null;
}

function finishWin(opts) {
  const level = run.level;
  let stars = opts.stars ?? parStars(run.used);
  if (run.extraUsed) stars = 1;
  const before = progress.stars(level.id);
  const wasUnlocked = run.i + 1 < LEVELS.length && unlocked(run.i + 1);
  progress.setStars(level.id, stars);
  if (!wasUnlocked && run.i + 1 < LEVELS.length) run.newlyUnlocked = run.i + 1;
  const left = Math.max(run.moves - run.used, 0);
  const score = stars * 1000 + left * 100;
  const praise = stars === 3 ? (level.boss ? 'Divine!' : 'Delicious!') : stars === 2 ? 'Tasty!' : 'Sweet!';
  const last = run.i === LEVELS.length - 1;
  const extra = cfg.afterWin?.({ index: run.i, level, stars, before }) || '';

  const t = stage.target || new THREE.Vector3();
  for (let k = 0; k < 4; k++) setTimeout(() => stage.fx.burst(t.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 3, 0)), CONFETTI, 26, 5), k * 160);
  sound.fanfare?.();

  const lab = level.lab ? `
    <details class="snack"><summary>🧪 Try it for real: ${esc(level.lab.title)}</summary><div class="body">
      ${(level.lab.steps || []).map((s) => `<p>${s}</p>`).join('')}
      ${level.lab.cmds.map((c) => `<div class="cmd"><pre class="code">${esc(c)}</pre><button data-act="copy">Copy</button></div>`).join('')}
    </div></details>` : '';
  showModal(`
    <div class="ribbon ${level.boss ? 'boss' : ''}">${praise}</div>
    <div class="eyebrow">${WORD} ${run.i + 1} · ${esc(level.title)} complete</div>
    ${starsHtml(stars, true)}
    <div class="score">Score ${score.toLocaleString()}${before >= stars && before ? ` · best ★${before}` : ''}</div>
    ${opts.note ? `<p style="text-align:center">${opts.note}</p>` : ''}
    ${run.extraUsed ? '<p style="text-align:center"><small>You used extra moves, so this run earns one star. Replay for more!</small></p>' : ''}
    <div class="idea"><div class="tag">🧠 What you just learned</div><p>${level.learn}</p></div>
    <details class="snack" ${level.lab ? '' : 'open'}><summary>🧑‍💻 Code snack: the same idea in real code</summary><div class="body"><pre class="code">${esc(level.code)}</pre></div></details>
    ${lab}
    ${extra}
    ${last ? cfg.finished?.({ total: progress.total(), max: MAX_STARS }) || `<p style="text-align:center"><b>🎓 You finished ${esc(cfg.title)} with ${progress.total()} of ${MAX_STARS} stars!</b></p>` : ''}
    <div class="actions">
      <button class="candy-btn ghost" data-act="map">🗺 Map</button>
      <button class="candy-btn blue" data-act="replay">↻ Replay</button>
      ${last ? '' : '<button class="candy-btn green" data-act="next" data-focus>Next ▶</button>'}
    </div>
  `);
  requestAnimationFrame(() => {
    card.querySelectorAll('.big-stars span').forEach((s, k) => {
      if (k < stars) setTimeout(() => { s.classList.add('on'); sound.collect(); }, 350 + k * 380);
    });
  });
  updateTotal();
}

function finishFail(reason, kind) {
  sound.thud();
  const canBuy = kind === 'moves' && !run.extraUsed;
  const hint = run.level.hints?.[run.hint % (run.level.hints.length || 1)];
  showModal(`
    <div class="ribbon fail">${kind === 'moves' ? 'Out of moves!' : 'Level failed'}</div>
    <div class="eyebrow">${WORD} ${run.i + 1} · ${esc(run.level.title)}</div>
    <p style="text-align:center;font-size:1.1rem">${reason}</p>
    ${hint ? `<div class="idea"><div class="tag">💡 Hint</div><p>${hint}</p></div>` : ''}
    <div class="actions">
      <button class="candy-btn ghost" data-act="map">🗺 Map</button>
      ${canBuy ? '<button class="candy-btn orange" data-act="more">+5 moves (max ★)</button>' : ''}
      <button class="candy-btn green" data-act="restart" data-focus>↻ Try again</button>
    </div>
  `);
}

function openPause() {
  showModal(`
    <button class="close-x" data-act="close" aria-label="Close">✕</button>
    <div class="ribbon">Paused</div>
    <div class="eyebrow">${WORD} ${run.i + 1} · ${esc(run.level.title)}</div>
    <div class="idea"><div class="tag">${IDEA}</div><p>${run.level.concept}</p></div>
    <div class="settings-row"><span>Sound</span><button class="switch" role="switch" aria-checked="${progress.sound}" data-act="sound" aria-label="Sound"></button></div>
    <div class="actions">
      <button class="candy-btn ghost" data-act="map">🗺 Exit to map</button>
      <button class="candy-btn blue" data-act="restart">↻ Restart</button>
      <button class="candy-btn green" data-act="resume" data-focus>▶ Resume</button>
    </div>
  `, () => {});
}

function showHint() {
  const hints = run?.level.hints || [];
  if (!hints.length) return;
  toast(`💡 ${hints[run.hint % hints.length]}`, 'hint', 5200);
  run.hint++;
}

$('btn-hint').addEventListener('click', () => { sound.click(); showHint(); });
$('btn-pause').addEventListener('click', () => { sound.click(); if (run && !run.over) openPause(); });
$('btn-settings').addEventListener('click', () => {
  sound.click();
  showModal(`
    <button class="close-x" data-act="close" aria-label="Close">✕</button>
    <div class="ribbon">Settings</div>
    <div class="settings-row"><span>Sound</span><button class="switch" role="switch" aria-checked="${progress.sound}" data-act="sound" aria-label="Sound"></button></div>
    <div class="settings-row"><span>Teacher mode<small>Unlock every ${WORD.toLowerCase()}, for demos and classes</small></span><button class="switch" role="switch" aria-checked="${progress.teacher}" data-act="teacher" aria-label="Teacher mode"></button></div>
    <div class="settings-row"><span>Reset progress<small>Clears what this course saved in this browser</small></span><button class="candy-btn small ghost" data-act="reset">Reset</button></div>
    <p><small>${cfg.about || ''}</small></p>
  `, () => {});
});

function updateTotal() {
  $('total-stars').textContent = progress.total();
}

function hideTip() {
  if (!$('map-tip').classList.contains('hidden')) {
    $('map-tip').classList.add('hidden');
    progress.seenTip = true;
  }
}

// Keep the 3D framing clear of the HUD at the top and the dock at the bottom.
function layout() {
  if (mode !== 'level') return;
  const hudB = $('level-hud').getBoundingClientRect().bottom;
  const dockH = dock.getBoundingClientRect().height;
  statusEl.style.bottom = `${dockH + 4}px`;
  const statusH = statusEl.classList.contains('hidden') ? 0 : statusEl.getBoundingClientRect().height + 6;
  stage.insets = { top: hudB + 8, bottom: dockH + statusH + 8 };
  stage.applyFrame();
}
new ResizeObserver(layout).observe(dock);
new ResizeObserver(layout).observe(statusEl);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  map.resize();
  layout();
}
addEventListener('resize', resize);

function checkMoves() {
  if (!run || run.over || run.moves - run.used > 0 || ctx.busy) return;
  if (performance.now() < run.checkAt) return;
  run.over = true;
  finishFail(run.level.outOfMoves || 'You ran out of moves before reaching the goal.', 'moves');
}

let last = performance.now();
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  if (mode === 'map') {
    map.update(dt);
    renderer.render(map.scene, map.camera);
  } else {
    stage.update(dt);
    run?.engine?.update?.(dt);
    checkMoves();
    renderer.render(stage.scene, stage.camera);
  }
}

async function boot() {
  try {
    await Promise.race([
      Promise.all(['600 64px Fredoka', '700 64px Fredoka', '500 48px "JetBrains Mono"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  for (const b of cfg.hudButtons || []) {
    const el = document.createElement('button');
    el.className = 'round-btn';
    el.title = b.title;
    el.setAttribute('aria-label', b.title);
    el.innerHTML = b.icon;
    el.addEventListener('click', () => { sound.click(); b.onClick(api); });
    $('btn-settings').before(el);
  }
  map.build();
  map.active = true;
  resize();
  updateTotal();
  let current = LEVELS.findIndex((l, i) => unlocked(i) && !progress.stars(l.id));
  if (current < 0) current = LEVELS.length - 1;
  map.focus(current, false);
  map.onWorld(LEVELS[current].world);
  $('loader').remove();
  $('map-hud').classList.remove('hidden');
  $('world-chip').classList.remove('hidden');
  if (!progress.seenTip) $('map-tip').classList.remove('hidden');
  renderer.setAnimationLoop(loop);
  // ?debug exposes a hook for testing levels from the console
  // (and keeps the game running in hidden test panes, where requestAnimationFrame is throttled)
  if (new URLSearchParams(location.search).has('debug')) {
    window.saga = { start: startLevel, ctx, get run() { return run; } };
    setInterval(() => loop(performance.now()), 16);
  }
  const m = /^#level-(\d+)$/.exec(location.hash);
  if (m && LEVELS[m[1] - 1] && unlocked(m[1] - 1)) { map.focus(m[1] - 1, false); openLevelCard(m[1] - 1); }
  cfg.onReady?.(api);
}

// What a course can use for its own popups and saved data.
const api = {
  showModal, closeModal, toast, progress, sound, unlocked,
  levels: LEVELS, worlds: WORLDS,
  refresh() { map.refresh(); updateTotal(); },
  get inLevel() { return mode === 'level'; },
};

boot();
return api;
}
