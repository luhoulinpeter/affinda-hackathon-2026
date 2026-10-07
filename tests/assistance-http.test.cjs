const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../server/index.cjs');
function client(base) {
  const cookies = new Map(); let csrf; const tabId = randomUUID();
  return { async request(route, body, extra = {}) {
    const response = await fetch(base + route, { headers: { Connection: 'close', 'X-Riverside-Tab': tabId, Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }), ...extra }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    for (const cookie of response.headers.getSetCookie()) { const [key,value] = cookie.split(';')[0].split('='); if (value) cookies.set(key,value); else cookies.delete(key); }
    const result = await response.json(); if (result.csrf) csrf = result.csrf;
    return { status: response.status, result };
  } };
}

test('HTTP assistance is idempotent, permission filtered and independent of AI; station lookup creates no incident', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-assistance-http-'));
  let capturedSources, time = Date.now(); const prompts = [];
  const aiProviders = { status: () => ({}), classify: async report => { prompts.push(report); throw Error('Offline'); }, summarise: async report => { prompts.push(report); throw Error('Offline'); }, screen: async question => ({ intent: question === 'Where is first aid?' ? 'first_aid_information' : 'information' }), answer: async (question, history, sources) => { capturedSources = sources; return { answer: 'See the current report.', sources: ['I-1'], unknown: false }; } };
  let server = createApp({ dataDir, aiEnv: {}, aiProviders, now: () => time });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port, base = `http://127.0.0.1:${port}`;
  t.after(async () => { await server.whenAIIdle(); await new Promise(resolve => server.close(resolve)); fs.rmSync(dataDir, { recursive:true, force:true }); });
  const mo = client(base), guest = client(base), outsider = client(base), priya = client(base), alex = client(base);
  for (const c of [mo, guest, outsider, priya, alex]) await c.request('/api/session');
  assert.equal((await mo.request('/api/setup', { username: 'm', password: randomBytes(12).toString('hex') })).status, 201); await mo.request('/api/session');
  for (const [id,c] of [['priya',priya], ['alex',alex]]) {
    const password = randomBytes(12).toString('hex');
    assert.equal((await mo.request('/api/accounts', { username:id, password, volunteerId:`vol-${id}` })).status, 201);
    assert.equal((await c.request('/api/login', { username:id, password })).status, 200); await c.request('/api/session');
  }
  const pos = latitude => ({ latitude, longitude:0, accuracy:10, capturedAt:time });
  assert.equal((await guest.request('/api/presence', { available:true, position:pos(0) })).status, 403);
  assert.equal((await guest.request('/api/stations', { enabled:true, stations:[] })).status, 403);
  const seededStations = (await guest.request('/api/first-aid', {})).result;
  assert.equal(seededStations.outcome, 'first_aid');
  assert.equal(seededStations.stations.length, 3);
  assert.ok(seededStations.stations.every(s => s.fictional));
  assert.equal((await mo.request('/api/stations', { enabled:true, stations:[{ name:'Fictional tent', description:'Test supplies only', latitude:0, longitude:0 }] })).status, 200);
  assert.equal((await guest.request('/api/first-aid', { position:pos(0) })).result.stations[0].distanceMetres, 0);
  assert.equal((await guest.request('/api/qa', { question:'Where is first aid?' })).result.outcome, 'first_aid');
  assert.equal((await mo.request('/api/state')).result.incidents.length, 0);
  await priya.request('/api/presence', { available:true, position:pos(.001) });
  await alex.request('/api/presence', { available:true, position:pos(.002) });
  const input = { zone:'zone-a', category:'medical', text:'Fictional scrape; request a general helper', immediateConcern:true, requestAssistance:true, requestId:'same-request-reference', position:pos(0) };
  assert.equal((await guest.request('/api/reports', { ...input, requestId:'invalid-position-reference', position:pos(91) })).status, 400);
  const pair = await Promise.all([guest.request('/api/reports',input), guest.request('/api/reports',input)]);
  assert.deepEqual(pair.map(r=>r.status).sort(), [200,201]); assert.equal(pair[0].result.id, pair[1].result.id);
  await server.whenAIIdle();
  const held = (await mo.request('/api/state')).result.incidents[0];
  assert.equal(held.sensitivityReview, 'unavailable'); assert.equal(held.assistance.offers.length, 0);
  assert.equal((await mo.request(`/api/incidents/${pair[0].result.id}/sensitivity`, { sensitive:false, reason:'Mo reviewed the fictional scrape after AI was unavailable.' })).status,200);
  let all = (await mo.request('/api/state')).result;
  assert.equal(all.incidents.length, 1); assert.equal(all.incidents[0].assistance.offers.length, 1); assert.equal(all.incidents[0].attention,'urgent');
  assert.equal(all.incidents[0].assistance.destination.latitude, 0); assert.equal(all.presence.length,3);
  const own = (await guest.request('/api/state')).result;
  assert.equal(own.incidents[0].assistance.destination, undefined); assert.deepEqual(own.incidents[0].assistance.offers, []); assert.deepEqual(own.presence, []);
  assert.equal((await outsider.request('/api/state')).result.incidents.length, 0);
  assert.equal((await alex.request('/api/state')).result.incidents.length, 0);
  const offered = (await priya.request('/api/state')).result;
  assert.equal(offered.incidents[0].assistance.destination.latitude,0); assert.equal(offered.presence.length,1);
  const offer = all.incidents[0].assistance.offers[0];
  assert.equal((await alex.request(`/api/incidents/I-1/offers/${offer.id}`, { decision:'accept' })).status, 404);
  assert.equal((await outsider.request('/api/incidents/I-1/assistance', { action:'withdraw' })).status, 404);
  const acceptances = await Promise.all([priya.request(`/api/incidents/I-1/offers/${offer.id}`, { decision:'accept' }), priya.request(`/api/incidents/I-1/offers/${offer.id}`, { decision:'accept' })]);
  assert.deepEqual(acceptances.map(r=>r.status).sort(), [200,409]);
  assert.equal((await guest.request('/api/state')).result.incidents[0].assignee,'vol-priya');
  await priya.request('/api/incidents/I-1/assistance',{action:'arrive'});
  assert.equal((await mo.request('/api/state')).result.incidents[0].assistance.state,'arrived');
  await guest.request('/api/qa',{question:'Report status?'});
  assert.ok(!JSON.stringify(capturedSources).includes('latitude')); assert.ok(!JSON.stringify(capturedSources).includes('longitude'));
  assert.ok(prompts.every(p=>!JSON.stringify(p).includes('latitude')));
  assert.equal((await guest.request('/api/incidents/I-1/action',{action:'resolve'})).status,200);
  all=(await mo.request('/api/state')).result;
  assert.equal(all.incidents[0].assistance.state,'completed'); assert.equal(all.incidents[0].assistance.destination,undefined);
  assert.equal(all.presence.find(p=>p.id==='vol-priya').state,'paused');
  const next = await guest.request('/api/reports',{...input,requestId:'next-request-reference'}); const nextId=next.result.id;
  await server.whenAIIdle();
  await mo.request(`/api/incidents/${nextId}/sensitivity`,{sensitive:false,reason:'Mo reviewed the second fictional report.'});
  all=(await mo.request('/api/state')).result; const nextOffer=all.incidents.find(i=>i.id===nextId).assistance.offers[0];
  assert.equal(nextOffer.volunteerId,'vol-alex');
  await alex.request('/api/logout',{});
  assert.equal((await mo.request('/api/state')).result.incidents.find(i=>i.id===nextId).assistance.state,'unavailable');
  assert.equal((await guest.request(`/api/incidents/${nextId}/assistance`,{action:'withdraw'})).status,200);
  for (const [account,role] of [[mo,'mo'],[priya,'volunteer']]) {
    const submission=await account.request('/api/reports',{...input,requestId:`${role}-assistance-reference`});
    assert.equal(submission.status,201);
    const visible=(await mo.request('/api/state')).result;
    const incident=visible.incidents.find(i=>i.id===submission.result.id);
    assert.equal(visible.reports.find(r=>incident.reportIds.includes(r.id)).reporter.role,role);
    assert.equal((await account.request(`/api/incidents/${submission.result.id}/assistance`,{action:'withdraw'})).status,200);
  }
  assert.ok(!JSON.stringify(JSON.parse(fs.readFileSync(path.join(dataDir,'store.json'),'utf8')).workflow.incidents).includes('latitude'));
  await server.whenAIIdle(); await new Promise(resolve=>server.close(resolve));
  server=createApp({dataDir,aiEnv:{},aiProviders,now:()=>time}); await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  const after=(await guest.request('/api/state')).result;
  assert.equal(after.incidents.length,2); assert.equal(after.incidents[1].status,'open');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir,'store.json'),'utf8')).workflow.incidents.length,4);
});
