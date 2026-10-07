const { test } = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/fixtures.js');
const createIncidents = require('../src/js/domain/incidents.js');
const { createAssistance } = require('../server/assistance.cjs');
const { createVolunteerClaims } = require('../server/volunteer-claims.cjs');
const { mapData } = require('../server/maps.cjs');

const mo = { id: 'mo', role: 'mo' };
const priya = { id: 'vol-priya', role: 'volunteer' };
const position = now => ({ latitude: -37.796, longitude: 144.961, accuracy: 5, capturedAt: now });

function setup({ initial = {}, classify = async () => ({ category: 'other', urgency: 'routine' }), now = 1_000_000 } = {}) {
  const workflow = createIncidents(data, () => ({ classify, summarise: async () => ({ summary: 'Simulated summary' }) }), initial);
  const assistance = createAssistance({ workflow, volunteers: data.volunteers, hasAccount: id => id === priya.id,
    sessionAlive: token => token === 'priya-session', now: () => now });
  assistance.setPresence(priya, { available: true, position: position(now) }, 'priya-session');
  const claims = createVolunteerClaims({ workflow, assistance, roster: data.volunteers, now: () => now });
  return { workflow, assistance, claims };
}

test('two-field Jev output remains readable but is held until Mo review; explicit ordinary review allows a claim', async () => {
  const t = setup({ classify: async () => ({ category: 'other', urgency: 'routine' }) });
  const item = await t.workflow.submitReport({ zone: 'zone-a', text: 'Fictional legacy-classified report',
    reporter: { id: 'guest-legacy', role: 'public' } });
  await t.workflow.whenIdle();
  let state = t.workflow.getState();
  assert.equal(state.incidents[0].sensitivityReview, 'legacy');
  assert.deepEqual(state.incidents[0].analysis.jev.suggestion, { category: 'other', urgency: 'routine' });
  assert.equal(t.claims.list(priya).some(incident => incident.id === item.id), false);
  assert.throws(() => t.claims.claim(priya, item.id), error => error.status === 403);

  t.workflow.setSensitivity(item.id, false, mo, 'Mo reviewed the legacy report and found it ordinary.');
  assert.equal(t.workflow.getState().incidents[0].sensitivityReview, 'reviewed');
  assert.equal(t.claims.list(priya).some(incident => incident.id === item.id), true);
  assert.equal(t.claims.claim(priya, item.id).ok, true);
});

test('legacy GPS request receives no automatic offer, while Mo can personally offer and the volunteer can accept', async () => {
  const t = setup({ classify: async () => ({ category: 'other', urgency: 'routine' }) });
  const item = await t.workflow.submitReport({ zone: 'zone-a', text: 'Fictional report with requester GPS',
    reporter: { id: 'guest-legacy', role: 'public' }, assistance: { requestId: 'legacy-gps-1', state: 'looking',
      destination: position(1_000_000), offers: [], events: [] } });
  await t.workflow.whenIdle();
  t.assistance.tick();
  let incident = t.workflow.getState().incidents[0];
  assert.equal(incident.sensitivityReview, 'legacy');
  assert.equal(incident.assistance.offers.length, 0);
  assert.equal(incident.assistance.state, 'looking');
  assert.equal(t.claims.list(priya).some(candidate => candidate.id === item.id), false);

  t.assistance.offer(mo, item.id, priya.id);
  incident = t.workflow.getState().incidents[0];
  const offer = incident.assistance.offers.find(candidate => candidate.status === 'pending');
  assert.ok(offer);
  assert.equal(incident.assistance.events.at(-1).actorId, mo.id);
  t.assistance.respond(priya, item.id, offer.id, 'accept');
  incident = t.workflow.getState().incidents[0];
  assert.equal(incident.assignee, priya.id);
  assert.equal(incident.assistance.state, 'accepted');
  assert.equal(incident.assistance.offers[0].status, 'accepted');
});

test('persisted completed two-field Jev records migrate to legacy and stay off volunteer map and queue', () => {
  const oldState = {
    sequence: 1,
    reports: [{ id: 'R-1', reporter: { id: 'guest-old', role: 'public' }, category: 'other', zone: 'zone-a', text: 'Old fictional report' }],
    incidents: [{ id: 'I-1', reportIds: ['R-1'], zone: 'zone-a', category: 'other', status: 'open', attention: 'review',
      assignee: null, sensitive: false, analysis: { jev: { state: 'complete', suggestion: { category: 'other', urgency: 'routine' } } }, history: [] }]
  };
  const t = setup({ initial: oldState });
  const state = t.workflow.getState();
  assert.equal(state.incidents[0].sensitivityReview, 'legacy');
  assert.equal(t.claims.list(priya).length, 0);
  const volunteers = t.assistance.snapshot(mo).presence;
  const volunteerMap = mapData(priya, state, volunteers, { enabled: false, stations: [] }, 1_000_000);
  const moMap = mapData(mo, state, volunteers, { enabled: false, stations: [] }, 1_000_000);
  assert.equal(volunteerMap.incidents.some(item => item.id === 'I-1'), false);
  assert.equal(moMap.incidents.some(item => item.id === 'I-1'), true);
  assert.throws(() => t.claims.claim(priya, 'I-1'), error => error.status === 403);
});

test('an existing pending automatic offer is withdrawn if its sensitivity state becomes legacy', async () => {
  const t = setup({ classify: async () => ({ category: 'other', urgency: 'routine', sensitivity: 'ordinary' }) });
  const item = await t.workflow.submitReport({ zone: 'zone-a', text: 'Fictional report that starts ordinary',
    reporter: { id: 'guest-legacy', role: 'public' }, assistance: { requestId: 'legacy-withdraw-1', state: 'looking',
      destination: position(1_000_000), offers: [], events: [] } });
  await t.workflow.whenIdle();
  t.assistance.tick();
  let incident = t.workflow.getState().incidents[0];
  const pending = incident.assistance.offers.find(offer => offer.status === 'pending');
  assert.ok(pending);

  t.workflow.updateAssistance(item.id, current => { current.sensitivityReview = 'legacy'; });
  t.assistance.tick();
  incident = t.workflow.getState().incidents[0];
  assert.equal(incident.assistance.offers[0].status, 'withdrawn');
  assert.equal(incident.assistance.state, 'looking');
  assert.equal(incident.assignee, null);
  assert.equal(incident.assistance.events.at(-1).action, 'privacy_hold');
});
