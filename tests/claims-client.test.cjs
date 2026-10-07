const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/js/ui/claims.js'), 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class FakeElement {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.dataset = {}; this.disabled = false; this.className = ''; this.type = ''; this._text = ''; }
  append(...elements) { this.children.push(...elements); }
  replaceChildren(...elements) { this.children = [...elements]; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  closest(selector) { return selector === '[data-claim-incident]' && this.dataset.claimIncident ? this : null; }
}

function harness({ role = 'volunteer', presence = 'paused', eligible = false, queue = [{ id: 'I-1', zone: 'zone-a', category: 'other', status: 'open', text: 'PRIVATE REPORT BODY' }], getAvailableIncidents, claimIncident } = {}) {
  const nodes = new Map(['available-incidents', 'claim-feedback'].map(id => [id, new FakeElement()]));
  const handlers = new Map(), identityHandlers = [], subscribers = [];
  let identityVersion = 1, identityChanging = false;
  let state = { presence: [{ id: 'vol-priya', state: presence, eligible }] };
  let currentQueue = queue;
  const api = {
    getSession: () => ({ user: role ? { id: 'vol-priya', role } : null }),
    isIdentityChanging: () => identityChanging,
    getIdentityVersion: () => identityVersion,
    getState: () => state,
    getAvailableIncidents: async () => getAvailableIncidents ? getAvailableIncidents() : ({ incidents: currentQueue }),
    async claimIncident(id) {
      if (claimIncident) return claimIncident(id);
      state = { presence: [{ id: 'vol-priya', state: 'busy', eligible: true }] };
      for (const callback of subscribers) await callback();
    },
    onIdentityChange(callback) { identityHandlers.push(callback); },
    subscribe(callback) { subscribers.push(callback); }
  };
  const document = {
    querySelector(selector) { return nodes.get(selector.slice(1)); },
    createElement(tag) { return new FakeElement(tag); },
    addEventListener(name, callback) { handlers.set(name, callback); }
  };
  const window = { RiversideAPI: api, RiversideData: { zones: [{ id: 'zone-a', name: 'West Gate' }] } };
  vm.runInNewContext(source, { window, document });
  return {
    nodes, api, setState(value) { state = value; }, setQueue(value) { currentQueue = value; },
    render: () => subscribers[0](),
    async click(button) { return handlers.get('click')({ target: { closest: () => button } }); },
    changeIdentity() { identityVersion++; identityHandlers.forEach(callback => callback()); },
    beginIdentityChange() { identityChanging = true; identityVersion++; identityHandlers.forEach(callback => callback()); }
  };
}

test('paused cards are disabled, available cards enable, and busy volunteers keep seeing disabled new cards', async () => {
  const app = harness({ queue: [{ id: 'I-1', zone: 'zone-a' }, { id: 'I-2', zone: 'zone-a' }] });
  await app.render();
  let buttons = app.nodes.get('available-incidents').children.map(card => card.children[2]);
  assert.equal(buttons.length, 2);
  assert.ok(buttons.every(button => button.disabled));

  app.setState({ presence: [{ id: 'vol-priya', state: 'available', eligible: true }] });
  await app.render();
  buttons = app.nodes.get('available-incidents').children.map(card => card.children[2]);
  assert.ok(buttons.every(button => !button.disabled));

  app.setState({ presence: [{ id: 'vol-priya', state: 'busy', eligible: true }] });
  app.setQueue([{ id: 'I-3', zone: 'zone-a' }]);
  await app.render();
  buttons = app.nodes.get('available-incidents').children.map(card => card.children[2]);
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].disabled, true);
  assert.match(app.nodes.get('claim-feedback').textContent, /Finish your current assignment/);
});

test('claim happens only after an explicit click; duplicate clicks are ignored while pending', async () => {
  const pending = deferred(); let claims = 0;
  const app = harness({ presence: 'available', eligible: true, claimIncident: async () => { claims++; return pending.promise; } });
  await app.render();
  const button = app.nodes.get('available-incidents').children[0].children[2];
  assert.equal(claims, 0, 'rendering must not automatically claim a card');
  const first = app.click(button);
  await app.click(button);
  assert.equal(claims, 1);
  pending.resolve();
  await first;
});

test('late queue fetch after identity change cannot reveal old incident details or feedback', async () => {
  const pending = deferred();
  const app = harness({ getAvailableIncidents: () => pending.promise });
  const fetch = app.render();
  app.beginIdentityChange();
  pending.resolve({ incidents: [{ id: 'I-secret', zone: 'zone-a', text: 'PRIVATE OLD REPORT BODY' }] });
  await fetch;
  assert.equal(app.nodes.get('available-incidents').children.length, 0);
  assert.doesNotMatch(app.nodes.get('available-incidents').textContent, /PRIVATE OLD REPORT BODY|I-secret/);
  assert.equal(app.nodes.get('claim-feedback').textContent, '');
});

test('queue request error clears old cards and displays the current error', async () => {
  let fail = false;
  const app = harness({ getAvailableIncidents: async () => {
    if (fail) throw new Error('Queue unavailable.');
    return { incidents: [{ id: 'I-1', zone: 'zone-a' }] };
  } });
  await app.render();
  assert.equal(app.nodes.get('available-incidents').children.length, 1);
  fail = true;
  await app.render();
  assert.equal(app.nodes.get('available-incidents').children.length, 0);
  assert.equal(app.nodes.get('claim-feedback').textContent, 'Queue unavailable.');
});

test('claim cards never render incident report text', async () => {
  const app = harness({ queue: [{ id: 'I-1', zone: 'zone-a', category: 'hazard', text: 'PRIVATE REPORT BODY', brief: 'PRIVATE AI SUMMARY' }] });
  await app.render();
  const cardText = app.nodes.get('available-incidents').children.map(card => card.textContent).join(' ');
  assert.match(cardText, /I-1/);
  assert.doesNotMatch(cardText, /PRIVATE REPORT BODY|PRIVATE AI SUMMARY/);
});

test('identity change while a claim is pending suppresses stale completion feedback', async () => {
  const pending = deferred();
  const app = harness({ presence: 'available', eligible: true, claimIncident: () => pending.promise });
  await app.render();
  const button = app.nodes.get('available-incidents').children[0].children[2];
  const claim = app.click(button);
  app.beginIdentityChange();
  pending.resolve();
  await claim;
  assert.equal(app.nodes.get('claim-feedback').textContent, '');
  assert.equal(app.nodes.get('available-incidents').children.length, 0);
});

test('successful claim feedback remains visible after the refreshed busy queue renders', async () => {
  const app = harness({ presence: 'available', eligible: true });
  await app.render();
  const button = app.nodes.get('available-incidents').children[0].children[2];
  await app.click(button);
  await app.render(); // wait for the background refresh started by the click handler
  assert.match(app.nodes.get('claim-feedback').textContent, /Incident accepted/);
});
