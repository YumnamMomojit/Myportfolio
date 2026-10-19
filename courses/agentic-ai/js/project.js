// The final project page: shows whether the project is unlocked, checks a GitHub
// repository against the course's workflow, and issues the final certificate.
import { createProgress } from '../../shared/progress.js';
import { CERTS, FINAL_CERT } from './data.js';
import {
  STORAGE_KEY, awardCerts, allPartsDone, partName, buildCertificate, downloadCanvas,
  linkedInAddURL, linkedInPostURL, postText,
} from './certs.js';
import { checkProject } from './github.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const progress = createProgress(STORAGE_KEY);
awardCerts(progress);

const form = $('submit-form');
form.name.value = progress.get('name') || '';
form.repo.value = progress.get('final')?.repo ? `https://github.com/${progress.get('final').repo}` : progress.get('repo') || '';

function renderStatus() {
  const card = $('status-card');
  const have = progress.get('certs') || {};
  const final = progress.get('final');
  if (final) {
    card.innerHTML = `<h2>🎓 Verified!</h2><p>Your project <a href="https://github.com/${esc(final.repo)}" target="_blank" rel="noopener">github.com/${esc(final.repo)}</a> passed on ${esc(final.date)}${final.summary ? ` (${esc(final.summary)})` : ''}.</p><div id="final-cert"></div>`;
    showCertificate(final);
    return;
  }
  if (allPartsDone(progress)) {
    card.innerHTML = '<h2>🔓 Unlocked</h2><p>You’ve earned all ten part certificates. Build your agent, push it with the workflow, and submit it below.</p>';
    return;
  }
  const missing = CERTS.filter((c) => !have[c.id]);
  card.innerHTML = `<h2>🔒 Locked</h2>
    <div class="lock">You need all ten part certificates to submit. Still to earn:
      <ul>${missing.map((c) => `<li>${c.icon} ${esc(c.title)} <small>(${esc(partName(c.part))})</small></li>`).join('')}</ul>
    </div>
    <p class="note">You can start building now; submit once the certificates are in.</p>`;
  $('f-go').disabled = true;
}

const STATE_ICON = { run: '⏳', ok: '✅', bad: '❌' };
let rows = {};
function step(name, state, detail = '') {
  if (!rows[name]) {
    const li = document.createElement('li');
    $('checks').append(li);
    rows[name] = li;
  }
  rows[name].innerHTML = `<span>${STATE_ICON[state]}</span><span><b>${esc(name)}</b>${detail ? ` <small>${esc(detail)}</small>` : ''}</span>`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!allPartsDone(progress)) return;
  const name = form.name.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  progress.set('name', name);
  progress.set('repo', form.repo.value.trim());
  $('checks').innerHTML = '';
  $('result').innerHTML = '';
  rows = {};
  $('f-go').disabled = true;
  try {
    const res = await checkProject(form.repo.value, step);
    const final = { ...res, date: new Date().toISOString().slice(0, 10) };
    progress.set('final', final);
    $('result').innerHTML = '<div class="msg ok">🎉 Your project passed. Here is your certificate.</div>';
    renderStatus();
    $('status-card').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    Object.entries(rows).forEach(([n, li]) => { if (li.textContent.startsWith('⏳')) step(n, 'bad'); });
    $('result').innerHTML = `<div class="msg bad">${esc(err.message)}${err.link ? ` <a href="${esc(err.link)}" target="_blank" rel="noopener">Open on GitHub ↗</a>` : ''}</div>`;
  } finally {
    $('f-go').disabled = false;
  }
});

async function showCertificate(final) {
  const name = progress.get('name');
  if (!name) return;
  const { cert, canvas, url } = await buildCertificate({ name, id: FINAL_CERT.id, date: final.date, final });
  const box = $('final-cert');
  box.innerHTML = `
    <img class="cert-img" src="${canvas.toDataURL('image/png')}" alt="${esc(cert.title)} certificate for ${esc(name)}" />
    <div class="actions">
      <button class="candy-btn" id="c-post">Post on LinkedIn</button>
      <button class="candy-btn blue" id="c-add">Add to profile</button>
      <button class="candy-btn ghost" id="c-dl">⬇ Download</button>
      <button class="candy-btn ghost" id="c-link">Copy check link</button>
    </div>`;
  $('c-dl').onclick = () => downloadCanvas(canvas, 'agentic-ai-final-certificate.png');
  $('c-add').onclick = () => window.open(linkedInAddURL(name, cert, final.date, final), '_blank', 'noopener');
  $('c-link').onclick = (e) => navigator.clipboard?.writeText(url).then(() => { e.target.textContent = 'Link copied'; }, () => {});
  $('c-post').onclick = () => {
    const text = postText(cert, url, final);
    navigator.clipboard?.writeText(text).catch(() => {});
    downloadCanvas(canvas, 'agentic-ai-final-certificate.png');
    window.open(linkedInPostURL(text), '_blank', 'noopener');
  };
}

renderStatus();
