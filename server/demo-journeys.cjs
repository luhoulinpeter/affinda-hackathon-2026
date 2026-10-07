const DURATION_MS = 90_000;
const START = Object.freeze({ latitude: -37.7958, longitude: 144.9612 });
const DESTINATION = Object.freeze({ latitude: -37.7992, longitude: 144.9620 });

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const point = (a, b, progress) => ({ latitude: a.latitude + (b.latitude - a.latitude) * progress, longitude: a.longitude + (b.longitude - a.longitude) * progress });

function createDemoJourneys({ now = Date.now } = {}) {
  const activeJourneys = new Map();

  function start(actor, incident) {
    if (actor?.role !== 'mo' || actor?.id !== 'mo') fail('Mo access required.', 403);
    if (!incident || typeof incident.id !== 'string') fail('Incident not found.', 404);
    if (incident.status === 'resolved' || !incident.assignee || !incident.assistance || !['accepted', 'arrived'].includes(incident.assistance.state)) {
      fail('A demo journey needs an accepted or arrived assignment on an unresolved incident.', 409);
    }
    // Keep only the assigned identity and local clock baseline. Never retain, read,
    // or derive from an incident destination or volunteer location.
    activeJourneys.set(incident.id, { assignee: incident.assignee, startedAt: now() });
    return project(incident);
  }

  function stop(actor, incidentId) {
    if (actor?.role !== 'mo' || actor?.id !== 'mo') fail('Mo access required.', 403);
    if (typeof incidentId !== 'string') fail('Incident not found.', 404);
    activeJourneys.delete(incidentId);
  }

  function project(incident) {
    if (!incident || typeof incident.id !== 'string') return null;
    const journey = activeJourneys.get(incident.id);
    if (!journey) return null;
    if (incident.assignee !== journey.assignee) { activeJourneys.delete(incident.id); return null; }
    if (incident.status === 'resolved' || !incident.assistance || ['cancelled', 'completed'].includes(incident.assistance.state)) {
      activeJourneys.delete(incident.id); return null;
    }
    const progress = Math.max(0, Math.min(1, (now() - journey.startedAt) / DURATION_MS));
    return {
      demo: true,
      startPosition: { ...START },
      position: point(START, DESTINATION, progress),
      destination: { ...DESTINATION },
      progress
    };
  }

  return { start, stop, project };
}

module.exports = { createDemoJourneys, DURATION_MS };
