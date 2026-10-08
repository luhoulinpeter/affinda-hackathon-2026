// Person 2: the browser never chooses an actor or a role for API requests.
window.RiversideAPI = (() => {
  let session = null;
  let state = { reports: [], incidents: [] };
  const subscribers = new Set();
  const identitySubscribers = new Set();
  const connectionSubscribers = new Set();
  let connected = null;
  function connection(value) {
    if (connected === value) return;
    connected = value;
    connectionSubscribers.forEach(callback => callback(value));
  }
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
    let result;
    try { result = await response.json(); }
    catch {
      // A disconnected tunnel can return an HTML error page, even though the
      // app normally returns JSON. Keep that page out of user-facing errors.
      const status = response.status ? ` (HTTP ${response.status})` : '';
      throw new Error(`The event server returned an unreadable response${status}. Check your connection and that you are using the current event link.`);
    }
    if (!response.ok) throw new Error(result.error || "Request failed.");
    return result;
  }
  async function refresh() {
    const version = ++refreshVersion;
    let nextSession, nextState;
    try {
      nextSession = await request("/api/session");
      nextState = await request("/api/state");
    } catch (error) {
      if (version === refreshVersion) connection(false);
      throw error;
    }
    if (version !== refreshVersion) return;
    if (session && session.csrf !== nextSession.csrf) invalidateIdentity();
    session = nextSession;
    state = nextState;
    connection(true);
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
    if (session?.liveUpdates === 'polling') return;
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
    async saveZones(input) { const result = await request('/api/zones', input); try { await refresh(); } catch { /* The save succeeded; polling can recover. */ } return result; },
    saveStations: input => request('/api/stations', input),
    findFirstAid: input => request('/api/first-aid', input),
    ask: input => request('/api/qa', input),
    getIdentityVersion: () => identityVersion, isIdentityChanging: () => identityChanging,
    onIdentityChange(callback) { identitySubscribers.add(callback); return () => identitySubscribers.delete(callback); },
    onConnectionChange(callback) { connectionSubscribers.add(callback); return () => connectionSubscribers.delete(callback); },
    getState: () => clone(state), getSession: () => session && clone(session),
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
  };
})();
