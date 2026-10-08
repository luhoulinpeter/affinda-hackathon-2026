const geometry = require('../src/js/domain/map.js');

function estimateLabel(seconds) {
  return seconds <= 120 ? 'Up to 2 minutes' : `About ${Math.ceil(seconds / 60)} minutes`;
}

// Server-only routing: viewers share the starting estimate; GPS/key never enter the
// public projection. The persisted reservation counts failures and restarts.
function createWalkingEstimates({ enabled = false, key = '', reserve = () => false, fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map();
  function signature(i, simulation) {
    const a = i.assistance;
    const start = simulation?.startPosition || a?.startPosition || a?.offers?.find(o => o.status === 'accepted')?.startPosition;
    const destination = simulation?.destination || a?.destination;
    return JSON.stringify([i.id, i.assignee, a?.offers?.find(o => o.status === 'accepted')?.id,
      !!simulation, start?.latitude, start?.longitude, destination?.latitude, destination?.longitude]);
  }
  async function get(i, _responder, simulation) {
    if (!i.assignee || i.status === 'resolved' || !['accepted', 'arrived'].includes(i.assistance?.state)) return null;
    if (i.assistance.state === 'arrived') return { state: 'arrived', label: 'Volunteer marked arrived' };
    if (i.zone === 'demo-location') return { state: 'disabled', label: 'Fictional demo destination · Google walking estimate disabled' };
    const origin = simulation?.startPosition || i.assistance.startPosition || i.assistance.offers?.find(o => o.status === 'accepted')?.startPosition;
    const destination = simulation?.destination || i.assistance.destination;
    if (!geometry.valid(origin) || !geometry.valid(destination)) return { state: 'unavailable', label: 'Starting walking estimate needs the volunteer’s starting location and requester GPS' };
    if (!enabled || !key) return { state: 'disabled', label: 'Google walking estimate is not configured' };
    const id = signature(i, simulation), old = cache.get(i.id);
    if (old?.id === id) {
      if (old.pending) return old.pending;
      // Keep the initial result, including failure, for this assignment. Moving
      // GPS, elapsed time, new viewers and page reloads never repeat the request.
      return old.result;
    }
    if (!reserve()) return { state: 'unavailable', label: 'Walking estimate request limit reached' };
    const entry = { id, at: now(), origin: { latitude: origin.latitude, longitude: origin.longitude } };
    entry.pending = (async () => {
      await Promise.resolve();
      try {
        const response = await fetchImpl('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST', signal: AbortSignal.timeout(8000),
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'routes.duration,routes.warnings' },
          body: JSON.stringify({ origin: { location: { latLng: entry.origin } }, destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } }, travelMode: 'WALK', computeAlternativeRoutes: false })
        });
        if (!response.ok) throw new Error('Routing unavailable');
        const route = (await response.json()).routes?.[0];
        const match = typeof route?.duration === 'string' && /^(\d+(?:\.\d+)?)s$/.exec(route.duration);
        const seconds = match ? Number(match[1]) : NaN;
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 604800) throw new Error('Invalid duration');
        entry.result = { state: 'ready', label: estimateLabel(seconds), source: 'Google Maps', estimatedAt: now(),
          warnings: Array.isArray(route.warnings) ? route.warnings.filter(w => typeof w === 'string').slice(0, 5) : [] };
      } catch {
        // No provider error body, key, coordinates or fabricated fallback ETA.
        entry.result = { state: 'unavailable', label: 'Google walking estimate is temporarily unavailable' };
      } finally { entry.pending = null; }
      return entry.result;
    })();
    cache.set(i.id, entry);
    return entry.pending;
  }
  // Retain only active assignments; do not evict an active starting estimate.
  function retain(incidents) {
    const active = new Set(incidents.filter(i => i.status !== 'resolved' && i.assignee && ['accepted', 'arrived'].includes(i.assistance?.state)).map(i => i.id));
    for (const id of cache.keys()) if (!active.has(id)) cache.delete(id);
  }
  return { get, signature, retain };
}
module.exports = { createWalkingEstimates, estimateLabel };
