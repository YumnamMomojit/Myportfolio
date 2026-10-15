// Brain Arena: hard maths and programming puzzles.
// Answers are stored only as hashes so they can't simply be read from the page source.
import { esc } from './utils.js';

// cyrb53 — small, fast, non-cryptographic string hash (good enough to hide answers from casual peeking)
export function cyrb53(str, seed = 2026) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// "14.70" → "14.7", " 1,430 " → "1430", "Kitten" → "kitten"
export function normalize(input) {
  const s = String(input).trim().toLowerCase().replace(/[\s,_]/g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? String(Number(s)) : s;
}
export const hashAnswer = (input) => cyrb53(`cloud-island:${normalize(input)}`);

const STAR_PTS = { 1: 60, 2: 100, 3: 150 };

export const PUZZLES = [
  // ---------------------------------------------------------------- maths
  {
    id: 'm-pow', cat: 'math', title: 'The last three digits', stars: 3,
    q: 'What are the last three digits of 7<sup>2026</sup>?',
    hint: 'Work modulo 1000 and look for the cycle length of the powers of 7.',
    explain: 'Powers of 7 repeat every 20 steps mod 1000 (7²⁰ ≡ 1). 2026 = 20·101 + 6, so 7²⁰²⁶ ≡ 7⁶ = 117649 → 649.',
    hash: '1hb5tq6p7d8',
  },
  {
    id: 'm-zeros', cat: 'math', title: 'Zeros of a factorial', stars: 2,
    q: 'How many zeros are at the end of 2026! (2026 factorial)?',
    hint: 'Every trailing zero needs a factor 10 = 2 × 5, and there are always more 2s than 5s.',
    explain: '⌊2026/5⌋ + ⌊2026/25⌋ + ⌊2026/125⌋ + ⌊2026/625⌋ = 405 + 81 + 16 + 3 = 505.',
    hash: 'lme92311e0',
  },
  {
    id: 'm-domino', cat: 'math', title: 'Domino tilings', stars: 2,
    q: 'In how many ways can a 2 × 12 board be completely covered with 1 × 2 dominoes?',
    hint: 'Let T(n) count the 2 × n board. What can cover the leftmost column?',
    explain: 'T(n) = T(n−1) + T(n−2) with T(1) = 1, T(2) = 2 — the Fibonacci numbers. T(12) = 233.',
    hash: '1eqp1doa2re',
  },
  {
    id: 'm-catalan', cat: 'math', title: 'The careful robot', stars: 3,
    q: 'A robot walks from (0, 0) to (8, 8) with unit steps Right or Up and never goes above the line y = x. How many different paths can it take?',
    hint: 'For smaller boards the counts are 1, 1, 2, 5, 14, 42, … — a famous sequence.',
    explain: 'These are Catalan numbers: C₈ = C(16, 8) / 9 = 12870 / 9 = 1430.',
    hash: '1uxlly2xfxq',
  },
  {
    id: 'm-coupon', cat: 'math', title: 'Roll them all', stars: 3,
    q: 'You roll a fair six-sided die until every face has appeared at least once. What is the expected number of rolls? (give a decimal)',
    hint: 'Once you have seen k different faces, a new one appears with probability (6 − k)/6 — so it takes 6/(6 − k) rolls on average.',
    explain: '6 · (1 + 1/2 + 1/3 + 1/4 + 1/5 + 1/6) = 6 · 2.45 = 14.7 rolls (the coupon-collector problem).',
    hash: '1u1jxaam5yl',
  },
  {
    id: 'm-crt', cat: 'math', title: 'The remainder riddle', stars: 2,
    q: 'Find the smallest positive integer that leaves remainder 1 when divided by 2, 3, 4, 5 and 6 — but is exactly divisible by 7.',
    hint: 'n − 1 must be a multiple of lcm(2, 3, 4, 5, 6) = 60.',
    explain: 'n = 60k + 1: 61, 121, 181, 241, 301 — and 301 = 7 × 43.',
    hash: '13ln8up0ul0',
  },

  // ---------------------------------------------------------------- programming
  {
    id: 'c-trace', cat: 'code', title: 'Trace the loop', stars: 1,
    q: 'What does this JavaScript print?',
    code: `const a = [3, 1, 4, 1, 5, 9, 2, 6];
let s = 0;
for (let i = 0; i < a.length; i++) {
  if (a[i] % 2 === 1) s += a[i] * i;
}
console.log(s);`,
    hint: 'Only odd values count, each multiplied by its index (starting at 0).',
    explain: '3·0 + 1·1 + 1·3 + 5·4 + 9·5 = 0 + 1 + 3 + 20 + 45 = 69.',
    hash: '2c70ig5xli3',
  },
  {
    id: 'c-xor', cat: 'code', title: 'XOR everything', stars: 2,
    q: 'What is 1 ^ 2 ^ 3 ^ … ^ 2026 — the bitwise XOR of every integer from 1 to 2026?',
    hint: 'The XOR of 1..n follows a cycle of 4: n, 1, n + 1, 0 (for n mod 4 = 0, 1, 2, 3).',
    explain: '2026 mod 4 = 2, so the answer is n + 1 = 2027.',
    hash: '28ht9dy1ut1',
  },
  {
    id: 'c-collatz', cat: 'code', title: 'Collatz climb', stars: 2,
    q: 'Collatz rule: if n is even, n → n / 2; otherwise n → 3n + 1. How many steps does it take to get from 27 down to 1?',
    hint: 'Write a small loop and count. It climbs surprisingly high on the way!',
    explain: '27 takes 111 steps and peaks at 9232 before falling to 1.',
    hash: 'ql9eh9ym3v',
  },
  {
    id: 'c-lev', cat: 'code', title: 'Edit distance', stars: 2,
    q: 'What is the Levenshtein (edit) distance between "kitten" and "sitting"? Insertions, deletions and substitutions each cost 1.',
    hint: 'Classic dynamic programming — or just find the cheapest sequence of edits.',
    explain: 'kitten → sitten (k→s) → sittin (e→i) → sitting (+g): 3 edits, and no shorter route exists.',
    hash: '2aecp3v9oe6',
  },
  {
    id: 'c-queens', cat: 'code', title: 'Eight queens', stars: 3,
    q: 'In how many ways can 8 queens be placed on an 8 × 8 chessboard so that no two queens attack each other?',
    hint: 'Backtracking: one queen per row, prune any clashing column or diagonal.',
    explain: '92 solutions (only 12 are distinct once rotations and reflections are removed).',
    hash: '1umva9zlkbj',
  },
  {
    id: 'c-bsearch', cat: 'code', title: 'Guess my number', stars: 1,
    q: 'A friend picks a whole number from 1 to 1,000,000 and answers "higher" or "lower" after each guess. With the best strategy, how many guesses do you need in the worst case?',
    hint: 'Halve the range every time.',
    explain: 'Binary search: 2¹⁹ = 524,288 < 1,000,000 ≤ 2²⁰ = 1,048,576, so 20 guesses.',
    hash: '1eyhbas5tuh',
  },
].map((p) => ({ ...p, pts: STAR_PTS[p.stars] }));

const CATS = {
  math: { title: 'Maths Puzzles', kicker: 'Brain Arena · Maths', color: '#f59e0b', intro: 'Number theory, combinatorics and probability. Pen and paper allowed!' },
  code: { title: 'Programming Puzzles', kicker: 'Brain Arena · Code', color: '#38bdf8', intro: 'Trace code, think in bits, design algorithms. Feel free to write a quick script.' },
};

export function createPuzzles(ctx) {
  let cat = null;
  const hints = new Set();
  const wrong = {};

  function render() {
    const C = CATS[cat];
    const solved = new Set(ctx.state().puzzles);
    const list = PUZZLES.filter((p) => p.cat === cat);
    const n = list.filter((p) => solved.has(p.id)).length;
    ctx.UI.showRawPanel({
      kicker: C.kicker,
      title: C.title,
      color: C.color,
      html: `<div class="seg tabs">
          <button class="btn small ${cat === 'math' ? 'active' : ''}" data-pz-tab="math">➗ Maths</button>
          <button class="btn small ${cat === 'code' ? 'active' : ''}" data-pz-tab="code">💻 Programming</button>
        </div>
        <p class="lead">${esc(C.intro)} <span class="muted">${n}/${list.length} solved · solve 3 to complete the challenge.</span></p>
        ${list.map((p) => {
          const ok = solved.has(p.id);
          return `<div class="puzzle ${ok ? 'solved' : ''}" id="pz-${p.id}">
            <div class="pz-head"><b>${esc(p.title)}</b><span class="stars" title="difficulty">${'★'.repeat(p.stars)}${'☆'.repeat(3 - p.stars)}</span><span class="pz-pts">${ok ? '✔ solved' : `+${p.pts}`}</span></div>
            <p>${p.q}</p>
            ${p.code ? `<pre class="code"><code>${esc(p.code)}</code></pre>` : ''}
            ${ok
              ? `<p class="why">✔ ${esc(p.explain)}</p>`
              : `<form class="pz-form" data-pz="${p.id}" autocomplete="off">
                  <input name="a" placeholder="Your answer" aria-label="Answer for ${esc(p.title)}" spellcheck="false" />
                  <button class="btn small primary" type="submit">Check</button>
                  <button class="btn small" type="button" data-pz-hint="${p.id}">💡 Hint</button>
                </form>
                ${wrong[p.id] ? `<p class="why bad">Not quite (${wrong[p.id]} ${wrong[p.id] === 1 ? 'try' : 'tries'}) — check your working and try again.</p>` : ''}
                ${hints.has(p.id) ? `<p class="hint-text">💡 ${esc(p.hint)}</p>` : ''}`}
          </div>`;
        }).join('')}`,
    });
  }

  return {
    open(c) {
      cat = c;
      render();
    },
    handleClick(target) {
      if (!cat) return false;
      const tab = target.closest('[data-pz-tab]');
      if (tab) {
        cat = tab.dataset.pzTab;
        ctx.sound('open');
        render();
        return true;
      }
      const h = target.closest('[data-pz-hint]');
      if (h) {
        hints.add(h.dataset.pzHint);
        ctx.sound('pickup');
        render();
        document.getElementById(`pz-${h.dataset.pzHint}`)?.scrollIntoView({ block: 'nearest' });
        return true;
      }
      return false;
    },
    handleSubmit(form) {
      if (!cat || !form.matches('[data-pz]')) return false;
      const p = PUZZLES.find((x) => x.id === form.dataset.pz);
      const input = form.elements.a.value;
      if (!input.trim()) return true;
      if (hashAnswer(input) === p.hash) {
        const st = ctx.state();
        if (!st.puzzles.includes(p.id)) st.puzzles.push(p.id);
        ctx.solved(p, PUZZLES.filter((x) => x.cat === p.cat && st.puzzles.includes(x.id)).length);
      } else {
        wrong[p.id] = (wrong[p.id] || 0) + 1;
        ctx.sound('thud');
      }
      render();
      document.getElementById(`pz-${p.id}`)?.scrollIntoView({ block: 'nearest' });
      return true;
    },
    close() {
      cat = null;
    },
  };
}
