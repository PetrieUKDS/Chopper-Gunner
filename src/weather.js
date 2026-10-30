'use strict';

// Screen-space weather for each theatre (snow, rain, sand, ash, dust), a colour grade
// over the world, and the darkness pass for night missions.
const WEATHER = {
  none: { count: 0, tint: null },
  snow: { count: 170, tint: 'rgba(180,210,255,0.07)' },
  rain: { count: 230, tint: 'rgba(10,40,30,0.12)' },
  sand: { count: 150, tint: 'rgba(225,180,120,0.10)' },
  ash: { count: 140, tint: 'rgba(70,25,0,0.12)' },
  dust: { count: 70, tint: 'rgba(255,140,60,0.06)' },
};

const Weather = {
  kind: 'none',
  flakes: [],
  lastCam: null,
  dark: null,

  set(kind, w, h) {
    this.kind = kind;
    this.flakes = [];
    this.lastCam = null;
    for (let i = 0; i < WEATHER[kind].count; i++) this.flakes.push(this.spawn(w, h, true));
  },

  spawn(w, h, anywhere) {
    const k = this.kind;
    const f = { x: rand(0, w), y: anywhere ? rand(0, h) : -10, z: rand(0.6, 1.4), t: rand(0, TAU) };
    if (k === 'sand' || k === 'dust') {
      f.x = anywhere ? f.x : -20;
      f.y = rand(0, h);
    }
    // A few embers rise out of the ash instead of falling.
    f.ember = k === 'ash' && Math.random() < 0.18;
    if (f.ember) f.y = anywhere ? f.y : h + 10;
    return f;
  },

  // Move the particles, and shift them against camera motion so they sit between
  // the camera and the ground rather than sticking to the screen.
  update(dt, g) {
    const k = this.kind;
    if (k === 'none') return;
    const cam = g.cam;
    let dx = 0, dy = 0;
    if (this.lastCam) {
      dx = (cam.x - this.lastCam.x) * g.zoom * 1.2;
      dy = (cam.y - this.lastCam.y) * g.zoom * 1.2;
    }
    this.lastCam = { x: cam.x, y: cam.y };
    const w = g.w, h = g.h;
    for (const f of this.flakes) {
      f.t += dt;
      if (k === 'snow') {
        f.x += (Math.sin(f.t * 1.3) * 18 - 10) * dt * f.z;
        f.y += 55 * dt * f.z;
      } else if (k === 'rain') {
        f.x -= 140 * dt * f.z;
        f.y += 760 * dt * f.z;
      } else if (k === 'sand') {
        f.x += 650 * dt * f.z;
        f.y += Math.sin(f.t * 3) * 30 * dt;
      } else if (k === 'dust') {
        f.x += 60 * dt * f.z;
        f.y += Math.sin(f.t) * 10 * dt;
      } else if (k === 'ash') {
        if (f.ember) {
          f.y -= 40 * dt * f.z;
          f.x += Math.sin(f.t * 2) * 20 * dt;
        } else {
          f.y += 26 * dt * f.z;
          f.x += Math.sin(f.t * 0.8) * 14 * dt;
        }
      }
      f.x -= dx * f.z;
      f.y -= dy * f.z;
      // Wrap around the screen edges.
      if (f.x < -30) f.x += w + 60;
      else if (f.x > w + 30) f.x -= w + 60;
      if (f.y < -30) f.y += h + 60;
      else if (f.y > h + 30) f.y -= h + 60;
    }
  },

  draw(ctx, w, h) {
    const k = this.kind;
    const spec = WEATHER[k];
    if (spec.tint) {
      ctx.fillStyle = spec.tint;
      ctx.fillRect(0, 0, w, h);
    }
    if (!this.flakes.length) return;
    ctx.save();
    if (k === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      for (const f of this.flakes) {
        ctx.moveTo(f.x + f.z * 1.6, f.y);
        ctx.arc(f.x, f.y, f.z * 1.6, 0, TAU);
      }
      ctx.fill();
    } else if (k === 'rain') {
      ctx.strokeStyle = 'rgba(190,210,230,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const f of this.flakes) {
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + 3 * f.z, f.y - 16 * f.z);
      }
      ctx.stroke();
    } else if (k === 'sand' || k === 'dust') {
      ctx.strokeStyle = k === 'sand' ? 'rgba(235,205,150,0.4)' : 'rgba(230,170,120,0.35)';
      ctx.lineWidth = k === 'sand' ? 1.2 : 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const f of this.flakes) {
        const len = k === 'sand' ? 18 * f.z : 2;
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x - len, f.y);
      }
      ctx.stroke();
    } else if (k === 'ash') {
      ctx.fillStyle = 'rgba(150,145,140,0.7)';
      ctx.beginPath();
      for (const f of this.flakes) {
        if (f.ember) continue;
        ctx.moveTo(f.x + f.z * 1.4, f.y);
        ctx.arc(f.x, f.y, f.z * 1.4, 0, TAU);
      }
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of this.flakes) {
        if (!f.ember) continue;
        const a = 0.5 + 0.5 * Math.sin(f.t * 6);
        ctx.fillStyle = `rgba(255,${120 + a * 60},40,${0.5 + a * 0.4})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.z * 1.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  // Night: darken the world, then cut light out of the dark around the player's
  // searchlight, headlights, fires, tracers and flares.
  drawNight(ctx, g) {
    const W = g.canvas.width, H = g.canvas.height;
    if (!W || !H) return; // window hidden or minimised
    if (!this.dark) this.dark = document.createElement('canvas');
    const c = this.dark;
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const d = c.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(3,8,22,0.84)';
    d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const z = g.zoom, dpr = g.dpr;
    const cx = g.cam.x + g.shakeX, cy = g.cam.y + g.shakeY;
    d.setTransform(z * dpr, 0, 0, z * dpr, (g.w / 2 - cx * z) * dpr, (g.h / 2 - cy * z) * dpr);
    const vx0 = cx - g.w / z / 2 - 300, vx1 = cx + g.w / z / 2 + 300;
    const vy0 = cy - g.h / z / 2 - 300, vy1 = cy + g.h / z / 2 + 300;
    const seen = (o) => o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1;

    const glow = (x, y, r, a) => {
      const gr = d.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr;
      d.beginPath();
      d.arc(x, y, r, 0, TAU);
      d.fill();
    };
    const beam = (x, y, ang, len, spread, a) => {
      const gr = d.createRadialGradient(x, y, 0, x, y, len);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(0.7, `rgba(0,0,0,${a * 0.6})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr;
      d.beginPath();
      d.moveTo(x, y);
      d.arc(x, y, len, ang - spread, ang + spread);
      d.closePath();
      d.fill();
    };

    const p = g.player;
    glow(g.base.x, g.base.y, 220, 0.55);
    if (!p.dead) {
      glow(p.x, p.y, 130, 0.85);
      beam(p.x, p.y, p.angle, 560, 0.3, 0.95);
    }
    for (const e of g.enemies) {
      if (e.dead || !seen(e)) continue;
      if (e instanceof Jeep || e instanceof Truck || e instanceof Tank) {
        beam(e.x + Math.cos(e.angle) * e.r, e.y + Math.sin(e.angle) * e.r, e.angle, 200, 0.32, 0.8);
        glow(e.x, e.y, e.r * 1.8, 0.45);
      } else {
        glow(e.x, e.y, e.r * 2.2, e.air ? 0.5 : 0.4);
      }
    }
    for (const pt of g.particles) {
      if (!pt.additive || !seen(pt)) continue;
      const life = pt.life / pt.maxLife;
      glow(pt.x, pt.y, Math.max(12, pt.size * 3), Math.min(0.9, 0.5 + life * 0.4));
    }
    for (const b of g.ebullets) if (seen(b)) glow(b.x, b.y, 16, 0.5);
    for (const b of g.bullets) if (seen(b)) glow(b.x, b.y, 16, 0.5);
    for (const m of g.missiles) if (seen(m)) glow(m.x, m.y, 50, 0.75);
    for (const f of g.flares) if (seen(f)) glow(f.x, f.y, 110, 0.9);
    for (const em of g.emitters) if (seen(em)) glow(em.x, em.y, 90, 0.6 * Math.min(1, em.life / 3));
    if (g.checkpoint) glow(g.checkpoint.x, g.checkpoint.y, 120, 0.5);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  },
};
