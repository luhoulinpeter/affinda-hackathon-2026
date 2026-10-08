const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { startJudgeDemo, credentials } = require('../scripts/judge-demo.cjs');
const { startQuickDemo, tunnelOrigin, waitForOrigin } = require('../scripts/judge-tunnel.cjs');

test('public judge sandbox preserves role workflow, secure cookies, exact host/origin, private-file exclusions and polling', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(),'hi-vis-public-judge-'));
  const origin = 'https://fictional-judge-demo.trycloudflare.com';
  const {server} = await startJudgeDemo({dataDir,port:0,publicOrigin:origin});
  t.after(async () => { await server.whenAIIdle(); await new Promise(r => server.close(r)); fs.rmSync(dataDir,{recursive:true,force:true}); });
  const headers = { Host:new URL(origin).host, Origin:origin, 'X-Riverside-Tab':randomUUID() };
  function request(route, body, extra = {}) {
    return new Promise((resolve,reject) => {
      const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:route,method:body===undefined?'GET':'POST',headers:{...headers,...extra,...(body===undefined?{}:{'Content-Type':'application/json'})}},res => {
        let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,raw}));
      });req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
    });
  }
  function client() {
    const tab=randomUUID(), cookies=new Map(); let csrf;
    return async (route,body) => {
      const result=await request(route,body,{'X-Riverside-Tab':tab,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(body===undefined?{}:{'X-CSRF-Token':csrf})});
      for (const cookie of result.headers['set-cookie'] || []) { const [k,v]=cookie.split(';')[0].split('=');if(v)cookies.set(k,v);else cookies.delete(k); }
      const data=JSON.parse(result.raw);if(data.csrf)csrf=data.csrf;
      if(result.status>=400)throw new Error(`${result.status} ${data.error}`);return data;
    };
  }
  const raw = await request('/api/session'); const session = JSON.parse(raw.raw);
  assert.equal(raw.status,200,raw.raw);
  assert.equal(session.setupRequired,false); assert.equal(session.liveUpdates,'polling');
  assert.ok(raw.headers['set-cookie'].every(c => c.includes('; Secure') && c.includes('; HttpOnly')));
  assert.equal((await request('/api/session',undefined,{Host:'unexpected.test'})).status,403);
  assert.equal((await request('/__judge/judge.js',undefined,{Origin:'https://other.test'})).status,403);
  for (const route of ['/','/__judge/judge.js','/__judge/map.js','/__judge/judge.css']) assert.equal((await request(route)).status,200);
  for (const route of ['/.env','/.riverside/store.json','/scripts/judge-demo.cjs','/.git/config']) assert.equal((await request(route)).status,404);
  const mo=client(), priya=client(), guest=client(), outsider=client();
  for (const [c,name] of [[mo,'mo'],[priya,'priya']]) { await c('/api/session'); await c('/api/login',credentials[name]); await c('/api/session'); }
  await guest('/api/session'); await outsider('/api/session');
  await assert.rejects(guest('/api/setup',{username:'someone',password:'NeverCreated!'}),/Setup is disabled/);
  await assert.rejects(guest('/api/accounts',{...credentials.alex,volunteerId:'vol-alex'}),/403/);
  await priya('/api/presence',{available:true,start:true,position:{latitude:-37.7958,longitude:144.9612,accuracy:8,capturedAt:Date.now()}});
  const report=await guest('/api/reports',{zone:'demo-location',category:'hazard',text:'Fictional tunnel walkthrough spill.'}); await server.whenAIIdle();
  await mo(`/api/incidents/${report.id}/assignment-offer`,{volunteerId:'vol-priya'});
  const offer=(await priya('/api/state')).incidents[0].assistance.offers[0];
  await priya(`/api/incidents/${report.id}/offers/${offer.id}`,{decision:'accept'});
  assert.equal((await guest('/api/state')).incidents[0].assignee,'vol-priya');
  assert.equal((await guest('/api/map-data')).incidents[0].assistanceState,'accepted');
  assert.deepEqual((await guest('/api/map-data')).volunteers,[]); assert.deepEqual((await outsider('/api/map-data')).incidents,[]);
  const stored=JSON.parse(fs.readFileSync(path.join(dataDir,'store.json'))); assert.equal(stored.users.length,3); assert.equal(stored.aiUsage,undefined); assert.equal(stored.routesUsage,undefined);
});

function fakeChild() { const child=new EventEmitter(); child.stdout=new PassThrough(); child.stderr=new PassThrough(); return child; }
test('invalid or already cancelled tunnel starts fail before opening a service or spawning a process', async () => {
  await assert.rejects(startQuickDemo({port:0}),/between 1 and 65535/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(startQuickDemo({signal:controller.signal}),/cancelled/);
});
test('tunnel startup reads split URL output and cleans listeners', async () => {
  assert.equal(tunnelOrigin('https://example.com'),null);
  const child=fakeChild(), pending=waitForOrigin(child,{timeoutMs:1000});
  child.stderr.write('New tunnel: https://fictional-'); child.stderr.write('demo.trycloudflare.com |\n');
  assert.equal(await pending,'https://fictional-demo.trycloudflare.com');
  assert.equal(child.listenerCount('error'),0); assert.equal(child.stderr.listenerCount('data'),0);
});
test('tunnel startup reports missing executable, early exit, timeout and cancellation', async () => {
  let child=fakeChild(), pending=waitForOrigin(child,{timeoutMs:1000}); child.emit('error',Object.assign(new Error('missing'),{code:'ENOENT'})); await assert.rejects(pending,/Install it/);
  child=fakeChild(); pending=waitForOrigin(child,{timeoutMs:1000}); child.emit('exit',1); await assert.rejects(pending,/stopped before/);
  child=fakeChild(); await assert.rejects(waitForOrigin(child,{timeoutMs:5}),/did not provide/);
  const controller=new AbortController(); child=fakeChild(); pending=waitForOrigin(child,{signal:controller.signal}); controller.abort(); await assert.rejects(pending,/cancelled/);
});

test('schematic adapter accepts current PinElement content and dispatches Google gmp-click as a native click', () => {
  class Element {
    constructor() { this.children=[]; this.style={}; this.classList={add(){}}; this.listeners={}; }
    append(...items) { assert.ok(items.every(item=>item instanceof Element),'append requires DOM nodes');this.children.push(...items); }
    replaceChildren() { this.children=[]; }
    setAttribute() {}
    addEventListener(name,callback) { this.listeners[name]=callback; }
    remove() {}
  }
  const window={}, document={createElement:()=>new Element(),createElementNS:()=>new Element()};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../demo/map.js'),'utf8'),{window,document});
  const library=window.HiVisDemoMapLibraries, container=new Element(), map=new library.Map(container);
  const pin=new library.PinElement({background:'orange',glyphText:'B'});
  const marker=new library.AdvancedMarkerElement({map,content:pin,title:'Zone B',position:{lat:-37.797,lng:144.9615},gmpClickable:true});
  assert.equal(marker.element.children[0],pin.element);assert.equal(pin.element.textContent,'B');
  let clicked=false, stopped=false; marker.addEventListener('gmp-click',()=>{clicked=true;});
  marker.element.listeners.click({stopPropagation(){stopped=true;}});
  assert.equal(clicked,true);assert.equal(stopped,true);
});
