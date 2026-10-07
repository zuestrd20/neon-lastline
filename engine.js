/**
 * NEON LASTLINE / 霓虹末班車 — deterministic, DOM-free combat engine.
 * Coordinates: a 1000×430 battlefield, convoy x=100, barricade x=900.
 * Call tick(seconds) from the rendering loop. Inputs and equal fixed-step time
 * produce identical snapshots for the same seed. No timers or ambient RNG.
 */
export const WORLD = Object.freeze({ width: 1000, height: 430, groundY: 355, busX: 100, barricadeX: 900 });
export const UNITS = Object.freeze({
  brawler: Object.freeze({ id: 'brawler', name: '撬棍手', subtitle: '近戰先鋒', key: '1', cost: 20, cooldown: 2.8, hp: 115, attack: 19, range: 30, speed: 47, interval: 0.88, radius: 14, color: '#ffbe63', description: '便宜、靈活。用撬棍守住第一線。' }),
  ranger: Object.freeze({ id: 'ranger', name: '巡夜槍手', subtitle: '遠距火力', key: '2', cost: 32, cooldown: 4.6, hp: 76, attack: 21, range: 196, speed: 34, interval: 1.1, radius: 12, color: '#63e5d6', description: '在前排身後持續射擊，穩定清除感染者。' }),
  shield: Object.freeze({ id: 'shield', name: '路障重衛', subtitle: '重裝坦克', key: '3', cost: 38, cooldown: 6, hp: 285, attack: 12, range: 34, speed: 26, interval: 1.25, armor: 0.28, radius: 18, color: '#84a9ff', description: '高生命與 28% 減傷，替整隊擋下攻勢。' }),
  medic: Object.freeze({ id: 'medic', name: '急救員', subtitle: '戰地治療', key: '4', cost: 42, cooldown: 7.5, hp: 100, attack: 6, range: 135, speed: 32, interval: 1.2, heal: 24, healRange: 190, healInterval: 1.5, radius: 12, color: '#a8f095', description: '定期治療範圍內最受傷的隊友，也會自衛。' }),
  bomber: Object.freeze({ id: 'bomber', name: '燃瓶客', subtitle: '範圍爆破', key: '5', cost: 48, cooldown: 9, hp: 88, attack: 53, range: 170, speed: 31, interval: 2.2, splash: 78, radius: 13, color: '#ff8783', description: '燃燒瓶造成範圍傷害，專門對付密集屍群。' }),
});

export const ENEMIES = Object.freeze({
  walker: { id: 'walker', name: '徘徊者', hp: 77, attack: 10, range: 27, speed: 28, interval: 1.1, radius: 13, color: '#acbe7b', reward: 3 },
  runner: { id: 'runner', name: '疾行者', hp: 53, attack: 9, range: 25, speed: 51, interval: 0.72, radius: 11, color: '#e9988b', reward: 4 },
  brute: { id: 'brute', name: '腫脹巨屍', hp: 228, attack: 22, range: 34, speed: 20, interval: 1.4, armor: 0.12, radius: 22, color: '#a195cf', reward: 8 },
  spitter: { id: 'spitter', name: '酸液投手', hp: 99, attack: 14, range: 145, speed: 26, interval: 1.6, radius: 13, color: '#c2db6b', reward: 6 },
  boss: { id: 'boss', name: '終站吞噬者', hp: 1600, attack: 43, range: 68, speed: 16, interval: 1.8, armor: 0.15, splash: 64, radius: 38, color: '#ee786f', reward: 60 },
});

/** Stage and wave indexes are zero-based everywhere in Game.state. */
export const STAGES = Object.freeze([
  { id: 'rain', name: '雨港外環', subtitle: '第一站 · 廢棄街區', label: 'RAIN DISTRICT', color: '#72d5d0', barricadeHp: 380, scale: 1, waves: [
    { name: '夜雨來客', enemies: ['walker', 'walker', 'runner', 'walker', 'walker'], interval: 3.5 },
    { name: '街口騷動', enemies: ['walker', 'runner', 'walker', 'spitter', 'walker', 'runner', 'walker'], interval: 2.8 },
    { name: '衝出外環', enemies: ['brute', 'walker', 'walker', 'runner', 'spitter', 'walker', 'runner', 'brute'], interval: 2.7 },
  ] },
  { id: 'market', name: '停電夜市', subtitle: '第二站 · 寂靜攤街', label: 'BLACKOUT MARKET', color: '#e8bc78', barricadeHp: 540, scale: 1.18, waves: [
    { name: '熄燈時刻', enemies: ['runner', 'walker', 'runner', 'brute', 'spitter', 'walker', 'runner'], interval: 2.6 },
    { name: '酸雨巷弄', enemies: ['spitter', 'walker', 'brute', 'runner', 'spitter', 'walker', 'brute', 'runner', 'walker'], interval: 2.5 },
    { name: '離站警報', enemies: ['brute', 'runner', 'runner', 'spitter', 'brute', 'walker', 'spitter', 'runner', 'brute', 'walker'], interval: 2.5 },
  ] },
  { id: 'terminal', name: '零號終站', subtitle: '最終站 · 黎明之前', label: 'TERMINAL ZERO', color: '#b497ec', barricadeHp: 760, scale: 1.34, waves: [
    { name: '最後防線', enemies: ['brute', 'runner', 'spitter', 'runner', 'walker', 'brute', 'spitter', 'runner', 'brute'], interval: 2.4 },
    { name: '黎明前夕', enemies: ['runner', 'brute', 'spitter', 'runner', 'brute', 'spitter', 'runner', 'brute', 'walker', 'spitter'], interval: 2.2 },
    { name: '終站吞噬者', enemies: ['brute', 'walker', 'runner', 'boss', 'spitter', 'runner', 'brute', 'spitter', 'walker'], interval: 2.8 },
  ] },
]);

export const UPGRADES = Object.freeze([
  { id: 'hotwire', name: '超載發電機', tag: '補給', icon: '⚡', description: '能量回復速度 +22%。', color: '#f6c66c' },
  { id: 'sharp', name: '淬火彈藥', tag: '火力', icon: '✦', description: '所有隊員傷害 +18%。', color: '#ee8c77' },
  { id: 'armor', name: '複合護具', tag: '生存', icon: '▣', description: '所有隊員最大生命 +22%，補回增加的生命。', color: '#8dafec' },
  { id: 'rations', name: '緊急配給', tag: '調度', icon: '◈', description: '部署費用 -12%，最低為原價的 55%。', color: '#92d8a2' },
  { id: 'rapid', name: '快速裝填', tag: '火力', icon: '»', description: '隊員攻擊與治療間隔 -15%。', color: '#d7a5df' },
  { id: 'repair', name: '道路救援', tag: '維修', icon: '+', description: '巴士修復 35% 最大生命，最大生命 +60。', color: '#78cdbd' },
  { id: 'battery', name: '備用電池', tag: '補給', icon: '▰', description: '能量上限 +25，立刻補滿能量。', color: '#edca81' },
  { id: 'mobilize', name: '緊急動員', tag: '調度', icon: '↗', description: '部署冷卻 -20%，行軍速度 +12%。', color: '#8bbce5' },
  { id: 'scavenge', name: '拆解專家', tag: '回收', icon: '◇', description: '每次擊殺額外回復 3 點能量，結算零件 +20%。', color: '#b8ce81' },
]);

export const GARAGE_UPGRADES = Object.freeze({
  hull: { id: 'hull', name: '強化車殼', description: '每級巴士最大生命 +45', baseCost: 60, maxLevel: 5 },
  generator: { id: 'generator', name: '發電機', description: '每級能量回復 +0.35 / 秒', baseCost: 70, maxLevel: 5 },
  training: { id: 'training', name: '夜班訓練', description: '每級隊員生命與傷害 +4%', baseCost: 80, maxLevel: 5 },
});
export const ACHIEVEMENTS = Object.freeze([
  { id: 'first_clear', name: '夜行者', description: '突破雨港外環' },
  { id: 'survivor', name: '末班車上的人', description: '通關全部三站' },
  { id: 'full_roster', name: '五人小隊', description: '一局內部署全部五種隊員' },
  { id: 'hundred', name: '清道夫', description: '累積擊倒 100 名感染者' },
  { id: 'healthy', name: '平安抵達', description: '通關時保有 70% 巴士生命' },
  { id: 'daily_clear', name: '今日值班', description: '完成每日固定種子挑戰' },
]);

const FIXED_STEP = 1 / 60;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const finite = (n, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
const integer = (n, min, max) => Math.floor(clamp(finite(n), min, max));
const clone = (value) => JSON.parse(JSON.stringify(value));
const hasUnit = (type) => typeof type === 'string' && Object.hasOwn(UNITS, type);
const hasGarage = (id) => typeof id === 'string' && Object.hasOwn(GARAGE_UPGRADES, id);

/** Corrupt, legacy, missing and untrusted localStorage values all produce a safe save. */
export function sanitizeSave(raw) {
  try { if (typeof raw === 'string') raw = JSON.parse(raw); } catch { raw = null; }
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const garage = value.garage && typeof value.garage === 'object' ? value.garage : {};
  return {
    version: 1,
    scrap: integer(value.scrap, 0, 999999),
    garage: Object.fromEntries(Object.entries(GARAGE_UPGRADES).map(([key, def]) => [key, integer(garage[key], 0, def.maxLevel)])),
    runs: integer(value.runs, 0, 999999), wins: integer(value.wins, 0, 999999),
    bestStage: integer(value.bestStage, 0, STAGES.length), totalKills: integer(value.totalKills, 0, 99999999),
    achievements: [...new Set((Array.isArray(value.achievements) ? value.achievements : []).filter(id => ACHIEVEMENTS.some(a => a.id === id)))],
    settings: { sound: value.settings?.sound !== false, reducedMotion: value.settings?.reducedMotion === true },
  };
}
export function garageCost(meta, id) {
  if (!hasGarage(id)) return null;
  const def = GARAGE_UPGRADES[id];
  const level = sanitizeSave(meta).garage[id];
  return level >= def.maxLevel ? null : Math.round(def.baseCost * (1.65 ** level));
}
/** Pure purchase: no mutation. Persist result.save only if result.ok. */
export function purchaseGarage(meta, id) {
  const save = sanitizeSave(meta), cost = garageCost(save, id);
  if (!hasGarage(id)) return { ok: false, reason: 'unknown', save, cost: null };
  if (cost === null) return { ok: false, reason: 'max', save, cost };
  if (save.scrap < cost) return { ok: false, reason: 'scrap', save, cost };
  save.scrap -= cost; save.garage[id]++;
  return { ok: true, save, cost };
}
export function hashSeed(seed) {
  const str = String(seed); let hash = 2166136261;
  for (let i = 0; i < str.length; i++) { hash ^= str.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0 || 1;
}
/** Daily seed uses UTC, so everybody receives the same challenge on a given day. */
export function dailySeed(date = new Date()) {
  const key = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date(date).toISOString().slice(0, 10);
  return hashSeed(`NEON-LASTLINE:${key}`);
}

export class Game {
  constructor({ seed = 1, meta = {}, mode = 'normal' } = {}) {
    this.meta = sanitizeSave(meta);
    this.mode = mode === 'daily' ? 'daily' : 'normal';
    this.seed = hashSeed(seed);
    this.rng = this.seed;
    this.accumulator = 0; this.nextId = 1; this.eventId = 1; this.previousStatus = 'playing';
    const garage = this.mode === 'daily' ? { hull: 0, generator: 0, training: 0 } : this.meta.garage;
    this.mod = { damage: 1 + garage.training * 0.04, health: 1 + garage.training * 0.04, regen: 6.4 + garage.generator * 0.35, cost: 1, interval: 1, cooldown: 1, speed: 1, killEnergy: 0, scrap: 1 };
    const maxHp = 520 + garage.hull * 45;
    this.state = {
      seed: this.seed, mode: this.mode, status: 'playing', stage: 0, wave: 0, time: 0, waveTime: 0,
      bus: { x: WORLD.busX, y: 355, hp: maxHp, maxHp, radius: 40 },
      barricade: { x: WORLD.barricadeX, y: 355, hp: STAGES[0].barricadeHp, maxHp: STAGES[0].barricadeHp, radius: 25, vulnerable: false },
      resource: 65, maxResource: 100, regen: this.mod.regen,
      cooldowns: Object.fromEntries(Object.keys(UNITS).map(k => [k, 0])),
      allies: [], enemies: [], effects: [], events: [], upgrades: [], upgradeChoices: [],
      spawnRemaining: 0, nextSpawn: 0, bossSpawned: false, bossDefeated: false,
      stats: { kills: 0, deployed: 0, damage: 0, healed: 0, wavesCleared: 0, stagesCleared: 0, unitTypes: [], elapsed: 0 },
      reward: 0, claimed: false, achievements: [],
    };
    this._prepareWave();
  }
  random() {
    let t = this.rng += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    this.rng >>>= 0;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  /** Read-only UI helpers include all current upgrade discounts. */
  unitCost(type) { return hasUnit(type) ? Math.ceil(UNITS[type].cost * this.mod.cost) : Infinity; }
  unitCooldown(type) { return hasUnit(type) ? UNITS[type].cooldown * this.mod.cooldown : Infinity; }
  canDeploy(type) { return this.state.status === 'playing' && hasUnit(type) && this.state.cooldowns[type] <= 1e-8 && this.state.resource + 1e-8 >= this.unitCost(type) && this.state.allies.length < 32; }
  deploy(type) {
    const s = this.state;
    if (!hasUnit(type)) return { ok: false, reason: 'unknown' };
    if (s.status !== 'playing') return { ok: false, reason: 'status' };
    if (s.allies.length >= 32) return { ok: false, reason: 'capacity' };
    if (s.cooldowns[type] > 1e-8) return { ok: false, reason: 'cooldown' };
    if (s.resource + 1e-8 < this.unitCost(type)) return { ok: false, reason: 'energy' };
    s.resource = Math.max(0, s.resource - this.unitCost(type));
    s.cooldowns[type] = this.unitCooldown(type);
    const u = this._entity(type, 'ally');
    s.allies.push(u); s.stats.deployed++;
    if (!s.stats.unitTypes.includes(type)) s.stats.unitTypes.push(type);
    this._effect('deploy', u.x, u.y, { color: UNITS[type].color, ttl: 0.55 });
    this._event('deploy', `${UNITS[type].name} 出發`);
    return { ok: true, id: u.id };
  }
  /** dt is seconds; negative/non-finite deltas are ignored, each call capped at 5s. */
  tick(dt) {
    if (this.state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return this.state;
    this.accumulator += Math.min(dt, 5);
    while (this.accumulator + 1e-10 >= FIXED_STEP && this.state.status === 'playing') {
      this.accumulator -= FIXED_STEP;
      this._step(FIXED_STEP);
    }
    if (this.state.status !== 'playing') this.accumulator = 0;
    return this.state;
  }
  /** pause() toggles; pause(true/false) explicitly pauses or resumes. */
  pause(value) {
    const s = this.state, shouldPause = value === undefined ? s.status !== 'paused' : !!value;
    if (shouldPause && s.status === 'playing') { this.previousStatus = s.status; s.status = 'paused'; return true; }
    if (!shouldPause && s.status === 'paused') { s.status = this.previousStatus; return true; }
    return false;
  }
  chooseUpgrade(id) {
    const s = this.state;
    if (s.status !== 'upgrade' || !s.upgradeChoices.some(u => u.id === id)) return false;
    s.upgrades.push(id); s.upgradeChoices = []; this._applyUpgrade(id);
    this._event('upgrade', `獲得改裝：${UPGRADES.find(u => u.id === id).name}`);
    if (s.wave < 2) { s.wave++; this._prepareWave(); }
    else s.status = 'stageComplete';
    return true;
  }
  startNextStage() {
    const s = this.state;
    if (s.status !== 'stageComplete' || s.stage >= STAGES.length - 1) return false;
    s.stage++; s.wave = 0;
    s.bus.hp = Math.min(s.bus.maxHp, s.bus.hp + s.bus.maxHp * 0.15);
    s.barricade.hp = s.barricade.maxHp = STAGES[s.stage].barricadeHp;
    this._prepareWave();
    return true;
  }
  /** Returns a detached JSON-safe state object; consumers cannot mutate live state through it. */
  snapshot() { return clone(this.state); }
  /** Claim once after victory/defeat; persist the returned save in localStorage. */
  claimRewards() {
    const s = this.state;
    if (!['won', 'lost'].includes(s.status)) return null;
    if (s.claimed) return clone(this.meta);
    s.claimed = true;
    const save = sanitizeSave(this.meta);
    save.scrap += s.reward; save.runs++; save.wins += s.status === 'won' ? 1 : 0;
    save.bestStage = Math.max(save.bestStage, s.stats.stagesCleared);
    save.totalKills += s.stats.kills;
    const unlock = [];
    if (s.stats.stagesCleared >= 1) unlock.push('first_clear');
    if (s.status === 'won') unlock.push('survivor');
    if (s.stats.unitTypes.length === 5) unlock.push('full_roster');
    if (save.totalKills >= 100) unlock.push('hundred');
    if (s.status === 'won' && s.bus.hp / s.bus.maxHp >= 0.7) unlock.push('healthy');
    if (s.status === 'won' && this.mode === 'daily') unlock.push('daily_clear');
    s.achievements = unlock.filter(id => !save.achievements.includes(id));
    save.achievements = [...new Set([...save.achievements, ...unlock])];
    this.meta = sanitizeSave(save);
    return clone(this.meta);
  }
  _event(type, text) {
    this.state.events.push({ id: this.eventId++, type, text, time: this.state.time });
    if (this.state.events.length > 24) this.state.events.shift();
  }
  _effect(type, x, y, extra = {}) {
    this.state.effects.push({ id: this.nextId++, type, x, y, ttl: 0.32, ...extra });
    if (this.state.effects.length > 160) this.state.effects.shift();
  }
  _entity(type, team) {
    const def = team === 'ally' ? UNITS[type] : ENEMIES[type];
    const scale = team === 'ally' ? this.mod.health : STAGES[this.state.stage].scale * (1 + this.state.wave * 0.055);
    const u = { ...def, id: this.nextId++, type, team, x: team === 'ally' ? 150 : 864,
      y: 338 + Math.floor(this.random() * 4) * 9, hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale),
      attack: def.attack * (team === 'ally' ? this.mod.damage : Math.sqrt(scale)),
      speed: def.speed * (team === 'ally' ? this.mod.speed : 0.96 + this.random() * 0.08),
      interval: def.interval * (team === 'ally' ? this.mod.interval : 1),
      attackTimer: 0.15 + this.random() * 0.35, healTimer: 0.65, anim: 'walk', flash: 0,
    };
    if (team === 'ally' && u.heal) u.heal *= this.mod.damage;
    return u;
  }
  _prepareWave() {
    const s = this.state, def = STAGES[s.stage].waves[s.wave];
    s.status = 'playing'; s.waveTime = 0; s.effects = []; s.enemies = [];
    s.barricade.vulnerable = s.wave === 2;
    s.bossSpawned = false; s.bossDefeated = false;
    // Survivors board the bus between waves. Re-entry keeps the battle readable
    // and prevents an old firing line from killing fresh spawns at their origin.
    s.allies.forEach((u, i) => { u.x = 150 + Math.min(i, 10) * 8; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.15); u.attackTimer = 0.4; });
    if (s.stats.wavesCleared > 0) s.resource = Math.min(s.maxResource, Math.max(60, s.resource + 25));
    for (const id of Object.keys(s.cooldowns)) s.cooldowns[id] = 0;
    this.spawnQueue = def.enemies.map((type, i) => ({ type, at: i === 0 ? 2 : 2 + i * def.interval + this.random() * 0.9 }));
    s.spawnRemaining = this.spawnQueue.length; s.nextSpawn = 2;
    this._event('wave', `${STAGES[s.stage].name} · 第 ${s.wave + 1} 波：${def.name}`);
  }
  _step(dt) {
    const s = this.state;
    s.time += dt; s.waveTime += dt; s.stats.elapsed = s.time;
    s.bus.flash = Math.max(0, (s.bus.flash || 0) - dt);
    s.barricade.flash = Math.max(0, (s.barricade.flash || 0) - dt);
    s.regen = this.mod.regen;
    s.resource = Math.min(s.maxResource, s.resource + this.mod.regen * dt);
    for (const id of Object.keys(s.cooldowns)) s.cooldowns[id] = Math.max(0, s.cooldowns[id] - dt);
    for (const fx of s.effects) fx.ttl -= dt;
    s.effects = s.effects.filter(fx => fx.ttl > 0);
    while (this.spawnQueue.length && this.spawnQueue[0].at <= s.waveTime) {
      const { type } = this.spawnQueue.shift(), enemy = this._entity(type, 'enemy');
      s.enemies.push(enemy);
      if (type === 'boss') { s.bossSpawned = true; this._event('boss', '警告：終站吞噬者現身！'); }
    }
    s.spawnRemaining = this.spawnQueue.length;
    s.nextSpawn = this.spawnQueue.length ? Math.max(0, this.spawnQueue[0].at - s.waveTime) : 0;
    const units = [...s.allies, ...s.enemies];
    for (const u of units) {
      if (u.hp <= 0) continue;
      u.flash = Math.max(0, u.flash - dt); u.attackTimer -= dt; u.healTimer -= dt;
      const allies = u.team === 'ally' ? s.allies : s.enemies;
      const opponents = (u.team === 'ally' ? s.enemies : s.allies).filter(v => v.hp > 0);
      if (u.team === 'ally' && u.heal && u.healTimer <= 0) {
        const target = allies.filter(v => v.hp > 0 && v.hp < v.maxHp - 1 && Math.abs(v.x - u.x) <= u.healRange)
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id - b.id)[0];
        if (target) {
          const amount = Math.min(u.heal, target.maxHp - target.hp); target.hp += amount; s.stats.healed += amount;
          u.healTimer = u.healInterval * this.mod.interval;
          this._effect('heal', target.x, target.y - 28, { color: '#a8f095', amount: Math.round(amount), ttl: 0.6 });
        }
      }
      const direction = u.team === 'ally' ? 1 : -1;
      const nearest = opponents.sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x) || a.id - b.id)[0];
      const base = u.team === 'ally' ? s.barricade : s.bus;
      const baseActive = u.team === 'enemy' || (s.barricade.vulnerable && s.barricade.hp > 0);
      const target = nearest || (baseActive ? base : null);
      const distance = target ? Math.abs(target.x - u.x) - (target.radius || 0) : Infinity;
      if (target && distance <= u.range + 0.001) {
        u.anim = 'attack';
        if (u.attackTimer <= 0) {
          u.attackTimer = u.interval;
          this._attack(u, target, opponents, target === base);
        }
      } else {
        u.anim = 'walk';
        let end = u.x + direction * u.speed * dt;
        // Stop at range: neither a runner nor a large frame delta can tunnel.
        if (target) {
          const boundary = target.x - direction * ((target.radius || 0) + u.range);
          if (direction > 0) end = Math.min(end, Math.max(u.x, boundary));
          else end = Math.max(end, Math.min(u.x, boundary));
        }
        u.x = clamp(end, 145, 870);
      }
    }
    this._cleanupDead();
    if (s.bus.hp <= 0) {
      s.bus.hp = 0; s.status = 'lost'; this._finishReward(false); this._event('lost', '引擎熄火。下一班，會走得更遠。');
      return;
    }
    if (!this.spawnQueue.length && !s.enemies.length && (s.wave < 2 || s.barricade.hp <= 0)) this._clearWave();
  }
  _attack(u, target, opponents, isBase) {
    const s = this.state;
    const targets = u.splash && !isBase ? opponents.filter(v => v.hp > 0 && Math.abs(v.x - target.x) <= u.splash) : [target];
    for (const victim of targets) {
      const amount = u.attack * (1 - (victim.armor || 0));
      const actual = Math.min(victim.hp, amount);
      victim.hp = Math.max(0, victim.hp - amount); victim.flash = 0.13;
      if (u.team === 'ally') s.stats.damage += actual;
    }
    const ranged = u.range > 80;
    this._effect(u.splash ? 'explosion' : ranged ? 'shot' : 'hit', target.x, target.y - 18,
      { fromX: u.x, fromY: u.y - 22, toX: target.x, toY: target.y - 18, color: u.color, ttl: u.splash ? 0.45 : 0.18, radius: u.splash || 10, team: u.team });
  }
  _cleanupDead() {
    const s = this.state;
    for (const u of s.enemies.filter(u => u.hp <= 0)) {
      s.stats.kills++; s.reward += u.reward;
      s.resource = Math.min(s.maxResource, s.resource + this.mod.killEnergy);
      if (u.type === 'boss') { s.bossDefeated = true; this._event('bossDown', '終站吞噬者倒下。清空路障，迎接黎明！'); }
      this._effect('death', u.x, u.y, { color: u.color, ttl: 0.5, team: u.team, entityType: u.type });
    }
    for (const u of s.allies.filter(u => u.hp <= 0)) this._effect('death', u.x, u.y, { color: u.color, ttl: 0.45, team: u.team, entityType: u.type });
    s.enemies = s.enemies.filter(u => u.hp > 0); s.allies = s.allies.filter(u => u.hp > 0);
  }
  _clearWave() {
    const s = this.state;
    if (s.stage === STAGES.length - 1 && s.wave === 2 && (!s.bossSpawned || !s.bossDefeated)) return;
    s.stats.wavesCleared++; s.reward += 12 + s.stage * 4;
    this._event('clear', `第 ${s.wave + 1} 波突破！`);
    if (s.wave === 2) { s.stats.stagesCleared++; s.reward += 25; }
    if (s.stage === STAGES.length - 1 && s.wave === 2) {
      // The final wave cannot resolve before its boss has spawned and died.
      if (!s.bossSpawned || !s.bossDefeated) return;
      s.status = 'won'; this._finishReward(true); this._event('won', '天亮了。末班車全員抵達。');
    } else {
      s.status = 'upgrade';
      const pool = [...UPGRADES];
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      s.upgradeChoices = pool.slice(0, 3).map(u => ({ ...u }));
    }
  }
  _finishReward(won) {
    this.state.reward = Math.round((this.state.reward + (won ? 75 : 10)) * this.mod.scrap);
  }
  _applyUpgrade(id) {
    const s = this.state;
    switch (id) {
      case 'hotwire': this.mod.regen *= 1.22; s.regen = this.mod.regen; break;
      case 'sharp': this.mod.damage *= 1.18; s.allies.forEach(u => { u.attack *= 1.18; if (u.heal) u.heal *= 1.18; }); break;
      case 'armor': this.mod.health *= 1.22; s.allies.forEach(u => { const old = u.maxHp; u.maxHp = Math.round(u.maxHp * 1.22); u.hp += u.maxHp - old; }); break;
      case 'rations': this.mod.cost = Math.max(0.55, this.mod.cost * 0.88); break;
      case 'rapid': this.mod.interval *= 0.85; s.allies.forEach(u => { u.interval *= 0.85; }); break;
      case 'repair': s.bus.maxHp += 60; s.bus.hp = Math.min(s.bus.maxHp, s.bus.hp + s.bus.maxHp * 0.35); break;
      case 'battery': s.maxResource += 25; s.resource = s.maxResource; break;
      case 'mobilize': this.mod.cooldown *= 0.8; this.mod.speed *= 1.12; s.allies.forEach(u => { u.speed *= 1.12; }); break;
      case 'scavenge': this.mod.killEnergy += 3; this.mod.scrap *= 1.2; break;
    }
  }
}
