/** Software-canvas cache-path contracts. These do not emulate native raster/GPU stability. */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

const originalOffscreenCanvas = globalThis.OffscreenCanvas;
const surfaces = [];
let staticOperations = 0;

function canvasProbe({ main = false } = {}) {
  const metrics = { operations: 0, gradients: 0, depth: 0, maxDepth: 0, capture: false, images: [] };
  const stack = [];
  let state = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const methods = Object.create(null);
  const ctx = new Proxy({}, {
    get(_target, property) {
      if (property in state) return state[property];
      if (!methods[property]) methods[property] = (...args) => {
        metrics.operations++;
        if (!main) staticOperations++;
        for (const value of args) {
          if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(property)} received a non-finite argument`);
        }
        if (property === 'save') {
          stack.push({ ...state });
          metrics.depth++;
          metrics.maxDepth = Math.max(metrics.maxDepth, metrics.depth);
        } else if (property === 'restore') {
          assert.ok(metrics.depth > 0, 'restore must match a previous save');
          state = stack.pop();
          metrics.depth--;
        } else if (property === 'drawImage') {
          const source = args[0];
          assert.ok(source && source.width > 0 && source.height > 0, 'drawImage requires a valid cached surface');
          if (args.length === 9) {
            const [, sx, sy, sw, sh] = args;
            assert.ok(sx >= 0 && sy >= 0 && sw > 0 && sh > 0, 'source tile must have a valid rectangle');
            assert.ok(sx + sw <= source.width && sy + sh <= source.height, 'source tile must fit its atlas');
          }
          if (metrics.capture) metrics.images.push(args);
        } else if (property === 'createLinearGradient' || property === 'createRadialGradient') {
          metrics.gradients++;
          return {
            addColorStop(offset, color) {
              assert.ok(Number.isFinite(offset) && offset >= 0 && offset <= 1);
              assert.equal(typeof color, 'string');
            },
          };
        }
      };
      return methods[property];
    },
    set(_target, property, value) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(property)} must stay finite`);
      if (property === 'globalAlpha') assert.ok(value >= 0 && value <= 1, 'opacity must remain in the legal range');
      state[property] = value;
      return true;
    },
  });
  return {
    ctx,
    metrics,
    balanced() { assert.equal(metrics.depth, 0, 'every context save must be restored'); },
  };
}

globalThis.OffscreenCanvas = class FakeOffscreenCanvas {
  constructor(width, height) {
    assert.ok(Number.isInteger(width) && width > 0);
    assert.ok(Number.isInteger(height) && height > 0);
    this.width = width;
    this.height = height;
    this.probe = canvasProbe();
    surfaces.push(this);
  }
  getContext(mode, options) {
    assert.equal(mode, '2d');
    assert.equal(options?.willReadFrequently, true, 'cache contexts must request the software-oriented path');
    return this.probe.ctx;
  }
};

// A distinct module instance keeps these cache assertions independent of fallback-vector tests.
const { drawScene, drawPortrait } = await import('../art.js?cache-contract');
const HUMAN_TYPES = ['brawler', 'ranger', 'shield', 'medic', 'bomber'];
const ENEMY_TYPES = ['walker', 'runner', 'brute', 'spitter', 'boss'];
const ALL_TYPES = [...HUMAN_TYPES, ...ENEMY_TYPES];
const probe = canvasProbe({ main: true });
const frameState = {
  time: .25,
  stage: 0,
  busHp: 100,
  busMaxHp: 100,
  barricadeHp: 100,
  barricadeMaxHp: 100,
  units: HUMAN_TYPES.map((type, i) => ({ type, id: i + 1, x: 210 + i * 55, y: 355, hp: 70, maxHp: 100, anim: 'walk', flash: i % 2 ? .1 : 0 })),
  enemies: ENEMY_TYPES.map((type, i) => ({ type, id: i + 20, x: 610 + i * 55, y: 351, hp: 70, maxHp: 100, anim: 'attack', flash: i % 2 ? 0 : .1 })),
  effects: [
    { type: 'heal', x: 350, y: 325, ttl: .2 },
    { type: 'explosion', x: 600, y: 325, radius: 70, ttl: .2 },
    { type: 'death', team: 'ally', entityType: 'ranger', x: 430, y: 355, ttl: .2 },
  ],
};

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
deepFreeze(frameState);

function assertAllBalanced() {
  probe.balanced();
  for (const surface of surfaces) surface.probe.balanced();
}

before(() => {
  // All three bus damage appearances, three stages, ten archetypes, and seven glow colors.
  for (const stage of [0, 1, 2]) {
    for (const busHp of [100, 60, 20]) drawScene(probe.ctx, { ...frameState, stage, busHp });
  }
  for (const type of ALL_TYPES) drawPortrait(probe.ctx, type, 1, 80);
  assertAllBalanced();
});

after(() => {
  if (originalOffscreenCanvas === undefined) delete globalThis.OffscreenCanvas;
  else globalThis.OffscreenCanvas = originalOffscreenCanvas;
});

test('software sprite, portrait, scenery and glow caches fit 33 surfaces and 25 MiB', () => {
  const backingBytes = surfaces.reduce((total, surface) => total + surface.width * surface.height * 4, 0);
  assert.ok(surfaces.length <= 33, `surface count must stay bounded, got ${surfaces.length}`);
  assert.ok(backingBytes < 25 * 1024 * 1024, `cache backing pixels must stay below 25 MiB, got ${backingBytes}`);
  assert.equal(surfaces.filter(s => s.width === 1600 && s.height === 256).length, 10, 'all ten character atlases were exercised');
  assert.equal(surfaces.filter(s => s.width === 160 && s.height === 80).length, 10, 'all ten portrait atlases were exercised');
});

test('1,000 warmed cached frames create no gradients, static repainting, or extra surfaces', () => {
  const startStatic = staticOperations;
  const startSurfaces = surfaces.length;
  const startMainOperations = probe.metrics.operations;
  const startMainGradients = probe.metrics.gradients;
  for (let frame = 0; frame < 1000; frame++) {
    drawScene(probe.ctx, { ...frameState, time: frame / 30, stage: frame % 3 });
    for (const type of HUMAN_TYPES) drawPortrait(probe.ctx, type, frame / 30, 80);
    probe.balanced();
  }
  assert.equal(staticOperations, startStatic, 'warm caches must never be repainted');
  assert.equal(surfaces.length, startSurfaces, 'warm rendering must not allocate another surface');
  assert.equal(probe.metrics.gradients, startMainGradients, 'main frames must never construct gradients');
  assert.ok((probe.metrics.operations - startMainOperations) / 1000 < 1000, 'cached scene plus five portraits must stay below 1,000 canvas operations per frame');
  assertAllBalanced();
});

test('cached rendering keeps frozen simulation input unchanged and draw contexts balanced', () => {
  const beforeJSON = JSON.stringify(frameState);
  drawScene(probe.ctx, frameState);
  drawScene(probe.ctx, { ...frameState, reducedMotion: true });
  assert.equal(JSON.stringify(frameState), beforeJSON);
  assertAllBalanced();
});

test('cached characters select separate normal and hit-flash atlas rows', () => {
  probe.metrics.images.length = 0;
  probe.metrics.capture = true;
  drawScene(probe.ctx, frameState);
  probe.metrics.capture = false;
  const spriteDraws = probe.metrics.images.filter(([source]) => source.width === 1600 && source.height === 256);
  assert.ok(spriteDraws.some(args => args[2] === 0), 'normal sprites use the first atlas row');
  assert.ok(spriteDraws.some(args => args[2] === 128), 'flashing sprites use the second atlas row');
  assert.ok(spriteDraws.every(args => args[3] === 160 && args[4] === 128), 'every source crop is one sprite tile');
  assertAllBalanced();
});

test('portrait animation selects two tiles from the same cached image', () => {
  probe.metrics.capture = true;
  probe.metrics.images.length = 0;
  drawPortrait(probe.ctx, 'medic', 0, 80);
  const first = probe.metrics.images.at(-1);
  probe.metrics.images.length = 0;
  drawPortrait(probe.ctx, 'medic', 1, 80);
  const second = probe.metrics.images.at(-1);
  probe.metrics.capture = false;
  assert.equal(first[0], second[0], 'portrait frames must share one cached surface');
  assert.equal(first[1], 0);
  assert.equal(second[1], 80);
  assert.deepEqual(first.slice(2), second.slice(2), 'only the horizontal source tile changes');
  assertAllBalanced();
});

test('unknown types and varied stage inputs cannot expand the warmed caches', () => {
  const count = surfaces.length;
  for (const stage of [-200, 0, .5, 1, 1.5, 2, 200]) {
    drawScene(probe.ctx, { ...frameState, stage, units: [{ type: 'unknown', x: 300, y: 355 }], enemies: [{ type: 'unknown', x: 700, y: 355 }] });
  }
  drawPortrait(probe.ctx, 'unknown', 0, 80);
  assert.equal(surfaces.length, count);
  assertAllBalanced();
});
