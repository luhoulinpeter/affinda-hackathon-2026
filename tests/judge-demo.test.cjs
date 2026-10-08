const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startJudgeDemo, credentials, client } = require('../scripts/judge-demo.cjs');
const { packageFiles, buildZip } = require('../scripts/package-submission.cjs');

test('keyless judge setup has three accounts, real permissions/workflow, simulated providers, and persistent isolated records',async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(),'hi-vis-judge-test-')); let time = Date.now(), server;
  t.after(async () => { if (server?.listening) await new Promise(r => server.close(r)); fs.rmSync(dataDir,{recursive:true,force:true}); });
  let demo = await startJudgeDemo({dataDir,port:0,now:()=>time}); server = demo.server;
  const mo = client(demo.base), priya = client(demo.base), alex = client(demo.base), guest = client(demo.base), other = client(demo.base);
  for (const [c,name] of [[mo,'mo'],[priya,'priya'],[alex,'alex']]) { const session=await c('/api/session'); assert.equal(session.setupRequired,false); await c('/api/login',credentials[name]); assert.equal((await c('/api/session')).user.role,name==='mo'?'mo':'volunteer'); }
  await guest('/api/session'); await other('/api/session');
  const pos = {latitude:-37.7958,longitude:144.9612,accuracy:8,capturedAt:time};
  await priya('/api/presence',{available:true,start:true,position:pos});
  const first = await guest('/api/reports',{zone:'current-location',category:'hazard',text:'Fictional spill near the water tent.',reportLocation:true,position:{...pos,latitude:-37.7992,longitude:144.962}});
  await server.whenAIIdle();
  assert.equal((await mo('/api/state')).incidents.length,1);
  const recommendation = await mo(`/api/incidents/${first.id}/assignment-recommendation`,{}); assert.deepEqual(recommendation.recommendations.map(v=>v.id),['vol-priya']);
  await mo(`/api/incidents/${first.id}/assignment-offer`,{volunteerId:'vol-priya'});
  const offered = (await priya('/api/state')).incidents.find(i=>i.id===first.id);
  await priya(`/api/incidents/${first.id}/offers/${offered.assistance.offers[0].id}`,{decision:'accept'});
  await mo(`/api/incidents/${first.id}/demo-journey`,{action:'start'});
  time += 45000;
  for (const c of [mo,priya,guest]) { const map=await c('/api/map-data'); assert.equal(map.incidents.find(i=>i.id===first.id).progress,.5); }
  assert.deepEqual((await guest('/api/map-data')).volunteers,[]);
  assert.deepEqual((await other('/api/map-data')).incidents,[]);
  const second = await other('/api/reports',{zone:'zone-b',category:'other',text:'Another fictional ordinary incident.'}); await server.whenAIIdle();
  assert.equal((await mo('/api/map-data')).incidents.length,2); assert.equal((await priya('/api/map-data')).incidents.length,2);
  assert.equal((await priya('/api/state')).incidents.some(i=>i.id===second.id),false);
  await alex('/api/presence',{available:true,start:true,position:{...pos,capturedAt:time}});
  assert.ok((await alex('/api/available-incidents')).incidents.some(i=>i.id===second.id));
  await alex(`/api/incidents/${second.id}/claim`,{});
  const sensitive = await guest('/api/reports',{zone:'zone-c',category:'other',text:'Fictional sensitive information.',sensitive:true}); await server.whenAIIdle();
  assert.equal((await alex('/api/available-incidents')).incidents.some(i=>i.id===sensitive.id),false);
  assert.equal((await priya('/api/state')).incidents.some(i=>i.id===sensitive.id),false);
  const qa = await mo('/api/qa',{question:'Current incident status?'}); assert.equal(qa.outcome,'answer'); assert.match(qa.answer,/Simulated AI/);
  const draft = await guest('/api/qa',{question:'There is a spill beside the water tent'}); assert.equal(draft.outcome,'report_draft');
  time += 45000;
  assert.equal((await mo('/api/map-data')).incidents.find(i=>i.id===first.id).progress,1);
  assert.equal((await mo('/api/state')).incidents.find(i=>i.id===first.id).status,'open');
  await priya('/api/presence',{available:true,start:false,position:{...pos,capturedAt:time}});
  await priya(`/api/incidents/${first.id}/assistance`,{action:'arrive'}); await priya(`/api/incidents/${first.id}/action`,{action:'resolve'});
  assert.equal((await priya('/api/state')).presence.find(p=>p.id==='vol-priya').state,'available');
  assert.equal((await guest('/api/maps-config')).key,'');
  const html = await (await fetch(demo.base)).text(); assert.match(html,/__judge\/map.js/);
  for (const asset of ['/__judge/map.js','/__judge/judge.js','/__judge/judge.css']) assert.equal((await fetch(demo.base+asset)).status,200);
  for (const asset of ['/.env','/.riverside/store.json','/scripts/judge-demo.cjs']) assert.equal((await fetch(demo.base+asset)).status,404);
  const stored = JSON.parse(fs.readFileSync(path.join(dataDir,'store.json'))); assert.equal(stored.users.length,3); assert.equal(stored.aiUsage,undefined); assert.equal(stored.routesUsage,undefined);
  assert.ok(stored.users.every(u=>typeof u.password==='object' && !JSON.stringify(u.password).includes('Demo!')));
  await server.whenAIIdle(); await new Promise(r=>server.close(r));
  demo = await startJudgeDemo({dataDir,port:0,now:()=>time}); server=demo.server;
  const restored=client(demo.base); await restored('/api/session'); await restored('/api/login',credentials.mo); await restored('/api/session');
  assert.equal((await restored('/api/state')).reports.length,3);
});

test('judge launcher refuses existing non-demo data and packaging excludes secrets and private state',async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'hi-vis-refuse-')); fs.writeFileSync(path.join(dir,'store.json'),'private');
  try { await assert.rejects(startJudgeDemo({dataDir:dir,port:0}),/Refusing non-demo/); assert.equal(fs.readFileSync(path.join(dir,'store.json'),'utf8'),'private'); } finally { fs.rmSync(dir,{recursive:true,force:true}); }
  const files=packageFiles(); assert.ok(files.includes('JUDGES.md')); assert.ok(files.includes('demo/map.js')); assert.ok(files.includes('.env.example')); assert.ok(!files.includes('PROJECT.md')); assert.ok(!files.includes('docs/AI-SETUP.md')); assert.ok(!files.includes('AGENTS.md'));
  assert.ok(files.every(f=>!f.startsWith('.riverside/') && !f.startsWith('.git/') && !(f.startsWith('.env') && f!=='.env.example') && !f.endsWith('DEMO-VIDEO-DRAFT.md')));
  const zip=buildZip(files); assert.equal(zip.readUInt32LE(0),0x04034b50); assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
});

test('report-only demo location becomes visible to its original attendee immediately after Mo offer acceptance, without starting fake movement',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'hi-vis-manual-demo-regression-'));
  const {server,base}=await startJudgeDemo({dataDir,port:0});
  t.after(async()=>{await server.whenAIIdle();await new Promise(r=>server.close(r));fs.rmSync(dataDir,{recursive:true,force:true})});
  const mo=client(base),vol=client(base),guest=client(base),outsider=client(base);
  for(const [c,name] of [[mo,'mo'],[vol,'priya']]){await c('/api/session');await c('/api/login',credentials[name]);await c('/api/session')}
  await guest('/api/session');await outsider('/api/session');
  const first=await guest('/api/reports',{zone:'demo-location',category:'hazard',text:'Fictional ordinary spill, report only.'});await server.whenAIIdle();
  assert.equal((await guest('/api/state')).incidents[0].assistance,undefined);
  await vol('/api/presence',{available:true,start:true,position:{latitude:-37.9,longitude:145.05,accuracy:5,capturedAt:Date.now()}});
  await mo(`/api/incidents/${first.id}/assignment-offer`,{volunteerId:'vol-priya'});
  assert.equal((await guest('/api/state')).incidents[0].assistance.state,'offered');
  const offer=(await vol('/api/state')).incidents[0].assistance.offers[0];await vol(`/api/incidents/${first.id}/offers/${offer.id}`,{decision:'accept'});
  const own=(await guest('/api/state')).incidents[0];assert.equal(own.assignee,'vol-priya');assert.equal(own.assistance.state,'accepted');assert.equal(own.assistance.destination,undefined);assert.deepEqual(own.assistance.offers,[]);
  const map=await guest('/api/map-data');assert.equal(map.incidents.length,1);assert.equal(map.incidents[0].assistanceState,'accepted');assert.deepEqual(map.incidents[0].startPosition,{latitude:-37.9,longitude:145.05});assert.deepEqual(map.incidents[0].position,{latitude:-37.7992,longitude:144.962});assert.equal(map.incidents[0].progress,0);assert.deepEqual(map.volunteers,[]);
  assert.equal((await outsider('/api/map-data')).incidents.length,0);assert.equal((await outsider('/api/state')).incidents.length,0);
});
