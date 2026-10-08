const { randomUUID } = require('node:crypto');
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
function validateZones(body, existing = []) {
  if (!Array.isArray(body.zones) || body.zones.length < 1 || body.zones.length > 12) fail('Provide 1 to 12 event zones.');
  const ids = new Set();
  const zones = body.zones.map(z => {
    if (!z || typeof z.name !== 'string' || !z.name.trim() || z.name.length > 100 ||
      typeof z.description !== 'string' || !z.description.trim() || z.description.length > 300 || typeof z.active !== 'boolean' ||
      !Number.isFinite(z.latitude) || Math.abs(z.latitude) > 90 || !Number.isFinite(z.longitude) || Math.abs(z.longitude) > 180) fail('Each zone needs a name, description, valid map coordinates and an active setting.');
    const id = z.id || `zone-${randomUUID()}`;
    if (typeof id !== 'string' || !/^zone-[a-z0-9-]{1,40}$/.test(id) || ids.has(id) || (z.id && !existing.some(old => old.id === z.id))) fail('Zone identifiers must be unique existing zones; leave the identifier empty for a new zone.');
    ids.add(id);
    return { id, name: z.name.trim(), description: z.description.trim(), latitude: z.latitude, longitude: z.longitude, active: z.active, fictional: true };
  });
  if (existing.some(z => !ids.has(z.id))) fail('Keep existing zones and turn off selectable instead of removing them, so report history stays readable.');
  if (!zones.some(z => z.active)) fail('Keep at least one selectable event zone.');
  return zones;
}
function sampleZones() {
  const centres = [[-37.7975,144.9601],[-37.7991,144.9608],[-37.7981,144.963]];
  return require('../data/fixtures.js').zones.filter(z => z.id.startsWith('zone-')).map((z,index) => ({ ...z,
    description: 'Fictional sample event zone. The marker is a reference point, not an exact attendee location or a defined boundary.',
    latitude: centres[index][0], longitude: centres[index][1], active: true, fictional: true }));
}
module.exports = { validateZones, sampleZones };
