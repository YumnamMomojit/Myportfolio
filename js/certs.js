// Micro-certifications: earned automatically from achievements, downloadable
// as a certificate image. Ten of them unlock the Grand Certificate.
import { esc } from './utils.js';
import { cyrb53 } from './puzzles.js';

export const GRAND_NEEDS = 10;
const done = (s, ...ids) => ids.every((id) => s.done.includes(id));

// `check(state, ctx)` decides when a certification is earned; `soon` ones arrive with later island updates.
export const CERTS = [
  { id: 'explorer', icon: '🧭', title: 'Cloud Island Explorer', skill: 'Navigated every zone of an interactive 3D portfolio', how: 'Discover every zone on Cloud Island.', check: (s, c) => s.visited.length >= c.zones },
  { id: 'voyager', icon: '🗺️', title: 'Archipelago Voyager', skill: 'Travelled the whole archipelago by train, cable car and bridges', how: 'Set foot on all six outer islands.', check: (s) => (s.islands || []).length >= 6 },
  { id: 'adventurer', icon: '🏆', title: 'Island Adventurer', skill: 'Completed every physical challenge: riding, stunts, hoops, jumping, gems, climbing, wading', how: 'Finish the 8 Fun Park and nature challenges.', check: (s) => done(s, 'bike', 'moto', 'hoops', 'jump', 'gems', 'summit', 'splash') },
  { id: 'agents', icon: '🤖', title: 'AI Agents Foundations', skill: 'Perceive → think → act loop, tools, memory, planning and guardrails', how: 'Pass the AI Agents lesson quiz.', check: (s) => done(s, 'learn-agent') },
  { id: 'ml', icon: '📈', title: 'Machine Learning Foundations', skill: 'Features, labels, training and supervised vs unsupervised vs reinforcement learning', how: 'Pass the Machine Learning lesson quiz.', check: (s) => done(s, 'learn-ml') },
  { id: 'deep', icon: '🧠', title: 'Deep Learning Essentials', skill: 'Neurons, layers, backpropagation and convolutional networks', how: 'Pass both the Neural Network and CNN lessons.', check: (s) => done(s, 'learn-nn', 'learn-cnn') },
  { id: 'web3d', icon: '🧊', title: '3D Web Graphics (Three.js)', skill: 'Scene, camera, renderer, meshes, materials, lights and raycasting', how: 'Pass the “How this 3D world works” lesson.', check: (s) => done(s, 'learn-three') },
  { id: 'solver', icon: '🧮', title: 'Problem Solver', skill: 'Number theory, combinatorics, probability and algorithmic thinking', how: 'Solve 3 maths and 3 programming puzzles in the Brain Arena.', check: (s) => done(s, 'puzzle-math', 'puzzle-code') },
  { id: 'cube', icon: '🧩', title: 'Cube Master', skill: 'Spatial reasoning with a 3×3 Rubik’s Cube', how: 'Solve the flying Rubik’s Cube.', check: (s) => done(s, 'rubik') },
  { id: 'heritage', icon: '🏇', title: 'Manipur Heritage', skill: 'The story of Sagol Kangjei and the Meitei calendar', how: 'Visit Thoubal, walk the Meitei calendar, finish the Sagol Kangjei story and score 3 polo goals on Manipur Island.', check: (s) => done(s, 'hometown', 'calendar', 'polo-story', 'polo') },
  { id: 'fieldml', icon: '🌲', title: 'Field Data Scientist', skill: 'Collecting data and training a classifier in the field', how: 'Coming with the Forest Island update.', soon: true, check: (s) => done(s, 'forest-quest') },
  { id: 'algo', icon: '🏜️', title: 'Algorithms Adventurer', skill: 'Pathfinding, sorting and search', how: 'Coming with the Desert Island update.', soon: true, check: (s) => done(s, 'desert-quest') },
  { id: 'network', icon: '🌊', title: 'Network Navigator', skill: 'Packets, DNS, TCP and load balancing', how: 'Coming with the Water Island update.', soon: true, check: (s) => done(s, 'water-quest') },
  { id: 'architect', icon: '🏙️', title: 'Cloud City Architect', skill: 'Designing resilient cloud architectures', how: 'Coming with the City Island update.', soon: true, check: (s) => done(s, 'city-quest') },
  { id: 'cyber', icon: '🗿', title: 'Cyber Guardian', skill: 'Ciphers, phishing awareness and secure thinking', how: 'Coming with the Mysterious Island update.', soon: true, check: (s) => done(s, 'mystery-quest') },
];

export const certCode = (name, id, date) => {
  const h = cyrb53(`${name}|${id}|${date}`).toUpperCase().padStart(10, '0');
  return `CI-${h.slice(0, 4)}-${h.slice(4, 8)}`;
};

// Returns the certifications newly earned (and records them in state)
export function checkCerts(state, ctx) {
  state.certs = state.certs || [];
  const fresh = [];
  for (const c of CERTS) {
    if (state.certs.some((x) => x.id === c.id)) continue;
    if (c.check(state, ctx)) {
      const rec = { id: c.id, date: new Date().toISOString().slice(0, 10) };
      state.certs.push(rec);
      fresh.push(c);
    }
  }
  return fresh;
}

// ---------------------------------------------------------------- certificate image

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  g.fillText(line, x, y);
  return y + lh;
}

export function renderCertificate({ name, cert, date, code, grand = false, list = [] }) {
  const W = 2000, H = 1414;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d');
  const gold = '#b8892e', ink = '#1f2937', accent = grand ? '#b8892e' : '#0f766e';
  // paper
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fffdf6');
  bg.addColorStop(1, '#f5efe0');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // borders
  g.strokeStyle = accent;
  g.lineWidth = 18;
  g.strokeRect(40, 40, W - 80, H - 80);
  g.strokeStyle = gold;
  g.lineWidth = 3;
  g.strokeRect(78, 78, W - 156, H - 156);
  for (const [x, y] of [[78, 78], [W - 78, 78], [78, H - 78], [W - 78, H - 78]]) {
    g.fillStyle = gold;
    g.beginPath();
    g.arc(x, y, 16, 0, Math.PI * 2);
    g.fill();
  }
  g.textAlign = 'center';
  g.fillStyle = accent;
  g.font = '700 34px "Space Grotesk", sans-serif';
  g.fillText('☁️  CLOUD ISLAND ACADEMY  ☁️', W / 2, 190);
  g.fillStyle = ink;
  g.font = `700 ${grand ? 92 : 84}px Georgia, "Times New Roman", serif`;
  g.fillText(grand ? 'Grand Certificate of Achievement' : 'Micro-Certification', W / 2, 320);
  g.font = 'italic 40px Georgia, serif';
  g.fillStyle = '#4b5563';
  g.fillText('This certifies that', W / 2, 420);
  g.fillStyle = ink;
  g.font = '700 96px Georgia, serif';
  g.fillText(name, W / 2, 545);
  g.strokeStyle = gold;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W / 2 - 520, 580);
  g.lineTo(W / 2 + 520, 580);
  g.stroke();
  g.font = 'italic 40px Georgia, serif';
  g.fillStyle = '#4b5563';
  g.fillText(grand ? 'has earned ten or more micro-certifications on Cloud Island, including' : 'has successfully completed', W / 2, 660);
  if (grand) {
    g.font = '600 36px "Space Grotesk", sans-serif';
    g.fillStyle = ink;
    const items = list.map((c) => `${c.icon} ${c.title}`);
    const cols = 2, colW = 760;
    items.slice(0, 14).forEach((t, i) => {
      const cx = W / 2 + (i % cols === 0 ? -colW / 2 : colW / 2);
      g.fillText(t, cx, 740 + Math.floor(i / cols) * 58);
    });
  } else {
    g.fillStyle = accent;
    g.font = '700 70px "Space Grotesk", sans-serif';
    g.fillText(`${cert.icon}  ${cert.title}`, W / 2, 760);
    g.fillStyle = '#374151';
    g.font = '500 38px "Space Grotesk", sans-serif';
    wrap(g, cert.skill, W / 2, 840, 1400, 52);
  }
  // seal
  const sx = W - 330, sy = H - 330;
  g.fillStyle = grand ? '#d4a63a' : '#14b8a6';
  g.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 120 : 140;
    g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
  }
  g.fill();
  g.fillStyle = '#fffdf6';
  g.beginPath();
  g.arc(sx, sy, 92, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = grand ? '#b8892e' : '#0f766e';
  g.font = '700 54px "Space Grotesk", sans-serif';
  g.fillText(grand ? '★' : 'CI', sx, sy + 8);
  g.font = '700 22px "Space Grotesk", sans-serif';
  g.fillText(grand ? 'GRAND' : 'MICRO', sx, sy + 46);
  // footer
  g.textAlign = 'left';
  g.fillStyle = ink;
  g.font = '600 34px "Space Grotesk", sans-serif';
  g.fillText('Yumnam Momojit Singh', 200, H - 255);
  g.strokeStyle = '#6b7280';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(200, H - 300);
  g.lineTo(760, H - 300);
  g.stroke();
  g.font = '500 26px "Space Grotesk", sans-serif';
  g.fillStyle = '#4b5563';
  g.fillText('Creator, Cloud Island · Assistant Professor & Researcher', 200, H - 215);
  g.fillText(`Issued ${date}   ·   Certificate ID ${code}`, 200, H - 170);
  g.font = 'italic 22px Georgia, serif';
  g.fillStyle = '#6b7280';
  g.fillText('An interactive-learning award from the Cloud Island portfolio — not an accredited academic qualification.', 200, H - 120);
  return cv;
}

export function downloadCanvas(cv, filename) {
  cv.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

// ---------------------------------------------------------------- panel

export function certsPanelHTML(state, name) {
  const earned = new Map((state.certs || []).map((c) => [c.id, c]));
  const n = earned.size;
  const grandOK = n >= GRAND_NEEDS;
  return `<p class="lead">Earn micro-certifications by exploring, playing and learning. Collect <b>${GRAND_NEEDS}</b> to unlock the <b>Grand Certificate</b>.</p>
    <div class="cert-progress"><div style="width:${Math.min(100, (n / GRAND_NEEDS) * 100)}%"></div><span>${n} / ${GRAND_NEEDS} toward the Grand Certificate</span></div>
    ${name ? '' : `<form class="cert-name" data-cert-name autocomplete="off"><label>Name on your certificates</label><input name="n" maxlength="40" placeholder="Your full name" required /><button class="btn small primary" type="submit">Save name</button></form>`}
    <div class="cert-card grand ${grandOK ? 'earned' : ''}">
      <span class="ci">🎓</span><div><b>Cloud Island Grand Certificate</b><small>${grandOK ? 'Unlocked — congratulations!' : `Unlocks after ${GRAND_NEEDS} micro-certifications`}</small></div>
      ${grandOK && name ? '<button class="btn small primary" data-cert-dl="grand">⬇ Download</button>' : ''}
    </div>
    <div class="cert-grid">${CERTS.map((c) => {
      const e = earned.get(c.id);
      return `<div class="cert-card ${e ? 'earned' : c.soon ? 'soon' : ''}">
        <span class="ci">${c.icon}</span>
        <div><b>${esc(c.title)}</b><small>${esc(e ? `Earned ${e.date}` : c.how)}</small></div>
        ${e && name ? `<button class="btn small" data-cert-dl="${c.id}">⬇</button>` : e ? '<span class="tag">✔</span>' : c.soon ? '<span class="tag">soon</span>' : '<span class="tag">🔒</span>'}
      </div>`;
    }).join('')}</div>
    <p class="muted">Certificates are saved as PNG images with your name, date and a certificate ID. They celebrate learning on this site and are not accredited qualifications.</p>`;
}
