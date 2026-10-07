const { test } = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/fixtures.js');
const createIncidents = require('../src/js/domain/incidents.js');
const { createAssistance, position, distance } = require('../server/assistance.cjs');
const { validateStations, firstAid } = require('../server/stations.cjs');
function setup() {
  let time = 1000000;
  const accounts = new Set(data.volunteers.map(v => v.id)), alive = new Set(['priya', 'alex', 'sam']);
  const captured = [];
  const workflow = createIncidents(data, () => ({ classify: async report => { captured.push(report); throw new Error('Offline'); }, summarise: async report => { captured.push(report); throw new Error('Offline'); } }));
  const manager = createAssistance({ workflow, volunteers: data.volunteers, hasAccount: id => accounts.has(id), sessionAlive: token => alive.has(token), now: () => time });
  const pos = (latitude = 0, accuracy = 10) => ({ latitude, longitude: 0, accuracy, capturedAt: time });
  const volunteer = id => ({ id: `vol-${id}`, role: 'volunteer' });
  const available = (id, lat = 0) => manager.setPresence(volunteer(id), { available: true, position: pos(lat) }, id);
  async function request(reporter = { id: 'guest-test', role: 'public' }, destination = pos()) {
    const input = { zone: 'zone-a', text: 'Fictional scraped arm; please bring a bandaid', assistance: { requestId: String(Math.random()), state: 'looking', destination: position(destination, time), offers: [], events: [] } };
    if (reporter.role === 'volunteer') input.volunteerId = reporter.id; else input.reporter = reporter;
    const result = await workflow.submitReport(input); manager.tick(); return result.id;
  }
  const incident = id => workflow.getState().incidents.find(i => i.id === id);
  const offer = id => incident(id).assistance.offers.find(o => o.status === 'pending');
  return { manager, workflow, captured, accounts, alive, pos, volunteer, available, request, incident, offer, advance: n => { time += n; }, now: () => time };
}

test('nearest matching excludes the requester, missing accounts, reservations and busy responders', async () => {
  const t = setup(); t.available('priya', 0); t.available('alex', .001); t.available('sam', .002);
  const own = await t.request(t.volunteer('priya'));
  assert.equal(t.offer(own).volunteerId, 'vol-alex');
  const second = await t.request(); assert.equal(t.offer(second).volunteerId, 'vol-priya');
  t.manager.respond(t.volunteer('priya'), second, t.offer(second).id, 'accept');
  assert.equal(t.incident(second).assistance.state, 'accepted');
  t.accounts.delete('vol-sam');
  const third = await t.request(); assert.equal(t.incident(third).assistance.state, 'unavailable');
  assert.equal(t.incident(third).status, 'open');
  assert.equal(t.manager.snapshot(t.volunteer('priya')).presence[0].state, 'busy');
});

test('declines and sixty-second expiry move to the next volunteer and never repeat an attempt', async () => {
  const t = setup(); t.available('priya'); t.available('alex', .001); t.available('sam', .002);
  const id = await t.request(), first = t.offer(id);
  t.manager.respond(t.volunteer('priya'), id, first.id, 'decline');
  assert.equal(t.offer(id).volunteerId, 'vol-alex');
  t.advance(30000); t.available('alex', .001); t.available('sam', .002);
  t.advance(30001); t.manager.tick();
  assert.equal(t.offer(id).volunteerId, 'vol-sam');
  assert.throws(() => t.manager.respond(t.volunteer('alex'), id, t.incident(id).assistance.offers[1].id, 'accept'), e => e.status === 409);
  t.manager.respond(t.volunteer('sam'), id, t.offer(id).id, 'decline');
  assert.equal(t.incident(id).assistance.state, 'unavailable');
  assert.equal(t.incident(id).assistance.offers.length, 3);
  assert.equal(t.incident(id).status, 'open'); assert.equal(t.incident(id).attention, 'review');
});

test('stale GPS, paused presence and expired sessions withdraw offers', async () => {
  for (const mode of ['stale', 'pause', 'logout', 'inaccurate']) {
    const t = setup(); t.available('priya'); const id = await t.request(), offer = t.offer(id);
    if (mode === 'stale') t.advance(60001);
    if (mode === 'pause') t.manager.setPresence(t.volunteer('priya'), { available: false }, 'priya');
    if (mode === 'logout') t.alive.delete('priya');
    if (mode === 'inaccurate') assert.throws(() => t.manager.setPresence(t.volunteer('priya'), { available: true, position: t.pos(0, 101) }, 'priya'), e => e.status === 400);
    t.manager.tick(); assert.equal(t.incident(id).assistance.state, 'unavailable');
    assert.throws(() => t.manager.respond(t.volunteer('priya'), id, offer.id, 'accept'), e => e.status === 409);
  }
});

test('only the offered volunteer can accept once; arrival and human resolution remain separate', async () => {
  const t = setup(); t.available('priya'); const id = await t.request(), offer = t.offer(id);
  assert.throws(() => t.manager.respond(t.volunteer('alex'), id, offer.id, 'accept'), e => e.status === 404);
  t.manager.respond(t.volunteer('priya'), id, offer.id, 'accept');
  assert.throws(() => t.manager.respond(t.volunteer('priya'), id, offer.id, 'accept'), e => e.status === 409);
  assert.throws(() => t.manager.action(t.volunteer('alex'), id, 'arrive'), e => e.status === 403);
  t.manager.action(t.volunteer('priya'), id, 'arrive');
  assert.equal(t.incident(id).assistance.state, 'arrived'); assert.equal(t.incident(id).status, 'open');
  t.workflow.act(id, 'escalate', t.volunteer('priya')); t.manager.tick();
  assert.equal(t.incident(id).attention, 'urgent'); assert.equal(t.incident(id).assistance.state, 'arrived');
  t.workflow.act(id, 'resolve', t.volunteer('priya')); t.manager.tick();
  assert.equal(t.incident(id).assistance.state, 'completed'); assert.equal(t.incident(id).assistance.destination, undefined);
  assert.equal(t.manager.snapshot(t.volunteer('priya')).presence[0].state, 'paused');
  assert.ok(t.captured.every(report => !JSON.stringify(report).includes('latitude')));
});

test('withdrawal removes the destination, pauses the responder and leaves the incident open', async () => {
  const t = setup(); t.available('priya'); const id = await t.request();
  t.manager.respond(t.volunteer('priya'), id, t.offer(id).id, 'accept');
  assert.throws(() => t.manager.action({ id: 'guest-other', role: 'public' }, id, 'withdraw'), e => e.status === 403);
  t.manager.action({ id: 'guest-test', role: 'public' }, id, 'withdraw');
  const i = t.incident(id); assert.equal(i.status, 'open'); assert.equal(i.assignee, null); assert.equal(i.assistance.destination, undefined);
  assert.equal(t.manager.snapshot(t.volunteer('priya')).presence[0].state, 'paused');
});

test('Mo retry selects a newly available candidate; a restart invalidates pending offers', async () => {
  const t = setup(), id = await t.request(); assert.equal(t.incident(id).assistance.state, 'unavailable');
  t.available('priya'); assert.equal(t.incident(id).assistance.state, 'unavailable');
  t.manager.action({ id: 'mo', role: 'mo' }, id, 'retry'); assert.equal(t.offer(id).volunteerId, 'vol-priya');
  const restarted = createAssistance({ workflow: t.workflow, volunteers: data.volunteers, hasAccount: () => true, now: t.now });
  assert.equal(t.incident(id).assistance.state, 'unavailable');
  assert.equal(t.incident(id).assistance.offers[0].status, 'withdrawn');
  assert.ok(restarted.snapshot({ id: 'mo', role: 'mo' }).presence.every(p => p.state === 'paused' && !p.position));
});

test('GPS validation rejects stale, inaccurate, malformed and out-of-range positions', () => {
  const t = setup();
  for (const patch of [{ latitude: 91 }, { longitude: -181 }, { accuracy: 101 }, { accuracy: -1 }, { capturedAt: t.now() - 60001 }, { capturedAt: t.now() + 5001 }, { latitude: '0' }]) assert.throws(() => position({ ...t.pos(), ...patch }, t.now()), e => e.status === 400);
  assert.ok(distance(t.pos(), { ...t.pos(), latitude: .001 }) > 100);
});

test('station configuration has no default locations and lookup ranks without creating reports', () => {
  const t = setup(); assert.equal(firstAid(undefined).outcome, 'unknown');
  assert.throws(() => validateStations({ enabled: true, stations: [] }));
  const config = validateStations({ enabled: true, stations: [{ name: 'Demo east', description: 'Fictional east tent', latitude: 0, longitude: .002 }, { name: 'Demo centre', description: 'Fictional centre tent', latitude: 0, longitude: 0 }] });
  const ranked = firstAid(config, t.pos(), t.now()); assert.equal(ranked.stations[0].name, 'Demo centre'); assert.equal(ranked.stations[0].distanceMetres, 0);
  const noGps = firstAid(config); assert.ok(noGps.stations.every(s => s.distanceMetres === undefined)); assert.match(noGps.answer, /needed to identify/);
  const stale = firstAid(config, { ...t.pos(), capturedAt: 0 }, t.now()); assert.equal(stale.stations[0].distanceMetres, undefined);
  assert.equal(t.workflow.getState().incidents.length, 0);
});
