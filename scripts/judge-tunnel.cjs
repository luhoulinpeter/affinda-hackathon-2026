// Explicit public sandbox. Never loads .env, live providers or the normal app store.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { startJudgeDemo } = require('./judge-demo.cjs');
const root = path.resolve(__dirname,'..');
function tunnelOrigin(output) {
  return output.match(/https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com\b/)?.[0] || null;
}
function waitForOrigin(child, { timeoutMs = 90000, signal } = {}) {
  return new Promise((resolve,reject) => {
    let output = '';
    const finish = (error,value) => {
      clearTimeout(timer); child.stdout.off('data',read); child.stderr.off('data',read);
      child.off('error',failed); child.off('exit',exited); signal?.removeEventListener('abort',aborted);
      if (error) reject(error); else resolve(value);
    };
    const read = chunk => { output = (output + chunk.toString()).slice(-16384); const origin = tunnelOrigin(output); if (origin) finish(null,origin); };
    const failed = error => finish(new Error(error.code === 'ENOENT' ? 'cloudflared was not found. Install it using the official instructions in JUDGES.md, or set HIVIS_CLOUDFLARED to its executable path.' : error.message));
    const exited = code => finish(new Error(`cloudflared stopped before providing a URL (exit ${code}). See the tunnel log.`));
    const aborted = () => finish(new Error('Demo tunnel startup cancelled.'));
    const timer = setTimeout(() => finish(new Error('Cloudflare did not provide a URL within 90 seconds. Check your network and the tunnel log.')),timeoutMs);
    child.stdout.on('data',read); child.stderr.on('data',read); child.once('error',failed); child.once('exit',exited);
    signal?.addEventListener('abort',aborted,{once:true}); if (signal?.aborted) aborted();
  });
}
async function startQuickDemo({ port = 8768, signal } = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('HIVIS_DEMO_TUNNEL_PORT must be between 1 and 65535.');
  if (signal?.aborted) throw new Error('Demo tunnel startup cancelled.');
  const privateDir = path.join(root,'.riverside'); fs.mkdirSync(privateDir,{recursive:true,mode:0o700});
  const logFile = path.join(privateDir,'judge-tunnel.log'), accessFile = path.join(privateDir,'judge-tunnel-access.json');
  // An explicit empty configuration prevents a personal named-tunnel config being reused.
  const configFile = path.join(privateDir,'judge-tunnel-config.yml'); fs.writeFileSync(configFile,'{}\n',{mode:0o600});
  const bundled = path.join(privateDir,'tools',process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  const executable = process.env.HIVIS_CLOUDFLARED || (fs.existsSync(bundled) ? bundled : 'cloudflared');
  let server, child, stopped = false, origin, childExited = false;
  const stop = async () => {
    if (stopped) return; stopped = true;
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      const force = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); },5000); force.unref();
      child.once('exit',() => clearTimeout(force));
    }
    if (server?.listening) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (origin) fs.writeFileSync(accessFile,JSON.stringify({origin,port,stoppedAt:new Date().toISOString()},null,2),{mode:0o600});
  };
  signal?.addEventListener('abort',stop,{once:true});
  try {
    // Reserve the port and return only 503 until the exact public host is known.
    server = http.createServer((_req,res) => { res.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'}); res.end('Hi-Vis demo is starting. Try again shortly.'); });
    await new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); });
    if (stopped || signal?.aborted) throw new Error('Demo tunnel startup cancelled.');
    fs.writeFileSync(logFile,'',{mode:0o600});
    // Clean environment: ignore personal tunnel tokens/configuration and service secrets.
    const childEnv = Object.fromEntries(['PATH','HOME','USERPROFILE','SYSTEMROOT','WINDIR','TEMP','TMP','TMPDIR','SSL_CERT_FILE','SSL_CERT_DIR'].filter(key => process.env[key]).map(key => [key,process.env[key]]));
    child = spawn(executable,['tunnel','--config',configFile,'--no-autoupdate','--protocol','http2','--metrics','127.0.0.1:0','--grace-period','2s','--url',`http://127.0.0.1:${port}`],{env:childEnv,stdio:['ignore','pipe','pipe']});
    child.once('exit',() => { childExited = true; });
    for (const stream of [child.stdout,child.stderr]) stream.on('data',chunk => fs.appendFileSync(logFile,chunk));
    origin = await waitForOrigin(child,{signal});
    await new Promise(resolve => server.close(resolve));
    const app = await startJudgeDemo({port,publicOrigin:origin,dataDir:path.join(privateDir,'judge-tunnel')}); server = app.server;
    if (stopped || signal?.aborted || childExited) { await stop(); if (server.listening) await new Promise(resolve => server.close(resolve)); throw new Error('Tunnel stopped during startup.'); }
    child.once('exit',() => { if (!stopped) { console.error('Cloudflare tunnel stopped. Run npm run demo:tunnel again for a new link.'); process.exitCode=1; void stop(); } });
    child.on('error',error => { console.error(`Cloudflare tunnel error: ${error.message}`); process.exitCode=1; void stop(); });
    fs.writeFileSync(accessFile,JSON.stringify({origin,port,startedAt:new Date().toISOString(),dataDir:'.riverside/judge-tunnel',logFile:'.riverside/judge-tunnel.log'},null,2),{mode:0o600});
    console.log(`\nHi-Vis PUBLIC judge demo: ${origin}\nOpen this same link on every device.\nMo: mo / mo\nPriya: priya / priya\nAlex: alex / alex\nAnyone with this link can use these demo accounts. Fictional data only.\nSimulated AI/GPS/schematic map; no API calls. Normal app data is separate.\nKeep this computer awake and this terminal open. Ctrl+C stops both app and tunnel.\nA new run creates a new temporary URL. Instructions: JUDGES.md\n`);
    return {server,child,origin,stop};
  } catch (error) { await stop(); throw error; }
}
if (require.main === module) {
  const controller = new AbortController();
  process.once('SIGINT',() => controller.abort()); process.once('SIGTERM',() => controller.abort());
  startQuickDemo({port:Number(process.env.HIVIS_DEMO_TUNNEL_PORT || 8768),signal:controller.signal}).catch(error => {
    console.error(`Cannot start demo tunnel: ${error.code === 'EADDRINUSE' ? 'Port is in use. Stop the earlier demo tunnel or set HIVIS_DEMO_TUNNEL_PORT to another port.' : error.message}`);
    process.exitCode = controller.signal.aborted ? 0 : 1;
  });
}
module.exports = { startQuickDemo, tunnelOrigin, waitForOrigin };
