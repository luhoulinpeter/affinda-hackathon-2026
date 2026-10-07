// Temporary HTTPS forwarding: reuse existing accounts, bind only to this Mac,
// and apply the server's public-host, secure-cookie and no-setup protections.
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./index.cjs');

function createPhoneDemo({ origin, dataDir = path.join(__dirname, '../.riverside'), ...options } = {}) {
  let db;
  try { db = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8')); }
  catch { throw new Error('Set up your Mo account locally before starting phone access.'); }
  if (!db.users?.some(user => user.role === 'mo')) throw new Error('Set up your Mo account locally before starting phone access.');
  if (!origin) throw new Error('RIVERSIDE_PHONE_ORIGIN must contain the tunnel HTTPS origin.');
  return createApp({ ...options, dataDir, publicOrigin: origin, eventStreams: false });
}

if (require.main === module) {
  try {
    const origin = process.env.RIVERSIDE_PHONE_ORIGIN;
    const server = createPhoneDemo({ origin, dataDir: process.env.RIVERSIDE_DATA_DIR || undefined });
    server.on('error', error => { console.error(`Cannot start phone demo: ${error.code || error.message}`); process.exitCode = 1; });
    server.listen(Number(process.env.PORT || 8765), '127.0.0.1', () => console.log(`Riverside phone demo: ${origin}`));
  } catch (error) { console.error(`Cannot start phone demo: ${error.message}`); process.exitCode = 1; }
}

module.exports = { createPhoneDemo };
