const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../server/index.cjs');

function client(base) {
  const cookies = new Map(), tabId = randomUUID(); let csrf;
  return { async call(route, body) {
    const response = await fetch(base + route, { headers: { Connection: 'close', 'X-Riverside-Tab': tabId,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }) },
    ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    for (const cookie of response.headers.getSetCookie()) { const [key, value] = cookie.split(';')[0].split('='); if (value) cookies.set(key, value); else cookies.delete(key); }
    const data = await response.json(); if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  } };
}

async function start(t, aiProviders) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-ranking-route-'));
  const server = createApp({ dataDir, aiEnv: {}, aiProviders });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  return { server, base };
}

async function setup(base) {
  const mo = client(base), guest = client(base), volunteer = client(base);
  for (const account of [mo, guest, volunteer]) await account.call('/api/session');
  await mo.call('/api/setup', { username: 'manager', password: randomBytes(12).toString('hex') }); await mo.call('/api/session');
  const password = randomBytes(12).toString('hex');
  await mo.call('/api/accounts', { username: 'helper', password, volunteerId: 'vol-priya' });
  await volunteer.call('/api/login', { username: 'helper', password }); await volunteer.call('/api/session');
  await volunteer.call('/api/presence', { available: true, start: true, position: { latitude: 0.001, longitude: 0, accuracy: 8, capturedAt: Date.now() } });
  const report = await guest.call('/api/reports', { zone: 'zone-a', category: 'medical', text: 'Fictional report for assignment recommendation.', immediateConcern: true });
  return { mo, guest, volunteer, incidentId: report.data.id };
}

test('recommendation route is Mo-only, advisory, and does not create an offer', async t => {
  let rankCalls = 0, captured;
  const aiProviders = { status: () => ({}), classify: async () => { throw new Error('Jev unavailable'); }, summarise: async () => { throw new Error('OpenRouter unavailable'); },
    rankAssignment: async input => { rankCalls++; captured = input; return { rankedIds: ['vol-priya'] }; } };
  const { base } = await start(t, aiProviders);
  const { mo, guest, volunteer, incidentId } = await setup(base);
  await guest.call('/api/session');
  assert.equal((await guest.call(`/api/incidents/${incidentId}/assignment-recommendation`, {})).status, 403);
  assert.equal((await volunteer.call(`/api/incidents/${incidentId}/assignment-recommendation`, {})).status, 403);
  assert.equal(rankCalls, 0);

  const result = await mo.call(`/api/incidents/${incidentId}/assignment-recommendation`, {});
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { incidentId, advisory: true, recommendations: [{ id: 'vol-priya', name: 'Priya (fictional)', reasons: [
    'Volunteer roster zone matches the incident zone.', 'Volunteer location is fresh.', 'Requester GPS distance is unavailable.'
  ] }] });
  assert.deepEqual(captured.incident, { category: 'medical', urgency: 'urgent', zone: 'zone-a' });
  assert.deepEqual(captured.candidates, [{ id: 'vol-priya', sameZone: true, fresh: true, distanceBand: 'unknown' }]);
  assert.ok(!JSON.stringify(captured).includes('latitude'));
  const state = (await mo.call('/api/state')).data;
  const incident = state.incidents.find(item => item.id === incidentId);
  assert.equal(incident.assignee, null);
  assert.equal(incident.assistance, undefined);
});

test('route suppresses a ranking result after Mo session changes', async t => {
  let mo;
  const aiProviders = { status: () => ({}), classify: async () => { throw Error('offline'); }, summarise: async () => { throw Error('offline'); },
    rankAssignment: async () => { await mo.call('/api/logout', {}); return { rankedIds: ['vol-priya'] }; } };
  const { base } = await start(t, aiProviders);
  const setupResult = await setup(base); mo = setupResult.mo;
  const result = await mo.call(`/api/incidents/${setupResult.incidentId}/assignment-recommendation`, {});
  assert.equal(result.status, 403);
  assert.match(result.data.error, /Session changed/);
});

test('provider failure returns a safe manual fallback message without changing assignment state', async t => {
  const aiProviders = { status: () => ({}), classify: async () => { throw Error('offline'); }, summarise: async () => { throw Error('offline'); },
    rankAssignment: async () => { throw new Error('Provider timed out with private transport detail'); } };
  const { base } = await start(t, aiProviders);
  const { mo, incidentId } = await setup(base);
  const result = await mo.call(`/api/incidents/${incidentId}/assignment-recommendation`, {});
  assert.equal(result.status, 503);
  assert.match(result.data.error, /choose an eligible volunteer manually/i);
  assert.ok(!JSON.stringify(result.data).includes('private transport detail'));
  const incident = (await mo.call('/api/state')).data.incidents.find(item => item.id === incidentId);
  assert.equal(incident.assignee, null);
  assert.equal(incident.assistance, undefined);
});
