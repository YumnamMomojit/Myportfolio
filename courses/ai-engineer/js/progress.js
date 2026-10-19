// Stars and settings, kept only in this browser. Every access is guarded so the
// course still works when storage is blocked (private windows, previews).
const KEY = 'ai-engineer-saga-v1';

const state = { stars: {}, teacher: false, sound: true, seenTip: false };

try {
  Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch {
  /* storage unavailable: start fresh */
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export const progress = {
  stars: (id) => state.stars[id] || 0,
  setStars(id, n) {
    if (n > (state.stars[id] || 0)) {
      state.stars[id] = n;
      save();
    }
  },
  total: () => Object.values(state.stars).reduce((a, b) => a + b, 0),
  get teacher() { return state.teacher; },
  set teacher(v) { state.teacher = v; save(); },
  get sound() { return state.sound; },
  set sound(v) { state.sound = v; save(); },
  get seenTip() { return state.seenTip; },
  set seenTip(v) { state.seenTip = v; save(); },
  reset() {
    state.stars = {};
    save();
  },
};
