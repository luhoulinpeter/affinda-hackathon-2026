const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapData } = require('../server/maps.cjs');
const { distance, progress, curve } = require('../src/js/domain/map.js');

test('Bezier endpoints and progress handle arrival distance, moving away, invalid fixes and zero-length starts', () => {
  const a = { latitude: -37.798, longitude: 144.96 }, b = { latitude: -37.799, longitude: 144.962 };
  const full = curve(a, b), half = curve(a,b,.5);
  assert.deepEqual(full[0], { lat:a.latitude, lng:a.longitude });
  assert.deepEqual(full.at(-1), { lat:b.latitude, lng:b.longitude });
  assert.notDeepEqual(half.at(-1), full.at(-1));
  assert.equal(progress(100,100),0); assert.equal(progress(100,25),.75);
  assert.equal(progress(100,120),0); assert.equal(progress(100,0),1);
  assert.equal(progress(0,0),1); assert.equal(progress(0,5),0);
  for (const value of [NaN,Infinity,-1,null,undefined]) assert.equal(progress(value,10),0);
  assert.equal(distance(a,a),0); assert.ok(distance(a,b)>100);
  assert.equal(distance({},b),null); assert.deepEqual(curve({},b),[]);
  assert.deepEqual(curve(a,b,NaN),[]);
});
test('public map shares only their accepted volunteer starting fix and progress, never moving coordinates or other reporters',()=>{
  const start={latitude:-37.7958,longitude:144.9612}, destination={latitude:-37.7992,longitude:144.962};
  const state={reports:[{id:'R-1',reporter:{id:'guest-one',role:'public'}},{id:'R-2',reporter:{id:'guest-two',role:'public'}}],incidents:[1,2].map(n=>({id:`I-${n}`,reportIds:[`R-${n}`],status:'open',assignee:'vol-priya',assistance:{state:'accepted',startPosition:start,destination,initialDistanceMetres:400,offers:[]}}))};
  const moving={latitude:-37.7975,longitude:144.9616};
  const presence=[{id:'vol-priya',name:'Priya',fresh:true,position:moving}];
  const result=mapData({role:'public',id:'guest-one'},state,presence,{enabled:false},1000);
  assert.equal(result.incidents.length,1);assert.equal(result.incidents[0].id,'I-1');
  assert.deepEqual(result.incidents[0].startPosition,start);assert.deepEqual(result.incidents[0].position,destination);
  assert.ok(result.incidents[0].progress>0 && result.incidents[0].progress<1);
  assert.deepEqual(result.volunteers,[]);assert.ok(!JSON.stringify(result).includes(String(moving.latitude)));
  presence[0].fresh=false;
  assert.equal(mapData({role:'public',id:'guest-one'},state,presence,{enabled:false},1000).incidents[0].progress,null);
  state.incidents[0].assistance.state='cancelled';
  assert.deepEqual(mapData({role:'public',id:'guest-one'},state,presence,{enabled:false},1000).incidents,[]);
});

test('map projection exposes pins for all staff without private reports; public receives stations only', () => {
  const incident = { id:'I-1',status:'open',attention:'urgent',assignee:'vol-priya',reportIds:['R-secret'],history:[{ secret:'private-history' }],analysis:{ secret:'private-analysis' },assistance:{ destination:{ latitude:0,longitude:0,accuracy:5,receivedAt:1000 },state:'accepted',initialDistanceMetres:80,offers:[{status:'accepted',volunteerId:'vol-priya',secret:'private-offer'}] } };
  const state = { reports:[{ text:'private report',reporter:{id:'private-reporter'} }], incidents:[incident,{id:'I-2',status:'open',attention:'review',assignee:null}] };
  const presence=[{ id:'vol-priya',name:'Priya',state:'busy',fresh:true,position:{latitude:0,longitude:.001,accuracy:5,capturedAt:1000,receivedAt:1000},sessionToken:'private-session' },{ id:'vol-alex',name:'Alex',state:'paused',fresh:false,position:{latitude:1,longitude:1} }];
  const stations={enabled:true,stations:[{id:'first-aid-1',latitude:0,longitude:0,fictional:true}]};
  for(const role of ['mo','volunteer']) {
    const result=mapData({role,id:'vol-priya'},state,presence,stations,1000);
    assert.equal(result.incidents.length,2); assert.equal(result.incidents[0].position.latitude,0);
    assert.equal(result.incidents[1].position,undefined);
    assert.equal(result.volunteers[0].position.longitude,.001);
    assert.equal(result.volunteers[1].position,undefined);
    assert.ok(!JSON.stringify(result).includes('private'));
    assert.equal(result.incidents[0].initialDistanceMetres,80);
  }
  const result=mapData({role:'public'},state,presence,stations,1000);
  assert.deepEqual(result.incidents,[]); assert.deepEqual(result.volunteers,[]); assert.equal(result.stations.length,1);
  assert.deepEqual(mapData({role:'public'},state,presence,{enabled:false,stations:stations.stations},1000).stations,[]);
  assert.equal(incident.assistance.destination.accuracy,5); // projection never edits stored originals
});
