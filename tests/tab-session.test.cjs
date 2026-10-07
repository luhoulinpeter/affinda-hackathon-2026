const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const source = fs.readFileSync('src/js/services/tab-session.js', 'utf8');
function fixture() {
  const channels = new Set(), timers = new Map(); let nextTimer = 0, holdMessages = false;
  const messages = [];
  class Channel {
    constructor() { channels.add(this); }
    postMessage(data) { for (const channel of channels) if (channel !== this) { const send=()=>{ if (channels.has(channel)) channel.onmessage?.({data}); };if(holdMessages)messages.push(send);else queueMicrotask(send); } }
    close() { channels.delete(this); }
  }
  function tab(storage = new Map(), options = {}) {
    const events = new Map();
    let reloaded=false;
    const window = { addEventListener: (name, fn) => events.set(name, fn), location: { reload() { reloaded=true; } } };
    vm.runInNewContext(source, { window, BroadcastChannel: options.unsupported ? undefined : Channel, crypto: { randomUUID }, sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => { if (options.blocked) throw Error('Storage blocked'); storage.set(k,v); } }, setTimeout: cb => { const id=++nextTimer;timers.set(id,cb);return id; }, clearTimeout: id => timers.delete(id) });
    return { ready: window.RiversideTab.ready, storage, reloaded:()=>reloaded, close: () => events.get('pagehide')() };
  }
  async function settle() { for (let i=0;i<10;i++) await Promise.resolve(); const pending=[...timers.values()];timers.clear();pending.forEach(cb=>cb()); }
  return { tab, settle, hold:()=>{holdMessages=true;}, deliver:()=>{holdMessages=false;while(messages.length)messages.shift()();} };
}
test('fresh tabs have different selectors and reload preserves the original tab selector', async()=>{
  const f=fixture(), a=f.tab(), b=f.tab();await f.settle();
  const id=await a.ready;assert.notEqual(id,await b.ready);
  a.close();const reloaded=f.tab(a.storage);await f.settle();assert.equal(await reloaded.ready,id);
});
test('a duplicated tab with copied storage starts with a fresh selector without changing the original',async()=>{
  const f=fixture(), original=f.tab();await f.settle();const id=await original.ready;
  const duplicate=f.tab(new Map(original.storage));await f.settle();
  assert.notEqual(await duplicate.ready,id);assert.equal(await original.ready,id);
});
test('simultaneously opened tabs with copied storage do not share a session selector',async()=>{
  const f=fixture(), stored=new Map([['riverside-tab-v1',randomUUID()]]);
  const a=f.tab(new Map(stored)),b=f.tab(new Map(stored));await f.settle();
  assert.notEqual(await a.ready,await b.ready);
});
test('blocked storage or missing cross-tab support fails visibly instead of sharing a login',async()=>{
  const f=fixture();await assert.rejects(f.tab(new Map(),{blocked:true}).ready,/Allow website storage/);
  await assert.rejects(f.tab(new Map(),{unsupported:true}).ready,/cannot separate sign-ins/);
});
test('late responses from a sleeping sibling replace a copied identity and reload that tab',async()=>{
  const f=fixture(),original=f.tab();await f.settle();const id=await original.ready;
  f.hold();const copied=f.tab(new Map(original.storage));await f.settle();assert.equal(await copied.ready,id);
  f.deliver();await f.settle();assert.equal(copied.reloaded(),true);
  assert.notEqual(copied.storage.get('riverside-tab-v1'),id);assert.equal(original.reloaded(),false);
});
