const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const { createApp } = require('../server/index.cjs');
function client(base) {
  const cookies = new Map(), tab = randomUUID(); let csrf;
  return async (route,body) => {
    const response = await fetch(base+route,{ headers:{Connection:'close','X-Riverside-Tab':tab,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf})},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)}) });
    for(const cookie of response.headers.getSetCookie()) { const [k,v]=cookie.split(';')[0].split('=');if(v)cookies.set(k,v);else cookies.delete(k); }
    const data=await response.json();if(data.csrf)csrf=data.csrf;
    return {status:response.status,data};
  };
}
test('Mo sees all map incidents, busy Priya still sees new pins, public sees no GPS, and map data contains no report text',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'riverside-map-http-'));
  let time=Date.now();
  const aiProviders={status:()=>({}),classify:async()=>({category:'other',urgency:'routine',sensitivity:'ordinary'}),summarise:async()=>({summary:'Simulated summary'})};
  let routeCalls=0;
  const server=createApp({dataDir,aiProviders,aiEnv:{GOOGLE_MAPS_API_KEY:'test-browser-map-key',TYPESAFE_API_KEY:'test-private-ai-key',GOOGLE_ROUTES_API_KEY:'test-private-route-key',RIVERSIDE_GOOGLE_ROUTES_ENABLED:'true',RIVERSIDE_GOOGLE_ROUTES_MAX_CALLS:'1'},routesFetch:async()=>{routeCalls++;return {ok:true,json:async()=>({routes:[{duration:'89s'}]})}},now:()=>time});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await server.whenAIIdle();await new Promise(resolve=>server.close(resolve));fs.rmSync(dataDir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`;
  const mo=client(base),priya=client(base),guest=client(base),other=client(base);
  for(const c of [mo,priya,guest,other])await c('/api/session');
  await mo('/api/setup',{username:'mo',password:randomBytes(10).toString('hex')});await mo('/api/session');
  const password=randomBytes(10).toString('hex');await mo('/api/accounts',{username:'priya',password,volunteerId:'vol-priya'});
  await priya('/api/login',{username:'priya',password});await priya('/api/session');
  const pos=(latitude=-37.798)=>({latitude,longitude:144.961,accuracy:10,capturedAt:time});
  await priya('/api/presence',{available:true,position:pos()});
  const submit=(c,ref,latitude)=>c('/api/reports',{zone:'zone-a',category:'other',text:'Private fictional report body',requestAssistance:true,requestId:ref,position:pos(latitude)});
  const a=await submit(guest,'map-request-a',-37.799);assert.equal(a.status,201);
  const initial=(await mo('/api/state')).data.incidents[0];
  assert.equal((await priya(`/api/incidents/${a.data.id}/offers/${initial.assistance.offers[0].id}`,{decision:'accept'})).status,200);
  const b=await submit(other,'map-request-b',-37.797);assert.equal(b.status,201);
  for(const c of [mo,priya]) {
    const map=(await c('/api/map-data')).data;
    assert.equal(map.incidents.length,2);assert.ok(map.incidents.every(i=>i.position));
    assert.equal(map.incidents[0].assignee,'vol-priya');assert.equal(map.incidents[1].assignee,null);
    assert.equal(map.incidents[0].walkingEstimate.label,'Up to 2 minutes');assert.equal(map.incidents[0].walkingEstimate.source,'Google Maps');
    assert.equal(map.incidents[1].walkingEstimate,undefined);assert.equal(routeCalls,1);
    assert.equal(map.volunteers.find(v=>v.id==='vol-priya').state,'busy');
    assert.equal(JSON.stringify(map).includes('Private fictional report body'),false);
    assert.equal(JSON.stringify(map).includes('request-a'),false);
    assert.equal(JSON.stringify(map).includes('test-private-ai-key'),false);
    assert.equal(JSON.stringify(map).includes('test-private-route-key'),false);
  }
  assert.equal((await priya('/api/state')).data.incidents.length,1); // pin access does not widen detail access
  for(const c of [guest,other]) {
    const map=(await c('/api/map-data')).data;
    assert.equal(map.incidents.length,c===guest?1:0);assert.deepEqual(map.volunteers,[]);assert.equal(map.stations.length,3);
    if(c===guest){assert.equal(map.incidents[0].walkingEstimate.label,'Up to 2 minutes');assert.equal(map.incidents[0].id,a.data.id);assert.equal(map.incidents[0].startPosition.latitude,-37.798);assert.equal(map.incidents[0].position.latitude,-37.799);}
    assert.equal((await c('/api/state')).data.incidents[0].assistance.initialDistanceMetres,undefined);
  }
  const config=(await guest('/api/maps-config')).data;
  assert.equal(config.key,'test-browser-map-key');assert.equal(JSON.stringify(config).includes('test-private-ai-key'),false);assert.equal(JSON.stringify(config).includes('test-private-route-key'),false);
  const html=await fetch(base,{headers:{Connection:'close'}}),body=await html.text();
  const nonce=body.match(/<style nonce="([^"]+)"/)[1];
  assert.equal(html.headers.get('permissions-policy'),'geolocation=(self)');
  assert.ok(html.headers.get('content-security-policy').includes(`'nonce-${nonce}'`));
  assert.ok(html.headers.get('content-security-policy').includes('https://*.googleapis.com'));
  assert.ok(!body.includes('test-browser-map-key')); // supplied only by explicit config response
  assert.equal((await fetch(base+'/.env',{headers:{Connection:'close'}})).status,404);
  time+=61000;
  const stale=(await mo('/api/map-data')).data;assert.ok(stale.volunteers.every(v=>v.position===undefined));assert.equal(stale.incidents[0].walkingEstimate.state,'ready');assert.equal(stale.incidents[0].walkingEstimate.label,'Up to 2 minutes');assert.equal(routeCalls,1);
  await priya('/api/presence',{available:true,start:false,position:pos(-37.797)});
  assert.equal((await mo('/api/map-data')).data.incidents[0].walkingEstimate.label,'Up to 2 minutes');assert.equal(routeCalls,1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir,'store.json'))).routesUsage,1);
  await guest(`/api/incidents/${a.data.id}/assistance`,{action:'withdraw'});
  assert.equal((await mo('/api/map-data')).data.incidents.find(i=>i.id===a.data.id).position,undefined);
  await mo('/api/stations',{enabled:false,stations:[{name:'Saved demo station',description:'Preserve operator settings',latitude:0,longitude:0}]});
  assert.deepEqual((await guest('/api/map-data')).data.stations,[]);
});

test('existing disabled stations are preserved, and no-key HTML retains restrictive CSP',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'riverside-map-saved-'));
  const stations={enabled:false,stations:[{id:'existing',name:'Existing demo station',description:'Preserve this',latitude:0,longitude:0,fictional:true}]};
  fs.writeFileSync(path.join(dataDir,'store.json'),JSON.stringify({users:[],workflow:{},cookieSecret:randomBytes(32).toString('hex'),helpStations:stations}));
  const server=createApp({dataDir,aiEnv:{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await server.whenAIIdle();await new Promise(resolve=>server.close(resolve));fs.rmSync(dataDir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`,c=client(base);await c('/api/session');
  assert.equal((await c('/api/maps-config')).data.key,'');
  assert.deepEqual((await c('/api/map-data')).data.stations,[]);
  const response=await fetch(base,{headers:{Connection:'close'}});
  assert.equal(response.headers.get('content-security-policy').includes('googleapis'),false);
  assert.equal(response.headers.get('content-security-policy').includes('unsafe-inline'),false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dataDir,'store.json'),'utf8')).helpStations,stations);
});

test('a delayed walking result cannot restore a resolved journey or return staff maps after sign-out',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'riverside-walking-race-'));
  let finishRoute,startedResolve,routeStarted=new Promise(r=>startedResolve=r),calls=0;
  const aiProviders={status:()=>({}),classify:async()=>({category:'other',urgency:'routine',sensitivity:'ordinary'}),summarise:async()=>({summary:'Simulated'})};
  const server=createApp({dataDir,aiProviders,aiEnv:{GOOGLE_ROUTES_API_KEY:'private',RIVERSIDE_GOOGLE_ROUTES_ENABLED:'true',RIVERSIDE_GOOGLE_ROUTES_MAX_CALLS:'2'},routesFetch:()=>{calls++;startedResolve();return new Promise(r=>finishRoute=r)}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await server.whenAIIdle();await new Promise(r=>server.close(r));fs.rmSync(dataDir,{recursive:true,force:true})});
  const base=`http://127.0.0.1:${server.address().port}`,mo=client(base),priya=client(base),guest=client(base);
  for(const c of [mo,priya,guest])await c('/api/session');
  await mo('/api/setup',{username:'mo',password:'fictional-mo'});await mo('/api/session');
  await mo('/api/accounts',{username:'priya',password:'fictional-priya',volunteerId:'vol-priya'});await priya('/api/login',{username:'priya',password:'fictional-priya'});await priya('/api/session');
  const position={latitude:-37.798,longitude:144.961,accuracy:5,capturedAt:Date.now()};await priya('/api/presence',{available:true,position});
  async function assign(ref) {
    const report=await guest('/api/reports',{zone:'zone-a',category:'other',text:'Fictional walking-race report',requestAssistance:true,requestId:ref,position:{...position,capturedAt:Date.now(),latitude:-37.799}});
    await server.whenAIIdle();const i=(await mo('/api/state')).data.incidents.find(i=>i.id===report.data.id);
    assert.equal((await priya(`/api/incidents/${i.id}/offers/${i.assistance.offers[0].id}`,{decision:'accept'})).status,200);return i.id;
  }
  const id=await assign('walking-race-one'),pending=guest('/api/map-data');await routeStarted;
  await guest(`/api/incidents/${id}/action`,{action:'resolve'});finishRoute({ok:true,json:async()=>({routes:[{duration:'60s'}]})});
  assert.deepEqual((await pending).data.incidents,[]);
  routeStarted=new Promise(r=>startedResolve=r);await assign('walking-race-two');const staffPending=mo('/api/map-data');await routeStarted;
  await mo('/api/logout',{});finishRoute({ok:true,json:async()=>({routes:[{duration:'60s'}]})});
  assert.equal((await staffPending).status,401);assert.equal(calls,2);
});
