/**
 * Authentication service.
 *
 * Admin accounts are stored in Firebase under /admins/{username} with bcrypt-
 * hashed passwords. On server boot we bootstrap a single admin from env vars
 * so the team can log in immediately on a fresh deploy.
 *
 * Tokens are JWTs, not session cookies, because the API is consumed by a
 * separate React origin (Vercel) and stateless tokens travel cleanly across
 * CORS without sticky-session concerns.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { refs } = require('../config/firebase');

const BCRYPT_ROUNDS = 10;

/**
 * Idempotent bootstrap: create the configured admin account on first run.
 * Existing accounts are NEVER overwritten - changing ADMIN_PASSWORD in env
 * after first deploy has no effect, by design (prevents accidental lockout
 * scenarios where an env change would break a working account).
 */
async function bootstrapAdmin() {
  const { username, password } = config.bootstrapAdmin;
  const snap = await refs.admin(username).once('value');
  if (snap.exists()) {
    console.log(`[auth] Admin "${username}" already exists - skipping bootstrap.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await refs.admin(username).set({
    username,
    passwordHash,
    createdAt: Date.now(),
    role: 'admin',
  });
  console.log(`[auth] Bootstrapped admin account "${username}".`);
}

/**
 * Verify credentials and issue a JWT. Throws 401 on bad credentials.
 * The error message is deliberately generic to avoid telling an attacker
 * whether the username exists.
 */
async function login(username, password) {
  const snap = await refs.admin(username).once('value');
  const account = snap.val();

  // Run bcrypt.compare even on a missing account using a dummy hash, so the
  // response time is constant regardless of whether the username exists.
  // This prevents user enumeration via timing attacks.
  const dummyHash = '$2a$10$abcdefghijklmnopqrstuuW2j7n5p9LK0L1PZmQDqfyV5bKzN6eLm';
  const hash = account?.passwordHash || dummyHash;
  const ok = await bcrypt.compare(password, hash);

  if (!account || !ok) {
    const err = new Error('Invalid username or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { sub: username, role: account.role || 'admin' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    expiresIn: config.jwt.expiresIn,
    user: { username, role: account.role || 'admin' },
  };
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { bootstrapAdmin, login, verifyToken };
