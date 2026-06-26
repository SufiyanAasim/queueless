const { refs, db } = require('../config/firebase');
const analytics = require('./analytics.service');

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
let sweepTimer = null;

async function sweepExpiredTokens() {
  try {
    const tokensSnap = await refs.tokens().once('value');
    const all = tokensSnap.val() || {};
    const now = Date.now();
    const updates = {};
    let count = 0;

    for (const token of Object.values(all)) {
      // Referred patients are physically in the building (transferred between
      // counters) — never auto-expire them, even if their clock lapses.
      if (token.referred === true) continue;
      if (token.status === 'waiting' && token.expiresAt && token.expiresAt < now) {
        updates[`tokens/${token.id}/status`] = 'expired';
        updates[`tokens/${token.id}/expiredAt`] = now;
        count++;
      }
    }

    if (count > 0) {
      await db.ref('queue').update(updates);
      console.log(`[expiry] Marked ${count} token(s) as expired.`);

      // Log one analytics event per expired token
      for (const token of Object.values(all)) {
        if (updates[`tokens/${token.id}/status`] === 'expired') {
          analytics.logEvent({
            event_type: 'token_expired',
            token_id: token.id,
            token_number: token.number,
            service: token.service,
            timestamp: now,
          }).catch(() => {});
          analytics.upsertTokenRecord({ ...token, status: 'expired', expiredAt: now }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[expiry] Sweep failed (non-fatal):', err.message);
  }
}

function startExpirySweep() {
  if (sweepTimer) return;
  // Run once immediately on boot, then on interval.
  sweepExpiredTokens();
  sweepTimer = setInterval(sweepExpiredTokens, SWEEP_INTERVAL_MS);
  console.log('[expiry] Token expiry sweeper started (every 5 min).');
}

function stopExpirySweep() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

module.exports = { startExpirySweep, stopExpirySweep };
