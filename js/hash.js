// Small string hashing: puzzle and riddle answers are stored only as hashes (so they can't simply
// be read from the page source), and certificate IDs are derived from one.

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
