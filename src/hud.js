'use strict';

const HUD_GREEN = '#7dffb0';
const HUD_AMBER = '#ffc04a';
const HUD_RED = '#ff5a3c';

const Hud = {
  text(ctx, s, x, y, o = {}) {
    ctx.font = `${o.weight || ''} ${o.size || 14}px ${o.font || FONT}`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(s, x + 1.5, y + 1.5);
    }
    ctx.fillStyle = o.color || HUD_GREEN;
    ctx.fillText(s, x, y);
  },

  bar(ctx, x, y, w, h, frac, color, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
    if (label) this.text(ctx, label, x - 8, y + h - 1, { size: 12, align: 'right', color });
  },

  draw(ctx, g) {
    const p = g.player;
    const w = g.w, h = g.h;
    const small = w < 600;

    // --- mission panel
    let y = 24;
    this.text(ctx, g.mission.title, 16, y, { size: small ? 12 : 14, color: HUD_AMBER });
    y += 20;
    this.text(ctx, g.mission.objective(g), 16, y, { size: small ? 12 : 14 });
    y += 22;

    // --- gauges
    const bx = 70, bw = small ? 110 : 150;
    const hpCol = p.hp > 60 ? HUD_GREEN : p.hp > 30 ? HUD_AMBER : HUD_RED;
    this.bar(ctx, bx, y, bw, 9, p.hp / p.maxHp, hpCol, 'ARMOR');
    y += 17;
    this.bar(ctx, bx, y, bw, 7, p.turbo / 100, '#5ec8ff', 'TURBO');
    y += 15;
    const heatCol = p.overheat ? (Math.floor(g.time * 8) % 2 ? HUD_RED : '#ffffff') : p.heat > 70 ? HUD_AMBER : '#c8d0d0';
    this.bar(ctx, bx, y, bw, 7, p.heat / 100, heatCol, 'GUNS');
    y += 22;
    this.text(ctx, 'MSL', bx - 8, y, { size: 12, align: 'right', color: HUD_AMBER });
    for (let i = 0; i < p.maxMissiles; i++) {
      ctx.fillStyle = i < p.missiles ? HUD_AMBER : 'rgba(255,255,255,0.15)';
      ctx.fillRect(bx + i * 9, y - 10, 5, 11);
    }
    y += 18;
    this.text(ctx, 'FLR', bx - 8, y, { size: 12, align: 'right', color: '#5ec8ff' });
    for (let i = 0; i < p.maxFlares; i++) {
      ctx.fillStyle = i < p.flares ? '#5ec8ff' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(bx + 3 + i * 12, y - 4, 4, 0, TAU);
      ctx.fill();
    }

    // --- score
    if (small) this.text(ctx, String(g.score).padStart(7, '0'), w - 78, 162, { size: 16, align: 'center', color: '#ffffff' });
    else this.text(ctx, String(g.score).padStart(7, '0'), w / 2, 28, { size: 22, align: 'center', color: '#ffffff' });

    // --- boss bar
    const boss = g.enemies.find((e) => e.isBoss && !e.dead && e.aware);
    if (boss) {
      const bw2 = Math.min(360, w - 260);
      const by = small ? 190 : 50;
      this.text(ctx, boss.name, w / 2, by, { size: 12, align: 'center', color: HUD_RED });
      this.bar(ctx, w / 2 - bw2 / 2, by + 6, bw2, 8, boss.hp / boss.maxHp, HUD_RED);
    }

    this.radar(ctx, g, w - 78, 78, small ? 52 : 64);

    // --- warnings
    let wy = h * 0.28;
    const blink = Math.floor(g.time * 5) % 2 === 0;
    if (g.missileWarning && blink) {
      this.text(ctx, '!! MISSILE WARNING - FLARES !!', w / 2, wy, { size: 18, align: 'center', color: HUD_RED, weight: 'bold' });
    }
    wy += 26;
    if (p.overheat) this.text(ctx, 'GUNS OVERHEATED', w / 2, wy, { size: 15, align: 'center', color: HUD_AMBER });
    wy += 22;
    if (p.onPad && (p.hp < p.maxHp || p.missiles < p.maxMissiles || p.flares < p.maxFlares)) {
      this.text(ctx, 'REPAIRING / REARMING', w / 2, wy, { size: 15, align: 'center', color: HUD_GREEN });
    } else if (p.hp < 35 && !p.dead && blink) {
      this.text(ctx, 'ARMOR CRITICAL - RETURN TO BASE', w / 2, wy, { size: 15, align: 'center', color: HUD_RED });
    }

    for (const b of g.banners) {
      const a = clamp(b.t, 0, 1);
      ctx.globalAlpha = a;
      this.text(ctx, b.text, w / 2, h * 0.42 + b.slot * 30, { size: 22, align: 'center', color: b.color, font: TITLE_FONT, weight: '700' });
      ctx.globalAlpha = 1;
    }

    this.edgeArrows(ctx, g);
    if (Input.touchMode) this.touchControls(ctx, g);
  },

  radar(ctx, g, cx, cy, R) {
    const p = g.player;
    const range = 2400;
    const s = R / range;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = 'rgba(4,18,10,0.72)';
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(125,255,176,0.18)';
    ctx.lineWidth = 1;
    for (const rr of [R / 3, (R * 2) / 3]) {
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();
    const sweep = g.time * 2.2;
    const gr = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
    gr.addColorStop(0, 'rgba(125,255,176,0.0)');
    gr.addColorStop(1, 'rgba(125,255,176,0.45)');
    ctx.strokeStyle = gr;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
    ctx.stroke();

    const dot = (x, y, col, size, square) => {
      const dx = (x - p.x) * s, dy = (y - p.y) * s;
      const d = Math.hypot(dx, dy);
      let px = cx + dx, py = cy + dy;
      if (d > R - 3) {
        px = cx + (dx / d) * (R - 3);
        py = cy + (dy / d) * (R - 3);
      }
      ctx.fillStyle = col;
      if (square) ctx.fillRect(px - size, py - size, size * 2, size * 2);
      else {
        ctx.beginPath();
        ctx.arc(px, py, size, 0, TAU);
        ctx.fill();
      }
    };
    dot(g.base.x, g.base.y, HUD_GREEN, 3.5, true);
    if (g.checkpoint) dot(g.checkpoint.x, g.checkpoint.y, '#ffffff', 3, true);
    for (const e of g.enemies) {
      if (e.dead) continue;
      if (e.objective) {
        if (Math.floor(g.time * 3) % 2) dot(e.x, e.y, HUD_AMBER, 4);
      } else if (dist2(e.x, e.y, p.x, p.y) < range * range) {
        dot(e.x, e.y, e.air ? '#ff9a7a' : HUD_RED, e.air ? 2.5 : 2);
      }
    }
    for (const m of g.missiles) if (m.owner === 'e') dot(m.x, m.y, '#ffffff', 1.5);
    for (const pk of g.pickups) dot(pk.x, pk.y, '#5ec8ff', 2);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(125,255,176,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
  },

  edgeArrows(ctx, g) {
    const targets = g.enemies.filter((e) => e.objective && !e.dead).map((e) => ({ x: e.x, y: e.y, col: HUD_AMBER }));
    if (g.player.hp < 35 || (g.player.missiles === 0 && !g.player.onPad)) targets.push({ x: g.base.x, y: g.base.y, col: HUD_GREEN, label: 'BASE' });
    if (g.checkpoint) targets.push({ x: g.checkpoint.x, y: g.checkpoint.y, col: '#ffffff', label: 'BORDER' });
    const m = 46;
    for (const t of targets) {
      const s = g.worldToScreen(t.x, t.y);
      if (s.x > m && s.x < g.w - m && s.y > m && s.y < g.h - m) continue;
      const cx = g.w / 2, cy = g.h / 2;
      const dx = s.x - cx, dy = s.y - cy;
      const k = Math.min((g.w / 2 - m) / Math.abs(dx || 1e-6), (g.h / 2 - m) / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k;
      const a = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(a);
      ctx.fillStyle = t.col;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, 0); ctx.lineTo(-6, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      const dkm = (dist(g.player.x, g.player.y, t.x, t.y) / 1000).toFixed(1);
      this.text(ctx, (t.label ? t.label + ' ' : '') + dkm + 'km', ax - Math.cos(a) * 26, ay - Math.sin(a) * 22 + 4, { size: 11, align: 'center', color: t.col });
    }
  },

  touchControls(ctx, g) {
    for (const k of ['move', 'aim']) {
      const s = Input.sticks[k];
      if (!s) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.ox, s.oy, 60, 0, TAU);
      ctx.stroke();
      const st = Input.stick(k);
      ctx.fillStyle = k === 'aim' && st.mag > 0.45 ? 'rgba(255,200,90,0.5)' : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(s.ox + st.x * 60, s.oy + st.y * 60, 24, 0, TAU);
      ctx.fill();
    }
    if (!Input.sticks.move) this.text(ctx, 'MOVE', 70, g.h - 60, { size: 12, align: 'center', color: 'rgba(255,255,255,0.35)', shadow: false });
    if (!Input.sticks.aim) this.text(ctx, 'AIM + FIRE', g.w - 160, g.h - 60, { size: 12, align: 'center', color: 'rgba(255,255,255,0.35)', shadow: false });
    for (const b of Input.btnLayout) {
      const held = Input.buttons[b.id] !== undefined;
      ctx.fillStyle = held ? 'rgba(255,192,74,0.45)' : 'rgba(0,0,0,0.35)';
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      this.text(ctx, b.label, b.x, b.y + 5, { size: 13, align: 'center', color: '#ffffff', shadow: false });
    }
  },

  crosshair(ctx, x, y, locked) {
    ctx.strokeStyle = locked ? HUD_AMBER : 'rgba(125,255,176,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, TAU);
    ctx.moveTo(x - 18, y); ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y); ctx.lineTo(x + 18, y);
    ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 18);
    ctx.stroke();
  },

  lockBox(ctx, x, y, r, t) {
    const s = r + 10 + Math.sin(t * 10) * 2;
    const c = s * 0.45;
    ctx.strokeStyle = HUD_AMBER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + sx * s, y + sy * (s - c));
      ctx.lineTo(x + sx * s, y + sy * s);
      ctx.lineTo(x + sx * (s - c), y + sy * s);
    }
    ctx.stroke();
  },
};
