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
  let server = createApp({ dataDir });
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

  await volunteer.request('/api/session');
  assert.equal((await volunteer.request('/api/login', { username: 'test-priya', password: 'incorrect-password' })).status, 401);
  assert.equal((await volunteer.request('/api/login', { username: 'test-priya', password: volunteerPassword, role: 'mo' })).status, 200);
  assert.equal((await volunteer.request('/api/session')).result.user.role, 'volunteer');
  assert.equal((await volunteer.request('/api/state')).result.reports.length, 0);
  assert.equal((await volunteer.request('/api/accounts', { username: 'test-sam', password, volunteerId: 'vol-sam' })).status, 403);
  assert.equal((await volunteer.request(`/api/incidents/${report.result.id}/action`, { action: 'resolve' })).status, 404);
  const own = await volunteer.request('/api/reports', { zone: 'zone-a', category: 'other', text: 'Fictional volunteer report', volunteerId: 'vol-alex' });
  const ownState = (await volunteer.request('/api/state')).result;
  assert.equal(ownState.reports[0].reporter.id, 'vol-priya');
  assert.equal((await volunteer.request(`/api/incidents/${own.result.id}/action`, { action: 'resolve' })).status, 200);
  assert.equal((await mo.request(`/api/incidents/${report.result.id}/action`, { action: 'acknowledge' })).status, 200);
  assert.equal((await guest.request('/api/state')).result.incidents[0].status, 'open');
  assert.equal((await guest.request(`/api/incidents/${report.result.id}/action`, { action: 'resolve' })).status, 200);
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

test('event stream signals changes without sending data, and only Mo can reset the demo', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-events-test-'));
  const server = createApp({ dataDir });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const guest = client(base), mo = client(base);
  await guest.request('/api/session');

  const stream = await fetch(`${base}/api/events`);
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get('content-type'), /^text\/event-stream/);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  async function readUntil(pattern) {
    let text = '';
    while (!pattern.test(text)) {
      const { value, done } = await reader.read();
      if (done) throw new Error(`Stream ended before ${pattern}`);
      text += decoder.decode(value);
    }
    return text;
  }
  await readUntil(/retry: 3000/);
  const report = await guest.request('/api/reports', { zone: 'zone-b', category: 'hazard', text: 'Fictional spill' });
  assert.equal(report.status, 201);
  const event = await readUntil(/event: state\ndata: \{\}\n\n/);
  assert.ok(!event.includes('Fictional spill'));

  assert.equal((await guest.request('/api/reset', {})).status, 403);
  assert.equal((await guest.request('/api/state')).result.reports.length, 1);
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/setup', { username: 'test-mo', password: randomBytes(24).toString('hex') })).status, 201);
  assert.equal((await mo.request('/api/session')).result.user.role, 'mo');
  assert.equal((await mo.request('/api/reset', {})).status, 200);
  await readUntil(/event: state/);
  assert.equal((await mo.request('/api/state')).result.incidents.length, 0);
  assert.equal((await mo.request('/api/session')).result.user.role, 'mo');
  const next = await guest.request('/api/reports', { zone: 'zone-a', category: 'other', text: 'Fictional report after reset' });
  assert.equal(next.result.id, 'I-1');
  await reader.cancel();
});
