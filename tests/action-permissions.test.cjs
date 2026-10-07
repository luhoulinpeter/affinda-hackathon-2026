const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../server/index.cjs');

function client(base) {
  const jar = new Map(), tabId = randomUUID();
  let csrf = '';
  return {
    async request(route, body) {
      const response = await fetch(base + route, {
        headers: { Connection: 'close', 'X-Riverside-Tab': tabId,
          Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }) },
        ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) })
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [key, value] = cookie.split(';')[0].split('=');
        if (value) jar.set(key, value); else jar.delete(key);
      }
      const result = await response.json();
      if (result.csrf) csrf = result.csrf;
      return { status: response.status, result };
    }
  };
}

test('HTTP action permissions reject unauthorized roles without changing incident state or history', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-action-permissions-'));
  let time = Date.now();
  const aiProviders = {
    status: () => ({ jev: { enabled: false }, luna: { enabled: false } }),
    classify: async () => ({ category: 'other', urgency: 'routine', sensitivity: 'ordinary' }),
    summarise: async () => ({ summary: 'Simulated report summary' }),
    screen: async () => ({ intent: 'information' }),
    answer: async () => ({ answer: 'No answer available.', sources: [], unknown: true })
  };
  const server = createApp({ dataDir, aiProviders, aiEnv: {}, now: () => time });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await server.whenAIIdle();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const mo = client(base), priya = client(base), alex = client(base), guest = client(base), otherGuest = client(base);
  const passwords = Object.fromEntries(['mo', 'priya', 'alex'].map(name => [name, randomBytes(16).toString('hex')]));
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/setup', { username: 'mo', password: passwords.mo })).status, 201);
  await mo.request('/api/session');
  for (const [person, id] of [[priya, 'vol-priya'], [alex, 'vol-alex']]) {
    await person.request('/api/session');
    const username = id === 'vol-priya' ? 'priya' : 'alex';
    assert.equal((await mo.request('/api/accounts', { username, password: passwords[username], volunteerId: id })).status, 201);
    assert.equal((await person.request('/api/login', { username, password: passwords[username] })).status, 200);
    await person.request('/api/session');
  }
  await guest.request('/api/session');
  await otherGuest.request('/api/session');

  async function state(id) {
    await server.whenAIIdle();
    const result = (await mo.request('/api/state')).result;
    return result.incidents.find(item => item.id === id);
  }
  async function report(person = guest, text = 'Fictional event report') {
    const result = await person.request('/api/reports', { zone: 'zone-a', category: 'other', text });
    assert.equal(result.status, 201);
    await server.whenAIIdle();
    return result.result.id;
  }
  async function deniedWithoutMutation(person, route, body, id, expectedStatus) {
    const before = await state(id);
    const response = await person.request(route, body);
    assert.equal(response.status, expectedStatus, `${route} should reject this actor`);
    assert.deepEqual(await state(id), before, `${route} denial must preserve all incident fields and history`);
  }
  const actionRoute = id => `/api/incidents/${id}/action`;
  const assistanceRoute = id => `/api/incidents/${id}/assistance`;

  // A public reporter may resolve their own incident, but cannot acknowledge or escalate it.
  const lifecycleId = await report(guest, 'Original guest report');
  await deniedWithoutMutation(guest, actionRoute(lifecycleId), { action: 'acknowledge' }, lifecycleId, 403);
  await deniedWithoutMutation(guest, actionRoute(lifecycleId), { action: 'escalate' }, lifecycleId, 403);
  await deniedWithoutMutation(otherGuest, actionRoute(lifecycleId), { action: 'resolve' }, lifecycleId, 404);
  await deniedWithoutMutation(alex, actionRoute(lifecycleId), { action: 'resolve' }, lifecycleId, 404);
  await deniedWithoutMutation(priya, actionRoute(lifecycleId), { action: 'acknowledge' }, lifecycleId, 404);
  assert.equal((await mo.request(actionRoute(lifecycleId), { action: 'acknowledge' })).status, 200);
  await deniedWithoutMutation(priya, actionRoute(lifecycleId), { action: 'escalate' }, lifecycleId, 404);
  assert.equal((await guest.request(actionRoute(lifecycleId), { action: 'resolve' })).status, 200);

  // An accepted GPS request makes Priya the assignee. Other roles cannot arrive;
  // only Mo or the original requester may stop it, and only Mo may retry it.
  async function acceptedAssistance() {
    time += 1000;
    const position = { latitude: -37.796, longitude: 144.961, accuracy: 5, capturedAt: time };
    assert.equal((await priya.request('/api/presence', { available: true, position })).status, 200);
    const response = await guest.request('/api/reports', { zone: 'zone-a', category: 'other', text: 'GPS assistance report',
      requestAssistance: true, requestId: randomUUID(), position });
    assert.equal(response.status, 201);
    const id = response.result.id;
    const incident = await state(id);
    const offer = incident.assistance.offers.find(item => item.status === 'pending');
    assert.ok(offer, 'Priya should receive the simulated local offer');
    assert.equal((await alex.request(`/api/incidents/${id}/offers/${offer.id}`, { decision: 'accept' })).status, 404);
    assert.equal((await priya.request(`/api/incidents/${id}/offers/${offer.id}`, { decision: 'accept' })).status, 200);
    await server.whenAIIdle();
    return { id, offer };
  }

  const { id: arrivalId } = await acceptedAssistance();
  await deniedWithoutMutation(guest, assistanceRoute(arrivalId), { action: 'arrive' }, arrivalId, 403);
  await deniedWithoutMutation(mo, assistanceRoute(arrivalId), { action: 'arrive' }, arrivalId, 403);
  await deniedWithoutMutation(alex, assistanceRoute(arrivalId), { action: 'arrive' }, arrivalId, 404);
  assert.equal((await priya.request(assistanceRoute(arrivalId), { action: 'arrive' })).status, 200);
  await deniedWithoutMutation(priya, assistanceRoute(arrivalId), { action: 'retry' }, arrivalId, 403);
  await deniedWithoutMutation(alex, assistanceRoute(arrivalId), { action: 'withdraw' }, arrivalId, 404);
  assert.equal((await guest.request(assistanceRoute(arrivalId), { action: 'withdraw' })).status, 200);

  // On a fresh request, non-Mo roles cannot retry; Mo can. Requester and Mo
  // can withdraw, while assigned and unrelated volunteers cannot.
  const { id: retryId } = await acceptedAssistance();
  await deniedWithoutMutation(guest, assistanceRoute(retryId), { action: 'retry' }, retryId, 403);
  await deniedWithoutMutation(priya, assistanceRoute(retryId), { action: 'retry' }, retryId, 403);
  await deniedWithoutMutation(alex, assistanceRoute(retryId), { action: 'retry' }, retryId, 404);
  assert.equal((await mo.request(assistanceRoute(retryId), { action: 'retry' })).status, 200);
  await deniedWithoutMutation(priya, assistanceRoute(retryId), { action: 'withdraw' }, retryId, 404);
  assert.equal((await mo.request(assistanceRoute(retryId), { action: 'withdraw' })).status, 200);

  // A waiting offer can be accepted or declined only by its named recipient.
  time += 1000;
  const position = { latitude: -37.796, longitude: 144.961, accuracy: 5, capturedAt: time };
  assert.equal((await priya.request('/api/presence', { available: true, position, start: true })).status, 200);
  const waiting = await guest.request('/api/reports', { zone: 'zone-a', text: 'Waiting offer report', requestAssistance: true, requestId: randomUUID(), position });
  assert.equal(waiting.status, 201);
  const waitingState = await state(waiting.result.id);
  const pending = waitingState.assistance.offers.find(item => item.status === 'pending');
  assert.ok(pending);
  for (const [person, expectedStatus] of [[mo, 403], [alex, 404], [guest, 403], [otherGuest, 403]]) {
    const before = await state(waiting.result.id);
    const result = await person.request(`/api/incidents/${waiting.result.id}/offers/${pending.id}`, { decision: 'accept' });
    assert.equal(result.status, expectedStatus);
    assert.deepEqual(await state(waiting.result.id), before, 'unauthorized acceptance must leave offer and history untouched');
  }
  assert.equal((await priya.request(`/api/incidents/${waiting.result.id}/offers/${pending.id}`, { decision: 'decline' })).status, 200);
  assert.equal((await state(waiting.result.id)).assistance.offers[0].status, 'declined');
});
