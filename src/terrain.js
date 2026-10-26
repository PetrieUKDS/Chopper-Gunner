'use strict';

const WORLD_W = 6000;
const WORLD_H = 6000;
const SEA_LEVEL = 0.4;
const SHORE = 0.43;
const HILLS = 0.71;
const PEAKS = 0.82;

// Each mission is fought in a theatre: its own island (map seed), palette, vegetation,
// and the camouflage the enemy paints its vehicles in.
// dryness shifts how much of the land is dry ground versus lush ground.
// trees: kind of vegetation, how dense, and a bias toward planting it in drier ground.
const THEATRES = {
  temperate: {
    label: 'CENTRAL VALLEYS',
    seed: 1984,
    seaShallow: [52, 122, 146], seaDeep: [12, 38, 74],
    shore: [214, 197, 148], dry: [202, 170, 108], wet: [88, 118, 56],
    rock: [124, 107, 86], peak: [158, 150, 142], dryness: 0,
    trees: { kind: 'broadleaf', density: 2.6, bias: 0 },
    scrub: [110, 100, 60], boulder: [120, 110, 96],
    camo: {
      light: '#8f8455', main: '#5b6340', dark: '#3c4329', cover: '#6b6a45', ground: '#8b7b57', jet: '#7d8a93',
      heli: { body: '#4a5638', dark: '#363f29', accent: '#9aa67a' },
    },
  },
  desert: {
    label: 'SOUTHERN DESERT',
    seed: 7,
    seaShallow: [64, 150, 160], seaDeep: [14, 56, 92],
    shore: [228, 210, 160], dry: [222, 192, 134], wet: [168, 158, 96],
    rock: [184, 132, 92], peak: [204, 170, 130], dryness: 0.16,
    trees: { kind: 'palm', density: 3, bias: -0.08 },
    scrub: [140, 120, 70], boulder: [176, 140, 100],
    camo: {
      light: '#c2a873', main: '#a88d5c', dark: '#6b5a3a', cover: '#b89f70', ground: '#c9b07a', jet: '#b8a888',
      heli: { body: '#9c8559', dark: '#6b5a3a', accent: '#e6d4a6' },
    },
  },
  arctic: {
    label: 'NORTHERN TUNDRA',
    seed: 4242,
    seaShallow: [96, 150, 178], seaDeep: [18, 48, 80], ice: true,
    shore: [226, 234, 240], dry: [236, 240, 245], wet: [192, 204, 202],
    rock: [152, 160, 168], peak: [250, 252, 255], dryness: -0.04,
    trees: { kind: 'snowpine', density: 2.4, bias: 0 },
    scrub: [170, 180, 176], boulder: [140, 146, 152],
    camo: {
      light: '#d9dde0', main: '#aeb5ba', dark: '#4f585f', cover: '#c9ced2', ground: '#e4e8ec', jet: '#c8d0d6',
      heli: { body: '#d4d9dd', dark: '#58626a', accent: '#c0392b' },
    },
  },
  jungle: {
    label: 'EASTERN JUNGLE',
    seed: 31337,
    seaShallow: [48, 116, 104], seaDeep: [10, 44, 52],
    shore: [126, 108, 72], dry: [104, 128, 58], wet: [44, 90, 38],
    rock: [96, 92, 70], peak: [120, 118, 96], dryness: -0.2,
    trees: { kind: 'jungle', density: 3.4, bias: 0.25 },
    scrub: [60, 90, 40], boulder: [100, 96, 80],
    camo: {
      light: '#5e6b3c', main: '#3d4a2a', dark: '#222b18', cover: '#4d5a33', ground: '#6b5a3c', jet: '#4f5e48',
      heli: { body: '#2f3d26', dark: '#1d2617', accent: '#8a9a52' },
    },
  },
  ash: {
    label: 'VOLCANIC OIL FIELDS',
    seed: 666,
    seaShallow: [52, 60, 66], seaDeep: [14, 16, 22],
    shore: [80, 74, 70], dry: [98, 90, 84], wet: [76, 78, 64],
    rock: [112, 76, 60], peak: [70, 62, 58], dryness: 0.1,
    trees: { kind: 'dead', density: 1.4, bias: 0 },
    scrub: [90, 86, 70], boulder: [70, 64, 60],
    camo: {
      light: '#77706a', main: '#55504b', dark: '#2b2826', cover: '#635d57', ground: '#6e6660', jet: '#5d6066',
      heli: { body: '#3b3734', dark: '#201d1b', accent: '#d0582e' },
    },
  },
  canyon: {
    label: 'RED CANYONS',
    seed: 2077,
    seaShallow: [70, 140, 150], seaDeep: [16, 54, 84],
    shore: [214, 170, 120], dry: [196, 132, 84], wet: [150, 122, 72],
    rock: [166, 90, 60], peak: [190, 120, 86], dryness: 0.12,
    trees: { kind: 'cactus', density: 1.6, bias: 0.08 },
    scrub: [120, 110, 60], boulder: [150, 84, 56],
    camo: {
      light: '#b0805a', main: '#8a6446', dark: '#4e3424', cover: '#9c7656', ground: '#b98a62', jet: '#a88f7c',
      heli: { body: '#7a5238', dark: '#4a2f20', accent: '#e0b07a' },
    },
  },
};

let THEATRE = THEATRES.temperate;

// Switch the world to a theatre. The terrain cache must be reset afterwards.
function setTheatre(name) {
  THEATRE = THEATRES[name];
  Noise.seed(THEATRE.seed);
}

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
  const T = THEATRE;
  let r, g, b;
  if (h < SEA_LEVEL) {
    const t = clamp((SEA_LEVEL - h) / 0.22, 0, 1);
    r = lerp(T.seaShallow[0], T.seaDeep[0], t);
    g = lerp(T.seaShallow[1], T.seaDeep[1], t);
    b = lerp(T.seaShallow[2], T.seaDeep[2], t);
    if (T.ice && h > SEA_LEVEL - 0.035) {
      // pack ice along the coast
      r = 204; g = 222; b = 232;
    }
  } else if (h < SHORE) {
    [r, g, b] = T.shore;
  } else {
    const wet = clamp((m - 0.44 - T.dryness) * 4.5, 0, 1);
    const t = clamp((h - SHORE) / (HILLS - SHORE), 0, 1);
    r = lerp(T.dry[0], T.wet[0], wet) * (1 - t * 0.12);
    g = lerp(T.dry[1], T.wet[1], wet) * (1 - t * 0.12);
    b = lerp(T.dry[2], T.wet[2], wet) * (1 - t * 0.12);
    if (h > HILLS - 0.03) {
      // blend into rock
      const k = clamp((h - (HILLS - 0.03)) / 0.06, 0, 1);
      const rc = h > PEAKS ? T.peak : T.rock;
      r = lerp(r, rc[0], k);
      g = lerp(g, rc[1], k);
      b = lerp(b, rc[2], k);
    }
  }
  out[0] = r; out[1] = g; out[2] = b;
}

// Star outline used for conifers seen from above.
function starPath(g, x, y, r, points, rot) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rr = i % 2 ? r * 0.5 : r;
    if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

// One tree (or cactus, or dead snag) seen from above, with its shadow down-right.
function drawTree(g, kind, x, y, size, tint) {
  if (kind === 'broadleaf' || kind === 'jungle') {
    const big = kind === 'jungle';
    const r = big ? 7 + size * 9 : 5 + size * 7;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.arc(x + r * 0.5, y + r * 0.6, r, 0, TAU);
    g.fill();
    g.fillStyle = big
      ? `rgb(${22 + tint * 24},${62 + tint * 46},${26 + tint * 16})`
      : `rgb(${38 + tint * 20},${66 + tint * 24},${30 + tint * 10})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.fillStyle = big ? 'rgba(170,220,110,0.18)' : 'rgba(160,200,110,0.22)';
    g.beginPath();
    g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, TAU);
    g.fill();
  } else if (kind === 'pine' || kind === 'snowpine') {
    const r = 5 + size * 6;
    const rot = tint * TAU;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    starPath(g, x + r * 0.5, y + r * 0.6, r, 8, rot);
    g.fill();
    g.fillStyle = `rgb(${26 + tint * 16},${54 + tint * 22},${38 + tint * 10})`;
    starPath(g, x, y, r, 8, rot);
    g.fill();
    if (kind === 'snowpine') {
      g.fillStyle = 'rgba(245,248,252,0.85)';
      starPath(g, x - r * 0.12, y - r * 0.12, r * 0.62, 8, rot + 0.2);
      g.fill();
    } else {
      g.fillStyle = 'rgba(140,190,120,0.3)';
      g.beginPath();
      g.arc(x - r * 0.15, y - r * 0.15, r * 0.3, 0, TAU);
      g.fill();
    }
  } else if (kind === 'palm') {
    const r = 7 + size * 6;
    for (const [ox, oy, col] of [[r * 0.5, r * 0.6, 'rgba(0,0,0,0.25)'], [0, 0, `rgb(${70 + tint * 30},${118 + tint * 30},${48 + tint * 10})`]]) {
      g.fillStyle = col;
      for (let i = 0; i < 7; i++) {
        const a = tint * TAU + (i * TAU) / 7;
        g.beginPath();
        g.ellipse(x + ox + Math.cos(a) * r * 0.5, y + oy + Math.sin(a) * r * 0.5, r * 0.55, r * 0.17, a, 0, TAU);
        g.fill();
      }
    }
    g.fillStyle = '#5a4630';
    g.beginPath();
    g.arc(x, y, 1.8, 0, TAU);
    g.fill();
  } else if (kind === 'dead') {
    const r = 5 + size * 6;
    g.lineCap = 'round';
    for (const [ox, oy, col] of [[r * 0.4, r * 0.5, 'rgba(0,0,0,0.3)'], [0, 0, '#3e3732']]) {
      g.strokeStyle = col;
      g.lineWidth = 1.4;
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = tint * TAU + (i * TAU) / 5;
        const ex = x + ox + Math.cos(a) * r, ey = y + oy + Math.sin(a) * r;
        g.moveTo(x + ox, y + oy);
        g.lineTo(ex, ey);
        g.moveTo(x + ox + Math.cos(a) * r * 0.6, y + oy + Math.sin(a) * r * 0.6);
        g.lineTo(ex + Math.cos(a + 0.9) * r * 0.35, ey + Math.sin(a + 0.9) * r * 0.35);
      }
      g.stroke();
    }
  } else if (kind === 'cactus') {
    const r = 2.5 + size * 2.5;
    const arms = [[0, 0, r], [r * 1.3, r * 0.2, r * 0.6], [-r * 1.2, -r * 0.3, r * 0.55]];
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for (const [ox, oy, rr] of arms) {
      g.beginPath();
      g.arc(x + ox + r, y + oy + r * 1.2, rr, 0, TAU);
      g.fill();
    }
    for (const [ox, oy, rr] of arms) {
      g.fillStyle = `rgb(${66 + tint * 20},${104 + tint * 24},${60 + tint * 12})`;
      g.beginPath();
      g.arc(x + ox, y + oy, rr, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(200,230,170,0.3)';
      g.beginPath();
      g.arc(x + ox - rr * 0.3, y + oy - rr * 0.3, rr * 0.4, 0, TAU);
      g.fill();
    }
  }
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
      const T = THEATRE;
      if (h < HILLS) {
        if (roll < (m - 0.4 + T.trees.bias - T.dryness) * T.trees.density) {
          drawTree(g, T.trees.kind, x, y, size, tint);
        } else if (roll > 0.94 && m < 0.48 + T.dryness) {
          // scrub
          g.fillStyle = `rgba(${T.scrub.join(',')},0.7)`;
          g.beginPath();
          g.arc(x, y, 2 + size * 3, 0, TAU);
          g.fill();
        }
      } else if (roll < 0.16) {
        const r = 4 + size * 9;
        const [br, bg, bb] = T.boulder;
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath();
        g.ellipse(x + 3, y + 3, r, r * 0.7, tint * 3, 0, TAU);
        g.fill();
        g.fillStyle = `rgb(${br + tint * 30},${bg + tint * 26},${bb + tint * 20})`;
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
    ctx.fillStyle = `rgb(${THEATRE.seaDeep.join(',')})`;
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
