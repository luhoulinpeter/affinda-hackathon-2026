const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function browserFixture() {
  let time=1000000, identity=0, delayed=false, pending;
  const elements=new Map(), documentEvents=new Map(), timers=new Map(), subscribers=[], identityListeners=[], calls=[];
  const node=()=>({hidden:false,disabled:false,textContent:'',children:[],listeners:new Map(),addEventListener(type,callback){this.listeners.set(type,callback)},replaceChildren(){this.children=[]},append(child){this.children.push(child)}});
  const get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id)};
  const document={hidden:false,querySelector:get,querySelectorAll:()=>[],addEventListener:(event,callback)=>documentEvents.set(event,callback),createElement:node};
  let presence={id:'vol-priya',state:'paused',fresh:false}, watching;
  const coords=()=>({coords:{latitude:0,longitude:0,accuracy:5},timestamp:time});
  const geolocation={getCurrentPosition(ok){if(delayed)pending=ok;else ok(coords())},watchPosition(ok){watching=ok;return 1},clearWatch(){watching=null}};
  const api={getSession:()=>({user:{id:'vol-priya',role:'volunteer'},guest:{id:'guest-test'}}),getState:()=>({serverTime:time,presence:[presence],incidents:[],reports:[]}),getIdentityVersion:()=>identity,isIdentityChanging:()=>false,subscribe:cb=>subscribers.push(cb),onIdentityChange:cb=>identityListeners.push(cb),async setPresence(body){calls.push(body);presence=body.available?{id:'vol-priya',state:'available',fresh:true,position:body.position}:{id:'vol-priya',state:'paused',fresh:false};subscribers.forEach(cb=>cb())},async refresh(){subscribers.forEach(cb=>cb())}};
  class Clock extends Date {static now(){return time}}
  const window={RiversideAPI:api,RiversideData:require('../data/fixtures.js'),isSecureContext:true};
  const context={window,document,navigator:{geolocation},Date:Clock,setInterval:(cb,ms)=>{const id=timers.size+1;timers.set(id,{cb,ms});return id},clearInterval:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync('src/js/ui/assistance.js','utf8'),context);
  subscribers.forEach(cb=>cb());
  return {calls,document,documentEvents,timers,get,advance:n=>{time+=n},watch:()=>watching?.(coords()),click:id=>get(id).listeners.get('click')(),setDelayed:()=>{delayed=true},resolveGps:()=>pending(coords()),changeIdentity:()=>{identity++;identityListeners.forEach(cb=>cb())}};
}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
test('GPS uploads are throttled, hidden pages pause, and returning does not silently opt in',async()=>{
  const t=browserFixture();await t.click('#go-available');assert.equal(t.calls.filter(c=>c.available).length,1);
  t.watch();await flush();assert.equal(t.calls.filter(c=>c.available).length,1);
  t.advance(10000);t.watch();await flush();assert.equal(t.calls.filter(c=>c.available).length,2);
  t.document.hidden=true;t.documentEvents.get('visibilitychange')();await flush();assert.equal(t.calls.at(-1).available,false);
  const count=t.calls.length;t.document.hidden=false;t.documentEvents.get('visibilitychange')();await flush();assert.equal(t.calls.length,count);
  await t.click('#go-available');assert.equal(t.calls.at(-1).available,true);
});
test('location arriving after an identity change cannot opt the previous volunteer in',async()=>{
  const t=browserFixture();t.setDelayed();const started=t.click('#go-available');t.changeIdentity();t.resolveGps();await started;
  assert.equal(t.calls.length,0);
});
