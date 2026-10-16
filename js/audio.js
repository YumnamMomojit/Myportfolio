// Tiny WebAudio synth — no audio files needed.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
    }
    this.ctx.resume?.();
  }

  tone(freq, dur = 0.12, type = 'sine', vol = 0.06, slideTo = 0, delay = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  jump(n) { this.tone(n === 2 ? 420 : 300, 0.16, 'square', 0.025, n === 2 ? 760 : 560); }
  land() { this.tone(140, 0.08, 'triangle', 0.04, 80); }
  bounce() { this.tone(200, 0.5, 'sawtooth', 0.03, 900); }
  open() { this.tone(660, 0.09, 'sine', 0.05); this.tone(990, 0.12, 'sine', 0.04, 0, 0.07); }
  close() { this.tone(520, 0.08, 'sine', 0.035, 380); }
  kick() { this.tone(110, 0.14, 'triangle', 0.08, 55); }
  collect() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, 0, i * 0.06)); }
  zone() { [392, 523].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.045, 0, i * 0.1)); }
  level() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, 'square', 0.03, 0, i * 0.08)); }
  achieve() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.05, 0, i * 0.1)); }
  warp() { this.tone(900, 0.4, 'sine', 0.04, 200); }
  click() { this.tone(820, 0.05, 'square', 0.02, 600); }
  bell() { this.tone(1760, 0.5, 'sine', 0.05); this.tone(2217, 0.4, 'sine', 0.03, 0, 0.12); }
  boing() { this.tone(180, 0.3, 'sine', 0.07, 520); }
  whoosh() { this.noise(0.45, 0.05, 900); }
  pickup() { this.tone(440, 0.08, 'triangle', 0.05); this.tone(660, 0.1, 'triangle', 0.05, 0, 0.06); }
  throwBall() { this.noise(0.18, 0.04, 1500); }
  dribble(v = 1) { this.tone(95, 0.09, 'sine', 0.08 * v, 60); }
  shutter() { this.noise(0.08, 0.06, 3200); this.tone(1800, 0.04, 'square', 0.02, 0, 0.06); }
  bark() { this.tone(420, 0.07, 'square', 0.035, 260); this.tone(460, 0.08, 'square', 0.03, 280, 0.14); }
  dig() { this.noise(0.9, 0.035, 500); }
  neigh() { this.tone(820, 0.45, 'sawtooth', 0.022, 520); this.tone(640, 0.3, 'sawtooth', 0.018, 980, 0.38); }
  thud() { this.tone(140, 0.12, 'square', 0.03, 80); }
  swish() { this.noise(0.35, 0.06, 2400); [784, 988, 1318].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.04, 0, 0.1 + i * 0.07)); }
  gem() { [1318, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.045, 0, i * 0.05)); }
  pop() { this.noise(0.25, 0.05, 600); this.tone(1200 + Math.random() * 800, 0.3, 'sine', 0.02, 300); }
  fanfare() {
    [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36], [784, 0.52], [1046, 0.64]].forEach(([f, d]) => this.tone(f, 0.28, 'square', 0.035, 0, d));
    [523, 659, 784].forEach((f) => this.tone(f, 0.9, 'triangle', 0.03, 0, 0.64));
  }

  // short filtered noise burst (whooshes, swishes, firework pops)
  noise(dur, vol, freq) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
  noiseBuffer() {
    if (!this._noise) {
      const len = this.ctx.sampleRate * 2;
      this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this._noise;
  }

  // continuous waterfall rush; level 0..1
  water(level) {
    if (!this.ctx) return;
    if (!this._water) {
      if (level <= 0.001) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer();
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.ctx.destination);
      src.start();
      this._water = g;
    }
    this._water.gain.setTargetAtTime(this.muted ? 0 : level * 0.12, this.ctx.currentTime, 0.2);
  }

  // motorbike engine hum that follows speed
  engineStart() {
    if (!this.ctx || this._engine) return;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    o.connect(f).connect(g).connect(this.ctx.destination);
    o.start();
    this._engine = { o, g };
    this.tone(90, 0.4, 'sawtooth', 0.05, 180);
  }
  engine(speed) {
    if (!this._engine) this.engineStart();
    if (!this._engine) return;
    const now = this.ctx.currentTime;
    this._engine.o.frequency.setTargetAtTime(55 + speed * 7, now, 0.1);
    this._engine.g.gain.setTargetAtTime(this.muted ? 0 : 0.025 + Math.min(speed, 25) * 0.0012, now, 0.1);
  }
  engineStop() {
    if (!this._engine) return;
    const { o, g } = this._engine;
    g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    o.stop(this.ctx.currentTime + 0.5);
    this._engine = null;
  }
}
