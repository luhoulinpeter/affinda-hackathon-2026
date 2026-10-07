const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../server/index.cjs');

function client(base, { jar = new Map(), tabId = randomUUID() } = {}) {
  let csrf = '';
  return {
    jar, tabId,
    async request(route, body, headers = {}) {
      const response = await fetch(base + route, {
        // A fresh connection also verifies login after an actual server restart.
        headers: { Connection: 'close', 'X-Riverside-Tab': tabId, Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
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

test('shared-cookie tabs keep independent roles, logout, CSRF, GPS ownership and expiry', async t => {
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'riverside-tabs-'));
  let time=Date.now();
  const server=createApp({dataDir,aiEnv:{},now:()=>time});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await server.whenAIIdle();await new Promise(resolve=>server.close(resolve));fs.rmSync(dataDir,{recursive:true,force:true})});
  const jar=new Map(),mo=client(base,{jar}),vol=client(base,{jar}),guest=client(base,{jar}),secondVol=client(base,{jar});
  const moPassword=randomBytes(12).toString('hex'),volPassword=randomBytes(12).toString('hex');
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/setup',{username:'mo',password:moPassword})).status,201);
  const moSession=(await mo.request('/api/session')).result;
  assert.equal((await mo.request('/api/accounts',{username:'priya',password:volPassword,volunteerId:'vol-priya'})).status,201);
  await vol.request('/api/session');
  assert.equal((await vol.request('/api/login',{username:'priya',password:volPassword})).status,200);
  const volSession=(await vol.request('/api/session')).result;
  const guestSession=(await guest.request('/api/session')).result;
  assert.equal((await mo.request('/api/session')).result.user.role,'mo');
  assert.equal(volSession.user.role,'volunteer');assert.equal(guestSession.user,null);
  assert.equal((await client(base,{jar,tabId:mo.tabId}).request('/api/session')).result.user.role,'mo','refresh keeps this tab signed in');
  assert.equal((await guest.request('/api/accounts',{username:'forged',password:'x',volunteerId:'vol-alex'},{'X-CSRF-Token':moSession.csrf})).status,403);
  const guestReport=await guest.request('/api/reports',{zone:'zone-a',text:'Shared-browser event-goer report'});
  const volReport=await vol.request('/api/reports',{zone:'zone-b',text:'Volunteer-only report'});
  assert.equal(guestReport.status,201);assert.equal(volReport.status,201);
  assert.equal((await guest.request('/api/state')).result.reports.length,1);
  assert.equal((await vol.request('/api/state')).result.reports.length,1);
  assert.equal((await mo.request('/api/state')).result.reports.length,2);
  // Knowing a tab selector alone cannot authenticate a different browser.
  const copiedCredential=jar.get(`riverside_session_${mo.tabId}`);
  const foreign=client(base,{tabId:mo.tabId});foreign.jar.set(`riverside_session_${mo.tabId}`,copiedCredential);
  assert.equal((await foreign.request('/api/session')).result.user,null);
  assert.equal((await guest.request('/api/session',undefined,{'X-Riverside-Tab':'bad'})).status,400);
  assert.equal((await guest.request('/api/session',undefined,{'X-Riverside-Tab':''})).status,400);
  // A second sign-in as the same volunteer cannot steal or pause GPS ownership.
  await secondVol.request('/api/session');await secondVol.request('/api/login',{username:'priya',password:volPassword});await secondVol.request('/api/session');
  const position={latitude:0,longitude:0,accuracy:5,capturedAt:time};
  assert.equal((await vol.request('/api/presence',{available:true,position})).status,200);
  assert.equal((await secondVol.request('/api/presence',{available:true,position})).status,409);
  assert.equal((await secondVol.request('/api/presence',{available:false})).status,409);
  await secondVol.request('/api/logout',{});
  assert.equal((await mo.request('/api/state')).result.presence.find(p=>p.id==='vol-priya').state,'available');
  assert.equal((await vol.request('/api/session')).result.user.role,'volunteer');
  // A second tab switching from volunteer to Mo must not pause the first tab.
  await secondVol.request('/api/session');await secondVol.request('/api/login',{username:'priya',password:volPassword});await secondVol.request('/api/session');
  await secondVol.request('/api/login',{username:'mo',password:moPassword});await secondVol.request('/api/session');
  assert.equal((await mo.request('/api/state')).result.presence.find(p=>p.id==='vol-priya').state,'available');
  const logout=await mo.request('/api/logout',{});
  assert.ok(logout.response.headers.getSetCookie().every(c=>c.startsWith(`riverside_session_${mo.tabId}=`)));
  assert.equal((await mo.request('/api/session')).result.user,null);
  assert.equal((await vol.request('/api/session')).result.user.role,'volunteer');
  assert.equal((await secondVol.request('/api/session')).result.user.role,'mo');
  assert.equal((await guest.request('/api/state')).result.reports[0].id,'R-1');
  await vol.request('/api/logout',{});
  assert.equal((await secondVol.request('/api/state')).result.presence.find(p=>p.id==='vol-priya').state,'paused');
  // Replay an expired real credential, and verify it cannot restore the session.
  time+=8*60*60*1000+1;
  assert.equal((await secondVol.request('/api/session')).result.user,null);
  assert.equal((await guest.request('/api/state')).result.reports.length,1);
  assert.notEqual(moSession.csrf,volSession.csrf);
});

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
  const sessionCookie = `riverside_session_${mo.tabId}`;
  const stolen = mo.jar.get(sessionCookie);
  assert.ok(stolen, 'Capture the actual tab session credential for the revocation check');
  assert.equal((await mo.request('/api/logout', {})).status, 200);
  await mo.request('/api/session');
  mo.jar.set(sessionCookie, stolen);
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

test('staff accounts accept short and long credentials while rejecting empty fields and incorrect passwords', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-credential-length-test-'));
  const server = createApp({ dataDir, aiEnv: {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const mo = client(`http://127.0.0.1:${server.address().port}`);
  await mo.request('/api/session');
  const shortPassword = randomBytes(1).toString('hex').slice(0, 1);
  assert.equal((await mo.request('/api/setup', { username: '', password: shortPassword })).status, 400);
  assert.equal((await mo.request('/api/setup', { username: 'm', password: '' })).status, 400);
  assert.equal((await mo.request('/api/setup', { username: 'm', password: shortPassword })).status, 201);
  await mo.request('/api/logout', {});
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/login', { username: 'm', password: '' })).status, 401);
  assert.equal((await mo.request('/api/login', { username: 'm', password: 'incorrect' })).status, 401);
  assert.equal((await mo.request('/api/login', { username: 'm', password: shortPassword })).status, 200);
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/session')).result.user.role, 'mo');
  const longUsername = 'v'.repeat(200);
  const longPassword = randomBytes(150).toString('hex');
  assert.equal((await mo.request('/api/accounts', { username: longUsername, password: longPassword, volunteerId: 'vol-priya' })).status, 201);
  const volunteer = client(`http://127.0.0.1:${server.address().port}`);
  await volunteer.request('/api/session');
  assert.equal((await volunteer.request('/api/login', { username: longUsername, password: longPassword })).status, 200);
  assert.equal((await volunteer.request('/api/session')).result.user.role, 'volunteer');
  assert.equal((await volunteer.request('/api/accounts', { username: 'x', password: shortPassword, volunteerId: 'vol-sam' })).status, 403);
  assert.equal((await volunteer.request('/api/login', { username: 'v'.repeat(17000), password: shortPassword })).status, 413);
});

test('verified provider call allowance persists over restart and prevents excess requests', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-credit-test-'));
  const proof = { id: 'simulated-credit-test', creditOnlyConfirmed: true, providerHardStopVerified: true, verifiedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), maxCalls: 1 };
  fs.writeFileSync(path.join(dataDir, 'ai-credit-verification.json'), JSON.stringify({ jev: proof }));
  let calls = 0;
  const options = { dataDir, aiEnv: { RIVERSIDE_JEV_ENABLED: 'true', TYPESAFE_API_KEY: 'test-placeholder' }, aiFetch: async () => {
    calls++;
    return new Response(JSON.stringify({ answers: { category: { type: 'choice', choice: 'hazard', confidence: 0.9 }, urgency: { type: 'choice', choice: 'routine', confidence: 0.9 }, sensitivity: { type: 'choice', choice: 'ordinary', confidence: 0.9 } } }));
  } };
  let server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  t.after(async () => { await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const guest = client(`http://127.0.0.1:${port}`); await guest.request('/api/session');
  assert.equal((await guest.request('/api/reports', { zone: 'zone-a', text: 'First fictional spill' })).status, 201);
  await server.whenAIIdle();
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow.incidents[0].analysis.jev.state, 'complete');
  const mo = client(`http://127.0.0.1:${port}`); await mo.request('/api/session');
  assert.equal((await mo.request('/api/setup', { username: 'credit-mo', password: 'fictional-password-123' })).status, 201);
  await mo.request('/api/session');
  assert.equal((await mo.request('/api/reset', {})).status, 200);
  assert.equal((await mo.request('/api/state')).result.reports.length, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).aiUsage['jev:simulated-credit-test'], 1);
  await new Promise(resolve => server.close(resolve));
  server = createApp(options); await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  await guest.request('/api/session');
  assert.equal((await guest.request('/api/reports', { zone: 'zone-b', text: 'Another fictional spill' })).status, 201);
  await server.whenAIIdle();
  const incident = (await guest.request('/api/state')).result.incidents.at(-1);
  assert.equal(incident.id, 'I-2'); // Counter survived a reset with no reports, then restart.
  assert.equal((await guest.request('/api/incidents/I-1/action', { action: 'resolve' })).status, 404);
  assert.equal(calls, 1); // The second attempted call never reaches the simulated transport.
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).workflow.incidents.at(-1).analysis.jev.state, 'failed'); assert.equal(incident.status, 'open');
});

test('OpenRouter allowance uses its own ledger and survives failures and restart with original reports intact', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-openrouter-test-'));
  const proof = { id: 'simulated-openrouter-test', freeOnlyConfirmed: true, liveTestApproved: true, verifiedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), maxCalls: 1 };
  fs.writeFileSync(path.join(dataDir, 'ai-credit-verification.json'), JSON.stringify({ openrouter: proof }));
  let calls = 0;
  const options = { dataDir, aiEnv: { RIVERSIDE_OPENROUTER_ENABLED: 'true', OPENROUTER_API_KEY: 'test-placeholder' }, aiFetch: async url => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions'); calls++;
    return new Response('{}', { status: 429 });
  } };
  let server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  t.after(async () => { await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const guest = client(`http://127.0.0.1:${port}`); await guest.request('/api/session');
  assert.equal((await guest.request('/api/session')).result.ai.luna.label, 'OpenRouter');
  assert.equal((await guest.request('/api/reports', { zone: 'zone-a', text: 'Original fictional spill', immediateConcern: true })).status, 201);
  await server.whenAIIdle();
  let stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8'));
  assert.equal(stored.workflow.incidents[0].analysis.luna.state, 'failed');
  assert.equal(stored.workflow.incidents[0].attention, 'urgent');
  assert.equal(stored.workflow.reports[0].text, 'Original fictional spill');
  assert.equal(stored.aiUsage['openrouter:simulated-openrouter-test'], 1);
  assert.equal(stored.aiUsage['luna:simulated-openrouter-test'], undefined);
  await new Promise(resolve => server.close(resolve));
  server = createApp(options); await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  await guest.request('/api/session');
  assert.equal((await guest.request('/api/reports', { zone: 'zone-b', text: 'Second fictional spill' })).status, 201);
  await server.whenAIIdle();
  assert.equal(calls, 1);
  stored = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8'));
  assert.equal(stored.workflow.reports.length, 2);
  assert.equal(stored.workflow.incidents.at(-1).analysis.luna.state, 'failed');
});

test('event stream signals changes without sending data, and only Mo can reset the demo', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-events-test-'));
  const server = createApp({ dataDir });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const guest = client(base), mo = client(base);
  await guest.request('/api/session');

  const stream = await fetch(`${base}/api/events?tab=${guest.tabId}`, { headers: { Cookie: [...guest.jar].map(([k,v])=>`${k}=${v}`).join('; ') } });
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
  assert.notEqual(next.result.id, report.result.id);
  assert.equal((await mo.request(`/api/incidents/${report.result.id}/action`, { action: 'resolve' })).status, 404);
  assert.equal((await mo.request('/api/state')).result.incidents[0].status, 'open');
  await reader.cancel();
});

test('deployed mode accepts only its public host, disables browser setup and uses Secure cookies', async t => {
  const http = require('node:http');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-deploy-test-'));
  const server = createApp({ dataDir, publicOrigin: 'https://riverside.test' });
  await server.ensureMo('deploy-mo', 'correct-horse-battery');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  // Simulates the host's HTTPS proxy forwarding to this server with the public Host header.
  const cookies = new Map();
  const tabId = randomUUID();
  let csrf = '';
  function send(route, body, { host = 'riverside.test', origin = 'https://riverside.test' } = {}) {
    return new Promise((resolve, reject) => {
      const headers = { Host: host, 'X-Riverside-Tab': tabId, Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') };
      if (body !== undefined) Object.assign(headers, { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Origin: origin });
      const req = http.request({ port, path: route, method: body === undefined ? 'GET' : 'POST', headers }, res => {
        let text = '';
        res.on('data', chunk => { text += chunk; });
        res.on('end', () => {
          for (const cookie of res.headers['set-cookie'] || []) { const [key, value] = cookie.split(';')[0].split('='); if (value) cookies.set(key, value); }
          const result = JSON.parse(text);
          if (result.csrf) csrf = result.csrf;
          resolve({ status: res.statusCode, result, setCookie: res.headers['set-cookie'] || [] });
        });
      });
      req.on('error', reject);
      req.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
  assert.equal((await send('/api/session', undefined, { host: 'evil.test' })).status, 403);
  const session = await send('/api/session');
  assert.equal(session.status, 200);
  assert.equal(session.result.setupRequired, false);
  assert.ok(session.setCookie.length && session.setCookie.every(cookie => cookie.includes('; Secure')));
  assert.equal((await send('/api/setup', { username: 'intruder', password: 'x'.repeat(20) })).status, 403);
  assert.equal((await send('/api/login', { username: 'deploy-mo', password: 'wrong-password-123' }, { origin: 'http://riverside.test' })).status, 403);
  assert.equal((await send('/api/login', { username: 'deploy-mo', password: 'correct-horse-battery' })).status, 200);
  assert.equal((await send('/api/session')).result.user.role, 'mo');
  await server.ensureMo('deploy-mo', 'a-new-password-456');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')).users.filter(user => user.role === 'mo').length, 1);
});


test('deployment rejects insecure or non-origin addresses before creating storage', () => {
  const dataDir = path.join(os.tmpdir(), `riverside-invalid-${randomBytes(8).toString('hex')}`);
  for (const publicOrigin of ['http://riverside.test', 'not-a-url', 'https://user:password@riverside.test', 'https://riverside.test/path', 'https://riverside.test?query=1', 'https://riverside.test#fragment']) {
    assert.throws(() => createApp({ dataDir, publicOrigin }), /PUBLIC_ORIGIN must be an HTTPS origin/);
    assert.equal(fs.existsSync(dataDir), false);
  }
});

test('reset invalidates a pending Q&A response built from cleared incident sources', { timeout: 5000 }, async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-qa-reset-'));
  let releaseAnswer, started;
  const answering = new Promise(resolve => { started = resolve; });
  const aiProviders = {
    status: () => ({}), classify: async () => ({ category: 'other', urgency: 'routine' }),
    summarise: async () => ({ summary: 'Fictional report' }), screen: async () => ({ intent: 'information' }),
    answer: () => { started(); return new Promise(resolve => { releaseAnswer = resolve; }); }
  };
  const server = createApp({ dataDir, aiProviders });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { releaseAnswer?.({ answer: 'Obsolete queue', sources: ['permitted-overview'], unknown: false }); await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const mo = client(base), guest = client(base);
  await mo.request('/api/session'); await guest.request('/api/session');
  await mo.request('/api/setup', { username: 'reset-mo', password: 'fictional-password-123' });
  await mo.request('/api/session');
  await guest.request('/api/reports', { zone: 'zone-a', text: 'Fictional old report' });
  const pending = guest.request('/api/qa', { question: 'What is the report status?' });
  await answering;
  assert.equal((await mo.request('/api/reset', {})).status, 200);
  releaseAnswer({ answer: 'Obsolete queue', sources: ['permitted-overview'], unknown: false });
  const response = await pending;
  assert.equal(response.status, 403);
  assert.equal(JSON.stringify(response.result).includes('Obsolete queue'), false);
  assert.equal((await guest.request('/api/state')).result.reports.length, 0);
});
