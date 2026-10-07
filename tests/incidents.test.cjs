const { test } = require('node:test');
const assert = require('node:assert/strict');
const createIncidents = require('../src/js/domain/incidents.js');
const data = require('../data/fixtures.js');
function setup(overrides = {}, initial = {}) {
  const ai = { classify: async () => { throw new Error('Offline'); }, summarise: async () => { throw new Error('Offline'); }, ...overrides };
  return { service: createIncidents(data, () => ai, initial), ai };
}
const report = (overrides = {}) => ({ volunteerId: 'vol-priya', zone: 'zone-b', text: 'Fictional spill near water tent', immediateConcern: false, ...overrides });
const mo = { id: 'mo', role: 'mo' };
const priya = { id: 'vol-priya', role: 'volunteer' };

test('acknowledgement and escalation never resolve; explicit resolution records actor/time', async () => {
  const { service } = setup();
  const item = await service.submitReport(report());
  assert.equal(service.act(item.id, 'acknowledge', mo).status, 'open');
  const escalated = service.act(item.id, 'escalate', priya);
  assert.equal(escalated.status, 'escalated'); assert.equal(escalated.resolvedAt, null);
  const resolved = service.act(item.id, 'resolve', priya);
  assert.equal(resolved.status, 'resolved'); assert.equal(resolved.resolvedBy.id, priya.id);
  assert.ok(Number.isFinite(Date.parse(resolved.resolvedAt)));
  assert.equal(resolved.history.length, 4);
  assert.throws(() => service.act(item.id, 'escalate', mo), /already confirmed resolved/);
  await service.whenIdle();
});

test('other volunteers and unknown actors cannot resolve somebody else’s report', async () => {
  const { service } = setup(); const item = await service.submitReport(report());
  assert.throws(() => service.act(item.id, 'resolve', { id: 'vol-alex', role: 'volunteer' }), /cannot change/);
  assert.throws(() => service.act(item.id, 'resolve', { id: 'stranger', role: 'mo' }), /cannot change/);
  assert.throws(() => service.act(item.id, 'acknowledge', priya), /Only Mo/);
  assert.equal(service.getState().incidents[0].status, 'open'); await service.whenIdle();
});

test('independent analysis failure retains the source and urgency for Mo', async () => {
  const { service } = setup({ summarise: async () => ({ summary: 'A fictional spill was reported.' }) });
  const item = await service.submitReport(report({ immediateConcern: true })); await service.whenIdle();
  const stored = service.getState().incidents[0];
  assert.equal(stored.analysis.jev.state, 'failed'); assert.equal(stored.analysis.luna.state, 'complete');
  assert.equal(stored.status, 'open'); assert.equal(stored.attention, 'urgent');
  assert.equal(service.getState().reports[0].text, report().text);
  assert.equal(service.act(item.id, 'resolve', mo).status, 'resolved');
});

test('report returns while both calls wait; late analysis cannot reopen human resolution', async () => {
  let releaseJev, releaseLuna;
  const { service } = setup({ classify: () => new Promise(resolve => { releaseJev = resolve; }), summarise: () => new Promise(resolve => { releaseLuna = resolve; }) });
  const item = await service.submitReport(report({ immediateConcern: true }));
  assert.equal(item.analysis.jev.state, 'pending'); assert.equal(item.analysis.luna.state, 'pending');
  service.act(item.id, 'resolve', mo);
  releaseJev({ category: 'hazard', urgency: 'routine' }); releaseLuna({ summary: 'A spill was reported.' });
  await service.whenIdle(); const stored = service.getState().incidents[0];
  assert.equal(stored.status, 'resolved'); assert.equal(stored.resolvedBy.id, 'mo'); assert.equal(stored.attention, 'urgent');
  assert.equal(stored.analysis.jev.state, 'complete');
});

test('concurrent duplicate reports retain independent sources and immutable copies', async () => {
  const { service } = setup(); const items = await Promise.all([service.submitReport(report()), service.submitReport(report())]);
  assert.notEqual(items[0].id, items[1].id); assert.equal(service.getState().reports.length, 2);
  const copy = service.getState(); copy.incidents[0].status = 'resolved';
  assert.equal(service.getState().incidents[0].status, 'open'); await service.whenIdle();
});

test('invalid input never creates an incident', async () => {
  const { service } = setup();
  for (const input of [report({ text: '   ' }), report({ zone: 'unknown' }), report({ volunteerId: 'unknown' }), report({ text: 'x'.repeat(2001) })]) await assert.rejects(service.submitReport(input));
  assert.equal(service.getState().reports.length, 0);
});

test('malformed provider output cannot resolve, re-route or add action fields', async () => {
  const { service } = setup({ classify: async () => ({ category: 'hazard', urgency: 'routine', status: 'resolved', zone: 'zone-c' }), summarise: async () => ({ summary: 'Report', status: 'resolved' }) });
  await service.submitReport(report({ immediateConcern: true })); await service.whenIdle(); const item = service.getState().incidents[0];
  assert.equal(item.analysis.jev.state, 'failed'); assert.equal(item.analysis.luna.state, 'failed');
  assert.equal(item.status, 'open'); assert.equal(item.zone, 'zone-b'); assert.equal(item.attention, 'urgent'); assert.equal(item.assignee, null);
});

test('reporter category stays original; validated AI can only promote attention', async () => {
  const { service } = setup({ classify: async () => ({ category: 'crowding', urgency: 'urgent' }), summarise: async () => ({ summary: 'Possible crowding reported.' }) });
  await service.submitReport(report({ category: 'other' })); await service.whenIdle();
  assert.equal(service.getState().reports[0].category, 'other');
  const incident = service.getState().incidents[0];
  assert.equal(incident.category, 'crowding'); assert.equal(incident.attention, 'urgent'); assert.equal(incident.status, 'open');
});

test('crowd-pressure rule applies before model calls; Mo can report', async () => {
  const { service } = setup();
  const item = await service.submitReport({ reporter: mo, zone: 'zone-a', text: 'Crowd pressure at the exit' });
  assert.equal(item.attention, 'urgent'); assert.equal(service.getState().reports[0].reporter.role, 'mo'); await service.whenIdle();
});

test('restart marks interrupted results failed without replaying paid requests', () => {
  const { service } = setup({}, { incidents: [{ id: 'I-1', analysis: { jev: { state: 'pending' }, luna: { state: 'complete', suggestion: { summary: 'Kept' } } } }] });
  assert.equal(service.getState().incidents[0].analysis.jev.state, 'failed');
  assert.equal(service.getState().incidents[0].analysis.luna.state, 'complete');
});
