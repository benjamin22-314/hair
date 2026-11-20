class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('hair-muted') === '1';
    this.lastTick = {};
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('hair-muted', this.muted ? '1' : '0');
    return this.muted;
  }

  canPlay(key, minGapMs) {
    if (this.muted) return false;
    this.init();
    if (!this.ctx) return false;
    const now = performance.now();
    if (this.lastTick[key] && now - this.lastTick[key] < minGapMs) return false;
    this.lastTick[key] = now;
    return true;
  }

  tone(freq, dur, type = 'sine', vol = 0.12, endFreq = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    }
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.08, filterFreq = 1800, q = 1) {
    if (!this.ctx || this.muted) return;
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * dur));
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
  }

  pop() {
    if (!this.canPlay('pop', 50)) return;
    this.tone(420, 0.09, 'sine', 0.14, 680);
  }

  snip() {
    if (!this.canPlay('snip', 110)) return;
    this.noise(0.06, 0.13, 3600, 2.2);
    this.tone(1100, 0.045, 'triangle', 0.07, 520);
  }

  buzz() {
    if (!this.canPlay('buzz', 95)) return;
    this.tone(135, 0.09, 'sawtooth', 0.06, 128);
  }

  grow() {
    if (!this.canPlay('grow', 130)) return;
    const base = 460 + Math.random() * 220;
    this.tone(base, 0.16, 'sine', 0.10, base * 1.45);
  }

  dye() {
    if (!this.canPlay('dye', 95)) return;
    this.noise(0.07, 0.06, 2400, 1.5);
    this.tone(520 + Math.random() * 140, 0.07, 'sine', 0.06, 660);
  }

  sparkle() {
    if (!this.canPlay('sparkle', 100)) return;
    const f = 880 + Math.random() * 640;
    this.tone(f, 0.15, 'triangle', 0.09, f * 1.35);
  }

  bubble() {
    if (!this.canPlay('bubble', 110)) return;
    const f = 320 + Math.random() * 340;
    this.tone(f, 0.09, 'sine', 0.10, f * 1.7);
  }

  water() {
    if (!this.canPlay('water', 90)) return;
    this.noise(0.11, 0.07, 1700, 0.8);
  }

  dryer() {
    if (!this.canPlay('dryer', 90)) return;
    this.noise(0.12, 0.08, 650, 1.4);
    this.tone(190, 0.10, 'sine', 0.03, 195);
  }

  comb() {
    if (!this.canPlay('comb', 120)) return;
    this.noise(0.05, 0.05, 2900, 3.0);
  }

  curl() {
    if (!this.canPlay('curl', 130)) return;
    this.tone(360, 0.12, 'sine', 0.08, 590);
  }

  shutter() {
    if (!this.canPlay('shutter', 250)) return;
    this.noise(0.06, 0.18, 2200, 1.2);
    setTimeout(() => this.tone(840, 0.08, 'triangle', 0.10, 1180), 65);
  }

  fanfare() {
    if (!this.canPlay('fanfare', 300)) return;
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'triangle', 0.12), i * 85);
    });
  }
}

export const snd = new SoundFX();
