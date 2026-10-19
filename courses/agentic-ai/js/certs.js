// Agentic AI certificates: one per part, and a final one for a verified project.
// Part certificates are generated in the learner's browser, like Cloud Island's; the final
// certificate also carries the GitHub repository, commit and workflow run that passed.
import { cyrb53 } from '../../../js/hash.js';
import { CERTS, FINAL_CERT, LEVELS, WORLDS, BOSS_STARS } from './data.js';

export const STORAGE_KEY = 'agentic-ai-saga-v1';
export const ORG = 'Cloud Island Academy';

export const certById = (id) => (id === FINAL_CERT.id ? FINAL_CERT : CERTS.find((c) => c.id === id));

// proof = "owner/repo@sha#run" for the final certificate, empty for part certificates
export function certCode(name, id, date, proof = '') {
  const h = cyrb53(`agentic-ai|${name}|${id}|${date}|${proof}`).toUpperCase().padStart(10, '0');
  return `AAI-${h.slice(0, 4)}-${h.slice(4, 8)}`;
}

// The public check page (the QR code and LinkedIn's credential URL point here).
export function verifyURL(name, id, date, final = null) {
  const u = new URL('../verify.html', import.meta.url);
  const proof = final ? `${final.repo}@${final.sha}#${final.run}` : '';
  const q = { n: name, c: id, d: date, k: certCode(name, id, date, proof) };
  if (final) Object.assign(q, { r: final.repo, s: final.sha, u: final.run });
  u.search = new URLSearchParams(q).toString();
  return u.href;
}

// Where a part stands: every chapter played (★ or more) and its boss won with ★★ or more.
export function partStatus(progress, part) {
  const chapters = LEVELS.map((l, i) => ({ l, i })).filter(({ l }) => l.world === part);
  const missing = chapters.filter(({ l }) => !progress.stars(l.id));
  const boss = chapters.find(({ l }) => l.boss);
  const bossStars = boss ? progress.stars(boss.l.id) : 0;
  return { chapters, missing, boss, bossStars, earned: !missing.length && bossStars >= BOSS_STARS };
}

// Records any newly earned part certificates; returns them.
export function awardCerts(progress) {
  const have = progress.get('certs') || {};
  const fresh = [];
  CERTS.forEach((c) => {
    if (!have[c.id] && partStatus(progress, c.part).earned) {
      have[c.id] = new Date().toISOString().slice(0, 10);
      fresh.push(c);
    }
  });
  if (fresh.length) progress.set('certs', have);
  return fresh;
}

export const allPartsDone = (progress) => CERTS.every((c) => (progress.get('certs') || {})[c.id]);

export function linkedInAddURL(name, cert, date, final = null) {
  const [y, m] = date.split('-');
  const proof = final ? `${final.repo}@${final.sha}#${final.run}` : '';
  return `https://www.linkedin.com/profile/add?${new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: cert.title,
    organizationName: ORG,
    issueYear: y,
    issueMonth: String(+m),
    certUrl: verifyURL(name, cert.id, date, final),
    certId: certCode(name, cert.id, date, proof),
  })}`;
}

export const linkedInPostURL = (text) => `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;

export function postText(cert, url, final = null) {
  return `🎓 I just earned the “${cert.title}” certificate in the Agentic AI Saga, a playable 3D course by Yumnam Momojit Singh.

${final ? `My final project, an AI agent with tools, MCP, retrieval, human approval and evals, passed the course’s automated checks: https://github.com/${final.repo}\n\n` : ''}What I practised: ${cert.skills.join(' · ')}

🔗 Check it: ${url}

#AgenticAI #AIAgents #LifelongLearning`;
}

export const partName = (part) => `${WORLDS[part].emoji} Part ${part + 1} · ${WORLDS[part].name}`;

// Draws a certificate. final = { repo, sha, run } for the final certificate.
export async function buildCertificate({ name, id, date, final = null }) {
  const cert = certById(id);
  const url = verifyURL(name, id, date, final);
  const proof = final ? `${final.repo}@${final.sha}#${final.run}` : '';
  const { renderCertificate } = await import('../../../js/cert-image.js');
  try {
    await Promise.race([document.fonts.load("700 70px 'Space Grotesk'"), new Promise((r) => setTimeout(r, 1500))]);
  } catch { /* system fonts are fine */ }
  const canvas = renderCertificate({
    name, cert, date, url, code: certCode(name, id, date, proof),
    note: final ? `Final project verified by automated checks: github.com/${final.repo}` : 'Agentic AI Saga',
  });
  return { cert, canvas, url };
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}
