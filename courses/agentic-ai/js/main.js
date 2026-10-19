// Agentic AI Saga: 40 chapters on the shared saga engine, a certificate for each part,
// and a final project that is checked on GitHub.
import { startSaga } from '../../shared/saga.js';
import { esc } from '../../shared/kit.js';
import { WORLDS, LEVELS, CERTS, FINAL_CERT, BOSS_STARS } from './data.js';
import {
  STORAGE_KEY, partStatus, awardCerts, allPartsDone, buildCertificate, downloadCanvas,
  linkedInAddURL, linkedInPostURL, postText, partName,
} from './certs.js';

const SHARED = new Set(['order']);
let viewing = null; // { cert, date, final, canvas, url }

const saga = startSaga({
  title: 'the Agentic AI Saga',
  worlds: WORLDS,
  levels: LEVELS,
  storageKey: STORAGE_KEY,
  levelWord: 'Chapter',
  ideaTag: '🤖 The idea',
  loadEngine: (name) => (SHARED.has(name) ? import(`../../shared/engines/${name}.js`) : import(`./engines/${name}.js`)),
  about: '40 chapters in 10 parts take you from what an agent is to shipping one: prompting, tool use, MCP, planning, memory, multi-agent systems, computer use, safety, evals and production. Each part earns a certificate; all ten unlock the final project, which is checked automatically on GitHub. Progress stays in this browser.',
  hudButtons: [
    { icon: '🎓', title: 'Certificates', onClick: () => openCertsPanel() },
    { icon: '🏁', title: 'Final project', onClick: () => { location.href = 'project.html'; } },
  ],
  actions: {
    certs: () => openCertsPanel(),
    cert: (b) => openCert(b.dataset.id),
    project: () => { location.href = 'project.html'; },
    'cert-download': () => download(),
    'cert-post': () => {
      const text = postText(viewing.cert, viewing.url, viewing.final);
      navigator.clipboard?.writeText(text).catch(() => {});
      download();
      window.open(linkedInPostURL(text), '_blank', 'noopener');
      saga.toast('Post text copied and image saved. Attach the image in LinkedIn’s post box.', 'good', 5000);
    },
    'cert-add': () => window.open(linkedInAddURL(saga.progress.get('name'), viewing.cert, viewing.date, viewing.final), '_blank', 'noopener'),
    'cert-copy': (b) => navigator.clipboard?.writeText(viewing.url).then(() => { b.textContent = 'Link copied'; }, () => {}),
  },
  afterWin: ({ level }) => {
    const fresh = awardCerts(saga.progress);
    let html = fresh.map((c) => `
      <div class="idea" style="border-color:#f5b301;background:#fff8dd">
        <div class="tag">🎓 Certificate earned</div>
        <p><b>${c.icon} ${esc(c.title)}</b>: you finished ${esc(partName(c.part))}.</p>
        <p><button class="candy-btn small" data-act="cert" data-id="${c.id}">View &amp; share</button></p>
      </div>`).join('');
    const st = partStatus(saga.progress, level.world);
    if (!st.earned && !st.missing.length && st.bossStars < BOSS_STARS) {
      html += `<p style="text-align:center"><small>Win the 👑 boss chapter with ★★ or more to earn this part’s certificate.</small></p>`;
    }
    if (fresh.length && allPartsDone(saga.progress)) {
      html += `<div class="idea"><div class="tag">🏁 Final project unlocked</div><p>All ten certificates earned! Build a real agent and submit it for verification.</p><p><button class="candy-btn green small" data-act="project">Open the final project</button></p></div>`;
    }
    return html;
  },
  finished: ({ total, max }) => `<p style="text-align:center"><b>🎓 You finished all 40 chapters with ${total} of ${max} stars!</b></p>`,
});

// ───────────────────────────── certificates
function openCertsPanel() {
  const have = saga.progress.get('certs') || {};
  const final = saga.progress.get('final');
  const rows = CERTS.map((c) => {
    const st = partStatus(saga.progress, c.part);
    const date = have[c.id];
    const done = st.chapters.length - st.missing.length;
    const how = date ? `Earned ${date}` : `${done}/${st.chapters.length} chapters · boss ${'★'.repeat(st.bossStars) || '—'} (needs ★★)`;
    return `<div class="settings-row"><span>${c.icon} <b>${esc(c.title)}</b><small>${esc(partName(c.part))} · ${how}</small></span>${date ? `<button class="candy-btn small" data-act="cert" data-id="${c.id}">View</button>` : '<span aria-label="locked">🔒</span>'}</div>`;
  }).join('');
  const n = Object.keys(have).length;
  saga.showModal(`
    <button class="close-x" data-act="close" aria-label="Close">✕</button>
    <div class="ribbon">Certificates</div>
    <p class="eyebrow">${n} of ${CERTS.length} part certificates earned</p>
    ${rows}
    <div class="settings-row"><span>${FINAL_CERT.icon} <b>${esc(FINAL_CERT.title)}</b><small>${final ? `Verified ${final.date} · github.com/${esc(final.repo)}` : n >= CERTS.length ? 'Unlocked: build and submit your final project' : 'Earn all 10 part certificates to unlock the final project'}</small></span>${final ? `<button class="candy-btn small green" data-act="cert" data-id="${FINAL_CERT.id}">View</button>` : `<button class="candy-btn small ghost" data-act="project">Project</button>`}</div>
    <p><small>Each part’s certificate needs every chapter played and its 👑 boss won with ★★ or more. Certificates celebrate learning on this site; they are not accredited academic qualifications.</small></p>
  `, () => {});
}

function askName(then) {
  saga.showModal(`
    <button class="close-x" data-act="close" aria-label="Close">✕</button>
    <div class="ribbon">Your name</div>
    <form id="name-form" autocomplete="off">
      <p>How should your name appear on your certificates?</p>
      <p><input name="n" maxlength="40" required placeholder="Your full name" style="width:100%;font:inherit;padding:0.6em 0.8em;border-radius:12px;border:2px solid #e4dcb4" /></p>
      <p><small>Your name stays in this browser. It is only shared when you share a certificate link.</small></p>
      <div class="actions"><button class="candy-btn green" type="submit">Save</button></div>
    </form>`, () => {});
  const form = document.getElementById('name-form');
  form.querySelector('input').focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.n.value.trim().replace(/\s+/g, ' ');
    if (!name) return;
    saga.progress.set('name', name);
    then();
  });
}

async function openCert(id) {
  const name = saga.progress.get('name');
  if (!name) return askName(() => openCert(id));
  const final = id === FINAL_CERT.id ? saga.progress.get('final') : null;
  const date = final ? final.date : (saga.progress.get('certs') || {})[id];
  if (!date) return;
  const { cert, canvas, url } = await buildCertificate({ name, id, date, final });
  viewing = { cert, date, final, canvas, url };
  saga.showModal(`
    <button class="close-x" data-act="close" aria-label="Close">✕</button>
    <div class="ribbon ${final ? 'boss' : ''}">${cert.icon} ${esc(cert.title)}</div>
    <img src="${canvas.toDataURL('image/png')}" alt="${esc(cert.title)} certificate for ${esc(name)}" style="width:100%;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18)" />
    <div class="actions">
      <button class="candy-btn" data-act="cert-post">Post on LinkedIn</button>
      <button class="candy-btn blue" data-act="cert-add">Add to profile</button>
      <button class="candy-btn ghost" data-act="cert-download">⬇ Download</button>
      <button class="candy-btn ghost" data-act="cert-copy">Copy check link</button>
    </div>
    <p><small>“Post on LinkedIn” copies a ready-made post, saves the image and opens LinkedIn: attach the image there and press Post. “Add to profile” opens LinkedIn’s certification form, already filled in.</small></p>
    <div class="actions"><button class="candy-btn ghost small" data-act="certs">← All certificates</button></div>
  `, () => {});
}

function download() {
  downloadCanvas(viewing.canvas, `${viewing.cert.id}-certificate.png`);
}

// Certificates earned before this page loaded (for example in teacher mode) are recorded too.
awardCerts(saga.progress);
if (location.hash === '#certificates') openCertsPanel();
