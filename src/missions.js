'use strict';

// Each mission sets up the map and decides when it is won or lost.
// After the last mission the campaign loops with tougher enemies.
const MISSIONS = [
  {
    title: 'OPERATION SANDSTORM',
    brief: [
      'Overwatch to Stormwolf.',
      'Militia forces have seized three surface-to-air missile sites in the interior.',
      'Our relief flights cannot get through until those sites are gone.',
      'Destroy all three. Expect armour and light vehicles around each one.',
      'SAMs fire guided missiles - deploy flares to break the lock, or shoot them down.',
    ],
    reinforce: { every: 14, cap: 18, types: ['jeep', 'jeep', 'tank', 'gunship'] },
    setup(g) {
      const placed = [];
      for (let i = 0; i < 3; i++) {
        const pt = g.landPoint(g.base, 1300, 2600, (p) => placed.every((q) => dist(p.x, p.y, q.x, q.y) > 1000));
        placed.push(pt);
        const sam = new SamSite(pt.x, pt.y, g.difficulty);
        sam.objective = true;
        g.enemies.push(sam);
        for (let j = 0; j < 2; j++) g.spawnNear('jeep', pt, 150, 350);
        g.spawnNear('tank', pt, 120, 300);
      }
      for (let i = 0; i < 5; i++) g.spawnNear('jeep', g.base, 900, 2400);
    },
    objective(g) {
      return `SAM SITES REMAINING: ${g.objectivesLeft()}`;
    },
    status(g) {
      return g.objectivesLeft() === 0 ? 'won' : null;
    },
  },
  {
    title: 'OPERATION IRON ROAD',
    brief: [
      'Overwatch to Stormwolf.',
      'An arms convoy is moving along the highway toward the northern border crossing.',
      'Those weapons cannot reach the militia. Destroy every truck.',
      'If more than two trucks make it across, the mission is a failure.',
      'The convoy has escorts, and they will call for air cover.',
    ],
    reinforce: { every: 12, cap: 16, types: ['gunship', 'jeep', 'jet'] },
    setup(g) {
      const start = g.landPoint(g.base, 1700, 2400);
      const end = g.landPoint(start, 2600, 3600, (p) => dist(p.x, p.y, g.base.x, g.base.y) > 1400);
      const path = [];
      const n = 9;
      const nx = -(end.y - start.y), ny = end.x - start.x;
      const nl = Math.hypot(nx, ny) || 1;
      const wob = rand(0, TAU);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const off = i === 0 || i === n ? 0 : Math.sin(t * Math.PI * 2 + wob) * 260 * Math.sin(t * Math.PI);
        path.push({
          x: clamp(lerp(start.x, end.x, t) + (nx / nl) * off, 120, WORLD_W - 120),
          y: clamp(lerp(start.y, end.y, t) + (ny / nl) * off, 120, WORLD_H - 120),
        });
      }
      g.terrain.roads.push(path);
      g.checkpoint = end;
      g.allowedEscapes = 2;
      const trucks = [];
      for (let i = 0; i < 6; i++) {
        const tr = new Truck(path, 40 + (5 - i) * 85, g.difficulty);
        trucks.push(tr);
        g.enemies.push(tr);
      }
      for (let i = 0; i < 4; i++) {
        const leader = trucks[i + 1];
        g.enemies.push(new Jeep(leader.x + rand(-40, 40), leader.y + rand(-40, 40), g.difficulty, leader));
      }
      g.spawnNear('tank', start, 80, 200);
      g.spawnNear('tank', end, 120, 260);
      for (let i = 0; i < 4; i++) g.spawnNear('jeep', g.base, 900, 2400);
    },
    objective(g) {
      return `TRUCKS: ${g.objectivesLeft()}   ESCAPED: ${g.escaped}/${g.allowedEscapes}`;
    },
    status(g) {
      if (g.escaped > g.allowedEscapes) return 'lost';
      return g.objectivesLeft() === 0 ? 'won' : null;
    },
  },
  {
    title: 'OPERATION RED TALON',
    brief: [
      'Overwatch to Stormwolf. This one is personal.',
      'The militia has a stolen prototype gunship - callsign RED TALON.',
      'Same airframe as yours: fast, armoured, and carrying its own missiles.',
      'It is hiding out in the far hills under SAM cover.',
      'Find it, and bring it down.',
    ],
    reinforce: { every: 13, cap: 16, types: ['gunship', 'jet', 'jeep', 'tank'] },
    setup(g) {
      const lair = g.landPoint(g.base, 2600, 3600);
      g.enemies.push(new Boss(lair.x, lair.y, g.difficulty));
      for (let i = 0; i < 2; i++) {
        const pt = g.landPoint(lair, 300, 700);
        g.enemies.push(new SamSite(pt.x, pt.y, g.difficulty));
      }
      for (let i = 0; i < 3; i++) g.spawnNear('gunship', lair, 400, 900);
      for (let i = 0; i < 6; i++) g.spawnNear(i % 3 ? 'jeep' : 'tank', g.base, 900, 2600);
    },
    objective(g) {
      const b = g.enemies.find((e) => e.isBoss && !e.dead);
      return b ? 'DESTROY RED TALON' : 'RED TALON DESTROYED';
    },
    status(g) {
      return g.objectivesLeft() === 0 ? 'won' : null;
    },
  },
];
