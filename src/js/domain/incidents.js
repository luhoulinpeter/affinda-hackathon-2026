// Person 2: owns state and permitted changes. Later replace this local service
// with a server API that enforces identity and the same workflow rules.
window.RiversideIncidents = (() => {
  const reports = [];
  const incidents = [];
  const subscribers = new Set();
  let sequence = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toISOString();
  const notify = () => subscribers.forEach(callback => callback());

  function history(incident, actor, action) {
    incident.history.push({ actorId: actor.id, actorRole: actor.role, action, time: now() });
  }

  function getState() {
    return clone({ reports, incidents });
  }

  async function submitReport(input) {
    const volunteer = window.RiversideData.volunteers.find(item => item.id === input.volunteerId);
    if (!volunteer) throw new Error("Choose a demo volunteer.");
    if (!window.RiversideData.zones.some(item => item.id === input.zone)) throw new Error("Choose a valid zone.");
    const text = String(input.text || "").trim();
    if (!text || text.length > 2000) throw new Error("Write a report between 1 and 2,000 characters.");

    const number = ++sequence;
    const report = {
      id: `R-${number}`, volunteerId: volunteer.id, zone: input.zone, text,
      immediateConcern: input.immediateConcern === true, time: now()
    };
    const incident = {
      id: `I-${number}`, reportIds: [report.id], zone: report.zone,
      category: "unclassified", brief: "Awaiting human review",
      status: "open", attention: report.immediateConcern ? "urgent" : "review",
      assignee: null, acknowledgedBy: null, resolvedBy: null, resolvedAt: null,
      analysis: { state: "pending", mode: "stub" }, history: []
    };
    history(incident, { id: volunteer.id, role: "volunteer" }, "reported");
    // Save and show the source report BEFORE waiting for any external service.
    reports.push(report);
    incidents.push(incident);
    notify();

    try {
      const suggestion = await window.RiversideAI.analyse(clone(report), getState().incidents.filter(item => item.id !== incident.id && item.status !== "resolved"));
      if (!suggestion || suggestion.mode !== "stub") {
        throw new Error("Real AI results need server-side validation before integration.");
      }
      // Suggestions cannot close, assign, merge or downgrade an incident.
      incident.analysis = { state: "complete", mode: "stub", suggestion: clone(suggestion) };
    } catch (error) {
      incident.analysis = { state: "failed", mode: "stub" };
      history(incident, { id: "system", role: "system" }, "analysis_failed");
    }
    notify();
    return clone(incident);
  }

  function act(incidentId, action, actor) {
    const incident = incidents.find(item => item.id === incidentId);
    if (!incident) throw new Error("Incident not found.");
    const isMo = actor && actor.role === "mo" && actor.id === "mo";
    const isVolunteer = actor && actor.role === "volunteer" && window.RiversideData.volunteers.some(item => item.id === actor.id);
    const isReporter = isVolunteer && reports.some(report => incident.reportIds.includes(report.id) && report.volunteerId === actor.id);
    const isAssignee = isVolunteer && actor.id === incident.assignee;
    if (!(isMo || isReporter || isAssignee)) throw new Error("This demo role cannot change this incident.");
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

  return {
    getState, submitReport, act,
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
  };
})();
