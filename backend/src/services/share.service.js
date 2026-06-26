/**
 * Secure sharing (v1.4.5 Phase 5b).
 *
 * Creates capability links to read-only snapshots (queue analytics, queue
 * snapshots, token status, reports). The share id is a 128-bit random token that
 * acts as the capability — anyone with the link can view it until it expires.
 * Snapshots are served via the API (the id is the only secret); creation/listing
 * /revocation require an authenticated admin or staff session.
 */
const crypto = require('crypto');
const { refs } = require('../config/firebase');
const config = require('../config/env');

const TYPES = ['token', 'queue_snapshot', 'analytics', 'report'];
const DEFAULT_TTL_HOURS = 168; // 7 days
const MAX_TTL_HOURS = 24 * 90;

function badRequest(msg) { return Object.assign(new Error(msg), { statusCode: 400 }); }

async function createShare({ type, title, data, createdBy, ttlHours }) {
  if (!TYPES.includes(type)) throw badRequest(`Invalid share type. Allowed: ${TYPES.join(', ')}.`);
  if (!data || typeof data !== 'object') throw badRequest('Share data is required.');

  const id = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  let ttl = Number(ttlHours) > 0 ? Number(ttlHours) : DEFAULT_TTL_HOURS;
  if (ttl > MAX_TTL_HOURS) ttl = MAX_TTL_HOURS;

  const record = {
    id,
    type,
    title: String(title || type).slice(0, 120),
    data,
    createdBy,
    createdAt: now,
    expiresAt: now + ttl * 3600 * 1000,
  };
  await refs.share(id).set(record);
  return { id, url: `${config.frontendUrl}/share/${id}`, type, title: record.title, expiresAt: record.expiresAt };
}

async function getShare(id) {
  const snap = await refs.share(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Shared item not found.'), { statusCode: 404 });
  const rec = snap.val();
  if (rec.expiresAt && rec.expiresAt < Date.now()) {
    throw Object.assign(new Error('This shared link has expired.'), { statusCode: 410 });
  }
  return rec;
}

async function listSharesFor(username) {
  const snap = await refs.shares().once('value');
  return Object.values(snap.val() || {})
    .filter(s => s.createdBy === username)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ data, ...rest }) => rest); // omit payload from the listing
}

async function revokeShare(id, username) {
  const snap = await refs.share(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Shared item not found.'), { statusCode: 404 });
  if (snap.val().createdBy !== username) {
    throw Object.assign(new Error('Only the creator can revoke this share.'), { statusCode: 403 });
  }
  await refs.share(id).remove();
  return { id, revoked: true };
}

module.exports = { createShare, getShare, listSharesFor, revokeShare, TYPES };
