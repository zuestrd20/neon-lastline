import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, UNITS, UPGRADES, STAGES, GARAGE_UPGRADES, sanitizeSave, purchaseGarage, garageCost, dailySeed } from '../engine.js';

function runLegalStrategy(game, seconds = 1500) {
  let decisions = 0;
  for (let t = 0; t < seconds * 10 && !['won', 'lost'].includes(game.state.status); t++) {
    if (game.state.status === 'upgrade') {
      const order = ['hotwire', 'rations', 'sharp', 'rapid', 'armor', 'repair', 'mobilize', 'battery', 'scavenge'];
      const choice = order.find(id => game.state.upgradeChoices.some(u => u.id === id));
      assert.equal(game.chooseUpgrade(choice), true); decisions++;
    } else if (game.state.status === 'stageComplete') {
      assert.equal(game.startNextStage(), true);
    } else if (game.state.status === 'playing') {
      const count = (type) => game.state.allies.filter(u => u.type === type).length;
      const desired = count('shield') < 2 ? 'shield' : count('ranger') < 3 ? 'ranger' : count('medic') < 1 ? 'medic' : count('bomber') < 2 ? 'bomber' : count('brawler') < 2 ? 'brawler' : 'ranger';
      if (game.canDeploy(desired)) assert.equal(game.deploy(desired).ok, true);
      game.tick(0.1);
    }
  }
  return { game, decisions };
}

test('definitions expose five distinct units, nine upgrades and three 3-wave stages', () => {
  assert.equal(Object.keys(UNITS).length, 5); assert.equal(UPGRADES.length, 9); assert.equal(STAGES.length, 3);
  assert.ok(STAGES.every(s => s.waves.length === 3));
  assert.equal(STAGES[2].waves[2].enemies.filter(t => t === 'boss').length, 1);
});

test('resource, cooldown, invalid deployment and active status are enforced', () => {
  const g = new Game({ seed: 42 });
  assert.equal(g.deploy('nope').reason, 'unknown');
  const before = g.state.resource;
  assert.equal(g.deploy('brawler').ok, true); assert.equal(g.state.resource, before - 20);
  assert.equal(g.deploy('brawler').reason, 'cooldown');
  assert.equal(g.deploy('bomber').reason, 'energy');
  g.tick(3); assert.ok(g.state.resource > before - 20); assert.equal(g.state.cooldowns.brawler, 0);
  g.pause(true); assert.equal(g.deploy('ranger').reason, 'status');
});

test('pause is a complete simulation freeze; invalid deltas cannot corrupt state', () => {
  const g = new Game(); g.deploy('shield'); g.tick(1); g.pause(true);
  const frozen = g.snapshot(); g.tick(5); assert.deepEqual(g.snapshot(), frozen);
  g.pause(false); g.tick(NaN); g.tick(-1); g.tick(Infinity);
  assert.ok(Number.isFinite(g.state.time)); g.tick(1); assert.ok(g.state.time > frozen.time);
});

test('resources never overfill and snapshot is a detached serializable object', () => {
  const g = new Game(); for (let i = 0; i < 10; i++) g.tick(1);
  assert.equal(g.state.resource, 100);
  const snap = g.snapshot(); snap.bus.hp = -100; assert.ok(g.state.bus.hp > 0);
  assert.doesNotThrow(() => JSON.stringify(snap));
});

test('seed and fixed-step timing give deterministic results across render frame sizes', () => {
  const a = new Game({ seed: 'night-rain' }), b = new Game({ seed: 'night-rain' });
  a.deploy('shield'); b.deploy('shield');
  for (let i = 0; i < 600; i++) a.tick(1 / 60);
  for (let i = 0; i < 100; i++) b.tick(0.1);
  assert.deepEqual(a.snapshot(), b.snapshot());
});

test('doing nothing loses the convoy and cannot award victory', () => {
  const g = new Game({ seed: 8 });
  for (let i = 0; i < 300 && g.state.status === 'playing'; i++) g.tick(1);
  assert.equal(g.state.status, 'lost'); assert.equal(g.state.bus.hp, 0);
  assert.equal(g.state.stats.wavesCleared, 0); assert.equal(g.state.stats.kills, 0);
});

test('combat collision blocks melee advance and inflicts damage', () => {
  const g = new Game(); g.deploy('shield');
  for (let i = 0; i < 160; i++) g.tick(0.1);
  assert.ok(g.state.stats.damage > 0);
  const shield = g.state.allies.find(u => u.type === 'shield');
  assert.ok(shield && shield.hp < shield.maxHp);
  const enemy = g.state.enemies.find(u => u.hp > 0);
  if (enemy) assert.ok(shield.x <= enemy.x + 1, 'opponents must not tunnel through each other');
});

test('a normal mixed-unit strategy clears all nine waves and final boss with no garage', () => {
  for (const seed of [1, 7, 42, 'daily-test']) {
    const { game: g, decisions } = runLegalStrategy(new Game({ seed }));
    assert.equal(g.state.status, 'won', `seed ${seed}: ${JSON.stringify({ stage: g.state.stage, wave: g.state.wave, hp: g.state.bus.hp, time: g.state.time, allies: g.state.allies.length })}`);
    assert.equal(decisions, 8); assert.equal(g.state.stats.wavesCleared, 9); assert.equal(g.state.stats.stagesCleared, 3);
    assert.equal(g.state.barricade.hp, 0); assert.equal(g.state.bossSpawned, true); assert.equal(g.state.bossDefeated, true);
    assert.ok(g.state.stats.healed > 0); assert.ok(g.state.stats.kills >= 65); assert.ok(g.state.reward > 300);
  }
});

test('each upgrade presents three distinct legal choices and rejects stale/double choices', () => {
  const g = new Game({ seed: 55 });
  for (let i = 0; i < 2000 && g.state.status === 'playing'; i++) {
    for (const type of ['shield', 'ranger', 'brawler']) if (g.canDeploy(type)) g.deploy(type);
    g.tick(0.1);
  }
  assert.equal(g.state.status, 'upgrade');
  assert.equal(g.state.upgradeChoices.length, 3);
  assert.equal(new Set(g.state.upgradeChoices.map(u => u.id)).size, 3);
  assert.equal(g.chooseUpgrade('invalid'), false);
  const id = g.state.upgradeChoices[0].id;
  assert.equal(g.chooseUpgrade(id), true); assert.equal(g.chooseUpgrade(id), false); assert.equal(g.state.wave, 1);
});

test('save sanitation handles corrupt JSON, infinities, negative balances and unknown keys', () => {
  assert.deepEqual(sanitizeSave('{bad'), sanitizeSave(null));
  const save = sanitizeSave({ scrap: -500, wins: Infinity, garage: { hull: 100, generator: -1, training: '3' }, achievements: ['survivor', 'survivor', 'bogus'] });
  assert.equal(save.scrap, 0); assert.equal(save.wins, 0); assert.deepEqual(save.garage, { hull: 5, generator: 0, training: 0 });
  assert.deepEqual(save.achievements, ['survivor']);
});

test('garage purchasing is bounded, correctly priced and never mutates input', () => {
  const original = sanitizeSave({ scrap: 1000 }), before = JSON.stringify(original);
  const result = purchaseGarage(original, 'hull');
  assert.equal(result.ok, true); assert.equal(result.cost, GARAGE_UPGRADES.hull.baseCost);
  assert.equal(result.save.garage.hull, 1); assert.equal(result.save.scrap, 940); assert.equal(JSON.stringify(original), before);
  assert.equal(purchaseGarage({ scrap: 0 }, 'hull').reason, 'scrap');
  assert.equal(purchaseGarage(original, 'invalid').reason, 'unknown');
  assert.equal(garageCost({ garage: { hull: 5 } }, 'hull'), null);
  assert.equal(purchaseGarage({ scrap: 10000, garage: { hull: 5 } }, 'hull').reason, 'max');
});

test('reward claims are terminal-only and idempotent, with achievements persisted', () => {
  const g = new Game({ seed: 42, meta: { scrap: 25 } }); assert.equal(g.claimRewards(), null);
  runLegalStrategy(g); const save = g.claimRewards();
  assert.equal(save.scrap, g.state.reward + 25); assert.equal(save.runs, 1); assert.equal(save.wins, 1);
  assert.equal(save.bestStage, 3); assert.ok(save.achievements.includes('survivor'));
  assert.deepEqual(g.claimRewards(), save); assert.equal(g.state.claimed, true);
});

test('daily seed is stable by UTC date and daily games ignore persistent buffs', () => {
  assert.equal(dailySeed('2026-10-07'), dailySeed(new Date('2026-10-07T12:32:00Z')));
  assert.notEqual(dailySeed('2026-10-07'), dailySeed('2026-10-08'));
  const base = new Game({ mode: 'daily', seed: dailySeed('2026-10-07') });
  const buff = new Game({ mode: 'daily', seed: dailySeed('2026-10-07'), meta: { garage: { hull: 5, generator: 5, training: 5 } } });
  assert.deepEqual(base.snapshot(), buff.snapshot());
});

test('prototype names and malformed identifiers are rejected without changing resources', () => {
  const g = new Game(), before = g.state.resource;
  for (const id of ['__proto__', 'constructor', 'toString', null, {}, 42]) {
    assert.equal(g.deploy(id).ok, false);
    assert.equal(g.canDeploy(id), false);
    assert.equal(purchaseGarage({ scrap: 500 }, id).ok, false);
  }
  assert.equal(g.state.resource, before);
});

test('bomber splash damages clustered enemies but not targets outside blast radius', () => {
  const g = new Game();
  const bomber = g._entity('bomber', 'ally');
  const a = g._entity('walker', 'enemy'), b = g._entity('runner', 'enemy'), c = g._entity('walker', 'enemy');
  a.x = 500; b.x = 545; c.x = 600;
  g._attack(bomber, a, [a, b, c], false);
  assert.ok(a.hp < a.maxHp); assert.ok(b.hp < b.maxHp); assert.equal(c.hp, c.maxHp);
  assert.equal(g.state.effects.at(-1).type, 'explosion');
});

test('shield armor reduces incoming damage and healing respects max health', () => {
  const g = new Game(), shield = g._entity('shield', 'ally'), medic = g._entity('medic', 'ally');
  const attacker = g._entity('walker', 'enemy');
  const before = shield.hp; g._attack(attacker, shield, [shield], false);
  assert.ok(Math.abs(before - shield.hp - attacker.attack * 0.72) < 1e-8);
  shield.hp = shield.maxHp - 3; medic.healTimer = 0; g.state.allies.push(shield, medic); g.tick(1 / 60);
  assert.equal(shield.hp, shield.maxHp); assert.equal(g.state.stats.healed, 3);
});

test('all nine upgrades have real effects and apply once per choice', () => {
  for (const upgrade of UPGRADES) {
    const g = new Game(); g.deploy('shield'); g.state.bus.hp = 200;
    const before = { ...g.mod }, oldBus = g.state.bus.hp, oldMax = g.state.maxResource;
    g.state.status = 'upgrade'; g.state.upgradeChoices = [upgrade];
    assert.equal(g.chooseUpgrade(upgrade.id), true);
    assert.equal(g.state.upgrades.length, 1);
    assert.equal(g.chooseUpgrade(upgrade.id), false);
    switch (upgrade.id) {
      case 'hotwire': assert.ok(g.mod.regen > before.regen); break;
      case 'sharp': assert.ok(g.mod.damage > before.damage); break;
      case 'armor': assert.ok(g.mod.health > before.health); break;
      case 'rations': assert.ok(g.unitCost('shield') < UNITS.shield.cost); break;
      case 'rapid': assert.ok(g.mod.interval < before.interval); break;
      case 'repair': assert.ok(g.state.bus.hp > oldBus); break;
      case 'battery': assert.equal(g.state.maxResource, oldMax + 25); assert.equal(g.state.resource, g.state.maxResource); break;
      case 'mobilize': assert.ok(g.unitCooldown('shield') < UNITS.shield.cooldown); assert.ok(g.mod.speed > before.speed); break;
      case 'scavenge': assert.equal(g.mod.killEnergy, 3); assert.ok(g.mod.scrap > before.scrap); break;
    }
  }
});

test('stage transition requires an earned clear and carries bus health safely', () => {
  const g = new Game(); assert.equal(g.startNextStage(), false);
  g.state.status = 'upgrade'; g.state.wave = 2; g.state.upgradeChoices = [UPGRADES[0]]; g.state.bus.hp = 300;
  g.chooseUpgrade('hotwire'); assert.equal(g.state.status, 'stageComplete'); assert.equal(g.state.stage, 0);
  assert.equal(g.startNextStage(), true); assert.equal(g.state.stage, 1); assert.equal(g.state.wave, 0);
  assert.ok(g.state.bus.hp > 300 && g.state.bus.hp <= g.state.bus.maxHp);
  assert.equal(g.state.barricade.hp, STAGES[1].barricadeHp); assert.equal(g.state.barricade.vulnerable, false);
  assert.equal(g.startNextStage(), false);
});

test('final-wave clear cannot bypass an unspawned or surviving boss', () => {
  const g = new Game(); g.state.stage = 2; g.state.wave = 2; g.state.barricade.hp = 0;
  g.spawnQueue = []; g.state.spawnRemaining = 0; g.state.enemies = [];
  g._clearWave(); assert.equal(g.state.status, 'playing'); assert.equal(g.state.stats.wavesCleared, 0);
  g.state.bossSpawned = true; g._clearWave(); assert.equal(g.state.status, 'playing');
  g.state.bossDefeated = true; g._clearWave(); assert.equal(g.state.status, 'won');
  const frozen = g.snapshot(); g.tick(5); assert.deepEqual(g.snapshot(), frozen);
});
