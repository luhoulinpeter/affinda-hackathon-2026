// Person 2: server-side state and permitted changes. The browser uses api.js.
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory;
  else root.RiversideIncidents = factory(root.RiversideData, () => root.RiversideAI);
})(typeof window !== "undefined" ? window : globalThis, (data, getAI, initial = {}, persist = () => {}) => {
  const reports = JSON.parse(JSON.stringify(initial.reports || []));
  const incidents = JSON.parse(JSON.stringify(initial.incidents || []));
  const subscribers = new Set();
  const jobs = new Set();
  let sequence = [...reports, ...incidents].reduce((max, item) => Math.max(max, Number(item.id.slice(2)) || 0), Number.isSafeInteger(initial.sequence) && initial.sequence >= 0 ? initial.sequence : 0);
  let generation = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const notify = () => { persist(getState()); subscribers.forEach(callback => callback()); };
  // A stopped process cannot finish old calls. Do not spend credits retrying on restart.
  for (const incident of incidents) {
    for (const provider of ['jev', 'luna']) {
      if (incident.analysis?.[provider]?.state === 'pending') incident.analysis[provider] = { state: 'failed', reason: 'Analysis interrupted by server restart' };
    }
  }

  function history(incident, actor, action) {
    incident.history.push({ actorId: actor.id, actorRole: actor.role, action, time: now() });
  }

  function getState() {
    return clone({ reports, incidents, sequence });
  }

  async function submitReport(input) {
    const volunteer = data.volunteers.find(item => item.id === input.volunteerId);
    const publicReporter = input.reporter && input.reporter.role === "public" && /^guest-[a-z0-9-]+$/i.test(input.reporter.id);
    const moReporter = input.reporter?.role === "mo" && input.reporter.id === "mo";
    if (!volunteer && !publicReporter && !moReporter) throw new Error("Choose a valid reporter.");
    const reporter = volunteer ? { id: volunteer.id, role: "volunteer" } : { id: input.reporter.id, role: input.reporter.role };
    if (!data.zones.some(item => item.id === input.zone)) throw new Error("Choose a valid zone.");
    const text = String(input.text || "").trim();
    if (!text || text.length > 2000) throw new Error("Write a report between 1 and 2,000 characters.");
    const category = input.category || "other";
    if (!data.categories.some(item => item.id === category)) throw new Error("Choose a valid issue type.");

    const number = ++sequence;
    const report = {
      id: `R-${number}`, volunteerId: volunteer ? volunteer.id : null, reporter, category, zone: input.zone, text,
      immediateConcern: input.immediateConcern === true, time: now()
    };
    const incident = {
      id: `I-${number}`, reportIds: [report.id], zone: report.zone,
      category: "unclassified", brief: "Awaiting human review",
      status: "open", attention: report.immediateConcern || /\bcrowd pressure\b|\bimmediate danger\b/i.test(report.text) ? "urgent" : "review",
      assignee: null, acknowledgedBy: null, resolvedBy: null, resolvedAt: null,
      analysis: { jev: { state: "pending" }, luna: { state: "pending" } }, history: []
    };
    history(incident, reporter, "reported");
    // Save and show the source report BEFORE waiting for any external service.
    reports.push(report);
    incidents.push(incident);
    notify();

    // Independent jobs start after persistence; callers get a reference without waiting.
    const reportGeneration = generation;
    for (const provider of ['jev', 'luna']) {
      const job = Promise.resolve().then(async () => {
        if (reportGeneration !== generation) return;
        try {
          const suggestion = await (provider === 'jev' ? getAI().classify(clone(report)) : getAI().summarise(clone(report)));
          if (reportGeneration !== generation) return;
          const keys = Object.keys(suggestion || {});
          if (provider === 'jev') {
            if (keys.length !== 2 || !keys.includes('category') || !keys.includes('urgency') || !data.categories.some(item => item.id === suggestion.category) || !['routine', 'urgent', 'unclear'].includes(suggestion.urgency)) throw new Error('Invalid classification');
            incident.category = suggestion.category;
            if (suggestion.urgency === 'urgent') incident.attention = 'urgent';
          } else {
            if (keys.length !== 1 || typeof suggestion.summary !== 'string' || !suggestion.summary.trim() || suggestion.summary.length > 1200) throw new Error('Invalid summary');
            incident.brief = suggestion.summary.trim();
          }
          incident.analysis[provider] = { state: 'complete', suggestion: clone(suggestion) };
        } catch {
          if (reportGeneration !== generation) return;
          incident.analysis[provider] = { state: 'failed', reason: 'Analysis unavailable; original report retained for Mo' };
        }
        notify();
      });
      jobs.add(job);
      job.finally(() => jobs.delete(job)).catch(() => {});
    }
    return clone(incident);
  }

  function act(incidentId, action, actor) {
    const incident = incidents.find(item => item.id === incidentId);
    if (!incident) throw new Error("Incident not found.");
    const isMo = actor && actor.role === "mo" && actor.id === "mo";
    const isVolunteer = actor && actor.role === "volunteer" && data.volunteers.some(item => item.id === actor.id);
    const isReporter = actor && reports.some(report => incident.reportIds.includes(report.id) && report.reporter.id === actor.id && report.reporter.role === actor.role);
    const isAssignee = isVolunteer && actor.id === incident.assignee;
    if (!(isMo || isReporter || isAssignee)) throw new Error("This account cannot change this incident.");
    if (actor.role === "public" && action !== "resolve") throw new Error("An event-goer may only confirm resolution of their own report.");
    if (incident.status === "resolved") throw new Error("This incident is already confirmed resolved.");

    if (action === "acknowledge") {
      if (!isMo) throw new Error("Only Mo can acknowledge in this starter.");
      if (incident.acknowledgedBy) throw new Error("Mo has already acknowledged this incident.");
      incident.acknowledgedBy = actor.id;
    } else if (action === "escalate") {
      if (incident.status === "escalated") throw new Error("This incident is already escalated.");
      incident.status = "escalated";
      incident.attention = "urgent";
    } else if (action === "resolve") {
      incident.status = "resolved";
      incident.resolvedBy = { id: actor.id, role: actor.role };
      incident.resolvedAt = now();
    } else {
      throw new Error("Unknown incident action.");
    }
    history(incident, actor, action);
    notify();
    return clone(incident);
  }

  // Retain the saved counter so stale actions cannot target later reports, even after restart.
  function reset() {
    generation++;
    reports.length = 0;
    incidents.length = 0;
    notify();
  }

  return {
    getState, submitReport, act, reset, whenIdle: () => Promise.all([...jobs]),
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
  };
});
