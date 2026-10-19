// Stars, settings and any extra course data, kept only in this browser. Every access is
// guarded so a course still works when storage is blocked (private windows, previews).
export function createProgress(key) {
  const state = { stars: {}, teacher: false, sound: true, seenTip: false, extra: {} };

  try {
    Object.assign(state, JSON.parse(localStorage.getItem(key) || '{}'));
  } catch {
    /* storage unavailable: start fresh */
  }
  state.extra ||= {};

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  return {
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
    // course-specific data, such as certificates or a project submission
    get: (k) => state.extra[k],
    set(k, v) {
      state.extra[k] = v;
      save();
    },
    reset() {
      state.stars = {};
      state.extra = {};
      save();
    },
  };
}
