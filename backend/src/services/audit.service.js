/**
 * Audit log (v1.4.5 Phase 5b).
 *
 * Append-only record of sensitive actions (who did what, to which target, when).
 * Fire-and-forget from callers; never throws back into the request path.
 */
const crypto = require('crypto');
const { refs } = require('../config/firebase');

async function record({ actor, action, target = null, meta = null }) {
  try {
    const id = crypto.randomUUID();
    await refs.auditLog(id).set({
      id,
      actor: actor || 'system',
      action,
      target,
      meta,
      at: Date.now(),
    });
  } catch (err) {
    console.error('[audit] record failed (non-fatal):', err.message);
  }
}

async function list({ limit = 100 } = {}) {
  const snap = await refs.auditLogs().once('value');
  return Object.values(snap.val() || {})
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

module.exports = { record, list };
