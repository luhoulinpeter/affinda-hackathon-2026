const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createVolunteerClaims } = require('../server/volunteer-claims.cjs');

function setup({ reports = [], incidents = [], presence: initialPresence } = {}) {
  let time = 1_000_000;
  const state = { reports: structuredClone(reports), incidents: structuredClone(incidents) };
  const availability = new Map(Object.entries(initialPresence || {
    'vol-priya': { id: 'vol-priya', name: 'Priya', hasAccount: true, state: 'available', eligible: true,
      position: { latitude: 0, longitude: 0, accuracy: 5, capturedAt: time } },
    'vol-alex': { id: 'vol-alex', name: 'Alex', hasAccount: true, state: 'available', eligible: true,
      position: { latitude: 0, longitude: .001, accuracy: 5, capturedAt: time } }
  }));
  const workflow = {
    getState: () => structuredClone(state),
    updateAssistance(id, update) {
      const incident = state.incidents.find(item => item.id === id);
      if (!incident) throw new Error('missing incident');
      update(incident);
    }
  };
  const assistance = {
    snapshot: () => ({ presence: [...availability.values()].map(value => ({ ...structuredClone(value),
      eligible: value.eligible && (value.expiresAt === undefined || value.expiresAt > time) })) }),
    markClaimed(id) { availability.get(id).state = 'busy'; }
  };
  const service = createVolunteerClaims({ workflow, assistance, roster: [
    { id: 'vol-priya', name: 'Priya' }, { id: 'vol-alex', name: 'Alex' }
  ], now: () => time });
  return { service, state, availability, setTime: value => { time = value; } };
}

function incident(id, changes = {}) {
  return { id, zone: 'zone-a', category: 'other', status: 'open', attention: 'review', assignee: null, reportIds: [], ...changes };
}
const priya = { id: 'vol-priya', role: 'volunteer' };
const alex = { id: 'vol-alex', role: 'volunteer' };

test('paused volunteer can claim a minimal ordinary queue item; claim creates one self-audited accepted offer without a route', () => {
  const t = setup({ incidents: [incident('I-1', { brief: 'private summary', analysis: { private: true } })],
    presence: { 'vol-priya': { id: 'vol-priya', name: 'Priya', hasAccount: true, state: 'paused', eligible: false },
      'vol-alex': { id: 'vol-alex', name: 'Alex', hasAccount: true, state: 'paused', eligible: false } } });
  const queue = t.service.list(priya);
  assert.deepEqual(queue, [{ id: 'I-1', zone: 'zone-a', category: 'other', attention: 'review', status: 'open' }]);
  assert.equal(JSON.stringify(queue).includes('private summary'), false);
  assert.equal(JSON.stringify(queue).includes('latitude'), false);
  assert.throws(() => t.service.claim(priya, 'I-1'), error => error.status === 409);
  t.availability.get('vol-priya').state = 'available';
  t.availability.get('vol-priya').eligible = true;
  t.availability.get('vol-priya').position = { latitude: 0, longitude: 0, accuracy: 5, capturedAt: 1_000_000 };
  assert.equal(t.service.claim(priya, 'I-1').ok, true);
  const result = t.state.incidents[0];
  assert.equal(result.assignee, priya.id);
  assert.equal(result.assistance.state, 'accepted');
  assert.equal(result.assistance.matchingMode, 'self');
  assert.equal(result.assistance.destination, undefined);
  assert.equal(result.assistance.initialDistanceMetres, undefined);
  assert.equal(result.assistance.offers.length, 1);
  assert.equal(result.assistance.offers[0].status, 'accepted');
  assert.equal(result.assistance.offers[0].volunteerId, priya.id);
  assert.equal(result.assistance.events.length, 1);
  assert.deepEqual({ action: result.assistance.events[0].action, actorId: result.assistance.events[0].actorId,
    volunteerId: result.assistance.events[0].volunteerId }, { action: 'claimed', actorId: priya.id, volunteerId: priya.id });
  assert.equal(t.availability.get(priya.id).state, 'busy');
});

test('GPS destination records only the claimant start fix and initial straight-line distance', () => {
  const t = setup({ incidents: [incident('I-1', { assistance: { state: 'looking', requestId: 'req-1',
    destination: { latitude: 0, longitude: 0, accuracy: 5, capturedAt: 1_000_000 }, offers: [], events: [] } })] });
  t.service.claim(priya, 'I-1');
  const assistance = t.state.incidents[0].assistance;
  assert.equal(assistance.initialDistanceMetres, 0);
  assert.deepEqual(assistance.offers[0].startPosition, { latitude: 0, longitude: 0, accuracy: 5, capturedAt: 1_000_000 });
  assert.equal(assistance.offers[0].distanceMetres, 0);
});

test('busy volunteer sees the minimal new queue but cannot claim; concurrent claimers leave one assignment', () => {
  const t = setup({ incidents: [incident('I-1')], presence: {
    'vol-priya': { id: 'vol-priya', name: 'Priya', hasAccount: true, state: 'busy', eligible: true },
    'vol-alex': { id: 'vol-alex', name: 'Alex', hasAccount: true, state: 'available', eligible: true,
      position: { latitude: 0, longitude: .001, accuracy: 5, capturedAt: 1_000_000 } }
  } });
  assert.equal(t.service.list(priya).length, 1);
  assert.throws(() => t.service.claim(priya, 'I-1'), error => error.status === 409);
  t.service.claim(alex, 'I-1');
  assert.throws(() => t.service.claim(priya, 'I-1'), error => error.status === 409);
  const result = t.state.incidents[0];
  assert.equal(result.assignee, alex.id);
  assert.equal(result.assistance.offers.length, 1);
  assert.equal(result.assistance.events.length, 1);
});

test('sensitive and safety-review-pending incidents require Mo; completed review permits ordinary work', () => {
  const t = setup({ incidents: [
    incident('I-1', { sensitive: true }), incident('I-2', { sensitivityReview: 'pending' }),
    incident('I-3', { sensitivityReview: 'unavailable' }), incident('I-4', { sensitivityReview: 'complete' })
  ] });
  assert.deepEqual(t.service.list(priya).map(item => item.id), ['I-4']);
  for (const id of ['I-1', 'I-2', 'I-3']) assert.throws(() => t.service.claim(priya, id), error => error.status === 403);
  assert.equal(t.service.claim(priya, 'I-4').ok, true);
});

test('urgency and immediate-concern do not imply the explicit sensitivity review flag', () => {
  const t = setup({ incidents: [incident('I-1', { attention: 'urgent', reportIds: ['R-1'] }),
    incident('I-2', { reportIds: ['R-2'] })], reports: [
      { id: 'R-1', reporter: { id: 'guest-1', role: 'public' }, immediateConcern: false },
      { id: 'R-2', reporter: { id: 'guest-2', role: 'public' }, immediateConcern: true }
    ] });
  assert.deepEqual(t.service.list(priya).map(item => item.id), ['I-1', 'I-2']);
  assert.equal(t.service.claim(priya, 'I-1').ok, true);
  assert.equal(t.service.claim(alex, 'I-2').ok, true);
});

test('cancelled or completed assistance requests are not returned or claimable', () => {
  const t = setup({ incidents: [
    incident('I-1', { assistance: { state: 'cancelled', offers: [], events: [] } }),
    incident('I-2', { assistance: { state: 'completed', offers: [], events: [] } })
  ] });
  assert.deepEqual(t.service.list(priya), []);
  assert.throws(() => t.service.claim(priya, 'I-1'), error => error.status === 409);
  assert.throws(() => t.service.claim(priya, 'I-2'), error => error.status === 409);
});

test('volunteer cannot claim own report, expired presence, assigned or previously offered work', () => {
  const t = setup({ incidents: [
    incident('I-1', { reportIds: ['R-1'] }),
    incident('I-2', { assignee: priya.id }),
    incident('I-3', { assistance: { state: 'offered', offers: [{ volunteerId: priya.id, status: 'declined' }], events: [] } }),
    incident('I-4', { status: 'escalated' }),
    incident('I-5', { status: 'resolved' })
  ], reports: [{ id: 'R-1', reporter: { id: priya.id, role: 'volunteer' }, immediateConcern: false }] });
  assert.deepEqual(t.service.list(priya).map(item => item.id), []);
  assert.throws(() => t.service.claim(priya, 'I-1'), error => error.status === 403);
  assert.throws(() => t.service.claim(priya, 'I-2'), error => error.status === 409);
  assert.throws(() => t.service.claim(priya, 'I-3'), error => error.status === 409);
  assert.throws(() => t.service.claim(priya, 'I-4'), error => error.status === 409);
  assert.throws(() => t.service.claim(priya, 'I-5'), error => error.status === 409);
  t.availability.get(priya.id).expiresAt = 1_000_001;
  t.setTime(1_000_002);
  assert.throws(() => t.service.claim(priya, 'I-3'), error => error.status === 409);
});

test('an assignment or pending offer on another active incident reserves the volunteer', () => {
  for (const reserved of [
    incident('I-2', { assignee: priya.id }),
    incident('I-2', { assistance: { state: 'offered', offers: [{ volunteerId: priya.id, status: 'pending' }], events: [] } })
  ]) {
    const t = setup({ incidents: [incident('I-1'), reserved] });
    assert.equal(t.service.list(priya).some(item => item.id === 'I-1'), true);
    assert.throws(() => t.service.claim(priya, 'I-1'), error => error.status === 409);
    assert.equal(t.state.incidents[0].assignee, null);
  }
});

test('only a rostered authenticated volunteer can list or claim', () => {
  const t = setup({ incidents: [incident('I-1')] });
  assert.throws(() => t.service.list({ id: 'mo', role: 'mo' }), error => error.status === 403);
  assert.throws(() => t.service.claim({ id: 'stranger', role: 'volunteer' }, 'I-1'), error => error.status === 403);
  t.availability.get(priya.id).hasAccount = false;
  assert.throws(() => t.service.claim(priya, 'I-1'), error => error.status === 403);
});
