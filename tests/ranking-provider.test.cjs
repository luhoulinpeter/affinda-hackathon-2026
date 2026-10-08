const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createProviders, DEFAULT_MODEL } = require('../src/js/services/analysis.js');

const env = { RIVERSIDE_OPENROUTER_ENABLED: 'true', OPENROUTER_API_KEY: 'placeholder-secret' };
const proof = () => ({ id: 'rank-test', freeOnlyConfirmed: true, liveTestApproved: true, maxCalls: 5,
  verifiedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() });
const input = { incident: { category: 'medical', urgency: 'unclear', zone: 'zone-a', report: 'private text', latitude: 1 },
  candidates: [{ id: 'vol-a', sameZone: true, fresh: true, distanceBand: 'near', latitude: 10, longitude: 20, sessionToken: 'private-token' },
    { id: 'vol-b', sameZone: false, fresh: false, distanceBand: 'far', password: 'secret' }] };
const response = rankedIds => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ rankedIds }) } }] }), { status: 200 });
const setup = (fetchImpl, overrides = {}) => createProviders({ env, verification: { openrouter: proof() }, reserveCall: () => true, fetchImpl, ...overrides });

test('assignment ranking uses gated free OpenRouter and sends only whitelisted coarse fields', async () => {
  let captured, reserved;
  const provider = createProviders({ env, verification: { openrouter: proof() }, reserveCall: name => { reserved = name; return true; }, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    captured = JSON.parse(options.body);
    return response(['vol-b', 'vol-a']);
  } });
  assert.deepEqual(await provider.rankAssignment(input), { rankedIds: ['vol-b', 'vol-a'] });
  assert.equal(reserved, 'openrouter');
  assert.equal(captured.model, DEFAULT_MODEL);
  assert.deepEqual(captured.provider, { require_parameters: true, allow_fallbacks: false, sort: 'latency', max_price: { prompt: 0, completion: 0, request: 0 } });
  assert.equal(captured.reasoning.enabled, false);
  assert.equal(captured.response_format.json_schema.strict, true);
  assert.deepEqual(JSON.parse(captured.messages[1].content), { incident: { category: 'medical', urgency: 'unclear', zone: 'zone-a' }, candidates: [
    { id: 'vol-a', sameZone: true, fresh: true, distanceBand: 'near' }, { id: 'vol-b', sameZone: false, fresh: false, distanceBand: 'far' }
  ] });
  assert.ok(!JSON.stringify(captured).includes('latitude'));
  assert.ok(!JSON.stringify(captured).includes('longitude'));
  assert.ok(!JSON.stringify(captured).includes('private text'));
  assert.ok(!JSON.stringify(captured).includes('private-token'));
  assert.ok(!JSON.stringify(captured).includes('placeholder-secret'));
});

test('ranking fails closed before transport without free-call approval or allowance', async () => {
  let calls = 0;
  for (const options of [
    { env: { ...env, RIVERSIDE_OPENROUTER_ENABLED: 'false' } },
    { env: { ...env, OPENROUTER_API_KEY: '' } },
    { env: { ...env, OPENROUTER_MODEL: 'paid/model' } },
    { verification: { openrouter: { ...proof(), freeOnlyConfirmed: false } } },
    { verification: { openrouter: { ...proof(), expiresAt: new Date(0).toISOString() } } },
    { remainingCalls: () => 0 },
    { reserveCall: () => false }
  ]) {
    const provider = setup(async () => { calls++; return response(['vol-a', 'vol-b']); }, options);
    await assert.rejects(provider.rankAssignment(input));
  }
  assert.equal(calls, 0);
});

test('rejects malformed ranking input and roster larger than twenty before provider call', async () => {
  let calls = 0;
  const provider = setup(async () => { calls++; return response(['vol-a', 'vol-b']); });
  for (const bad of [
    { ...input, incident: { ...input.incident, latitude: undefined, category: 'unknown' } },
    { ...input, candidates: [{ id: 'vol-a', sameZone: true, fresh: true, distanceBand: 'precise-gps' }] },
    { ...input, candidates: [{ id: 'vol-a', sameZone: true, fresh: true, distanceBand: 'near' }, { id: 'vol-a', sameZone: false, fresh: true, distanceBand: 'far' }] },
    { ...input, candidates: Array.from({ length: 21 }, (_, index) => ({ id: `vol-${index}`, sameZone: false, fresh: true, distanceBand: 'near' })) }
  ]) await assert.rejects(provider.rankAssignment(bad));
  assert.equal(calls, 0);
});

test('rejects unknown, duplicate, or incomplete returned ID orders', async () => {
  for (const rankedIds of [['vol-x', 'vol-a'], ['vol-a', 'vol-a'], ['vol-a']]) {
    const provider = setup(async () => response(rankedIds));
    await assert.rejects(provider.rankAssignment(input), /Invalid assignment ranking response/);
  }
});

test('configured custom zone IDs remain eligible for coarse ranking; unknown IDs fail before transport', async () => {
  let calls=0;
  const provider=setup(async()=>{calls++;return response(['vol-a','vol-b'])},{getZones:()=>[{id:'zone-custom'}]});
  assert.deepEqual(await provider.rankAssignment({...input,incident:{...input.incident,zone:'zone-custom'}}),{rankedIds:['vol-a','vol-b']});
  await assert.rejects(provider.rankAssignment({...input,incident:{...input.incident,zone:'zone-unknown'}}));assert.equal(calls,1);
});
