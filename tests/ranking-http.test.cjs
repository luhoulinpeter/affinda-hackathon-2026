const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAssignmentRecommendations } = require('../server/assignment-recommendations.cjs');

const roster = [
  { id: 'vol-a', name: 'Alex (fictional)', zone: 'zone-a' },
  { id: 'vol-b', name: 'Sam (fictional)', zone: 'zone-b' },
  { id: 'vol-c', name: 'Priya (fictional)', zone: 'zone-a' }
];
const makeIncident = (patch = {}) => ({ id: 'I-1', status: 'open', zone: 'zone-a', category: 'medical', analysis: { jev: { suggestion: { urgency: 'unclear' } } }, reportIds: ['R-1'], assignee: null, assistance: { state: 'looking', offers: [], destination: { latitude: 0, longitude: 0 } }, ...patch });
const makeWorld = ({ incidents = [makeIncident()], reports = [{ id: 'R-1', reporter: { id: 'guest-1' } }], presence } = {}) => {
  const state = { incidents, reports };
  const livePresence = presence || [
    { id: 'vol-a', name: 'Alex (fictional)', state: 'available', eligible: true, hasAccount: true, fresh: true, position: { latitude: 0.001, longitude: 0 } },
    { id: 'vol-b', name: 'Sam (fictional)', state: 'available', eligible: true, hasAccount: true, fresh: false, position: { latitude: 0.01, longitude: 0 } },
    { id: 'vol-c', name: 'Priya (fictional)', state: 'available', eligible: true, hasAccount: true, fresh: true, position: { latitude: 0.002, longitude: 0 } }
  ];
  return { state, livePresence, workflow: { getState: () => structuredClone(state) }, assistance: { snapshot: () => ({ presence: structuredClone(livePresence) }) } };
};
const actor = { id: 'mo', role: 'mo' };
const provider = rankedIds => ({ rankAssignment: async input => ({ rankedIds, input }) });

test('Mo recommendation ranks only offer-eligible candidates and returns server-derived reasons', async () => {
  const world = makeWorld();
  const service = createAssignmentRecommendations({ ...world, providers: provider(['vol-c', 'vol-a', 'vol-b']), roster, now: () => Date.now() });
  const result = await service.recommend(actor, 'I-1');
  assert.deepEqual(result, { incidentId: 'I-1', advisory: true, recommendations: [
    { id: 'vol-c', name: 'Priya (fictional)', reasons: ['Volunteer roster zone matches the incident zone.', 'Volunteer location is fresh.', 'Approximate distance band: near.'] },
    { id: 'vol-a', name: 'Alex (fictional)', reasons: ['Volunteer roster zone matches the incident zone.', 'Volunteer location is fresh.', 'Approximate distance band: near.'] },
    { id: 'vol-b', name: 'Sam (fictional)', reasons: ['Volunteer roster zone differs from the incident zone.', 'Volunteer location is older but still eligible.', 'Approximate distance band: far.'] }
  ] });
  assert.deepEqual(world.state.incidents[0].assistance.offers, []);
});

test('candidate filtering matches manual offer constraints, including reporters, attempted, missing account, busy and stale', async () => {
  const world = makeWorld({ incidents: [makeIncident(), { id: 'I-2', status: 'open', assignee: 'vol-b', assistance: { state: 'accepted', offers: [] } }],
    reports: [{ id: 'R-1', reporter: { id: 'vol-a' } }, { id: 'R-2', reporter: { id: 'guest' } }] });
  world.livePresence.find(p => p.id === 'vol-b').hasAccount = false;
  world.livePresence.find(p => p.id === 'vol-c').eligible = false;
  let input;
  const service = createAssignmentRecommendations({ ...world, providers: { rankAssignment: async value => { input = value; return { rankedIds: ['vol-a'] }; } }, roster });
  const result = await service.recommend(actor, 'I-1');
  assert.deepEqual(result.recommendations, []); // all three are excluded by a manual-offer constraint
  assert.equal(input, undefined); // no model call when no valid candidates exist
});

test('returns no recommendations without an AI call when no candidate can receive an offer', async () => {
  const world = makeWorld({ presence: [] });
  let calls = 0;
  const service = createAssignmentRecommendations({ ...world, providers: { rankAssignment: async () => { calls++; } }, roster });
  assert.deepEqual(await service.recommend(actor, 'I-1'), { incidentId: 'I-1', recommendations: [], advisory: true });
  assert.equal(calls, 0);
});

test('ordinary report GPS informs ranking without creating an assistance request or exposing coordinates', async () => {
  const world = makeWorld({ incidents: [makeIncident({ assistance: undefined, location: { latitude: 0, longitude: 0 } })] });
  let captured;
  const service = createAssignmentRecommendations({ ...world, providers: { rankAssignment: async input => {
    captured = input; return { rankedIds: ['vol-a', 'vol-c', 'vol-b'] };
  } }, roster });
  const before = JSON.stringify(world.state);
  const result = await service.recommend(actor, 'I-1');
  assert.deepEqual(captured.candidates.map(c => c.distanceBand), ['near', 'far', 'near']);
  assert.ok(!JSON.stringify(captured).includes('latitude'));
  assert.ok(!JSON.stringify(captured).includes('longitude'));
  assert.match(result.recommendations[0].reasons.join(' '), /distance band: near/);
  assert.equal(JSON.stringify(world.state), before);
});

test('rejects non-Mo access, missing incidents, and incidents with an assignment or pending offer', async () => {
  const service = createAssignmentRecommendations({ ...makeWorld(), providers: provider(['vol-a', 'vol-b', 'vol-c']), roster });
  await assert.rejects(service.recommend({ id: 'vol-a', role: 'volunteer' }, 'I-1'), e => e.status === 403);
  await assert.rejects(service.recommend(actor, 'I-404'), e => e.status === 404);
  for (const incident of [makeIncident({ assignee: 'vol-a' }), makeIncident({ assistance: { state: 'offered', offers: [{ volunteerId: 'vol-a', status: 'pending' }] } }), makeIncident({ status: 'resolved' })]) {
    const world = makeWorld({ incidents: [incident] });
    const guarded = createAssignmentRecommendations({ ...world, providers: provider([]), roster });
    await assert.rejects(guarded.recommend(actor, 'I-1'), e => e.status === 409);
  }
});

test('ranking works when Jev analysis failed using original report category and deterministic urgency', async () => {
  const noAnalysis = makeWorld({ incidents: [makeIncident({ category: 'unclassified', attention: 'urgent', analysis: { jev: { state: 'failed' } } })],
    reports: [{ id: 'R-1', category: 'hazard', reporter: { id: 'guest-1' } }] });
  let captured;
  const service = createAssignmentRecommendations({ ...noAnalysis, providers: { rankAssignment: async input => { captured = input; return { rankedIds: ['vol-a', 'vol-b', 'vol-c'] }; } }, roster });
  await service.recommend(actor, 'I-1');
  assert.deepEqual(captured.incident, { category: 'hazard', urgency: 'urgent', zone: 'zone-a' });
});

test('rejects invalid provider candidate IDs', async () => {

  for (const rankedIds of [['vol-a', 'vol-a'], ['vol-a', 'not-eligible', 'vol-c'], ['vol-a']]) {
    const world = makeWorld();
    const invalid = createAssignmentRecommendations({ ...world, providers: provider(rankedIds), roster });
    await assert.rejects(invalid.recommend(actor, 'I-1'), e => e.status === 502);
  }
});

test('rejects changed session or eligibility while ranking is in flight', async () => {
  const session = makeWorld();
  let current = true;
  const sessionService = createAssignmentRecommendations({ ...session, providers: { rankAssignment: async () => { current = false; return { rankedIds: ['vol-a', 'vol-b', 'vol-c'] }; } }, roster });
  await assert.rejects(sessionService.recommend(actor, 'I-1', { isCurrent: () => current }), e => e.status === 403);

  const changed = makeWorld();
  const availabilityService = createAssignmentRecommendations({ ...changed, providers: { rankAssignment: async () => { changed.livePresence.find(p => p.id === 'vol-b').state = 'busy'; return { rankedIds: ['vol-a', 'vol-b', 'vol-c'] }; } }, roster });
  await assert.rejects(availabilityService.recommend(actor, 'I-1'), e => e.status === 409);
});

test('provider gate failures surface without mutating the incident', async () => {
  const world = makeWorld(), before = JSON.stringify(world.state);
  const unavailable = createAssignmentRecommendations({ ...world, providers: { rankAssignment: async () => { throw new Error('Verified call allowance exhausted'); } }, roster });
  await assert.rejects(unavailable.recommend(actor, 'I-1'), /allowance exhausted/);
  assert.equal(JSON.stringify(world.state), before);
});
