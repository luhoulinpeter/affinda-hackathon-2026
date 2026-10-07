const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
