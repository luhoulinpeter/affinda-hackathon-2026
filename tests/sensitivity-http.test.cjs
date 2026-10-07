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

test('privacy overrides withdraw automatic offers but preserve Mo-selected private assignments', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-sensitivity-http-'));
  let time = Date.now();
  const aiProviders = {
    status: () => ({ jev: { enabled: false }, luna: { enabled: false } }),
    classify: async report => {
      if (report.text.includes('classification unavailable')) throw new Error('Simulated Jev outage');
      const sensitivity = report.text.includes('sensitive case') ? 'sensitive' :
        report.text.includes('unclear case') ? 'unclear' : 'ordinary';
      return { category: 'other', urgency: 'routine', sensitivity };
    },
    summarise: async () => ({ summary: 'Simulated report summary.' }),
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

  const mo = client(base), priya = client(base), alex = client(base), guest = client(base);
  const passwords = [randomBytes(16).toString('hex'), randomBytes(16).toString('hex'), randomBytes(16).toString('hex')];
  for (const person of [mo, priya, alex, guest]) await person.request('/api/session');
  assert.equal((await mo.request('/api/setup', { username: 'mo', password: passwords[0] })).status, 201);
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/accounts', { username: 'priya', password: passwords[1], volunteerId: 'vol-priya' })).status, 201);
  assert.equal((await mo.request('/api/accounts', { username: 'alex', password: passwords[2], volunteerId: 'vol-alex' })).status, 201);
  assert.equal((await priya.request('/api/login', { username: 'priya', password: passwords[1] })).status, 200);
  assert.equal((await alex.request('/api/login', { username: 'alex', password: passwords[2] })).status, 200);
  await priya.request('/api/session'); await alex.request('/api/session');

  const position = { latitude: -37.796, longitude: 144.961, accuracy: 5, capturedAt: time };
  async function available(person) {
    const result = await person.request('/api/presence', { available: true, start: true, position });
    assert.equal(result.status, 200);
  }
  async function report(text, extra = {}) {
    const { requestAssistance = true, ...fields } = extra;
    const input = { zone: 'zone-a', category: 'other', text, ...fields };
    if (requestAssistance) Object.assign(input, { requestAssistance: true, requestId: randomUUID(), position });
    const result = await guest.request('/api/reports', input);
    assert.equal(result.status, 201);
    await server.whenAIIdle();
    return result.result.id;
  }

  await available(priya);

  // A routine automatic offer is withdrawn if Mo later decides the report is private.
  const automaticId = await report('A fictional ordinary report for override testing.');
  await guest.request('/api/state'); // snapshot tick runs after simulated classification completes.
  const automatic = (await mo.request('/api/state')).result.incidents.find(item => item.id === automaticId);
  assert.equal(automatic.assistance.offers.length, 1);
  assert.equal(automatic.assistance.offers[0].status, 'pending');
  const staleOfferId = automatic.assistance.offers[0].id;

  const beforeDenied = (await mo.request('/api/state')).result.incidents.find(item => item.id === automaticId);
  assert.equal((await guest.request(`/api/incidents/${automaticId}/sensitivity`, { sensitive: true, reason: 'Unauthorized test decision.' })).status, 403);
  const afterDenied = (await mo.request('/api/state')).result.incidents.find(item => item.id === automaticId);
  assert.equal(afterDenied.sensitive, beforeDenied.sensitive);
  assert.equal(afterDenied.sensitivityReview, beforeDenied.sensitivityReview);
  assert.deepEqual(afterDenied.history, beforeDenied.history);

  assert.equal((await mo.request(`/api/incidents/${automaticId}/sensitivity`, { sensitive: true, reason: 'Mo reviewed and marked this fictional report private.' })).status, 200);
  const afterOverride = (await mo.request('/api/state')).result.incidents.find(item => item.id === automaticId);
  assert.equal(afterOverride.sensitive, true);
  assert.equal(afterOverride.sensitivityReview, 'reviewed');
  assert.equal(afterOverride.assistance.offers[0].status, 'withdrawn');
  const priyaStateAfterOverride = (await priya.request('/api/state')).result;
  assert.equal(priyaStateAfterOverride.incidents.some(item => item.id === automaticId), false);
  assert.equal(JSON.stringify(priyaStateAfterOverride).includes('ordinary report for override testing'), false);
  assert.equal((await priya.request('/api/incidents/' + automaticId + '/offers/' + staleOfferId, { decision: 'accept' })).status, 409);

  // A Mo-selected recipient may still receive and accept a private assignment.
  await available(alex);
  assert.equal((await mo.request(`/api/incidents/${automaticId}/assignment-offer`, { volunteerId: 'vol-alex' })).status, 200);
  const alexOfferState = (await alex.request('/api/state')).result;
  assert.ok(alexOfferState.reports.some(item => item.text.includes('ordinary report for override testing')));
  const alexOffer = alexOfferState.incidents.find(item => item.id === automaticId).assistance.offers.find(item => item.status === 'pending');
  assert.ok(alexOffer);
  assert.equal((await alex.request(`/api/incidents/${automaticId}/offers/${alexOffer.id}`, { decision: 'accept' })).status, 200);
  assert.equal((await alex.request('/api/state')).result.incidents.find(item => item.id === automaticId).assignee, 'vol-alex');

  // AI sensitivity or uncertainty prevents automatic offers before Mo acts.
  for (const label of ['sensitive case', 'unclear case']) {
    const id = await report(`A fictional ${label} report.`);
    await priya.request('/api/state');
    const incident = (await mo.request('/api/state')).result.incidents.find(item => item.id === id);
    assert.equal(incident.sensitive, true);
    assert.deepEqual(incident.assistance.offers, []);
    assert.equal((await priya.request('/api/available-incidents')).result.incidents.some(item => item.id === id), false);
  }

  // A failed sensitivity check remains held, but Mo can still make a personal offer.
  const failedId = await report('A fictional classification unavailable report.');
  await priya.request('/api/state');
  let failed = (await mo.request('/api/state')).result.incidents.find(item => item.id === failedId);
  assert.equal(failed.sensitivityReview, 'unavailable');
  assert.deepEqual(failed.assistance.offers, []);
  assert.equal((await priya.request('/api/available-incidents')).result.incidents.some(item => item.id === failedId), false);
  assert.equal((await mo.request(`/api/incidents/${failedId}/assignment-offer`, { volunteerId: 'vol-priya' })).status, 200);
  const privateOffer = (await priya.request('/api/state')).result.incidents.find(item => item.id === failedId).assistance.offers.find(item => item.status === 'pending');
  assert.ok(privateOffer);
  assert.equal((await priya.request(`/api/incidents/${failedId}/offers/${privateOffer.id}`, { decision: 'accept' })).status, 200);
  assert.equal((await mo.request(`/api/incidents/${failedId}/assistance`, { action: 'withdraw' })).status, 200);
  await available(priya);

  // Mo can review an explicitly private, unassigned report as ordinary; that
  // decision makes it available to a volunteer's normal claim flow.
  const reviewedId = await report('A fictional reporter-marked private claim test.', { sensitive: true, requestAssistance: false });
  assert.equal((await priya.request('/api/available-incidents')).result.incidents.some(item => item.id === reviewedId), false);
  assert.equal((await mo.request(`/api/incidents/${reviewedId}/sensitivity`, { sensitive: false, reason: 'Mo reviewed this fictional report as ordinary.' })).status, 200);
  assert.equal((await priya.request('/api/available-incidents')).result.incidents.some(item => item.id === reviewedId), true);
  assert.equal((await priya.request(`/api/incidents/${reviewedId}/claim`, {})).status, 200);
});
