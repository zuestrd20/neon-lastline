/**
 * DOM-independent application contract tests. This lightweight DOM models the
 * selectors/events used by app.js; it deliberately does not claim layout QA.
 * In particular dialog.close() queues its close event, as browsers do.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as engine from '../engine.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');

function launch({ saved = {}, blockedStorage = false } = {}) {
  const tasks = [], frames = [], ids = new Map(), values = new Map();
  let clock = 1000;
  const metrics = { sceneDraws: 0, portraitDraws: 0, uiUpdates: 0 };
  values.set('neon-lastline-v1', JSON.stringify(saved));
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null;
      this.attributes = {}; this.style = {}; this.className = ''; this.textContent = '';
      this.disabled = false; this.open = false; this.events = new Map();
      this.classList = {
        add: name => this.className = [...new Set([...this.className.split(/\s+/), name])].join(' ').trim(),
        remove: name => this.className = this.className.split(/\s+/).filter(n => n !== name).join(' '),
        contains: name => this.className.split(/\s+/).includes(name),
        toggle: (name, enabled) => enabled ? this.classList.add(name) : this.classList.remove(name),
      };
    }
    set textContent(value) { this._textContent = String(value); if (this.id === 'stageNum') metrics.uiUpdates++; }
    get textContent() { return this._textContent || ''; }
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'class') this.className = String(value); if (name === 'id') { this.id = String(value); ids.set(this.id, this); } }
    getAttribute(name) { return this.attributes[name] ?? null; }
    append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
    replaceChildren(...children) { for (const child of this.children) child.parentElement = null; this.children = []; this.append(...children); }
    set innerHTML(value) { this.replaceChildren(); this._html = value; parse(value, this); }
    get innerHTML() { return this._html || ''; }
    get nextElementSibling() { const siblings = this.parentElement?.children || []; return siblings[siblings.indexOf(this) + 1] || null; }
    querySelectorAll(selector) {
      const matches = e => selector[0] === '.' ? e.classList.contains(selector.slice(1)) : selector[0] === '#' ? e.id === selector.slice(1) : e.tagName.toLowerCase() === selector;
      const result = []; const walk = e => { for (const child of e.children) { if (matches(child)) result.push(child); walk(child); } }; walk(this); return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getContext() { return {}; }
    addEventListener(type, callback) { const list = this.events.get(type) || []; list.push(callback); this.events.set(type, list); }
    dispatch(type, extra = {}) { const event = { type, target: this, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const cb of this.events.get(type) || []) cb(event); return event; }
    click() { if (!this.disabled) this.onclick?.({ target: this }); }
    showModal() { this.open = true; }
    close() { if (!this.open) return; this.open = false; tasks.push(() => this.dispatch('close')); }
  }
  function parse(text, root) {
    const stack = [root];
    for (const token of text.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>|([^<]+)/gi)) {
      if (!token[1]) { stack.at(-1).textContent += token[3]; continue; }
      const tag = token[1].toLowerCase();
      if (token[0].startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
      const element = new Element(tag);
      for (const attr of token[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) element.setAttribute(attr[1], attr[2] ?? '');
      element.disabled = Object.hasOwn(element.attributes, 'disabled');
      stack.at(-1).append(element);
      if (!['meta', 'link', 'br', 'input', 'hr', 'img'].includes(tag)) stack.push(element);
    }
  }
  const root = new Element('document'); parse(html, root);
  const document = {
    hidden: false, getElementById: id => ids.get(id) || null,
    createElement: tag => new Element(tag), addEventListener: root.addEventListener.bind(root),
  };
  const context = vm.createContext({
    ...engine, document, window: {}, performance: { now: () => clock },
    // Stable normal-mode seed; all gameplay still goes through user controls.
    Date: class extends Date { static now() { return 1791374400000; } },
    matchMedia: () => ({ matches: false }), requestAnimationFrame: cb => frames.push(cb),
    drawScene() { metrics.sceneDraws++; }, drawPortrait() { metrics.portraitDraws++; },
    localStorage: {
      getItem(key) { if (blockedStorage) throw new Error('denied'); return values.get(key) || null; },
      setItem(key, value) { if (blockedStorage) throw new Error('denied'); values.set(key, value); },
    },
  });
  vm.runInContext(source + '\n globalThis.app = { start, update, openGarage, deploy, get game(){return game}, get meta(){return meta}, get cards(){return cards} };', context, { filename: 'app.js' });
  return {
    ...context.app, app: context.app, document, metrics, get: id => ids.get(id),
    flush() { while (tasks.length) tasks.shift()(); },
    key(key, target = root) { return root.dispatch('keydown', { key, target, repeat: false }); },
    visibility(hidden) { document.hidden = hidden; root.dispatch('visibilitychange'); },
    saved() { return JSON.parse(values.get('neon-lastline-v1')); },
    frame(time) { assert.ok(time >= clock, 'animation time must be monotonic'); clock = time; const callback = frames.shift(); assert.equal(typeof callback, 'function'); callback(time); assert.equal(frames.length, 1, 'one animation loop stays scheduled'); },
  };
}

function buyFirstGarageUpgrade(ui) {
  const rows = ui.get('garageRows').children;
  assert.ok(rows.length > 0);
  rows[0].querySelector('button').click();
  ui.flush();
}

function finish(ui, status = 'lost', reward = 10) {
  ui.app.game.state.status = status;
  ui.app.game.state.reward = reward;
  ui.app.update();
}

test('intro has all five labeled unit buttons disabled until a run starts', () => {
  const ui = launch();
  assert.equal(ui.app.game, null);
  assert.equal(ui.app.cards.length, 5);
  for (const { b, u } of ui.app.cards) { assert.equal(b.disabled, true); assert.ok(b.getAttribute('aria-label').includes(u.name)); }
  assert.equal(ui.get('pause').disabled, true);
  ui.app.start();
  assert.equal(ui.app.game.state.status, 'playing');
  assert.equal(ui.get('overlay').children.length, 0);
  assert.ok(ui.app.cards.every(({ b }) => !b.disabled));
});

test('keyboard deployment updates resource/cooldown and is disabled behind dialogs', () => {
  const ui = launch(); ui.app.start();
  const before = ui.app.game.state.resource;
  ui.key('1');
  assert.equal(ui.app.game.state.resource, before - engine.UNITS.brawler.cost);
  assert.equal(ui.app.cards[0].b.disabled, true);
  ui.get('help').click();
  ui.key('2');
  assert.equal(ui.app.game.state.stats.deployed, 1);
  ui.get('closeModal').click(); ui.flush();
  assert.equal(ui.app.game.state.status, 'playing');
});

test('closing a manual from a user-paused game preserves the user pause', () => {
  const ui = launch(); ui.app.start(); ui.get('pause').click();
  ui.get('help').click(); ui.get('closeModal').click(); ui.flush();
  assert.equal(ui.app.game.state.status, 'paused');
});

test('switching tabs pauses the game and returning never auto-resumes it', () => {
  const ui = launch(); ui.app.start(); ui.visibility(true);
  assert.equal(ui.app.game.state.status, 'paused');
  ui.visibility(false); assert.equal(ui.app.game.state.status, 'paused');
});

test('purchasing while playing resumes the run only after final garage dismissal', () => {
  const ui = launch({ saved: { scrap: 200 } }); ui.app.start(); ui.app.openGarage();
  assert.equal(ui.app.game.state.status, 'paused');
  buyFirstGarageUpgrade(ui);
  assert.equal(ui.get('modal').open, true);
  assert.equal(ui.app.game.state.status, 'paused');
  ui.get('closeModal').click(); ui.flush();
  assert.equal(ui.app.game.state.status, 'playing');
});

test('garage purchases made during a run survive reward settlement without a refund', () => {
  const ui = launch({ saved: { scrap: 200 } }); ui.app.start();
  const initialMaxHp = ui.app.game.state.bus.maxHp;
  ui.app.openGarage(); buyFirstGarageUpgrade(ui);
  assert.equal(ui.app.meta.garage.hull, 1);
  assert.equal(ui.app.meta.scrap, 140);
  assert.equal(ui.app.game.state.bus.maxHp, initialMaxHp, 'garage takes effect next run only');
  ui.get('closeModal').click(); ui.flush();
  finish(ui, 'lost', 10);
  assert.equal(ui.app.meta.garage.hull, 1, 'settlement must not restore stale pre-purchase garage');
  assert.equal(ui.app.meta.scrap, 150, 'purchase remains deducted and run reward is added once');
  assert.equal(ui.saved().garage.hull, 1);
  assert.equal(ui.saved().scrap, 150);
  ui.app.update(); ui.app.update();
  assert.equal(ui.app.meta.scrap, 150, 'repeated renders cannot claim rewards twice');
});

test('daily replay uses base capability even when local garage is fully upgraded', () => {
  const ui = launch({ saved: { garage: { hull: 5, generator: 5, training: 5 } } });
  ui.app.start('daily');
  assert.equal(ui.app.game.mode, 'daily');
  assert.equal(ui.app.game.state.bus.maxHp, 520);
  assert.equal(ui.app.game.state.regen, 6.4);
  finish(ui);
  ui.get('overlay').querySelector('button').click();
  assert.equal(ui.app.game.mode, 'daily');
});

test('blocked local storage leaves game playable and explains unsaved progress', () => {
  const ui = launch({ blockedStorage: true });
  assert.ok(ui.get('toast').textContent.includes('限制儲存'));
  ui.app.start(); ui.key('1'); finish(ui);
  assert.equal(ui.app.meta.runs, 1);
  assert.ok(ui.get('toast').textContent.includes('限制儲存'));
});

test('accessible deployment labels reflect current discounted energy costs', () => {
  const ui = launch(); ui.app.start();
  ui.app.game.state.status = 'upgrade';
  ui.app.game.state.upgradeChoices = [engine.UPGRADES.find(u => u.id === 'rations')];
  ui.app.update(); ui.get('overlay').querySelector('.upgrade').click();
  for (const { b, u } of ui.app.cards) {
    const currentCost = ui.app.game.unitCost(u.id);
    assert.equal(b.querySelector('.cost').textContent, '⚡ ' + currentCost);
    assert.ok(b.getAttribute('aria-label').includes(`${currentCost}能量`), `${u.id} accessible label must match its real cost`);
  }
});

test('Space on focused native buttons preserves default activation rather than pausing', () => {
  const ui = launch(); ui.app.start();
  const event = ui.key(' ', ui.get('garage'));
  assert.equal(event.defaultPrevented, undefined);
  assert.equal(ui.app.game.state.status, 'playing');
});

test('garage dialog has an accessible title', () => {
  const ui = launch(); ui.app.openGarage();
  const dialog = ui.get('modal');
  assert.ok(dialog.getAttribute('aria-label') || dialog.getAttribute('aria-labelledby'));
});

test('abandon cancellation preserves paused run; confirmation discards only the run', () => {
  const ui = launch({ saved: { scrap: 200 } }); ui.app.start(); ui.key('1'); ui.get('pause').click();
  const abandon = () => ui.get('overlay').querySelectorAll('button')[1].click();
  abandon(); ui.get('closeModal').click(); ui.flush();
  assert.equal(ui.app.game.state.status, 'paused');
  assert.equal(ui.app.game.state.stats.deployed, 1);
  abandon(); ui.get('modalBody').querySelector('button').click(); ui.flush();
  assert.equal(ui.app.game, null);
  assert.equal(ui.app.meta.scrap, 200);
  assert.equal(ui.app.meta.runs, 0);
  assert.equal(ui.get('modal').open, false);
  assert.ok(ui.get('introActions'));
});

test('settled-run purchases are retained and applied only to the next normal run', () => {
  const ui = launch({ saved: { scrap: 200 } }); ui.app.start(); finish(ui, 'lost', 10);
  ui.app.openGarage(); buyFirstGarageUpgrade(ui);
  assert.equal(ui.app.meta.scrap, 150);
  assert.equal(ui.app.game.state.bus.maxHp, 520);
  ui.get('closeModal').click(); ui.flush();
  ui.get('overlay').querySelector('button').click();
  assert.equal(ui.app.game.state.bus.maxHp, 565);
  assert.equal(ui.app.meta.scrap, 150);
  assert.equal(ui.app.meta.runs, 1);
});

test('garage cannot buy unavailable upgrades or spend scrap below zero', () => {
  const ui = launch({ saved: { scrap: 59 } }); ui.app.openGarage();
  for (const button of ui.get('garageRows').querySelectorAll('button')) {
    assert.equal(button.disabled, true); button.click();
  }
  assert.equal(ui.app.meta.scrap, 59);
  assert.equal(ui.app.meta.garage.hull, 0);
});

test('legal UI clicks and animation frames complete all stages, choices, boss and settlement', () => {
  const ui = launch();
  ui.get('introActions').querySelector('button').click();
  let now = 1000, supplies = 0, checkpoints = 0;
  for (let frame = 0; frame < 15000 && !ui.app.game.state.claimed; frame++) {
    const game = ui.app.game, state = game.state;
    if (state.status === 'upgrade') {
      const order = ['hotwire', 'rations', 'sharp', 'rapid', 'armor', 'repair', 'mobilize', 'battery', 'scavenge'];
      const choice = order.find(id => state.upgradeChoices.some(u => u.id === id));
      const index = state.upgradeChoices.findIndex(u => u.id === choice);
      const options = ui.get('overlay').querySelectorAll('.upgrade');
      // The engine may reach a new state before the throttled DOM refresh.
      if (options.length === 3) { options[index].click(); supplies++; }
    } else if (state.status === 'stageComplete') {
      const next = ui.get('overlay').querySelectorAll('button').find(b => b.textContent.startsWith('前往下一站'));
      if (next) { assert.equal(ui.get('pause').disabled, true); next.click(); checkpoints++; }
    } else if (state.status === 'playing') {
      const count = type => state.allies.filter(u => u.type === type).length;
      const desired = count('shield') < 2 ? 'shield' : count('ranger') < 3 ? 'ranger' : count('medic') < 1 ? 'medic' : count('bomber') < 2 ? 'bomber' : count('brawler') < 2 ? 'brawler' : 'ranger';
      const card = ui.app.cards.find(({ u }) => u.id === desired);
      if (!card.b.disabled) card.b.click();
    }
    ui.frame(now += 100);
  }
  assert.equal(ui.app.game.state.status, 'won');
  assert.equal(supplies, 8);
  assert.equal(checkpoints, 2);
  assert.equal(ui.app.game.state.stats.wavesCleared, 9);
  assert.equal(ui.app.game.state.bossDefeated, true);
  assert.equal(ui.app.game.state.claimed, true);
  assert.equal(ui.app.meta.runs, 1);
  assert.equal(ui.app.meta.wins, 1);
  assert.ok(ui.saved().achievements.includes('survivor'));
  assert.ok(ui.saved().scrap > 300);
  assert.equal(ui.get('overlay').querySelectorAll('button').length, 2);
  for (const { b } of ui.app.cards) assert.equal(b.disabled, true);
});


test('render and DOM budgets are throttled while simulation receives every animation frame', () => {
  const ui = launch(); ui.app.start();
  Object.assign(ui.metrics, { sceneDraws: 0, portraitDraws: 0, uiUpdates: 0 });
  for (let frame = 1; frame <= 120; frame++) ui.frame(1000 + frame * 1000 / 120);
  assert.ok(Math.abs(ui.app.game.state.time - 1) < 1 / 60 + 1e-9, '120 Hz rendering keeps one second of simulation');
  assert.ok(ui.metrics.sceneDraws >= 24 && ui.metrics.sceneDraws <= 31, `scene paints: ${ui.metrics.sceneDraws}`);
  assert.ok(ui.metrics.uiUpdates >= 7 && ui.metrics.uiUpdates <= 9, `DOM refreshes: ${ui.metrics.uiUpdates}`);
  assert.ok(ui.metrics.portraitDraws >= 15 && ui.metrics.portraitDraws <= 25, `five-portrait paints: ${ui.metrics.portraitDraws}`);
});
