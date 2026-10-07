const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
function fixture({key='simulated-key',role='mo'}={}) {
  let identity=0,currentRole=role,pendingData,failData=false;
  const nodes=new Map(),subscribers=[],identityCallbacks=[],createdMarkers=[],createdLines=[],events=[],scripts=[];
  const node=()=>({hidden:false,disabled:false,textContent:'',children:[],listeners:{},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},addEventListener(type,cb){this.listeners[type]=cb}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
  const document={querySelector:get,createElement:node,dispatchEvent:e=>events.push(e),head:{append(script){scripts.push(script);window.riversideGoogleReady()}}};
  let data={centre:{lat:0,lng:0},label:'Simulation',stations:[{id:'station-1',name:'Demo station',description:'Fictional',latitude:0,longitude:0}],incidents:[{id:'I-1',status:'open',assignee:'vol-priya',assistanceState:'accepted',initialDistanceMetres:200,position:{latitude:0,longitude:0}}],volunteers:[{id:'vol-priya',name:'Priya',state:'busy',fresh:true,position:{latitude:0,longitude:.001}}]};
  class Marker {constructor(options){Object.assign(this,options);this.listeners={};createdMarkers.push(this)}addListener(type,cb){this.listeners[type]=cb}}
  class Polyline {constructor(options){Object.assign(this,options);createdLines.push(this)}setPath(path){this.path=path}setMap(map){this.map=map}}
  const libraries={Map:class {setCenter(){}setZoom(){}},AdvancedMarkerElement:Marker,PinElement:class{element={}},InfoWindow:class{close(){}setContent(){}open(){}}};
  const api={getSession:()=>({user:currentRole==='public'?null:{role:currentRole}}),getIdentityVersion:()=>identity,isIdentityChanging:()=>false,getMapsConfig:async()=>({key,centre:{lat:0,lng:0}}),getMapData:async()=>{if(failData)throw Error('Disconnected');if(pendingData)return pendingData;return data},subscribe:cb=>subscribers.push(cb),onIdentityChange:cb=>identityCallbacks.push(cb)};
  const window={RiversideAPI:api,RiversideMapGeometry:require('../src/js/domain/map.js'),google:{maps:{importLibrary:async()=>libraries,Polyline}}};
  vm.runInNewContext(fs.readFileSync('src/js/ui/map.js','utf8'),{window,document,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:cb=>{cb(1000);return 1},cancelAnimationFrame(){},performance:{now:()=>0}});
  return {get,scripts,createdMarkers,createdLines,events,authFailure:()=>window.gm_authFailure(),refresh:()=>{subscribers.forEach(cb=>cb());return flush()},setData:value=>{data=value},getData:()=>data,changeRole(value){identity++;currentRole=value;identityCallbacks.forEach(cb=>cb())},delay(){let resolve;pendingData=new Promise(r=>{resolve=r});return value=>{pendingData=null;resolve(value)}},setFailure(value){failData=value}};
}
test('simulated Maps renderer draws staff pins and grey/white progress; Mo can select and volunteer pins cannot open details',async()=>{
  for(const role of ['mo','volunteer']) {
    const t=fixture({role});await t.refresh();
    assert.equal(t.scripts.length,1);assert.equal(t.createdMarkers.length,3);assert.equal(t.createdLines.length,2);
    assert.equal(t.get('#live-map').hidden,false);assert.equal(t.get('#map-fallback').hidden,true);
    const incident=t.createdMarkers.find(m=>m.title.startsWith('I-1'));
    assert.equal(incident.gmpClickable,role==='mo');
    if(role==='mo'){incident.listeners.click();assert.equal(t.events[0].detail,'I-1')}
    assert.equal(t.createdLines[0].strokeOpacity,0); // dotted symbols, not a continuous stroke
    assert.equal(t.createdLines[0].icons[0].repeat,'12px');
    assert.equal(t.createdLines[0].icons[0].icon.fillColor,'#6a757c');assert.equal(t.createdLines[1].icons[0].icon.fillColor,'#ffffff');
    assert.notDeepEqual(t.createdLines[0].path.at(-1),t.createdLines[1].path.at(-1));
    const updated=t.getData();updated.incidents=[];updated.volunteers=[];t.setData(updated);await t.refresh();
    assert.ok(t.createdLines.every(line=>line.map===null));
  }
});
test('identity change clears staff markers and suppresses a late staff map response',async()=>{
  const t=fixture();await t.refresh();const staff=t.getData(),resolve=t.delay();
  const refreshing=t.refresh();t.changeRole('public');resolve(staff);await refreshing;await flush();
  assert.ok(t.createdMarkers.every(marker=>marker.map===null));assert.equal(t.get('#map-panel').hidden,true);
  t.setData({...staff,incidents:[],volunteers:[]});await t.refresh();
  assert.equal(t.get('#staff-map-legend').hidden,true);assert.match(t.get('#map-privacy').textContent,/moving location is private/);
  assert.equal(t.createdMarkers.at(-1).title,'Demo station · fictional');
});
test('missing key makes no Google request; transient map-data failure recovers without stale staff markers',async()=>{
  const absent=fixture({key:''});await absent.refresh();assert.equal(absent.scripts.length,0);assert.equal(absent.get('#map-fallback').hidden,false);assert.equal(absent.createdMarkers.length,0);assert.match(absent.get('#map-status').textContent,/Use Find first aid/);
  const t=fixture();await t.refresh();t.setFailure(true);await t.refresh();assert.ok(t.createdMarkers.every(marker=>marker.map===null));
  t.setFailure(false);await t.refresh();assert.equal(t.get('#live-map').hidden,false);assert.equal(t.get('#map-fallback').hidden,true);
});
test('public journey keeps its starting dot fixed while progress fills the dotted path without a moving volunteer marker',async()=>{
  const t=fixture({role:'public'}), data=t.getData();
  data.volunteers=[];
  data.incidents[0].startPosition={latitude:0,longitude:.002};
  data.incidents[0].progress=.25;
  t.setData(data);await t.refresh();
  assert.equal(t.createdMarkers.length,3); // station, own destination, frozen starting dot
  assert.equal(t.createdMarkers.some(m=>m.title.startsWith('Priya')),false);
  const start=t.createdMarkers.find(m=>m.title.includes('starting location'));
  assert.equal(start.position.lng,.002);assert.equal(start.gmpClickable,false);
  const early=t.createdLines[1].path.at(-1);
  data.incidents[0].progress=.75;await t.refresh();
  assert.equal(start.position.lng,.002);
  assert.notDeepEqual(t.createdLines[1].path.at(-1),early);
  assert.deepEqual(t.createdLines[0].path.at(-1),{lat:0,lng:0});
});
test('Google authentication failure hides the map and retains reporting fallback without repeated Google loads',async()=>{
  const t=fixture();await t.refresh();
  assert.equal(t.get('#live-map').hidden,false);
  t.authFailure();await t.refresh();
  assert.equal(t.get('#live-map').hidden,true);
  assert.equal(t.get('#map-fallback').hidden,false);
  assert.equal(t.get('#map-recentre').disabled,true);
  assert.match(t.get('#map-status').textContent,/could not load.*key.*quota.*Reporting still works/);
  assert.ok(t.createdMarkers.some(marker=>marker.title==='Demo station · fictional'));
  assert.equal(t.scripts.length,1);
});
