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
    const response = await fetch(url, {
      credentials: "same-origin", cache: "no-store",
      ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": session?.csrf || "" }, body: JSON.stringify(body) })
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
    connectEvents();
  }
  async function submitReport(input) { const result = await request("/api/reports", input); await refresh(); return result; }
  // params: { volunteerId } for Mo's offer/reassign. Resolves to { ok, warning? } (coverage below minimum).
  async function act(id, action, params = {}) {
    const result = await request(`/api/incidents/${encodeURIComponent(id)}/action`, { action, ...(params.volunteerId ? { volunteerId: params.volunteerId } : {}) });
    await refresh();
    return result;
  }
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
  function connectEvents() {
    if (events || typeof EventSource === "undefined") return;
    events = new EventSource('/api/events');
    events.addEventListener('state', () => {
      if (!identityChanging) refresh().catch(() => {});
    });
  }
  return { refresh, submitReport, act, authenticate, logout, createAccount, resetDemo,
    ask: input => request('/api/qa', input),
    getIdentityVersion: () => identityVersion, isIdentityChanging: () => identityChanging,
    onIdentityChange(callback) { identitySubscribers.add(callback); return () => identitySubscribers.delete(callback); },
    getState: () => clone(state), getSession: () => session && clone(session),
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
  };
})();
