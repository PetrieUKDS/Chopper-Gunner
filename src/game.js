'use strict';

const MAP_SEED = 1984;
const VEHICLE_KEY = 'chopperGunner.vehicle';

const G = {
  canvas: null,
  ctx: null,
  w: 0, h: 0, dpr: 1, zoom: 1,
  state: 'title',
  stateT: 0,
  time: 0,
  last: 0,
  cam: { x: 0, y: 0 },
  shakeAmt: 0,
  shakeX: 0, shakeY: 0,

  terrain: null,
  base: null,
  player: null,
  mission: MISSIONS[0],
  missionIndex: 0,
  difficulty: 1,

  enemies: [], bullets: [], ebullets: [], missiles: [], flares: [],
  particles: [], pickups: [], floaters: [], emitters: [], banners: [],

  score: 0,
  missionStartScore: 0,
  kills: 0,
  escaped: 0,
  allowedEscapes: 0,
  checkpoint: null,
  lockTarget: null,
  missileWarning: false,
  warnBeepT: 0,
  reinforceT: 0,
  controls: null,
  result: null,
  aimMode: 'keys', // 'mouse' or 'keys': whichever was used last steers the nose
  menu: { row: 0, slot: 0, from: 'title', waiting: false },
  vehicle: VEHICLES.stormwolf,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    Input.init(this.canvas);
    Noise.seed(MAP_SEED);
    this.terrain = new Terrain();
    this.base = this.findBase();
    this.cam.x = this.base.x;
    this.cam.y = this.base.y;
    try {
      this.best = Number(localStorage.getItem('chopperGunner.best')) || 0;
      this.vehicle = VEHICLES[localStorage.getItem(VEHICLE_KEY)] || this.vehicle;
    } catch (e) {
      this.best = 0;
    }
    this.player = new Player(this.base.x, this.base.y, this.vehicle);
    requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.zoom = clamp(Math.min(this.w, this.h) / 820, 0.55, 1.3);
    Input.layoutButtons(this.w, this.h);
  },

  // A flat-ish spot inland for the home helipad.
  findBase() {
    const rng = mulberry32(MAP_SEED);
    for (let i = 0; i < 4000; i++) {
      const r = 300 + i * 0.8;
      const a = rng() * TAU;
      const x = WORLD_W * 0.55 + Math.cos(a) * r, y = WORLD_H * 0.62 + Math.sin(a) * r;
      const h = heightAt(x, y);
      if (h < SHORE + 0.04 || h > HILLS - 0.04) continue;
      let ok = true;
      for (let k = 0; k < 12 && ok; k++) {
        const b = (k / 12) * TAU;
        const hh = heightAt(x + Math.cos(b) * 170, y + Math.sin(b) * 170);
        if (hh < SHORE + 0.02 || hh > HILLS) ok = false;
      }
      if (ok) return { x, y };
    }
    return { x: WORLD_W / 2, y: WORLD_H / 2 };
  },

  landPoint(from, minD, maxD, extra) {
    let fallback = null;
    for (let i = 0; i < 400; i++) {
      const a = rand(0, TAU), d = rand(minD, maxD);
      const x = from.x + Math.cos(a) * d, y = from.y + Math.sin(a) * d;
      if (x < 200 || y < 200 || x > WORLD_W - 200 || y > WORLD_H - 200) continue;
      if (!isLand(x, y)) continue;
      if (dist(x, y, this.base.x, this.base.y) < 700) continue;
      fallback = fallback || { x, y };
      if (extra && !extra({ x, y })) continue;
      return { x, y };
    }
    return fallback || { x: clamp(from.x + minD, 200, WORLD_W - 200), y: from.y };
  },

  make(type, x, y) {
    const d = this.difficulty;
    switch (type) {
      case 'jeep': return new Jeep(x, y, d);
      case 'tank': return new Tank(x, y, d);
      case 'gunship': return new Gunship(x, y, d);
      case 'sam': return new SamSite(x, y, d);
    }
  },

  spawnNear(type, from, minD, maxD) {
    const pt = type === 'gunship'
      ? { x: clamp(from.x + rand(-1, 1) * maxD, 200, WORLD_W - 200), y: clamp(from.y + rand(-1, 1) * maxD, 200, WORLD_H - 200) }
      : this.landPoint(from, minD, maxD);
    const e = this.make(type, pt.x, pt.y);
    this.enemies.push(e);
    return e;
  },

  // ------------------------------------------------------------ flow

  newGame() {
    this.score = 0;
    this.startMission(0);
  },

  startMission(i) {
    this.missionIndex = i;
    this.mission = MISSIONS[i % MISSIONS.length];
    Music.play(i % MISSIONS.length);
    const tour = Math.floor(i / MISSIONS.length);
    this.difficulty = 1 + (i % MISSIONS.length) * 0.12 + tour * 0.4;
    this.missionStartScore = this.score;
    this.enemies = []; this.bullets = []; this.ebullets = []; this.missiles = []; this.flares = [];
    this.particles = []; this.pickups = []; this.floaters = []; this.emitters = []; this.banners = [];
    this.kills = 0;
    this.escaped = 0;
    this.checkpoint = null;
    this.terrain.reset();
    this.player = new Player(this.base.x, this.base.y, this.vehicle);
    this.aimMode = 'keys';
    this.mission.setup(this);
    this.reinforceT = this.mission.reinforce.every;
    this.cam.x = this.player.x;
    this.cam.y = this.player.y;
    this.setState('briefing');
  },

  setState(s) {
    this.state = s;
    this.stateT = 0;
  },

  playerDied() {
    this.explode(this.player.x, this.player.y, 60);
    this.result = 'down';
    this.setState('dying');
  },

  banner(text, color = HUD_GREEN) {
    this.banners.push({ text, color, t: 2.6, slot: this.banners.length });
  },

  // ------------------------------------------------------------ helpers

  shake(a) {
    this.shakeAmt = Math.max(this.shakeAmt, a);
  },

  worldToScreen(x, y) {
    return { x: (x - this.cam.x) * this.zoom + this.w / 2, y: (y - this.cam.y) * this.zoom + this.h / 2 };
  },

  screenToWorld(x, y) {
    return { x: (x - this.w / 2) / this.zoom + this.cam.x, y: (y - this.h / 2) / this.zoom + this.cam.y };
  },

  objectivesLeft() {
    let n = 0;
    for (const e of this.enemies) if (e.objective && !e.dead) n++;
    return n;
  },

  addScore(n, x, y) {
    this.score += n;
    this.floaters.push({ x, y, text: '+' + n, t: 1.2 });
  },

  maybeDrop(x, y) {
    if (Math.random() > 0.22) return;
    const p = this.player;
    const kinds = ['repair', 'missiles', 'flares'];
    let kind = pick(kinds);
    if (p.hp < 50 && Math.random() < 0.6) kind = 'repair';
    else if (p.missiles < 3 && Math.random() < 0.5) kind = 'missiles';
    this.pickups.push(new Pickup(x, y, kind));
  },

  enemyShoot(x, y, angle, speed, dmg, kind, spread, muzzle) {
    const a = angle + rand(-spread, spread);
    const ox = x + Math.cos(angle) * muzzle, oy = y + Math.sin(angle) * muzzle;
    this.ebullets.push(new Bullet(ox, oy, Math.cos(a) * speed, Math.sin(a) * speed, 'e', dmg * Math.sqrt(this.difficulty), 1.8, kind));
    const d = dist(x, y, this.player.x, this.player.y);
    if (d < 900) Sfx.enemyGun(1 - d / 900);
  },

  launchEnemyMissile(x, y, angle, target) {
    this.missiles.push(new Missile(x, y, angle, 'e', target,
      { speed: 180, maxSpeed: 380 + this.difficulty * 30, accel: 170, turn: 1.9 + this.difficulty * 0.2, dmg: 20, life: 6.5 }));
    if (dist(x, y, this.player.x, this.player.y) < 1200) Sfx.enemyMissile();
  },

  findTarget(x, y, angle, range) {
    let best = null, bs = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(x, y, e.x, e.y);
      if (d > range) continue;
      const off = Math.abs(angDiff(angle, Math.atan2(e.y - y, e.x - x)));
      if (off > 0.9) continue;
      const s = d * (1 + off * 2);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  },

  computeLock(c) {
    let best = null, bd = 240 * 240;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist2(e.x, e.y, c.aimX, c.aimY);
      if (d < bd) { bd = d; best = e; }
    }
    return best || this.findTarget(this.player.x, this.player.y, this.player.angle, 750);
  },

  explode(x, y, size, o = {}) {
    const n = Math.min(36, 6 + ((size * 0.7) | 0));
    this.particles.push(new Particle(x, y, 0, 0, 0.2, size * 1.7, size * 3, 'flash'));
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(20, size * 5);
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.3, 0.75), rand(size * 0.25, size * 0.6), size * 0.7, 'fire'));
    }
    for (let i = 0; i < n * 0.7; i++) {
      const a = rand(0, TAU), s = rand(10, size * 2);
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(1, 2.2), rand(size * 0.3, size * 0.6), size * 0.8, 'smoke'));
    }
    for (let i = 0; i < n * 0.6; i++) {
      const a = rand(0, TAU), s = rand(150, 480);
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.25, 0.6), 1, 0, 'spark'));
    }
    if (size > 18) {
      for (let i = 0; i < n * 0.4; i++) {
        const a = rand(0, TAU), s = rand(60, 260);
        this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.6, 1.2), rand(3, 6), 0, 'debris', rand(0, TAU)));
      }
    }
    const d = dist(x, y, this.player.x, this.player.y);
    const near = clamp(1 - d / 1400, 0, 1);
    if (near > 0) {
      this.shake(Math.min(16, size * 0.3) * near);
      Sfx.explosion(size / 30, near);
    }
    if (o.ground) this.terrain.addDecal({ type: 'scorch', x, y, r: size * 1.5 });
  },

  readControls(dt) {
    const p = this.player;
    const c = {
      mx: 0, my: 0,
      aimX: p.x + Math.cos(p.angle) * 300, aimY: p.y + Math.sin(p.angle) * 300,
      fire: false, missile: false, flare: false, turbo: false,
    };
    if (this.state !== 'play') return c;
    if (Input.action('left')) c.mx -= 1;
    if (Input.action('right')) c.mx += 1;
    if (Input.action('up')) c.my -= 1;
    if (Input.action('down')) c.my += 1;
    c.flare = Input.actionHit('flare') || Input.hit('btn_flare');
    c.turbo = Input.action('turbo') || Input.buttons.turbo !== undefined;
    c.missile = Input.mouse.right || Input.action('missile') || Input.actionHit('missile') || Input.buttons.missile !== undefined;
    if (Input.touchMode) {
      const m = Input.stick('move');
      c.mx += m.x;
      c.my += m.y;
      const a = Input.stick('aim');
      if (a.mag > 0.2) {
        const ang = Math.atan2(a.y, a.x);
        c.aimX = p.x + Math.cos(ang) * 300;
        c.aimY = p.y + Math.sin(ang) * 300;
        c.fire = a.mag > 0.45;
      }
    } else {
      const turn = (Input.action('turnRight') ? 1 : 0) - (Input.action('turnLeft') ? 1 : 0);
      if (turn) this.aimMode = 'keys';
      else if (Input.mouseMoved || Input.mouse.left || Input.mouse.right) this.aimMode = 'mouse';
      if (this.aimMode === 'keys') {
        p.aimAngle += turn * 3.6 * dt;
        c.aimX = p.x + Math.cos(p.aimAngle) * 300;
        c.aimY = p.y + Math.sin(p.aimAngle) * 300;
        c.assist = true;
      } else {
        const wpt = this.screenToWorld(Input.mouse.x, Input.mouse.y);
        c.aimX = wpt.x;
        c.aimY = wpt.y;
        p.aimAngle = p.angle;
      }
      c.fire = Input.mouse.left || Input.action('fire') || Input.actionHit('fire');
    }
    return c;
  },

  // ------------------------------------------------------------ update

  loop(ts) {
    const dt = Math.min(0.033, (ts - this.last) / 1000 || 0);
    this.last = ts;
    this.update(dt);
    this.render();
    Input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    this.time += dt;
    this.stateT += dt;
    if (this.state !== 'controls' && Input.actionHit('mute')) Sfx.toggleMute();

    switch (this.state) {
      case 'title':
        this.cam.x = this.base.x + Math.cos(this.time * 0.05) * 900;
        this.cam.y = this.base.y + Math.sin(this.time * 0.05) * 600;
        this.player.x = this.cam.x + Math.cos(this.time * 0.5) * (this.w * 0.36) / this.zoom;
        this.player.y = this.cam.y + Math.sin(this.time * 0.5) * (this.h * 0.36) / this.zoom;
        this.player.angle = this.time * 0.5 + Math.PI / 2;
        this.player.rotor += dt * 40;
        if (Input.hit('KeyC')) {
          this.openControls();
          break;
        }
        if (this.stateT > 0.3 && Input.confirm()) {
          Sfx.confirm();
          this.setState('hangar');
        }
        break;
      case 'hangar':
        this.updateHangar();
        break;
      case 'briefing':
        this.player.rotor += dt * 40;
        if (this.stateT > 0.5 && Input.confirm()) {
          Sfx.confirm();
          this.setState('play');
          this.banner(`${this.vehicle.name} - LAUNCH`, HUD_GREEN);
        }
        break;
      case 'paused':
        if (Input.hit('KeyC')) this.openControls();
        else if (this.stateT > 0.2 && (Input.actionHit('pause') || Input.confirm())) this.setState('play');
        break;
      case 'controls':
        this.player.rotor += dt * 40;
        this.updateControlsMenu();
        break;
      case 'play':
        if (Input.actionHit('pause') || Input.hit('btn_pause')) {
          this.setState('paused');
          Sfx.setRotor(false);
          break;
        }
        this.updateWorld(dt);
        this.checkMission();
        break;
      case 'dying':
        this.updateWorld(dt);
        if (this.stateT > 2.6) this.setState('failed');
        break;
      case 'complete':
      case 'failed':
        this.updateWorld(dt);
        if (this.stateT > 1.2 && Input.confirm()) {
          Sfx.confirm();
          if (this.state === 'complete') this.startMission(this.missionIndex + 1);
          else {
            this.score = this.missionStartScore;
            this.startMission(this.missionIndex);
          }
        }
        break;
    }
  },

  openControls() {
    this.menu = { row: 0, slot: 0, from: this.state, waiting: false };
    this.setState('controls');
  },

  // Keyboard-driven rebinding screen. Navigation keys are fixed so the menu can never lock you out.
  updateControlsMenu() {
    const m = this.menu;
    if (m.waiting) return;
    const rows = ACTIONS.length;
    const rebind = () => {
      m.waiting = true;
      Input.capture = (code) => {
        m.waiting = false;
        if (code !== 'Escape') Input.setBind(ACTIONS[m.row].id, m.slot, code);
      };
    };
    if (Input.hit('ArrowUp') || Input.hit('KeyW')) m.row = (m.row + rows) % (rows + 1);
    if (Input.hit('ArrowDown') || Input.hit('KeyS') || Input.hit('Tab')) m.row = (m.row + 1) % (rows + 1);
    if (m.row < rows) {
      if (Input.hit('ArrowLeft') || Input.hit('KeyA')) m.slot = 0;
      if (Input.hit('ArrowRight') || Input.hit('KeyD')) m.slot = 1;
      if (Input.hit('Enter') || Input.hit('Space')) rebind();
      if (Input.hit('Backspace') || Input.hit('Delete')) {
        Input.binds[ACTIONS[m.row].id][m.slot] = null;
        Input.saveBinds();
      }
    } else if (Input.hit('Enter') || Input.hit('Space')) {
      Input.resetBinds();
    }
    if (Input.hit('KeyR')) Input.resetBinds();
    // Mouse: click a key slot to rebind it.
    if (Input.tapped && this.menuHits) {
      for (const hbox of this.menuHits) {
        if (Input.mouse.x >= hbox.x && Input.mouse.x <= hbox.x + hbox.w && Input.mouse.y >= hbox.y && Input.mouse.y <= hbox.y + hbox.h) {
          if (hbox.kind === 'slot') {
            m.row = hbox.row;
            m.slot = hbox.slot;
            rebind();
          } else if (hbox.kind === 'reset') Input.resetBinds();
          else if (hbox.kind === 'back') return this.closeControls();
        }
      }
    }
    if (!m.waiting && (Input.hit('Escape') || Input.hit('KeyC'))) this.closeControls();
  },

  closeControls() {
    this.setState(this.menu.from);
  },

  // Aircraft selection between the title and the first briefing.
  updateHangar() {
    const ids = Object.keys(VEHICLES);
    const step = (d) => {
      const i = (ids.indexOf(this.pickId()) + d + ids.length) % ids.length;
      this.vehicle = VEHICLES[ids[i]];
      this.player = new Player(this.base.x, this.base.y, this.vehicle);
      try {
        localStorage.setItem(VEHICLE_KEY, ids[i]);
      } catch (e) { /* storage unavailable */ }
      Sfx.beep();
    };
    if (Input.hit('ArrowLeft') || Input.hit('KeyA') || Input.actionHit('turnLeft')) step(-1);
    if (Input.hit('ArrowRight') || Input.hit('KeyD') || Input.actionHit('turnRight')) step(1);
    if (Input.hit('Escape')) {
      this.setState('title');
      return;
    }
    // Pointer: the side thirds of the screen page through the aircraft, the middle launches.
    let launch = this.stateT > 0.3 && (Input.hit('Space') || Input.hit('Enter'));
    if (Input.tapped && this.stateT > 0.3) {
      const x = Input.tapX;
      if (x < this.w / 3) step(-1);
      else if (x > (this.w * 2) / 3) step(1);
      else launch = true;
    }
    if (launch) {
      Sfx.confirm();
      this.newGame();
    }
  },

  pickId() {
    return Object.keys(VEHICLES).find((id) => VEHICLES[id] === this.vehicle);
  },

  checkMission() {
    const s = this.mission.status(this);
    if (s === 'won') {
      this.result = 'won';
      this.score += 1000 * (this.missionIndex + 1);
      this.saveBest();
      this.banner('MISSION COMPLETE', HUD_AMBER);
      this.setState('complete');
    } else if (s === 'lost') {
      this.result = 'lost';
      this.setState('failed');
    }
  },

  saveBest() {
    if (this.score <= this.best) return;
    this.best = this.score;
    try {
      localStorage.setItem('chopperGunner.best', String(this.best));
    } catch (e) { /* storage unavailable */ }
  },

  updateWorld(dt) {
    const p = this.player;
    const c = (this.controls = this.readControls(dt));
    if (!p.dead) p.update(dt, this, c);
    this.lockTarget = p.dead ? null : this.computeLock(c);

    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    for (const b of this.bullets) b.update(dt);
    for (const b of this.ebullets) b.update(dt);
    for (const m of this.missiles) if (!m.dead) m.update(dt, this);
    for (const f of this.flares) f.update(dt, this);
    for (const pk of this.pickups) pk.update(dt);
    for (const pt of this.particles) pt.update(dt);
    for (const f of this.floaters) { f.t -= dt; f.y -= 30 * dt; }
    for (const b of this.banners) b.t -= dt;
    for (const em of this.emitters) {
      em.life -= dt;
      if (Math.random() < dt * 10 * Math.min(1, em.life / 3)) {
        this.particles.push(new Particle(em.x + rand(-6, 6), em.y + rand(-6, 6), rand(8, 22), rand(-14, -4), rand(1.5, 2.6), rand(5, 9), 12, 'smoke'));
        if (Math.random() < 0.4) this.particles.push(new Particle(em.x + rand(-6, 6), em.y + rand(-6, 6), 0, 0, 0.35, rand(4, 7), 4, 'fire'));
      }
    }

    this.collide();

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.ebullets = this.ebullets.filter((b) => !b.dead);
    this.missiles = this.missiles.filter((m) => !m.dead);
    this.flares = this.flares.filter((f) => !f.dead);
    this.pickups = this.pickups.filter((pk) => !pk.dead);
    this.particles = this.particles.filter((pt) => !pt.dead);
    if (this.particles.length > 1600) this.particles.splice(0, this.particles.length - 1600);
    this.floaters = this.floaters.filter((f) => f.t > 0);
    this.emitters = this.emitters.filter((em) => em.life > 0);
    this.banners = this.banners.filter((b) => b.t > 0);
    this.banners.forEach((b, i) => (b.slot = i));

    if (this.state === 'play') this.reinforce(dt);

    // Missile warning
    this.missileWarning = false;
    if (!p.dead) {
      for (const m of this.missiles) {
        if (m.owner === 'e' && m.target === p && dist2(m.x, m.y, p.x, p.y) < 1000 * 1000) {
          this.missileWarning = true;
          break;
        }
      }
    }
    this.warnBeepT -= dt;
    if (this.missileWarning && this.warnBeepT <= 0) {
      this.warnBeepT = 0.35;
      Sfx.beep();
    }

    // Camera leads toward where you are aiming and flying.
    if (!p.dead) {
      const lx = clamp((c.aimX - p.x) * 0.25, -140, 140) + p.vx * 0.25;
      const ly = clamp((c.aimY - p.y) * 0.25, -140, 140) + p.vy * 0.25;
      const k = 1 - Math.exp(-4 * dt);
      this.cam.x += (p.x + lx - this.cam.x) * k;
      this.cam.y += (p.y + ly - this.cam.y) * k;
    }
    this.shakeAmt *= Math.exp(-7 * dt);
    this.shakeX = rand(-1, 1) * this.shakeAmt;
    this.shakeY = rand(-1, 1) * this.shakeAmt;

    Sfx.setRotor(!p.dead && this.state !== 'paused', p.turboOn);
  },

  collide() {
    const p = this.player;
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const rr = e.r + 3;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          e.hurt(b.dmg, this);
          b.dead = true;
          this.particles.push(new Particle(b.x, b.y, rand(-80, 80), rand(-80, 80), 0.2, 1, 0, 'spark'));
          this.particles.push(new Particle(b.x, b.y, 0, 0, 0.06, 6, 0, 'muzzle'));
          break;
        }
      }
      if (b.dead) continue;
      for (const m of this.missiles) {
        if (m.owner !== 'e' || m.dead) continue;
        if (dist2(b.x, b.y, m.x, m.y) < 15 * 15) {
          m.dead = true;
          b.dead = true;
          this.explode(m.x, m.y, 12);
          this.addScore(50, m.x, m.y);
          break;
        }
      }
    }

    for (const m of this.missiles) {
      if (m.dead) continue;
      if (m.owner === 'p') {
        for (const e of this.enemies) {
          if (e.dead) continue;
          const rr = e.r + 8;
          if (dist2(m.x, m.y, e.x, e.y) < rr * rr) {
            m.dead = true;
            this.explode(m.x, m.y, 24);
            e.hurt(m.dmg, this);
            for (const o of this.enemies) {
              if (o !== e && !o.dead && dist2(o.x, o.y, m.x, m.y) < 90 * 90) o.hurt(18, this);
            }
            break;
          }
        }
      } else {
        if (m.target && m.target instanceof Flare && dist2(m.x, m.y, m.target.x, m.target.y) < 22 * 22) {
          m.dead = true;
          this.explode(m.x, m.y, 14);
          continue;
        }
        if (!p.dead && dist2(m.x, m.y, p.x, p.y) < p.r * p.r) {
          m.dead = true;
          this.explode(m.x, m.y, 22);
          p.damage(m.dmg, this);
        }
      }
    }

    if (!p.dead) {
      const rr = (p.r - 3) * (p.r - 3);
      for (const b of this.ebullets) {
        if (!b.dead && dist2(b.x, b.y, p.x, p.y) < rr) {
          b.dead = true;
          p.damage(b.dmg, this);
          this.particles.push(new Particle(b.x, b.y, rand(-60, 60), rand(-60, 60), 0.25, 1, 0, 'spark'));
        }
      }
      for (const pk of this.pickups) {
        if (!pk.dead && dist2(pk.x, pk.y, p.x, p.y) < 46 * 46) {
          pk.dead = true;
          Sfx.pickup();
          if (pk.kind === 'repair') { p.hp = Math.min(p.maxHp, p.hp + 30); this.floaters.push({ x: pk.x, y: pk.y, text: 'ARMOR +30', t: 1.2 }); }
          if (pk.kind === 'missiles') { p.missiles = Math.min(p.maxMissiles, p.missiles + 4); this.floaters.push({ x: pk.x, y: pk.y, text: 'MISSILES +4', t: 1.2 }); }
          if (pk.kind === 'flares') { p.flares = Math.min(p.maxFlares, p.flares + 2); this.floaters.push({ x: pk.x, y: pk.y, text: 'FLARES +2', t: 1.2 }); }
        }
      }
    }
  },

  reinforce(dt) {
    const r = this.mission.reinforce;
    this.reinforceT -= dt;
    if (this.reinforceT > 0) return;
    this.reinforceT = r.every / Math.sqrt(this.difficulty);
    if (this.enemies.length >= r.cap * Math.sqrt(this.difficulty)) return;
    const type = pick(r.types);
    const p = this.player;
    if (type === 'jet') {
      const a = rand(0, TAU);
      const x = p.x + Math.cos(a) * 1600, y = p.y + Math.sin(a) * 1600;
      this.enemies.push(new Jet(x, y, p.x, p.y, this.difficulty));
      Sfx.jet();
      this.banner('FAST MOVER INBOUND', HUD_RED);
    } else if (type === 'gunship') {
      const a = rand(0, TAU);
      const e = new Gunship(clamp(p.x + Math.cos(a) * 1200, 100, WORLD_W - 100), clamp(p.y + Math.sin(a) * 1200, 100, WORLD_H - 100), this.difficulty);
      e.aware = true;
      this.enemies.push(e);
    } else {
      const pt = this.landPoint(p, 1000, 1500);
      this.enemies.push(this.make(type, pt.x, pt.y));
    }
  },

  // ------------------------------------------------------------ render

  render() {
    const ctx = this.ctx;
    const z = this.zoom, d = this.dpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const cx = this.cam.x + this.shakeX, cy = this.cam.y + this.shakeY;
    const vw = this.w / z, vh = this.h / z;
    const vx0 = cx - vw / 2, vy0 = cy - vh / 2;
    ctx.setTransform(z * d, 0, 0, z * d, (this.w / 2 - cx * z) * d, (this.h / 2 - cy * z) * d);

    const budget = this.state === 'play' || this.state === 'title' ? 3 : 40;
    this.terrain.draw(ctx, vx0 - 10, vy0 - 10, vx0 + vw + 10, vy0 + vh + 10, budget);
    const pad = 80;
    const inView = (o) => o.x > vx0 - pad && o.x < vx0 + vw + pad && o.y > vy0 - pad && o.y < vy0 + vh + pad;

    this.drawBase(ctx);
    if (this.checkpoint) this.drawCheckpoint(ctx);

    for (const pk of this.pickups) if (inView(pk)) pk.draw(ctx);
    for (const e of this.enemies) if (!e.air && inView(e)) e.draw(ctx);

    for (const e of this.enemies) if (e.air && inView(e)) e.drawShadow(ctx);
    const showPlayer = !this.player.dead && this.state !== 'hangar';
    if (showPlayer) this.player.drawShadow(ctx);

    for (const b of this.ebullets) if (inView(b)) b.draw(ctx);
    for (const b of this.bullets) if (inView(b)) b.draw(ctx);
    for (const m of this.missiles) if (inView(m)) m.draw(ctx);

    for (const e of this.enemies) if (e.air && inView(e)) e.draw(ctx);
    if (showPlayer) this.player.draw(ctx);

    for (const pt of this.particles) if (!pt.additive && inView(pt)) pt.draw(ctx);
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of this.particles) if (pt.additive && inView(pt)) pt.draw(ctx);
    for (const f of this.flares) if (inView(f)) f.draw(ctx);
    ctx.globalCompositeOperation = 'source-over';

    for (const f of this.floaters) {
      ctx.globalAlpha = clamp(f.t, 0, 1);
      Hud.text(ctx, f.text, f.x, f.y, { size: 13, align: 'center', color: '#fff3c0' });
    }
    ctx.globalAlpha = 1;

    if (this.state === 'play' && this.lockTarget) {
      Hud.lockBox(ctx, this.lockTarget.x, this.lockTarget.y, this.lockTarget.r, this.time);
    }

    // Screen space
    ctx.setTransform(d, 0, 0, d, 0, 0);
    switch (this.state) {
      case 'title': this.drawTitle(ctx); break;
      case 'hangar': this.drawHangar(ctx); break;
      case 'controls':
        if (this.menu.from === 'title') this.dim(ctx, 0.3);
        this.drawControls(ctx);
        break;
      case 'briefing': this.drawBriefing(ctx); break;
      default:
        Hud.draw(ctx, this);
        if (this.state === 'play' && !Input.touchMode && !this.player.dead) {
          if (this.aimMode === 'keys') {
            const p = this.player;
            const s = this.worldToScreen(p.x + Math.cos(p.angle) * 260, p.y + Math.sin(p.angle) * 260);
            Hud.crosshair(ctx, s.x, s.y, !!this.lockTarget);
          } else Hud.crosshair(ctx, Input.mouse.x, Input.mouse.y, !!this.lockTarget);
        }
        if (this.state === 'paused') this.drawCenterPanel(ctx, 'PAUSED', [`${Input.bindLabel('pause')} or tap to resume`, 'C  controls / key bindings', `${Input.bindLabel('mute')}  toggles sound`]);
        if (this.state === 'complete') this.drawComplete(ctx);
        if (this.state === 'failed') this.drawFailed(ctx);
    }
  },

  drawBase(ctx) {
    const { x, y } = this.base;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-126, -116, 260, 240);
    ctx.fillStyle = '#7b7f80';
    ctx.fillRect(-130, -120, 260, 240);
    ctx.strokeStyle = '#5d6162';
    ctx.lineWidth = 2;
    for (let i = -130; i <= 130; i += 52) {
      ctx.beginPath(); ctx.moveTo(i, -120); ctx.lineTo(i, 120); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-130, i * 0.92); ctx.lineTo(130, i * 0.92); ctx.stroke();
    }
    // hangar
    ctx.fillStyle = '#4a4f52';
    ctx.fillRect(-120, -112, 90, 60);
    ctx.fillStyle = '#3a3e40';
    for (let i = 0; i < 6; i++) ctx.fillRect(-120, -112 + i * 10, 90, 4);
    ctx.fillStyle = '#5e5a3e';
    ctx.fillRect(60, -108, 50, 26);
    ctx.fillRect(60, -74, 50, 26);
    // pad
    const pulse = this.player.onPad ? 0.6 + 0.4 * Math.sin(this.time * 6) : 1;
    ctx.fillStyle = '#545859';
    ctx.beginPath();
    ctx.arc(0, 10, 70, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,200,60,${pulse})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 10, 62, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = `rgba(240,240,240,${pulse})`;
    ctx.fillRect(-22, -18, 9, 56);
    ctx.fillRect(13, -18, 9, 56);
    ctx.fillRect(-13, 6, 26, 8);
    // corner lights
    const on = Math.floor(this.time * 2) % 2;
    for (const [lx, ly] of [[-126, -116], [126, -116], [-126, 116], [126, 116]]) {
      ctx.fillStyle = on ? '#ff4030' : '#601810';
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  },

  drawCheckpoint(ctx) {
    const { x, y } = this.checkpoint;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#5a5248';
    ctx.fillRect(-50, -50, 100, 100);
    ctx.fillStyle = '#d8d0b8';
    ctx.fillRect(-46, -46, 30, 24);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#d33' : '#eee';
      ctx.fillRect(-40 + i * 10, -4, 10, 8);
    }
    ctx.restore();
  },

  // ------------------------------------------------------------ screens

  dim(ctx, a = 0.6) {
    ctx.fillStyle = `rgba(3,6,10,${a})`;
    ctx.fillRect(0, 0, this.w, this.h);
  },

  drawTitle(ctx) {
    this.dim(ctx, 0.45);
    const w = this.w, h = this.h;
    const small = w < 600;
    const ts = small ? 32 : 64;
    Hud.text(ctx, 'CHOPPER', w / 2, h * 0.3, { size: ts, align: 'center', font: TITLE_FONT, weight: '900', color: '#e9ecef' });
    Hud.text(ctx, 'GUNNER', w / 2, h * 0.3 + ts * 1.05, { size: ts, align: 'center', font: TITLE_FONT, weight: '900', color: HUD_AMBER });
    Hud.text(ctx, 'A STORMWOLF MISSION', w / 2, h * 0.3 + ts * 1.05 + 34, { size: small ? 13 : 16, align: 'center', color: '#9fb4c0' });

    const lines = Input.touchMode || 'ontouchstart' in window && w < 900
      ? ['LEFT THUMB  move', 'RIGHT THUMB  aim + fire', 'MSL missiles   FLR flares   TRB turbo', 'Hover over the base pad to repair & rearm']
      : [
        `${['up', 'left', 'down', 'right'].map((a) => Input.bindLabel(a)).join('')}  fly     ${Input.bindLabel('turnLeft')} ${Input.bindLabel('turnRight')}  turn (or aim with MOUSE)`,
        `${Input.bindLabel('fire')} / LEFT CLICK  chain guns`,
        `${Input.bindLabel('missile')} / RIGHT CLICK  missiles`,
        `${Input.bindLabel('turbo')}  turbo     ${Input.bindLabel('flare')}  flares     ${Input.bindLabel('pause')}  pause`,
        'Hover over the base pad to repair & rearm',
        'C  change controls',
      ];
    let y = h * 0.58;
    for (const l of lines) {
      Hud.text(ctx, l, w / 2, y, { size: small ? 12 : 15, align: 'center', color: '#c8d6dc' });
      y += small ? 20 : 24;
    }
    if (Math.floor(this.time * 2) % 2 === 0) {
      Hud.text(ctx, 'PRESS SPACE / CLICK / TAP TO START', w / 2, h * 0.9, { size: small ? 14 : 18, align: 'center', color: HUD_GREEN });
    }
    if (this.best) Hud.text(ctx, `BEST ${this.best}`, w / 2, h * 0.9 + 28, { size: 13, align: 'center', color: '#9fb4c0' });
  },

  drawHangar(ctx) {
    this.dim(ctx, 0.62);
    const w = this.w, h = this.h;
    const small = w < 600;
    const v = this.vehicle;
    const ids = Object.keys(VEHICLES);
    const list = ids.map((id) => VEHICLES[id]);
    const idx = ids.indexOf(this.pickId());

    Hud.text(ctx, 'SELECT AIRCRAFT', w / 2, Math.max(44, h * 0.09), { size: small ? 20 : 28, align: 'center', font: TITLE_FONT, weight: '900', color: HUD_AMBER });

    // The chosen aircraft, turning slowly on a lit pad.
    const cy = h * (small ? 0.3 : 0.32);
    const sc = clamp(Math.min(w, h * 0.8) / 300, 1.2, 2.6);
    const pr = 46 * sc;
    const pad = ctx.createRadialGradient(w / 2, cy, pr * 0.2, w / 2, cy, pr);
    pad.addColorStop(0, 'rgba(125,255,176,0.14)');
    pad.addColorStop(1, 'rgba(125,255,176,0)');
    ctx.fillStyle = pad;
    ctx.beginPath();
    ctx.arc(w / 2, cy, pr, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(125,255,176,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w / 2, cy, pr * 0.92, 0, TAU);
    ctx.stroke();
    const spin = -Math.PI / 2 + Math.sin(this.time * 0.6) * 0.5;
    const rotor = this.time * 30;
    const vs = (sc * 20) / v.r; // fit big and small airframes to the same pad
    v.draw(ctx, w / 2 + 8 * sc, cy + 10 * sc, spin, rotor, { shadow: true, scale: vs * 0.92 });
    v.draw(ctx, w / 2, cy, spin, rotor, { ...v.colors, scale: vs });

    // Arrows either side.
    const ax = Math.min(w * 0.38, 280);
    for (const d of [-1, 1]) {
      const x = w / 2 + d * ax;
      ctx.fillStyle = 'rgba(125,255,176,0.75)';
      ctx.beginPath();
      ctx.moveTo(x + d * 12, cy);
      ctx.lineTo(x - d * 8, cy - 16);
      ctx.lineTo(x - d * 8, cy + 16);
      ctx.closePath();
      ctx.fill();
    }

    let y = cy + pr + (small ? 26 : 34);
    Hud.text(ctx, v.name, w / 2, y, { size: small ? 22 : 30, align: 'center', font: TITLE_FONT, weight: '900', color: '#e9ecef' });
    y += small ? 20 : 24;
    Hud.text(ctx, v.role, w / 2, y, { size: small ? 12 : 14, align: 'center', color: HUD_AMBER });
    y += small ? 20 : 24;
    ctx.font = `${small ? 12 : 14}px ${FONT}`;
    for (const line of this.wrap(ctx, v.blurb, Math.min(520, w - 40))) {
      Hud.text(ctx, line, w / 2, y, { size: small ? 12 : 14, align: 'center', color: '#c8d6dc' });
      y += small ? 17 : 20;
    }

    // Stat bars, scaled against the best in the fleet.
    const stats = [
      ['ARMOR', (u) => u.hp],
      ['SPEED', (u) => u.speed],
      ['AGILITY', (u) => u.turn],
      ['FIREPOWER', (u) => u.gun.dmg / u.gun.cd],
      ['MISSILES', (u) => u.missiles],
      ['FLARES', (u) => u.flares],
    ];
    const bw = Math.min(220, w * 0.45), bx = w / 2 - bw / 2 + 40;
    y += 12;
    for (const [label, get] of stats) {
      const max = Math.max(...list.map(get));
      Hud.bar(ctx, bx, y, bw, 8, get(v) / max, HUD_GREEN, label);
      y += small ? 16 : 19;
    }

    // Which of the fleet this is.
    y += 10;
    list.forEach((_, i) => {
      ctx.fillStyle = i === idx ? HUD_AMBER : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(w / 2 + (i - (list.length - 1) / 2) * 16, y, i === idx ? 4.5 : 3.5, 0, TAU);
      ctx.fill();
    });

    const prompt = Input.touchMode
      ? 'TAP THE SIDES TO CHOOSE - TAP THE MIDDLE TO LAUNCH'
      : '\u2190 \u2192 CHOOSE    SPACE / CLICK LAUNCH    ESC BACK';
    if (Math.floor(this.time * 2) % 2 === 0) {
      Hud.text(ctx, prompt, w / 2, Math.min(h - 24, y + (small ? 34 : 44)), { size: small ? 12 : 16, align: 'center', color: HUD_GREEN });
    }
  },

  drawBriefing(ctx) {
    this.dim(ctx, 0.72);
    const w = this.w, h = this.h;
    const small = w < 600;
    const pw = Math.min(680, w - 32);
    const x = (w - pw) / 2;
    let y = Math.max(60, h * 0.2);
    const tour = Math.floor(this.missionIndex / MISSIONS.length);
    Hud.text(ctx, `OVERWATCH SECURE BRIEFING${tour ? ' - TOUR ' + (tour + 1) : ''}`, x, y, { size: 13, color: '#9fb4c0' });
    y += 34;
    Hud.text(ctx, this.mission.title, x, y, { size: small ? 20 : 30, font: TITLE_FONT, weight: '700', color: HUD_AMBER });
    y += 36;
    // Typewriter reveal
    let chars = Math.floor(this.stateT * 70);
    ctx.font = `${small ? 13 : 16}px ${FONT}`;
    for (const line of this.mission.brief) {
      const wrapped = this.wrap(ctx, line, pw);
      for (const wl of wrapped) {
        if (chars <= 0) break;
        Hud.text(ctx, wl.slice(0, chars), x, y, { size: small ? 13 : 16, color: '#d6e2e8' });
        chars -= wl.length;
        y += small ? 20 : 24;
      }
      y += 8;
    }
    if (this.stateT > 0.5 && Math.floor(this.time * 2) % 2 === 0) {
      Hud.text(ctx, 'PRESS SPACE / TAP TO LAUNCH', w / 2, Math.min(h - 40, y + 40), { size: small ? 14 : 18, align: 'center', color: HUD_GREEN });
    }
  },

  drawControls(ctx) {
    this.dim(ctx, 0.62);
    const m = this.menu;
    const w = this.w, h = this.h;
    const pw = Math.min(560, w - 32);
    const x0 = (w - pw) / 2;
    const rowH = Math.min(30, (h - 190) / (ACTIONS.length + 1));
    let y = Math.max(40, (h - rowH * (ACTIONS.length + 1) - 120) / 2);
    Hud.text(ctx, 'CONTROLS', w / 2, y, { size: 26, align: 'center', font: TITLE_FONT, weight: '900', color: HUD_AMBER });
    y += 30;
    Hud.text(ctx, 'Arrows/WASD select   ENTER rebind   BKSP clear   R reset   ESC back', w / 2, y, { size: 12, align: 'center', color: '#9fb4c0' });
    y += 22;
    const colW = (pw - 200) / 2;
    const hits = [];
    ACTIONS.forEach((a, i) => {
      const ry = y + i * rowH;
      const selRow = m.row === i;
      if (selRow) {
        ctx.fillStyle = 'rgba(125,255,176,0.08)';
        ctx.fillRect(x0, ry, pw, rowH - 2);
      }
      Hud.text(ctx, a.label, x0 + 12, ry + rowH * 0.68, { size: 14, color: selRow ? '#ffffff' : '#c8d6dc' });
      for (let s = 0; s < 2; s++) {
        const bx = x0 + 200 + s * colW, bw = colW - 8;
        const active = selRow && m.slot === s;
        ctx.strokeStyle = active ? HUD_AMBER : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = active ? 2 : 1;
        ctx.strokeRect(bx, ry + 2, bw, rowH - 6);
        const label = active && m.waiting ? (Math.floor(this.time * 3) % 2 ? 'PRESS A KEY' : '') : keyName(Input.binds[a.id][s]);
        Hud.text(ctx, label, bx + bw / 2, ry + rowH * 0.68, { size: 14, align: 'center', color: active ? HUD_AMBER : HUD_GREEN });
        hits.push({ kind: 'slot', row: i, slot: s, x: bx, y: ry + 2, w: bw, h: rowH - 6 });
      }
    });
    const by = y + ACTIONS.length * rowH + 8;
    const resetSel = m.row === ACTIONS.length;
    ctx.strokeStyle = resetSel ? HUD_AMBER : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = resetSel ? 2 : 1;
    ctx.strokeRect(x0, by, 180, 30);
    Hud.text(ctx, 'RESET DEFAULTS', x0 + 90, by + 20, { size: 14, align: 'center', color: resetSel ? HUD_AMBER : '#c8d6dc' });
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + pw - 120, by, 120, 30);
    Hud.text(ctx, 'BACK', x0 + pw - 60, by + 20, { size: 14, align: 'center', color: '#c8d6dc' });
    hits.push({ kind: 'reset', x: x0, y: by, w: 180, h: 30 }, { kind: 'back', x: x0 + pw - 120, y: by, w: 120, h: 30 });
    if (m.waiting) Hud.text(ctx, 'Press the new key for ' + ACTIONS[m.row].label + '  (ESC cancels)', w / 2, by + 60, { size: 14, align: 'center', color: HUD_AMBER });
    else Hud.text(ctx, 'Mouse aiming always works too: moving the mouse takes over from the turn keys.', w / 2, by + 60, { size: 12, align: 'center', color: '#9fb4c0' });
    this.menuHits = hits;
  },

  wrap(ctx, text, maxW) {
    const words = text.split(' ');
    const out = [];
    let line = '';
    for (const wd of words) {
      const t = line ? line + ' ' + wd : wd;
      if (ctx.measureText(t).width > maxW && line) {
        out.push(line);
        line = wd;
      } else line = t;
    }
    if (line) out.push(line);
    return out;
  },

  drawCenterPanel(ctx, title, lines, color = HUD_AMBER) {
    this.dim(ctx, 0.55);
    const w = this.w, h = this.h;
    const small = w < 600;
    Hud.text(ctx, title, w / 2, h * 0.4, { size: small ? 26 : 42, align: 'center', font: TITLE_FONT, weight: '900', color });
    let y = h * 0.4 + 44;
    for (const l of lines) {
      Hud.text(ctx, l, w / 2, y, { size: small ? 13 : 16, align: 'center', color: '#d6e2e8' });
      y += 24;
    }
  },

  drawComplete(ctx) {
    if (this.stateT < 1) return;
    const last = (this.missionIndex + 1) % MISSIONS.length === 0;
    const lines = [`Score ${this.score}`, `Kills this mission: ${this.kills}`, ''];
    if (last) lines.unshift('The militia air force is finished. Overwatch has a new tour for you.');
    lines.push('PRESS SPACE / TAP FOR NEXT BRIEFING');
    this.drawCenterPanel(ctx, last ? 'CAMPAIGN COMPLETE' : 'MISSION COMPLETE', lines);
  },

  drawFailed(ctx) {
    const title = this.result === 'down' ? `${this.vehicle.name} DOWN` : 'MISSION FAILED';
    const why = this.result === 'down' ? 'Your armor gave out.' : 'Too many trucks crossed the border.';
    this.drawCenterPanel(ctx, title, [why, '', 'PRESS SPACE / TAP TO RETRY'], HUD_RED);
  },
};

window.addEventListener('load', () => G.init());
