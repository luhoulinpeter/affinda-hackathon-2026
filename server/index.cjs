const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { validCredentials, hashPassword, verifyPassword, equal, sign } = require('./auth.cjs');
const data = require('../data/fixtures.js');
const analysis = require('../src/js/services/analysis.js');
const createIncidents = require('../src/js/domain/incidents.js');
const root = path.resolve(__dirname, '..');

function createApp({ dataDir = path.join(root, '.riverside'), secureCookies = false } = {}) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const dbFile = path.join(dataDir, 'store.json');
  const db = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile, 'utf8')) : { users: [], workflow: {}, cookieSecret: randomBytes(32).toString('hex') };
  function save() {
    const temporary = `${dbFile}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(temporary, dbFile);
  }
  save();
  const workflow = createIncidents(data, () => analysis, db.workflow, state => { db.workflow = state; save(); });
  // Live updates: send only a "changed" signal; each client re-fetches its own role-scoped /api/state.
  const streams = new Set();
  const broadcast = message => streams.forEach(stream => stream.write(message));
  workflow.subscribe(() => broadcast('event: state\ndata: {}\n\n'));
  const heartbeat = setInterval(() => broadcast(': keep-alive\n\n'), 20000);
  heartbeat.unref();
  const sessions = new Map();
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
  function newStaffSession(res, user, oldToken) {
    if (oldToken) sessions.delete(oldToken);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { username: user.username, csrf: randomBytes(32).toString('hex'), expires: Date.now() + 8 * 60 * 60 * 1000 });
    cookie(res, 'riverside_session', token, 8 * 60 * 60);
  }
  function context(req, res) {
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(item => item.trim().split('=')));
    const [guestId, signature] = (cookies.riverside_guest || '').split('.');
    let id = guestId;
    if (!id || !/^guest-[a-f0-9-]{36}$/.test(id) || !equal(signature, sign(db.cookieSecret, 'guest', id))) {
      id = `guest-${randomUUID()}`;
      cookie(res, 'riverside_guest', `${id}.${sign(db.cookieSecret, 'guest', id)}`, 7 * 24 * 60 * 60);
    }
    for (const [token, session] of sessions) if (session.expires <= Date.now()) sessions.delete(token);
    const token = cookies.riverside_session;
    const session = sessions.get(token);
    const user = session && db.users.find(item => item.username === session.username);
    return {
      token, user, guest: { id, role: 'public' },
      actor: user ? { id: user.actorId, role: user.role } : { id, role: 'public' },
      csrf: user ? session.csrf : sign(db.cookieSecret, 'csrf', id)
    };
  }
  function stateFor(actor) {
    const state = workflow.getState();
    if (actor.role === 'mo') return state;
    const own = state.reports.filter(item => item.reporter.id === actor.id && item.reporter.role === actor.role);
    const incidents = state.incidents.filter(item => item.assignee === actor.id || own.some(report => item.reportIds.includes(report.id)));
    const reports = actor.role === 'volunteer' ? state.reports.filter(report => incidents.some(item => item.reportIds.includes(report.id))) : own;
    if (actor.role === 'public') {
      return { reports, incidents: incidents.map(item => ({
        id: item.id, reportIds: item.reportIds.filter(id => own.some(report => report.id === id)),
        zone: item.zone, status: item.status, attention: item.attention,
        assignee: item.assignee, resolvedBy: item.resolvedBy, resolvedAt: item.resolvedAt
      })) };
    }
    return { reports, incidents };
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
    ['/src/js/ui/app.js', ['src/js/ui/app.js', 'text/javascript']]
  ]);
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const address = server.address();
      const allowedHosts = [`127.0.0.1:${address.port}`, `localhost:${address.port}`];
      if (!allowedHosts.includes(req.headers.host)) return json(res, 403, { error: 'Invalid host.' });
      const origin = `http://${req.headers.host}`;
      if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { error: 'Cross-origin request denied.' });
      const url = new URL(req.url, origin);
      if (!url.pathname.startsWith('/api/')) {
        const asset = assets.get(url.pathname);
        if (req.method !== 'GET' || !asset) return json(res, 404, { error: 'Not found.' });
        res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8` });
        res.end(fs.readFileSync(path.join(root, asset[0])));
        return;
      }
      const ctx = context(req, res);
      if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { user: ctx.user ? publicUser(ctx.user) : null, guest: ctx.guest, csrf: ctx.csrf, setupRequired: db.users.length === 0 });
      if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, stateFor(ctx.actor));
      if (req.method === 'GET' && url.pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive' });
        res.write('retry: 3000\n\n');
        streams.add(res);
        req.on('close', () => streams.delete(res));
        return;
      }
      if (req.method !== 'POST') return json(res, 404, { error: 'Not found.' });
      if (!equal(req.headers['x-csrf-token'], ctx.csrf)) return json(res, 403, { error: 'Session changed. Refresh and try again.' });
      const body = await readBody(req);
      if (url.pathname === '/api/setup') {
        if (db.users.length) return json(res, 409, { error: 'Initial setup is already complete.' });
        validCredentials(body.username, body.password);
        const password = await passwordJob(() => hashPassword(body.password));
        if (db.users.length) return json(res, 409, { error: 'Initial setup is already complete.' });
        const user = { username: body.username, actorId: 'mo', role: 'mo', password };
        db.users.push(user); save(); newStaffSession(res, user, ctx.token);
        return json(res, 201, { ok: true });
      }
      if (url.pathname === '/api/login') {
        const username = typeof body.username === 'string' ? body.username.toLowerCase() : '';
        if (typeof body.password !== 'string' || body.password.length > 128) return json(res, 401, { error: 'Incorrect username or password.' });
        const key = req.socket.remoteAddress;
        const attempt = loginAttempts.get(key) || { count: 0, until: Date.now() + 15 * 60 * 1000 };
        if (attempt.until < Date.now()) { attempt.count = 0; attempt.until = Date.now() + 15 * 60 * 1000; }
        if (attempt.count >= 10) return json(res, 429, { error: 'Too many sign-in attempts. Try again in 15 minutes.' });
        attempt.count++; loginAttempts.set(key, attempt);
        const user = db.users.find(item => item.username === username);
        const verified = await passwordJob(() => verifyPassword(body.password, user ? user.password : dummy));
        if (!user || !verified) return json(res, 401, { error: 'Incorrect username or password.' });
        loginAttempts.delete(key); newStaffSession(res, user, ctx.token);
        return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/logout') {
        sessions.delete(ctx.token); cookie(res, 'riverside_session', '', 0);
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
        workflow.reset();
        return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/reports') {
        if (ctx.actor.role === 'mo') return json(res, 403, { error: 'Use the public or volunteer reporting page.' });
        const incident = await workflow.submitReport({ text: body.text, zone: body.zone, category: body.category, immediateConcern: body.immediateConcern,
          ...(ctx.actor.role === 'volunteer' ? { volunteerId: ctx.actor.id } : { reporter: ctx.actor }) });
        return json(res, 201, { id: incident.id });
      }
      const match = url.pathname.match(/^\/api\/incidents\/(I-\d+)\/action$/);
      if (match) {
        const visible = stateFor(ctx.actor).incidents.some(item => item.id === match[1]);
        if (!visible) return json(res, 404, { error: 'Incident not found.' });
        try { workflow.act(match[1], body.action, ctx.actor); }
        catch (error) { return json(res, 403, { error: error.message }); }
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: 'Not found.' });
    } catch (error) {
      const known = error.status || /Choose |Write |Use a /.test(error.message);
      json(res, error.status || (known ? 400 : 500), { error: known ? error.message : 'The server could not complete the request.' });
    }
  });
  // Open event streams would otherwise stop close() from finishing.
  const close = server.close.bind(server);
  server.close = callback => { clearInterval(heartbeat); streams.forEach(stream => stream.end()); streams.clear(); return close(callback); };
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8765);
  const server = createApp({ dataDir: process.env.RIVERSIDE_DATA_DIR || undefined });
  server.listen(port, '127.0.0.1', () => console.log(`Riverside: http://127.0.0.1:${port} (local server)`));
  server.on('error', error => { console.error(`Cannot start Riverside: ${error.code || error.message}`); process.exitCode = 1; });
}
module.exports = { createApp };
