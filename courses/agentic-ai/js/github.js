// Checks a learner's final project on GitHub, from the browser, with GitHub's public API
// (no sign-in; about 60 requests an hour per network). Used by the project page to issue
// the final certificate and by the check page to re-confirm it later.
const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
export const WORKFLOW = 'agentic-ai-verify.yml';
const WORKFLOW_PATH = `.github/workflows/${WORKFLOW}`;

export class CheckError extends Error {
  constructor(message, link = '') {
    super(message);
    this.link = link;
  }
}

async function gh(path) {
  const r = await fetch(API + path, { headers: { Accept: 'application/vnd.github+json' } });
  if ((r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0') {
    throw new CheckError('GitHub’s limit for checks without sign-in is used up for this network (about 60 an hour). Try again later.');
  }
  if (!r.ok) {
    const err = new CheckError(`GitHub answered ${r.status}.`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// "https://github.com/owner/repo(.git)" or "owner/repo" → "owner/repo"
export function parseRepo(input) {
  const m = String(input).trim().match(/^(?:https?:\/\/github\.com\/)?([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// Line endings and trailing spaces don't count as edits.
const normalize = (text) => text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim();

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalize(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

let templateHash = null;
async function officialHash() {
  if (!templateHash) {
    const r = await fetch(new URL(`../project/${WORKFLOW}`, import.meta.url), { cache: 'no-cache' });
    templateHash = await sha256(await r.text());
  }
  return templateHash;
}

async function workflowUnchanged(repo, sha) {
  const r = await fetch(`${RAW}/${repo}/${sha}/${WORKFLOW_PATH}`);
  if (!r.ok) throw new CheckError(`No ${WORKFLOW_PATH} in the repository. Copy the workflow file there, unchanged, and push.`);
  if ((await sha256(await r.text())) !== (await officialHash())) {
    throw new CheckError('The workflow file differs from the course’s copy. Replace it with the original, unchanged, and push again.');
  }
}

// The published summary, e.g. "AAI-v1 score=86/100 evals=19/22 PASS"
async function summary(repo, sha, runId) {
  try {
    const statuses = await gh(`/repos/${repo}/commits/${sha}/statuses?per_page=100`);
    const s = statuses.find((x) => x.context === 'agentic-ai-verify' && String(x.target_url || '').endsWith(`/runs/${runId}`));
    return s ? s.description : '';
  } catch {
    return '';
  }
}

// Full check for submission. step(label, state, detail) reports progress.
export async function checkProject(input, step) {
  const repo = parseRepo(input);
  if (!repo) throw new CheckError('That doesn’t look like a GitHub repository. Use https://github.com/owner/repo.');

  step('Repository is public', 'run');
  let info;
  try {
    info = await gh(`/repos/${repo}`);
  } catch (err) {
    throw err.status === 404 ? new CheckError('Repository not found. Check the address, and make sure the repository is public.') : err;
  }
  if (info.private) throw new CheckError('The repository is private. Make it public so the course can read the check results.');
  const branch = info.default_branch;
  const full = info.full_name; // GitHub's own spelling of owner/repo
  step('Repository is public', 'ok', full);

  step('Latest commit', 'run');
  const head = (await gh(`/repos/${full}/commits/${encodeURIComponent(branch)}`)).sha;
  step('Latest commit', 'ok', `${branch} @ ${head.slice(0, 7)}`);

  step('Workflow file is unchanged', 'run');
  await workflowUnchanged(full, head);
  step('Workflow file is unchanged', 'ok');

  step('Checks passed on the latest commit', 'run');
  let runs;
  try {
    runs = (await gh(`/repos/${full}/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(branch)}&per_page=20`)).workflow_runs || [];
  } catch (err) {
    throw err.status === 404 ? new CheckError('GitHub has no runs of the verify workflow yet. Push the workflow file to your default branch.') : err;
  }
  const run = runs.find((r) => r.head_sha === head);
  const actions = `https://github.com/${full}/actions/workflows/${WORKFLOW}`;
  if (!run) throw new CheckError('The checks haven’t run on your latest commit yet. Wait a minute after pushing, then try again.', actions);
  if (run.status !== 'completed') throw new CheckError('The checks are still running. Try again when the run finishes (usually a few minutes).', run.html_url);
  if (run.conclusion !== 'success') throw new CheckError('The checks ran but didn’t pass. Open the run to see which checks failed, fix them and push again.', run.html_url);
  step('Checks passed on the latest commit', 'ok', `run #${run.run_number}`);

  const desc = await summary(full, head, run.id);
  return { repo: info.full_name, sha: head, run: String(run.id), runUrl: run.html_url, summary: desc };
}

// Re-check an issued certificate: the run exists, passed, used the official workflow and matches the commit.
export async function recheck(repo, sha, runId) {
  const run = await gh(`/repos/${repo}/actions/runs/${runId}`);
  if (run.repository?.full_name?.toLowerCase() !== repo.toLowerCase()) throw new CheckError('That run belongs to a different repository.');
  if (!String(run.path || '').endsWith(WORKFLOW)) throw new CheckError('That run is not the course’s verify workflow.');
  if (run.head_sha !== sha) throw new CheckError('That run checked a different commit.');
  if (run.conclusion !== 'success') throw new CheckError('That run did not pass.');
  await workflowUnchanged(repo, sha);
  return { runUrl: run.html_url, date: (run.updated_at || '').slice(0, 10), summary: await summary(repo, sha, runId) };
}
