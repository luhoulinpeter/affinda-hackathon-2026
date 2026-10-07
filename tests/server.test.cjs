const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { createApp } = require('../server/index.cjs');

function client(base) {
  const jar = new Map();
  let csrf = '';
  return {
    jar,
    async request(route, body, headers = {}) {
      const response = await fetch(base + route, {
        // A fresh connection also verifies login after an actual server restart.
        headers: { Connection: 'close', Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }), ...headers },
        ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) })
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [key, value] = cookie.split(';')[0].split('=');
        if (value) jar.set(key, value); else jar.delete(key);
      }
      const result = await response.json();
      if (result.csrf) csrf = result.csrf;
      return { status: response.status, result, response };
    }
  };
}

test('real accounts enforce guest, volunteer and Mo access over HTTP and survive restart', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-auth-test-'));
  let capturedSources;
  const aiProviders = {
    status: () => ({ jev: { enabled: false, reason: 'Simulated tests only' }, luna: { enabled: false, reason: 'Simulated tests only' } }),
    classify: async () => { throw new Error('Simulated provider outage'); },
    summarise: async () => { throw new Error('Simulated provider outage'); },
    screen: async question => ({ intent: question.includes('crowd pressure') ? 'safety' : 'information' }),
    answer: async (question, history, sources) => {
      capturedSources = sources;
      if (question === 'unknown') return { answer: 'No opening times supplied.', sources: [], unknown: true };
      if (question === 'foreign') return { answer: 'private', sources: ['R-999'], unknown: false };
      return { answer: 'See permitted current information.', sources: [sources[0].id], unknown: false };
    }
  };
  const guide = { ...require('../data/event-guide.json'), approved: true };
  let server = createApp({ dataDir, aiProviders, guide, aiEnv: {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const guest = client(base), other = client(base), mo = client(base), volunteer = client(base);
  const password = randomBytes(24).toString('hex');
  const volunteerPassword = randomBytes(24).toString('hex');
  const session = await guest.request('/api/session');
  assert.equal(session.result.user, null);
  assert.equal(session.result.setupRequired, true);
  assert.ok(session.response.headers.getSetCookie().some(cookie => cookie.includes('HttpOnly') && cookie.includes('SameSite=Strict')));
  const report = await guest.request('/api/reports', { zone: 'zone-b', category: 'hazard', text: 'Fictional spill', volunteerId: 'vol-priya', reporter: { id: 'mo', role: 'mo' } });
  assert.equal(report.status, 201);
  assert.equal((await guest.request('/api/state')).result.reports[0].reporter.role, 'public');
  await other.request('/api/session');
  assert.equal((await other.request('/api/state')).result.reports.length, 0);
  assert.equal((await other.request(`/api/incidents/${report.result.id}/action`, { action: 'resolve', actor: { id: 'mo', role: 'mo' } })).status, 404);
  assert.equal((await guest.request(`/api/incidents/${report.result.id}/action`, { action: 'acknowledge', actor: { id: 'mo', role: 'mo' } })).status, 403);
  assert.equal((await guest.request('/api/reports', { text: 'x' }, { 'X-CSRF-Token': 'wrong' })).status, 403);
  assert.equal((await guest.request('/api/reports', {}, { Origin: 'https://external.invalid' })).status, 403);
  assert.equal((await guest.request('/api/accounts', { username: 'attacker', password, volunteerId: 'vol-priya' })).status, 403);

  await mo.request('/api/session');
  assert.equal((await mo.request('/api/setup', { username: 'test-mo', password, role: 'volunteer' })).status, 201);
  assert.equal((await mo.request('/api/session')).result.user.role, 'mo');
  assert.equal((await other.request('/api/setup', { username: 'other-mo', password })).status, 409);
  assert.equal((await mo.request('/api/state')).result.reports.length, 1);
  assert.equal((await mo.request('/api/accounts', { username: 'test-priya', password: volunteerPassword, volunteerId: 'vol-priya', role: 'mo' })).status, 201);
  const storage = fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8');
  assert.ok(!storage.includes(password) && !storage.includes(volunteerPassword));
  assert.equal((await guest.request('/.riverside/store.json')).status, 404);
  assert.equal((await guest.request('/server/index.cjs')).status, 404);
  assert.equal((await guest.request('/.git/config')).status, 404);
  assert.equal((await guest.request('/data/event-guide.json')).status, 404);
  assert.equal((await guest.request('/server/ai/providers.cjs')).status, 404);
  assert.equal((await guest.request('/api/qa', { question: 'Status?' }, { 'X-CSRF-Token': 'wrong' })).status, 403);
  const privateReport = await other.request('/api/reports', { zone: 'zone-c', text: 'PRIVATE-OTHER-REPORT' });
  assert.equal(privateReport.status, 201);
  const guestAnswer = await guest.request('/api/qa', { question: 'Status?', actor: { role: 'mo', id: 'mo' } });
  assert.equal(guestAnswer.result.outcome, 'answer');
  assert.ok(capturedSources.some(source => source.id === report.result.id));
  assert.ok(!JSON.stringify(capturedSources).includes('PRIVATE-OTHER-REPORT'));
  assert.ok(!capturedSources.some(source => source.id === 'guide-staff'));
  assert.equal((await guest.request('/api/qa', { question: 'foreign' })).result.outcome, 'unavailable');
  assert.equal((await guest.request('/api/qa', { question: 'unknown' })).result.outcome, 'unknown');
  const beforeDraft = (await mo.request('/api/state')).result.reports.length;
  const draft = await guest.request('/api/qa', { question: 'Fictional crowd pressure at entry' });
  assert.equal(draft.result.outcome, 'report_draft');
  assert.equal((await mo.request('/api/state')).result.reports.length, beforeDraft);
  await mo.request('/api/qa', { question: 'Review queue' });
  assert.ok(JSON.stringify(capturedSources).includes('PRIVATE-OTHER-REPORT'));
  assert.ok(capturedSources.some(source => source.id === 'guide-staff'));

  await volunteer.request('/api/session');
  assert.equal((await volunteer.request('/api/login', { username: 'test-priya', password: 'incorrect-password' })).status, 401);
  assert.equal((await volunteer.request('/api/login', { username: 'test-priya', password: volunteerPassword, role: 'mo' })).status, 200);
  assert.equal((await volunteer.request('/api/session')).result.user.role, 'volunteer');
  assert.equal((await volunteer.request('/api/state')).result.reports.length, 0);
  await volunteer.request('/api/qa', { question: 'Review my reports' });
  assert.ok(!JSON.stringify(capturedSources).includes('PRIVATE-OTHER-REPORT'));
  assert.ok(!capturedSources.some(source => source.id === report.result.id));
  assert.ok(capturedSources.some(source => source.id === 'guide-staff'));
  assert.equal((await volunteer.request('/api/accounts', { username: 'test-sam', password, volunteerId: 'vol-sam' })).status, 403);
  assert.equal((await volunteer.request(`/api/incidents/${report.result.id}/action`, { action: 'resolve' })).status, 404);
  const own = await volunteer.request('/api/reports', { zone: 'zone-a', category: 'other', text: 'Fictional volunteer report', volunteerId: 'vol-alex' });
  const ownState = (await volunteer.request('/api/state')).result;
  assert.equal(ownState.reports[0].reporter.id, 'vol-priya');
  assert.equal((await volunteer.request(`/api/incidents/${own.result.id}/action`, { action: 'resolve' })).status, 200);
  assert.equal((await mo.request(`/api/incidents/${report.result.id}/action`, { action: 'acknowledge' })).status, 200);
  assert.equal((await guest.request('/api/state')).result.incidents[0].status, 'open');
  assert.equal((await guest.request(`/api/incidents/${report.result.id}/action`, { action: 'resolve' })).status, 200);
  const moReport = await mo.request('/api/reports', { zone: 'zone-a', text: 'Fictional issue submitted by Mo', reporter: { role: 'public', id: 'spoofed' } });
  assert.equal(moReport.status, 201);
  assert.equal((await mo.request('/api/state')).result.reports.find(item => item.text === 'Fictional issue submitted by Mo').reporter.role, 'mo');
  await server.whenAIIdle();
  const stolen = mo.jar.get('riverside_session');
  assert.equal((await mo.request('/api/logout', {})).status, 200);
  await mo.request('/api/session');
  mo.jar.set('riverside_session', stolen);
  assert.equal((await mo.request('/api/session')).result.user, null);

  await new Promise(resolve => server.close(resolve));
  server = createApp({ dataDir });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  assert.equal((await guest.request('/api/state')).result.reports.length, 1);
  assert.equal((await guest.request('/api/state')).result.incidents[0].status, 'resolved');
  assert.equal((await volunteer.request('/api/session')).result.user, null);
  assert.equal((await volunteer.request('/api/login', { username: 'test-priya', password: volunteerPassword })).status, 200);
  assert.equal((await volunteer.request('/api/session')).result.user.role, 'volunteer');
});

test('verified provider call allowance persists over restart and prevents excess requests', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-credit-test-'));
  const proof = { id: 'simulated-credit-test', creditOnlyConfirmed: true, providerHardStopVerified: true, verifiedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), maxCalls: 1 };
  fs.writeFileSync(path.join(dataDir, 'ai-credit-verification.json'), JSON.stringify({ jev: proof }));
  let calls = 0;
  const options = { dataDir, aiEnv: { RIVERSIDE_JEV_ENABLED: 'true', TYPESAFE_API_KEY: 'test-placeholder' }, aiFetch: async () => {
    calls++;
    return new Response(JSON.stringify({ answers: { category: { type: 'choice', choice: 'hazard', confidence: 0.9 }, urgency: { type: 'choice', choice: 'routine', confidence: 0.9 } } }));
  } };
  let server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  t.after(async () => { await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const guest = client(`http://127.0.0.1:${port}`); await guest.request('/api/session');
  assert.equal((await guest.request('/api/reports', { zone: 'zone-a', text: 'First fictional spill' })).status, 201);
  await server.whenAIIdle();
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow.incidents[0].analysis.jev.state, 'complete');
  await new Promise(resolve => server.close(resolve));
  server = createApp(options); await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  await guest.request('/api/session');
  assert.equal((await guest.request('/api/reports', { zone: 'zone-b', text: 'Another fictional spill' })).status, 201);
  await server.whenAIIdle();
  const incident = (await guest.request('/api/state')).result.incidents.at(-1);
  assert.equal(calls, 1); // The second attempted call never reaches the simulated transport.
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow.incidents.at(-1).analysis.jev.state, 'failed'); assert.equal(incident.status, 'open');
});
