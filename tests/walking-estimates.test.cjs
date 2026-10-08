const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createWalkingEstimates,estimateLabel}=require('../server/walking-estimates.cjs');
const incident=()=>({id:'I-1',status:'open',assignee:'vol-priya',assistance:{state:'accepted',destination:{latitude:-37.799,longitude:144.961},offers:[{id:'offer-1',status:'accepted'}]}});
const responder=()=>({fresh:true,position:{latitude:-37.798,longitude:144.961}});
const response=(duration='119s')=>({ok:true,json:async()=>({routes:[{duration,warnings:['Fictional route warning']}]})});

test('walking labels use a two-minute minimum and round longer Google durations up',()=>{
  for(const seconds of [0,59,119.9,120])assert.equal(estimateLabel(seconds),'Up to 2 minutes');
  assert.equal(estimateLabel(120.01),'About 3 minutes');assert.equal(estimateLabel(300),'About 5 minutes');
});
test('walking request uses server-only Google WALK duration and does not project coordinates or key',async()=>{
  let calls=0;const service=createWalkingEstimates({enabled:true,key:'private-route-key',reserve:()=>true,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://routes.googleapis.com/directions/v2:computeRoutes');assert.equal(options.headers['X-Goog-Api-Key'],'private-route-key');assert.equal(options.headers['X-Goog-FieldMask'],'routes.duration,routes.warnings');const body=JSON.parse(options.body);assert.equal(body.travelMode,'WALK');assert.equal(body.routingPreference,undefined);assert.equal(body.origin.location.latLng.latitude,-37.798);return response();}});
  const eta=await service.get(incident(),responder());assert.equal(calls,1);assert.equal(eta.label,'Up to 2 minutes');assert.equal(eta.source,'Google Maps');assert.deepEqual(eta.warnings,['Fictional route warning']);assert.doesNotMatch(JSON.stringify(eta),/private-route-key|latitude|longitude/);
});
test('disabled, missing-key, missing destination, stale GPS, arrived, cancelled and resolved requests make no Google call',async()=>{
  for(const kind of ['disabled','key','destination','stale','arrived','cancelled','resolved','budget']) {
    let calls=0;const i=incident(),p=responder();if(kind==='destination')delete i.assistance.destination;if(kind==='stale')p.fresh=false;if(kind==='arrived')i.assistance.state='arrived';if(kind==='cancelled')i.assistance.state='cancelled';if(kind==='resolved')i.status='resolved';
    const s=createWalkingEstimates({enabled:kind!=='disabled',key:kind==='key'?'':'private',reserve:()=>kind!=='budget',fetchImpl:async()=>{calls++;return response()}});
    const eta=await s.get(i,p);assert.equal(calls,0,kind);assert.notEqual(eta?.state,'ready',kind);
  }
});
test('all viewers deduplicate concurrent routing and cache GPS jitter, refreshing movement no faster than once per minute',async()=>{
  let time=100000,calls=0,resolve;const s=createWalkingEstimates({enabled:true,key:'private',now:()=>time,reserve:()=>true,fetchImpl:()=>{calls++;return new Promise(r=>resolve=r)}});
  const i=incident(),p=responder(),a=s.get(i,p),b=s.get(i,p);await Promise.resolve();assert.equal(calls,1);resolve(response('301s'));assert.deepEqual(await a,await b);
  time+=59000;p.position.latitude-=.001;assert.equal((await s.get(i,p)).label,'About 6 minutes');assert.equal(calls,1);
  time+=1000;const moved=s.get(i,p);await Promise.resolve();assert.equal(calls,2);resolve(response('90s'));await moved;
  time+=240000;assert.equal((await s.get(i,p)).label,'Up to 2 minutes');assert.equal(calls,2);
  time+=60000;const aged=s.get(i,p);await Promise.resolve();assert.equal(calls,3);resolve(response('90s'));await aged;
  i.assistance.offers[0].id='new-offer';const replaced=s.get(i,p);await Promise.resolve();assert.equal(calls,4);resolve(response());await replaced;
});
test('provider denial, timeout, no route and malformed results are cached errors, never invented time estimates or leaked provider errors',async()=>{
  for(const reply of [()=>{throw Error('private key latitude')},async()=>({ok:false,json:async()=>({error:'private'})}),async()=>({ok:true,json:async()=>({routes:[]})}),async()=>response('NaNs'),async()=>response('-1s'),async()=>response('99999999s')]) {
    let calls=0;const s=createWalkingEstimates({enabled:true,key:'private',reserve:()=>true,fetchImpl:(...args)=>{calls++;return reply(...args)}});
    const a=await s.get(incident(),responder());const b=await s.get(incident(),responder());assert.equal(calls,1);assert.equal(a.state,'unavailable');assert.deepEqual(a,b);assert.doesNotMatch(JSON.stringify(a),/private|latitude|minutes/);
  }
});
