// Reproducible, keyless local demo. Never loads .env or the team's saved store.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../server/index.cjs');
const { hashPassword, verifyPassword } = require('../server/auth.cjs');
const root = path.resolve(__dirname, '..');
const credentials = Object.freeze({
  mo: { username:'mo', password:'mo' },
  priya: { username:'priya', password:'priya' },
  alex: { username:'alex', password:'alex' }
});
function simulatedProviders() {
  return {
    status: () => ({ jev:{ enabled:true, simulated:true, label:'Simulated Jev', remainingCalls:null }, luna:{ enabled:true, simulated:true, label:'Simulated OpenRouter', remainingCalls:null } }),
    classify: async report => ({ category:report.category, urgency:report.immediateConcern ? 'urgent' : 'routine', sensitivity:/sensitive|harass|assault|private|lost child/i.test(report.text) ? 'sensitive' : 'ordinary' }),
    summarise: async report => ({ summary:`[Simulated AI] Original report: ${report.text.slice(0, 1000)}` }),
    screen: async question => ({ intent:/first aid/i.test(question) ? 'first_aid_information' : /spill|injur|hurt|lost child|crowd pressure|harass|unsafe/i.test(question) ? 'safety' : 'information' }),
    answer: async (_question, _history, sources) => {
      const source = sources.find(s => s.id === 'permitted-overview');
      return { answer:`[Simulated AI] ${source.text} This demo returns the permitted overview only; it does not interpret arbitrary questions.`, sources:[source.id], unknown:false };
    },
    rankAssignment: async ({candidates}) => ({ rankedIds:[...candidates].sort((a,b) => Number(b.sameZone)-Number(a.sameZone) || Number(b.fresh)-Number(a.fresh) || a.id.localeCompare(b.id)).map(c => c.id) })
  };
}
function client(base) {
  const tab = randomUUID(), cookies = new Map(); let csrf;
  return async (route, body) => {
    const response = await fetch(base+route, { headers:{ Connection:'close', 'X-Riverside-Tab':tab, Cookie:[...cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...(body === undefined ? {} : { 'Content-Type':'application/json', 'X-CSRF-Token':csrf }) }, ...(body === undefined ? {} : { method:'POST', body:JSON.stringify(body) }) });
    for (const cookie of response.headers.getSetCookie()) { const [k,v] = cookie.split(';')[0].split('='); if (v) cookies.set(k,v); else cookies.delete(k); }
    const data = await response.json(); if (data.csrf) csrf = data.csrf;
    if (!response.ok) throw new Error(`${route}: ${response.status} ${data.error || ''}`);
    return data;
  };
}
function createJudgeServer({ dataDir, now, publicOrigin = null }) {
  const server = createApp({ dataDir, aiProviders:simulatedProviders(), aiEnv:{}, now, publicOrigin, eventStreams:!publicOrigin });
  const publicHost = publicOrigin && new URL(publicOrigin).host;
  const handler = server.listeners('request')[0]; server.removeListener('request', handler);
  const assets = new Map([
    ['/__judge/map.js', ['demo/map.js','text/javascript']],
    ['/__judge/judge.js', ['demo/judge.js','text/javascript']],
    ['/__judge/judge.css', ['demo/judge.css','text/css']]
  ]);
  server.on('request', (req,res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const allowedHost = publicHost ? req.headers.host === publicHost : [`127.0.0.1:${server.address().port}`, `localhost:${server.address().port}`].includes(req.headers.host);
    const allowedOrigin = !req.headers.origin || req.headers.origin === (publicOrigin || `http://${req.headers.host}`);
    if (req.method === 'GET' && allowedHost && allowedOrigin && assets.has(url.pathname)) {
      const [file,type] = assets.get(url.pathname);
      res.writeHead(200, { 'Content-Type':`${type}; charset=utf-8`, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'self'; object-src 'none'; frame-ancestors 'none'" }); res.end(fs.readFileSync(path.join(root,file))); return;
    }
    if (req.method === 'GET' && ['/', '/index.html'].includes(url.pathname)) {
      const end = res.end.bind(res);
      res.end = (body,...args) => end(res.statusCode === 200 && body ? body.toString().replace('<script defer src="data/fixtures.js">', '<link rel="stylesheet" href="/__judge/judge.css"><script src="/__judge/map.js"></script><script src="/__judge/judge.js"></script><script defer src="data/fixtures.js">') : body,...args);
    }
    handler(req,res);
  });
  return server;
}
async function startJudgeDemo({ dataDir = path.join(root, '.riverside/judge-demo'), port = 8766, now = Date.now, publicOrigin = null } = {}) {
  if (publicOrigin !== null) {
    const origin = new URL(publicOrigin);
    if (origin.protocol !== 'https:' || origin.origin !== publicOrigin) throw new Error('Judge public origin must be an exact HTTPS origin.');
  }
  const teamDir = path.join(root, '.riverside');
  if (path.resolve(dataDir) === teamDir || fs.existsSync(dataDir) && fs.existsSync(teamDir) && fs.realpathSync(dataDir) === fs.realpathSync(teamDir)) throw new Error('Judge demo cannot use the team data folder.');
  const marker = path.join(dataDir, 'judge-demo-only.json');
  if (fs.existsSync(dataDir) && fs.readdirSync(dataDir).length && !fs.existsSync(marker)) throw new Error('Refusing non-demo data. Choose an empty directory for this sandbox.');
  fs.mkdirSync(dataDir, { recursive:true, mode:0o700 });
  fs.writeFileSync(marker, JSON.stringify({ purpose:'Hi-Vis isolated judge demo', version:1 }), { mode:0o600 });
  // Only the marked demo store is migrated; preserve reports, settings and signing secret.
  const dbFile = path.join(dataDir,'store.json');
  if (fs.existsSync(dbFile)) {
    const stored = JSON.parse(fs.readFileSync(dbFile,'utf8')); let changed = false;
    for (const [name,credential] of Object.entries(credentials)) {
      const user = stored.users.find(u => u.username === name && u.actorId === (name === 'mo' ? 'mo' : `vol-${name}`) && u.role === (name === 'mo' ? 'mo' : 'volunteer'));
      if (user && !await verifyPassword(credential.password,user.password)) { user.password = await hashPassword(credential.password); changed = true; }
    }
    if (changed) { fs.writeFileSync(`${dbFile}.tmp`,JSON.stringify(stored),{mode:0o600}); fs.renameSync(`${dbFile}.tmp`,dbFile); }
  }
  let server = createJudgeServer({dataDir,now});
  try {
    await new Promise((resolve,reject) => { server.once('error',reject); server.listen(publicOrigin ? 0 : port,'127.0.0.1',() => { server.removeListener('error',reject); resolve(); }); });
    const base = `http://127.0.0.1:${server.address().port}`;
    const stored = JSON.parse(fs.readFileSync(path.join(dataDir,'store.json')));
    if (!stored.users.length) await server.ensureMo(credentials.mo.username,credentials.mo.password);
    const mo = client(base); await mo('/api/session'); await mo('/api/login',credentials.mo); await mo('/api/session');
    for (const name of ['priya','alex']) if (!stored.users.some(u => u.username === name && u.actorId === `vol-${name}`)) await mo('/api/accounts',{ ...credentials[name], volunteerId:`vol-${name}` });
    await mo('/api/logout',{});
    if (publicOrigin) {
      await new Promise(resolve => server.close(resolve));
      server = createJudgeServer({dataDir,now,publicOrigin});
      await new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',() => { server.removeListener('error',reject); resolve(); }); });
    }
    return { server, base:publicOrigin || base, dataDir };
  } catch (error) { await new Promise(resolve => server.close(resolve)); throw error; }
}
if (require.main === module) {
  if (Number(process.versions.node.split('.')[0]) < 20) { console.error('Hi-Vis needs Node.js 20 or newer.'); process.exit(1); }
  const port = Number(process.env.HIVIS_DEMO_PORT || 8766);
  if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('HIVIS_DEMO_PORT must be between 1 and 65535.'); process.exit(1); }
  startJudgeDemo({port}).then(({server,base}) => {
    console.log(`\nHi-Vis judge demo: ${base}\nMo: mo / mo\nPriya: priya / priya\nAlex: alex / alex\nRead JUDGES.md. Simulated AI/GPS/map; no API calls. Local computer only.\nData: .riverside/judge-demo (separate from your normal app)\nKeep this terminal open. Stop with Ctrl+C.\n`);
    const shutdown = async () => { await server.whenAIIdle(); server.close(() => process.exit(0)); };
    process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
  }).catch(error => { console.error(`Cannot start Hi-Vis judge demo: ${error.code === 'EADDRINUSE' ? 'Port is already in use. Stop the other judge demo, or set HIVIS_DEMO_PORT to a free port.' : error.message}`); process.exitCode = 1; });
}
module.exports = { startJudgeDemo, simulatedProviders, credentials, client };
