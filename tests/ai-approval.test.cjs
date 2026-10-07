const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { approvalError } = require('../server/ai/approval.cjs');
const { createProviders } = require('../src/js/services/analysis.js');
const { createApp } = require('../server/index.cjs');
const ongoing = () => ({ id: 'preserved-id', approvalMode: 'ongoing', approvedAt: '2026-01-01T00:00:00Z',
  providerLimitsReportedByUser: true, existingCreditUseApproved: true, freeOnlyConfirmed: true, liveTestApproved: true,
  maxCalls: 20, expiresAt: '2026-01-02T00:00:00Z' });

test('explicit ongoing approval remains valid after the old expiry without claiming a verified hard stop', () => {
  for (const name of ['jev', 'openrouter']) {
    assert.equal(approvalError(name, ongoing(), Date.parse('2030-01-01')), null);
    for (const patch of [{ revoked: true }, { providerLimitsReportedByUser: false }, { approvedAt: 'invalid' },
      { approvedAt: '2031-01-01' }, { approvalMode: 'unknown' }, { id: '' }]) {
      assert.ok(approvalError(name, { ...ongoing(), ...patch }, Date.parse('2030-01-01')));
    }
  }
  assert.ok(approvalError('jev', { ...ongoing(), existingCreditUseApproved: false }));
  assert.ok(approvalError('openrouter', { ...ongoing(), freeOnlyConfirmed: false }));
  assert.ok(approvalError('openrouter', { ...ongoing(), liveTestApproved: false }));
});

test('ongoing approval keeps flags, keys, free-only routing and ranking revocation enforced', async () => {
  const env = { RIVERSIDE_OPENROUTER_ENABLED: 'true', OPENROUTER_API_KEY: 'placeholder' };
  const input = { incident: { category: 'hazard', urgency: 'routine', zone: 'zone-a' },
    candidates: [{ id: 'vol-a', sameZone: true, fresh: true, distanceBand: 'near' }] };
  let calls = 0;
  for (const patch of [{ env: { ...env, OPENROUTER_MODEL: 'paid/model' } },
    { env: { ...env, OPENROUTER_API_KEY: '' } }, { env: { ...env, RIVERSIDE_OPENROUTER_ENABLED: 'false' } },
    { verification: { openrouter: { ...ongoing(), revoked: true } } }]) {
    const provider = createProviders({ env, verification: { openrouter: ongoing() }, reserveCall: () => true,
      fetchImpl: async () => { calls++; return new Response('{}'); }, ...patch });
    await assert.rejects(provider.summarise({ text: 'Fictional report' }));
    await assert.rejects(provider.rankAssignment(input));
  }
  assert.equal(calls, 0);
  const provider = createProviders({ env, verification: { openrouter: ongoing() }, reserveCall: () => true, fetchImpl: async (url, options) => {
    calls++;
    assert.deepEqual(JSON.parse(options.body).provider.max_price, { prompt: 0, completion: 0, request: 0 });
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '{"rankedIds":["vol-a"]}' } }] }));
  } });
  assert.deepEqual(await provider.rankAssignment(input), { rankedIds: ['vol-a'] });
  assert.equal(calls, 1);
});

test('ongoing app calls preserve spent counts past the old cap and across failure/restart', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-ongoing-'));
  const storePath = path.join(dataDir, 'store.json');
  const usage = { 'jev:preserved-id': 21, 'openrouter:preserved-id': 21 };
  fs.writeFileSync(storePath, JSON.stringify({ users: [], workflow: {}, cookieSecret: randomBytes(32).toString('hex'), aiUsage: usage }));
  fs.writeFileSync(path.join(dataDir, 'ai-credit-verification.json'), JSON.stringify({ jev: ongoing(), openrouter: ongoing() }));
  let jevCalls = 0, routerCalls = 0;
  const options = { dataDir, aiEnv: { RIVERSIDE_JEV_ENABLED: 'true', RIVERSIDE_OPENROUTER_ENABLED: 'true',
    TYPESAFE_API_KEY: 'placeholder', OPENROUTER_API_KEY: 'placeholder' }, aiFetch: async url => {
    if (url.includes('typesafe')) {
      jevCalls++;
      return new Response(JSON.stringify({ answers: Object.fromEntries(Object.entries({ category: 'hazard', urgency: 'routine', sensitivity: 'ordinary' })
        .map(([key, choice]) => [key, { type: 'choice', choice, confidence: 0.9 }])) }));
    }
    routerCalls++;
    if (routerCalls === 1) return new Response('{}', { status: 429 });
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '{"summary":"A fictional obstruction was reported."}' } }] }));
  } };
  let server;
  t.after(async () => { if (server) { await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); }
    fs.rmSync(dataDir, { recursive: true, force: true }); });
  for (let round = 0; round < 2; round++) {
    server = createApp(options);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = { 'X-Riverside-Tab': randomUUID(), Connection: 'close' };
    const response = await fetch(base + '/api/session', { headers });
    const session = await response.json();
    assert.equal(session.ai.jev.enabled, true); assert.equal(session.ai.luna.enabled, true);
    assert.equal(session.ai.jev.remainingCalls, null); assert.equal(session.ai.luna.remainingCalls, null);
    headers.Cookie = response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
    headers['X-CSRF-Token'] = session.csrf; headers['Content-Type'] = 'application/json';
    assert.equal((await fetch(base + '/api/reports', { method: 'POST', headers,
      body: JSON.stringify({ zone: 'zone-a', text: `Fictional obstruction ${round}` }) })).status, 201);
    await server.whenAIIdle();
    const stored = JSON.parse(fs.readFileSync(storePath));
    assert.equal(stored.aiUsage['jev:preserved-id'], 22 + round);
    assert.equal(stored.aiUsage['openrouter:preserved-id'], 22 + round);
    assert.equal(stored.workflow.reports.length, round + 1);
    assert.equal(stored.workflow.incidents.at(-1).analysis.luna.state, round ? 'complete' : 'failed');
    if (!round) { await new Promise(resolve => server.close(resolve)); server = null; }
  }
  assert.equal(jevCalls, 2); assert.equal(routerCalls, 2); // Failed call was counted, never retried.
});
