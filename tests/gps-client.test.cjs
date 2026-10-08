const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function browserFixture(options = {}) {
  let time=1000000, identity=0, delayed=false, pending;
  const elements=new Map(), documentEvents=new Map(), timers=new Map(), subscribers=[], identityListeners=[], calls=[];
  const node=()=>({hidden:false,disabled:false,textContent:'',children:[],listeners:new Map(),addEventListener(type,callback){this.listeners.set(type,callback)},replaceChildren(){this.children=[]},append(child){this.children.push(child)}});
  const get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id)};
  const document={hidden:false,querySelector:get,querySelectorAll:()=>[],addEventListener:(event,callback)=>documentEvents.set(event,callback),createElement:node};
  let presence={id:'vol-priya',state:'paused',fresh:false}, watching;
  const coords=()=>({coords:{latitude:0,longitude:0,accuracy:options.accuracy ?? 5},timestamp:time});
  const geolocation={getCurrentPosition(ok,fail){if(options.error)fail({code:options.error});else if(delayed)pending=ok;else ok(coords())},watchPosition(ok){watching=ok;return 1},clearWatch(){watching=null}};
  const api={getSession:()=>({user:{id:'vol-priya',role:'volunteer'},guest:{id:'guest-test'}}),getState:()=>({serverTime:options.cachedClock ? 1000000 : time,presence:[presence],incidents:[],reports:[]}),getIdentityVersion:()=>identity,isIdentityChanging:()=>false,subscribe:cb=>subscribers.push(cb),onIdentityChange:cb=>identityListeners.push(cb),async setPresence(body){calls.push(body);if(options.refreshWhileStarting){subscribers.forEach(cb=>cb());await Promise.resolve()}presence=body.available?{id:'vol-priya',state:'available',eligible:true,fresh:true,position:body.position,expiresAt:time+600000}:{id:'vol-priya',state:'paused',fresh:false};subscribers.forEach(cb=>cb());return {serverTime:time,presence:[presence]}},async refresh(){subscribers.forEach(cb=>cb())}};
  class Clock extends Date {static now(){return time}}
  const window={RiversideAPI:api,RiversideData:require('../data/fixtures.js'),isSecureContext:true};
  const context={window,document,navigator:{geolocation},Date:Clock,setInterval:(cb,ms)=>{const id=timers.size+1;timers.set(id,{cb,ms});return id},clearInterval:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync('src/js/ui/assistance.js','utf8'),context);
  subscribers.forEach(cb=>cb());
  return {assistance:window.RiversideAssistance,calls,document,documentEvents,timers,get,advance:n=>{time+=n},watch:()=>watching?.(coords()),click:id=>get(id).listeners.get('click')(),setDelayed:()=>{delayed=true},resolveGps:()=>pending(coords()),setServerPresence:patch=>{presence={...presence,...patch};subscribers.forEach(cb=>cb())},changeIdentity:()=>{identity++;identityListeners.forEach(cb=>cb())}};
}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
test('GPS uploads are throttled and tab switching preserves the sharing session',async()=>{
  const t=browserFixture();await t.click('#go-available');assert.equal(t.calls.filter(c=>c.available).length,1);
  t.watch();await flush();assert.equal(t.calls.filter(c=>c.available).length,1);
  t.advance(10000);t.watch();await flush();assert.equal(t.calls.filter(c=>c.available).length,2);
  t.document.hidden=true;t.documentEvents.get('visibilitychange')();await flush();assert.equal(t.calls.at(-1).available,true);
  t.advance(10000);t.watch();await flush();assert.equal(t.calls.filter(c=>c.available).length,3);
  const count=t.calls.length;t.document.hidden=false;t.documentEvents.get('visibilitychange')();await flush();assert.equal(t.calls.length,count);
  await t.click('#pause-volunteer');assert.equal(t.calls.at(-1).available,false);
});
test('location arriving after an identity change cannot opt the previous volunteer in',async()=>{
  const t=browserFixture();t.setDelayed();const started=t.click('#go-available');t.changeIdentity();t.resolveGps();await started;
  assert.equal(t.calls.length,0);
});
for (const [code, message] of [[1,/Location access is blocked/],[2,/position unavailable/],[3,/timed out after 15 seconds/]]) {
  test(`location error ${code} explains why opt-in failed without marking the volunteer available`, async()=>{
    const t=browserFixture({error:code});await t.click('#go-available');
    assert.equal(t.calls.length,0);assert.match(t.get('#presence-feedback').textContent,message);
    assert.equal(t.get('#go-available').disabled,false);assert.equal(t.get('#go-available').textContent,'Go available');
  });
}
test('insufficient location accuracy is reported and does not relax eligibility',async()=>{
  const t=browserFixture({accuracy:275});await t.click('#go-available');
  assert.equal(t.calls.length,0);assert.match(t.get('#presence-feedback').textContent,/±275 metres/);
});
test('a paused refresh during the first presence request does not stop successful tracking',async()=>{
  const t=browserFixture({refreshWhileStarting:true});await t.click('#go-available');
  assert.match(t.get('#presence-feedback').textContent,/Available for offers/);
  assert.equal(t.get('#go-available').textContent,'Location sharing active');
  t.advance(10000);t.watch();await flush();assert.equal(t.calls.filter(c=>c.available).length,2);
});
test('hiding the page before location returns still permits the requested sharing session',async()=>{
  const t=browserFixture();t.setDelayed();const started=t.click('#go-available');
  t.document.hidden=true;t.resolveGps();await started;
  assert.equal(t.calls.length,1);assert.match(t.get('#presence-feedback').textContent,/Available for offers/);
});
test('active GPS sharing continues beyond ten minutes until Pause, including delayed timer and cached clock',async()=>{
  const t=browserFixture({cachedClock:true});await t.click('#go-available');t.advance(590000);t.watch();await flush();
  t.advance(10001);t.document.hidden=false;t.documentEvents.get('visibilitychange')();await flush();
  assert.equal(t.get('#go-available').disabled,true);assert.match(t.get('#presence-feedback').textContent,/sharing stays on until you pause/);
  t.advance(10000);const count=t.calls.length;t.watch();await flush();assert.equal(t.calls.length,count+1);
  await t.click('#pause-volunteer');const pausedCount=t.calls.length;t.advance(10000);t.watch();await flush();assert.equal(t.calls.length,pausedCount);
});

test('busy-to-available completion keeps the GPS watcher active and Pause stops it',async()=>{
  const t=browserFixture();await t.click('#go-available');
  t.setServerPresence({state:'busy'});assert.match(t.get('#presence-feedback').textContent,/Busy on an accepted assignment/);
  t.setServerPresence({state:'available'});assert.equal(t.get('#go-available').textContent,'Location sharing active');
  t.advance(10000);t.watch();await flush();assert.equal(t.calls.at(-1).start,false);
  await t.click('#pause-volunteer');assert.equal(t.calls.at(-1).available,false);
  const count=t.calls.length;t.advance(10000);t.watch();await flush();assert.equal(t.calls.length,count);
});

test('GPS arriving after Pause cannot resume sharing',async()=>{
  const t=browserFixture();await t.click('#go-available');t.setDelayed();t.advance(10000);
  const running=[...t.timers.values()].find(timer=>timer.ms===10000).cb();
  await t.click('#pause-volunteer');const count=t.calls.length;t.resolveGps();await running;await flush();
  assert.equal(t.calls.length,count);assert.equal(t.calls.at(-1).available,false);
});

test('first-aid lookup retains feedback and map guidance without reintroducing station cards',()=>{
  const t=browserFixture();
  t.get('#first-aid-results').append({textContent:'Old station card'});
  t.assistance.showStations({answer:'Fictional demo stations are marked on the map.',stations:[{id:'first-aid-1',name:'Demo North First Aid',latitude:0,longitude:0}]});
  assert.equal(t.get('#first-aid-results').children.length,0);
  assert.match(t.get('#help-feedback').textContent,/marked on the map.*Tap a first-aid pin/);
  t.assistance.showStations({answer:'Station information unavailable.',stations:[]});
  assert.equal(t.get('#help-feedback').textContent,'Station information unavailable.');
  assert.equal(t.get('#first-aid-results').children.length,0);
});
