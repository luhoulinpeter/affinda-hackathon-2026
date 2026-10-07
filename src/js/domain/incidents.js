// Person 2: server-side state and permitted changes. The browser uses api.js.
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory;
  else root.RiversideIncidents = factory(root.RiversideData, () => root.RiversideAI);
})(typeof window !== "undefined" ? window : globalThis, (data, getAI, initial = {}, persist = () => {}, options = {}) => {
  const roster = require("./roster.js");
  const SYSTEM = { id: "system", role: "system" };
  // Attention only ever rises automatically: routine (volunteer handling) → review (Mo should look) → urgent.
  const LEVELS = ["routine", "review", "urgent"];
  const reports = JSON.parse(JSON.stringify(initial.reports || []));
  const incidents = JSON.parse(JSON.stringify(initial.incidents || []));
  const subscribers = new Set();
  const jobs = new Set();
  let sequence = [...reports, ...incidents].reduce((max, item) => Math.max(max, Number(item.id.slice(2)) || 0), Number.isSafeInteger(initial.sequence) && initial.sequence >= 0 ? initial.sequence : 0);
  let generation = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const clock = options.now || (() => new Date());
  const now = () => clock().toISOString();
  const notify = () => { persist(getState()); subscribers.forEach(callback => callback()); };
  // A stopped process cannot finish old calls. Do not spend credits retrying on restart.
  for (const incident of incidents) {
    for (const provider of ['jev', 'luna']) {
      if (incident.analysis?.[provider]?.state === 'pending') incident.analysis[provider] = { state: 'failed', reason: 'Analysis interrupted by server restart' };
    }
  }

  function history(incident, actor, action, details) {
    incident.history.push({ actorId: actor.id, actorRole: actor.role, action, time: now(), ...(details ? { details } : {}) });
  }
  function raise(incident, level) {
    if (LEVELS.indexOf(level) > LEVELS.indexOf(incident.attention)) incident.attention = level;
  }
  function setOffer(incident, volunteerId, by, details = {}) {
    incident.assignee = volunteerId;
    incident.assignment = { volunteerId, state: "offered", offeredBy: by.id, offeredAt: now() };
    history(incident, by, "offered", { volunteerId, ...details });
  }
  // Deterministic routing: offer to the first eligible volunteer; nobody eligible → urgent for Mo.
  // The report stays visible to Mo either way. TODO(Person 3): Jev may choose among `candidates`.
  function offerNext(incident) {
    const candidates = roster.eligibleVolunteers(incident, data, incidents, clock(), incident.declinedBy || []);
    if (!candidates.length) {
      raise(incident, "urgent");
      history(incident, SYSTEM, "no_eligible_volunteer");
      return;
    }
    setOffer(incident, candidates[0], SYSTEM);
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
      status: "open",
      // Urgent signals alert Mo at once; "other / unsure" is unclear, so Mo reviews it; the rest is routine.
      attention: report.immediateConcern || /\bcrowd pressure\b|\bimmediate danger\b/i.test(report.text) ? "urgent" : category === "other" ? "review" : "routine",
      assignee: null, assignment: null, declinedBy: [], acknowledgedBy: null, resolvedBy: null, resolvedAt: null,
      analysis: { jev: { state: "pending" }, luna: { state: "pending" } }, history: []
    };
    history(incident, reporter, "reported");
    // Save and show the source report BEFORE waiting for any external service.
    reports.push(report);
    incidents.push(incident);
    offerNext(incident); // Synchronous, so routing never delays Mo's alert.
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
            if (suggestion.urgency === 'urgent') raise(incident, 'urgent');
            if (suggestion.urgency === 'unclear') raise(incident, 'review');
          } else {
            if (keys.length !== 1 || typeof suggestion.summary !== 'string' || !suggestion.summary.trim() || suggestion.summary.length > 1200) throw new Error('Invalid summary');
            incident.brief = suggestion.summary.trim();
          }
          incident.analysis[provider] = { state: 'complete', suggestion: clone(suggestion) };
        } catch {
          if (reportGeneration !== generation) return;
          incident.analysis[provider] = { state: 'failed', reason: 'Analysis unavailable; original report retained for Mo' };
          if (provider === 'jev') raise(incident, 'review'); // Unclassified reports go to Mo.
        }
        notify();
      });
      jobs.add(job);
      job.finally(() => jobs.delete(job)).catch(() => {});
    }
    return clone(incident);
  }

  function act(incidentId, action, actor, params = {}) {
    const incident = incidents.find(item => item.id === incidentId);
    if (!incident) throw new Error("Incident not found.");
    const isMo = actor && actor.role === "mo" && actor.id === "mo";
    const isVolunteer = actor && actor.role === "volunteer" && data.volunteers.some(item => item.id === actor.id);
    const isReporter = actor && reports.some(report => incident.reportIds.includes(report.id) && report.reporter.id === actor.id && report.reporter.role === actor.role);
    const isAssignee = isVolunteer && actor.id === incident.assignee;
    if (!(isMo || isReporter || isAssignee)) throw new Error("This account cannot change this incident.");
    if (actor.role === "public" && action !== "resolve") throw new Error("An event-goer may only confirm resolution of their own report.");
    if (incident.status === "resolved") throw new Error("This incident is already confirmed resolved.");
    const assignmentState = incident.assignment?.state;
    function requireAssignee(...states) {
      if (!isAssignee) throw new Error("Only the volunteer this incident was offered to can do this.");
      if (!states.includes(assignmentState)) throw new Error(assignmentState === "offered" ? "Accept the offer first." : `This step is not available while the assignment is ${assignmentState}.`);
    }

    if (action === "accept") {
      requireAssignee("offered");
      Object.assign(incident.assignment, { state: "accepted", acceptedAt: now() });
    } else if (action === "decline") {
      requireAssignee("offered");
      incident.declinedBy = [...(incident.declinedBy || []), actor.id];
      incident.assignee = null;
      incident.assignment = null;
      raise(incident, "review"); // Mo gets renewed attention on every decline.
      history(incident, actor, action);
      offerNext(incident);
      notify();
      return clone(incident);
    } else if (action === "arrived") {
      requireAssignee("accepted");
      Object.assign(incident.assignment, { state: "arrived", arrivedAt: now() });
    } else if (action === "propose_resolution") {
      requireAssignee("accepted", "arrived");
      Object.assign(incident.assignment, { state: "proposed", proposedAt: now() });
      raise(incident, "review"); // Still open until someone explicitly confirms.
    } else if (action === "offer" || action === "reassign") {
      if (!isMo) throw new Error("Only Mo can offer or reassign an incident.");
      if (action === "offer" && incident.assignee) throw new Error("This incident already has a volunteer. Use reassign.");
      if (action === "reassign" && !incident.assignee) throw new Error("No volunteer to reassign. Use offer.");
      const volunteer = data.volunteers.find(item => item.id === params.volunteerId);
      if (!volunteer) throw new Error("Choose a volunteer from the roster.");
      if (volunteer.id === incident.assignee) throw new Error(`${volunteer.name} is already on this incident.`);
      if (!roster.onShift(volunteer, data, clock())) throw new Error(`${volunteer.name} is not on shift.`);
      const busy = roster.assignments(incidents).get(volunteer.id);
      if (busy) throw new Error(`${volunteer.name} is already on ${busy.id}.`);
      // Mo may override coverage; the before/after counts are recorded with the decision.
      const coverage = roster.coverageImpact(volunteer.id, incident.zone, data, incidents, clock());
      const previous = incident.assignee;
      setOffer(incident, volunteer.id, actor, { coverage, ...(previous ? { previous, override: true } : {}) });
      notify();
      return clone(incident);
    } else if (action === "acknowledge") {
      if (!isMo) throw new Error("Only Mo can acknowledge in this starter.");
      if (incident.acknowledgedBy) throw new Error("Mo has already acknowledged this incident.");
      incident.acknowledgedBy = actor.id;
    } else if (action === "escalate") {
      if (incident.status === "escalated") throw new Error("This incident is already escalated.");
      incident.status = "escalated";
      incident.attention = "urgent";
    } else if (action === "resolve") {
      if (!isMo && !isReporter && assignmentState === "offered") throw new Error("This account cannot change this incident until the offer is accepted.");
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

  // Mo's derived view: zone counts, coverage, cluster alerts, roster status and eligible volunteers.
  function overview() {
    const at = clock();
    const busy = roster.assignments(incidents);
    return clone({
      zones: roster.zoneSummary(data, reports, incidents, at),
      roster: data.volunteers.map(volunteer => ({ id: volunteer.id, name: volunteer.name, zone: volunteer.zone, onShift: roster.onShift(volunteer, data, at), assignedTo: busy.get(volunteer.id)?.id || null })),
      eligible: Object.fromEntries(incidents.filter(item => item.status !== "resolved").map(item => [item.id, roster.eligibleVolunteers(item, data, incidents, at, item.declinedBy || [])]))
    });
  }

  return {
    getState, submitReport, act, reset, overview, whenIdle: () => Promise.all([...jobs]),
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
  };
});
