const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const context = vm.createContext({});
  context.window = context;
  for (const file of ['data/fixtures.js', 'src/js/services/analysis.js', 'src/js/domain/incidents.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  return { service: context.RiversideIncidents, context };
}
const report = (overrides = {}) => ({ volunteerId: 'vol-priya', zone: 'zone-b', text: 'Fictional spill near water tent', immediateConcern: false, ...overrides });
const mo = { id: 'mo', role: 'mo' };
const priya = { id: 'vol-priya', role: 'volunteer' };

test('acknowledgement and escalation never resolve; explicit resolution records actor/time', async () => {
  const { service } = setup();
  const item = await service.submitReport(report());
  assert.equal(service.act(item.id, 'acknowledge', mo).status, 'open');
  const escalated = service.act(item.id, 'escalate', priya);
  assert.equal(escalated.status, 'escalated');
  assert.equal(escalated.resolvedAt, null);
  const resolved = service.act(item.id, 'resolve', priya);
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolvedBy.id, priya.id);
  assert.ok(Number.isFinite(Date.parse(resolved.resolvedAt)));
  assert.equal(resolved.history.length, 4);
  assert.throws(() => service.act(item.id, 'escalate', mo), /already confirmed resolved/);
});

test('another volunteer and an unknown actor cannot resolve somebody else’s report', async () => {
  const { service } = setup();
  const item = await service.submitReport(report());
  assert.throws(() => service.act(item.id, 'resolve', { id: 'vol-alex', role: 'volunteer' }), /cannot change/);
  assert.throws(() => service.act(item.id, 'resolve', { id: 'stranger', role: 'mo' }), /cannot change/);
  assert.throws(() => service.act(item.id, 'acknowledge', priya), /Only Mo/);
  assert.equal(service.getState().incidents[0].status, 'open');
});

test('analysis failure retains the source and urgent signal for Mo', async () => {
  const { service, context } = setup();
  context.RiversideAI.analyse = async () => { throw new Error('Provider unavailable'); };
  const item = await service.submitReport(report({ immediateConcern: true }));
  assert.equal(item.analysis.state, 'failed');
  assert.equal(item.status, 'open');
  assert.equal(item.attention, 'urgent');
  assert.equal(service.getState().reports[0].text, report().text);
  assert.equal(service.act(item.id, 'resolve', mo).status, 'resolved');
});

test('report is visible while analysis waits; late analysis cannot reopen a resolved incident', async () => {
  const { service, context } = setup();
  let release;
  context.RiversideAI.analyse = () => new Promise(resolve => { release = resolve; });
  const pending = service.submitReport(report());
  const item = service.getState().incidents[0];
  assert.equal(item.analysis.state, 'pending');
  service.act(item.id, 'resolve', mo);
  release({ mode: 'stub', linkTo: null });
  assert.equal((await pending).status, 'resolved');
  assert.equal(service.getState().incidents[0].resolvedBy.id, 'mo');
});

test('concurrent and duplicate reports keep separate sources until grouping is implemented', async () => {
  const { service } = setup();
  const items = await Promise.all([service.submitReport(report()), service.submitReport(report())]);
  assert.notEqual(items[0].id, items[1].id);
  assert.equal(service.getState().reports.length, 2);
  assert.equal(service.getState().incidents.length, 2);
  const copy = service.getState();
  copy.incidents[0].status = 'resolved';
  assert.equal(service.getState().incidents[0].status, 'open');
});

test('invalid input never creates an incident', async () => {
  const { service } = setup();
  for (const input of [report({ text: '   ' }), report({ zone: 'unknown' }), report({ volunteerId: 'unknown' }), report({ text: 'x'.repeat(2001) })]) {
    await assert.rejects(service.submitReport(input));
  }
  assert.equal(service.getState().reports.length, 0);
});

test('unvalidated real AI output cannot silently resolve or re-route a report', async () => {
  const { service, context } = setup();
  context.RiversideAI.analyse = async () => ({ mode: 'real', status: 'resolved', zone: 'zone-c', linkTo: 'I-999' });
  const item = await service.submitReport(report({ immediateConcern: true }));
  assert.equal(item.analysis.state, 'failed');
  assert.equal(item.status, 'open');
  assert.equal(item.zone, 'zone-b');
  assert.equal(item.attention, 'urgent');
});
