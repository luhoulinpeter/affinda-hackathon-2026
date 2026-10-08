const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('a tunnel HTML error is readable, does not retry submissions, and recovers on refresh', async () => {
  let failed = false, posts = 0;
  const notices = [];
  const context = { window: { RiversideTab: { ready: Promise.resolve('11111111-1111-4111-8111-111111111111') } },
    fetch: async (route, options) => {
      if (options.method === 'POST') posts++;
      if (failed) return { ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected token \'<\', "<!doctype " is not valid JSON'); } };
      return { ok: true, json: async () => route === '/api/session' ? { liveUpdates: 'polling', csrf: 'same' } : { reports: [{ id: 'R-1' }], incidents: [] } };
    } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/js/services/api.js'), 'utf8'), context);
  const api = context.window.RiversideAPI;
  api.onConnectionChange(value => notices.push(value));
  await api.refresh();
  failed = true;
  await assert.rejects(api.refresh(), /unreadable response \(HTTP 502\).*current event link/);
  assert.equal(api.getState().reports[0].id, 'R-1');
  await assert.rejects(api.submitReport({ text: 'Fictional report' }), error => !error.message.includes('Unexpected token') && error.message.includes('current event link'));
  assert.equal(posts, 1, 'Never automatically repeat a possibly received submission');
  failed = false;
  await api.refresh();
  assert.deepEqual(notices, [true, false, true]);
});

test('valid JSON permission errors keep the server explanation', async () => {
  const context = { window: { RiversideTab: { ready: Promise.resolve('11111111-1111-4111-8111-111111111111') } },
    fetch: async () => ({ ok: false, status: 403, json: async () => ({ error: 'Mo access required.' }) }) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/js/services/api.js'), 'utf8'), context);
  await assert.rejects(context.window.RiversideAPI.refresh(), { message: 'Mo access required.' });
});

test('polling-only session avoids unsupported event streams on temporary HTTPS links', async () => {
  let streams = 0, requests = 0;
  const context = { window: { RiversideTab: { ready: Promise.resolve('11111111-1111-4111-8111-111111111111') } },
    EventSource: class { constructor() { streams++; } }, fetch: async route => {
      requests++;
      return { ok: true, json: async () => route === '/api/session' ? { liveUpdates: 'polling', csrf: 'same' } : { reports: [], incidents: [] } };
    } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/js/services/api.js'), 'utf8'), context);
  await context.window.RiversideAPI.refresh(); await context.window.RiversideAPI.refresh();
  assert.equal(streams, 0); assert.equal(requests, 4);
});

test('live updates wait for the guest cookie and retain report ownership', async () => {
  let cookie = null, nextGuest = 0, streamCount = 0, onState;
  const records = [];
  const session = () => ({ guest: { id: cookie, role: 'public' }, csrf: cookie });
  const context = { window: { RiversideTab: { ready: Promise.resolve('11111111-1111-4111-8111-111111111111') } }, EventSource: class {
    constructor(url) {
      assert.equal(url, '/api/events?tab=11111111-1111-4111-8111-111111111111');
      streamCount++;
      // A stream started before /session can overwrite the initial identity.
      if (!cookie) cookie = `guest-${++nextGuest}`;
    }
    addEventListener(event, callback) { assert.equal(event, 'state'); onState = callback; }
  }, fetch: async (route, options) => {
    assert.equal(options.headers['X-Riverside-Tab'],'11111111-1111-4111-8111-111111111111');
    if (route === '/api/session') {
      const requestGuest = cookie || `guest-${++nextGuest}`;
      await Promise.resolve();
      cookie = requestGuest;
      return { ok: true, json: async () => session() };
    }
    if (route === '/api/state') return { ok: true, json: async () => ({ reports: records.filter(record => record.owner === cookie), incidents: [] }) };
    if (route === '/api/reports') {
      assert.equal(options.headers['X-CSRF-Token'], cookie);
      records.push({ id: 'R-1', owner: cookie });
      return { ok: true, json: async () => ({ id: 'I-1' }) };
    }
    throw new Error(`Unexpected route: ${route}`);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/js/services/api.js'), 'utf8'), context);
  const api = context.window.RiversideAPI;
  assert.equal(streamCount, 0, 'No stream may create a competing guest cookie before the first session');
  await api.refresh();
  assert.equal(streamCount, 1);
  const owner = api.getSession().guest.id;
  await api.submitReport({ text: 'Fictional issue' });
  onState();
  await api.refresh();
  assert.equal(streamCount, 1);
  assert.equal(api.getSession().guest.id, owner);
  assert.equal(api.getState().reports[0].owner, owner);
});

test('a confirmed report receipt survives a failed follow-up state fetch', async () => {
  let submitted=false;
  const context={window:{RiversideTab:{ready:Promise.resolve('11111111-1111-4111-8111-111111111111')}},fetch:async(route)=>{
    if(route==='/api/session')return {ok:true,json:async()=>({guest:{id:'guest-test',role:'public'},csrf:'test'})};
    if(route==='/api/state'){if(submitted)throw Error('Disconnected');return {ok:true,json:async()=>({reports:[],incidents:[]})}}
    if(route==='/api/reports'){submitted=true;return {ok:true,json:async()=>({id:'I-1'})}}
    throw Error('Unexpected request');
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/js/services/api.js'),'utf8'),context);
  const api=context.window.RiversideAPI;await api.refresh();
  assert.equal((await api.submitReport({text:'Fictional report'})).id,'I-1');
});

test('connection loss preserves the last permitted state, signals stale updates, and recovers the accepted assignment',async()=>{
  let failed=false, accepted=false; const notices=[];
  const context={window:{RiversideTab:{ready:Promise.resolve('11111111-1111-4111-8111-111111111111')}},fetch:async route=>{
    if(failed)throw Error('Failed to fetch');
    return {ok:true,json:async()=>route==='/api/session'?{liveUpdates:'polling',guest:{id:'guest-one',role:'public'},csrf:'same'}:{reports:[{id:'R-1'}],incidents:[{id:'I-1',assignee:accepted?'vol-priya':null,assistance:accepted?{state:'accepted',offers:[],events:[]}:undefined}]}};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/js/services/api.js'),'utf8'),context);
  const api=context.window.RiversideAPI;api.onConnectionChange(value=>notices.push(value));await api.refresh();
  failed=true;accepted=true;await assert.rejects(api.refresh(),/Failed to fetch/);
  assert.equal(api.getState().incidents[0].assignee,null);assert.deepEqual(notices,[true,false]);
  failed=false;await api.refresh();assert.equal(api.getState().incidents[0].assignee,'vol-priya');assert.deepEqual(notices,[true,false,true]);
});

test('an older failed refresh cannot mark a newer successful assignment update disconnected',async()=>{
  let release,first=true;const notices=[];
  const context={window:{RiversideTab:{ready:Promise.resolve('11111111-1111-4111-8111-111111111111')}},fetch:async route=>{
    if(first){first=false;await new Promise((_r,reject)=>{release=reject});}
    return {ok:true,json:async()=>route==='/api/session'?{liveUpdates:'polling',csrf:'same'}:{reports:[],incidents:[{id:'I-1',assignee:'vol-priya'}]}};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/js/services/api.js'),'utf8'),context);
  const api=context.window.RiversideAPI;api.onConnectionChange(value=>notices.push(value));
  const old=api.refresh();for(let i=0;i<5;i++)await Promise.resolve();await api.refresh();release(Error('Old connection failed'));await assert.rejects(old);
  assert.deepEqual(notices,[true]);assert.equal(api.getState().incidents[0].assignee,'vol-priya');
});
