const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../server/index.cjs');

function client(base) {
  const cookies = new Map(), tabId = randomUUID(); let csrf;
  return async (route, body) => {
    const response = await fetch(base + route, { headers: { Connection: 'close', 'X-Riverside-Tab': tabId,
      Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }) },
    ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    for (const cookie of response.headers.getSetCookie()) { const [key, value] = cookie.split(';')[0].split('='); if (value) cookies.set(key, value); else cookies.delete(key); }
    const data = await response.json(); if (data.csrf) csrf = data.csrf;
    return { status: response.status, data };
  };
}

test('fake assignment journeys project by role and lifecycle without mutating incident GPS', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-demo-map-http-'));
  let time = Date.now();
  const modelInputs = [];
  const aiProviders = { status: () => ({}),
    classify: async report => { modelInputs.push(report); return { category: report.category, urgency: report.immediateConcern ? 'urgent' : 'routine', sensitivity: 'ordinary' }; },
    summarise: async report => { modelInputs.push(report); return { summary: 'Simulated summary.' }; } };
  const server = createApp({ dataDir, aiEnv: {}, aiProviders, now: () => time });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const mo = client(base), priya = client(base), alex = client(base), sam = client(base), guest = client(base), other = client(base), outsider = client(base), locationReporter = client(base);
  for (const c of [mo, priya, alex, sam, guest, other, outsider, locationReporter]) await c('/api/session');
  await mo('/api/setup', { username: 'manager', password: randomBytes(12).toString('hex') }); await mo('/api/session');
  for (const [user, volunteerId, c] of [['priya','vol-priya',priya], ['alex','vol-alex',alex], ['sam','vol-sam',sam]]) {
    const password = randomBytes(12).toString('hex');
    await mo('/api/accounts', { username: user, password, volunteerId });
    await c('/api/login', { username: user, password }); await c('/api/session');
  }
  const pos = (latitude, longitude = 0) => ({ latitude, longitude, accuracy: 8, capturedAt: time });
  for (const [c, lat] of [[priya, .001], [alex, .002], [sam, .004]]) {
    assert.equal((await c('/api/presence', { available: true, start: true, position: pos(lat) })).status, 200);
  }

  // Ordinary zone-only incident: Mo manually offers it, then Priya accepts.
  const ordinary = await guest('/api/reports', { zone: 'zone-a', category: 'medical', text: 'Fictional ordinary issue in Zone A.' });
  assert.equal(ordinary.status, 201); const ordinaryId = ordinary.data.id;
  await server.whenAIIdle();
  const originalWorkflowBeforeSimulation = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow;
  const initial = (await mo('/api/state')).data.incidents.find(i => i.id === ordinaryId);
  assert.equal((await mo(`/api/incidents/${ordinaryId}/assignment-offer`, { volunteerId: 'vol-priya' })).status, 200);
  const incoming = (await priya('/api/state')).data.incidents.find(i => i.id === ordinaryId);
  assert.equal((await priya(`/api/incidents/${ordinaryId}/offers/${incoming.assistance.offers[0].id}`, { decision: 'accept' })).status, 200);
  const current = (await mo('/api/state')).data.incidents.find(i => i.id === ordinaryId);
  assert.equal(current.assignee, 'vol-priya'); assert.equal(current.assistance.state, 'accepted');

  // Only Mo can start or stop a demo journey.
  assert.equal((await guest(`/api/incidents/${ordinaryId}/demo-journey`, { action: 'start' })).status, 403);
  assert.equal((await priya(`/api/incidents/${ordinaryId}/demo-journey`, { action: 'start' })).status, 403);
  assert.equal((await mo(`/api/incidents/${ordinaryId}/demo-journey`, { action: 'start' })).status, 200);

  let publicMap = (await guest('/api/map-data')).data;
  assert.equal(publicMap.incidents.length, 1);
  assert.deepEqual(publicMap.incidents[0].startPosition, { latitude: -37.7958, longitude: 144.9612 });
  assert.deepEqual(publicMap.incidents[0].position, { latitude: -37.7992, longitude: 144.962 });
  assert.equal(publicMap.incidents[0].progress, 0);
  assert.deepEqual(publicMap.volunteers, []);
  const outsiderMap = (await outsider('/api/map-data')).data;
  assert.deepEqual(outsiderMap.incidents, []); assert.deepEqual(outsiderMap.volunteers, []);
  const ownVolunteerMap = (await priya('/api/map-data')).data;
  assert.equal(ownVolunteerMap.incidents.find(i => i.id === ordinaryId).demo, true);

  time += 45_000;
  let moMap = (await mo('/api/map-data')).data;
  assert.equal(moMap.incidents.find(i => i.id === ordinaryId).progress, 0.5);
  const movingPin = moMap.volunteers.find(v => v.id === 'vol-priya');
  assert.equal(movingPin.demo, true);
  assert.deepEqual(movingPin.position, { latitude: (-37.7958 + -37.7992) / 2, longitude: (144.9612 + 144.962) / 2 });
  assert.equal(movingPin.position.latitude, -37.7975);

  time += 45_000;
  moMap = (await mo('/api/map-data')).data;
  assert.equal(moMap.incidents.find(i => i.id === ordinaryId).progress, 1);
  const stillOpen = (await mo('/api/state')).data.incidents.find(i => i.id === ordinaryId);
  assert.equal(stillOpen.status, 'open'); assert.equal(stillOpen.assignee, 'vol-priya'); assert.equal(stillOpen.assistance.state, 'accepted');

  // Stopping simulation restores the live pin and removes the fake path.
  await priya('/api/presence', { available: true, start: false, position: pos(.001) });
  assert.equal((await mo(`/api/incidents/${ordinaryId}/demo-journey`, { action: 'stop' })).status, 200);
  moMap = (await mo('/api/map-data')).data;
  const restored = moMap.volunteers.find(v => v.id === 'vol-priya');
  assert.equal(restored.demo, undefined); assert.equal(restored.position.latitude, .001);
  assert.equal(moMap.incidents.find(i => i.id === ordinaryId).demo, undefined);
  assert.equal(moMap.incidents.find(i => i.id === ordinaryId).position, undefined);

  // A requester can cancel and remove a running fake projection.
  await mo(`/api/incidents/${ordinaryId}/demo-journey`, { action: 'start' });
  assert.equal((await guest(`/api/incidents/${ordinaryId}/assistance`, { action: 'withdraw' })).status, 200);
  assert.equal((await mo('/api/map-data')).data.incidents.find(i => i.id === ordinaryId).demo, undefined);

  // An ordinary report may opt into a server-validated location; it stays on the incident and out of AI input.
  const reportLocation = { latitude: -37.8011, longitude: 144.9655, accuracy: 12, capturedAt: time };
  const located = await locationReporter('/api/reports', { zone: 'zone-b', category: 'other', text: 'Fictional ordinary location report.', reportLocation: true, position: reportLocation });
  assert.equal(located.status, 201); await server.whenAIIdle();
  assert.equal((await locationReporter('/api/reports', { zone: 'zone-b', category: 'other', text: 'Bad location report.', reportLocation: true, position: { ...reportLocation, accuracy: 101 } })).status, 400);
  moMap = (await mo('/api/map-data')).data;
  const locatedPin = moMap.incidents.find(i => i.id === located.data.id);
  assert.deepEqual(locatedPin.position, { latitude: reportLocation.latitude, longitude: reportLocation.longitude });
  assert.ok(modelInputs.every(input => !JSON.stringify(input).includes('latitude') && !JSON.stringify(input).includes('longitude')));

  // Accepted GPS assistance preserves its original requester location while a demo is shown.
  const gpsRequest = pos(0, 0);
  const assisted = await other('/api/reports', { zone: 'zone-c', category: 'hazard', text: 'Fictional GPS assistance report.', requestAssistance: true, requestId: 'demo-map-gps-request', position: gpsRequest });
  assert.equal(assisted.status, 201);
  const gpsIncident = (await mo('/api/state')).data.incidents.find(i => i.id === assisted.data.id);
  const firstOffer = gpsIncident.assistance.offers.find(o => o.status === 'pending');
  assert.equal(firstOffer.volunteerId, 'vol-alex');
  const gpsAccepted = await alex(`/api/incidents/${assisted.data.id}/offers/${firstOffer.id}`, { decision: 'accept' }); assert.equal(gpsAccepted.status, 200);
  await mo(`/api/incidents/${assisted.data.id}/demo-journey`, { action: 'start' });
  const storedBeforeRetry = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow.incidents.find(i => i.id === assisted.data.id).assistance.destination;
  assert.deepEqual(storedBeforeRetry, { latitude: 0, longitude: 0, accuracy: 8, capturedAt: time, receivedAt: time });
  await mo(`/api/incidents/${assisted.data.id}/assistance`, { action: 'retry' });
  const samOffer = (await sam('/api/state')).data.incidents.find(i => i.id === assisted.data.id).assistance.offers.find(o => o.status === 'pending');
  assert.equal(samOffer.volunteerId, 'vol-sam');
  await sam(`/api/incidents/${assisted.data.id}/offers/${samOffer.id}`, { decision: 'accept' });
  const afterReassignment = (await mo('/api/map-data')).data.incidents.find(i => i.id === assisted.data.id);
  assert.equal(afterReassignment.demo, undefined);
  const storedAfterRetry = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow.incidents.find(i => i.id === assisted.data.id).assistance.destination;
  assert.deepEqual(storedAfterRetry, storedBeforeRetry);

  // A resolved incident also loses its fake projection, with no automatic resolution at 100%.
  await alex('/api/presence', { available: true, start: true, position: pos(.002) });
  assert.equal((await mo(`/api/incidents/${ordinaryId}/assignment-offer`, { volunteerId: 'vol-alex' })).status, 200);
  const alexOffer = (await alex('/api/state')).data.incidents.find(i => i.id === ordinaryId).assistance.offers.find(o => o.status === 'pending');
  assert.equal((await alex(`/api/incidents/${ordinaryId}/offers/${alexOffer.id}`, { decision: 'accept' })).status, 200);
  await mo(`/api/incidents/${ordinaryId}/demo-journey`, { action: 'start' });
  assert.equal((await alex(`/api/incidents/${ordinaryId}/action`, { action: 'resolve' })).status, 200);
  const resolved = (await mo('/api/map-data')).data.incidents.find(i => i.id === ordinaryId);
  assert.equal(resolved.demo, undefined);
  const storedIncident = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow.incidents.find(i => i.id === ordinaryId);
  assert.equal(storedIncident.location, undefined); assert.equal(storedIncident.assistance.destination, undefined);
  assert.ok(originalWorkflowBeforeSimulation.incidents.find(i => i.id === ordinaryId));
});
