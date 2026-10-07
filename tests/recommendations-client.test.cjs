const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function fixture({ role = 'mo', enabled = true } = {}) {
  let identity = 0;
  const listeners = new Map(), identityListeners = [], events = [];
  const incident = { id: 'I-1', status: 'open', category: 'medical', sensitive: false, assignee: null, assistance: { offers: [] } };
  const state = { incidents: [incident], presence: [
    { id: 'vol-a', state: 'available', eligible: true, fresh: true },
    { id: 'vol-b', state: 'available', eligible: true, fresh: false }
  ] };
  const calls = { recommend: [], offer: [], sensitivity: [] };
  let resolveRecommendation, rejectRecommendation, pending = false;
  const api = {
    getSession: () => ({ user: { id: role === 'mo' ? 'mo' : 'vol-a', role }, ai: { luna: { enabled } } }),
    getState: () => state,
    getIdentityVersion: () => identity,
    isIdentityChanging: () => false,
    onIdentityChange: callback => identityListeners.push(callback),
    async recommendVolunteer(id) {
      calls.recommend.push(id); pending = true;
      return new Promise((resolve, reject) => { resolveRecommendation = resolve; rejectRecommendation = reject; });
    },
    async offerVolunteer(...args) { calls.offer.push(args); },
    async setSensitivity(...args) { calls.sensitivity.push(args); }
  };
  const document = {
    addEventListener: (type, callback) => listeners.set(type, callback),
    dispatchEvent: event => events.push(event.type),
    querySelector: () => ({ textContent: '' })
  };
  class CustomEvent { constructor(type) { this.type = type; } }
  const window = { RiversideAPI: api };
  const context = { window, document, CustomEvent };
  vm.runInNewContext(fs.readFileSync('src/js/ui/recommendations.js', 'utf8'), context);
  const ui = window.RiversideRecommendations;
  function click(id) {
    const button = { dataset: { recommendIncident: id }, disabled: false };
    return listeners.get('click')({ target: { closest: () => button } });
  }
  return { api, ui, state, calls, events, click, pending: () => pending,
    resolve(value) { pending = false; resolveRecommendation(value); },
    reject(error) { pending = false; rejectRecommendation(error); },
    changeIdentity() { identity++; identityListeners.forEach(callback => callback()); },
    setRole(value) { role = value; }, setEnabled(value) { enabled = value; } };
}

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const result = { incidentId: 'I-1', advisory: true, recommendations: [{ id: 'vol-a', name: 'Alex', reasons: ['Roster zone matches.'] }] };

test('recommendations are fetched only after explicit click and never send an offer', async () => {
  const t = fixture();
  assert.match(t.ui.html(t.state.incidents[0]), /Suggest with AI/);
  assert.equal(t.calls.recommend.length, 0);
  const action = t.click('I-1');
  await flush();
  assert.deepEqual(t.calls.recommend, ['I-1']);
  assert.deepEqual(t.calls.offer, []);
  assert.match(t.ui.html(t.state.incidents[0]), /Preparing suggestions/);
  t.resolve(result); await action;
  assert.match(t.ui.html(t.state.incidents[0]), /Alex/);
  assert.match(t.ui.html(t.state.incidents[0]), /Advisory order only/);
  assert.deepEqual(t.calls.offer, []);
});

test('rapid duplicate clicks while a recommendation is pending make one provider request', async () => {
  const t = fixture();
  const one = t.click('I-1'), two = t.click('I-1');
  await flush();
  assert.deepEqual(t.calls.recommend, ['I-1']);
  t.resolve(result); await Promise.all([one, two]);
  assert.deepEqual(t.calls.recommend, ['I-1']);
});

test('disabled free provider leaves manual assignment available and makes no call', async () => {
  const t = fixture({ enabled: false });
  const html = t.ui.html(t.state.incidents[0]);
  assert.match(html, /<button[^>]*data-recommend-incident="I-1"[^>]*disabled>Suggest with AI<\/button>/);
  assert.match(html, /Manual assignment remains available/);
  assert.deepEqual(t.calls.recommend, []);
});

test('results arriving after identity change are discarded', async () => {
  const t = fixture();
  const action = t.click('I-1'); await flush();
  t.changeIdentity(); t.resolve(result); await action;
  const html = t.ui.html(t.state.incidents[0]);
  assert.doesNotMatch(html, /Alex|Roster zone matches/);
  assert.match(html, /Suggest with AI/);
});

test('availability changes invalidate a cached recommendation', async () => {
  const t = fixture();
  const action = t.click('I-1'); await flush(); t.resolve(result); await action;
  assert.match(t.ui.html(t.state.incidents[0]), /Alex/);
  t.state.presence[0].state = 'busy';
  assert.doesNotMatch(t.ui.html(t.state.incidents[0]), /Alex/);
  assert.match(t.ui.html(t.state.incidents[0]), /Availability changed/);
});

test('non-Mo roles cannot render or invoke recommendation controls', async () => {
  const t = fixture({ role: 'volunteer' });
  assert.equal(t.ui.html(t.state.incidents[0]), '');
  await t.click('I-1');
  assert.deepEqual(t.calls.recommend, []);
});

test('legacy privacy review is shown to Mo with an approve-ordinary control', () => {
  const t = fixture();
  t.state.incidents[0].sensitivityReview = 'legacy';
  const html = t.ui.html(t.state.incidents[0]);
  assert.match(html, /Older AI result has no privacy decision · Mo review required/);
  assert.match(html, /data-private-value="false">Approve ordinary volunteer selection/);
  assert.deepEqual(t.calls.sensitivity, []);
});

test('moving volunteer fixes and incident changes invalidate cached suggestions without automatic inference', async () => {
  for (const change of [
    t => { t.state.presence[0].position = { latitude: -37.8, longitude: 144.96 }; },
    t => { t.state.incidents[0].location = { latitude: -37.79, longitude: 144.97 }; },
    t => { t.state.incidents[0].attention = 'urgent'; }
  ]) {
    const t = fixture();
    const action = t.click('I-1'); await flush(); t.resolve(result); await action;
    assert.match(t.ui.html(t.state.incidents[0]), /Alex/);
    change(t);
    assert.doesNotMatch(t.ui.html(t.state.incidents[0]), /Alex/);
    assert.match(t.ui.html(t.state.incidents[0]), /Request a fresh suggestion/);
    assert.deepEqual(t.calls.recommend, ['I-1']);
  }
});
