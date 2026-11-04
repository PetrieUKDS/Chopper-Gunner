'use strict';

// Saved campaign: which missions are unlocked, best score per mission, workshop funds,
// upgrades bought, and the chosen difficulty. Stored in localStorage.

// enemy scales enemy toughness and fire rate; hurt scales damage the player takes.
const DIFFICULTIES = [
  { id: 'easy', name: 'EASY', enemy: 0.75, hurt: 0.65 },
  { id: 'normal', name: 'NORMAL', enemy: 1, hurt: 1 },
  { id: 'hard', name: 'HARD', enemy: 1.3, hurt: 1.3 },
];

// Workshop upgrades. They apply to whichever aircraft you fly; costs are per level.
const UPGRADES = [
  { id: 'armor', name: 'ARMOUR PLATING', desc: '+15% armour', costs: [1500, 3000, 5000] },
  { id: 'cooling', name: 'GUN COOLING', desc: '-15% gun heat', costs: [1200, 2500, 4500] },
  { id: 'racks', name: 'MISSILE RACKS', desc: '+2 missiles', costs: [1500, 3000, 5000] },
  { id: 'flares', name: 'FLARE PODS', desc: '+1 flare', costs: [800, 1600, 3000] },
  { id: 'engine', name: 'ENGINE TUNING', desc: '+6% speed', costs: [1500, 3000, 5000] },
];

const SAVE_KEY = 'chopperGunner.save';
const SETTINGS_KEY = 'chopperGunner.settings';

// Player preferences, kept apart from the campaign save. Volumes run 0-10.
const Settings = {
  data: { music: 7, sfx: 8, shake: true, autofire: false },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (saved && typeof saved === 'object') Object.assign(this.data, saved);
    } catch (e) { /* storage unavailable or corrupt: keep defaults */ }
    this.apply();
  },

  write() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data));
    } catch (e) { /* storage unavailable */ }
    this.apply();
  },

  apply() {
    Sfx.setVolumes(this.data.music / 10, this.data.sfx / 10);
  },
};

const Save = {
  data: null,

  load() {
    this.data = { unlocked: 1, best: {}, stars: {}, funds: 0, upgrades: {}, difficulty: 'normal', campaignDone: false };
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (saved && typeof saved === 'object') Object.assign(this.data, saved);
    } catch (e) { /* storage unavailable or corrupt: start fresh */ }
  },

  write() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) { /* storage unavailable */ }
  },

  level(id) {
    return this.data.upgrades[id] || 0;
  },

  difficulty() {
    return DIFFICULTIES.find((d) => d.id === this.data.difficulty) || DIFFICULTIES[1];
  },

  setDifficulty(step) {
    const i = DIFFICULTIES.indexOf(this.difficulty());
    this.data.difficulty = DIFFICULTIES[clamp(i + step, 0, DIFFICULTIES.length - 1)].id;
    this.write();
  },

  // Upgrade levels plus difficulty, in the shape Player expects.
  mods() {
    const m = { hurt: this.difficulty().hurt };
    for (const u of UPGRADES) m[u.id] = this.level(u.id);
    return m;
  },

  // Record a cleared mission: unlock the next one, keep the best score and star count,
  // bank the earnings. Clearing the last mission finishes the campaign.
  cleared(index, earned, stars) {
    const i = index % MISSIONS.length;
    this.data.unlocked = Math.max(this.data.unlocked, Math.min(MISSIONS.length, i + 2));
    this.data.best[i] = Math.max(this.data.best[i] || 0, earned);
    this.data.stars[i] = Math.max(this.data.stars[i] || 0, stars);
    if (i === MISSIONS.length - 1) this.data.campaignDone = true;
    this.data.funds += earned;
    this.write();
  },

  nextCost(id) {
    const u = UPGRADES.find((x) => x.id === id);
    return u.costs[this.level(id)];
  },

  buy(id) {
    const cost = this.nextCost(id);
    if (cost === undefined || this.data.funds < cost) return false;
    this.data.funds -= cost;
    this.data.upgrades[id] = this.level(id) + 1;
    this.write();
    return true;
  },
};
