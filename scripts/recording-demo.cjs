// Disposable recording sandbox. Never points at the real .riverside/store.json.
// Run: node --env-file=.env scripts/recording-demo.cjs
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createApp } = require('../server/index.cjs');

async function main() {
  const walkingDemo = process.env.RIVERSIDE_DEMO_WALKING === 'true';
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverside-recording-'));
  const providers = {
    status: () => ({}),
    classify: async report => ({ category: report.category, urgency: 'routine', sensitivity: 'ordinary' }),
    summarise: async () => ({ summary: 'Fictional attendee needs a volunteer near the south lawn. Simulated analysis.' })
  };
  const server = createApp({ dataDir, aiProviders: providers,
    ...(walkingDemo ? { routesFetch: async () => ({ ok: true, json: async () => ({ routes: [{ duration: '90s', warnings: ['Simulated routing response for UI verification.'] }] }) }) } : {}),
    aiEnv: { GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
      ...(walkingDemo ? { GOOGLE_ROUTES_API_KEY: 'simulation-only', RIVERSIDE_GOOGLE_ROUTES_ENABLED: 'true', RIVERSIDE_GOOGLE_ROUTES_MAX_CALLS: '100' } : {}) } });
  // The fixture is loaded only by this loopback sandbox, before the real UI code.
  // All form submissions, permission checks, offers and map rendering stay real.
  const gps = `(() => {
    const volunteer = new URLSearchParams(location.search).get('demo-role') === 'volunteer';
    const denied = new URLSearchParams(location.search).get('demo-gps') === 'denied';
    const position = () => ({ coords: { latitude: volunteer ? -37.7958 : -37.7992,
      longitude: volunteer ? 144.9612 : 144.962, accuracy: 8 }, timestamp: Date.now() });
    let next = 0; const watches = new Map();
    Object.defineProperty(navigator, 'geolocation', { value: {
      getCurrentPosition(ok, fail) { setTimeout(() => denied ? fail({ code: 1 }) : ok(position()), 20); },
      watchPosition(ok) { const id = ++next; ok(position()); watches.set(id, setInterval(() => ok(position()), 10000)); return id; },
      clearWatch(id) { clearInterval(watches.get(id)); watches.delete(id); }
    }});
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div'); banner.className = 'recording-banner';
      banner.textContent = 'RECORDING SANDBOX · Fictional GPS + simulated AI${walkingDemo ? ' + simulated routing' : ''} · Separate test data';
      document.body.prepend(banner);
    });
  })();`;
  const css = '.recording-banner{padding:8px 16px;background:#e6f1ed;color:#173c36;text-align:center;font:600 13px system-ui;border-bottom:1px solid #abc5bb}';
  const appHandler = server.listeners('request')[0];
  server.removeListener('request', appHandler);
  server.on('request', (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && ['/__demo/gps.js', '/__demo/banner.css'].includes(url.pathname)) {
      if (req.headers.host !== `127.0.0.1:${server.address().port}`) { res.writeHead(403); res.end(); return; }
      res.writeHead(200, { 'Content-Type': url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(url.pathname.endsWith('.js') ? gps : css); return;
    }
    if (req.method === 'GET' && ['/', '/index.html'].includes(url.pathname)) {
      const end = res.end.bind(res);
      res.end = (body, ...args) => end(res.statusCode === 200 && body ? body.toString().replace('<script defer src="data/fixtures.js">', '<link rel="stylesheet" href="/__demo/banner.css"><script src="/__demo/gps.js"></script><script defer src="data/fixtures.js">') : body, ...args);
    }
    appHandler(req, res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const credentials = { mo: { username: 'demo-mo', password: randomBytes(18).toString('hex') },
    priya: { username: 'demo-priya', password: randomBytes(18).toString('hex') } };
  await server.ensureMo(credentials.mo.username, credentials.mo.password);
  const cookies = new Map(), tab = randomUUID(); let csrf;
  async function request(route, body) {
    const response = await fetch(base + route, { headers: { 'X-Riverside-Tab': tab,
      Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '),
      ...(body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } : {}) },
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
    for (const cookie of response.headers.getSetCookie()) { const [key,value] = cookie.split(';')[0].split('='); cookies.set(key,value); }
    const result = await response.json(); if (result.csrf) csrf = result.csrf;
    if (!response.ok) throw new Error(`${route}: ${response.status}`);
    return result;
  }
  await request('/api/session'); await request('/api/login', credentials.mo); await request('/api/session');
  await request('/api/accounts', { ...credentials.priya, volunteerId: 'vol-priya' });
  const accessFile = path.resolve(__dirname, '../.riverside/recording-access.json');
  fs.writeFileSync(accessFile, JSON.stringify({ base, dataDir, credentials }), { mode: 0o600 });
  console.log(`Recording sandbox ready: ${base}. Private access details: .riverside/recording-access.json`);
  async function shutdown() { await server.whenAIIdle(); server.close(() => process.exit(0)); }
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
main().catch(error => { console.error(error.message); process.exit(1); });
