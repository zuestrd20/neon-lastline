import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as engine from '../engine.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');

export function launch({ saved = {}, blockedStorage = false, realArt = false } = {}) {
  const tasks = [], frames = [], ids = new Map(), values = new Map();
  let clock = 1000;
  const metrics = { sceneDraws: 0, portraitDraws: 0, uiUpdates: 0, textWrites: 0, elements: 0, listeners: 0, canvasCalls: 0 };
  const surfaces = [];
  values.set('neon-lastline-v1', JSON.stringify(saved));
  class Element {
    constructor(tag = 'div') {
      metrics.elements++;
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
    set textContent(value) { this._textContent = String(value); metrics.textWrites++; }
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
    getContext() { return this._context ||= makeContext(); }
    addEventListener(type, callback) { metrics.listeners++; const list = this.events.get(type) || []; list.push(callback); this.events.set(type, list); }
    dispatch(type, extra = {}) { const event = { type, target: this, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const cb of this.events.get(type) || []) cb(event); return event; }
    click() { if (!this.disabled) this.onclick?.({ target: this }); }
    showModal() { this.open = true; }
    close() { if (!this.open) return; this.open = false; tasks.push(() => this.dispatch('close')); }
  }
  function makeContext() {
    const state = { depth: 0, calls: 0 }, context = {};
    surfaces.push(state);
    function call(name, args) {
      metrics.canvasCalls++; state.calls++;
      for (const value of args) if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${name}: non-finite canvas argument`);
    }
    for (const name of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'fill', 'stroke', 'rect', 'clip', 'fillRect', 'clearRect', 'fillText', 'drawImage', 'translate', 'scale', 'rotate']) context[name] = (...args) => call(name, args);
    context.save = () => { call('save', []); state.depth++; };
    context.restore = () => { call('restore', []); if (--state.depth < 0) throw new Error('canvas restore underflow'); };
    for (const name of ['createLinearGradient', 'createRadialGradient']) context[name] = (...args) => { call(name, args); return { addColorStop(...args) { call('addColorStop', args); } }; };
    return context;
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
    querySelector: selector => root.querySelector(selector),
    createElement: tag => new Element(tag), addEventListener: root.addEventListener.bind(root),
  };
  const context = vm.createContext({
    __onUpdate: () => metrics.uiUpdates++,
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
  if (realArt) {
    const artSource = readFileSync(new URL('../art.js', import.meta.url), 'utf8').replace(/^export /gm, '');
    vm.runInContext(artSource + '\n globalThis.artAudit = () => ({ backgrounds: bgCache.size, buses: busCache.size, glows: glowCache.size, sprites: spriteCache.size, portraits: portraitCache.size, cachedBytes: [...bgCache.values(), ...busCache.values(), ...glowCache.values(), ...spriteCache.values(), ...portraitCache.values()].reduce((bytes, canvas) => bytes + canvas.width * canvas.height * 4, 0), entities: entityBuffer.length });', context, { filename: 'art.js' });
    const scene = context.drawScene, portrait = context.drawPortrait;
    context.drawScene = (...args) => { metrics.sceneDraws++; scene(...args); for (const surface of surfaces) assert.equal(surface.depth, 0, 'canvas context state leak'); };
    context.drawPortrait = (...args) => { metrics.portraitDraws++; portrait(...args); for (const surface of surfaces) assert.equal(surface.depth, 0, 'canvas context state leak'); };
  }
  vm.runInContext(source.replace('function update(){', 'function update(){globalThis.__onUpdate();') + '\n globalThis.app = { start, update, openGarage, deploy, get game(){return game}, get meta(){return meta}, get cards(){return cards} };', context, { filename: 'app.js' });
  return {
    ...context.app, app: context.app, document, metrics,
    audit() { const walk = node => 1 + node.children.reduce((n, child) => n + walk(child), 0); return { nodes: walk(root), listeners: metrics.listeners, contexts: surfaces.length, ...(context.artAudit?.() || {}) }; },
    get: id => ids.get(id),
    flush() { while (tasks.length) tasks.shift()(); },
    key(key, target = root) { return root.dispatch('keydown', { key, target, repeat: false }); },
    visibility(hidden) { document.hidden = hidden; root.dispatch('visibilitychange'); },
    saved() { return JSON.parse(values.get('neon-lastline-v1')); },
    frame(time) { assert.ok(time >= clock, 'animation time must be monotonic'); clock = time; const callback = frames.shift(); assert.equal(typeof callback, 'function'); callback(time); assert.equal(frames.length, 1, 'one animation loop stays scheduled'); },
  };
}

