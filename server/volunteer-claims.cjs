const { randomUUID } = require('node:crypto');
const { distance } = require('./assistance.cjs');

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

function createVolunteerClaims({ workflow, assistance, roster, now = Date.now }) {
  const volunteers = Array.isArray(roster) ? roster : [];
  const iso = () => new Date(now()).toISOString();
  const getState = () => workflow.getState();
  const isActive = incident => incident.status !== 'resolved' &&
    (!incident.assistance || !['cancelled', 'completed'].includes(incident.assistance.state));
  const reportsFor = (state, incident) => state.reports.filter(report => incident.reportIds?.includes(report.id));
  const sensitive = incident => incident.sensitive === true ||
    ['pending', 'unavailable', 'legacy'].includes(incident.sensitivityReview);
  const pendingOffer = incident => incident.assistance?.offers?.some(offer => offer.status === 'pending');
  const assistanceEnded = incident => ['cancelled', 'completed'].includes(incident.assistance?.state);

  function actorPresence(actor) {
    return assistance.snapshot({ id: 'mo', role: 'mo' }).presence.find(person => person.id === actor.id);
  }

  function validActor(actor) {
    if (actor?.role !== 'volunteer' || !volunteers.some(person => person.id === actor.id)) fail('Volunteer access required.', 403);
    const presence = actorPresence(actor);
    if (!presence?.hasAccount) fail('A volunteer account is required to claim an incident.', 403);
    return presence;
  }

  function canClaim(state, actor, incident, presence) {
    if (!incident || incident.status === 'resolved') return false;
    if (incident.assignee || pendingOffer(incident)) return false;
    if (sensitive(incident) || assistanceEnded(incident)) return false;
    if (incident.assistance?.offers?.some(offer => offer.volunteerId === actor.id)) return false;
    if (reportsFor(state, incident).some(report => report.reporter.id === actor.id && report.reporter.role === 'volunteer')) return false;
    if (presence.state !== 'available' || !presence.eligible) return false;
    if (state.incidents.some(other => other.id !== incident.id && isActive(other) &&
      (other.assignee === actor.id || other.assistance?.offers?.some(offer => offer.status === 'pending' && offer.volunteerId === actor.id)))) return false;
    return true;
  }

  function claimable(state, actor, incident) {
    if (!incident || incident.status !== 'open' || incident.assignee || pendingOffer(incident)) return false;
    if (sensitive(incident) || assistanceEnded(incident)) return false;
    if (incident.assistance?.offers?.some(offer => offer.volunteerId === actor.id)) return false;
    if (reportsFor(state, incident).some(report => report.reporter.id === actor.id && report.reporter.role === 'volunteer')) return false;
    return true;
  }

  function list(actor) {
    if (actor?.role !== 'volunteer' || !volunteers.some(person => person.id === actor.id)) fail('Volunteer access required.', 403);
    const state = getState();
    return state.incidents.filter(incident => claimable(state, actor, incident)).map(incident => ({
      id: incident.id,
      zone: incident.zone,
      category: incident.category,
      attention: incident.attention,
      status: incident.status
    }));
  }

  function claim(actor, id) {
    const presence = validActor(actor);
    const state = getState();
    const incident = state.incidents.find(item => item.id === id);
    if (!incident) fail('Incident not found.', 404);
    if (sensitive(incident)) fail('This incident needs Mo to assign a responder.', 403);
    if (incident.status !== 'open' || incident.assignee || pendingOffer(incident)) fail('This incident is no longer available to claim.', 409);
    if (assistanceEnded(incident)) fail('The requester stopped this assistance request.', 409);
    if (reportsFor(state, incident).some(report => report.reporter.id === actor.id && report.reporter.role === 'volunteer')) fail('You cannot claim your own report.', 403);
    if (incident.assistance?.offers?.some(offer => offer.volunteerId === actor.id)) fail('You have already been offered this incident.', 409);
    if (presence.state !== 'available' || !presence.eligible) fail('Go available with a current location before claiming an incident.', 409);
    if (state.incidents.some(other => other.id !== id && isActive(other) &&
      (other.assignee === actor.id || other.assistance?.offers?.some(offer => offer.status === 'pending' && offer.volunteerId === actor.id)))) fail('Finish or decline your current assignment before claiming another.', 409);

    // All checks and this mutation are synchronous on the single server event loop.
    // Recheck mutable incident gates inside the write callback before changing state.
    let acceptedOffer;
    workflow.updateAssistance(id, current => {
      if (!canClaim(getState(), actor, current, presence)) {
        fail('This incident is no longer available to claim.', 409);
      }
      const position = presence.position && {
        latitude: presence.position.latitude, longitude: presence.position.longitude,
        accuracy: presence.position.accuracy, capturedAt: presence.position.capturedAt
      };
      const destination = current.assistance?.destination || current.location;
      const hasDestination = !!destination && !!position;
      const meters = hasDestination ? distance(destination, position) : undefined;
      const assistanceRecord = current.assistance ||= { requestId: `claim-${randomUUID()}`, offers: [], events: [] };
      if (destination) assistanceRecord.destination = { ...destination };
      assistanceRecord.offers ||= [];
      assistanceRecord.events ||= [];
      const timestamp = iso();
      acceptedOffer = {
        id: randomUUID(), volunteerId: actor.id, status: 'accepted', offeredAt: timestamp,
        respondedAt: timestamp,
        ...(meters === undefined ? {} : { distanceMetres: Math.round(meters), startPosition: position })
      };
      assistanceRecord.offers.push(acceptedOffer);
      assistanceRecord.state = 'accepted';
      assistanceRecord.matchingMode = 'self';
      if (meters !== undefined) {
        assistanceRecord.initialDistanceMetres = meters;
        assistanceRecord.startPosition = position;
      } else {
        delete assistanceRecord.initialDistanceMetres;
        delete assistanceRecord.startPosition;
      }
      current.assignee = actor.id;
      assistanceRecord.events.push({ action: 'claimed', actorId: actor.id, volunteerId: actor.id, time: timestamp });
    });

    // The assistance service owns the private presence map. Its integration marks
    // the successful claimant busy without fabricating a Mo offer or audit event.
    assistance.markClaimed?.(actor.id);
    return { ok: true, offerId: acceptedOffer.id };
  }

  return { list, claim };
}

module.exports = { createVolunteerClaims };
