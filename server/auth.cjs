const { randomBytes, scrypt, timingSafeEqual, createHmac } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
// OWASP's scrypt baseline. Explicit maxmem accommodates the 128 MiB work factor.
const work = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

function validCredentials(username, password) {
  if (typeof username !== 'string' || !/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('Use a username of 3–40 lowercase letters, numbers, dots, dashes or underscores.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Error('Use a password of 12–128 characters.');
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, work);
  return { salt, hash: key.toString('hex') };
}
async function verifyPassword(password, stored) {
  const key = await derive(password, stored.salt, 64, work);
  const expected = Buffer.from(stored.hash, 'hex');
  return expected.length === key.length && timingSafeEqual(key, expected);
}
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const first = Buffer.from(a), second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
function sign(secret, purpose, value) { return createHmac('sha256', secret).update(`${purpose}:${value}`).digest('hex'); }
module.exports = { validCredentials, hashPassword, verifyPassword, equal, sign };
