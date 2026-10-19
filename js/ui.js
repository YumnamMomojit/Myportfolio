import { PROFILE, EXPERIENCE, PROJECTS, ARCHIVE, SKILLS, EDUCATION, CERTIFICATIONS, PUBLICATIONS, THESES, JOURNEY, TASKS } from './data.js';
import { INDIA, MANIPUR } from './india.js';
import { esc } from './utils.js';

const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------- content

const chips = (items, color) =>
  `<div class="chips">${items.map((t) => `<span class="chip"${color ? ` style="--c:${color}"` : ''}>${esc(t)}</span>`).join('')}</div>`;
const bullets = (items) => `<ul class="bullets">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
const extLink = (url, label, cls = 'btn small') => `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;

// ---------------------------------------------------------------- India map (SVG)

const KX = Math.cos((22.5 * Math.PI) / 180) * 10;
const LON0 = 67.5, LAT1 = 37.6;
const P = (lon, lat) => [+((lon - LON0) * KX).toFixed(1), +((LAT1 - lat) * 10).toFixed(1)];
const VIEW = `0 0 ${Math.ceil((97.8 - LON0) * KX)} ${Math.ceil((LAT1 - 6.4) * 10)}`;
const ringPath = (ring) => 'M' + ring.map(([lo, la]) => P(lo, la).join(',')).join('L') + 'Z';
const INDIA_D = INDIA.map(ringPath).join('');
const MANIPUR_D = ringPath(MANIPUR);

export function indiaMap(activeId = null) {
  const route = JOURNEY.filter((s) => !s.event);
  const arcs = [];
  const curve = (a, b, cls) => {
    const [x1, y1] = P(a.lon, a.lat), [x2, y2] = P(b.lon, b.lat);
    const lift = Math.hypot(x2 - x1, y2 - y1) * 0.3;
    arcs.push(`<path class="${cls}" d="M${x1},${y1} Q${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2 - lift).toFixed(1)} ${x2},${y2}"/>`);
  };
  for (let i = 0; i < route.length - 1; i++) curve(route[i], route[i + 1], 'arc');
  const pune = JOURNEY.find((s) => s.current);
  for (const ev of JOURNEY.filter((s) => s.event)) curve(pune, ev, 'arc side');

  const pins = JOURNEY.map((s) => {
    const [x, y] = P(s.lon, s.lat);
    const kind = s.home ? 'home' : s.current ? 'now' : s.event ? 'event' : 'stop';
    const left = s.side === 'left';
    const name = s.place.split(',')[0];
    return `<a href="#" class="pin ${kind}${s.id === activeId ? ' active' : ''}" data-open="city:${s.id}" aria-label="${esc(s.place)} — ${esc(s.when)}">
      ${s.home ? `<circle class="pulse" cx="${x}" cy="${y}" r="5"/><circle class="pulse late" cx="${x}" cy="${y}" r="5"/>` : ''}
      <circle class="dot" cx="${x}" cy="${y}" r="${s.home ? 4.6 : 3.4}"/>
      <text x="${left ? x - 7 : x + 7}" y="${y + 3}" text-anchor="${left ? 'end' : 'start'}">${s.home ? '⌂ ' : ''}${esc(name)}</text>
    </a>`;
  }).join('');

  return `<svg class="india" viewBox="${VIEW}" role="group" aria-label="Map of India showing my journey from my hometown Thoubal, Manipur">
    <defs><linearGradient id="landg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e2e8f0"/><stop offset="0.18" stop-color="#9c8b74"/><stop offset="0.3" stop-color="#a7c957"/>
      <stop offset="0.65" stop-color="#7fb069"/><stop offset="1" stop-color="#4f9d3a"/></linearGradient></defs>
    <path class="land" d="${INDIA_D}"/>
    <path class="mani" d="${MANIPUR_D}"/>
    ${arcs.join('')}
    ${pins}
  </svg>`;
}

function journeyList(activeId) {
  return `<ol class="stops">${JOURNEY.map((s) => `<li class="${s.id === activeId ? 'active' : ''}${s.home ? ' home' : ''}">
    <button data-open="city:${s.id}"><b>${esc(s.place)}</b><small>${esc(s.when)} · ${esc(s.title)}</small></button></li>`).join('')}</ol>`;
}

function recommendation() {
  const r = PROFILE.recommendation;
  if (!r) return '';
  return `<blockquote class="quote">“${esc(r.quote)}”<cite>— ${esc(r.name)}, ${esc(r.context)}</cite></blockquote>`;
}

const pubLink = (p) => (p.url ? extLink(p.url, 'View') : `<span class="tag">${esc(p.note || '')}</span>`);

// the standalone courses under courses/; each has its own "← Portfolio" link back here
export const COURSES = [
  {
    id: 'ai-engineer', name: 'AI Engineer Saga', icon: '🍬', color: '#f5b301', url: './courses/ai-engineer/',
    blurb: 'A playable AI-engineer course: 39 gold-and-green 3D levels across 12 worlds, from Python and linear algebra to RAG, agents, Kubernetes and evals.',
    how: 'Each level turns one idea into a small puzzle: earn ★★★ by finishing within par, unlock the next level on the saga map, and see the real code behind what you just did.',
  },
  {
    id: 'agentic-ai', name: 'Agentic AI Saga', icon: '🤖', color: '#1fa45c', url: './courses/agentic-ai/',
    blurb: 'A playable Agentic AI course: 40 gold-and-green 3D chapters across 10 parts, from the agent loop and tool use to MCP, memory, multi-agent systems, safety and shipping.',
    how: 'Each part ends in a 👑 boss and earns its own certificate; finish all ten to unlock a final project, built in your own GitHub repository and verified there.',
  },
];
export const courseById = (id) => COURSES.find((c) => c.id === id);

function linksRow() {
  const L = PROFILE.links;
  return `<div class="link-row">
    <a class="btn small primary" href="mailto:${esc(L.email)}">✉ Email</a>
    ${extLink(L.linkedin, 'LinkedIn')}
    ${extLink(L.github, 'GitHub')}
    ${extLink(L.stackoverflow, 'Stack Overflow')}
  </div>`;
}

export function panelContent(id, state) {
  if (id === 'about') {
    return {
      kicker: 'Profile Totem', title: PROFILE.name, color: '#5eead4',
      html: `<p class="lead">${esc(PROFILE.title)}</p>
        ${chips(PROFILE.focus, '#5eead4')}
        <p>${esc(PROFILE.summary)}</p>
        <div class="stats">${PROFILE.stats.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>
        ${recommendation()}
        <p class="muted">🏠 Hometown: ${esc(PROFILE.hometown)} · 📍 Based in ${esc(PROFILE.location)} · Languages: ${esc(PROFILE.languages.join(', '))}</p>
        ${linksRow()}`,
    };
  }
  if (id === 'tasks') {
    const done = new Set(state.done);
    const earned = TASKS.filter((t) => done.has(t.id)).reduce((a, t) => a + t.pts, 0);
    const total = TASKS.reduce((a, t) => a + t.pts, 0);
    return {
      kicker: 'Challenge Board', title: 'Win points, unlock celebrations', color: '#fbbf24',
      html: `<p class="lead">Complete challenges around the island to earn points. ${done.size}/${TASKS.length} done · ${earned}/${total} challenge points.</p>
        <ul class="task-cards">${TASKS.map((t) => {
          const n = Math.min(t.goal, Math.floor(state.tasks[t.id] || 0));
          return `<li class="${done.has(t.id) ? 'done' : ''}"><span class="ti">${t.icon}</span><div>
            <b>${esc(t.title)}</b><small>${esc(t.hint)}</small>
            <div class="bar"><i style="width:${(n / t.goal) * 100}%"></i></div></div>
            <span class="pts">${done.has(t.id) ? '✔' : `+${t.pts}`}</span></li>`;
        }).join('')}</ul>
        <p class="muted">Bonus points: every skill orb (+50), hidden gem (+50), basket (+20), stunt (+25) and new zone (+100).</p>`,
    };
  }
  if (id === 'journey') {
    return {
      kicker: 'India Journey Map', title: 'From Thoubal to Pune', color: '#fb923c',
      html: `<p class="lead">My path across India — it starts at home in <b>Thoubal, Manipur</b>. Tap a pin or a stop to explore.</p>
        <div class="journey">${indiaMap()}${journeyList()}</div>`,
    };
  }
  if (id.startsWith('city:')) {
    const i = JOURNEY.findIndex((s) => s.id === id.slice(5));
    const s = JOURNEY[i];
    const prev = JOURNEY[i - 1], next = JOURNEY[i + 1];
    return {
      kicker: s.home ? 'Hometown' : `India Journey · ${s.when}`, title: s.place, color: s.home ? '#fb923c' : s.current ? '#5eead4' : s.event ? '#c084fc' : '#fbbf24',
      html: `<div class="journey">${indiaMap(s.id)}<div>
          <p class="lead">${esc(s.title)}</p>
          <p class="period">${esc(s.when)}${s.current ? ' <span class="live">● current</span>' : ''}</p>
          <p>${esc(s.text)}</p>
          <p class="muted">${s.lat.toFixed(2)}° N, ${s.lon.toFixed(2)}° E</p>
        </div></div>
        <div class="pager">
          ${prev ? `<button class="btn small" data-open="city:${prev.id}">← ${esc(prev.place.split(',')[0])}</button>` : '<span></span>'}
          <button class="btn small" data-open="journey">Whole journey</button>
          ${next ? `<button class="btn small" data-open="city:${next.id}">${esc(next.place.split(',')[0])} →</button>` : '<span></span>'}
        </div>`,
    };
  }
  if (id.startsWith('exp:')) {
    const i = +id.slice(4);
    const e = EXPERIENCE[i];
    return {
      kicker: `Career Timeline · ${i + 1} / ${EXPERIENCE.length}`, title: e.role, color: e.current ? '#5eead4' : '#fbbf24',
      html: `<p class="lead">${esc(e.org)}</p>
        <p class="period">${esc(e.period)}${e.current ? ' <span class="live">● current</span>' : ''}</p>
        ${bullets(e.points)}
        ${chips(e.tags, '#fbbf24')}
        <div class="pager">
          ${i > 0 ? `<button class="btn small" data-open="exp:${i - 1}">← ${esc(EXPERIENCE[i - 1].short)}</button>` : '<span></span>'}
          ${i < EXPERIENCE.length - 1 ? `<button class="btn small" data-open="exp:${i + 1}">${esc(EXPERIENCE[i + 1].short)} →</button>` : ''}
        </div>`,
    };
  }
  if (id === 'proj:archive') {
    return {
      kicker: 'Project Data Center', title: 'Project Archive', color: '#60a5fa',
      html: `<p class="lead">Research, ML and integration work.</p>
        <div class="cards">${ARCHIVE.map((p) => `<div class="card"><h4>${esc(p.name)}</h4><p>${esc(p.desc)}</p><span class="tag">${esc(p.tech)}</span></div>`).join('')}</div>`,
    };
  }
  if (id.startsWith('proj:')) {
    const i = +id.slice(5);
    const p = PROJECTS[i];
    return {
      kicker: `Project ${i + 1} / ${PROJECTS.length}`, title: p.name, color: p.color,
      html: `<p class="lead">${esc(p.client)}${p.role ? ` · ${esc(p.role)}` : ''}</p>
        ${bullets(p.points)}
        ${chips(p.tech, p.color)}
        <div class="pager">
          ${i > 0 ? `<button class="btn small" data-open="proj:${i - 1}">← Prev</button>` : '<span></span>'}
          ${p.link ? extLink(p.link.url, p.link.label, 'btn small primary') : ''}
          ${i < PROJECTS.length - 1 ? `<button class="btn small" data-open="proj:${i + 1}">Next →</button>` : ''}
        </div>`,
    };
  }
  if (id === 'skills') {
    const got = new Set(state.orbs);
    return {
      kicker: 'The Skill Tree', title: 'Skills & Tools', color: '#4ade80',
      html: `<p class="lead">Each branch lights up when you collect its Skill Orb (${got.size}/${SKILLS.length} found).</p>
        <div class="skill-grid">${SKILLS.map((s, i) => `<div class="skill ${got.has(i) ? 'got' : ''}" style="--c:${s.color}">
          <h4><span class="dot"></span>${esc(s.name)}${got.has(i) ? ' <small>✓ collected</small>' : ''}</h4>
          ${chips(s.items)}</div>`).join('')}</div>`,
    };
  }
  if (id === 'education') {
    return {
      kicker: 'Hall of Credentials', title: 'Education & Certifications', color: '#f472b6',
      html: `<h3>Education</h3>
        <div class="cards">${EDUCATION.map((e) => `<div class="card"><h4>${esc(e.degree)}</h4><p>${esc(e.school)}</p><span class="tag">${esc(e.period)} · ${esc(e.score)}</span></div>`).join('')}</div>
        <h3>Certifications</h3>
        <ul class="certs">${CERTIFICATIONS.map((c) => `<li class="${c.highlight ? 'hl' : ''}"><span>🏅</span><div><b>${esc(c.name)}</b><small>${esc(c.issuer)}</small></div></li>`).join('')}</ul>`,
    };
  }
  if (id === 'publications') {
    return {
      kicker: 'Research Library', title: 'Publications & Theses', color: '#c084fc',
      html: `<h3>Publications</h3>
        <div class="cards">${PUBLICATIONS.map((p) => `<div class="card"><h4>${esc(p.title)}</h4><p>${esc(p.venue)}</p>${pubLink(p)}</div>`).join('')}</div>
        <h3>Theses</h3>
        <div class="cards">${THESES.map((t) => `<div class="card"><h4>${esc(t.title)}</h4><span class="tag">Thesis</span></div>`).join('')}</div>`,
    };
  }
  if (id === 'contact') {
    const L = PROFILE.links;
    return {
      kicker: 'Signal Beacon', title: "Let's connect", color: '#f87171',
      html: `<p class="lead">Open to AI research collaborations, agentic-AI projects, academic partnerships, cloud training and consulting.</p>
        <div class="contact-grid">
          <a class="contact" href="mailto:${esc(L.email)}"><span>✉</span><div><b>Email</b><small>${esc(L.email)}</small></div></a>
          <a class="contact" href="${esc(L.linkedin)}" target="_blank" rel="noopener noreferrer"><span>in</span><div><b>LinkedIn</b><small>yumnam-momojit-singh</small></div></a>
          <a class="contact" href="${esc(L.github)}" target="_blank" rel="noopener noreferrer"><span>⌥</span><div><b>GitHub</b><small>@YumnamMomojit</small></div></a>
          <a class="contact" href="${esc(L.stackoverflow)}" target="_blank" rel="noopener noreferrer"><span>⧉</span><div><b>Stack Overflow</b><small>yumnam-momojit</small></div></a>
        </div>
        <h3>Services</h3>
        ${chips(PROFILE.services, '#f87171')}
        <button class="btn small" data-copy="${esc(L.email)}">Copy email address</button>
        <p class="muted">📍 ${esc(PROFILE.location)}</p>`,
    };
  }
  if (id === 'secret') {
    return {
      kicker: 'Secret found!', title: 'The Cloud Cache', color: '#fde68a',
      html: `<p class="lead">You bounced all the way up here — that's the spirit of a good cloud engineer: always scaling up. ☁️</p>
        <div class="stats">
          <div class="stat"><b>590+</b><span>students trained in one programme</span></div>
          <div class="stat"><b>${SKILLS[0].items.length}</b><span>AWS services in the toolkit</span></div>
          <div class="stat"><b>${state.xp}</b><span>XP you've earned on this island</span></div>
        </div>
        <p class="muted">Tip: knock a service crate off the edge for a hidden achievement.</p>`,
    };
  }
  return { kicker: '', title: 'Unknown', html: '' };
}

// ---------------------------------------------------------------- overlays

let lastFocus = null;
const stack = [];

export function isOverlayOpen() {
  return stack.length > 0;
}

export function openOverlay(el) {
  if (!stack.includes(el)) stack.push(el);
  lastFocus = document.activeElement;
  el.classList.remove('hidden');
  requestAnimationFrame(() => el.querySelector('[data-autofocus], button, a')?.focus());
}

export function closeTop() {
  const el = stack.pop();
  if (!el) return false;
  el.classList.add('hidden');
  if (!stack.length) {
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.blur();
    document.getElementById('scene').focus({ preventScroll: true });
  }
  return true;
}

export function showPanel(id, state) {
  const c = panelContent(id, state);
  $('#panel').classList.remove('docked');
  $('#panel-kicker').textContent = c.kicker;
  $('#panel-title').textContent = c.title;
  $('#panel-body').innerHTML = c.html;
  $('#panel .panel').style.setProperty('--accent', c.color || '#5eead4');
  $('#panel-body').scrollTop = 0;
  const el = $('#panel');
  if (!stack.includes(el)) openOverlay(el);
  else $('#panel-close').focus();
}

// ---------------------------------------------------------------- HUD

export function setExplorer(name) {
  const shown = name || 'Guest Explorer';
  $('#pc-name').textContent = shown;
  const initials = (name || 'Guest').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  $('#pc-avatar').textContent = initials;
}

// A panel whose body the caller fills and manages (used by the lessons).
export function showRawPanel({ kicker, title, color, html, dock = false }) {
  $('#panel').classList.toggle('docked', dock); // docked: the world stays visible beside the panel
  $('#panel-kicker').textContent = kicker;
  $('#panel-title').textContent = title;
  const body = $('#panel-body');
  body.innerHTML = html;
  $('#panel .panel').style.setProperty('--accent', color || '#5eead4');
  body.scrollTop = 0;
  const el = $('#panel');
  if (!stack.includes(el)) openOverlay(el);
  return body;
}

const TITLES = ['Visitor', 'Explorer', 'Cloud Cadet', 'Cloud Practitioner', 'DevOps Adept', 'Solutions Architect', 'Cloud Educator', 'Cloud Legend'];
export const XP_PER_LEVEL = 250;
export const levelOf = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

export function updateHUD(state, totals) {
  const lvl = levelOf(state.xp);
  $('#lvl').textContent = `LV ${lvl}`;
  $('#lvl-title').textContent = TITLES[Math.min(lvl - 1, TITLES.length - 1)];
  $('#xpfill').style.width = `${((state.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%`;
  $('#xp-text').textContent = `${state.xp % XP_PER_LEVEL} / ${XP_PER_LEVEL} to LV ${lvl + 1}`;
  countUp(state.xp);
  const q = [
    { label: 'Discover every zone', n: state.visited.length, of: totals.zones },
    { label: 'Collect Skill Orbs', n: state.orbs.length, of: totals.orbs },
    { label: 'Unlock achievements', n: state.achievements.length, of: totals.achievements },
    { label: 'Explore the islands', n: (state.islands || []).length, of: totals.islands },
    { label: 'Earn certificates', n: (state.certs || []).length, of: 10 },
  ];
  const done = new Set(state.done || []);
  $('#task-list').innerHTML = TASKS.map((t) => {
    const n = Math.min(t.goal, Math.floor((state.tasks || {})[t.id] || 0));
    const fin = done.has(t.id);
    return `<li class="${fin ? 'done' : ''}" title="${esc(t.hint)}"><span>${t.icon} ${esc(t.title)}</span><b>${fin ? '✔' : t.goal > 1 ? `${n}/${t.goal}` : `+${t.pts}`}</b></li>`;
  }).join('');
  $('#task-count').textContent = `${done.size}/${TASKS.length}`;
  $('#quest-list').innerHTML = q
    .map((x) => `<li class="${x.n >= x.of ? 'done' : ''}"><span>${x.n >= x.of ? '✔' : '◇'} ${x.label}</span><b>${x.n}/${x.of}</b></li>`)
    .join('');
}

// The island quest card: the trial's steps, whether the way home is sealed, briefing + hint buttons.
// Tap its title to fold it down to the next step (phones start folded).
let questShown = null;
export function islandQuest(q) {
  const el = $('#isle-quest');
  questShown = q;
  if (!q) {
    el.classList.add('hidden');
    return;
  }
  if (!el.dataset.ready) {
    el.dataset.ready = '1';
    if (innerWidth < 640) el.classList.add('compact');
    el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-iq-toggle]')) return;
      el.classList.toggle('compact');
      islandQuest(questShown);
    });
  }
  const compact = el.classList.contains('compact');
  const done = q.steps.filter((s) => s.done).length;
  const steps = compact ? q.steps.filter((s) => !s.done).slice(0, 1) : q.steps;
  el.classList.remove('hidden');
  el.style.setProperty('--c', q.color);
  el.innerHTML = `<button class="iq-head" data-iq-toggle aria-expanded="${!compact}" title="${compact ? 'Show all steps' : 'Show only the next step'}"><span>${q.icon} ${esc(q.title)}</span>${q.sealed ? '<b class="iq-lock" title="The way home is sealed until you complete the trial">🔒 sealed</b>' : q.solved ? '<b class="iq-ok">✔ solved</b>' : ''}<small class="iq-count">${done}/${q.steps.length}</small></button>
    ${steps.length ? `<ol class="iq-steps">${steps.map((s) => `<li class="${s.done ? 'done' : ''}"><span>${esc(s.text)}</span>${s.of ? `<b>${s.n}/${s.of}</b>` : s.done ? '<b>✔</b>' : ''}</li>`).join('')}</ol>` : ''}
    <div class="iq-actions"><button class="btn small" data-isle-brief="${q.id}" aria-label="Island briefing">📜${compact ? '' : ' Briefing'}</button>${q.hints ? `<button class="btn small" data-isle-hint="${q.id}" aria-label="Hint">💡${compact ? '' : ' Hint'}</button>` : ''}</div>`;
}

export function levelTitle(lvl) {
  return TITLES[Math.min(lvl - 1, TITLES.length - 1)];
}

export function toast(title, sub = '', kind = 'info', icon = '✦') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="ti">${esc(icon)}</span><div><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 3400);
  setTimeout(() => el.remove(), 3900);
}

export function setPrompt(text) {
  const el = $('#prompt');
  if (!text) {
    el.classList.add('hidden');
    return;
  }
  $('#prompt-text').textContent = text;
  el.classList.remove('hidden');
}

let zoneTimer = 0;
export function zoneBanner(name, color) {
  const el = $('#zone-banner');
  el.innerHTML = `<small>Entering</small>${esc(name)}`;
  el.style.setProperty('--c', color);
  el.classList.remove('hidden', 'out');
  clearTimeout(zoneTimer);
  zoneTimer = setTimeout(() => el.classList.add('out'), 2200);
}

// ---------------------------------------------------------------- points & celebrations

let shownPts = null;
function countUp(target) {
  const el = $('#pts');
  if (shownPts === null) {
    shownPts = target;
    el.textContent = target.toLocaleString();
    return;
  }
  const from = shownPts;
  shownPts = target;
  if (from === target) return;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 900);
    el.textContent = Math.round(from + (target - from) * (1 - (1 - k) ** 3)).toLocaleString();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  const card = $('.player-card');
  card.classList.remove('bump');
  void card.offsetWidth;
  card.classList.add('bump');
}

export function floatText(text, x, y, color = '#fde68a') {
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  $('#floaters').appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

export function hint(text) {
  const el = $('#hint');
  if (!text) return el.classList.add('hidden');
  el.textContent = text;
  el.classList.remove('hidden');
}

let meterShown = false;
export function meter(m) {
  const el = $('#meter');
  if (!m) {
    if (meterShown) el.classList.add('hidden');
    meterShown = false;
    return;
  }
  if (!meterShown) el.classList.remove('hidden');
  meterShown = true;
  $('#meter-label').textContent = m.label;
  $('#meter-text').textContent = m.text;
  $('#meter-fill').style.width = `${Math.min(100, m.frac * 100)}%`;
}

const celebrations = [];
let celebrating = false;
export function celebrate(task) {
  celebrations.push(task);
  if (!celebrating) nextCelebration();
}
function nextCelebration() {
  const task = celebrations.shift();
  if (!task) {
    celebrating = false;
    return;
  }
  celebrating = true;
  const el = $('#celebrate');
  el.classList.toggle('big', !!task.big);
  $('#cel-icon').textContent = task.icon;
  $('#cel-kicker').textContent = task.big ? `Legendary${task.who ? `, ${task.who}` : ''}!` : `Well done${task.who ? `, ${task.who}` : ''}!`;
  $('#cel-title').textContent = task.title;
  $('#cel-pts').textContent = task.pts ? `+${task.pts} pts` : '🏆';
  // an optional button (e.g. "View & share" a new certificate) keeps the card up a little longer
  const btn = $('#cel-action');
  btn.classList.toggle('hidden', !task.action);
  btn.textContent = task.action?.label || '';
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(t1);
    clearTimeout(t2);
    el.classList.add('hidden');
    nextCelebration();
  };
  btn.onclick = () => {
    finish();
    task.action?.run();
  };
  el.classList.remove('hidden', 'out');
  confetti(task.big ? 320 : 160);
  const stay = (task.big ? 3800 : 2600) + (task.action ? 3200 : 0);
  const t1 = setTimeout(() => el.classList.add('out'), stay);
  const t2 = setTimeout(finish, stay + 500);
}

function confetti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confetti');
  const ctx = cv.getContext('2d');
  cv.width = innerWidth;
  cv.height = innerHeight;
  const cols = ['#fbbf24', '#f472b6', '#5eead4', '#a78bfa', '#fb923c', '#60a5fa', '#4ade80'];
  const ps = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.42,
    vx: (Math.random() - 0.5) * 16,
    vy: -6 - Math.random() * 12,
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 6,
    c: cols[Math.floor(Math.random() * cols.length)],
  }));
  const t0 = performance.now();
  const step = (now) => {
    const age = (now - t0) / 1000;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 3.2);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      ctx.restore();
    }
    if (age < 3.3) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------- maps

export function drawMap(ctx, size, data, { big = false } = {}) {
  const { zones, orbs, player, yaw, islandR, sky } = data;
  // the minimap frames Cloud Island, or follows you around the archipelago; the big map shows everything
  const onMain = Math.hypot(player.x, player.z) < islandR + 6;
  const center = big || onMain ? { x: 0, z: 0 } : { x: player.x, z: player.z };
  const range = big ? 215 : onMain ? islandR : 80;
  const s = (size / 2 - (big ? 20 : 8)) / range;
  const cx = size / 2, cy = size / 2;
  const X = (x) => cx + (x - center.x) * s, Y = (z) => cy + (z - center.z) * s;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(8,13,30,0.6)';
  ctx.fillRect(0, 0, size, size);

  // bridges, train lines and the cable car
  for (const [ax, az, bx, bz, col] of data.links || []) {
    ctx.strokeStyle = col;
    ctx.lineWidth = big ? 3 : 2;
    ctx.setLineDash(col.startsWith('#f87171') || col.startsWith('#38bdf8') ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(X(ax), Y(az));
    ctx.lineTo(X(bx), Y(bz));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // outer islands
  for (const I of data.islands || []) {
    ctx.globalAlpha = I.locked ? 0.45 : 1;
    ctx.fillStyle = I.color;
    ctx.beginPath();
    ctx.arc(X(I.x), Y(I.z), I.r * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (big || I.r * s > 14) {
      ctx.font = `600 ${big ? 13 : 10}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(`${I.locked ? '🔒 ' : ''}${I.icon} ${I.name}`, X(I.x), Y(I.z) + 4);
    }
  }

  // Cloud Island itself
  ctx.fillStyle = '#4f8f5a';
  ctx.beginPath();
  ctx.arc(X(0), Y(0), islandR * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (!big) {
    ctx.strokeStyle = 'rgba(236,220,174,0.75)';
    ctx.lineWidth = 3;
    for (const z of zones) {
      if (z.id === 'skills') continue;
      ctx.beginPath();
      ctx.moveTo(X(0), Y(z.id === 'about' ? 40 : 0));
      ctx.lineTo(X(z.x), Y(z.z));
      ctx.stroke();
    }
  }
  if (data.india) {
    ctx.fillStyle = '#c9b27c';
    ctx.beginPath();
    for (const ring of data.india) {
      ring.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Y(z)) : ctx.moveTo(X(x), Y(z))));
      ctx.closePath();
    }
    ctx.fill();
    if (data.home) {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(X(data.home.x), Y(data.home.z), big ? 2.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(X(sky.x), Y(sky.z), sky.r * s, 0, Math.PI * 2);
  ctx.fill();
  for (const z of zones) {
    ctx.fillStyle = z.color;
    ctx.globalAlpha = z.visited ? 1 : 0.55;
    ctx.beginPath();
    ctx.arc(X(z.x), Y(z.z), big ? 3.5 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (big) {
    ctx.font = '700 14px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText('☁️ Cloud Island', X(0), Y(0) + 4);
  }
  for (const o of orbs) {
    ctx.fillStyle = o.color;
    ctx.beginPath();
    const r = big ? 2.5 : 2.2;
    ctx.moveTo(X(o.x), Y(o.z) - r * 1.4);
    ctx.lineTo(X(o.x) + r, Y(o.z));
    ctx.lineTo(X(o.x), Y(o.z) + r * 1.4);
    ctx.lineTo(X(o.x) - r, Y(o.z));
    ctx.fill();
  }
  // player arrow
  ctx.save();
  ctx.translate(X(player.x), Y(player.z));
  ctx.rotate(-yaw + Math.PI);
  const a = big ? 10 : 7;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -a);
  ctx.lineTo(a * 0.7, a * 0.7);
  ctx.lineTo(0, a * 0.3);
  ctx.lineTo(-a * 0.7, a * 0.7);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- classic view

export function buildClassic() {
  const L = PROFILE.links;
  $('#classic-body').innerHTML = `
    <header class="cv-head">
      <div class="cv-avatar">${esc(PROFILE.initials)}</div>
      <div>
        <h1>${esc(PROFILE.name)}</h1>
        <p class="lead">${esc(PROFILE.title)}</p>
        ${chips(PROFILE.focus, '#5eead4')}
      </div>
    </header>
    ${linksRow()}
    <section><h2>About</h2><p>${esc(PROFILE.summary)}</p>
      <div class="stats">${PROFILE.stats.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>${recommendation()}</section>
    <section><h2>Journey across India</h2><p>From my hometown <b>${esc(PROFILE.hometown)}</b> to ${esc(PROFILE.location)}.</p>
      <div class="journey">${indiaMap()}${journeyList()}</div></section>
    <section><h2>Courses</h2><div class="cards">
      ${COURSES.map((c) => `<div class="card" style="--c:${c.color}"><h4>${c.icon} ${esc(c.name)}</h4><p>${esc(c.blurb)}</p>
        <a class="btn small primary" href="${esc(c.url)}">▶ Play the course</a></div>`).join('')}</div></section>
    <section><h2>Experience</h2>
      ${[...EXPERIENCE].reverse().map((e) => `<article class="cv-item"><div class="cv-row"><h3>${esc(e.role)}</h3><span class="period">${esc(e.period)}</span></div>
        <p class="org">${esc(e.org)}</p>${bullets(e.points)}</article>`).join('')}</section>
    <section><h2>Projects</h2><div class="cards">
      ${PROJECTS.map((p) => `<div class="card" style="--c:${p.color}"><h4>${esc(p.name)}</h4><p class="muted">${esc(p.client)}</p><p>${esc(p.points[0])}</p>
        ${chips(p.tech, p.color)}${p.link ? extLink(p.link.url, p.link.label) : ''}</div>`).join('')}
      ${ARCHIVE.map((p) => `<div class="card"><h4>${esc(p.name)}</h4><p>${esc(p.desc)}</p><span class="tag">${esc(p.tech)}</span></div>`).join('')}
    </div></section>
    <section><h2>Skills</h2><div class="skill-grid">${SKILLS.map((s) => `<div class="skill got" style="--c:${s.color}"><h4><span class="dot"></span>${esc(s.name)}</h4>${chips(s.items)}</div>`).join('')}</div></section>
    <section><h2>Education</h2><div class="cards">${EDUCATION.map((e) => `<div class="card"><h4>${esc(e.degree)}</h4><p>${esc(e.school)}</p><span class="tag">${esc(e.period)} · ${esc(e.score)}</span></div>`).join('')}</div></section>
    <section><h2>Certifications</h2><ul class="certs">${CERTIFICATIONS.map((c) => `<li class="${c.highlight ? 'hl' : ''}"><span>🏅</span><div><b>${esc(c.name)}</b><small>${esc(c.issuer)}</small></div></li>`).join('')}</ul></section>
    <section><h2>Publications</h2><div class="cards">${PUBLICATIONS.map((p) => `<div class="card"><h4>${esc(p.title)}</h4><p>${esc(p.venue)}</p>${pubLink(p)}</div>`).join('')}
      ${THESES.map((t) => `<div class="card"><h4>${esc(t.title)}</h4><span class="tag">Thesis</span></div>`).join('')}</div></section>
    <section><h2>Contact</h2><p><a href="mailto:${esc(L.email)}">${esc(L.email)}</a> · ${esc(PROFILE.location)} · ${esc(PROFILE.languages.join(', '))}</p>
      <h3>Services</h3>${chips(PROFILE.services)}</section>
    <footer class="cv-foot">Built with Three.js · © ${new Date().getFullYear()} ${esc(PROFILE.name)}</footer>`;
}
