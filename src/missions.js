'use strict';

// Each mission picks a theatre (map and look) and a soundtrack, sets up the map,
// and decides when it is won or lost. After the last mission the campaign loops with tougher enemies.
// Optional: seed (a fresh map in a reused theatre), update(g, dt) each frame of play,
// failText for the failure screen.

// A winding road from start to end, added to the map.
function windingRoad(g, start, end) {
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
  return path;
}

function aliveCount(list, type) {
  return list.filter((o) => o instanceof type && !o.dead).length;
}

const MISSIONS = [
  {
    title: 'OPERATION SANDSTORM',
    theatre: 'desert',
    par: 300, // seconds, for the bonus star
    music: 0,
    brief: [
      'Skywatch to {callsign}.',
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
    par: 210, // seconds, for the bonus star
    music: 1,
    night: true,
    brief: [
      'Skywatch to {callsign}.',
      'An arms convoy is moving along the highway toward the northern border crossing.',
      'Those weapons cannot reach the militia. Destroy every truck.',
      'If more than two trucks make it across, the mission is a failure.',
      'The convoy has escorts, and they will call for air cover.',
      'They are moving under cover of darkness. Watch for their headlights.',
    ],
    failText: 'Too many trucks crossed the border.',
    reinforce: { every: 12, cap: 16, types: ['gunship', 'jeep', 'jet'] },
    setup(g) {
      const start = g.landPoint(g.base, 1700, 2400);
      const end = g.landPoint(start, 2600, 3600, (p) => dist(p.x, p.y, g.base.x, g.base.y) > 1400);
      const path = windingRoad(g, start, end);
      g.checkpoint = end;
      g.checkpointLabel = 'BORDER';
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
    par: 330, // seconds, for the bonus star
    music: 3,
    brief: [
      'Skywatch to {callsign}.',
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
    par: 300, // seconds, for the bonus star
    music: 4,
    brief: [
      'Skywatch to {callsign}.',
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
    par: 360, // seconds, for the bonus star
    music: 5,
    brief: [
      'Skywatch to {callsign}.',
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
    par: 300, // seconds, for the bonus star
    music: 2,
    brief: [
      'Skywatch to {callsign}. This one is personal.',
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
  {
    title: 'OPERATION LIFELINE',
    theatre: 'jungle',
    seed: 5150,
    par: 330, // seconds, for the bonus star
    music: 4,
    brief: [
      'Skywatch to {callsign}. The militia is beaten, but not finished.',
      'One of our transports went down over the jungle. Four crew made it out alive.',
      'Militia search teams are already closing in on them.',
      'Hover low and slow over each survivor to take them aboard, then bring them home to the base pad.',
      'If more than one of them is captured, the mission is a failure.',
    ],
    failText: 'Too many of the crew were captured.',
    reinforce: { every: 14, cap: 16, types: ['gunship', 'jeep', 'aa'] },
    setup(g) {
      const placed = [];
      for (let i = 0; i < 4; i++) {
        const pt = g.landPoint(g.base, 1100, 2700, (p) => placed.every((q) => dist(p.x, p.y, q.x, q.y) > 800));
        placed.push(pt);
        g.friendlies.push(new Survivor(pt.x, pt.y));
        if (i === 0) {
          g.terrain.addDecal({ type: 'scorch', x: pt.x + 60, y: pt.y + 30, r: 70 });
          g.terrain.addDecal({ type: 'wreck', x: pt.x + 60, y: pt.y + 30, angle: rand(0, TAU), w: 46, h: 22 });
          g.emitters.push({ x: pt.x + 60, y: pt.y + 30, life: 120 });
        }
        // A slow search team for each survivor, each starting further out than the last,
        // so you have time to reach them in turn.
        for (let j = 0; j < 2; j++) {
          const hp = g.landPoint(pt, 1400 + i * 650, 1700 + i * 650);
          const jeep = new Jeep(hp.x, hp.y, g.difficulty, g.friendlies[i]);
          jeep.offset = { x: 0, y: 0 };
          jeep.speed = 45;
          jeep.hunter = true;
          g.enemies.push(jeep);
        }
        if (i % 2) g.spawnNear('aa', pt, 250, 450);
      }
      for (let i = 0; i < 4; i++) g.spawnNear('jeep', g.base, 900, 2400);
    },
    update(g) {
      if (g.carrying && g.player.onPad) {
        g.rescued += g.carrying;
        g.banner(`${g.carrying} CREW SAFE`, HUD_GREEN);
        Sfx.confirm();
        g.carrying = 0;
      }
    },
    objective(g) {
      return `CREW WAITING: ${aliveCount(g.friendlies, Survivor)}   ABOARD: ${g.carrying}   SAFE: ${g.rescued}   CAPTURED: ${g.captured}/1`;
    },
    status(g) {
      if (g.captured > 1) return 'lost';
      return aliveCount(g.friendlies, Survivor) === 0 && g.carrying === 0 ? 'won' : null;
    },
  },
  {
    title: 'OPERATION SAFE PASSAGE',
    theatre: 'desert',
    seed: 8086,
    par: 300, // seconds, for the bonus star
    music: 0,
    brief: [
      'Skywatch to {callsign}.',
      'Four aid trucks are heading out from our base to a town cut off by the fighting.',
      'Militia raiders are waiting in ambush along the road.',
      'Fly escort and clear the way. The convoy rolls out a few seconds after you launch.',
      'Lose more than one truck and the mission is a failure.',
    ],
    failText: 'Too many aid trucks were destroyed.',
    reinforce: { every: 13, cap: 16, types: ['jeep', 'gunship', 'tank'] },
    setup(g) {
      const start = g.landPoint(g.base, 700, 900);
      const end = g.landPoint(start, 2800, 3600, (p) => dist(p.x, p.y, g.base.x, g.base.y) > 1800);
      const path = windingRoad(g, start, end);
      g.checkpoint = end;
      g.checkpointLabel = 'TOWN';
      for (let i = 0; i < 4; i++) g.friendlies.push(new AidTruck(path, 40 + (3 - i) * 90));
      // Ambush squads waiting off the road.
      for (const k of [3, 4, 6, 8]) {
        const pt = path[k];
        for (let j = 0; j < 2; j++) g.spawnNear('jeep', pt, 220, 420);
        g.spawnNear(k % 2 ? 'tank' : 'aa', pt, 200, 380);
      }
    },
    objective(g) {
      return `CONVOY: ${aliveCount(g.friendlies, AidTruck)} ON THE ROAD   DELIVERED: ${g.delivered}   LOST: ${g.convoyLost}/1`;
    },
    status(g) {
      if (g.convoyLost > 1) return 'lost';
      return aliveCount(g.friendlies, AidTruck) === 0 ? 'won' : null;
    },
  },
  {
    title: 'OPERATION LAST STAND',
    theatre: 'temperate',
    seed: 90210,
    par: 420, // seconds, for the bonus star
    music: 5,
    brief: [
      'Skywatch to {callsign}. This is it.',
      'The militia is throwing everything it has left at our forward base.',
      'Five waves of armour and gunships are coming. Keep the command building standing.',
      'Land on the pad between waves to repair and rearm.',
      'If the command building falls, we lose the base.',
    ],
    failText: 'The command building was destroyed.',
    reinforce: { every: 9999, cap: 0, types: ['jeep'] },
    setup(g) {
      // The HQ sits on the hangar drawn at the base's top-left corner.
      g.hq = new BaseHQ(g.base.x - 75, g.base.y - 82, 900);
      g.hq.speed = 0; // jeeps use it as a destination
      g.friendlies.push(g.hq);
      g.wave = 0;
      g.waveT = 6;
    },
    update(g, dt) {
      const left = g.enemies.filter((e) => e.wave && !e.dead).length;
      if (left || g.wave >= 5) return;
      g.waveT -= dt;
      if (g.waveT > 0) return;
      // Engineers patch the building up a little between waves.
      if (g.wave) g.hq.hp = Math.min(g.hq.maxHp, g.hq.hp + g.hq.maxHp * 0.2);
      g.wave++;
      g.waveT = 8;
      g.banner(`WAVE ${g.wave} OF 5`, HUD_RED);
      const k = g.wave;
      const add = (e) => {
        e.wave = true;
        g.enemies.push(e);
        return e;
      };
      // Ground units come from all sides, just inside range of the base.
      for (let i = 0; i < 2 + k; i++) {
        const pt = g.landPoint(g.base, 720, 820);
        add(new Jeep(pt.x, pt.y, g.difficulty, g.hq)).aware = true;
      }
      for (let i = 0; i < Math.ceil(k / 2); i++) {
        const pt = g.landPoint(g.base, 720, 800);
        add(new Tank(pt.x, pt.y, g.difficulty));
      }
      for (let i = 0; i < k - 1; i++) {
        const a = rand(0, TAU);
        add(new Gunship(g.base.x + Math.cos(a) * 1300, g.base.y + Math.sin(a) * 1300, g.difficulty)).aware = true;
      }
      if (k >= 4) {
        const a = rand(0, TAU);
        add(new Jet(g.base.x + Math.cos(a) * 1700, g.base.y + Math.sin(a) * 1700, g.base.x, g.base.y, g.difficulty));
        Sfx.jet();
      }
    },
    objective(g) {
      const pct = Math.ceil((100 * g.hq.hp) / g.hq.maxHp);
      if (!g.wave) return `FIRST WAVE IN ${Math.ceil(g.waveT)}   BASE ${pct}%`;
      const left = g.enemies.filter((e) => e.wave && !e.dead).length;
      return `WAVE ${g.wave}/5   HOSTILES: ${left}   BASE ${pct}%`;
    },
    status(g) {
      if (g.hq.dead) return 'lost';
      const left = g.enemies.filter((e) => e.wave && !e.dead).length;
      return g.wave >= 5 && left === 0 ? 'won' : null;
    },
  },
];
