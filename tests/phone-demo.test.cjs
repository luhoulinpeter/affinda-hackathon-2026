const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { randomBytes, randomUUID } = require('node:crypto');
const { createPhoneDemo } = require('../server/phone-demo.cjs');

test('phone launcher requires an existing Mo account and a valid HTTPS origin', t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-phone-preflight-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  assert.throws(() => createPhoneDemo({ dataDir, origin: 'https://demo.test' }), /Mo account locally/);
  fs.writeFileSync(path.join(dataDir, 'store.json'), JSON.stringify({ users: [] }));
  assert.throws(() => createPhoneDemo({ dataDir, origin: 'https://demo.test' }), /Mo account locally/);
  fs.writeFileSync(path.join(dataDir, 'store.json'), JSON.stringify({ users: [{ role: 'mo' }] }));
  assert.throws(() => createPhoneDemo({ dataDir }), /HTTPS origin/);
  assert.throws(() => createPhoneDemo({ dataDir, origin: 'http://demo.test' }), /HTTPS origin/);
});

test('phone server preserves accounts, applies secure host/cookie/setup checks and chooses polling', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-phone-'));
  const originalUsers = [{ username: 'existing-mo', role: 'mo', actorId: 'mo', password: { salt: 'unchanged', hash: 'unchanged' } }];
  fs.writeFileSync(path.join(dataDir, 'store.json'), JSON.stringify({ users: originalUsers, cookieSecret: randomBytes(32).toString('hex'), workflow: {} }));
  const server = createPhoneDemo({ dataDir, origin: 'https://demo.test', aiEnv: {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const headers = { Host: 'demo.test', 'X-Riverside-Tab': randomUUID() };
  async function request(route, body, extra = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: route, method: body ? 'POST' : 'GET',
        headers: { ...headers, ...extra, ...(body ? { 'Content-Type': 'application/json' } : {}) } }, res => {
        let raw = ''; res.on('data', chunk => raw += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, raw }));
      }); req.on('error', reject); req.end(body ? JSON.stringify(body) : undefined);
    });
  }
  const response = await request('/api/session');
  assert.equal(response.status, 200);
  const session = JSON.parse(response.raw);
  assert.equal(session.setupRequired, false); assert.equal(session.liveUpdates, 'polling');
  assert.ok(response.headers['set-cookie'].every(cookie => cookie.includes('; Secure') && cookie.includes('; HttpOnly')));
  assert.equal((await request('/api/session', undefined, { Host: 'unexpected.test' })).status, 403);
  assert.equal((await request('/api/session', undefined, { Origin: 'https://unexpected.test' })).status, 403);
  headers.Cookie = response.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
  headers['X-CSRF-Token'] = session.csrf;
  assert.equal((await request('/api/setup', { username: 'attacker', password: 'fictional' }, { Origin: 'https://demo.test' })).status, 403);
  for (const route of ['/.env', '/.riverside/store.json', '/server/index.cjs', '/.git/config']) assert.equal((await request(route)).status, 404);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'))).users, originalUsers);
});
