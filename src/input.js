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

// The screen edges the browser reserves for notches and the home bar, from CSS env().
function readSafeArea() {
  let probe = document.getElementById('safe-probe');
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'safe-probe';
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;'
      + 'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
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
  tapX: 0, tapY: 0, // screen position of the latest click or tap
  pad: null, // this frame's gamepad state, or null with no pad connected
  padPrev: {},
  menuMode: true, // set by the game: menus take d-pad/stick input as arrow keys
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
    this.tapY = e.clientY;
    if (e.pointerType === 'touch') {
      e.preventDefault();
      this.touchMode = true;
      this.goFullscreen();
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
      // A touchpad tap can press and release between two frames, so remember it.
      this.pressed['Mouse' + e.button] = true;
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

  // Touch buttons grow a little on bigger screens and stay clear of notches and the home bar.
  layoutButtons(w, h, safe = { l: 0, r: 0, t: 0, b: 0 }) {
    const k = clamp(Math.min(w, h) / 380, 1, 1.35);
    const rx = w - safe.r, by = h - safe.b;
    // Landscape phones: an arc tucked into the bottom corner, clear of the radar above.
    const short = h < 520;
    this.btnLayout = [
      { id: 'missile', x: rx - 66 * k, y: by - (short ? 70 : 190) * k, r: 34 * k, label: 'MSL' },
      { id: 'flare', x: rx - (short ? 152 : 150) * k, y: by - (short ? 52 : 226) * k, r: 30 * k, label: 'FLR' },
      { id: 'turbo', x: rx - (short ? 74 : 66) * k, y: by - (short ? 158 : 276) * k, r: 30 * k, label: 'TRB' },
      { id: 'pause', x: w / 2, y: by - 30, r: 20, label: 'II' },
    ];
  },

  // First touch: go full-screen and hold landscape where the browser allows it
  // (Android Chrome does; iPhone Safari ignores both, so there "Add to Home Screen" is the way).
  goFullscreen() {
    if (this.triedFullscreen) return;
    this.triedFullscreen = true;
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen || matchMedia('(display-mode: fullscreen)').matches) return;
    el.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => {});
  },

  // Standard-mapping gamepad: left stick flies, right stick aims, RT fires, LT missiles,
  // RB flares, LB turbo, Start pauses, A confirms, B goes back. In menus the d-pad and
  // left stick act as arrow keys.
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(pads || []).find((p) => p && p.connected);
    if (!gp) {
      this.pad = null;
      return;
    }
    const dz = (v) => (Math.abs(v || 0) < 0.2 ? 0 : v);
    const btn = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4));
    const pad = {
      lx: dz(gp.axes[0]), ly: dz(gp.axes[1]), rx: dz(gp.axes[2]), ry: dz(gp.axes[3]),
      fire: btn(7), missile: btn(6), flare: btn(5), turbo: btn(4) || btn(10),
      a: btn(0), b: btn(1), start: btn(9), mute: btn(8),
      up: btn(12) || dz(gp.axes[1]) < -0.6, down: btn(13) || dz(gp.axes[1]) > 0.6,
      left: btn(14) || dz(gp.axes[0]) < -0.6, right: btn(15) || dz(gp.axes[0]) > 0.6,
    };
    const edge = (k) => pad[k] && !this.padPrev[k];
    const used = Object.values(pad).some((v) => v === true || (typeof v === 'number' && v !== 0));
    if (used) {
      this.touchMode = false;
      Sfx.init();
    }
    if (edge('a')) this.pressed.Enter = true;
    if (edge('b')) this.pressed.Escape = true;
    if (edge('start')) this.pressed.btn_pause = true;
    if (edge('mute')) this.pressed.btn_mute = true;
    pad.flareHit = edge('flare');
    if (this.menuMode) {
      if (edge('up')) this.pressed.ArrowUp = true;
      if (edge('down')) this.pressed.ArrowDown = true;
      if (edge('left')) this.pressed.ArrowLeft = true;
      if (edge('right')) this.pressed.ArrowRight = true;
      if (edge('start')) this.pressed.Enter = true;
    }
    this.padPrev = pad;
    this.pad = pad;
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
