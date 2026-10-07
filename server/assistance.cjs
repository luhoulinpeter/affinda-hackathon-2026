const { randomUUID } = require('node:crypto');
const SHARING_MS = 10 * 60 * 1000;
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
function position(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 ||
      !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180 || !Number.isFinite(value.accuracy) || value.accuracy < 0 || value.accuracy > 100 ||
      !Number.isFinite(value.capturedAt) || now - value.capturedAt > 60000 || value.capturedAt > now + 5000) fail('A GPS position captured within 60 seconds, accurate to 100 metres or better, is required.');
  return { latitude: value.latitude, longitude: value.longitude, accuracy: value.accuracy, capturedAt: value.capturedAt, receivedAt: now };
}
function distance(a, b) {
  const rad = n => n * Math.PI / 180;
  const lat = rad(b.latitude - a.latitude), lng = rad(b.longitude - a.longitude);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function createAssistance({ workflow, volunteers, hasAccount, sessionAlive = () => true, now = Date.now }) {
  const presence = new Map();
  const iso = () => new Date(now()).toISOString();
  const fresh = p => !!p?.position && now() - p.position.capturedAt <= 60000 && now() - p.position.receivedAt <= 60000;
  const eligible = p => !!p?.position && p.expiresAt > now() && now() - p.position.capturedAt < SHARING_MS && now() - p.position.receivedAt < SHARING_MS && sessionAlive(p.sessionToken);
  const state = () => workflow.getState();
  const active = incident => incident.assistance && !['cancelled', 'completed'].includes(incident.assistance.state);
  function change(id, update) { workflow.updateAssistance(id, update); }
  function event(a, action, actorId, volunteerId) { a.events.push({ action, actorId, volunteerId: volunteerId || null, time: iso() }); }
  function reserved(id) {
    return state().incidents.some(i => active(i) && (i.assignee === id || i.assistance.offers.some(o => o.status === 'pending' && o.volunteerId === id)));
  }
  function release(id, pause = false) {
    const p = presence.get(id);
    if (p && !reserved(id)) {
      p.state = pause || !eligible(p) ? 'paused' : 'available';
      if (p.state === 'paused') delete p.position;
    }
  }
  function end(id, action, actorId) {
    const i = state().incidents.find(i => i.id === id);
    if (!i || !active(i)) return;
    const responders = [i.assignee, ...i.assistance.offers.filter(o => o.status === 'pending').map(o => o.volunteerId)].filter(Boolean);
    change(id, incident => {
      const a = incident.assistance;
      for (const o of a.offers.filter(o => o.status === 'pending')) { o.status = 'withdrawn'; o.respondedAt = iso(); }
      a.state = action === 'completed' ? 'completed' : 'cancelled';
      delete a.destination;
      delete a.startPosition; delete a.initialDistanceMetres;
      for (const offer of a.offers) delete offer.startPosition;
      if (action !== 'completed') incident.assignee = null;
      event(a, action, actorId);
    });
    responders.forEach(id => release(id, true));
  }
  function match(id) {
    const s = state(), incident = s.incidents.find(i => i.id === id), a = incident?.assistance;
    if (!active(incident || {}) || incident.status === 'resolved' || !['looking', 'unavailable'].includes(a.state)) return;
    // Unavailable requests require an explicit Mo retry, not a recurring dispatch loop.
    if (a.state === 'unavailable') return;
    if (a.matchingMode === 'manual') {
      change(id, i => { i.assistance.state = 'unavailable'; event(i.assistance, 'manual_offer_ended', 'system'); });
      return;
    }
    // Private or unchecked reports wait for Mo's explicit personal assignment.
    if (incident.sensitive || ['pending', 'unavailable', 'legacy'].includes(incident.sensitivityReview)) return;
    const reporters = s.reports.filter(r => incident.reportIds.includes(r.id)).map(r => r.reporter.id);
    const attempted = new Set(a.offers.map(o => o.volunteerId));
    const candidates = volunteers.filter(v => hasAccount(v.id) && !reporters.includes(v.id) && !attempted.has(v.id) &&
      presence.get(v.id)?.state === 'available' && eligible(presence.get(v.id)) && !reserved(v.id))
      .map(v => ({ id: v.id, distance: distance(a.destination, presence.get(v.id).position) }))
      .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
    const chosen = candidates[0];
    change(id, i => {
      if (!chosen) { i.assistance.state = 'unavailable'; event(i.assistance, 'no_volunteer_available', 'system'); return; }
      i.assistance.state = 'offered';
      i.assistance.offers.push({ id: randomUUID(), volunteerId: chosen.id, status: 'pending', offeredAt: iso(), expiresAt: new Date(now() + 60000).toISOString(), distanceMetres: Math.round(chosen.distance) });
      event(i.assistance, 'offered', 'system', chosen.id);
    });
  }
  function tick() {
    for (const [id, p] of presence) if (p.state !== 'paused' && !eligible(p)) { p.state = 'paused'; p.reason = 'Sharing session ended. Choose Go available for another 10 minutes.'; delete p.position; }
    for (const i of state().incidents) {
      if (!active(i)) continue;
      if (i.status === 'resolved') { end(i.id, 'completed', i.resolvedBy?.id || 'system'); continue; }
      const offer = i.assistance.offers.find(o => o.status === 'pending');
      if (offer && i.assistance.matchingMode !== 'manual' && (i.sensitive || ['pending', 'unavailable', 'legacy'].includes(i.sensitivityReview))) {
        change(i.id, incident => {
          const current = incident.assistance.offers.find(o => o.id === offer.id);
          current.status = 'withdrawn'; current.respondedAt = iso();
          incident.assistance.state = 'looking'; event(incident.assistance, 'privacy_hold', 'system', offer.volunteerId);
        });
        release(offer.volunteerId);
        continue;
      }
      if (offer && (Date.parse(offer.expiresAt) <= now() || !eligible(presence.get(offer.volunteerId)) || presence.get(offer.volunteerId)?.state !== 'available')) {
        change(i.id, incident => {
          const current = incident.assistance.offers.find(o => o.id === offer.id);
          current.status = Date.parse(offer.expiresAt) <= now() ? 'expired' : 'withdrawn'; current.respondedAt = iso();
          incident.assistance.state = 'looking'; event(incident.assistance, current.status, 'system', offer.volunteerId);
        });
        release(offer.volunteerId);
      }
      match(i.id);
    }
  }
  // Offers cannot survive a process restart: presence and sessions are deliberately ephemeral.
  for (const i of state().incidents) if (active(i)) {
    change(i.id, incident => {
      for (const o of incident.assistance.offers.filter(o => o.status === 'pending')) { o.status = 'withdrawn'; o.respondedAt = iso(); }
      if (!incident.assignee) incident.assistance.state = 'unavailable';
      event(incident.assistance, 'server_restarted', 'system');
    });
  }
  function setPresence(actor, body, token) {
    if (actor.role !== 'volunteer') fail('Volunteer access required.', 403);
    if (typeof body.available !== 'boolean') fail('Choose whether you are available.');
    if (body.start !== undefined && typeof body.start !== 'boolean') fail('Choose whether to start a new sharing session.');
    const existing = presence.get(actor.id);
    if (existing?.state !== 'paused' && eligible(existing) && existing.sessionToken !== token) fail('Location sharing is already active for this volunteer in another tab or device. Pause it there first.', 409);
    if (!body.available) { pause(actor.id, token); return; }
    if (body.start === false && (!eligible(existing) || existing.state === 'paused' || existing.sessionToken !== token)) fail('Sharing session ended. Choose Go available for another 10 minutes.', 409);
    let p;
    try { p = position(body.position, now()); }
    catch (error) { pause(actor.id, token); throw error; }
    const busy = state().incidents.some(i => active(i) && i.assignee === actor.id);
    const expiresAt = body.start === true || !eligible(existing) ? now() + SHARING_MS : existing.expiresAt;
    presence.set(actor.id, { state: busy ? 'busy' : 'available', position: p, sessionToken: token, expiresAt });
    tick();
  }
  function pause(id, token) {
    if (presence.has(id) && (token === undefined || presence.get(id).sessionToken === token)) { presence.set(id, { state: 'paused' }); tick(); }
  }
  function offer(actor, id, volunteerId) {
    if (actor.role !== 'mo') fail('Mo access required.', 403);
    tick();
    const s = state(), i = s.incidents.find(i => i.id === id);
    if (!i) fail('Incident not found.', 404);
    if (i.status === 'resolved') fail('A resolved incident cannot receive an offer.', 409);
    if (!volunteers.some(v => v.id === volunteerId) || !hasAccount(volunteerId)) fail('Choose a volunteer with an account.');
    if (i.assignee || i.assistance?.offers.some(o => o.status === 'pending')) fail('Stop the current assistance assignment or offer before choosing another volunteer.', 409);
    if (s.reports.some(r => i.reportIds.includes(r.id) && r.reporter.id === volunteerId)) fail('A volunteer cannot respond to their own report.', 409);
    if (presence.get(volunteerId)?.state !== 'available' || !eligible(presence.get(volunteerId)) || reserved(volunteerId)) fail('This volunteer is not available for a new offer.', 409);
    if (i.assistance?.offers.some(o => o.volunteerId === volunteerId)) fail('This volunteer has already been offered this incident. Choose another volunteer.', 409);
    change(id, incident => {
      const a = incident.assistance ||= { requestId: `mo-${randomUUID()}`, offers: [], events: [] };
      if (!a.destination && incident.location) a.destination = { ...incident.location };
      a.state = 'offered'; a.matchingMode = 'manual';
      a.offers.push({ id: randomUUID(), volunteerId, status: 'pending', offeredAt: iso(), expiresAt: new Date(now() + 60000).toISOString(), ...(a.destination ? { distanceMetres: Math.round(distance(a.destination, presence.get(volunteerId).position)) } : {}) });
      event(a, 'offered_by_mo', actor.id, volunteerId);
    });
  }
  function respond(actor, incidentId, offerId, decision) {
    tick();
    if (actor.role !== 'volunteer') fail('Volunteer access required.', 403);
    const i = state().incidents.find(i => i.id === incidentId);
    const o = i?.assistance?.offers.find(o => o.id === offerId && o.volunteerId === actor.id);
    if (!o) fail('Offer not found.', 404);
    if (!['accept', 'decline'].includes(decision)) fail('Choose accept or decline.');
    if (o.status !== 'pending' || !active(i) || i.status === 'resolved') fail('This offer is no longer available.', 409);
    if (decision === 'accept' && (!eligible(presence.get(actor.id)) || presence.get(actor.id).state !== 'available' || state().incidents.some(j => active(j) && j.assignee === actor.id))) fail('You are no longer available for this offer.', 409);
    change(i.id, incident => {
      const a = incident.assistance, offer = a.offers.find(o => o.id === offerId);
      offer.status = decision === 'accept' ? 'accepted' : 'declined'; offer.respondedAt = iso();
      a.state = decision === 'accept' ? 'accepted' : 'looking';
      if (decision === 'accept') {
        incident.assignee = actor.id;
        a.startPosition = { latitude: presence.get(actor.id).position.latitude, longitude: presence.get(actor.id).position.longitude };
        if (a.destination) a.initialDistanceMetres = distance(presence.get(actor.id).position, a.destination);
      }
      event(a, offer.status, actor.id, actor.id);
    });
    if (decision === 'accept') presence.get(actor.id).state = 'busy';
    else { release(actor.id); match(i.id); }
  }
  function action(actor, id, action) {
    tick();
    const s = state(), i = s.incidents.find(i => i.id === id);
    if (!i?.assistance) fail('Assistance request not found.', 404);
    const owner = s.reports.some(r => i.reportIds.includes(r.id) && r.reporter.id === actor.id && r.reporter.role === actor.role);
    const mo = actor.role === 'mo';
    if (action === 'arrive') {
      if (actor.role !== 'volunteer' || i.assignee !== actor.id) fail('Assigned volunteer access required.', 403);
      if (i.assistance.state !== 'accepted' || i.status === 'resolved') fail('This assignment cannot be marked arrived.', 409);
      change(id, i => { i.assistance.state = 'arrived'; event(i.assistance, 'arrived', actor.id, actor.id); });
    } else if (action === 'withdraw') {
      if (!mo && !owner) fail('Only Mo or the requester can stop assistance.', 403);
      if (!active(i)) fail('Assistance has already ended.', 409);
      end(id, 'cancelled', actor.id);
    } else if (action === 'retry') {
      if (!mo) fail('Mo access required.', 403);
      if (!active(i) || !i.assistance.destination || i.status === 'resolved') fail('This assistance request cannot be retried.', 409);
      const responder = i.assignee;
      const offered = i.assistance.offers.filter(o => o.status === 'pending').map(o => o.volunteerId);
      change(id, i => {
        for (const o of i.assistance.offers.filter(o => o.status === 'pending')) { o.status = 'withdrawn'; o.respondedAt = iso(); }
        i.assignee = null; i.assistance.state = 'looking'; i.assistance.matchingMode = 'nearest'; event(i.assistance, 'retry', actor.id);
      });
      [responder, ...offered].filter(Boolean).forEach(id => release(id, true));
      match(id);
    } else fail('Unknown assistance action.');
  }
  function snapshot(actor) {
    tick();
    const list = volunteers.filter(v => actor.role === 'mo' || v.id === actor.id).map(v => {
      const p = presence.get(v.id);
      return { id: v.id, name: v.name, state: p?.state || 'paused', fresh: fresh(p), eligible: eligible(p), hasAccount: hasAccount(v.id), expiresAt: p?.expiresAt || null, reason: p?.reason || '', ...(p?.position ? { position: p.position } : {}) };
    });
    return { serverTime: now(), presence: actor.role === 'public' ? [] : list };
  }
  function markClaimed(id) { const p = presence.get(id); if (p) p.state = 'busy'; }
  return { tick, setPresence, pause, offer, respond, action, snapshot, markClaimed };
}
module.exports = { createAssistance, position, distance };
