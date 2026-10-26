'use strict';

// Original synth soundtracks, sequenced live with WebAudio: one per mission.
// Each song plays a 4-bar intro, then loops an 8-bar groove (A) and an 8-bar lead melody (B).

const MUSIC_VOLUME = 0.25;
const INTRO_BARS = 4;

// Melody bars are 16 sixteenth-note tokens: a note name, '-' to hold the last note, '.' for a rest.
const SONGS = [
  {
    name: 'SANDSTORM',
    bpm: 132,
    chords: [
      ['A1', 'A3 C4 E4'], ['F1', 'A3 C4 F4'], ['G1', 'B3 D4 G4'], ['E1', 'B3 E4 G4'],
      ['A1', 'A3 C4 E4'], ['F1', 'A3 C4 F4'], ['C2', 'G3 C4 E4'], ['G1', 'G3 B3 D4'],
    ],
    bass: '1.121.121.121.12',
    kick: 'x.....x.x.......',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.x.',
    arp: [0, 1, 2, 1],
    lead: [
      'E5 - - - - - D5 - E5 - - - A4 - - -',
      'C5 - - - - - - - A4 - C5 - F5 - E5 -',
      'D5 - - - - - - - - - B4 - D5 - G5 -',
      'E5 - - - - - - - - - - - . . . .',
      'E5 - - - - - D5 - E5 - - - A5 - - -',
      'A5 - - - G5 - F5 - E5 - - - F5 - - -',
      'G5 - - - E5 - - - C5 - - - E5 - G5 -',
      'D5 - - - - - - - - - - - B4 - D5 -',
    ],
  },
  {
    name: 'IRON ROAD',
    bpm: 144,
    chords: [
      ['E1', 'E3 G3 B3'], ['C2', 'E3 G3 C4'], ['D2', 'F#3 A3 D4'], ['B1', 'F#3 B3 D#4'],
      ['E1', 'E3 G3 B3'], ['C2', 'E3 G3 C4'], ['D2', 'F#3 A3 D4'], ['B1', 'F#3 B3 D#4'],
    ],
    bass: '1.111.111.111.12',
    kick: 'x..x..x.x..x..x.',
    snare: '....x.......x..x',
    hat: 'xxxxxxxxxxxxxxxx',
    arp: [0, 2, 1, 2],
    lead: [
      'E5 . E5 . G5 . E5 . B5 - - - A5 . G5 .',
      'E5 - - - - - - - . . G5 . E5 . C5 .',
      'D5 . D5 . F#5 . D5 . A5 - - - G5 . F#5 .',
      'D#5 - - - - - - - F#5 - - - B4 - - -',
      'E5 . E5 . G5 . B5 . E6 - - - D6 . B5 .',
      'C6 - - - B5 - - - G5 - - - E5 - - -',
      'F#5 - - - A5 - - - D6 - - - C6 . A5 .',
      'B5 - - - - - - - - - - - D#5 - F#5 -',
    ],
  },
  {
    name: 'RED TALON',
    bpm: 116,
    chords: [
      ['D2', 'D3 F3 A3'], ['Bb1', 'D3 F3 Bb3'], ['G1', 'D3 G3 Bb3'], ['A1', 'C#3 E3 A3'],
      ['D2', 'D3 F3 A3'], ['Bb1', 'D3 F3 Bb3'], ['G1', 'D3 G3 Bb3'], ['A1', 'C#3 E3 A3'],
    ],
    bass: '1..1..1.1..1..2.',
    kick: 'x.......x.x.....',
    snare: '........x.......',
    hat: 'x.x.x.x.x.x.x.x.',
    arp: null,
    lead: [
      'D5 - - - - - - - A4 - - - D5 - F5 -',
      'F5 - - - - - - - E5 - D5 - - - - -',
      'D5 - - - - - - - Bb4 - D5 - G5 - - -',
      'A5 - - - - - - - C#5 - - - E5 - - -',
      'F5 - - - E5 - D5 - A5 - - - - - - -',
      'Bb5 - - - A5 - - - F5 - - - D5 - - -',
      'G5 - - - - - Bb5 - A5 - - - G5 - - -',
      'E5 - - - - - - - - - - - . . . .',
    ],
  },
  {
    name: 'FROSTBITE',
    bpm: 124,
    chords: [
      ['F#1', 'F#3 A3 C#4'], ['D2', 'F#3 A3 D4'], ['A1', 'E3 A3 C#4'], ['E1', 'E3 G#3 B3'],
      ['F#1', 'F#3 A3 C#4'], ['D2', 'F#3 A3 D4'], ['B1', 'F#3 B3 D4'], ['C#2', 'E#3 G#3 C#4'],
    ],
    bass: '1...1.2.1...1.2.',
    kick: 'x.....x...x.....',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.x.',
    arp: [0, 2, 1, 2],
    lead: [
      'C#5 - - - - - - - F#5 - - - E5 - C#5 -',
      'D5 - - - - - - - - - - - A4 - - -',
      'C#5 - - - E5 - - - A5 - - - G#5 - E5 -',
      'B4 - - - - - - - - - - - . . . .',
      'C#5 - - - - - - - F#5 - - - A5 - - -',
      'A5 - - - F#5 - - - D5 - - - F#5 - A5 -',
      'B5 - - - - - - - A5 - F#5 - D5 - - -',
      'E#5 - - - - - - - G#5 - - - C#6 - - -',
    ],
  },
  {
    name: 'GREEN HELL',
    bpm: 138,
    chords: [
      ['G1', 'G3 Bb3 D4'], ['Eb2', 'G3 Bb3 Eb4'], ['F1', 'F3 A3 C4'], ['D2', 'F#3 A3 D4'],
      ['G1', 'G3 Bb3 D4'], ['Eb2', 'G3 Bb3 Eb4'], ['C2', 'G3 C4 Eb4'], ['D2', 'F#3 A3 D4'],
    ],
    bass: '1.1.2.1.1.1.2.1.',
    kick: 'x..x..x...x..x..',
    snare: '....x..x....x...',
    hat: 'x.xx.xx.x.xx.xx.',
    arp: [2, 1, 0, 1],
    lead: [
      'G5 - - . G5 . Bb5 - - . A5 . G5 - - -',
      'G5 - - - - - - - Eb5 - - - F5 - G5 -',
      'A5 - - . A5 . C6 - - . Bb5 . A5 - - -',
      'F#5 - - - - - - - - - - - D5 - - -',
      'D6 - - . D6 . C6 - - . Bb5 . A5 - G5 -',
      'Bb5 - - - G5 - - - Eb5 - - - G5 - - -',
      'C6 - - - Bb5 - - - G5 - - - Eb5 - - -',
      'D5 - - - - - - - F#5 - - - A5 - - -',
    ],
  },
  {
    name: 'BLACK GOLD',
    bpm: 150,
    chords: [
      ['C2', 'C3 Eb3 G3'], ['Ab1', 'C3 Eb3 Ab3'], ['Db2', 'Db3 F3 Ab3'], ['G1', 'B2 D3 G3'],
      ['C2', 'C3 Eb3 G3'], ['Ab1', 'C3 Eb3 Ab3'], ['F1', 'C3 F3 Ab3'], ['G1', 'B2 D3 G3'],
    ],
    bass: '1112111211121112',
    kick: 'x...x...x...x.x.',
    snare: '....x.......x...',
    hat: 'xxxxxxxxxxxxxxxx',
    arp: null,
    lead: [
      'C5 - - - - - G4 - C5 - Eb5 - D5 - C5 -',
      'Eb5 - - - - - - - C5 - - - Ab4 - - -',
      'Db5 - - - - - Ab4 - Db5 - F5 - Eb5 - Db5 -',
      'D5 - - - - - - - B4 - - - G4 - - -',
      'G5 - - - - - Eb5 - G5 - C6 - Bb5 - G5 -',
      'Ab5 - - - G5 - - - Eb5 - - - C5 - - -',
      'F5 - - - Ab5 - - - C6 - - - Bb5 - Ab5 -',
      'G5 - - - - - - - - - - - D5 - B4 -',
    ],
  },
];

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteNum(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return NOTE_INDEX[m[1]] + acc + (Number(m[3]) + 1) * 12;
}

const noteFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Turn melody bars into a map of start step -> { f, len } (len in sixteenths).
function parseMelody(bars) {
  const events = new Map();
  let last = null;
  bars.forEach((bar, b) => {
    bar.trim().split(/\s+/).forEach((tok, i) => {
      if (tok === '-') {
        if (last) last.len++;
      } else if (tok === '.') {
        last = null;
      } else {
        last = { f: noteFreq(noteNum(tok)), len: 1 };
        events.set(b * 16 + i, last);
      }
    });
  });
  return events;
}

for (const s of SONGS) {
  s.melody = parseMelody(s.lead);
  s.harmony = s.chords.map(([root, notes]) => ({
    root: noteFreq(noteNum(root)),
    notes: notes.split(' ').map((n) => noteFreq(noteNum(n))),
  }));
}

const Music = {
  want: 0,
  song: null,
  bus: null,
  echo: null,
  timer: null,
  step: 0,
  nextTime: 0,

  // Ask for a mission's song. It starts once audio is unlocked by the first key press or tap.
  play(i) {
    this.want = i % SONGS.length;
    if (Sfx.ctx && this.song !== SONGS[this.want]) this.start();
  },

  start() {
    const c = Sfx.ctx;
    if (this.bus) {
      const old = this.bus;
      old.gain.setTargetAtTime(0, c.currentTime, 0.3);
      setTimeout(() => old.disconnect(), 2500);
    }
    clearInterval(this.timer);
    const s = (this.song = SONGS[this.want]);

    this.bus = c.createGain();
    this.bus.gain.value = MUSIC_VOLUME;
    this.bus.connect(Sfx.master);
    // Dotted-eighth echo on the lead, a staple of the 80s sound.
    this.echo = c.createDelay(1);
    this.echo.delayTime.value = (0.75 * 60) / s.bpm;
    const fb = c.createGain();
    fb.gain.value = 0.35;
    const wet = c.createGain();
    wet.gain.value = 0.3;
    this.echo.connect(fb).connect(this.echo);
    this.echo.connect(wet).connect(this.bus);

    this.step = 0;
    this.nextTime = c.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  },

  // Look-ahead scheduler: queue every step that starts in the next 150ms.
  schedule() {
    const c = Sfx.ctx;
    const dt = 60 / this.song.bpm / 4;
    if (this.nextTime < c.currentTime) this.nextTime = c.currentTime + 0.05;
    while (this.nextTime < c.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime, dt);
      this.step++;
      this.nextTime += dt;
    }
  },

  playStep(step, t, dt) {
    const s = this.song;
    const bar = Math.floor(step / 16), i = step % 16;
    const intro = bar < INTRO_BARS;
    const loopBar = intro ? bar : (bar - INTRO_BARS) % 16;
    const lead = !intro && loopBar >= 8;
    const chord = s.harmony[loopBar % 8];

    if (i === 0) {
      this.pad(chord.notes, t, dt * 16);
      if (!intro && (loopBar === 0 || loopBar === 8)) this.crash(t);
    }

    const b = s.bass[i];
    if (b !== '.') {
      let len = 1;
      while (len < 16 && s.bass[(i + len) % 16] === '.') len++;
      this.bass(chord.root * (b === '2' ? 2 : 1), t, len * dt * 0.9);
    }

    if (s.hat[i] === 'x') this.hat(t, i % 4 === 0 ? 0.07 : 0.04);
    if (intro) {
      // Snare roll into the first full bar.
      if (bar === INTRO_BARS - 1 && i >= 12) this.snare(t, 0.12 + (i - 12) * 0.04);
    } else {
      if (s.kick[i] === 'x') this.kick(t);
      if (s.snare[i] === 'x') this.snare(t, 0.26);
    }

    if (!intro && s.arp) {
      const f = chord.notes[s.arp[i % s.arp.length]] * 2;
      this.arp(f, t, dt * 0.9, lead ? 0.025 : 0.04);
    }

    if (lead) {
      const ev = s.melody.get((loopBar - 8) * 16 + i);
      if (ev) this.lead(ev.f, t, ev.len * dt);
    }
  },

  // ---------------------------------------------------------------- instruments

  env(t, len, peak, attack, release) {
    const g = Sfx.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, len - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    return g;
  },

  osc(type, f, t, len, detune = 0) {
    const o = Sfx.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.start(t);
    o.stop(t + len + 0.05);
    return o;
  },

  bass(f, t, len) {
    const c = Sfx.ctx;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 5;
    flt.frequency.setValueAtTime(1500, t);
    flt.frequency.exponentialRampToValueAtTime(240, t + len);
    const g = this.env(t, len, 0.22, 0.004, len * 0.5);
    this.osc('sawtooth', f, t, len).connect(flt);
    this.osc('square', f / 2, t, len).connect(flt);
    flt.connect(g).connect(this.bus);
  },

  pad(notes, t, len) {
    const c = Sfx.ctx;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 1100;
    const g = this.env(t, len, 0.035, 0.35, 0.3);
    for (const f of notes) {
      this.osc('sawtooth', f, t, len, -9).connect(flt);
      this.osc('sawtooth', f, t, len, 9).connect(flt);
    }
    flt.connect(g).connect(this.bus);
  },

  arp(f, t, len, gain) {
    const c = Sfx.ctx;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 2400;
    const g = this.env(t, len, gain, 0.003, len * 0.7);
    this.osc('square', f, t, len).connect(flt);
    flt.connect(g).connect(this.bus);
  },

  lead(f, t, len) {
    const c = Sfx.ctx;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.Q.value = 2;
    flt.frequency.setValueAtTime(1200, t);
    flt.frequency.exponentialRampToValueAtTime(3200, t + 0.06);
    const g = this.env(t, len, 0.09, 0.01, Math.min(0.12, len * 0.3));
    // Gentle vibrato that eases in on held notes.
    const lfo = this.osc('sine', 5.5, t, len);
    const depth = c.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(12, t + Math.min(0.4, len));
    lfo.connect(depth);
    for (const d of [-8, 8]) {
      const o = this.osc('sawtooth', f, t, len, d);
      depth.connect(o.detune);
      o.connect(flt);
    }
    flt.connect(g);
    g.connect(this.bus);
    g.connect(this.echo);
  },

  noise(t, dur, type, f, gain, q = 0.7) {
    const c = Sfx.ctx;
    const src = c.createBufferSource();
    src.buffer = Sfx.noiseBuf;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(this.bus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  },

  kick(t) {
    const o = this.osc('sine', 150, t, 0.35);
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = Sfx.ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.bus);
  },

  // Long, bright noise tail for a gated-reverb style snare.
  snare(t, gain) {
    this.noise(t, 0.24, 'bandpass', 1800, gain);
    const o = this.osc('triangle', 210, t, 0.1);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    const g = Sfx.ctx.createGain();
    g.gain.setValueAtTime(gain * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(this.bus);
  },

  hat(t, gain) {
    this.noise(t, 0.04, 'highpass', 7500, gain);
  },

  crash(t) {
    this.noise(t, 1.8, 'highpass', 4500, 0.09);
  },
};
