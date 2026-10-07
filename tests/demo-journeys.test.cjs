const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDemoJourneys } = require('../server/demo-journeys.cjs');

const mo = { id: 'mo', role: 'mo' };
const volunteer = { id: 'vol-priya', role: 'volunteer' };
const incident = (patch = {}) => ({ id: 'I-1', status: 'open', assignee: 'vol-priya', assistance: { state: 'accepted' }, ...patch });

test('Mo can start a fake journey only for an accepted or arrived unresolved assignment', () => {
  let time = 1000;
  const journeys = createDemoJourneys({ now: () => time });
  assert.throws(() => journeys.start(volunteer, incident()), e => e.status === 403);
  assert.throws(() => journeys.start(mo, incident({ status: 'resolved' })), e => e.status === 409);
  assert.throws(() => journeys.start(mo, incident({ assistance: { state: 'looking' } })), e => e.status === 409);
  assert.throws(() => journeys.start(mo, incident({ assignee: null })), e => e.status === 409);
  const started = journeys.start(mo, incident());
  assert.deepEqual(started, { demo: true,
    startPosition: { latitude: -37.7958, longitude: 144.9612 },
    position: { latitude: -37.7958, longitude: 144.9612 },
    destination: { latitude: -37.7992, longitude: 144.962 }, progress: 0 });
  time += 45_000;
  assert.equal(journeys.project(incident()).progress, 0.5);
  const arrived = incident({ assistance: { state: 'arrived' } });
  assert.equal(journeys.start(mo, arrived).progress, 0);
});

test('progress clamps at zero and one and movement always uses fictional coordinates', () => {
  let time = 20_000;
  const journeys = createDemoJourneys({ now: () => time });
  const realGpsA = incident({ assistance: { state: 'accepted', destination: { latitude: 1, longitude: 2 } } });
  journeys.start(mo, realGpsA);
  time -= 30_000;
  const beforeStart = journeys.project(realGpsA);
  assert.equal(beforeStart.progress, 0);
  assert.deepEqual(beforeStart.position, { latitude: -37.7958, longitude: 144.9612 });
  time += 150_000;
  const complete = journeys.project(incident({ assistance: { state: 'arrived', destination: { latitude: 70, longitude: 80 } } }));
  assert.equal(complete.progress, 1);
  assert.deepEqual(complete.position, { latitude: -37.7992, longitude: 144.962 });
  assert.deepEqual(complete.destination, { latitude: -37.7992, longitude: 144.962 });
});

test('project hides stopped, unassigned, reassigned, resolved, or cancelled journeys', () => {
  let time = 1000;
  const journeys = createDemoJourneys({ now: () => time });
  const current = incident();
  journeys.start(mo, current);
  assert.equal(journeys.project(incident({ assignee: 'vol-alex' })), null);
  assert.equal(journeys.project(current), null); // reassignment clears the old demo journey

  journeys.start(mo, current);
  assert.equal(journeys.project(incident({ status: 'resolved' })), null);
  journeys.start(mo, current);
  assert.equal(journeys.project(incident({ assistance: { state: 'cancelled' } })), null);
  journeys.start(mo, current);
  assert.equal(journeys.project(incident({ assistance: { state: 'completed' } })), null);
  journeys.start(mo, current);
  assert.throws(() => journeys.stop(volunteer, 'I-1'), e => e.status === 403);
  journeys.stop(mo, 'I-1');
  assert.equal(journeys.project(current), null);
});

test('journeys are instance-local and do not modify workflow data or invoke inference', () => {
  let time = 1000, inferenceCalls = 0;
  const workflow = { incidents: [incident()], reports: [{ id: 'R-1', text: 'unchanged' }] };
  const before = JSON.stringify(workflow);
  const first = createDemoJourneys({ now: () => time });
  const second = createDemoJourneys({ now: () => time });
  first.start(mo, workflow.incidents[0]);
  assert.ok(first.project(workflow.incidents[0]));
  assert.equal(second.project(workflow.incidents[0]), null);
  time += 10_000;
  first.project(workflow.incidents[0]);
  assert.equal(JSON.stringify(workflow), before);
  assert.equal(inferenceCalls, 0);
});
