const { test } = require('node:test');
const assert = require('node:assert/strict');
const createIncidents = require('../src/js/domain/incidents.js');
const roster = require('../src/js/domain/roster.js');
const data = require('../data/fixtures.js');

// Fixed festival times (Melbourne, AEDT = UTC+11). Noor and Jordan work only 18:00–24:00.
const NOON = new Date('2026-10-08T01:00:00Z');
const EVENING = new Date('2026-10-08T08:00:00Z');
const offline = { classify: async () => { throw new Error('Offline'); }, summarise: async () => { throw new Error('Offline'); } };
function setup({ at = NOON, ai = offline } = {}) {
  const clock = { time: at };
  const service = createIncidents(data, () => ai, {}, () => {}, { now: () => clock.time });
  return { service, clock };
}
const mo = { id: 'mo', role: 'mo' };
const vol = id => ({ id, role: 'volunteer' });
const guest = { id: 'guest-0000', role: 'public' };
const report = (overrides = {}) => ({ reporter: guest, zone: 'zone-b', category: 'hazard', text: 'Fictional spill near the water tent', ...overrides });
const incident = (id, zone, assignee) => ({ id, zone, assignee, status: 'open', reportIds: [] });

test('off-shift, busy and coverage-breaking volunteers are never eligible; same zone comes first', () => {
  assert.ok(!roster.eligibleVolunteers(incident('I-1', 'zone-a'), data, [], NOON).includes('vol-noor'));
  assert.ok(roster.eligibleVolunteers(incident('I-1', 'zone-a'), data, [], EVENING).includes('vol-noor'));
  const eligible = roster.eligibleVolunteers(incident('I-1', 'zone-a'), data, [], NOON);
  assert.deepEqual(eligible.slice(0, 3), ['vol-priya', 'vol-mateo', 'vol-hana']);
  // Lena and Omar are busy in Zone A, leaving Sam as Zone C's only available volunteer.
  const busy = [incident('I-2', 'zone-a', 'vol-lena'), incident('I-3', 'zone-a', 'vol-omar')];
  const next = roster.eligibleVolunteers(incident('I-4', 'zone-b'), data, busy, NOON);
  assert.ok(!next.includes('vol-lena') && !next.includes('vol-omar'));
  assert.ok(!next.includes('vol-sam'), 'moving Sam would leave Zone C below its minimum of 1');
  assert.ok(roster.eligibleVolunteers(incident('I-4', 'zone-c'), data, busy, NOON).includes('vol-sam'), 'Sam can still take work in his own zone');
  assert.deepEqual(roster.coverageImpact('vol-sam', 'zone-b', data, busy, NOON), { zone: 'zone-c', before: 1, after: 0, minimum: 1, belowMinimum: true });
});

test('a routine report is offered at once to an in-zone volunteer; unclear reports also go to Mo', async () => {
  const { service } = setup();
  const routine = await service.submitReport(report());
  assert.equal(routine.assignee, 'vol-alex');
  assert.equal(routine.assignment.state, 'offered');
  assert.equal(routine.attention, 'routine');
  assert.deepEqual(routine.history.map(item => item.action), ['reported', 'offered']);
  const unclear = await service.submitReport(report({ category: 'other', text: 'Something odd near the tent' }));
  assert.equal(unclear.attention, 'review');
  assert.equal(unclear.assignee, 'vol-kai', 'Alex is busy, so the next Zone B volunteer is offered');
  const urgent = await service.submitReport(report({ immediateConcern: true }));
  assert.equal(urgent.attention, 'urgent');
  assert.ok(urgent.assignee, 'urgent reports alert Mo and are still offered to a volunteer');
  await service.whenIdle();
});

test('accept, arrive and propose keep the incident open; only explicit confirmation resolves', async () => {
  const { service } = setup();
  const item = await service.submitReport(report());
  assert.throws(() => service.act(item.id, 'resolve', vol('vol-alex')), /until the offer is accepted/);
  assert.throws(() => service.act(item.id, 'arrived', vol('vol-alex')), /Accept the offer first/);
  assert.throws(() => service.act(item.id, 'accept', vol('vol-kai')), /cannot change/);
  assert.throws(() => service.act(item.id, 'accept', mo), /Only the volunteer/);
  assert.equal(service.act(item.id, 'accept', vol('vol-alex')).assignment.state, 'accepted');
  assert.equal(service.act(item.id, 'arrived', vol('vol-alex')).assignment.state, 'arrived');
  const proposed = service.act(item.id, 'propose_resolution', vol('vol-alex'));
  assert.equal(proposed.status, 'open');
  assert.equal(proposed.assignment.state, 'proposed');
  assert.equal(proposed.attention, 'review');
  const resolved = service.act(item.id, 'resolve', vol('vol-alex'));
  assert.equal(resolved.status, 'resolved');
  assert.deepEqual(resolved.resolvedBy, vol('vol-alex'));
  assert.ok(roster.eligibleVolunteers(incident('I-9', 'zone-b'), data, service.getState().incidents, NOON).includes('vol-alex'), 'a resolved incident frees the volunteer');
  await service.whenIdle();
});

test('a decline alerts Mo and offers the next volunteer; nobody left means urgent for Mo', async () => {
  const { service } = setup();
  const item = await service.submitReport(report());
  const after = service.act(item.id, 'decline', vol('vol-alex'));
  assert.equal(after.assignee, 'vol-kai');
  assert.equal(after.attention, 'review');
  assert.deepEqual(after.declinedBy, ['vol-alex']);
  let current = after;
  const offered = ['vol-alex'];
  while (current.assignee) { offered.push(current.assignee); current = service.act(item.id, 'decline', vol(current.assignee)); }
  assert.equal(new Set(offered).size, offered.length, 'nobody is offered the same incident twice');
  assert.equal(offered.length, 10, 'all ten on-shift volunteers were tried at noon');
  assert.equal(current.status, 'open');
  assert.equal(current.attention, 'urgent');
  assert.equal(current.history.at(-1).action, 'no_eligible_volunteer');
  await service.whenIdle();
});

test('Mo can offer and reassign within the rules, and may override coverage with a recorded warning', async () => {
  const { service } = setup();
  const item = await service.submitReport(report({ zone: 'zone-c' }));
  assert.equal(item.assignee, 'vol-sam');
  assert.throws(() => service.act(item.id, 'reassign', vol('vol-sam'), { volunteerId: 'vol-lena' }), /Only Mo/);
  assert.throws(() => service.act(item.id, 'offer', mo, { volunteerId: 'vol-lena' }), /Use reassign/);
  assert.throws(() => service.act(item.id, 'reassign', mo, { volunteerId: 'vol-jordan' }), /not on shift/);
  assert.throws(() => service.act(item.id, 'reassign', mo, { volunteerId: 'nobody' }), /Choose a volunteer/);
  const moved = service.act(item.id, 'reassign', mo, { volunteerId: 'vol-lena' });
  assert.equal(moved.assignee, 'vol-lena');
  assert.equal(moved.assignment.state, 'offered');
  assert.equal(moved.history.at(-1).details.previous, 'vol-sam');
  // Send Lena and Omar to Zone A so Sam is Zone C's last available volunteer, then Mo sends Sam there too.
  const other = await service.submitReport(report({ zone: 'zone-a', text: 'Fictional bin fire, already out' }));
  service.act(other.id, 'reassign', mo, { volunteerId: 'vol-omar' });
  assert.throws(() => service.act(other.id, 'reassign', mo, { volunteerId: 'vol-lena' }), /already on I-/);
  service.act(item.id, 'resolve', mo);
  const third = await service.submitReport(report({ zone: 'zone-a', text: 'Fictional lost phone' }));
  service.act(third.id, 'reassign', mo, { volunteerId: 'vol-lena' });
  const fourth = await service.submitReport(report({ zone: 'zone-a', text: 'Fictional broken fence' }));
  assert.ok(!service.overview().eligible[fourth.id].includes('vol-sam'), 'the rules would not offer Sam');
  const override = service.act(fourth.id, 'reassign', mo, { volunteerId: 'vol-sam' });
  assert.deepEqual(override.history.at(-1).details.coverage, { zone: 'zone-c', before: 1, after: 0, minimum: 1, belowMinimum: true });
  assert.equal(override.history.at(-1).details.override, true);
  await service.whenIdle();
});

test('zone counts and cluster alerts are derived from stored reports', async () => {
  const { service, clock } = setup();
  const first = await service.submitReport(report());
  let zoneB = service.overview().zones.find(zone => zone.id === 'zone-b');
  assert.deepEqual({ open: zoneB.open, unacknowledged: zoneB.unacknowledged, urgent: zoneB.urgent, resolved: zoneB.resolved }, { open: 1, unacknowledged: 1, urgent: 0, resolved: 0 });
  assert.equal(zoneB.cluster.active, false, 'one isolated routine report does not alert Mo');
  clock.time = new Date(NOON.getTime() + 9 * 60 * 1000);
  await service.submitReport(report({ text: 'Another fictional spill', immediateConcern: true }));
  zoneB = service.overview().zones.find(zone => zone.id === 'zone-b');
  assert.equal(zoneB.cluster.active, true);
  assert.equal(zoneB.urgent, 1);
  assert.equal(service.overview().zones.find(zone => zone.id === 'zone-a').cluster.active, false);
  clock.time = new Date(NOON.getTime() + 11 * 60 * 1000);
  assert.equal(service.overview().zones.find(zone => zone.id === 'zone-b').cluster.active, false, 'the first report is now older than 10 minutes');
  clock.time = new Date(NOON.getTime() + 12 * 60 * 1000);
  await service.submitReport(report({ text: 'Third fictional report' }));
  service.act(first.id, 'resolve', mo);
  zoneB = service.overview().zones.find(zone => zone.id === 'zone-b');
  assert.equal(zoneB.resolved, 1);
  assert.equal(zoneB.cluster.active, true);
  assert.equal(zoneB.coverage.minimum, 1);
  const view = service.overview();
  assert.equal(view.roster.find(item => item.id === 'vol-noor').onShift, false);
  assert.equal(view.roster.find(item => item.id === 'vol-alex').assignedTo, null, 'Alex was freed by the resolution');
  await service.whenIdle();
});

test('Jev may raise attention for unclear or failed analysis but never lowers it or changes the assignee', async () => {
  const unclear = setup({ ai: { classify: async () => ({ category: 'hazard', urgency: 'unclear' }), summarise: async () => ({ summary: 'A spill.' }) } });
  const item = await unclear.service.submitReport(report());
  await unclear.service.whenIdle();
  const stored = unclear.service.getState().incidents[0];
  assert.equal(stored.attention, 'review');
  assert.equal(stored.assignee, item.assignee);
  const failed = setup();
  await failed.service.submitReport(report());
  await failed.service.whenIdle();
  assert.equal(failed.service.getState().incidents[0].attention, 'review');
  const routine = setup({ ai: { classify: async () => ({ category: 'hazard', urgency: 'routine' }), summarise: async () => ({ summary: 'A spill.' }) } });
  await routine.service.submitReport(report({ immediateConcern: true }));
  await routine.service.whenIdle();
  assert.equal(routine.service.getState().incidents[0].attention, 'urgent');
});
