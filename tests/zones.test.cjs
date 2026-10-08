const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateZones, sampleZones } = require('../server/zones.cjs');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { createApp } = require('../server/index.cjs');

test('zone validation keeps stable history identifiers, rejects invalid coordinates/removal and whitelists fields', () => {
  const existing = sampleZones(), newZone = { name: 'Test zone', description: 'Fictional fixture', latitude: 0, longitude: 0, active: true, privateData: 'excluded' };
  const result = validateZones({ zones: [...existing, newZone] }, existing);
  assert.match(result.at(-1).id, /^zone-/); assert.equal(result.at(-1).privateData, undefined);
  assert.deepEqual(result.slice(0,3).map(z => z.id), existing.map(z => z.id));
  for (const invalid of [[], existing.slice(1), existing.map(z => ({ ...z, active: false })), [...existing, { ...newZone, latitude: 91 }], [...existing, { ...newZone, longitude: null }], [...existing, { ...newZone, id: 'zone-unknown' }], [...existing, { ...existing[0] }], [...existing, { ...newZone, name: '' }]]) {
    assert.throws(() => validateZones({ zones: invalid }, existing));
  }
  const retired = validateZones({ zones: existing.map((z,i) => ({...z,active:i!==0})) },existing);
  assert.equal(retired[0].id, existing[0].id); assert.equal(retired[0].active, false);
});
function client(base) {
  const cookies = new Map(), tab = randomUUID(); let csrf;
  return async (route, body, headers = {}) => {
    const res = await fetch(base + route, { headers: { Connection:'close', 'X-Riverside-Tab':tab, Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '), ...(body === undefined ? {} : {'Content-Type':'application/json','X-CSRF-Token':csrf}), ...headers }, ...(body === undefined ? {} : {method:'POST',body:JSON.stringify(body)}) });
    for (const c of res.headers.getSetCookie()) { const [k,v] = c.split(';')[0].split('='); cookies.set(k,v); }
    const data = await res.json(); if(data.csrf)csrf=data.csrf; return {status:res.status,data};
  };
}
test('Mo zones are public, persist after restart, and snapshot approximate reports without leaking GPS to AI', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'riverside-zones-')), inputs = [];
  const options = { dataDir:dir, aiEnv:{}, aiProviders: { status:()=>({}), classify:async r => {inputs.push(r);return {category:r.category,urgency:'routine',sensitivity:'ordinary'}}, summarise:async()=>({summary:'Simulated zone report'}) } };
  let server = createApp(options); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await server.whenAIIdle();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})});
  let base = `http://127.0.0.1:${server.address().port}`;
  const mo=client(base),guest=client(base),outsider=client(base),vol=client(base);
  for(const c of [mo,guest,outsider,vol])await c('/api/session');
  await mo('/api/setup',{username:'manager',password:randomBytes(12).toString('hex')});await mo('/api/session');
  const password=randomBytes(12).toString('hex'); await mo('/api/accounts',{username:'priya',password,volunteerId:'vol-priya'});await vol('/api/login',{username:'priya',password});await vol('/api/session');
  const initial=(await guest('/api/zones')).data;
  assert.equal(initial.zones.length,3);
  for(const c of [mo,guest,vol])assert.equal((await c('/api/map-data')).data.zones.length,3);
  const config={version:initial.version,zones:[...initial.zones,{name:'Fictional south lawn',description:'Test reference point',latitude:-37.8002,longitude:144.9621,active:true}]};
  assert.equal((await guest('/api/zones',config)).status,403);assert.equal((await vol('/api/zones',config)).status,403);
  assert.equal((await mo('/api/zones',config,{'X-CSRF-Token':'invalid'})).status,403);
  assert.equal((await mo('/api/zones',config,{Origin:'https://unrelated.invalid'})).status,403);
  const saved=await mo('/api/zones',config); assert.equal(saved.status,200);assert.equal(saved.data.version,2);
  assert.equal((await mo('/api/zones',config)).status,409);
  const zone=saved.data.zones.at(-1);
  assert.equal((await guest('/api/state')).data.eventZones.zones.at(-1).id,zone.id);
  const report=await guest('/api/reports',{zone:zone.id,category:'other',text:'Fictional report in the south lawn.',zoneLocation:{latitude:1,longitude:1},zoneName:'Forged label'});
  assert.equal(report.status,201);await server.whenAIIdle();
  let incident=(await mo('/api/state')).data.incidents.find(i=>i.id===report.data.id);
  assert.equal(incident.zoneName,zone.name);assert.equal(incident.zoneLocation.latitude,zone.latitude);
  assert.equal(incident.location,undefined);assert.equal(incident.assistance,undefined);
  let pin=(await mo('/api/map-data')).data.incidents.find(i=>i.id===incident.id);
  assert.deepEqual(pin.position,{latitude:zone.latitude,longitude:zone.longitude});assert.equal(pin.locationKind,'zone');assert.equal(pin.progress,null);assert.equal(pin.walkingEstimate,undefined);
  assert.equal((await outsider('/api/map-data')).data.incidents.length,0);
  assert.ok((await vol('/api/map-data')).data.incidents.some(i=>i.id===incident.id));
  assert.ok(inputs.every(r=>!JSON.stringify(r).includes('latitude')&&!JSON.stringify(r).includes('longitude')));
  const moved={version:saved.data.version,zones:saved.data.zones.map(z=>z.id===zone.id?{...z,name:'Renamed lawn',latitude:-37.8004}:z)};
  assert.equal((await mo('/api/zones',moved)).status,200);
  incident=(await mo('/api/state')).data.incidents.find(i=>i.id===report.data.id);assert.equal(incident.zoneName,zone.name);assert.equal(incident.zoneLocation.latitude,zone.latitude);
  const next=await guest('/api/reports',{zone:zone.id,category:'other',text:'Fictional report after the zone moved.'});assert.equal(next.status,201);
  await server.whenAIIdle();assert.equal((await mo('/api/state')).data.incidents.find(i=>i.id===next.data.id).zoneLocation.latitude,-37.8004);
  const gps={latitude:-37.801,longitude:144.961,accuracy:8,capturedAt:Date.now()};
  const precise=await guest('/api/reports',{zone:zone.id,category:'other',text:'Fictional GPS report.',reportLocation:true,position:gps});assert.equal(precise.status,201);
  const gpsPin=(await mo('/api/map-data')).data.incidents.find(i=>i.id===precise.data.id);assert.equal(gpsPin.locationKind,'gps');assert.equal(gpsPin.position.latitude,gps.latitude);
  assert.equal((await mo('/api/state')).data.incidents.find(i=>i.id===precise.data.id).zoneLocation,undefined);
  const retired={version:3,zones:moved.zones.map(z=>z.id===zone.id?{...z,active:false}:z)};
  assert.equal((await mo('/api/zones',retired)).status,200);
  assert.equal((await guest('/api/reports',{zone:zone.id,text:'Retired',category:'other'})).status,400);
  assert.equal((await guest('/api/reports',{zone:'zone-unknown',text:'Unknown',category:'other'})).status,400);
  assert.equal((await guest('/api/map-data')).data.zones.some(z=>z.id===zone.id),false);
  pin=(await mo('/api/map-data')).data.incidents.find(i=>i.id===report.data.id);assert.equal(pin.position.latitude,zone.latitude);
  await server.whenAIIdle();await new Promise(r=>server.close(r));
  server=createApp(options);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${server.address().port}`;const restarted=client(base);await restarted('/api/session');
  const persisted=(await restarted('/api/zones')).data;assert.equal(persisted.version,4);assert.equal(persisted.zones.at(-1).active,false);
  const stored=JSON.parse(fs.readFileSync(path.join(dir,'store.json'),'utf8'));
  assert.equal(stored.workflow.reports.length,3);assert.equal(stored.workflow.incidents[0].zoneName,zone.name);
});
