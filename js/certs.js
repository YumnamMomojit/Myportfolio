// Certificates: earned automatically from lessons and achievements. Each one lists the
// skills practised, carries a QR code to a public check page (verify.html), downloads as
// an image and can be added to LinkedIn. Ten of them unlock the Grand Certificate.
// The certificate image itself is drawn by cert-image.js, loaded only when you open one.
import { esc } from './utils.js';
import { cyrb53 } from './hash.js';

export const GRAND_NEEDS = 10;
const done = (s, ...ids) => ids.every((id) => s.done.includes(id));

// `check(state, ctx)` decides when a certificate is earned; `soon` ones arrive with later island updates.
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
  { id: 'heritage', icon: '🏇', title: 'Manipur Heritage', skill: 'The story of Sagol Kangjei and the Meitei calendar', how: 'Hang the 6 festival lanterns, walk the Meitei calendar, hear the Sagol Kangjei story and score 3 polo goals on Manipur Island, and visit Thoubal on the India map.', check: (s) => done(s, 'hometown', 'calendar', 'polo-story', 'polo', 'lanterns') },
  { id: 'fieldml', icon: '🌲', title: 'Field Data Scientist', skill: 'Collected a labelled dataset in the field, grew a decision tree and validated it on unseen data', how: 'Pass the forest test on Forest Island: collect specimens, grow a decision tree, test it.', check: (s) => done(s, 'forest-quest') },
  { id: 'algo', icon: '🏜️', title: 'Algorithms Adventurer', skill: 'Found a target by binary search, sorted by comparisons and checked shortest paths with BFS and Dijkstra', how: 'Complete The Lost Caravan on Desert Island: binary search, sorting and shortest paths.', check: (s) => done(s, 'desert-quest') },
  { id: 'network', icon: '🌊', title: 'Network Navigator', skill: 'Packets, DNS, TCP and load balancing', how: 'Coming with the Water Island update.', soon: true, check: (s) => done(s, 'water-quest') },
  { id: 'architect', icon: '🏙️', title: 'Cloud City Architect', skill: 'Designing resilient cloud architectures', how: 'Coming with the City Island update.', soon: true, check: (s) => done(s, 'city-quest') },
  { id: 'cyber', icon: '🗿', title: 'Cyber Guardian', skill: 'Ciphers, phishing awareness and secure thinking', how: 'Coming with the Mysterious Island update.', soon: true, check: (s) => done(s, 'mystery-quest') },
];
// What each certificate shows an employer: the skills practised, and hashtags for a LinkedIn post
const DETAIL = {
  explorer: [['Self-directed exploration', 'Interactive 3D navigation'], ['Exploration']],
  voyager: [['Wayfinding', 'Exploration', 'Persistence'], ['Exploration']],
  adventurer: [['Persistence', 'Coordination', 'Goal setting'], ['Gamification']],
  agents: [['AI agents', 'Tool use', 'Planning', 'Guardrails'], ['AIAgents', 'ArtificialIntelligence']],
  ml: [['Supervised learning', 'Training data', 'Model training'], ['MachineLearning']],
  deep: [['Neural networks', 'Backpropagation', 'Convolutional networks'], ['DeepLearning', 'NeuralNetworks']],
  web3d: [['Three.js', 'WebGL', '3D rendering'], ['ThreeJS', 'WebGL']],
  solver: [['Number theory', 'Probability', 'Algorithmic thinking'], ['ProblemSolving', 'Algorithms']],
  cube: [['Spatial reasoning', 'Algorithms', 'Persistence'], ['ProblemSolving']],
  heritage: [['Meitei calendar', 'Manipuri festivals', 'History of polo'], ['Manipur', 'CulturalHeritage']],
  fieldml: [['Data collection', 'Sampling bias', 'Decision trees', 'Model evaluation'], ['MachineLearning', 'DataScience']],
  algo: [['Binary search', 'Sorting algorithms', 'Breadth-first search', 'Dijkstra’s algorithm'], ['Algorithms', 'ComputerScience']],
  network: [['Networking', 'DNS', 'TCP/IP'], ['Networking']],
  architect: [['Cloud architecture', 'System design', 'Resilience'], ['CloudComputing']],
  cyber: [['Cybersecurity', 'Ciphers', 'Phishing awareness'], ['Cybersecurity']],
};
for (const c of CERTS) [c.skills, c.tags] = DETAIL[c.id];
export const GRAND = {
  id: 'grand', icon: '🎓', title: 'Cloud Island Grand Certificate',
  skill: 'Earned ten or more Cloud Island certificates by exploring, playing and learning',
  skills: ['Lifelong learning', 'Persistence', 'Artificial intelligence'], tags: ['LifelongLearning', 'ArtificialIntelligence'],
};
export const certById = (id) => (id === 'grand' ? GRAND : CERTS.find((c) => c.id === id));

export const certCode = (name, id, date) => {
  const h = cyrb53(`${name}|${id}|${date}`).toUpperCase().padStart(10, '0');
  return `CI-${h.slice(0, 4)}-${h.slice(4, 8)}`;
};

// Returns the certificates newly earned (and records them in state)
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

// ---------------------------------------------------------------- LinkedIn + public check page

// The public page that checks a certificate ID (LinkedIn's "credential URL", and the QR code)
export function verifyURL(name, id, date) {
  const u = new URL('verify.html', location.href);
  u.search = new URLSearchParams({ n: name, c: id, d: date, k: certCode(name, id, date) }).toString();
  return u.href;
}
// LinkedIn's "Add licence or certification" form, pre-filled
export function linkedInAddURL(name, cert, date) {
  const [y, m] = date.split('-');
  return `https://www.linkedin.com/profile/add?${new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: cert.title,
    organizationName: 'Cloud Island Academy',
    issueYear: y,
    issueMonth: String(+m),
    certUrl: verifyURL(name, cert.id, date),
    certId: certCode(name, cert.id, date),
  })}`;
}
// A ready-made LinkedIn post celebrating the certificate (the earner can edit it)
export function certPostText(cert, url) {
  const tags = ['CloudIsland', ...cert.tags, 'LifelongLearning'].map((t) => `#${t}`).join(' ');
  return `🎓 I just earned the “${cert.title}” certificate on Cloud Island, an interactive 3D learning world created by Yumnam Momojit Singh.

What I practised: ${cert.skills.join(' · ')}

🔗 Check it, or earn your own: ${url}

${tags}`;
}

// ---------------------------------------------------------------- panel

export function certsPanelHTML(state, name, { editName = false } = {}) {
  const earned = new Map((state.certs || []).map((c) => [c.id, c]));
  const seen = new Set(state.certsSeen || []);
  const n = earned.size;
  const grandOK = n >= GRAND_NEEDS;
  const action = (id) => `<button class="btn small primary" data-cert-view="${id}">View &amp; share</button>`;
  return `<p class="lead">Earn certificates by exploring, playing and learning. Each one lists the skills you practised, carries a QR code and a public check link, and goes on your LinkedIn profile in one click. Collect <b>${GRAND_NEEDS}</b> to unlock the <b>Grand Certificate</b>.</p>
    <div class="cert-progress"><div style="width:${Math.min(100, (n / GRAND_NEEDS) * 100)}%"></div><span>${n} / ${GRAND_NEEDS} toward the Grand Certificate</span></div>
    ${name && !editName
      ? `<p class="cert-owner">Issued to <b>${esc(name)}</b> <button class="linkish" data-cert-rename>Change name</button></p>`
      : `<form class="cert-name" data-cert-name autocomplete="off"><label>Your full name, as it should appear on your certificates</label><input name="n" maxlength="40" placeholder="Your full name" value="${esc(name)}" required /><button class="btn small primary" type="submit">Save name</button></form>`}
    <div class="cert-card grand ${grandOK ? 'earned' : ''}">
      <span class="ci">🎓</span><div><b>Cloud Island Grand Certificate</b><small>${grandOK ? 'Unlocked — congratulations!' : `Unlocks after ${GRAND_NEEDS} certificates`}</small></div>
      ${grandOK && name ? action('grand') : ''}
    </div>
    <div class="cert-grid">${CERTS.map((c) => {
      const e = earned.get(c.id);
      const fresh = e && !seen.has(c.id);
      return `<div class="cert-card ${e ? 'earned' : c.soon ? 'soon' : ''}">
        <span class="ci">${c.icon}</span>
        <div><b>${esc(c.title)}${fresh ? ' <i class="new-tag">NEW</i>' : ''}</b><small>${esc(e ? `Earned ${e.date} · ${c.skills.join(' · ')}` : c.how)}</small></div>
        ${e && name ? action(c.id) : e ? '<span class="tag">✔</span>' : c.soon ? '<span class="tag">soon</span>' : '<span class="tag">🔒</span>'}
      </div>`;
    }).join('')}</div>
    <p class="muted">Certificates celebrate learning on this site; they are not accredited academic qualifications.</p>`;
}
