const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const access = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../.riverside/recording-access.json')));
function client() {
  const tab = randomUUID(), cookies = new Map(); let csrf;
  return async (route, body) => {
    const response = await fetch(access.base + route, { headers: { 'X-Riverside-Tab': tab, Connection: 'close',
      Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '),
      ...(body ? { 'Content-Type':'application/json', 'X-CSRF-Token':csrf } : {}) },
      ...(body ? { method:'POST', body:JSON.stringify(body) } : {}) });
    for (const cookie of response.headers.getSetCookie()) { const [k,v] = cookie.split(';')[0].split('='); cookies.set(k,v); }
    const value = await response.json(); if (value.csrf) csrf = value.csrf;
    assert.ok(response.ok, `${route}: ${response.status}`); return value;
  };
}
async function main() {
  const mo = client(), priya = client(), outsider = client();
  for (const [c, credentials] of [[mo,access.credentials.mo],[priya,access.credentials.priya]]) {
    await c('/api/session'); await c('/api/login',credentials); await c('/api/session');
  }
  await outsider('/api/session');
  const state = await mo('/api/state'), moMap = await mo('/api/map-data'), volunteerMap = await priya('/api/map-data');
  const incident = state.incidents.find(i => i.id === 'I-1'), projected = moMap.incidents.find(i => i.id === 'I-1');
  assert.equal(state.reports.length,1); assert.equal(incident.assignee,'vol-priya');
  assert.equal(incident.status,'open'); assert.equal(incident.assistance.state,'accepted');
  assert.equal(projected.progress,1); assert.equal(projected.demo,true);
  assert.equal(volunteerMap.incidents.find(i => i.id === 'I-1').progress,1);
  assert.deepEqual(projected.startPosition,{latitude:-37.7958,longitude:144.9612});
  const moving = moMap.volunteers.find(v => v.id === 'vol-priya');
  assert.deepEqual(moving.position,projected.position);
  const outsideMap = await outsider('/api/map-data');
  assert.equal(outsideMap.incidents.length,0); assert.equal(outsideMap.volunteers.length,0);
  const stored = JSON.parse(fs.readFileSync(path.join(access.dataDir,'store.json')));
  const storedIncident = stored.workflow.incidents.find(i => i.id === 'I-1');
  assert.equal(storedIncident.location.latitude,-37.7992);
  assert.deepEqual(storedIncident.assistance.destination,storedIncident.location);
  const result = { checkedAt:new Date().toISOString(), incident:'I-1', reportCount:1,
    assignee:'vol-priya', finalProgress:projected.progress, statusAt100Percent:incident.status,
    assistanceAt100Percent:incident.assistance.state, moAndVolunteerProgressMatch:true,
    destinationPreserved:true, unrelatedGuestIncidents:0, unrelatedGuestVolunteers:0,
    liveAiCalls:0, gps:'fictional fixture', movement:'existing 90-second app simulator',
    recording:'Edited replay of actual browser screenshots; not a continuous screen capture' };
  fs.writeFileSync(path.resolve(__dirname,'../docs/demo/verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
