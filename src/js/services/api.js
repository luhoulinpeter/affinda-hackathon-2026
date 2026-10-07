// Person 2: the browser never chooses an actor or a role for API requests.
window.RiversideAPI = (() => {
  let session = null;
  let state = { reports: [], incidents: [] };
  const subscribers = new Set();
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
    session = nextSession;
    state = nextState;
    subscribers.forEach(callback => callback());
  }
  async function submitReport(input) { const result = await request("/api/reports", input); await refresh(); return result; }
  async function act(id, action) { await request(`/api/incidents/${encodeURIComponent(id)}/action`, { action }); await refresh(); }
  async function authenticate(username, password) {
    refreshVersion++;
    await request(session.setupRequired ? "/api/setup" : "/api/login", { username, password });
    await refresh();
  }
  async function logout() { refreshVersion++; await request("/api/logout", {}); await refresh(); }
  async function createAccount(input) { await request("/api/accounts", input); }
  // Demo only, Mo only: clears reports and incidents (accounts are kept).
  async function resetDemo() { await request("/api/reset", {}); await refresh(); }
  // Live updates from the server. The browser reconnects automatically; the UI's polling stays as a fallback.
  if (typeof EventSource !== "undefined") {
    new EventSource("/api/events").addEventListener("state", () => refresh().catch(() => {}));
  }
  return { refresh, submitReport, act, authenticate, logout, createAccount, resetDemo,
    getState: () => clone(state), getSession: () => session && clone(session),
    subscribe(callback) { subscribers.add(callback); return () => subscribers.delete(callback); }
  };
})();
