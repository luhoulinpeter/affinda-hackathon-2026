const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
function fixture({key='simulated-key',role='mo'}={}) {
  let identity=0,currentRole=role,pendingData,failData=false;
  const nodes=new Map(),subscribers=[],identityCallbacks=[],connectionCallbacks=[],createdMarkers=[],createdLines=[],fits=[],events=[],scripts=[],mapListeners={},documentListeners={},popups=[];
  const node=()=>({hidden:false,disabled:false,textContent:'',scrollIntoView(){},children:[],listeners:{},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},addEventListener(type,cb){this.listeners[type]=cb}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
  const document={querySelector:get,createElement:node,dispatchEvent:e=>events.push(e),addEventListener(type,cb){documentListeners[type]=cb},head:{append(script){scripts.push(script);window.riversideGoogleReady()}}};
  let data={centre:{lat:0,lng:0},label:'Simulation',stations:[{id:'station-1',name:'Demo station',description:'Fictional',latitude:0,longitude:0}],incidents:[{id:'I-1',status:'open',assignee:'vol-priya',assistanceState:'accepted',initialDistanceMetres:200,position:{latitude:0,longitude:0}}],volunteers:[{id:'vol-priya',name:'Priya',state:'busy',fresh:true,position:{latitude:0,longitude:.001}}]};
  class Marker {constructor(options){Object.assign(this,options);this.listeners={};createdMarkers.push(this)}addEventListener(type,cb){this.listeners[type]=cb}}
  class Polyline {constructor(options){Object.assign(this,options);createdLines.push(this)}setPath(path){this.path=path}setMap(map){this.map=map}}
  const libraries={Map:class {addListener(type,cb){mapListeners[type]=cb}setCenter(){}setZoom(){}fitBounds(bounds,padding){fits.push({bounds,padding})}},AdvancedMarkerElement:Marker,PinElement:class{constructor(options){Object.assign(this,options)}get element(){throw Error('Deprecated pin.element must not be used')}},InfoWindow:class{close(){}setContent(content){popups.push(content)}open(){}}};
  const api={getSession:()=>({user:currentRole==='public'?null:{role:currentRole}}),getIdentityVersion:()=>identity,isIdentityChanging:()=>false,getMapsConfig:async()=>({key,centre:{lat:0,lng:0}}),getMapData:async()=>{if(failData)throw Error('Disconnected');if(pendingData)return pendingData;return data},subscribe:cb=>subscribers.push(cb),onIdentityChange:cb=>identityCallbacks.push(cb),onConnectionChange:cb=>connectionCallbacks.push(cb)};
  const window={RiversideData:require('../data/fixtures.js'),RiversideAPI:api,RiversideMapGeometry:require('../src/js/domain/map.js'),google:{maps:{importLibrary:async()=>libraries,Polyline}}};
  vm.runInNewContext(fs.readFileSync('src/js/ui/map.js','utf8'),{window,document,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail}},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:cb=>{cb(1000);return 1},cancelAnimationFrame(){},performance:{now:()=>0}});
  return {get,scripts,createdMarkers,createdLines,fits,events,mapListeners,documentListeners,popups,authFailure:()=>window.gm_authFailure(),refresh:()=>{subscribers.forEach(cb=>cb());return flush()},setData:value=>{data=value},getData:()=>data,changeRole(value){identity++;currentRole=value;identityCallbacks.forEach(cb=>cb())},delay(){let resolve;pendingData=new Promise(r=>{resolve=r});return value=>{pendingData=null;resolve(value)}},setFailure(value){failData=value},setConnection(value){connectionCallbacks.forEach(cb=>cb(value))}};
}
test('simulated Maps renderer draws staff pins and grey/white progress; Mo can select and volunteer pins cannot open details',async()=>{
  for(const role of ['mo','volunteer']) {
    const t=fixture({role});await t.refresh();
    assert.equal(t.scripts.length,1);assert.equal(t.createdMarkers.length,3);assert.equal(t.createdLines.length,2);
    assert.equal(t.get('#live-map').hidden,false);assert.equal(t.get('#map-fallback').hidden,true);
    const incident=t.createdMarkers.find(m=>m.title.startsWith('I-1'));
    assert.equal(incident.gmpClickable,role==='mo');
    if(role==='mo'){incident.listeners['gmp-click']();assert.equal(t.events[0].detail,'I-1')}
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

test('starting walking estimates appear for all roles, disclose their fixed basis, and clear on identity change',async()=>{
  for(const role of ['public','volunteer','mo']) {
    const t=fixture({role}),data=t.getData();data.serverTime=180000;
    data.incidents[0].walkingEstimate={state:'ready',label:'Up to 2 minutes',source:'Google Maps',estimatedAt:60000,warnings:['Fictional provider warning']};
    t.setData(data);await t.refresh();const rows=t.get('#map-estimates').children;
    assert.match(rows[0].textContent,/I-1 · Starting walking estimate: Up to 2 minutes · Google Maps · fixed from the starting location/);
    assert.match(rows[1].textContent,/Fictional provider warning.*sidewalks.*confirmation/);
    data.incidents[0].walkingEstimate={state:'unavailable',label:'Google walking estimate is temporarily unavailable'};await t.refresh();
    assert.equal(t.get('#map-estimates').children.length,1);assert.doesNotMatch(t.get('#map-estimates').children[0].textContent,/minutes|on foot/);
    t.changeRole('public');assert.equal(t.get('#map-estimates').children.length,0);
  }
});


test('zones are selectable public reference pins; only Mo can place a zone, and zone-only incidents have no fabricated path',async()=>{
  for(const role of ['public','volunteer','mo']) {
    const t=fixture({role}),data=t.getData();
    data.zones=['A','B','C'].map((letter,index)=>({id:`zone-${letter.toLowerCase()}`,name:`Zone ${letter} · Test`,description:'Fictional reference',latitude:0,longitude:.003+index*.001}));
    data.incidents[0].locationKind='zone'; t.setData(data);await t.refresh();
    for(const letter of ['A','B','C']) assert.equal(t.createdMarkers.find(m=>m.title===`Zone ${letter} · Test · event zone`).content.glyphText,letter);
    const zone=t.createdMarkers.find(m=>m.title==='Zone A · Test · event zone');assert.equal(zone.gmpClickable,true);
    data.zones[0].name='Zone D · Renamed';await t.refresh();assert.equal(zone.content.glyphText,'D');assert.equal(zone.title,'Zone D · Renamed · event zone');
    zone.listeners['gmp-click']();const popup=t.popups.at(-1);
    assert.match(popup.children[2].textContent,/approximate.*not a boundary/);
    assert.equal(t.createdLines.length,0);assert.match(t.createdMarkers.find(m=>m.title.includes('I-1')).title,/approximate zone location/);
    if(role!=='mo') {
      assert.equal(popup.children.at(-1).textContent,'Use this zone');popup.children.at(-1).listeners.click();assert.equal(t.events.at(-1).detail,'zone-a');
      t.documentListeners['riverside-zone-pick-start']();assert.equal(t.events.at(-1).type,'riverside-zone-pick-unavailable');
    } else {
      assert.equal(popup.children.length,3);t.documentListeners['riverside-zone-pick-start']();
      t.mapListeners.click({latLng:{lat:()=>1,lng:()=>2}});assert.equal(t.events.at(-1).type,'riverside-zone-picked');assert.deepEqual({...t.events.at(-1).detail},{latitude:1,longitude:2});
      const count=t.events.length;t.mapListeners.click({latLng:{lat:()=>3,lng:()=>4}});assert.equal(t.events.length,count);
    }
  }
});

test('accepted attendee assignment names the responder and fits the whole dotted curve once, including distant starts',async()=>{
  const t=fixture({role:'public'}),data=t.getData();data.volunteers=[];
  Object.assign(data.incidents[0],{startPosition:{latitude:-37.9,longitude:145.05},position:{latitude:-37.7992,longitude:144.962},locationKind:'demo-location',demoLocation:true,progress:.2});
  t.setData(data);await t.refresh();
  assert.match(t.get('#map-summary').textContent,/I-1: Assigned to Priya \(fictional\).*arrival not yet confirmed/);
  assert.equal(t.createdLines.length,2);assert.equal(t.fits.length,1);
  const bounds=t.fits[0].bounds;for(const p of t.createdLines[0].path){assert.ok(p.lat<=bounds.north&&p.lat>=bounds.south&&p.lng<=bounds.east&&p.lng>=bounds.west)}
  data.incidents[0].progress=.6;await t.refresh();assert.equal(t.fits.length,1,'GPS/progress refresh should not reset a user-pan');
  t.get('#map-recentre').listeners.click();assert.equal(t.fits.length,2);
  data.incidents[0].assistanceState='arrived';await t.refresh();assert.match(t.get('#map-summary').textContent,/volunteer marked arrived/);
  t.changeRole('public');await t.refresh();assert.equal(t.fits.length,3,'a changed identity gets a fresh safe fit');
});

test('lost session/state connection removes stale map tracking and recovers safely on the next successful refresh',async()=>{
  const t=fixture({role:'public'}),data=t.getData();data.volunteers=[];data.incidents[0].startPosition={latitude:0,longitude:.002};t.setData(data);await t.refresh();
  assert.equal(t.get('#live-map').hidden,false);t.setConnection(false);
  assert.equal(t.get('#live-map').hidden,true);assert.equal(t.get('#map-summary').textContent,'');assert.ok(t.createdLines.every(l=>l.map===null));assert.match(t.get('#map-status').textContent,/Connection lost.*unavailable/);
  t.setConnection(true);await t.refresh();assert.equal(t.get('#live-map').hidden,false);assert.equal(t.get('#map-fallback').hidden,true);assert.equal(t.createdLines.length,4);
});
