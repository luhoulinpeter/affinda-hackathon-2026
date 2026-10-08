// Person 1: views follow the server session. Person 2 owns api.js and permissions.
(() => {
  const api = window.RiversideAPI;
  const data = window.RiversideData;
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const time = value => new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const zoneName = id => data.zones.find(zone => zone.id === id)?.name || id;
  const categoryName = id => data.categories.find(category => category.id === id)?.name || "Other / unsure";
  const actorName = id => id === "mo" ? "Mo" : id === "system" ? "System" : id?.startsWith("guest-") ? "Event-goer" : data.volunteers.find(person => person.id === id)?.name || id;
  let selectedId = null;
  let previousActor = null;
  const narrowScreen = window.matchMedia("(max-width: 720px)");
  const setQueueLayout = () => { $("#queue-panel").open = !narrowScreen.matches; };
  setQueueLayout();
  narrowScreen.addEventListener("change", setQueueLayout);
  $("#zone").innerHTML = data.zones.map(zone => `<option value="${escape(zone.id)}">${escape(zone.id === 'current-location' ? 'Use my location' : zone.name)}</option>`).join("");
  $("#zone").value = 'current-location';
  $("#category").innerHTML = data.categories.map(category => `<option value="${escape(category.id)}">${escape(category.name)}</option>`).join("");
  $("#category").value = "other";
  $("#account-volunteer").innerHTML = data.volunteers.map(person => `<option value="${escape(person.id)}">${escape(person.name)}</option>`).join("");

  function feedback(message, isError = false) {
    $("#feedback").textContent = message;
    $("#feedback").classList.toggle("error", isError);
  }
  function badge(incident) {
    const label = incident.status === "resolved" ? "Confirmed resolved" : incident.status === "escalated" ? "Escalated · open" : incident.attention === "urgent" ? "Immediate concern" : "Needs review";
    return `<span class="badge ${incident.status === "resolved" ? "resolved" : incident.attention === "urgent" ? "urgent" : ""}">${label}</span>`;
  }
  function analysisHTML(incident) {
    const jev = incident.analysis?.jev;
    const luna = incident.analysis?.luna;
    const classification = jev?.state === 'complete' ? `Jev suggestion: ${escape(categoryName(jev.suggestion.category))} · ${escape(jev.suggestion.urgency)}` : `Jev analysis: ${jev?.state === 'pending' ? 'pending' : 'unavailable'}`;
    const summary = luna?.state === 'complete' ? `AI summary (suggestion): ${escape(luna.suggestion.summary)}` : `AI summary: ${luna?.state === 'pending' ? 'pending' : 'unavailable'}`;
    return `<div class="analysis-note"><p>${classification}</p><p>${summary}</p><small>Check the original report. AI suggestions do not assign responders; assistance offers are managed separately.</small></div>`;
  }
  function actionButtons(incident, role) {
    if (incident.status === "resolved") return "";
    const action = (name, label, style = "secondary") => `<button type="button" class="${style}" data-action="${name}" data-incident="${escape(incident.id)}">${label}</button>`;
    return `<div class="incident-actions">${role === "mo" && !incident.acknowledgedBy ? action("acknowledge", "Acknowledge") : ""}${role !== "public" && incident.status !== "escalated" ? action("escalate", role === "mo" ? "Mark escalated" : "Escalate to Mo") : ""}${action("resolve", "Confirm resolved", "primary")}</div>`;
  }
  function render() {
    const session = api.getSession();
    if (!session) return;
    const state = api.getState();
    const role = session.user?.role || "public";
    const actorId = session.user?.id || session.guest.id;
    $("#signin-button").disabled = false;
    $("#signin-button").hidden = !!session.user;
    $("#signout-button").hidden = !session.user;
    $("#session-label").textContent = session.user ? `${session.user.name} · ${role === "mo" ? "Safety lead" : "Volunteer"}` : "Event-goer";
    $("#mo-view").hidden = role !== "mo";
    $("#reporting-view").hidden = role === "mo";
    $("#reporting-view").setAttribute("aria-label", role === "public" ? "Event-goer reporting view" : "Volunteer reporting view");
    $("#page-eyebrow").textContent = role === "mo" ? "Ground control" : role === "volunteer" ? "Volunteer workspace" : "Riverside festival";
    $("#page-title").textContent = role === "mo" ? "Review. Respond. Follow through." : role === "volunteer" ? "Your reports. Your response." : "Get help. Report an issue.";
    $("#page-description").textContent = role === "mo" ? "Review incoming incidents and record your decisions." : "Tell the safety team what you saw and where it happened.";
    $("#reporter-label").textContent = role === "volunteer" ? `Reporting as ${session.user.name}` : "No sign-in needed";
    $("#reports-note").textContent = role === "volunteer" ? "Your staff account" : "From this browser";
    if (actorId !== previousActor) {
      $("#zone").value = 'current-location';
      $("#report-text").value = "";
      $("#immediate-concern").checked = false;
      $("#report-sensitive").checked = false;
      previousActor = actorId;
    }
    // Clear the other role's rendered data as well as hiding its panel.
    if (role !== "mo") {
      for (const id of ["open-count", "urgent-count", "resolved-count"]) $(`#${id}`).textContent = "0";
      $("#queue-count").textContent = "(0)";
      $("#incident-list").innerHTML = "";
      $("#incident-detail").innerHTML = "";
      $("#accounts-panel").open = false;
      $("#account-form").reset();
      $("#account-feedback").textContent = "";
      selectedId = null;
    } else {
      const open = state.incidents.filter(item => item.status !== "resolved");
      $("#open-count").textContent = open.length;
      $("#urgent-count").textContent = open.filter(item => item.attention === "urgent").length;
      $("#resolved-count").textContent = state.incidents.length - open.length;
      $("#queue-count").textContent = `(${state.incidents.length})`;
      const sorted = [...state.incidents].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || Number(b.attention === "urgent") - Number(a.attention === "urgent") || Number(b.id.slice(2)) - Number(a.id.slice(2)));
      if (!state.incidents.some(item => item.id === selectedId)) selectedId = sorted[0]?.id || null;
      $("#incident-list").innerHTML = sorted.length ? sorted.map(incident => {
        const report = state.reports.find(item => item.id === incident.reportIds[0]);
        return `<button type="button" class="queue-item ${selectedId === incident.id ? "selected" : ""}" data-select="${escape(incident.id)}" aria-pressed="${selectedId === incident.id}"><span class="queue-top"><strong>${escape(incident.id)}</strong>${badge(incident)}</span><span class="queue-zone">${escape(incident.zoneName || zoneName(incident.zone))}</span><span class="queue-text">${escape(report.text)}</span><span class="muted">${incident.reportIds.length} report · ${time(report.time)}</span></button>`;
      }).join("") : '<div class="empty"><h3>No reports yet</h3><p>Reports from event-goers and volunteers will appear here.</p></div>';
      const selected = state.incidents.find(item => item.id === selectedId);
      if (!selected) {
        $("#incident-detail").innerHTML = '<div class="empty"><h2>Ready for the first report</h2><p>Original reports, human actions and their times will appear here.</p></div>';
      } else {
        const actions = { reported: "Submitted report", acknowledge: "Acknowledged · still open", escalate: "Escalated · still open", resolve: "Explicitly confirmed resolved", analysis_failed: "Analysis failed · report retained for Mo" };
        $("#incident-detail").innerHTML = `<div class="panel-heading"><h2>${escape(selected.id)} · Incident record</h2>${badge(selected)}</div><h3>${escape(selected.zoneName || zoneName(selected.zone))}</h3>${selected.zoneLocation ? '<p class="field-note">Approximate zone reference point. This report has no precise GPS location.</p>' : ""}<p class="muted">${selected.acknowledgedBy ? "Acknowledged by Mo" : "Awaiting Mo’s acknowledgement"} · ${selected.assignee ? escape(actorName(selected.assignee)) : "No volunteer assigned"}</p><div class="source-reports">${state.reports.filter(report => selected.reportIds.includes(report.id)).map(report => `<blockquote><p>${escape(report.text)}</p><footer>${escape(actorName(report.reporter.id))} · ${escape(categoryName(report.category))} · ${time(report.time)} · ${escape(report.id)}</footer></blockquote>`).join("")}</div>${analysisHTML(selected)}${window.RiversideAssistance.incidentHTML(selected)}${window.RiversideRecommendations.html(selected)}${selected.status === "resolved" ? `<p class="resolution-note">Confirmed by ${escape(actorName(selected.resolvedBy.id))} at ${time(selected.resolvedAt)}.</p>` : ""}${actionButtons(selected, "mo")}<h3 class="history-heading">Activity</h3><ol class="history">${selected.history.map(event => `<li><span>${escape(actions[event.action] || event.action)}</span><small>${escape(actorName(event.actorId))} · ${time(event.time)}</small></li>`).join("")}</ol>`;
      }
    }
    const ownReports = state.reports.filter(report => report.reporter.id === actorId && report.reporter.role === role).reverse();
    $("#own-reports").innerHTML = role === "mo" ? "" : ownReports.length ? ownReports.map(report => {
      const incident = state.incidents.find(item => item.reportIds.includes(report.id));
      const privacyNote = incident.sensitive
        ? '<p class="field-note">Private report · the safety lead chooses a volunteer personally.</p>'
        : incident.sensitivityReview === 'legacy'
          ? '<p class="field-note">An older AI result has no privacy decision. The safety lead must review it before volunteers can choose it.</p>'
          : ["pending", "unavailable"].includes(incident.sensitivityReview)
            ? '<p class="field-note">Privacy review is pending. The safety lead can assign someone personally.</p>' : "";
      return `<article class="own-report"><div class="queue-top"><strong>${escape(report.id)} → ${escape(incident.id)}</strong>${badge(incident)}</div><p>${escape(report.text)}</p><p class="muted">${escape(report.zoneName || zoneName(report.zone))} · ${escape(categoryName(report.category))} · ${time(report.time)}</p>${incident.status === "resolved" ? `<p class="resolution-note">Confirmed by ${incident.resolvedBy.id === actorId ? "you" : escape(actorName(incident.resolvedBy.id))} at ${time(incident.resolvedAt)}.</p>` : '<p class="field-note">Your report remains open until a person explicitly confirms resolution.</p>'}${role === "volunteer" ? analysisHTML(incident) : ""}${privacyNote}${window.RiversideAssistance.incidentHTML(incident)}${actionButtons(incident, role)}</article>`;
    }).join("") : '<div class="empty"><h3>No reports yet</h3><p>Send a report to receive a reference and check its status here.</p><p>Your event-goer report history depends on this browser’s cookie. Use the same browser to return to it.</p></div>';
  }
  document.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.select) {
      selectedId = button.dataset.select;
      if (narrowScreen.matches) $("#queue-panel").open = false;
      render();
      if (narrowScreen.matches) { $("#incident-detail").tabIndex = -1; $("#incident-detail").focus({ preventScroll: true }); }
    }
    if (button.dataset.action) {
      button.disabled = true;
      try {
        await api.act(button.dataset.incident, button.dataset.action);
        feedback(button.dataset.action === "resolve" ? `${button.dataset.incident}: resolution explicitly confirmed.` : `${button.dataset.incident}: action recorded; incident remains open.`);
      } catch (error) { feedback(error.message, true); }
      finally { button.disabled = false; }
    }
  });
  $("#example-report").addEventListener("click", () => {
    $("#zone").value = data.example.zone; $("#category").value = "hazard";
    $("#report-text").value = data.example.text; $("#immediate-concern").checked = false;
    $("#report-text").focus();
  });
  $("#signin-button").addEventListener("click", () => {
    const setup = api.getSession().setupRequired;
    $("#signin-form").reset(); $("#signin-feedback").textContent = "";
    $("#signin-title").textContent = setup ? "Create the first Mo account" : "Staff sign in";
    $("#signin-description").textContent = setup ? "Local first-run setup: choose a username and password. Both can be any non-empty length. Mo can then create volunteer accounts. Do not reuse a password from another service." : "Sign-in applies to this tab only. Your account determines whether you see the Volunteer or Mo workspace.";
    $("#confirm-password-field").hidden = !setup;
    $("#confirm-password").required = setup;
    $("#signin-password").autocomplete = setup ? "new-password" : "current-password";
    $("#signin-submit").textContent = setup ? "Create Mo account" : "Sign in";
    $("#signin-dialog").showModal();
  });
  $("#close-signin").addEventListener("click", () => $("#signin-dialog").close());
  $("#signin-dialog").addEventListener("close", () => { $("#signin-form").reset(); $("#signin-feedback").textContent = ""; });
  $("#signin-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (api.getSession().setupRequired && $("#signin-password").value !== $("#confirm-password").value) { $("#signin-feedback").textContent = "The passwords do not match."; return; }
    $("#signin-submit").disabled = true;
    try {
      await api.authenticate($("#signin-username").value.trim().toLowerCase(), $("#signin-password").value);
      $("#signin-dialog").close(); feedback(`Signed in as ${api.getSession().user.name}.`);
    } catch (error) { $("#signin-feedback").textContent = error.message; }
    finally { $("#signin-submit").disabled = false; }
  });
  $("#signout-button").addEventListener("click", async () => {
    try { await api.logout(); feedback("Signed out. You are back on the event-goer page."); }
    catch (error) { feedback(error.message, true); }
  });
  $("#account-form").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]'); button.disabled = true;
    try {
      await api.createAccount({ username: $("#account-username").value.trim().toLowerCase(), password: $("#account-password").value, volunteerId: $("#account-volunteer").value });
      $("#account-form").reset(); $("#account-feedback").textContent = "Volunteer account created. They can now sign in with those credentials.";
    } catch (error) { $("#account-feedback").textContent = error.message; }
    finally { button.disabled = false; }
  });
  api.subscribe(render);
  document.addEventListener('riverside-recommendation-update', render);
  document.addEventListener('riverside-map-select', event => {
    if (api.getSession()?.user?.role !== 'mo') return;
    selectedId = event.detail;
    render();
    $('#incident-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  api.refresh().then(() => feedback("")).catch(error => feedback(`Cannot connect. Run node server/index.cjs and open the local server URL. ${error.message}`, true));
  setInterval(() => { if (!document.hidden && !$("#signin-dialog").open) api.refresh().catch(error => feedback(error.message, true)); }, 6000);
})();
