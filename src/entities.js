'use strict';

// ---------------------------------------------------------------- drawing

// Helicopter seen from above, nose pointing along +x.
function drawChopper(ctx, x, y, angle, rotor, o) {
  const s = o.scale || 1;
  const shadow = !!o.shadow;
  const body = shadow ? 'rgba(0,0,0,0.22)' : o.flash ? '#ffffff' : o.body;
  const dark = shadow ? body : o.flash ? '#ffffff' : o.dark;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-42, -2);
  ctx.lineTo(-42, 2);
  ctx.lineTo(-6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-36, -9, 5, 18); // stabiliser
  ctx.fillRect(-47, -2.5, 6, 5); // fin
  ctx.fillRect(-4, -19, 10, 38); // stub wings
  ctx.fillStyle = dark;
  ctx.fillRect(-9, -23, 22, 7); // weapon pods
  ctx.fillRect(-9, 16, 22, 7);

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.quadraticCurveTo(24, -10, 8, -11);
  ctx.lineTo(-10, -9);
  ctx.quadraticCurveTo(-17, 0, -10, 9);
  ctx.lineTo(8, 11);
  ctx.quadraticCurveTo(24, 10, 28, 0);
  ctx.fill();

  if (!shadow) {
    ctx.strokeStyle = '#8a8f96';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(13, -19.5); ctx.lineTo(23, -19.5);
    ctx.moveTo(13, 19.5); ctx.lineTo(23, 19.5);
    ctx.stroke();

    // Livery: pale belly showing along the flanks.
    ctx.strokeStyle = o.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, -4);
    ctx.quadraticCurveTo(15, -10.5, -9, -8.6);
    ctx.moveTo(25, 4);
    ctx.quadraticCurveTo(15, 10.5, -9, 8.6);
    ctx.stroke();

    ctx.fillStyle = '#0b0c0e';
    ctx.fillRect(-14, -6.5, 7, 4);
    ctx.fillRect(-14, 2.5, 7, 4);
    if (o.turbo) {
      const gr = ctx.createRadialGradient(-17, 0, 0, -17, 0, 24);
      gr.addColorStop(0, 'rgba(255,230,160,0.95)');
      gr.addColorStop(0.35, 'rgba(255,130,40,0.6)');
      gr.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(-20, 0, 24, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = o.glass || '#22445c';
    ctx.beginPath();
    ctx.ellipse(15, 0, 9, 6.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(17, -2.5, 4, 1.8, -0.3, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = `rgba(220,220,220,${0.25 + 0.25 * Math.abs(Math.sin(rotor * 2))})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-51, 4.5);
    ctx.lineTo(-38, 4.5);
    ctx.stroke();
  }

  ctx.translate(2, 0);
  const R = 38;
  if (!shadow) {
    ctx.fillStyle = 'rgba(180,190,200,0.09)';
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = shadow ? 'rgba(0,0,0,0.16)' : 'rgba(25,27,30,0.6)';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a0 = rotor - k * 0.13;
    ctx.globalAlpha = 1 - k * 0.32;
    ctx.beginPath();
    for (let b = 0; b < 4; b++) {
      const a = a0 + (b * Math.PI) / 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!shadow) {
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawJetShape(ctx, x, y, angle, o) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(o.scale || 1, o.scale || 1);
  if (!o.shadow) {
    const gr = ctx.createRadialGradient(-30, 0, 0, -30, 0, 16);
    gr.addColorStop(0, 'rgba(255,220,150,0.9)');
    gr.addColorStop(1, 'rgba(255,90,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(-32, 0, 16, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = o.shadow ? 'rgba(0,0,0,0.2)' : o.flash ? '#fff' : o.body;
  ctx.beginPath();
  const pts = [[34, 0], [6, -5], [-12, -25], [-17, -6], [-25, -12], [-28, -3], [-28, 3], [-25, 12], [-17, 6], [-12, 25], [6, 5]];
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();
  if (!o.shadow) {
    ctx.fillStyle = '#3d5566';
    ctx.beginPath();
    ctx.ellipse(14, 0, 7, 3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#b8342a';
    ctx.beginPath();
    ctx.arc(-11, -18, 2.5, 0, TAU);
    ctx.arc(-11, 18, 2.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- projectiles

class Bullet {
  constructor(x, y, vx, vy, owner, dmg, life, kind = 'bullet') {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.owner = owner; this.dmg = dmg; this.life = life; this.kind = kind;
    this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    if (this.owner === 'p') {
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx * 0.022, this.y - this.vy * 0.022);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    } else if (this.kind === 'shell') {
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ff6a3a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, TAU);
      ctx.fill();
    }
  }
}

class Missile {
  constructor(x, y, angle, owner, target, o) {
    this.x = x; this.y = y; this.angle = angle;
    this.owner = owner; this.target = target;
    this.speed = o.speed; this.maxSpeed = o.maxSpeed; this.accel = o.accel;
    this.turn = o.turn; this.dmg = o.dmg; this.life = o.life;
    this.dead = false;
    this.trailT = 0;
    this.arm = 0.12; // brief unguided boost off the rail
  }
  update(dt, g) {
    this.arm -= dt;
    const t = this.target;
    if (t && !t.dead && this.arm <= 0) {
      this.angle = turnToward(this.angle, Math.atan2(t.y - this.y, t.x - this.x), this.turn * dt);
    } else if (this.owner === 'p' && (!t || t.dead)) {
      this.target = g.findTarget(this.x, this.y, this.angle, 650);
    }
    this.speed = Math.min(this.maxSpeed, this.speed + this.accel * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.life -= dt;
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.018;
      g.particles.push(new Particle(this.x - Math.cos(this.angle) * 8, this.y - Math.sin(this.angle) * 8,
        rand(-10, 10), rand(-10, 10), rand(0.5, 0.9), 3, 9, 'trail'));
    }
    if (this.life <= 0) {
      this.dead = true;
      g.explode(this.x, this.y, 10);
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.owner === 'p' ? '#e8e8e8' : '#d9d2c0';
    ctx.fillRect(-7, -1.8, 13, 3.6);
    ctx.fillStyle = this.owner === 'p' ? '#2a2a2a' : '#b83020';
    ctx.fillRect(4, -1.8, 3, 3.6);
    ctx.fillRect(-7, -3.5, 3, 7);
    ctx.fillStyle = 'rgba(255,200,90,0.9)';
    ctx.beginPath();
    ctx.arc(-9, 0, 3 + Math.random() * 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

class Flare {
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = 2.6;
    this.dead = false;
  }
  update(dt, g) {
    const k = Math.exp(-1.6 * dt);
    this.vx *= k;
    this.vy *= k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (Math.random() < 0.6) g.particles.push(new Particle(this.x, this.y, rand(-15, 15), rand(-15, 15), 0.5, 3, 6, 'trail'));
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const r = 6 + Math.random() * 4;
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,170,60,0.35)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- effects

class Particle {
  constructor(x, y, vx, vy, life, size, grow, type, rot = 0) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = this.maxLife = life;
    this.size = size; this.grow = grow; this.type = type;
    this.rot = rot;
    this.dead = false;
  }
  update(dt) {
    const drag = this.type === 'spark' || this.type === 'debris' ? 2 : 3;
    const k = Math.exp(-drag * dt);
    this.vx *= k;
    this.vy *= k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.size += this.grow * dt;
    this.rot += dt * 8;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  get additive() {
    return this.type === 'fire' || this.type === 'spark' || this.type === 'flash' || this.type === 'muzzle';
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    switch (this.type) {
      case 'smoke':
        ctx.fillStyle = `rgba(48,46,44,${0.4 * t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      case 'trail':
        ctx.fillStyle = `rgba(215,215,210,${0.35 * t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      case 'debris':
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.fillStyle = `rgba(30,28,26,${Math.min(1, t * 2)})`;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
        ctx.restore();
        break;
      case 'fire': {
        const r = 255, gg = (90 + 160 * t) | 0, b = (30 + 120 * t * t) | 0;
        ctx.fillStyle = `rgba(${r},${gg},${b},${0.75 * t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      }
      case 'spark':
        ctx.strokeStyle = `rgba(255,214,130,${t})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.035, this.y - this.vy * 0.035);
        ctx.stroke();
        break;
      case 'muzzle':
        ctx.fillStyle = `rgba(255,230,140,${t})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      case 'flash': {
        const gr = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gr.addColorStop(0, `rgba(255,250,230,${t})`);
        gr.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        break;
      }
    }
  }
}

class Pickup {
  constructor(x, y, kind) {
    this.x = x; this.y = y; this.kind = kind;
    this.life = 20;
    this.t = Math.random() * 10;
    this.dead = false;
  }
  update(dt) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    if (this.life < 4 && Math.floor(this.t * 8) % 2) return;
    const s = 1 + Math.sin(this.t * 4) * 0.08;
    const col = { repair: '#4cd47a', missiles: '#ffb02e', flares: '#5ec8ff' }[this.kind];
    const label = { repair: '+', missiles: 'M', flares: 'F' }[this.kind];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(3, 4, 15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#10161c';
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- player

class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.angle = -Math.PI / 2;
    this.aimAngle = this.angle;
    this.r = 20;
    this.hp = this.maxHp = 100;
    this.missiles = this.maxMissiles = 8;
    this.flares = this.maxFlares = 4;
    this.turbo = 100;
    this.heat = 0;
    this.overheat = false;
    this.gunCd = 0; this.misCd = 0; this.flareCd = 0;
    this.rotor = 0;
    this.gunSide = 1; this.misSide = 1;
    this.turboOn = false;
    this.hitFlash = 0;
    this.rearmT = 0;
    this.onPad = false;
    this.dead = false;
  }

  update(dt, g, c) {
    let mx = c.mx, my = c.my;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }

    this.turboOn = c.turbo && this.turbo > 1 && ml > 0.1;
    if (this.turboOn) this.turbo = Math.max(0, this.turbo - 30 * dt);
    else this.turbo = Math.min(100, this.turbo + 9 * dt);

    const maxSpd = this.turboOn ? 580 : 270;
    const k = 1 - Math.exp(-(this.turboOn ? 2.4 : 3.2) * dt);
    this.vx += (mx * maxSpd - this.vx) * k;
    this.vy += (my * maxSpd - this.vy) * k;
    this.x = clamp(this.x + this.vx * dt, 40, WORLD_W - 40);
    this.y = clamp(this.y + this.vy * dt, 40, WORLD_H - 40);

    this.angle = turnToward(this.angle, Math.atan2(c.aimY - this.y, c.aimX - this.x), 7 * dt);
    this.rotor += dt * (this.turboOn ? 52 : 40);

    this.gunCd -= dt; this.misCd -= dt; this.flareCd -= dt; this.hitFlash -= dt;
    this.heat = Math.max(0, this.heat - 26 * dt);
    if (this.overheat && this.heat < 35) this.overheat = false;

    const ca = Math.cos(this.angle), sa = Math.sin(this.angle);

    if (c.fire && !this.overheat && this.gunCd <= 0) {
      this.gunCd = 0.06;
      this.heat += 2.8;
      if (this.heat >= 100) {
        this.heat = 100;
        this.overheat = true;
        Sfx.overheat();
      }
      this.gunSide *= -1;
      const ox = this.x + ca * 24 - sa * 19.5 * this.gunSide;
      const oy = this.y + sa * 24 + ca * 19.5 * this.gunSide;
      let a = this.angle;
      // Keyboard players get a little help: rounds bend onto a target that is nearly dead ahead.
      const t = g.lockTarget;
      if (c.assist && t) {
        const ta = Math.atan2(t.y - oy, t.x - ox);
        if (Math.abs(angDiff(this.angle, ta)) < 0.22) a = ta;
      }
      a += rand(-0.035, 0.035);
      g.bullets.push(new Bullet(ox, oy, Math.cos(a) * 980 + this.vx * 0.5, Math.sin(a) * 980 + this.vy * 0.5, 'p', 7, 0.7));
      g.particles.push(new Particle(ox, oy, this.vx, this.vy, 0.05, 5, 0, 'muzzle'));
      Sfx.gun();
    }

    if (c.missile && this.misCd <= 0 && this.missiles > 0) {
      this.misCd = 0.4;
      this.missiles--;
      this.misSide *= -1;
      const ox = this.x + ca * 4 - sa * 20 * this.misSide;
      const oy = this.y + sa * 4 + ca * 20 * this.misSide;
      const spd = Math.hypot(this.vx, this.vy);
      g.missiles.push(new Missile(ox, oy, this.angle, 'p', g.lockTarget,
        { speed: 260 + spd * 0.5, maxSpeed: 840, accel: 950, turn: 4.8, dmg: 55, life: 2.8 }));
      Sfx.missile();
    }

    if (c.flare && this.flareCd <= 0 && this.flares > 0) {
      this.flareCd = 1.0;
      this.flares--;
      const fl = [];
      for (let i = 0; i < 6; i++) {
        const a = this.angle + Math.PI + rand(-1.3, 1.3);
        const f = new Flare(this.x, this.y, Math.cos(a) * rand(150, 300) + this.vx * 0.3, Math.sin(a) * rand(150, 300) + this.vy * 0.3);
        fl.push(f);
        g.flares.push(f);
      }
      // Missiles already tracking us have a good chance of chasing the decoys instead.
      for (const m of g.missiles) {
        if (m.owner === 'e' && m.target === this && Math.random() < 0.85 && dist2(m.x, m.y, this.x, this.y) < 900 * 900) {
          m.target = pick(fl);
        }
      }
      Sfx.flare();
    }

    const dB = dist(this.x, this.y, g.base.x, g.base.y);
    this.onPad = dB < 110 && Math.hypot(this.vx, this.vy) < 90;
    if (this.onPad) {
      this.hp = Math.min(this.maxHp, this.hp + 18 * dt);
      this.turbo = Math.min(100, this.turbo + 30 * dt);
      this.rearmT += dt;
      if (this.rearmT > 0.35) {
        this.rearmT = 0;
        if (this.missiles < this.maxMissiles) this.missiles++;
        else if (this.flares < this.maxFlares) this.flares++;
      }
    }

    if (this.hp < 35 && Math.random() < dt * (40 - this.hp) * 0.4) {
      g.particles.push(new Particle(this.x - ca * 14, this.y - sa * 14, rand(-20, 20), rand(-20, 20), 1.2, 4, 14, 'smoke'));
    }
  }

  damage(n, g) {
    if (this.dead || g.state !== 'play') return;
    this.hp -= n;
    this.hitFlash = 0.12;
    g.shake(5);
    Sfx.hit();
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      g.playerDied();
    }
  }

  drawShadow(ctx) {
    drawChopper(ctx, this.x + 26, this.y + 34, this.angle, this.rotor, { shadow: true, scale: 0.92 });
  }

  draw(ctx) {
    drawChopper(ctx, this.x, this.y, this.angle, this.rotor, {
      body: '#1b1f24', dark: '#2c3238', accent: '#e9ecef', glass: '#294d66',
      turbo: this.turboOn, flash: this.hitFlash > 0,
    });
  }
}

// ---------------------------------------------------------------- enemies

class Enemy {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.angle = rand(0, TAU);
    this.dead = false;
    this.gone = false; // left the map without being destroyed
    this.hitFlash = 0;
    this.objective = false;
    this.air = false;
    this.cd = rand(0.8, 2.5);
    this.burst = 0;
    this.burstT = 0;
    this.aware = false;
  }
  hurt(n, g) {
    if (this.dead) return;
    this.hp -= n;
    this.hitFlash = 0.07;
    this.aware = true;
    if (this.hp <= 0) {
      this.dead = true;
      this.die(g);
    }
  }
  die(g) {
    g.explode(this.x, this.y, this.boom, { ground: !this.air });
    if (!this.air) {
      g.terrain.addDecal({ type: 'wreck', x: this.x, y: this.y, angle: this.angle, w: this.r * 1.6, h: this.r });
      g.emitters.push({ x: this.x, y: this.y, life: 7 });
    }
    g.addScore(this.score, this.x, this.y);
    g.kills++;
    g.maybeDrop(this.x, this.y);
  }
  toPlayer(g) {
    const p = g.player;
    return { dx: p.x - this.x, dy: p.y - this.y, d: dist(p.x, p.y, this.x, this.y), a: Math.atan2(p.y - this.y, p.x - this.x) };
  }
  // Ground units stay on land: blocked moves turn them away from the water.
  groundMove(step) {
    const nx = this.x + Math.cos(this.angle) * step, ny = this.y + Math.sin(this.angle) * step;
    if (isLand(nx, ny)) {
      this.x = nx;
      this.y = ny;
      return true;
    }
    this.angle += Math.PI * 0.6 * (Math.random() < 0.5 ? 1 : -1);
    this.wander = this.angle;
    this.wanderT = rand(1.5, 3);
    return false;
  }
  drawHealth(ctx) {
    if (this.hp >= this.maxHp || this.isBoss) return;
    const w = this.r * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x - w / 2, this.y - this.r - 12, w, 4);
    ctx.fillStyle = '#ff5a3c';
    ctx.fillRect(this.x - w / 2, this.y - this.r - 12, (w * Math.max(0, this.hp)) / this.maxHp, 4);
  }
  drawShadow() {}
}

class Jeep extends Enemy {
  constructor(x, y, diff, leader = null) {
    super(x, y);
    this.r = 14;
    this.hp = this.maxHp = 22 * diff;
    this.score = 100;
    this.boom = 24;
    this.speed = 120;
    this.turret = this.angle;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.wander = this.angle;
    this.wanderT = 0;
    this.leader = leader;
    this.offset = { x: rand(-70, 70), y: rand(-70, 70) };
    this.rate = diff;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    let ta, speed = this.speed, free = false;
    if (this.leader && !this.leader.dead && (t.d > 650 || p.dead)) {
      const tx = this.leader.x + this.offset.x, ty = this.leader.y + this.offset.y;
      ta = Math.atan2(ty - this.y, tx - this.x);
      const d = dist(tx, ty, this.x, this.y);
      speed = d < 30 ? this.leader.speed : this.speed * 1.2;
      free = true; // escorts follow the road, bridges included
    } else if (t.d < 750 && !p.dead) {
      ta = t.d > 320 ? t.a : t.a + (Math.PI / 2) * this.dir;
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = rand(2, 5);
        this.wander = rand(0, TAU);
      }
      ta = this.wander;
      speed *= 0.6;
    }
    this.angle = turnToward(this.angle, ta, 2.4 * dt);
    if (free) {
      this.x += Math.cos(this.angle) * speed * dt;
      this.y += Math.sin(this.angle) * speed * dt;
    } else this.groundMove(speed * dt);

    this.turret = turnToward(this.turret, t.a, 4 * dt);
    this.cd -= dt;
    this.burstT -= dt;
    if (t.d < 480 && !p.dead && this.cd <= 0 && Math.abs(angDiff(this.turret, t.a)) < 0.2) {
      this.burst = 3;
      this.cd = rand(1.6, 2.6) / Math.sqrt(this.rate);
    }
    if (this.burst > 0 && this.burstT <= 0) {
      this.burst--;
      this.burstT = 0.12;
      g.enemyShoot(this.x, this.y, this.turret, 430, 4, 'bullet', 0.08, 10);
    }
    this.hitFlash -= dt;
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-12, -6, 28, 16);
    ctx.fillStyle = '#151515';
    ctx.fillRect(-11, -9, 7, 3); ctx.fillRect(5, -9, 7, 3);
    ctx.fillRect(-11, 6, 7, 3); ctx.fillRect(5, 6, 7, 3);
    ctx.fillStyle = f ? '#fff' : '#8f8455';
    ctx.fillRect(-13, -7, 27, 14);
    ctx.fillStyle = f ? '#fff' : '#a3976a';
    ctx.fillRect(5, -6, 8, 12);
    ctx.fillStyle = '#2e3a40';
    ctx.fillRect(2, -6, 2.5, 12);
    ctx.rotate(this.turret - this.angle);
    ctx.fillStyle = '#333';
    ctx.fillRect(-4, -3, 7, 6);
    ctx.fillRect(2, -1, 12, 2);
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class Truck extends Enemy {
  constructor(path, startDist, diff) {
    super(path[0].x, path[0].y);
    this.path = path;
    this.r = 16;
    this.hp = this.maxHp = 40 * diff;
    this.score = 300;
    this.boom = 30;
    this.speed = 50;
    this.objective = true;
    // Place the truck startDist along the route.
    let s = startDist;
    this.seg = 1;
    while (this.seg < path.length) {
      const a = path[this.seg - 1], b = path[this.seg];
      const l = dist(a.x, a.y, b.x, b.y);
      if (s <= l) {
        this.x = a.x + ((b.x - a.x) * s) / l;
        this.y = a.y + ((b.y - a.y) * s) / l;
        this.angle = Math.atan2(b.y - a.y, b.x - a.x);
        break;
      }
      s -= l;
      this.seg++;
    }
  }
  update(dt, g) {
    this.hitFlash -= dt;
    const t = this.path[this.seg];
    if (!t) return;
    const dx = t.x - this.x, dy = t.y - this.y;
    if (Math.hypot(dx, dy) < 20) {
      this.seg++;
      if (this.seg >= this.path.length) {
        this.dead = true;
        this.gone = true;
        g.escaped++;
        g.banner('TRUCK ESCAPED', '#ff6a4a');
      }
      return;
    }
    this.angle = turnToward(this.angle, Math.atan2(dy, dx), 3 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-20, -6, 46, 18);
    ctx.fillStyle = f ? '#fff' : '#4d5634';
    ctx.fillRect(12, -8, 12, 16);
    ctx.fillStyle = '#26323a';
    ctx.fillRect(20, -7, 3, 14);
    ctx.fillStyle = f ? '#fff' : '#6b6a45';
    ctx.fillRect(-22, -9, 32, 18);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = -16; i < 10; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, -9);
      ctx.lineTo(i, 9);
      ctx.stroke();
    }
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class Tank extends Enemy {
  constructor(x, y, diff) {
    super(x, y);
    this.r = 20;
    this.hp = this.maxHp = 75 * diff;
    this.score = 250;
    this.boom = 34;
    this.speed = 45;
    this.turret = this.angle;
    this.wander = this.angle;
    this.wanderT = 0;
    this.tread = 0;
    this.rate = diff;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    this.wanderT -= dt;
    if (t.d < 900 && !p.dead) {
      if (t.d > 380) this.wander = t.a;
      else if (this.wanderT <= 0) {
        this.wander = t.a + rand(-1.5, 1.5);
        this.wanderT = rand(2, 4);
      }
    } else if (this.wanderT <= 0) {
      this.wanderT = rand(3, 6);
      this.wander = rand(0, TAU);
    }
    this.angle = turnToward(this.angle, this.wander, 0.9 * dt);
    if (this.groundMove(this.speed * dt)) this.tread += dt * 30;
    this.turret = turnToward(this.turret, t.a, 1.6 * dt);
    this.cd -= dt;
    if (t.d < 560 && !p.dead && this.cd <= 0 && Math.abs(angDiff(this.turret, t.a)) < 0.12) {
      this.cd = rand(2.2, 3.2) / Math.sqrt(this.rate);
      g.enemyShoot(this.x, this.y, this.turret, 330, 13, 'shell', 0.02, 30);
      g.particles.push(new Particle(this.x + Math.cos(this.turret) * 30, this.y + Math.sin(this.turret) * 30, 0, 0, 0.1, 10, 0, 'muzzle'));
    }
    this.hitFlash -= dt;
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-18, -10, 42, 28);
    ctx.fillStyle = '#23241e';
    ctx.fillRect(-21, -15, 42, 7);
    ctx.fillRect(-21, 8, 42, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 7; i++) {
      const xx = -21 + (((i * 6 + this.tread) % 42) + 42) % 42;
      ctx.fillRect(xx, -15, 1.5, 7);
      ctx.fillRect(xx, 8, 1.5, 7);
    }
    ctx.fillStyle = f ? '#fff' : '#5b6340';
    ctx.fillRect(-19, -9, 38, 18);
    ctx.rotate(this.turret - this.angle);
    ctx.fillStyle = f ? '#fff' : '#4a5233';
    ctx.fillRect(4, -2.2, 26, 4.4);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, TAU);
    ctx.fill();
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class SamSite extends Enemy {
  constructor(x, y, diff) {
    super(x, y);
    this.r = 24;
    this.hp = this.maxHp = 90 * diff;
    this.score = 500;
    this.boom = 44;
    this.turret = rand(0, TAU);
    this.dish = 0;
    this.cd = rand(1, 3);
    this.rate = diff;
    this.loaded = 2;
    this.reload = 0;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    this.dish += dt * 2.5;
    this.hitFlash -= dt;
    const inRange = t.d < 820 && !p.dead;
    if (inRange) this.turret = turnToward(this.turret, t.a, 1.5 * dt);
    if (this.loaded < 2) {
      this.reload -= dt;
      if (this.reload <= 0) {
        this.loaded++;
        this.reload = 4;
      }
    }
    this.cd -= dt;
    if (inRange && this.cd <= 0 && this.loaded > 0 && Math.abs(angDiff(this.turret, t.a)) < 0.3) {
      this.loaded--;
      this.reload = 4;
      this.cd = rand(2.6, 3.6) / Math.sqrt(this.rate);
      g.launchEnemyMissile(this.x, this.y, this.turret, p);
    }
  }
  draw(ctx) {
    const f = this.hitFlash > 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(4, 5, 27, 0, TAU);
    ctx.fill();
    ctx.fillStyle = f ? '#fff' : '#8b7b57';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6f6245';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 22, Math.sin(a) * 22, 4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#5a5b4c';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, TAU);
    ctx.fill();
    // radar dish
    ctx.save();
    ctx.translate(-15, -15);
    ctx.rotate(this.dish);
    ctx.fillStyle = '#c9c9c0';
    ctx.fillRect(-7, -1.5, 14, 3);
    ctx.restore();
    ctx.rotate(this.turret);
    ctx.fillStyle = f ? '#fff' : '#3f4535';
    ctx.fillRect(-8, -9, 16, 18);
    for (let i = 0; i < 2; i++) {
      if (i >= this.loaded) continue;
      const yy = i ? 4 : -4;
      ctx.fillStyle = '#e8e2d0';
      ctx.fillRect(-6, yy - 1.8, 20, 3.6);
      ctx.fillStyle = '#b83020';
      ctx.fillRect(12, yy - 1.8, 3, 3.6);
    }
    ctx.restore();
    this.drawHealth(ctx);
  }
}

class Gunship extends Enemy {
  constructor(x, y, diff) {
    super(x, y);
    this.air = true;
    this.r = 20;
    this.hp = this.maxHp = 45 * diff;
    this.score = 300;
    this.boom = 34;
    this.speed = 210;
    this.range = rand(260, 360);
    this.orbit = rand(0, TAU);
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.rotor = rand(0, TAU);
    this.hx = x; this.hy = y;
    this.rate = diff;
    this.colors = { body: '#4a5638', dark: '#363f29', accent: '#9aa67a', glass: '#2a3b3a' };
    this.scale = 0.9;
  }
  update(dt, g) {
    const p = g.player;
    const t = this.toPlayer(g);
    if (!this.aware && t.d < 950) this.aware = true;
    const engaged = this.aware && !p.dead;
    this.orbit += dt * 0.45 * this.dir;
    let tx, ty;
    if (engaged) {
      tx = p.x + Math.cos(this.orbit) * this.range;
      ty = p.y + Math.sin(this.orbit) * this.range;
    } else {
      tx = this.hx + Math.cos(this.orbit) * 250;
      ty = this.hy + Math.sin(this.orbit) * 250;
    }
    const ddx = tx - this.x, ddy = ty - this.y, dd = Math.hypot(ddx, ddy) || 1;
    const sp = Math.min(this.speed, dd * 1.5);
    const k = 1 - Math.exp(-2 * dt);
    this.vx += ((ddx / dd) * sp - this.vx) * k;
    this.vy += ((ddy / dd) * sp - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const face = engaged ? t.a : Math.atan2(this.vy, this.vx);
    this.angle = turnToward(this.angle, face, 3 * dt);
    this.rotor += dt * 40;
    this.hitFlash -= dt;
    this.attack(dt, g, t, engaged);
  }
  attack(dt, g, t, engaged) {
    this.cd -= dt;
    this.burstT -= dt;
    if (engaged && t.d < 540 && this.cd <= 0 && Math.abs(angDiff(this.angle, t.a)) < 0.25) {
      this.burst = 4;
      this.cd = rand(1.8, 3) / Math.sqrt(this.rate);
    }
    if (this.burst > 0 && this.burstT <= 0) {
      this.burst--;
      this.burstT = 0.11;
      g.enemyShoot(this.x, this.y, this.angle, 480, 5, 'bullet', 0.06, 24 * this.scale);
    }
  }
  drawShadow(ctx) {
    drawChopper(ctx, this.x + 26, this.y + 34, this.angle, this.rotor, { shadow: true, scale: this.scale * 0.92 });
  }
  draw(ctx) {
    drawChopper(ctx, this.x, this.y, this.angle, this.rotor, { ...this.colors, scale: this.scale, flash: this.hitFlash > 0 });
    this.drawHealth(ctx);
  }
}

class Boss extends Gunship {
  constructor(x, y, diff) {
    super(x, y, diff);
    this.isBoss = true;
    this.objective = true;
    this.name = 'RED TALON';
    this.r = 32;
    this.hp = this.maxHp = 900 * diff;
    this.score = 5000;
    this.boom = 70;
    this.speed = 250;
    this.range = 380;
    this.scale = 1.55;
    this.colors = { body: '#5c1714', dark: '#2b0c0a', accent: '#d9a441', glass: '#3a2020' };
    this.salvoCd = 5;
    this.dashT = 0;
    this.dashCd = 8;
  }
  update(dt, g) {
    if (this.aware) {
      this.dashCd -= dt;
      if (this.dashCd <= 0) {
        this.dashCd = rand(7, 11);
        this.dashT = 1.2;
        this.dir *= -1;
      }
    }
    this.dashT -= dt;
    this.speed = this.dashT > 0 ? 560 : 250;
    this.orbit += this.dashT > 0 ? dt * 1.2 * this.dir : 0;
    super.update(dt, g);
    if (this.dashT > 0 && Math.random() < 0.6) {
      g.particles.push(new Particle(this.x - Math.cos(this.angle) * 30, this.y - Math.sin(this.angle) * 30, 0, 0, 0.4, 8, 20, 'fire'));
    }
  }
  attack(dt, g, t, engaged) {
    this.cd -= dt;
    this.burstT -= dt;
    this.salvoCd -= dt;
    if (engaged && t.d < 620 && this.cd <= 0 && Math.abs(angDiff(this.angle, t.a)) < 0.3) {
      this.burst = 8;
      this.cd = rand(1.2, 2) / Math.sqrt(this.rate);
    }
    if (this.burst > 0 && this.burstT <= 0) {
      this.burst--;
      this.burstT = 0.08;
      for (const s of [-1, 1]) {
        const ox = this.x - Math.sin(this.angle) * 30 * s, oy = this.y + Math.cos(this.angle) * 30 * s;
        g.enemyShoot(ox, oy, this.angle, 520, 5, 'bullet', 0.05, 34);
      }
    }
    if (engaged && t.d < 900 && this.salvoCd <= 0) {
      this.salvoCd = rand(5, 7);
      g.launchEnemyMissile(this.x, this.y, this.angle + 0.5, g.player);
      g.launchEnemyMissile(this.x, this.y, this.angle - 0.5, g.player);
    }
  }
}

class Jet extends Enemy {
  constructor(x, y, tx, ty, diff) {
    super(x, y);
    this.air = true;
    this.r = 22;
    this.hp = this.maxHp = 35 * diff;
    this.score = 400;
    this.boom = 36;
    this.speed = 640;
    this.angle = Math.atan2(ty - y, tx - x);
    this.life = 10;
    this.fired = false;
  }
  update(dt, g) {
    const t = this.toPlayer(g);
    // Lazily track the player until committed to the pass.
    if (!this.fired && t.d > 500) this.angle = turnToward(this.angle, t.a, 0.5 * dt);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.hitFlash -= dt;
    if (!this.fired && !g.player.dead && t.d < 800 && Math.abs(angDiff(this.angle, t.a)) < 0.35) {
      this.fired = true;
      g.launchEnemyMissile(this.x, this.y, this.angle, g.player);
    }
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      this.gone = true;
    }
  }
  drawShadow(ctx) {
    drawJetShape(ctx, this.x + 40, this.y + 52, this.angle, { shadow: true, scale: 0.9 });
  }
  draw(ctx) {
    drawJetShape(ctx, this.x, this.y, this.angle, { body: '#7d8a93', flash: this.hitFlash > 0 });
  }
}
