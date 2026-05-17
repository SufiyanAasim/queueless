/**
 * Queue service - single source of truth for all queue business logic.
 *
 * Firebase data model:
 *   queue/state    { status, currentTokenNumber, lastCalledAt, pausedAt }
 *   queue/counter  { value }                          // last issued number
 *   queue/tokens/{id} { number, status, service, ... }
 *
 * Token statuses:
 *   waiting -> called -> served       (happy path)
 *   waiting -> expired                (timeout)
 */
const crypto = require('crypto');
const { refs } = require('../config/firebase');
const config = require('../config/env');
const analytics = require('./analytics.service');

const TOKEN_STATUS = Object.freeze({
  WAITING: 'waiting',
  CALLED: 'called',
  SERVED: 'served',
  EXPIRED: 'expired',
});

const QUEUE_STATUS = Object.freeze({
  RUNNING: 'running',
  PAUSED: 'paused',
});

/**
 * Initialize the queue state on first boot. Idempotent - safe to call on
 * every server start. Creates state/counter nodes only if missing.
 */
async function ensureInitialized() {
  const stateSnap = await refs.queueState().once('value');
  if (!stateSnap.exists()) {
    await refs.queueState().set({
      status: QUEUE_STATUS.RUNNING,
      currentTokenNumber: 0,
      lastCalledAt: null,
      pausedAt: null,
    });
  }
  const counterSnap = await refs.counter().once('value');
  if (!counterSnap.exists()) {
    await refs.counter().set({ value: 0 });
  }
}

/**
 * Issue a new token. Uses a Firebase transaction on the counter node to
 * guarantee atomic increment - two concurrent requests will receive distinct
 * token numbers even under heavy load.
 */
async function issueToken({ service = 'general' } = {}) {
  // Step 1: refuse if queue is paused. Reading state first avoids burning a
  // counter increment on a request that would fail anyway.
  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val();
  if (state.status === QUEUE_STATUS.PAUSED) {
    const err = new Error('Queue is currently paused. Please try again later.');
    err.statusCode = 423; // 423 Locked - semantically right for "temporarily unavailable"
    throw err;
  }

  // Step 2: atomic counter increment.
  const txResult = await refs.counter().transaction((current) => {
    if (current === null) return { value: 1 };
    return { value: (current.value || 0) + 1 };
  });
  if (!txResult.committed) {
    throw new Error('Failed to allocate token number. Please retry.');
  }
  const number = txResult.snapshot.val().value;

  // Step 3: write the token record.
  const id = crypto.randomUUID();
  const issuedAt = Date.now();
  const tokenRecord = {
    id,
    number,
    service,
    status: TOKEN_STATUS.WAITING,
    issuedAt,
    calledAt: null,
    servedAt: null,
    expiresAt: issuedAt + (config.queue.tokenExpirySeconds * 1000),
  };
  await refs.token(id).set(tokenRecord);

  // Step 4: dual-write to analytics sink (Data Mining bridge).
  // Fire-and-forget - analytics failures must not block user-facing token issuance.
  analytics.logEvent({
    event_type: 'token_issued',
    token_id: id,
    token_number: number,
    service,
    timestamp: issuedAt,
    queue_length: await getWaitingCount(),
  }).catch(err => console.error('[analytics] log failure (non-fatal):', err.message));

  return tokenRecord;
}

/**
 * Get the public-facing status of a single token: position in line and ETA.
 */
async function getTokenStatus(tokenId) {
  const tokenSnap = await refs.token(tokenId).once('value');
  if (!tokenSnap.exists()) {
    const err = new Error('Token not found.');
    err.statusCode = 404;
    throw err;
  }
  const token = tokenSnap.val();

  // Position is the count of WAITING tokens with a strictly smaller number.
  // Done in JS rather than a Firebase query because Firebase RTDB cannot
  // filter by two fields simultaneously without a composite index.
  const tokensSnap = await refs.tokens().once('value');
  const all = tokensSnap.val() || {};
  const ahead = Object.values(all).filter(
    t => t.status === TOKEN_STATUS.WAITING && t.number < token.number
  ).length;

  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val();

  return {
    ...token,
    positionInQueue: token.status === TOKEN_STATUS.WAITING ? ahead + 1 : 0,
    peopleAhead: token.status === TOKEN_STATUS.WAITING ? ahead : 0,
    estimatedWaitSeconds: ahead * config.queue.avgServiceTimeSeconds,
    queueStatus: state.status,
  };
}

/**
 * Admin: call the next waiting token. Marks the previously-called token (if
 * any) as served, then promotes the lowest-numbered WAITING token to CALLED.
 */
async function callNextToken() {
  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val();
  if (state.status === QUEUE_STATUS.PAUSED) {
    const err = new Error('Cannot advance queue while paused. Resume first.');
    err.statusCode = 423;
    throw err;
  }

  const tokensSnap = await refs.tokens().once('value');
  const all = tokensSnap.val() || {};
  const tokenList = Object.values(all);

  // Mark previously-called token as served.
  const previouslyCalled = tokenList.find(t => t.status === TOKEN_STATUS.CALLED);
  if (previouslyCalled) {
    const servedAt = Date.now();
    await refs.token(previouslyCalled.id).update({
      status: TOKEN_STATUS.SERVED,
      servedAt,
    });
    analytics.logEvent({
      event_type: 'token_served',
      token_id: previouslyCalled.id,
      token_number: previouslyCalled.number,
      service: previouslyCalled.service,
      timestamp: servedAt,
      service_duration_seconds: Math.round((servedAt - previouslyCalled.calledAt) / 1000),
    }).catch(err => console.error('[analytics]', err.message));
  }

  // Promote the lowest-numbered waiting token.
  const next = tokenList
    .filter(t => t.status === TOKEN_STATUS.WAITING)
    .sort((a, b) => a.number - b.number)[0];

  if (!next) {
    // No tokens waiting - just clear currentTokenNumber.
    await refs.queueState().update({
      currentTokenNumber: 0,
      lastCalledAt: Date.now(),
    });
    return { called: null, message: 'No tokens waiting.' };
  }

  const calledAt = Date.now();
  await refs.token(next.id).update({
    status: TOKEN_STATUS.CALLED,
    calledAt,
  });
  await refs.queueState().update({
    currentTokenNumber: next.number,
    lastCalledAt: calledAt,
  });

  analytics.logEvent({
    event_type: 'token_called',
    token_id: next.id,
    token_number: next.number,
    service: next.service,
    timestamp: calledAt,
    wait_duration_seconds: Math.round((calledAt - next.issuedAt) / 1000),
  }).catch(err => console.error('[analytics]', err.message));

  return { called: { ...next, status: TOKEN_STATUS.CALLED, calledAt } };
}

async function pauseQueue() {
  await refs.queueState().update({
    status: QUEUE_STATUS.PAUSED,
    pausedAt: Date.now(),
  });
  analytics.logEvent({ event_type: 'queue_paused', timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

async function resumeQueue() {
  await refs.queueState().update({
    status: QUEUE_STATUS.RUNNING,
    pausedAt: null,
  });
  analytics.logEvent({ event_type: 'queue_resumed', timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

/**
 * Admin: full active queue with health metrics. Used by the admin dashboard.
 */
async function getActiveQueue() {
  const [tokensSnap, stateSnap] = await Promise.all([
    refs.tokens().once('value'),
    refs.queueState().once('value'),
  ]);
  const all = Object.values(tokensSnap.val() || {});
  const waiting = all.filter(t => t.status === TOKEN_STATUS.WAITING)
                     .sort((a, b) => a.number - b.number);
  const called = all.find(t => t.status === TOKEN_STATUS.CALLED) || null;

  return {
    state: stateSnap.val(),
    nowServing: called,
    waiting,
    metrics: {
      totalIssued: all.length,
      waitingCount: waiting.length,
      servedCount: all.filter(t => t.status === TOKEN_STATUS.SERVED).length,
      expiredCount: all.filter(t => t.status === TOKEN_STATUS.EXPIRED).length,
      estimatedTotalWaitSeconds: waiting.length * config.queue.avgServiceTimeSeconds,
    },
  };
}

async function getWaitingCount() {
  const tokensSnap = await refs.tokens().once('value');
  const all = Object.values(tokensSnap.val() || {});
  return all.filter(t => t.status === TOKEN_STATUS.WAITING).length;
}

/**
 * Admin: full reset - useful for end-of-day cleanup or test environments.
 */
async function resetQueue() {
  await Promise.all([
    refs.tokens().remove(),
    refs.counter().set({ value: 0 }),
    refs.queueState().set({
      status: QUEUE_STATUS.RUNNING,
      currentTokenNumber: 0,
      lastCalledAt: null,
      pausedAt: null,
    }),
  ]);
  analytics.logEvent({ event_type: 'queue_reset', timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

module.exports = {
  TOKEN_STATUS,
  QUEUE_STATUS,
  ensureInitialized,
  issueToken,
  getTokenStatus,
  callNextToken,
  pauseQueue,
  resumeQueue,
  getActiveQueue,
  resetQueue,
};
