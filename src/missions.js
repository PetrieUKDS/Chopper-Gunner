'use strict';

// Each mission picks a theatre (map and look) and a soundtrack, sets up the map,
// and decides when it is won or lost. After the last mission the campaign loops with tougher enemies.
const MISSIONS = [
  {
    title: 'OPERATION SANDSTORM',
    theatre: 'desert',
    music: 0,
    brief: [
      'Overwatch to {callsign}.',
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
    theatre: 'temperate',
    music: 1,
    night: true,
    brief: [
      'Overwatch to {callsign}.',
      'An arms convoy is moving along the highway toward the northern border crossing.',
      'Those weapons cannot reach the militia. Destroy every truck.',
      'If more than two trucks make it across, the mission is a failure.',
      'The convoy has escorts, and they will call for air cover.',
      'They are moving under cover of darkness. Watch for their headlights.',
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
    title: 'OPERATION FROSTBITE',
    theatre: 'arctic',
    music: 3,
    brief: [
      'Overwatch to {callsign}.',
      'The militia is fuelling its armour from depots hidden across the northern tundra.',
      'Cut off their supply. Destroy all five fuel depots.',
      'Each depot is ringed with anti-aircraft guns. Their bursts are short, but they hurt.',
      'Depots burn hot - do not hover over one when it goes up.',
    ],
    reinforce: { every: 14, cap: 18, types: ['jeep', 'tank', 'gunship', 'aa'] },
    setup(g) {
      const placed = [];
      for (let i = 0; i < 5; i++) {
        const pt = g.landPoint(g.base, 1000, 2900, (p) => placed.every((q) => dist(p.x, p.y, q.x, q.y) > 750));
        placed.push(pt);
        g.enemies.push(new FuelDepot(pt.x, pt.y, g.difficulty));
        for (let j = 0; j < 2; j++) g.spawnNear('aa', pt, 110, 220);
        g.spawnNear(i % 2 ? 'tank' : 'jeep', pt, 150, 320);
      }
      for (let i = 0; i < 4; i++) g.spawnNear('jeep', g.base, 900, 2400);
    },
    objective(g) {
      return `FUEL DEPOTS REMAINING: ${g.objectivesLeft()}`;
    },
    status(g) {
      return g.objectivesLeft() === 0 ? 'won' : null;
    },
  },
  {
    title: 'OPERATION GREEN HELL',
    theatre: 'jungle',
    music: 4,
    brief: [
      'Overwatch to {callsign}.',
      'Militia gunboats are running weapons along the jungle coast.',
      'Sink all six. Two of them carry anti-air missiles.',
      'Expect gun positions along the shoreline and gunships under the canopy.',
    ],
    reinforce: { every: 13, cap: 16, types: ['gunship', 'jeep', 'aa', 'jet'] },
    setup(g) {
      const placed = [];
      for (let i = 0; i < 6; i++) {
        const pt = g.waterPoint(g.base, 900, 2800, (p) => placed.every((q) => dist(p.x, p.y, q.x, q.y) > 550));
        placed.push(pt);
        g.enemies.push(Object.assign(new PatrolBoat(pt.x, pt.y, g.difficulty, i < 2), { objective: true }));
        if (i % 2 === 0) g.spawnNear('aa', pt, 150, 450);
      }
      for (let i = 0; i < 2; i++) g.spawnNear('gunship', placed[i * 3], 200, 500);
      for (let i = 0; i < 4; i++) g.spawnNear('jeep', g.base, 900, 2400);
    },
    objective(g) {
      return `GUNBOATS REMAINING: ${g.objectivesLeft()}`;
    },
    status(g) {
      return g.objectivesLeft() === 0 ? 'won' : null;
    },
  },
  {
    title: 'OPERATION BLACK GOLD',
    theatre: 'ash',
    music: 5,
    brief: [
      'Overwatch to {callsign}.',
      'Militia command is dug in beneath the volcanic oil fields.',
      'Their bunker sits behind an energy shield fed by three generators.',
      'Knock out the generators to drop the shield, then flatten the bunker.',
      'The bunker fires flak and missiles. Keep your flares ready.',
    ],
    reinforce: { every: 12, cap: 18, types: ['tank', 'jeep', 'gunship', 'aa', 'jet'] },
    setup(g) {
      const hq = g.landPoint(g.base, 2200, 3200);
      g.enemies.push(new Bunker(hq.x, hq.y, g.difficulty));
      const sam = g.landPoint(hq, 250, 450);
      g.enemies.push(new SamSite(sam.x, sam.y, g.difficulty));
      const placed = [];
      for (let i = 0; i < 3; i++) {
        const pt = g.landPoint(hq, 550, 1100, (p) => placed.every((q) => dist(p.x, p.y, q.x, q.y) > 550));
        placed.push(pt);
        g.enemies.push(new Generator(pt.x, pt.y, g.difficulty));
        g.spawnNear('aa', pt, 110, 220);
        g.spawnNear('tank', pt, 150, 320);
      }
      for (let i = 0; i < 2; i++) g.spawnNear('aa', hq, 120, 260);
      for (let i = 0; i < 5; i++) g.spawnNear(i % 2 ? 'tank' : 'jeep', g.base, 900, 2400);
    },
    objective(g) {
      const gens = g.enemies.filter((e) => e instanceof Generator && !e.dead).length;
      if (gens) return `GENERATORS: ${gens}   BUNKER SHIELDED`;
      return g.objectivesLeft() ? 'DESTROY THE COMMAND BUNKER' : 'COMMAND BUNKER DESTROYED';
    },
    status(g) {
      return g.objectivesLeft() === 0 ? 'won' : null;
    },
  },
  {
    title: 'OPERATION RED TALON',
    theatre: 'canyon',
    music: 2,
    brief: [
      'Overwatch to {callsign}. This one is personal.',
      'The militia has a stolen prototype gunship - callsign RED TALON.',
      'Built on a Stormwolf airframe: fast, armoured, and carrying its own missiles.',
      'It is hiding out in the red canyons under SAM cover.',
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
