const { distance } = require('./assistance.cjs');
const CATEGORIES = new Set(require('../data/fixtures.js').categories.map(item => item.id));

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const active = incident => incident.assistance && !['cancelled', 'completed'].includes(incident.assistance.state);
const band = metres => metres <= 250 ? 'near' : metres <= 1000 ? 'medium' : 'far';
const validIds = ids => Array.isArray(ids) && new Set(ids).size === ids.length && ids.every(id => typeof id === 'string');

function createAssignmentRecommendations({ workflow, assistance, providers, roster, now = Date.now }) {
  if (!workflow?.getState || !assistance?.snapshot || !providers?.rankAssignment || !Array.isArray(roster)) throw new TypeError('Assignment recommendation dependencies are required.');

  function candidatesFor(incident) {
    const state = workflow.getState();
    const presence = assistance.snapshot({ role: 'mo' }).presence;
    if (!incident || incident.status === 'resolved' || incident.assignee || incident.assistance?.offers.some(o => o.status === 'pending')) return { incident: null, candidates: [] };

    const reporters = new Set(state.reports.filter(r => incident.reportIds.includes(r.id)).map(r => r.reporter.id));
    const attempted = new Set(incident.assistance?.offers.map(o => o.volunteerId) || []);
    const busy = new Set();
    for (const item of state.incidents) {
      if (!active(item)) continue;
      if (item.assignee) busy.add(item.assignee);
      for (const offer of item.assistance.offers) if (offer.status === 'pending') busy.add(offer.volunteerId);
    }
    const byId = new Map(presence.map(item => [item.id, item]));
    const qualified = roster.filter(volunteer => {
      const person = byId.get(volunteer.id);
      return person?.hasAccount && !reporters.has(volunteer.id) && !attempted.has(volunteer.id) &&
        person.state === 'available' && person.eligible && !busy.has(volunteer.id);
    }).map(volunteer => {
      const person = byId.get(volunteer.id);
      let distanceBand = 'unknown';
      const destination = incident.assistance?.destination || incident.location;
      if (destination && person.position) distanceBand = band(distance(destination, person.position));
      return { id: volunteer.id, name: volunteer.name, sameZone: volunteer.zone === incident.zone, fresh: person.fresh === true, distanceBand };
    });

    const sourceCategory = state.reports.find(report => incident.reportIds.includes(report.id) && CATEGORIES.has(report.category))?.category;
    const category = CATEGORIES.has(incident.category) ? incident.category : sourceCategory;
    const urgency = incident.attention === 'urgent' ? 'urgent' : incident.attention === 'review' ? 'unclear' : 'routine';
    if (qualified.length && (!category || !urgency)) fail('Incident category and urgency are not available for a recommendation.', 409);
    return {
      incident: qualified.length ? { category, urgency, zone: incident.zone } : null,
      candidates: qualified
    };
  }

  const fingerprint = (incidentId, candidateSet) => JSON.stringify({ incidentId,
    incident: candidateSet.incident, candidates: candidateSet.candidates.map(c => ({ id: c.id, sameZone: c.sameZone, fresh: c.fresh, distanceBand: c.distanceBand })) });

  function reasons(candidate) {
    return [candidate.sameZone ? 'Volunteer roster zone matches the incident zone.' : 'Volunteer roster zone differs from the incident zone.',
      candidate.fresh ? 'Volunteer location is fresh.' : 'Volunteer location is older but still eligible.',
      candidate.distanceBand === 'unknown' ? 'Requester GPS distance is unavailable.' : `Approximate distance band: ${candidate.distanceBand}.`];
  }

  async function recommend(actor, incidentId, { isCurrent = () => true } = {}) {
    if (actor?.role !== 'mo' || actor?.id !== 'mo') fail('Mo access required.', 403);
    if (typeof isCurrent !== 'function' || !isCurrent()) fail('Session changed. Refresh and try again.', 403);
    if (typeof incidentId !== 'string') fail('Incident not found.', 404);
    let state = workflow.getState();
    let incident = state.incidents.find(item => item.id === incidentId);
    if (!incident) fail('Incident not found.', 404);
    if (incident.status === 'resolved' || incident.assignee || incident.assistance?.offers.some(o => o.status === 'pending')) fail('This incident cannot receive a new recommendation.', 409);

    const initial = candidatesFor(incident);
    if (!initial.candidates.length) return { incidentId, recommendations: [], advisory: true };
    const before = fingerprint(incidentId, initial);
    const response = await providers.rankAssignment({ incident: initial.incident, candidates: initial.candidates.map(({ id, sameZone, fresh, distanceBand }) => ({ id, sameZone, fresh, distanceBand })) });
    if (!isCurrent()) fail('Session changed. Refresh and try again.', 403);

    state = workflow.getState();
    incident = state.incidents.find(item => item.id === incidentId);
    const current = incident ? candidatesFor(incident) : { incident: null, candidates: [] };
    if (!incident || incident.status === 'resolved' || incident.assignee || incident.assistance?.offers.some(o => o.status === 'pending') || fingerprint(incidentId, current) !== before) {
      fail('Incident or volunteer availability changed. Refresh and request a new recommendation.', 409);
    }

    const rankedIds = response?.rankedIds;
    const availableIds = new Set(initial.candidates.map(candidate => candidate.id));
    if (!validIds(rankedIds) || rankedIds.length !== availableIds.size || rankedIds.some(id => !availableIds.has(id))) fail('Invalid assignment recommendation response.', 502);
    const byId = new Map(initial.candidates.map(candidate => [candidate.id, candidate]));
    return { incidentId, advisory: true, recommendations: rankedIds.map(id => {
      const candidate = byId.get(id);
      return { id, name: candidate.name, reasons: reasons(candidate) };
    }) };
  }

  return { recommend };
}

module.exports = { createAssignmentRecommendations };
