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

test('HTTP volunteer claims keep the queue minimal and gate private reports through Mo review', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-claims-http-'));
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

  const mo = client(base), priya = client(base), alex = client(base), guest = client(base);
  const moPassword = randomBytes(16).toString('hex');
  const priyaPassword = randomBytes(16).toString('hex');
  const alexPassword = randomBytes(16).toString('hex');
  await Promise.all([mo.request('/api/session'), priya.request('/api/session'), alex.request('/api/session'), guest.request('/api/session')]);
  assert.equal((await mo.request('/api/setup', { username: 'mo', password: moPassword })).status, 201);
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/accounts', { username: 'priya', password: priyaPassword, volunteerId: 'vol-priya' })).status, 201);
  assert.equal((await mo.request('/api/accounts', { username: 'alex', password: alexPassword, volunteerId: 'vol-alex' })).status, 201);
  assert.equal((await priya.request('/api/login', { username: 'priya', password: priyaPassword })).status, 200);
  assert.equal((await alex.request('/api/login', { username: 'alex', password: alexPassword })).status, 200);
  await priya.request('/api/session'); await alex.request('/api/session');

  async function createReport(text, extra = {}) {
    const response = await guest.request('/api/reports', { zone: 'zone-a', category: 'other', text, ...extra });
    assert.equal(response.status, 201);
    await server.whenAIIdle();
    return response.result.id;
  }
  async function setAvailable(person) {
    const position = { latitude: -37.796, longitude: 144.961, accuracy: 5, capturedAt: time };
    return person.request('/api/presence', { available: true, start: true, position });
  }

  // The ordinary report has no GPS destination. Paused volunteers can see its
  // small queue card but cannot take it until they opt into availability.
  const ordinaryId = await createReport('PRIVATE INPUT: fictional lost property near the gate');
  const pausedQueue = await priya.request('/api/available-incidents');
  assert.equal(pausedQueue.status, 200);
  assert.equal(pausedQueue.result.incidents.some(item => item.id === ordinaryId), true);
  assert.equal(JSON.stringify(pausedQueue.result).includes('PRIVATE INPUT'), false);
  assert.equal(JSON.stringify(pausedQueue.result).includes('latitude'), false);
  assert.equal((await priya.request(`/api/incidents/${ordinaryId}/claim`, {})).status, 409);
  assert.equal((await setAvailable(priya)).status, 200);
  assert.equal((await priya.request(`/api/incidents/${ordinaryId}/claim`, {})).status, 200);
  let moState = (await mo.request('/api/state')).result;
  let claimed = moState.incidents.find(item => item.id === ordinaryId);
  assert.equal(claimed.assignee, 'vol-priya');
  assert.equal(claimed.assistance.destination, undefined, 'ordinary report claim must not create a GPS route');
  assert.equal(claimed.assistance.offers.length, 1);
  assert.equal(claimed.assistance.offers[0].status, 'accepted');

  // A busy volunteer continues to see ordinary work but cannot claim a second item.
  const secondOrdinaryId = await createReport('Another fictional ordinary report');
  const busyQueue = await priya.request('/api/available-incidents');
  assert.equal(busyQueue.result.incidents.some(item => item.id === secondOrdinaryId), true);
  assert.equal((await priya.request(`/api/incidents/${secondOrdinaryId}/claim`, {})).status, 409);

  // The reporter's explicit sensitive flag survives an ordinary simulated model
  // answer. It is visible to Mo and kept off the unassigned volunteer queue/map.
  const sensitiveId = await createReport('PRIVATE INPUT: fictional medical details', { sensitive: true });
  const ownState = (await guest.request('/api/state')).result;
  assert.equal(ownState.reports.find(report => report.id === `R-${sensitiveId.slice(2)}`).sensitive, true);
  assert.ok(ownState.reports.some(report => report.text.includes('PRIVATE INPUT')));
  const moMap = (await mo.request('/api/map-data')).result;
  const volunteerMap = (await alex.request('/api/map-data')).result;
  assert.ok(moMap.incidents.some(item => item.id === sensitiveId));
  assert.equal(volunteerMap.incidents.some(item => item.id === sensitiveId), false);
  const alexQueue = (await alex.request('/api/available-incidents')).result.incidents;
  assert.equal(alexQueue.some(item => item.id === sensitiveId), false);
  moState = (await mo.request('/api/state')).result;
  const sensitiveIncident = moState.incidents.find(item => item.id === sensitiveId);
  assert.equal(sensitiveIncident.sensitive, true);
  assert.ok(moState.reports.some(report => report.text.includes('PRIVATE INPUT')));

  // Mo may explicitly assign a sensitive item; only the named volunteer sees
  // its private report while the offer is pending.
  assert.equal((await setAvailable(alex)).status, 200);
  assert.equal((await mo.request(`/api/incidents/${sensitiveId}/assignment-offer`, { volunteerId: 'vol-alex' })).status, 200);
  const alexState = (await alex.request('/api/state')).result;
  assert.ok(alexState.reports.some(report => report.text.includes('fictional medical details')));
  assert.equal((await alex.request('/api/available-incidents')).result.incidents.some(item => item.id === sensitiveId), false);

  assert.equal((await mo.request(`/api/incidents/${sensitiveId}/sensitivity`, { sensitive: false, reason: 'Mo reviewed the fictional details.' })).status, 200);
  const reviewed = (await mo.request('/api/state')).result.incidents.find(item => item.id === sensitiveId);
  assert.equal(reviewed.sensitive, false);
  assert.equal(reviewed.sensitivityReview, 'reviewed');
  assert.equal(reviewed.history.at(-1).reason, 'Mo reviewed the fictional details.');

  // When two eligible volunteers race for the same report, the first claim
  // wins and the second request cannot replace its assignment or audit trail.
  assert.equal((await mo.request(`/api/incidents/${sensitiveId}/assistance`, { action: 'withdraw' })).status, 200);
  assert.equal((await mo.request(`/api/incidents/${ordinaryId}/assistance`, { action: 'withdraw' })).status, 200);
  assert.equal((await setAvailable(priya)).status, 200);
  assert.equal((await setAvailable(alex)).status, 200);
  const raceId = await createReport('Fictional report for competing claims');
  const [priyaClaim, alexClaim] = await Promise.all([
    priya.request(`/api/incidents/${raceId}/claim`, {}), alex.request(`/api/incidents/${raceId}/claim`, {})
  ]);
  assert.deepEqual([priyaClaim.status, alexClaim.status].sort(), [200, 409]);
  const beforeSecondClaim = (await mo.request('/api/state')).result.incidents.find(item => item.id === raceId);
  assert.ok(['vol-priya', 'vol-alex'].includes(beforeSecondClaim.assignee));
  const afterSecondClaim = (await mo.request('/api/state')).result.incidents.find(item => item.id === raceId);
  assert.deepEqual(afterSecondClaim, beforeSecondClaim);
});
