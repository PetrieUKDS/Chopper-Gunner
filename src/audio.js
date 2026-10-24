'use strict';

// All sound is synthesised with WebAudio, so the game has no audio assets to load.
const Sfx = {
  ctx: null,
  master: null,
  muted: false,
  noiseBuf: null,
  rotor: null,
  rotorState: '',
  lastGun: 0,
  lastEnemyGun: 0,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.startRotor();
  },

  noise({ dur = 0.2, type = 'lowpass', f0 = 1000, f1 = null, q = 1, gain = 0.3, attack = 0.002 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f0, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    flt.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  },

  tone({ f0 = 440, f1 = null, dur = 0.2, type = 'square', gain = 0.1, attack = 0.005 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  startRotor() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 380;
    // A square-wave LFO chops the noise into the "whup-whup" of the blades.
    const amp = c.createGain();
    amp.gain.value = 0.5;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 9.5;
    const depth = c.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(amp.gain);
    const vol = c.createGain();
    vol.gain.value = 0;
    src.connect(flt).connect(amp).connect(vol).connect(this.master);
    lfo.start();
    src.start();
    this.rotor = { vol, lfo, flt };
  },

  setRotor(on, turbo) {
    if (!this.rotor) return;
    const state = on ? (turbo ? 'turbo' : 'on') : 'off';
    if (state === this.rotorState) return;
    this.rotorState = state;
    const t = this.ctx.currentTime;
    this.rotor.vol.gain.setTargetAtTime(on ? 0.32 : 0, t, 0.25);
    this.rotor.lfo.frequency.setTargetAtTime(turbo ? 14 : 9.5, t, 0.4);
    this.rotor.flt.frequency.setTargetAtTime(turbo ? 700 : 380, t, 0.4);
  },

  gun() {
    const t = performance.now();
    if (t - this.lastGun < 45) return;
    this.lastGun = t;
    this.noise({ dur: 0.07, type: 'bandpass', f0: 1900, f1: 600, q: 0.8, gain: 0.2 });
    this.tone({ f0: 170, f1: 60, dur: 0.05, type: 'square', gain: 0.04 });
  },
  enemyGun(vol = 1) {
    const t = performance.now();
    if (t - this.lastEnemyGun < 70) return;
    this.lastEnemyGun = t;
    this.noise({ dur: 0.06, type: 'bandpass', f0: 1100, q: 1, gain: 0.09 * vol });
  },
  explosion(size = 1, vol = 1) {
    this.noise({ dur: 0.5 + size * 0.6, type: 'lowpass', f0: 1500, f1: 70, q: 0.7, gain: Math.min(0.9, 0.3 + size * 0.3) * vol, attack: 0.004 });
    this.tone({ f0: 90, f1: 28, dur: 0.4 + size * 0.4, type: 'sine', gain: 0.35 * vol });
  },
  missile() {
    this.noise({ dur: 0.7, type: 'bandpass', f0: 500, f1: 2600, q: 1.4, gain: 0.25, attack: 0.03 });
  },
  enemyMissile() {
    this.noise({ dur: 0.9, type: 'highpass', f0: 800, f1: 3000, q: 1, gain: 0.12, attack: 0.05 });
  },
  flare() {
    this.noise({ dur: 0.4, type: 'highpass', f0: 3000, q: 0.7, gain: 0.12 });
    this.tone({ f0: 900, f1: 300, dur: 0.3, type: 'triangle', gain: 0.08 });
  },
  beep() {
    this.tone({ f0: 1250, dur: 0.08, type: 'square', gain: 0.05 });
  },
  pickup() {
    this.tone({ f0: 520, f1: 1040, dur: 0.16, type: 'sine', gain: 0.15 });
  },
  overheat() {
    this.tone({ f0: 300, f1: 110, dur: 0.4, type: 'sawtooth', gain: 0.07 });
  },
  hit() {
    this.noise({ dur: 0.1, type: 'bandpass', f0: 420, q: 1, gain: 0.22 });
  },
  jet() {
    this.noise({ dur: 2.2, type: 'bandpass', f0: 400, f1: 1800, q: 0.6, gain: 0.18, attack: 0.6 });
  },
  confirm() {
    this.tone({ f0: 660, dur: 0.08, type: 'square', gain: 0.06 });
    setTimeout(() => this.tone({ f0: 990, dur: 0.12, type: 'square', gain: 0.06 }), 80);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  },
};
