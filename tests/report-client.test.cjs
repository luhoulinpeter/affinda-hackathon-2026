const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/js/ui/report.js'), 'utf8');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness({ gps = async () => ({ latitude: 1, longitude: 2, accuracy: 5, capturedAt: 1000 }), submitReport = async () => ({ id: 'I-1' }) } = {}) {
  const elements = new Map();
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const listeners = new Map();
    const result = {
      id, value: '', checked: false, disabled: false, textContent: '',
      classList: { values: new Set(), toggle(name, on) { on ? this.values.add(name) : this.values.delete(name); } },
      addEventListener(name, callback) { listeners.set(name, callback); },
      async dispatch(name, event = {}) { return listeners.get(name)?.({ preventDefault() {}, ...event }); },
      querySelectorAll(selector) { return selector === '[type="submit"]' ? [submitOnly, request] : []; }
    };
    elements.set(id, result);
    return result;
  }
  const submitOnly = { disabled: false }, request = { id: 'request-volunteer', disabled: false };
  const form = element('report-form');
  form.querySelectorAll = selector => selector === '[type="submit"]' ? [submitOnly, request] : [];
  const fields = {
    zone: element('zone'), category: element('category'), 'report-text': element('report-text'),
    'immediate-concern': element('immediate-concern'), 'report-feedback': element('report-feedback'),
    'report-sensitive': element('report-sensitive'), 'report-location': element('report-location')
  };
  fields.zone.value = 'zone-a'; fields.category.value = 'hazard'; fields['report-text'].value = 'Fictional report';
  let identityVersion = 1, identityChanging = false;
  const identityListeners = [];
  const calls = [];
  const api = {
    isIdentityChanging: () => identityChanging,
    getIdentityVersion: () => identityVersion,
    onIdentityChange: callback => identityListeners.push(callback),
    submitReport: async input => { calls.push(structuredClone(input)); return submitReport(input, calls.length); }
  };
  const document = { querySelector(selector) { return selector === '#report-form' ? form : fields[selector.slice(1)]; } };
  const window = { RiversideAPI: api, RiversideAssistance: { gps } };
  let uuidCount = 0;
  vm.runInNewContext(source, { window, document, crypto: { randomUUID: () => `request-${++uuidCount}` } });
  return {
    fields, form, buttons: [submitOnly, request], calls,
    submit: requestHelp => form.dispatch('submit', { submitter: requestHelp ? request : submitOnly }),
    changeIdentity() { identityVersion++; identityListeners.forEach(callback => callback()); },
    get uuidCount() { return uuidCount; }
  };
}

test('report-only submits without GPS or assistance fields and gives a distinct receipt', async () => {
  let gpsCalls = 0;
  const app = harness({ gps: async () => { gpsCalls++; throw new Error('must not request GPS'); } });
  await app.submit(false);
  assert.equal(gpsCalls, 0);
  assert.equal(app.calls.length, 1);
  assert.equal(Object.hasOwn(app.calls[0], 'position'), false);
  assert.equal(Object.hasOwn(app.calls[0], 'requestAssistance'), false);
  assert.equal(Object.hasOwn(app.calls[0], 'requestId'), false);
  assert.match(app.fields['report-feedback'].textContent, /No volunteer was requested/);
  assert.equal(app.fields['report-text'].value, '');
  assert.ok(app.buttons.every(button => !button.disabled));
});
test('a private report flag is explicit and survives submission without requesting attendance',async()=>{
  const app=harness();app.fields['report-sensitive'].checked=true;
  await app.submit(false);assert.equal(app.calls[0].sensitive,true);
  assert.equal(app.calls[0].requestAssistance,undefined);assert.equal(app.fields['report-sensitive'].checked,false);
});
test('optional report location obtains GPS without creating a volunteer request',async()=>{
  let calls=0;const app=harness({gps:async()=>{calls++;return {latitude:-37.798,longitude:144.961,accuracy:5,capturedAt:1000}}});
  app.fields['report-location'].checked=true;await app.submit(false);
  assert.equal(calls,1);assert.equal(app.calls[0].reportLocation,true);assert.equal(app.calls[0].position.latitude,-37.798);
  assert.equal(app.calls[0].requestAssistance,undefined);assert.equal(app.fields['report-location'].checked,false);
});

test('request volunteer gets one GPS fix and submits an explicit request with an ID', async () => {
  let gpsCalls = 0;
  const app = harness({ gps: async () => { gpsCalls++; return { latitude: -37, longitude: 144, accuracy: 4, capturedAt: 1000 }; } });
  await app.submit(true);
  assert.equal(gpsCalls, 1);
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].requestAssistance, true);
  assert.equal(app.calls[0].requestId, 'request-1');
  assert.deepEqual(app.calls[0].position, { latitude: -37, longitude: 144, accuracy: 4, capturedAt: 1000 });
  assert.match(app.fields['report-feedback'].textContent, /with a volunteer request/);
  assert.match(app.fields['report-feedback'].textContent, /not necessarily accepted/);
});

test('duplicate submits are ignored while request GPS is pending', async () => {
  const pending = deferred(); let gpsCalls = 0;
  const app = harness({ gps: () => { gpsCalls++; return pending.promise; } });
  const first = app.submit(true);
  await app.submit(true);
  assert.equal(gpsCalls, 1);
  assert.equal(app.calls.length, 0);
  pending.resolve({ latitude: 1, longitude: 2, accuracy: 5, capturedAt: 1000 });
  await first;
  assert.equal(app.calls.length, 1);
});

test('denied GPS preserves report text, sends nothing, and re-enables submission', async () => {
  const app = harness({ gps: async () => { throw new Error('Location access is blocked.'); } });
  await app.submit(true);
  assert.equal(app.calls.length, 0);
  assert.equal(app.fields['report-text'].value, 'Fictional report');
  assert.match(app.fields['report-feedback'].textContent, /Location access is blocked/);
  assert.ok(app.buttons.every(button => !button.disabled));
  assert.ok(app.fields['report-feedback'].classList.values.has('error'));
});

test('a network retry keeps requestId while using a newer GPS position', async () => {
  let gpsCalls = 0, submitCalls = 0;
  const app = harness({
    gps: async () => ({ latitude: 1, longitude: ++gpsCalls, accuracy: 5, capturedAt: 1000 + gpsCalls }),
    submitReport: async () => { if (++submitCalls === 1) throw new Error('Network unavailable.'); return { id: 'I-2' }; }
  });
  await app.submit(true);
  assert.equal(app.calls.length, 1);
  assert.match(app.fields['report-feedback'].textContent, /try the same button again/);
  assert.equal(app.fields['report-text'].value, 'Fictional report');
  assert.ok(app.buttons.every(button => !button.disabled));
  await app.submit(true);
  assert.equal(app.calls.length, 2);
  assert.equal(app.calls[0].requestId, app.calls[1].requestId);
  assert.notDeepEqual(app.calls[0].position, app.calls[1].position);
  assert.match(app.fields['report-feedback'].textContent, /Report I-2 received with a volunteer request/);
});

test('identity change during GPS prevents submission and suppresses stale feedback or cleanup', async () => {
  const pending = deferred();
  const app = harness({ gps: () => pending.promise });
  const submit = app.submit(true);
  assert.match(app.fields['report-feedback'].textContent, /Getting your GPS/);
  app.changeIdentity();
  assert.equal(app.fields['report-feedback'].textContent, '');
  assert.ok(app.buttons.every(button => !button.disabled));
  pending.resolve({ latitude: 1, longitude: 2, accuracy: 5, capturedAt: 1000 });
  await submit;
  assert.equal(app.calls.length, 0);
  assert.equal(app.fields['report-feedback'].textContent, '');
  assert.ok(app.buttons.every(button => !button.disabled));
});

test('report form has one handler and Q&A does not retain the removed request route', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const qa = fs.readFileSync(path.join(__dirname, '../src/js/ui/qa.js'), 'utf8');
  assert.equal((html.match(/id="report-form"/g) || []).length, 1);
  assert.match(html, /src\/js\/ui\/report\.js/);
  assert.doesNotMatch(qa, /request-volunteer|report-form/);
});
