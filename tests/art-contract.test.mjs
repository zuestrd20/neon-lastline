/** Canvas API contract smoke tests, not substitutes for visual browser review. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawScene, drawPortrait } from '../art.js';
import { Game, UNITS, ENEMIES } from '../engine.js';

function canvasProbe() {
  let depth = 0;
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => {
        for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), `${property} received non-finite value`);
        calls.push([property, ...args]);
        if (property === 'save') depth++;
        if (property === 'restore') { depth--; assert.ok(depth >= 0, 'unbalanced restore'); }
        if (property === 'createLinearGradient' || property === 'createRadialGradient') {
          return { addColorStop(offset, color) { assert.ok(Number.isFinite(offset) && offset >= 0 && offset <= 1); calls.push(['stop', offset, color]); } };
        }
      };
    },
    set(target, property, value) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${property} is non-finite`);
      if (property === 'globalAlpha') assert.ok(value >= 0 && value <= 1, 'invalid canvas opacity');
      target[property] = value;
      // Capture color/font/transform-independent appearance for stage comparisons.
      if (typeof value !== 'object') calls.push(['set', property, value]);
      return true;
    },
  });
  return { ctx, calls, balanced: () => assert.equal(depth, 0, 'every canvas save must restore') };
}

function renderState(stage = 0) {
  const state = new Game({ seed: 7 }).snapshot();
  const entities = (defs, ally) => Object.values(defs).map((def, i) => ({
    ...def, id: i + 1, type: def.id, team: ally ? 'ally' : 'enemy',
    x: (ally ? 160 : 680) + i * 35, y: 350 + i % 3 * 4,
    hp: def.hp * .7, maxHp: def.hp, anim: i % 2 ? 'attack' : 'walk',
    attackTimer: .1, flash: .12,
  }));
  return {
    ...state, stage, time: 75, units: entities(UNITS, true), enemies: entities(ENEMIES, false),
    busHp: 150, busMaxHp: 520, barricadeHp: 170, barricadeMaxHp: 380,
    effects: ['deploy', 'heal', 'shot', 'explosion', 'death', 'hit'].map((type, i) => ({
      id: i + 200, type, x: 240 + i * 75, y: 330, fromX: 220, fromY: 325,
      toX: 530, toY: 320, ttl: .2, radius: 32, color: '#72ddac',
    })),
  };
}

test('all engine stages/entities/effects render finite canvas operations without mutation', () => {
  for (const stage of [0, 1, 2]) {
    const probe = canvasProbe(), state = renderState(stage), before = JSON.stringify(state);
    drawScene(probe.ctx, state);
    assert.ok(probe.calls.length > 1000, 'detailed scene was rendered');
    probe.balanced();
    assert.equal(JSON.stringify(state), before, 'renderer cannot change simulation state');
  }
});

test('every player/enemy portrait and unknown fallback draws without context leaks', () => {
  for (const type of [...Object.keys(UNITS), ...Object.keys(ENEMIES), 'unknown']) {
    const probe = canvasProbe();
    drawPortrait(probe.ctx, type, 21, 80);
    probe.balanced();
    assert.ok(probe.calls.some(([op]) => op === 'clearRect'));
    assert.ok(probe.calls.length > 50);
  }
});

test('zero-based rain, market and terminal stages have distinct scene artwork', () => {
  const scenes = [0, 1, 2].map(stage => {
    const probe = canvasProbe(); drawScene(probe.ctx, { stage, time: 0, reducedMotion: true });
    return probe.calls;
  });
  assert.notDeepEqual(scenes[0], scenes[1]);
  assert.notDeepEqual(scenes[1], scenes[2]);
  assert.notDeepEqual(scenes[0], scenes[2]);
  assert.ok(scenes[1].some(([op, text]) => op === 'fillText' && text === 'BLACKOUT'));
  assert.ok(scenes[2].some(([op, text]) => op === 'fillText' && text === 'TERMINAL 00'));
});

test('reduced motion eliminates ambient time-driven scene changes', () => {
  const a = canvasProbe(), b = canvasProbe(), state = renderState(1);
  drawScene(a.ctx, { ...state, time: 0, reducedMotion: true });
  drawScene(b.ctx, { ...state, time: 999, reducedMotion: true });
  assert.deepEqual(a.calls, b.calls);
});

test('scene renderer accepts its empty preview contract', () => {
  const probe = canvasProbe(); drawScene(probe.ctx); probe.balanced();
  assert.ok(probe.calls.length > 1000);
});
