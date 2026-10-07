const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { validCredentials, hashPassword, verifyPassword, equal, sign } = require('./auth.cjs');
const data = require('../data/fixtures.js');
const { createProviders } = require('../src/js/services/analysis.js');
const { answerQuestion } = require('./ai/qa.cjs');
const createIncidents = require('../src/js/domain/incidents.js');
const { createAssistance, position } = require('./assistance.cjs');
const { validateStations, firstAid } = require('./stations.cjs');
const root = path.resolve(__dirname, '..');

// A public origin enables HTTPS deployment and disables browser first-account setup.
function createApp({ dataDir = path.join(root, '.riverside'), publicOrigin = null, secureCookies = false, aiProviders, guide, aiEnv = process.env, aiFetch, now = Date.now } = {}) {
  let deployed = null;
  if (publicOrigin !== null) {
    try { deployed = new URL(publicOrigin); } catch { throw new Error('PUBLIC_ORIGIN must be an HTTPS origin.'); }
    if (deployed.protocol !== 'https:' || deployed.username || deployed.password || deployed.pathname !== '/' || deployed.search || deployed.hash) throw new Error('PUBLIC_ORIGIN must be an HTTPS origin without credentials, a path, query or fragment.');
    secureCookies = true;
  }
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const dbFile = path.join(dataDir, 'store.json');
  const db = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile, 'utf8')) : { users: [], workflow: {}, cookieSecret: randomBytes(32).toString('hex') };
  function save() {
    const temporary = `${dbFile}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(temporary, dbFile);
  }
  save();
  let verification = {};
  try { verification = JSON.parse(fs.readFileSync(path.join(dataDir, 'ai-credit-verification.json'), 'utf8')); } catch { /* Missing controls keep live calls disabled. */ }
  const providers = aiProviders || createProviders({ env: aiEnv, verification, fetchImpl: aiFetch,
    remainingCalls: (name, proof) => Math.max(0, proof.maxCalls - (db.aiUsage?.[`${name}:${proof.id}`] || 0)),
    reserveCall(name, proof) {
    db.aiUsage ||= {};
    const key = `${name}:${proof.id}`;
    if ((db.aiUsage[key] || 0) >= proof.maxCalls) return false;
    db.aiUsage[key] = (db.aiUsage[key] || 0) + 1;
    save(); // Reserve before sending. Failures count; restart does not reset the allowance.
    return true;
  } });
  const workflow = createIncidents(data, () => providers, db.workflow, state => { db.workflow = state; save(); });
  db.workflow = workflow.getState(); save();
  const qaActive = new Set();
  let resetVersion = 0;
  // Live updates: send only a "changed" signal; each client re-fetches its own role-scoped /api/state.
  const streams = new Set();
  const broadcast = message => streams.forEach(stream => stream.write(message));
  workflow.subscribe(() => broadcast('event: state\ndata: {}\n\n'));
  const heartbeat = setInterval(() => broadcast(': keep-alive\n\n'), 20000);
  heartbeat.unref();
  const sessions = new Map();
  const assistance = createAssistance({ workflow, volunteers: data.volunteers, now,
    hasAccount: id => db.users.some(u => u.role === 'volunteer' && u.actorId === id),
    sessionAlive: token => sessions.has(token) && sessions.get(token).expires > now() });
  const assistanceTimer = setInterval(() => assistance.tick(), 1000);
  assistanceTimer.unref();
  const loginAttempts = new Map();
  const dummy = { salt: randomBytes(16).toString('hex'), hash: randomBytes(64).toString('hex') };
  let passwordJobs = 0;
  async function passwordJob(job) {
    if (passwordJobs >= 2) throw Object.assign(new Error('Sign-in is busy. Please try again shortly.'), { status: 429 });
    passwordJobs++;
    try { return await job(); } finally { passwordJobs--; }
  }
  const publicUser = user => ({ username: user.username, id: user.actorId, role: user.role, name: user.role === 'mo' ? 'Mo' : data.volunteers.find(item => item.id === user.actorId).name });
  function cookie(res, name, value, seconds) {
    const cookies = res.getHeader('Set-Cookie') || [];
    res.setHeader('Set-Cookie', [...cookies, `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secureCookies ? '; Secure' : ''}`]);
  }
  function newStaffSession(res, user, ctx) {
    const oldToken = ctx.token;
    const previousUser = db.users.find(u => u.username === sessions.get(oldToken)?.username);
    if (previousUser?.role === 'volunteer') assistance.pause(previousUser.actorId, oldToken);
    if (oldToken) sessions.delete(oldToken);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { username: user.username, tabId: ctx.tabId, guestId: ctx.guest.id, csrf: randomBytes(32).toString('hex'), expires: now() + 8 * 60 * 60 * 1000 });
    cookie(res, ctx.sessionCookie, token, 8 * 60 * 60);
  }
  function context(req, res, url) {
    // The selector is tab-local, but authentication still requires an HttpOnly
    // credential bound to this tab AND the signed browser guest cookie.
    const tabId = url.pathname === '/api/events' ? url.searchParams.get('tab') : req.headers['x-riverside-tab'];
    if (typeof tabId !== 'string' || !/^[a-f0-9-]{36}$/.test(tabId)) throw Object.assign(new Error('Reload this page to initialise its independent sign-in session.'), { status: 400 });
    const sessionCookie = `riverside_session_${tabId}`;
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(item => item.trim().split('=')));
    const [guestId, signature] = (cookies.riverside_guest || '').split('.');
    let id = guestId;
    if (!id || !/^guest-[a-f0-9-]{36}$/.test(id) || !equal(signature, sign(db.cookieSecret, 'guest', id))) {
      id = `guest-${randomUUID()}`;
      cookie(res, 'riverside_guest', `${id}.${sign(db.cookieSecret, 'guest', id)}`, 7 * 24 * 60 * 60);
    }
    for (const [token, session] of sessions) if (session.expires <= now()) sessions.delete(token);
    const candidate = cookies[sessionCookie];
    const stored = sessions.get(candidate);
    const session = stored?.tabId === tabId && stored?.guestId === id ? stored : null;
    const token = session ? candidate : undefined;
    const user = session && db.users.find(item => item.username === session.username);
    return {
      token, user, tabId, sessionCookie, guest: { id, role: 'public' },
      actor: user ? { id: user.actorId, role: user.role } : { id, role: 'public' },
      csrf: user ? session.csrf : sign(db.cookieSecret, 'csrf', `${id}:${tabId}`)
    };
  }
  function stateFor(actor) {
    const availability = assistance.snapshot(actor);
    const state = workflow.getState();
    if (actor.role === 'mo') return { ...state, ...availability };
    const own = state.reports.filter(item => item.reporter.id === actor.id && item.reporter.role === actor.role);
    const incidents = state.incidents.filter(item => item.assignee === actor.id || own.some(report => item.reportIds.includes(report.id)) ||
      (actor.role === 'volunteer' && item.assistance?.offers.some(o => o.volunteerId === actor.id && o.status === 'pending')));
    for (const incident of incidents) if (incident.assistance) {
      const a = incident.assistance;
      const recipient = actor.role === 'volunteer' && (incident.assignee === actor.id || a.offers.some(o => o.volunteerId === actor.id && o.status === 'pending'));
      if (!recipient) delete a.destination;
      a.offers = actor.role === 'volunteer' ? a.offers.filter(o => o.volunteerId === actor.id) : [];
      a.events = a.events.filter(e => e.actorId === actor.id || e.volunteerId === actor.id || (!e.volunteerId && e.actorId === 'system'));
    }
    const reports = actor.role === 'volunteer' ? state.reports.filter(report => incidents.some(item => item.reportIds.includes(report.id))) : own;
    if (actor.role === 'public') {
      return { ...availability, reports, incidents: incidents.map(item => ({
        id: item.id, reportIds: item.reportIds.filter(id => own.some(report => report.id === id)),
        zone: item.zone, status: item.status, attention: item.attention,
        assignee: item.assignee, resolvedBy: item.resolvedBy, resolvedAt: item.resolvedAt, assistance: item.assistance
      })) };
    }
    return { ...availability, reports, incidents };
  }
  async function readBody(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw Object.assign(new Error('Send JSON data.'), { status: 415 });
    let text = '';
    for await (const chunk of req) {
      text += chunk;
      if (Buffer.byteLength(text) > 16384) throw Object.assign(new Error('Request is too large.'), { status: 413 });
    }
    try {
      const value = JSON.parse(text || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value;
    } catch { throw Object.assign(new Error('Invalid JSON data.'), { status: 400 }); }
  }
  function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(payload)); }
  function requireMo(ctx) {
    if (ctx.actor.role !== 'mo') throw Object.assign(new Error('Mo access required.'), { status: 403 });
  }
  const assets = new Map([
    ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
    ['/src/css/app.css', ['src/css/app.css', 'text/css']],
    ['/data/fixtures.js', ['data/fixtures.js', 'text/javascript']],
    ['/src/js/services/api.js', ['src/js/services/api.js', 'text/javascript']],
    ['/src/js/services/tab-session.js', ['src/js/services/tab-session.js', 'text/javascript']],
    ['/src/js/ui/app.js', ['src/js/ui/app.js', 'text/javascript']],
    ['/src/js/ui/qa.js', ['src/js/ui/qa.js', 'text/javascript']],
    ['/src/js/ui/assistance.js', ['src/js/ui/assistance.js', 'text/javascript']]
  ]);
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const address = server.address();
      const allowedHosts = deployed ? [deployed.host] : [`127.0.0.1:${address.port}`, `localhost:${address.port}`];
      if (!allowedHosts.includes(req.headers.host)) return json(res, 403, { error: 'Invalid host.' });
      const origin = deployed && req.headers.host === deployed.host ? deployed.origin : `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { error: 'Cross-origin request denied.' });
      const url = new URL(req.url, origin);
      if (!url.pathname.startsWith('/api/')) {
        const asset = assets.get(url.pathname);
        if (req.method !== 'GET' || !asset) return json(res, 404, { error: 'Not found.' });
        res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8` });
        res.end(fs.readFileSync(path.join(root, asset[0])));
        return;
      }
      const ctx = context(req, res, url);
      if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { user: ctx.user ? publicUser(ctx.user) : null, guest: ctx.guest, csrf: ctx.csrf, setupRequired: !deployed && db.users.length === 0, ai: providers.status(), guideApproved: (guide || require('../data/event-guide.json')).approved === true });
      if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, stateFor(ctx.actor));
      if (req.method === 'GET' && url.pathname === '/api/stations') return json(res, 200, ctx.actor.role === 'mo' ? db.helpStations || { enabled: false, stations: [] } : { enabled: db.helpStations?.enabled === true, stations: db.helpStations?.enabled ? db.helpStations.stations : [] });
      if (req.method === 'GET' && url.pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write('retry: 3000\n\n');
        streams.add(res);
        req.on('close', () => streams.delete(res));
        return;
      }
      if (req.method !== 'POST') return json(res, 404, { error: 'Not found.' });
      if (!equal(req.headers['x-csrf-token'], ctx.csrf)) return json(res, 403, { error: 'Session changed. Refresh and try again.' });
      const body = await readBody(req);
      if (url.pathname === '/api/stations') {
        requireMo(ctx); db.helpStations = validateStations(body); save(); broadcast('event: state\ndata: {}\n\n');
        return json(res, 200, db.helpStations);
      }
      if (url.pathname === '/api/first-aid') return json(res, 200, firstAid(db.helpStations, body.position, now()));
      if (url.pathname === '/api/presence') {
        assistance.setPresence(ctx.actor, body, ctx.token); broadcast('event: state\ndata: {}\n\n');
        return json(res, 200, assistance.snapshot(ctx.actor));
      }
      const offerRoute = url.pathname.match(/^\/api\/incidents\/(I-\d+)\/offers\/([a-f0-9-]+)$/);
      if (offerRoute) { assistance.respond(ctx.actor, offerRoute[1], offerRoute[2], body.decision); return json(res, 200, { ok: true }); }
      const assistanceRoute = url.pathname.match(/^\/api\/incidents\/(I-\d+)\/assistance$/);
      if (assistanceRoute) {
        if (!stateFor(ctx.actor).incidents.some(i => i.id === assistanceRoute[1])) return json(res, 404, { error: 'Incident not found.' });
        assistance.action(ctx.actor, assistanceRoute[1], body.action); return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/qa') {
        const actorKey = `${ctx.actor.role}:${ctx.actor.id}`;
        if (qaActive.has(actorKey) || qaActive.size >= 4) return json(res, 429, { error: 'Questions are busy. Please try again shortly.' });
        const version = resetVersion;
        const isCurrent = () => version === resetVersion && (!ctx.user || (sessions.get(ctx.token)?.username === ctx.user.username && sessions.get(ctx.token)?.expires > now()));
        qaActive.add(actorKey);
        try {
          const result = await answerQuestion({ body, actor: ctx.actor, getState: () => stateFor(ctx.actor), providers, guide, isCurrent, findFirstAid: () => firstAid(db.helpStations, body.position, now()) });
          if (!isCurrent()) return json(res, 403, { error: 'Session changed. Refresh and try again.' });
          return json(res, 200, result);
        } finally { qaActive.delete(actorKey); }
      }
      if (url.pathname === '/api/setup') {
        if (deployed) return json(res, 403, { error: 'Setup is disabled on the deployed server. Mo is configured by the operator.' });
        if (db.users.length) return json(res, 409, { error: 'Initial setup is already complete.' });
        validCredentials(body.username, body.password);
        const password = await passwordJob(() => hashPassword(body.password));
        if (db.users.length) return json(res, 409, { error: 'Initial setup is already complete.' });
        const user = { username: body.username, actorId: 'mo', role: 'mo', password };
        db.users.push(user); save(); newStaffSession(res, user, ctx);
        return json(res, 201, { ok: true });
      }
      if (url.pathname === '/api/login') {
        const username = typeof body.username === 'string' ? body.username.toLowerCase() : '';
        if (typeof body.password !== 'string' || body.password.length === 0) return json(res, 401, { error: 'Incorrect username or password.' });
        const key = req.socket.remoteAddress;
        const attempt = loginAttempts.get(key) || { count: 0, until: Date.now() + 15 * 60 * 1000 };
        if (attempt.until < Date.now()) { attempt.count = 0; attempt.until = Date.now() + 15 * 60 * 1000; }
        if (attempt.count >= 10) return json(res, 429, { error: 'Too many sign-in attempts. Try again in 15 minutes.' });
        attempt.count++; loginAttempts.set(key, attempt);
        const user = db.users.find(item => item.username === username);
        const verified = await passwordJob(() => verifyPassword(body.password, user ? user.password : dummy));
        if (!user || !verified) return json(res, 401, { error: 'Incorrect username or password.' });
        loginAttempts.delete(key); newStaffSession(res, user, ctx);
        return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/logout') {
        if (ctx.actor.role === 'volunteer') assistance.pause(ctx.actor.id, ctx.token);
        sessions.delete(ctx.token); cookie(res, ctx.sessionCookie, '', 0);
        return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/accounts') {
        requireMo(ctx);
        validCredentials(body.username, body.password);
        const volunteer = data.volunteers.find(item => item.id === body.volunteerId);
        if (!volunteer) return json(res, 400, { error: 'Choose a volunteer from the fictional roster.' });
        if (db.users.some(item => item.username === body.username || item.actorId === volunteer.id)) return json(res, 409, { error: 'That username or volunteer already has an account.' });
        const password = await passwordJob(() => hashPassword(body.password));
        if (db.users.some(item => item.username === body.username || item.actorId === volunteer.id)) return json(res, 409, { error: 'That username or volunteer already has an account.' });
        db.users.push({ username: body.username, actorId: volunteer.id, role: 'volunteer', password }); save();
        return json(res, 201, { ok: true });
      }
      if (url.pathname === '/api/reset') {
        // Demo only: Mo clears reports and incidents. Accounts are kept.
        requireMo(ctx);
        for (const incident of workflow.getState().incidents) if (incident.assistance && !['completed', 'cancelled'].includes(incident.assistance.state)) assistance.action(ctx.actor, incident.id, 'withdraw');
        data.volunteers.forEach(v => assistance.pause(v.id));
        resetVersion++;
        workflow.reset();
        return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/reports') {
        let request;
        if (body.requestAssistance === true) {
          if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(body.requestId)) return json(res, 400, { error: 'An assistance request reference is required.' });
          const state = workflow.getState();
          const existing = state.incidents.find(i => i.assistance?.requestId === body.requestId && state.reports.some(r => i.reportIds.includes(r.id) && r.reporter.id === ctx.actor.id && r.reporter.role === ctx.actor.role));
          if (existing) return json(res, 200, { id: existing.id });
          request = { requestId: body.requestId, destination: position(body.position, now()), state: 'looking', offers: [], events: [] };
        }
        const incident = await workflow.submitReport({ text: body.text, zone: body.zone, category: body.category, immediateConcern: body.immediateConcern,
          assistance: request,
          ...(ctx.actor.role === 'volunteer' ? { volunteerId: ctx.actor.id } : { reporter: ctx.actor }) });
        assistance.tick();
        return json(res, 201, { id: incident.id });
      }
      const match = url.pathname.match(/^\/api\/incidents\/(I-\d+)\/action$/);
      if (match) {
        const visible = stateFor(ctx.actor).incidents.some(item => item.id === match[1]);
        if (!visible) return json(res, 404, { error: 'Incident not found.' });
        try { workflow.act(match[1], body.action, ctx.actor); }
        catch (error) { return json(res, 403, { error: error.message }); }
        assistance.tick();
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: 'Not found.' });
    } catch (error) {
      const known = error.status || /Choose |Write |Use a /.test(error.message);
      json(res, error.status || (known ? 400 : 500), { error: known ? error.message : 'The server could not complete the request.' });
    }
  });
  // Deployed mode: create or update the Mo account from operator-supplied credentials.
  server.ensureMo = async (username, password) => {
    validCredentials(username, password);
    const user = { username, actorId: 'mo', role: 'mo', password: await hashPassword(password) };
    db.users = [...db.users.filter(item => item.role !== 'mo' && item.username !== username), user];
    save();
  };
  // Open event streams would otherwise stop close() from finishing.
  const close = server.close.bind(server);
  server.close = callback => { clearInterval(heartbeat); clearInterval(assistanceTimer); streams.forEach(stream => stream.end()); streams.clear(); return close(callback); };
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.whenAIIdle = workflow.whenIdle;
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8765);
  const publicOrigin = process.env.PUBLIC_ORIGIN || null;
  const server = createApp({ dataDir: process.env.RIVERSIDE_DATA_DIR || undefined, publicOrigin });
  server.on('error', error => { console.error(`Cannot start Riverside: ${error.code || error.message}`); process.exitCode = 1; });
  (async () => {
    if (publicOrigin) {
      if (!process.env.MO_USERNAME || !process.env.MO_PASSWORD) throw new Error('Deployed mode needs MO_USERNAME and MO_PASSWORD environment variables.');
      await server.ensureMo(process.env.MO_USERNAME, process.env.MO_PASSWORD);
    }
    // Deployed: listen on all interfaces so the host's proxy can reach us. Local: this computer only.
    const host = publicOrigin ? '0.0.0.0' : '127.0.0.1';
    server.listen(port, host, () => console.log(publicOrigin ? `Riverside: ${publicOrigin} (deployed, port ${port})` : `Riverside: http://127.0.0.1:${port} (local server)`));
  })().catch(error => { console.error(`Cannot start Riverside: ${error.message}`); process.exit(1); });
}
module.exports = { createApp };
