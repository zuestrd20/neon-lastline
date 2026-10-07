/**
 * Run separately: node --expose-gc tests/reliability-stress.mjs [runs]
 * Executes real app, engine and artwork for every scheduled scene frame.
 * Canvas API checks validate arguments/lifetimes; native raster/GPU memory is
 * deliberately not represented and requires a real browser soak test.
 */
import assert from 'node:assert/strict';
import { launch } from './ui-harness.mjs';

const runCount = Math.max(1, Math.min(20, Number(process.argv[2]) || 5));
const ui = launch({ realArt: true });
const maxima = { allies: 0, enemies: 0, effects: 0, events: 0, nodes: 0, contexts: 0, cachedBytes: 0 };
const effectTypes = new Set(), runStats = [];
let now = 1000, frames = 0;
ui.get('introActions').querySelector('button').click();
for (let run = 0; run < runCount; run++) {
  let supplies = 0, checkpoints = 0;
  const began = now;
  for (let frame = 0; frame < 120000 && !ui.app.game.state.claimed; frame++) {
    const state = ui.app.game.state;
    if (state.status === 'upgrade') {
      const order = ['hotwire', 'rations', 'sharp', 'rapid', 'armor', 'repair', 'mobilize', 'battery', 'scavenge'];
      const choice = order.find(id => state.upgradeChoices.some(u => u.id === id));
      const index = state.upgradeChoices.findIndex(u => u.id === choice);
      const options = ui.get('overlay').querySelectorAll('.upgrade');
      if (options.length === 3) { options[index].click(); supplies++; }
    } else if (state.status === 'stageComplete') {
      const next = ui.get('overlay').querySelectorAll('button').find(b => b.textContent.startsWith('前往下一站'));
      if (next) { next.click(); checkpoints++; }
    } else if (state.status === 'playing') {
      const count = type => state.allies.filter(u => u.type === type).length;
      const desired = count('shield') < 2 ? 'shield' : count('ranger') < 3 ? 'ranger' : count('medic') < 1 ? 'medic' : count('bomber') < 2 ? 'bomber' : count('brawler') < 2 ? 'brawler' : 'ranger';
      const card = ui.app.cards.find(({ u }) => u.id === desired);
      if (!card.b.disabled) card.b.click();
    }
    ui.frame(now += 1000 / 60); frames++;
    for (const key of ['allies', 'enemies', 'effects', 'events']) maxima[key] = Math.max(maxima[key], state[key].length);
    for (const effect of state.effects) effectTypes.add(effect.type);
    assert.ok(state.allies.length <= 32);
    assert.ok(state.effects.length <= 160);
    assert.ok(state.events.length <= 24);
    { // Check live bounds on every animation frame, not only at checkpoints.
      const audit = ui.audit();
      maxima.nodes = Math.max(maxima.nodes, audit.nodes); maxima.contexts = Math.max(maxima.contexts, audit.contexts); maxima.cachedBytes = Math.max(maxima.cachedBytes, audit.cachedBytes);
      assert.ok(audit.nodes <= 220, `live DOM grew to ${audit.nodes}`);
      assert.equal(audit.listeners, 3, 'listener registration is stable');
      assert.ok(audit.contexts <= 39, 'six visible contexts + at most 33 bounded cache canvases');
      assert.ok(audit.glows <= 7); assert.ok(audit.sprites <= 10); assert.ok(audit.portraits <= 10);
      assert.ok(audit.cachedBytes <= 24056152, 'cache backing dimensions remain within the 22.94 MiB architecture');
      assert.equal(audit.contexts, 6 + audit.backgrounds + audit.buses + audit.glows + audit.sprites + audit.portraits, 'no extra untracked canvas contexts');
      assert.ok(audit.backgrounds <= 3); assert.ok(audit.buses <= 3); assert.equal(audit.entities, 0, 'renderer buffer emptied every frame');
    }
  }
  assert.equal(ui.app.game.state.status, 'won');
  assert.equal(ui.app.game.state.claimed, true);
  assert.equal(supplies, 8); assert.equal(checkpoints, 2);
  assert.equal(ui.app.meta.runs, run + 1);
  global.gc?.();
  const memory = process.memoryUsage();
  const record = { run: run + 1, seconds: Math.round((now - began) / 1000), hp: Math.round(ui.app.game.state.bus.hp), healed: Math.round(ui.app.game.state.stats.healed), heapMiB: +(memory.heapUsed / 1048576).toFixed(2), rssMiB: +(memory.rss / 1048576).toFixed(2), audit: ui.audit() };
  if (runStats.length) {
    const warm = runStats[0].audit;
    for (const key of ['contexts', 'backgrounds', 'buses', 'glows', 'sprites', 'portraits', 'cachedBytes']) assert.equal(record.audit[key], warm[key], `${key} must stabilize after the first full run`);
  }
  runStats.push(record); console.log(JSON.stringify(record));
  if (run + 1 < runCount) ui.get('overlay').querySelector('button').click();
}
assert.ok(effectTypes.has('heal') && effectTypes.has('explosion') && effectTypes.has('death'));
assert.ok(ui.metrics.sceneDraws > 5000, 'substantial actual renderer coverage');
if (global.gc && runCount >= 3) assert.ok(runStats.at(-1).heapMiB - runStats[0].heapMiB < 10, 'post-GC JS heap remains bounded across repeated full runs');
console.log(JSON.stringify({ passed: true, runs: runCount, simulatedSeconds: Math.round((now - 1000) / 1000), frames, metrics: ui.metrics, maxima, effectTypes: [...effectTypes], caveat: 'Canvas API probe; does not validate native raster, GPU or browser instrumentation memory.' }, null, 2));
