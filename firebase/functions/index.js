/**
 * QueueLess Firebase Cloud Functions.
 * Owner: Hasaan (Database & Cloud Config module).
 *
 * This file demonstrates SERVERLESS COMPUTING - a core cloud computing concept
 * called out explicitly in the proposal. There is no always-on server here;
 * Firebase invokes our function on a schedule, runs it, and tears it down.
 *
 * What it does: every 5 minutes, scans `queue/tokens` for any WAITING token
 * whose expiresAt has passed, and marks it as EXPIRED. This keeps the queue
 * honest - users who took a token but never showed up don't permanently
 * inflate everyone else's wait time.
 *
 * Why a cloud function instead of a backend cron job:
 *   - No always-on process needed (cheaper, simpler).
 *   - Runs even if the Render backend is sleeping (Render's free tier idles
 *     services after 15 min of inactivity).
 *   - Atomic with Firebase - no network hop between compute and database.
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

const TOKEN_STATUS_WAITING = 'waiting';
const TOKEN_STATUS_EXPIRED = 'expired';

/**
 * Scheduled function - runs every 5 minutes.
 *
 * Cron syntax: "every 5 minutes" is the human-readable form supported by the
 * v2 scheduler. The equivalent classic cron is "*\/5 * * * *".
 */
exports.expireStaleTokens = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Asia/Karachi',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async () => {
    const now = Date.now();
    const tokensSnap = await db.ref('queue/tokens').once('value');
    const tokens = tokensSnap.val() || {};

    const expirations = Object.values(tokens)
      // Referred patients are physically present (transferred between counters) —
      // never auto-expire them, mirroring the backend expiry sweep.
      .filter(t => t.status === TOKEN_STATUS_WAITING && t.referred !== true && t.expiresAt && t.expiresAt < now);

    if (expirations.length === 0) {
      logger.info('No stale tokens to expire.');
      return null;
    }

    // Batch all updates into a single multi-path update for atomicity.
    const updates = {};
    for (const t of expirations) {
      updates[`queue/tokens/${t.id}/status`] = TOKEN_STATUS_EXPIRED;
      updates[`queue/tokens/${t.id}/expiredAt`] = now;
    }
    await db.ref().update(updates);

    logger.info(`Expired ${expirations.length} stale token(s).`, {
      tokenNumbers: expirations.map(t => t.number),
    });
    return null;
  }
);
