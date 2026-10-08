const demo = require('../data/map-demo.json');
const geometry = require('../src/js/domain/map.js');

// A map has its own minimal projection: pin visibility never grants report access.
function mapData(actor, state, presence, stations, serverTime, demoJourneys, eventZones = []) {
  const staff = ['mo', 'volunteer'].includes(actor.role);
  const own = i => state.reports.some(r => i.reportIds?.includes(r.id) && r.reporter.id === actor.id && r.reporter.role === actor.role);
  const visible = state.incidents.filter(i => staff
    ? actor.role === 'mo' || (!i.sensitive && !['pending', 'unavailable', 'legacy'].includes(i.sensitivityReview)) || i.assignee === actor.id
    : own(i) && i.assignee && ['accepted', 'arrived'].includes(i.assistance?.state));
  const incidents = visible.map(i => {
    const responder = presence.find(p => p.id === i.assignee);
    const start = i.assistance?.startPosition || i.assistance?.offers.find(o => o.status === 'accepted')?.startPosition;
    const simulation = demoJourneys?.project(i);
    const remaining = responder?.fresh && responder.position && i.assistance?.destination ? geometry.distance(responder.position, i.assistance.destination) : null;
    const progress = simulation?.progress ?? (remaining === null ? null : geometry.progress(i.assistance?.initialDistanceMetres, remaining));
    const location = i.assistance?.destination || i.location || i.zoneLocation;
    return {
    id: i.id, status: i.status, attention: i.attention, assignee: i.assignee,
    ...(location ? { position: { latitude: location.latitude, longitude: location.longitude }, locationKind: location === i.zoneLocation ? 'zone' : 'gps' } : {}),
    ...(i.zone === 'demo-location' ? { locationKind: 'demo-location', demoLocation: true } : {}),
    ...(simulation ? { position: simulation.destination, locationKind: 'demo', startPosition: simulation.startPosition, demo: true } : start && ['accepted', 'arrived'].includes(i.assistance?.state) ? { startPosition: { latitude: start.latitude, longitude: start.longitude } } : {}),
    progress,
    assistanceState: i.assistance?.state || null,
    initialDistanceMetres: i.assistance?.initialDistanceMetres ?? i.assistance?.offers.find(o => o.status === 'accepted')?.distanceMetres ?? null
  }; });
  return {
    centre: demo.centre, label: demo.label, serverTime,
    stations: stations?.enabled ? stations.stations : [],
    zones: eventZones.filter(z => z.active),
    incidents,
    // Public tracking contains only their own destination, a frozen starting fix
    // and a progress fraction. Moving responder coordinates stay staff-only.
    volunteers: staff ? presence.map(p => ({ id: p.id, name: p.name, state: p.state, fresh: p.fresh,
      ...(p.fresh && p.position ? { position: { latitude: p.position.latitude, longitude: p.position.longitude, accuracy: p.position.accuracy, capturedAt: p.position.capturedAt } } : {}),
      ...(() => { const journey = visible.find(i => i.assignee === p.id && demoJourneys?.project(i)); const simulated = journey && demoJourneys.project(journey); return simulated ? { position: simulated.position, fresh: true, demo: true } : {}; })()
    })) : []
  };
}
module.exports = { mapData };
