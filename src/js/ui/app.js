// Person 1: owns the views. Change incidents through the shared service only.
(() => {
  const service = window.RiversideIncidents;
  const data = window.RiversideData;
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const time = value => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const zoneName = id => data.zones.find(zone => zone.id === id)?.name || id;
  const actorName = id => id === "mo" ? "Mo" : id === "system" ? "System" : data.volunteers.find(person => person.id === id)?.name || id;
  let selectedId = null;

  $("#volunteer").innerHTML = data.volunteers.map(person => `<option value="${escape(person.id)}">${escape(person.name)}</option>`).join("");
  $("#zone").innerHTML = data.zones.map(zone => `<option value="${escape(zone.id)}">${escape(zone.name)}</option>`).join("");
  $("#zone").value = data.volunteers[0].zone;

  function feedback(message, isError = false) {
    $("#feedback").textContent = message;
    $("#feedback").classList.toggle("error", isError);
  }

  function badge(incident) {
    const label = incident.status === "resolved" ? "Confirmed resolved" : incident.status === "escalated" ? "Escalated · open" : incident.attention === "urgent" ? "Immediate concern" : "Needs review";
    return `<span class="badge ${incident.status === "resolved" ? "resolved" : incident.attention === "urgent" ? "urgent" : ""}">${label}</span>`;
  }

  function actionButtons(incident, view) {
    if (incident.status === "resolved") return "";
    const action = (name, label, style = "secondary") => `<button type="button" class="${style}" data-action="${name}" data-incident="${incident.id}" data-actor="${view}">${label}</button>`;
    return `<div class="incident-actions">${view === "mo" && !incident.acknowledgedBy ? action("acknowledge", "Acknowledge") : ""}${incident.status !== "escalated" ? action("escalate", view === "mo" ? "Mark escalated" : "Escalate to Mo") : ""}${action("resolve", "Confirm resolved", "primary")}</div>`;
  }

  function render() {
    const state = service.getState();
    const open = state.incidents.filter(item => item.status !== "resolved");
    $("#open-count").textContent = open.length;
    $("#urgent-count").textContent = open.filter(item => item.attention === "urgent").length;
    $("#resolved-count").textContent = state.incidents.length - open.length;
    const sorted = [...state.incidents].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || Number(b.attention === "urgent") - Number(a.attention === "urgent") || Number(b.id.slice(2)) - Number(a.id.slice(2)));
    if (!selectedId && sorted.length) selectedId = sorted[0].id;
    $("#incident-list").innerHTML = sorted.length ? sorted.map(incident => {
      const report = state.reports.find(item => item.id === incident.reportIds[0]);
      return `<button type="button" class="queue-item ${selectedId === incident.id ? "selected" : ""}" data-select="${incident.id}" aria-pressed="${selectedId === incident.id}"><span class="queue-top"><strong>${incident.id}</strong>${badge(incident)}</span><span class="queue-zone">${escape(zoneName(incident.zone))}</span><span class="queue-text">${escape(report.text)}</span><span class="muted">${incident.reportIds.length} report · ${time(report.time)}</span></button>`;
    }).join("") : '<div class="empty"><span class="empty-symbol" aria-hidden="true">↗</span><h3>No reports yet</h3><p>Open Volunteer view and send a fictional report to begin.</p><button type="button" class="secondary" data-view="volunteer">Go to volunteer view</button></div>';

    const selected = state.incidents.find(item => item.id === selectedId);
    if (!selected) {
      $("#incident-detail").innerHTML = '<div class="empty"><h2>Ready for the first report</h2><p>Original reports, human actions and their times will appear here.</p></div>';
    } else {
      const actions = { reported: "Submitted report", acknowledge: "Acknowledged · still open", escalate: "Escalated · still open", resolve: "Explicitly confirmed resolved", analysis_failed: "Analysis failed · report retained for Mo" };
      $("#incident-detail").innerHTML = `<div class="panel-heading"><h2>${selected.id} · Incident record</h2>${badge(selected)}</div><h3>${escape(zoneName(selected.zone))}</h3><p class="muted">${selected.acknowledgedBy ? "Acknowledged by Mo" : "Awaiting Mo’s acknowledgement"} · ${selected.assignee ? escape(actorName(selected.assignee)) : "No volunteer assigned"}</p><div class="source-reports">${state.reports.filter(report => selected.reportIds.includes(report.id)).map(report => `<blockquote><p>${escape(report.text)}</p><footer>${escape(actorName(report.volunteerId))} · ${time(report.time)} · ${report.id}</footer></blockquote>`).join("")}</div><p class="analysis-note">${selected.analysis.state === "failed" ? "Analysis unavailable. The original report is retained for Mo." : "AI not connected. No grouping or automatic assignment has been performed."}</p>${selected.status === "resolved" ? `<p class="resolution-note">Confirmed by ${escape(actorName(selected.resolvedBy.id))} at ${time(selected.resolvedAt)}.</p>` : ""}${actionButtons(selected, "mo")}<h3 class="history-heading">Activity</h3><ol class="history">${selected.history.map(event => `<li><span>${escape(actions[event.action] || event.action)}</span><small>${escape(actorName(event.actorId))} · ${time(event.time)}</small></li>`).join("")}</ol>`;
    }

    const ownReports = state.reports.filter(report => report.volunteerId === $("#volunteer").value).reverse();
    $("#volunteer-reports").innerHTML = ownReports.length ? ownReports.map(report => {
      const incident = state.incidents.find(item => item.reportIds.includes(report.id));
      return `<article class="own-report"><div class="queue-top"><strong>${report.id} → ${incident.id}</strong>${badge(incident)}</div><p>${escape(report.text)}</p><p class="muted">${escape(zoneName(report.zone))} · ${time(report.time)}</p>${incident.status === "resolved" ? `<p class="resolution-note">Confirmed by ${escape(actorName(incident.resolvedBy.id))} at ${time(incident.resolvedAt)}.</p>` : '<p class="field-note">Keep the incident open until you can explicitly confirm resolution.</p>'}${actionButtons(incident, "volunteer")}</article>`;
    }).join("") : '<div class="empty"><h3>No reports from this volunteer</h3><p>Send a report using the form. Switch to Mo’s view to review it.</p></div>';
  }

  function setView(view) {
    $("#mo-view").hidden = view !== "mo";
    $("#volunteer-view").hidden = view !== "volunteer";
    document.querySelectorAll("nav [data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.view) setView(button.dataset.view);
    if (button.dataset.select) { selectedId = button.dataset.select; render(); }
    if (button.dataset.action) {
      const actor = button.dataset.actor === "mo" ? { id: "mo", role: "mo" } : { id: $("#volunteer").value, role: "volunteer" };
      try {
        service.act(button.dataset.incident, button.dataset.action, actor);
        feedback(button.dataset.action === "resolve" ? `${button.dataset.incident}: resolution explicitly confirmed by ${actorName(actor.id)}.` : `${button.dataset.incident}: action recorded; incident remains open.`);
      } catch (error) { feedback(error.message, true); }
    }
  });

  $("#volunteer").addEventListener("change", () => {
    $("#zone").value = data.volunteers.find(person => person.id === $("#volunteer").value).zone;
    feedback("");
    render();
  });
  $("#example-report").addEventListener("click", () => {
    $("#zone").value = data.example.zone;
    $("#report-text").value = data.example.text;
    $("#immediate-concern").checked = data.example.immediateConcern;
    $("#report-text").focus();
  });
  $("#report-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const incident = await service.submitReport({ volunteerId: $("#volunteer").value, zone: $("#zone").value, text: $("#report-text").value, immediateConcern: $("#immediate-concern").checked });
      selectedId = incident.id;
      $("#report-text").value = "";
      $("#immediate-concern").checked = false;
      render();
      feedback(`Report received as ${incident.id}. Open Mo’s view to review it. No responder has been dispatched.`);
    } catch (error) { feedback(error.message, true); }
    finally { button.disabled = false; }
  });
  service.subscribe(render);
  render();
})();
