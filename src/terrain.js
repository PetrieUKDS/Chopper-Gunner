'use strict';

const WORLD_W = 6000;
const WORLD_H = 6000;
const SEA_LEVEL = 0.4;
const SHORE = 0.43;
const HILLS = 0.71;
const PEAKS = 0.82;

const CHUNK = 256; // world px per cached chunk
const TEXEL = 2; // world px per terrain colour sample
const MAX_CHUNKS = 140;

function heightAt(x, y) {
  let h = Noise.fbm(x / 1100, y / 1100, 5);
  h = (h - 0.5) * 2.1 + 0.5;
  // The west of the map drops into the sea, giving a long coastline.
  const c = x / WORLD_W;
  if (c < 0.32) h -= (0.32 - c) * 1.6;
  // The map edge falls away to water so the play area reads as an island.
  const e = Math.min(x, WORLD_W - x, y, WORLD_H - y) / WORLD_W;
  if (e < 0.05) h -= (0.05 - e) * 6;
  return h;
}

function moistAt(x, y) {
  return Noise.fbm(x / 1600 + 57, y / 1600 - 31, 3);
}

function isLand(x, y) {
  return x > 0 && y > 0 && x < WORLD_W && y < WORLD_H && heightAt(x, y) > SHORE - 0.01;
}

function terrainColor(h, m, out) {
  let r, g, b;
  if (h < SEA_LEVEL) {
    const t = clamp((SEA_LEVEL - h) / 0.22, 0, 1);
    r = lerp(52, 12, t);
    g = lerp(122, 38, t);
    b = lerp(146, 74, t);
  } else if (h < SHORE) {
    r = 214; g = 197; b = 148;
  } else {
    const wet = clamp((m - 0.44) * 4.5, 0, 1);
    const t = clamp((h - SHORE) / (HILLS - SHORE), 0, 1);
    r = lerp(202, 88, wet) * (1 - t * 0.12);
    g = lerp(170, 118, wet) * (1 - t * 0.12);
    b = lerp(108, 56, wet) * (1 - t * 0.12);
    if (h > HILLS - 0.03) {
      // blend into rock
      const k = clamp((h - (HILLS - 0.03)) / 0.06, 0, 1);
      const rr = h > PEAKS ? 158 : 124, rg = h > PEAKS ? 150 : 107, rb = h > PEAKS ? 142 : 86;
      r = lerp(r, rr, k);
      g = lerp(g, rg, k);
      b = lerp(b, rb, k);
    }
  }
  out[0] = r; out[1] = g; out[2] = b;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

class Terrain {
  constructor() {
    this.chunks = new Map();
    this.roads = [];
    this.decals = [];
    this.frame = 0;
    const n = CHUNK / TEXEL;
    this.tmp = document.createElement('canvas');
    this.tmp.width = this.tmp.height = n;
    this.tctx = this.tmp.getContext('2d');
  }

  reset() {
    this.chunks.clear();
    this.roads = [];
    this.decals = [];
  }

  nearRoad(x, y, d) {
    for (const road of this.roads) {
      for (let i = 1; i < road.length; i++) {
        if (distToSegment(x, y, road[i - 1].x, road[i - 1].y, road[i].x, road[i].y) < d) return true;
      }
    }
    return false;
  }

  getChunk(cx, cy, allowGen) {
    const k = cx + ',' + cy;
    let c = this.chunks.get(k);
    if (c) {
      c.used = this.frame;
      return c.canvas;
    }
    if (!allowGen) return null;
    c = { canvas: this.gen(cx, cy), used: this.frame };
    this.chunks.set(k, c);
    if (this.chunks.size > MAX_CHUNKS) this.prune();
    return c.canvas;
  }

  prune() {
    const entries = [...this.chunks.entries()].sort((a, b) => a[1].used - b[1].used);
    const remove = entries.length - Math.floor(MAX_CHUNKS * 0.8);
    for (let i = 0; i < remove; i++) this.chunks.delete(entries[i][0]);
  }

  gen(cx, cy) {
    const n = CHUNK / TEXEL;
    const W = n + 2;
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const hs = new Float32Array(W * W);
    for (let j = 0; j < W; j++) {
      for (let i = 0; i < W; i++) {
        hs[j * W + i] = heightAt(x0 + (i - 0.5) * TEXEL, y0 + (j - 0.5) * TEXEL);
      }
    }
    const img = this.tctx.createImageData(n, n);
    const d = img.data;
    const col = [0, 0, 0];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const h = hs[(j + 1) * W + i + 1];
        const m = moistAt(x0 + (i + 0.5) * TEXEL, y0 + (j + 0.5) * TEXEL);
        terrainColor(h, m, col);
        let shade = 0;
        if (h >= SEA_LEVEL) shade = clamp((hs[j * W + i] - hs[(j + 2) * W + i + 2]) * 1600, -45, 45);
        else if (h > SEA_LEVEL - 0.012) shade = 28; // surf line
        const dn = (hash2(x0 / TEXEL + i, y0 / TEXEL + j) - 0.5) * 12;
        const p = (j * n + i) * 4;
        d[p] = col[0] + shade + dn;
        d[p + 1] = col[1] + shade + dn;
        d[p + 2] = col[2] + shade * 0.8 + dn;
        d[p + 3] = 255;
      }
    }
    this.tctx.putImageData(img, 0, 0);

    const c = document.createElement('canvas');
    c.width = c.height = CHUNK;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(this.tmp, 0, 0, n, n, 0, 0, CHUNK, CHUNK);
    g.translate(-x0, -y0);

    this.drawRoads(g);
    // Features from neighbouring chunks too, so trees straddling a seam are not cut in half.
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) this.drawFeatures(g, cx + ox, cy + oy);
    }
    for (const dc of this.decals) {
      if (dc.x + dc.r > x0 && dc.x - dc.r < x0 + CHUNK && dc.y + dc.r > y0 && dc.y - dc.r < y0 + CHUNK) {
        this.drawDecal(g, dc);
      }
    }
    return c;
  }

  drawRoads(g) {
    for (const road of this.roads) {
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      road.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.strokeStyle = 'rgba(60,52,40,0.55)';
      g.lineWidth = 26;
      g.stroke();
      g.strokeStyle = '#6a6156';
      g.lineWidth = 19;
      g.stroke();
      g.setLineDash([14, 16]);
      g.strokeStyle = 'rgba(230,220,170,0.7)';
      g.lineWidth = 2;
      g.stroke();
      g.setLineDash([]);
    }
  }

  drawFeatures(g, cx, cy) {
    const rng = mulberry32((cx * 73856093) ^ (cy * 19349663) ^ 0x5eed);
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    for (let k = 0; k < 60; k++) {
      const x = x0 + rng() * CHUNK, y = y0 + rng() * CHUNK;
      const roll = rng(), size = rng(), tint = rng();
      const h = heightAt(x, y);
      if (h < SHORE + 0.01) continue;
      if (this.roads.length && this.nearRoad(x, y, 22)) continue;
      const m = moistAt(x, y);
      if (h < HILLS) {
        if (roll < (m - 0.4) * 2.6) {
          const r = 5 + size * 7;
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.beginPath();
          g.arc(x + r * 0.5, y + r * 0.6, r, 0, TAU);
          g.fill();
          g.fillStyle = `rgb(${38 + tint * 20},${66 + tint * 24},${30 + tint * 10})`;
          g.beginPath();
          g.arc(x, y, r, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(160,200,110,0.22)';
          g.beginPath();
          g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, TAU);
          g.fill();
        } else if (roll > 0.94 && m < 0.48) {
          // desert scrub
          g.fillStyle = 'rgba(110,100,60,0.7)';
          g.beginPath();
          g.arc(x, y, 2 + size * 3, 0, TAU);
          g.fill();
        }
      } else if (roll < 0.16) {
        const r = 4 + size * 9;
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(x + 3, y + 3, r, r * 0.7, tint * 3, 0, TAU);
        g.fill();
        g.fillStyle = `rgb(${120 + tint * 30},${110 + tint * 26},${96 + tint * 20})`;
        g.beginPath();
        g.ellipse(x, y, r, r * 0.7, tint * 3, 0, TAU);
        g.fill();
      }
    }
  }

  drawDecal(g, dc) {
    if (dc.type === 'scorch') {
      const gr = g.createRadialGradient(dc.x, dc.y, 0, dc.x, dc.y, dc.r);
      gr.addColorStop(0, 'rgba(15,12,10,0.75)');
      gr.addColorStop(0.6, 'rgba(25,20,15,0.4)');
      gr.addColorStop(1, 'rgba(30,25,20,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(dc.x, dc.y, dc.r, 0, TAU);
      g.fill();
    } else if (dc.type === 'wreck') {
      g.save();
      g.translate(dc.x, dc.y);
      g.rotate(dc.angle);
      g.fillStyle = '#1d1a17';
      g.fillRect(-dc.w / 2, -dc.h / 2, dc.w, dc.h);
      g.fillStyle = '#2c2723';
      g.fillRect(-dc.w / 4, -dc.h / 3, dc.w / 2, (dc.h * 2) / 3);
      g.restore();
    }
  }

  addDecal(dc) {
    dc.r = dc.r || Math.max(dc.w || 0, dc.h || 0);
    this.decals.push(dc);
    if (this.decals.length > 400) this.decals.shift();
    for (const [k, c] of this.chunks) {
      const [cx, cy] = k.split(',').map(Number);
      const x0 = cx * CHUNK, y0 = cy * CHUNK;
      if (dc.x + dc.r > x0 && dc.x - dc.r < x0 + CHUNK && dc.y + dc.r > y0 && dc.y - dc.r < y0 + CHUNK) {
        const g = c.canvas.getContext('2d');
        g.setTransform(1, 0, 0, 1, -x0, -y0);
        this.drawDecal(g, dc);
      }
    }
  }

  // Draw the visible terrain. ctx must already be in world space.
  draw(ctx, vx0, vy0, vx1, vy1, budget) {
    this.frame++;
    ctx.fillStyle = '#0c264a';
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    const maxC = Math.ceil(WORLD_W / CHUNK) - 1, maxR = Math.ceil(WORLD_H / CHUNK) - 1;
    const cx0 = Math.max(0, Math.floor(vx0 / CHUNK)), cx1 = Math.min(maxC, Math.floor(vx1 / CHUNK));
    const cy0 = Math.max(0, Math.floor(vy0 / CHUNK)), cy1 = Math.min(maxR, Math.floor(vy1 / CHUNK));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const had = this.chunks.has(cx + ',' + cy);
        const canvas = this.getChunk(cx, cy, budget > 0);
        if (!had && canvas) budget--;
        if (canvas) {
          ctx.drawImage(canvas, cx * CHUNK, cy * CHUNK, CHUNK + 0.6, CHUNK + 0.6);
        } else {
          const col = [0, 0, 0];
          const mx = cx * CHUNK + CHUNK / 2, my = cy * CHUNK + CHUNK / 2;
          terrainColor(heightAt(mx, my), moistAt(mx, my), col);
          ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
          ctx.fillRect(cx * CHUNK, cy * CHUNK, CHUNK + 0.6, CHUNK + 0.6);
        }
      }
    }
  }
}
