// Person 2: the browser never chooses an actor or a role for API requests.
window.RiversideAPI = (() => {
  let session = null;
  let state = { reports: [], incidents: [] };
  const subscribers = new Set();
  const identitySubscribers = new Set();
  let identityVersion = 0;
  let identityChanging = false;
  const invalidateIdentity = () => { identityVersion++; identitySubscribers.forEach(callback => callback()); };
  let refreshVersion = 0;
  const clone = value => JSON.parse(JSON.stringify(value));
  async function request(url, body) {
    const tabId = await window.RiversideTab.ready;
    const response = await fetch(url, {
      credentials: "same-origin", cache: "no-store",
      headers: { 'X-Riverside-Tab': tabId, ...(body === undefined ? {} : { "Content-Type": "application/json", "X-CSRF-Token": session?.csrf || "" }) },
      ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed.");
    return result;
  }
  async function refresh() {
    const version = ++refreshVersion;
    const nextSession = await request("/api/session");
    const nextState = await request("/api/state");
    if (version !== refreshVersion) return;
    if (session && session.csrf !== nextSession.csrf) invalidateIdentity();
    session = nextSession;
    state = nextState;
    subscribers.forEach(callback => callback());
    await connectEvents();
  }
  async function submitReport(input) {
    const result = await request("/api/reports", input);
    // A received report stays submitted even if the following state fetch fails.
    // SSE/polling will recover the view; never tell the user it was not submitted.
    try { await refresh(); } catch { /* Keep the confirmed server receipt. */ }
    return result;
  }
  async function act(id, action) { await request(`/api/incidents/${encodeURIComponent(id)}/action`, { action }); await refresh(); }
  async function authenticate(username, password) {
    refreshVersion++;
    identityChanging = true; invalidateIdentity();
    try { await request(session.setupRequired ? "/api/setup" : "/api/login", { username, password }); await refresh(); }
    finally { identityChanging = false; subscribers.forEach(callback => callback()); }
  }
  async function logout() {
    refreshVersion++; identityChanging = true; invalidateIdentity();
    try { await request("/api/logout", {}); await refresh(); }
    finally { identityChanging = false; subscribers.forEach(callback => callback()); }
  }
  async function createAccount(input) { await request("/api/accounts", input); }
  async function resetDemo() {
    await request('/api/reset', {});
    invalidateIdentity();
    await refresh();
  }
  // Establish the guest cookie before opening a parallel stream; otherwise two
  // first requests can set different guest IDs and orphan the first report.
  let events = null;
  async function connectEvents() {
    if (events || typeof EventSource === "undefined") return;
    const tabId = await window.RiversideTab.ready;
    if (events) return;
    // Only the non-secret selector goes in the URL, never a session credential.
    events = new EventSource(`/api/events?tab=${encodeURIComponent(tabId)}`);
    events.addEventListener('state', () => {
      if (!identityChanging) refresh().catch(() => {});
    });
  }
  return { refresh, submitReport, act, authenticate, logout, createAccount, resetDemo,
    async setPresence(input) { const result = await request('/api/presence', input); await refresh(); return result; },
    async respondOffer(id, offerId, decision) { await request(`/api/incidents/${encodeURIComponent(id)}/offers/${encodeURIComponent(offerId)}`, { decision }); await refresh(); },
    async offerVolunteer(id, volunteerId) { await request(`/api/incidents/${encodeURIComponent(id)}/assignment-offer`, { volunteerId }); await refresh(); },
    recommendVolunteer: id => request(`/api/incidents/${encodeURIComponent(id)}/assignment-recommendation`, {}),
    getAvailableIncidents: () => request('/api/available-incidents'),
    async claimIncident(id) { await request(`/api/incidents/${encodeURIComponent(id)}/claim`, {}); await refresh(); },
    async demoJourney(id, action) { await request(`/api/incidents/${encodeURIComponent(id)}/demo-journey`, { action }); await refresh(); },
    async setSensitivity(id, sensitive) { await request(`/api/incidents/${encodeURIComponent(id)}/sensitivity`, { sensitive, reason: sensitive ? 'Mo marked the report private for personal assignment.' : 'Mo reviewed and approved ordinary volunteer selection.' }); await refresh(); },
    async assistanceAction(id, action) { await request(`/api/incidents/${encodeURIComponent(id)}/assistance`, { action }); await refresh(); },
    getStations: () => request('/api/stations'),
    getMapsConfig: () => request('/api/maps-config'),
    getMapData: () => request('/api/map-data'),
    saveStations: input => request('/api/stations', input),
    findFirstAid: input => request('/api/first-aid', input),
    ask: input => request('/api/qa', input),
    getIdentityVersion: () => identityVersion, isIdentityChanging: () => identityChanging,
    onIdentityChange(callback) { identitySubscribers.add(callback); return () => identitySubscribers.delete(callback); },
    getState: () => clone(state), getSession: () => session && clone(session),
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
  };
})();
