// Person 2: deterministic roster rules. Code, not AI, decides who is eligible.
// Server-only (CommonJS). Inputs are plain state; nothing here changes state.

function minutesOfDay(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = type => Number(parts.find(part => part.type === type).value);
  return get("hour") * 60 + get("minute");
}
const toMinutes = text => { const [hours, minutes] = text.split(":").map(Number); return hours * 60 + minutes; };

function onShift(volunteer, data, now) {
  if (!volunteer.shift) return false;
  const current = minutesOfDay(now, data.rules.timeZone);
  const start = toMinutes(volunteer.shift.start), end = toMinutes(volunteer.shift.end);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

// Volunteer ID → the open incident they are offered or assigned to.
function assignments(incidents) {
  const busy = new Map();
  for (const incident of incidents) if (incident.assignee && incident.status !== "resolved") busy.set(incident.assignee, incident);
  return busy;
}

// Volunteers present in a zone: on shift, home zone, and not assigned to work in another zone.
function zoneCoverage(zoneId, data, incidents, now) {
  const busy = assignments(incidents);
  return data.volunteers.filter(volunteer => volunteer.zone === zoneId && onShift(volunteer, data, now) && (!busy.has(volunteer.id) || busy.get(volunteer.id).zone === zoneId)).length;
}

function coverageImpact(volunteerId, targetZone, data, incidents, now) {
  const volunteer = data.volunteers.find(item => item.id === volunteerId);
  const zone = data.zones.find(item => item.id === volunteer.zone);
  const before = zoneCoverage(zone.id, data, incidents, now);
  // Does this volunteer count towards their home zone now, and would they after the move?
  const current = assignments(incidents).get(volunteerId);
  const countsNow = onShift(volunteer, data, now) && (!current || current.zone === zone.id);
  const countsAfter = onShift(volunteer, data, now) && targetZone === zone.id;
  const after = before - Number(countsNow) + Number(countsAfter);
  return { zone: zone.id, before, after, minimum: zone.minimumCoverage, belowMinimum: after < zone.minimumCoverage };
}

// Eligible: on shift, not already on an open incident, not excluded (e.g. declined),
// and moving them keeps their home zone at or above its minimum. Same-zone volunteers first.
function eligibleVolunteers(incident, data, incidents, now, exclude = []) {
  const busy = assignments(incidents);
  const order = new Map(data.volunteers.map((volunteer, index) => [volunteer.id, index]));
  return data.volunteers
    .filter(volunteer => onShift(volunteer, data, now) && !busy.has(volunteer.id) && !exclude.includes(volunteer.id))
    .filter(volunteer => volunteer.zone === incident.zone || !coverageImpact(volunteer.id, incident.zone, data, incidents, now).belowMinimum)
    .map(volunteer => ({ volunteer, spare: zoneCoverage(volunteer.zone, data, incidents, now) - data.zones.find(zone => zone.id === volunteer.zone).minimumCoverage }))
    .sort((a, b) => Number(b.volunteer.zone === incident.zone) - Number(a.volunteer.zone === incident.zone) || b.spare - a.spare || order.get(a.volunteer.id) - order.get(b.volunteer.id))
    .map(item => item.volunteer.id);
}

// Counts are always derived from stored state, never stored separately.
function zoneSummary(data, reports, incidents, now) {
  const { reports: threshold, minutes } = data.rules.cluster;
  const since = now.getTime() - minutes * 60 * 1000;
  return data.zones.map(zone => {
    const here = incidents.filter(item => item.zone === zone.id);
    const open = here.filter(item => item.status !== "resolved");
    const recent = reports.filter(report => {
      const incident = incidents.find(item => item.reportIds.includes(report.id));
      return report.zone === zone.id && Date.parse(report.time) >= since && incident && incident.status !== "resolved";
    }).length;
    return {
      id: zone.id, name: zone.name,
      open: open.length,
      unacknowledged: open.filter(item => !item.acknowledgedBy).length,
      urgent: open.filter(item => item.attention === "urgent").length,
      resolved: here.length - open.length,
      coverage: { available: zoneCoverage(zone.id, data, incidents, now), minimum: zone.minimumCoverage },
      cluster: { active: recent >= threshold, recentReports: recent, threshold, minutes }
    };
  });
}

module.exports = { onShift, assignments, zoneCoverage, coverageImpact, eligibleVolunteers, zoneSummary };
