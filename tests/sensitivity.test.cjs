const { test } = require('node:test');
const assert = require('node:assert/strict');
const createIncidents = require('../src/js/domain/incidents.js');
const data = require('../data/fixtures.js');
const validation = require('../server/ai/validation.cjs');

const mo = { id: 'mo', role: 'mo' };
const reporter = { volunteerId: 'vol-priya', zone: 'zone-b', text: 'Fictional report', immediateConcern: false };
function setup(classify = async () => ({ category: 'other', urgency: 'routine', sensitivity: 'ordinary' })) {
  const ai = { classify, summarise: async () => ({ summary: 'A report was submitted.' }) };
  return createIncidents(data, () => ai);
}

test('reporter sensitivity flag is kept in source and cannot be cleared by ordinary AI', async () => {
  const service = setup();
  const item = await service.submitReport({ ...reporter, sensitive: true });
  assert.equal(service.getState().reports[0].sensitive, true);
  assert.equal(item.sensitive, true);
  assert.equal(item.sensitivityReview, 'pending');
  await service.whenIdle();
  const final = service.getState().incidents[0];
  assert.equal(final.sensitive, true);
  assert.equal(final.sensitivityReview, 'complete');
});

test('AI can flag sensitive or unclear reports; ordinary reports remain claimable', async () => {
  for (const choice of ['sensitive', 'unclear', 'ordinary']) {
    const service = setup(async () => ({ category: 'other', urgency: 'routine', sensitivity: choice }));
    const item = await service.submitReport(reporter);
    await service.whenIdle();
    const final = service.getState().incidents[0];
    assert.equal(final.sensitive, choice !== 'ordinary');
    assert.equal(final.sensitivityReview, 'complete');
    assert.equal(item.sensitivityReview, 'pending');
  }
});

test('legacy two-field classification remains readable without claiming ordinary', async () => {
  assert.deepEqual(validation.classification({ category: 'other', urgency: 'routine' }, data.categories.map(x => x.id)), { category: 'other', urgency: 'routine' });
  const service = setup(async () => ({ category: 'other', urgency: 'routine' }));
  await service.submitReport(reporter);
  await service.whenIdle();
  const final = service.getState().incidents[0];
  assert.equal(final.sensitivityReview, 'legacy');
  assert.equal(final.sensitive, false);
});

test('invalid sensitivity output fails closed as unavailable', async () => {
  for (const sensitivity of ['maybe', null, true]) {
    const service = setup(async () => ({ category: 'other', urgency: 'routine', sensitivity }));
    await service.submitReport(reporter);
    await service.whenIdle();
    const final = service.getState().incidents[0];
    assert.equal(final.analysis.jev.state, 'failed');
    assert.equal(final.sensitivityReview, 'unavailable');
  }
  assert.throws(() => validation.classification({ category: 'other', urgency: 'routine', sensitivity: 'maybe' }, data.categories.map(x => x.id)));
  assert.throws(() => validation.classification({ category: 'other', urgency: 'routine', sensitivity: 'ordinary', extra: true }, data.categories.map(x => x.id)));
});

test('Mo override is reasoned, permission checked, and wins over a late AI result', async () => {
  let release;
  const service = setup(() => new Promise(resolve => { release = resolve; }));
  const item = await service.submitReport({ ...reporter, sensitive: true });
  assert.throws(() => service.setSensitivity(item.id, false, { id: 'vol-priya', role: 'volunteer' }, 'review'), /Only Mo/);
  assert.throws(() => service.setSensitivity(item.id, false, mo, ''), /review reason/);
  const reviewed = service.setSensitivity(item.id, false, mo, 'Mo reviewed the report and found no identifying details.');
  assert.equal(reviewed.sensitive, false);
  assert.equal(reviewed.sensitivityReview, 'reviewed');
  assert.equal(reviewed.history.at(-1).reason, 'Mo reviewed the report and found no identifying details.');
  release({ category: 'other', urgency: 'routine', sensitivity: 'sensitive' });
  await service.whenIdle();
  const final = service.getState().incidents[0];
  assert.equal(final.sensitive, false);
  assert.equal(final.sensitivityReview, 'reviewed');
});

test('invalid reporter sensitivity input is rejected before a report is stored', async () => {
  const service = setup();
  await assert.rejects(service.submitReport({ ...reporter, sensitive: 'true' }), /true or false/);
  assert.equal(service.getState().reports.length, 0);
});
