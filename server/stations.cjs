const { distance, position } = require('./assistance.cjs');
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
function validateStations(body) {
  if (typeof body.enabled !== 'boolean' || !Array.isArray(body.stations) || body.stations.length > 20 || (body.enabled && !body.stations.length)) fail('Provide up to 20 fictional stations; at least one is required to enable them.');
  const stations = body.stations.map((s, index) => {
    if (!s || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 100 || typeof s.description !== 'string' || !s.description.trim() || s.description.length > 500 ||
      !Number.isFinite(s.latitude) || Math.abs(s.latitude) > 90 || !Number.isFinite(s.longitude) || Math.abs(s.longitude) > 180) fail('Each station needs a name, description and valid latitude/longitude.');
    return { id: `first-aid-${index + 1}`, name: s.name.trim(), description: s.description.trim(), latitude: s.latitude, longitude: s.longitude, fictional: true };
  });
  return { enabled: body.enabled, stations };
}
function firstAid(config, suppliedPosition, now = Date.now()) {
  if (!config?.enabled || !config.stations.length) return { outcome: 'unknown', answer: 'Fictional first-aid stations have not been configured and enabled by Mo.', sources: [], stations: [] };
  let origin;
  if (suppliedPosition != null) { try { origin = position(suppliedPosition, now); } catch { /* Poor or stale GPS cannot establish nearest. */ } }
  const stations = config.stations.map(s => ({ ...s, ...(origin ? { distanceMetres: Math.round(distance(origin, s)) } : {}) })).sort((a,b) => origin ? a.distanceMetres - b.distanceMetres || a.id.localeCompare(b.id) : 0);
  const nearest = origin ? stations[0] : null;
  return {
    outcome: 'first_aid',
    answer: nearest ? `Fictional demo only: ${nearest.name} is the nearest configured test station, approximately ${nearest.distanceMetres} metres in a straight line. ${nearest.description} This is not a real first-aid facility or walking route.` : 'Fictional demo stations are listed below. A fresh, accurate GPS position is needed to identify the nearest. These are not real first-aid facilities.',
    sources: stations.map(s => ({ id: s.id, title: `${s.name} · fictional demo station`, text: s.description })), stations
  };
}
module.exports = { validateStations, firstAid };
