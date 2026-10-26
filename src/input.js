'use strict';

// Rebindable keyboard actions. Each action has two key slots.
const ACTIONS = [
  { id: 'up', label: 'FLY UP' },
  { id: 'down', label: 'FLY DOWN' },
  { id: 'left', label: 'FLY LEFT' },
  { id: 'right', label: 'FLY RIGHT' },
  { id: 'turnLeft', label: 'TURN LEFT' },
  { id: 'turnRight', label: 'TURN RIGHT' },
  { id: 'fire', label: 'CHAIN GUNS' },
  { id: 'missile', label: 'MISSILES' },
  { id: 'flare', label: 'FLARES' },
  { id: 'turbo', label: 'TURBO' },
  { id: 'pause', label: 'PAUSE' },
  { id: 'mute', label: 'MUTE' },
];

const DEFAULT_BINDS = {
  up: ['KeyW', null],
  down: ['KeyS', null],
  left: ['KeyA', null],
  right: ['KeyD', null],
  turnLeft: ['ArrowLeft', 'KeyQ'],
  turnRight: ['ArrowRight', 'KeyE'],
  fire: ['Space', 'ArrowUp'],
  missile: ['ArrowDown', 'KeyK'],
  flare: ['KeyF', 'KeyL'],
  turbo: ['ShiftLeft', 'ShiftRight'],
  pause: ['KeyP', 'Escape'],
  mute: ['KeyM', null],
};

const BINDS_KEY = 'chopperGunner.binds';

function keyName(code) {
  if (!code) return '-';
  const named = {
    ArrowLeft: '\u2190', ArrowRight: '\u2192', ArrowUp: '\u2191', ArrowDown: '\u2193',
    Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
    AltLeft: 'L-ALT', AltRight: 'R-ALT', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', Backspace: 'BKSP',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
    Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', CapsLock: 'CAPS',
  };
  if (named[code]) return named[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
  return code.toUpperCase();
}

// Keyboard + mouse, plus twin-stick touch controls for phones and tablets.
const Input = {
  binds: null,
  capture: null, // when set, the next key press is handed to this callback
  mouseMoved: false,
  keys: {},
  pressed: {},
  mouse: { x: 0, y: 0, left: false, right: false },
  touchMode: false,
  sticks: { move: null, aim: null },
  buttons: {},
  tapped: false,
  tapX: 0, // screen x of the latest click or tap
  btnLayout: [],

  init(canvas) {
    this.loadBinds();
    window.addEventListener('keydown', (e) => {
      if (this.capture) {
        e.preventDefault();
        if (e.repeat) return;
        const cb = this.capture;
        this.capture = null;
        cb(e.code);
        return;
      }
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.code) || this.isBound(e.code)) e.preventDefault();
      this.touchMode = false;
      Sfx.init();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouse.left = this.mouse.right = false;
      this.sticks.move = this.sticks.aim = null;
      this.buttons = {};
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
  },

  onDown(e) {
    Sfx.init();
    this.tapped = true;
    this.tapX = e.clientX;
    if (e.pointerType === 'touch') {
      e.preventDefault();
      this.touchMode = true;
      const x = e.clientX, y = e.clientY;
      const b = this.btnLayout.find((b) => Math.hypot(x - b.x, y - b.y) < b.r + 10);
      if (b) {
        this.buttons[b.id] = e.pointerId;
        this.pressed['btn_' + b.id] = true;
        return;
      }
      const side = x < window.innerWidth / 2 ? 'move' : 'aim';
      if (!this.sticks[side]) this.sticks[side] = { id: e.pointerId, ox: x, oy: y, x, y };
    } else {
      this.touchMode = false;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) this.mouse.right = true;
    }
  },

  onMove(e) {
    if (e.pointerType === 'touch') {
      for (const k of ['move', 'aim']) {
        const s = this.sticks[k];
        if (s && s.id === e.pointerId) {
          s.x = e.clientX;
          s.y = e.clientY;
        }
      }
    } else {
      if (Math.abs(e.clientX - this.mouse.x) + Math.abs(e.clientY - this.mouse.y) > 2) this.mouseMoved = true;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }
  },

  onUp(e) {
    if (e.pointerType === 'touch') {
      for (const k of ['move', 'aim']) {
        if (this.sticks[k] && this.sticks[k].id === e.pointerId) this.sticks[k] = null;
      }
      for (const id in this.buttons) if (this.buttons[id] === e.pointerId) delete this.buttons[id];
    } else {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    }
  },

  // Floating stick: the origin is dragged along if the finger moves past the rim.
  stick(k) {
    const s = this.sticks[k];
    if (!s) return { x: 0, y: 0, mag: 0 };
    const R = 60;
    let dx = s.x - s.ox, dy = s.y - s.oy;
    const m = Math.hypot(dx, dy);
    if (m > R) {
      s.ox = s.x - (dx / m) * R;
      s.oy = s.y - (dy / m) * R;
      dx = (dx / m) * R;
      dy = (dy / m) * R;
    }
    return { x: dx / R, y: dy / R, mag: Math.min(1, m / R) };
  },

  layoutButtons(w, h) {
    this.btnLayout = [
      { id: 'missile', x: w - 66, y: h - 200, r: 32, label: 'MSL' },
      { id: 'flare', x: w - 146, y: h - 236, r: 28, label: 'FLR' },
      { id: 'turbo', x: w - 66, y: h - 282, r: 28, label: 'TRB' },
      { id: 'pause', x: w / 2, y: h - 30, r: 18, label: 'II' },
    ];
  },

  hit(code) {
    return !!this.pressed[code];
  },

  loadBinds() {
    this.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
    try {
      const saved = JSON.parse(localStorage.getItem(BINDS_KEY) || 'null');
      if (saved) {
        for (const a of ACTIONS) {
          if (Array.isArray(saved[a.id]) && saved[a.id].length === 2) this.binds[a.id] = saved[a.id];
        }
      }
    } catch (e) { /* storage unavailable or corrupt: keep defaults */ }
  },

  saveBinds() {
    try {
      localStorage.setItem(BINDS_KEY, JSON.stringify(this.binds));
    } catch (e) { /* storage unavailable */ }
  },

  resetBinds() {
    this.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
    this.saveBinds();
  },

  // Bind a key to one slot; a key can only belong to one action, so it is taken off any other.
  setBind(action, slot, code) {
    for (const a of ACTIONS) {
      const b = this.binds[a.id];
      for (let i = 0; i < 2; i++) if (b[i] === code) b[i] = null;
    }
    this.binds[action][slot] = code;
    this.saveBinds();
  },

  isBound(code) {
    for (const id in this.binds) if (this.binds[id].includes(code)) return true;
    return false;
  },

  action(id) {
    const b = this.binds[id];
    return !!((b[0] && this.keys[b[0]]) || (b[1] && this.keys[b[1]]));
  },

  actionHit(id) {
    const b = this.binds[id];
    return !!((b[0] && this.pressed[b[0]]) || (b[1] && this.pressed[b[1]]));
  },

  bindLabel(id) {
    const b = this.binds[id].filter(Boolean);
    return b.length ? b.map(keyName).join('/') : 'UNBOUND';
  },

  confirm() {
    return this.hit('Space') || this.hit('Enter') || this.tapped;
  },

  endFrame() {
    this.pressed = {};
    this.mouseMoved = false;
    this.tapped = false;
  },
};
