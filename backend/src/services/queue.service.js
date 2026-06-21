const crypto = require('crypto');
const { refs, db } = require('../config/firebase');
const config = require('../config/env');
const analytics = require('./analytics.service');
const emailService = require('./email.service');

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

const TOKEN_PRIORITY = Object.freeze({
  NORMAL: 'normal',
  PRIORITY: 'priority',
});

async function ensureInitialized() {
  const stateSnap = await refs.queueState().once('value');
  if (!stateSnap.exists()) {
    await refs.queueState().set({
      status: QUEUE_STATUS.RUNNING,
      currentTokenNumber: 0,
      lastCalledAt: null,
      pausedAt: null,
      autoMode: { enabled: false, intervalSeconds: 0 },
    });
  }
  const counterSnap = await refs.counter().once('value');
  if (!counterSnap.exists()) {
    await refs.counter().set({ value: 0 });
  }
  // Ensure app config exists
  const cfgSnap = await refs.appConfig().once('value');
  if (!cfgSnap.exists()) {
    await refs.appConfig().set({ industry: 'general', orgName: 'QueueLess' });
  }
}

async function issueToken({ service = 'general', email = null, priority = 'normal' } = {}) {
  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val();
  const isPriorityToken = priority === 'priority';
  // Priority tokens bypass the paused state — they must always be admitted.
  if (state.status === QUEUE_STATUS.PAUSED && !isPriorityToken) {
    const err = new Error('Queue is currently paused. Please try again later.');
    err.statusCode = 423;
    throw err;
  }

  // Atomic counter increment — guarantees distinct token numbers under concurrent load.
  const txResult = await refs.counter().transaction((current) => {
    if (current === null) return { value: 1 };
    return { value: (current.value || 0) + 1 };
  });
  if (!txResult.committed) throw new Error('Failed to allocate token number. Please retry.');
  const number = txResult.snapshot.val().value;

  const id = crypto.randomUUID();
  const issuedAt = Date.now();
  const tokenRecord = {
    id,
    number,
    service,
    priority: priority === 'priority' ? TOKEN_PRIORITY.PRIORITY : TOKEN_PRIORITY.NORMAL,
    status: TOKEN_STATUS.WAITING,
    issuedAt,
    calledAt: null,
    servedAt: null,
    expiresAt: issuedAt + (config.queue.tokenExpirySeconds * 1000),
  };
  await refs.token(id).set(tokenRecord);

  analytics.logEvent({
    event_type: 'token_issued',
    token_id: id,
    token_number: number,
    service,
    timestamp: issuedAt,
    queue_length: await getWaitingCount(),
  }).catch(err => console.error('[analytics] log failure (non-fatal):', err.message));

  if (email) {
    const trackingUrl = `${config.frontendUrl}/token/${id}`;
    emailService.sendTokenEmail({ to: email, token: tokenRecord, trackingUrl })
      .catch(err => console.error('[email] send failure (non-fatal):', err.message));
  }

  return tokenRecord;
}

async function getTokenStatus(tokenId) {
  const tokenSnap = await refs.token(tokenId).once('value');
  if (!tokenSnap.exists()) {
    const err = new Error('Token not found.');
    err.statusCode = 404;
    throw err;
  }
  const token = tokenSnap.val();

  // Firebase RTDB cannot filter by two fields simultaneously, so we filter in JS.
  const tokensSnap = await refs.tokens().once('value');
  const all = tokensSnap.val() || {};
  const ahead = Object.values(all).filter(
    t => t.status === TOKEN_STATUS.WAITING && t.service === token.service &&
         (t.number < token.number || (t.priority === 'priority' && token.priority !== 'priority'))
  ).length;

  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val();

  const analyticsData = await analytics.getTrafficStats();
  const dynamicWaitSeconds = analyticsData.avgWaitSeconds || config.queue.avgServiceTimeSeconds;

  return {
    ...token,
    positionInQueue: token.status === TOKEN_STATUS.WAITING ? ahead + 1 : 0,
    peopleAhead: token.status === TOKEN_STATUS.WAITING ? ahead : 0,
    estimatedWaitSeconds: ahead * dynamicWaitSeconds,
    queueStatus: state.status,
  };
}

function sortByPriorityThenNumber(a, b) {
  // Priority tokens go before normal; within same priority level, FIFO by number.
  if (a.priority === 'priority' && b.priority !== 'priority') return -1;
  if (a.priority !== 'priority' && b.priority === 'priority') return 1;
  return a.number - b.number;
}

async function callNextToken(service = 'general') {
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

  // Global priority enforcement: if ANY priority token is waiting across ANY service,
  // block calling a regular token. Regular queues must wait until all priority tokens
  // have been served.
  const anyPriorityWaiting = tokenList.some(
    t => t.status === TOKEN_STATUS.WAITING && t.priority === TOKEN_PRIORITY.PRIORITY
  );

  const previouslyCalled = tokenList.find(t => t.status === TOKEN_STATUS.CALLED && t.service === service);
  const waitingForService = tokenList
    .filter(t => t.status === TOKEN_STATUS.WAITING && t.service === service)
    .sort(sortByPriorityThenNumber);

  const next = waitingForService[0];

  // If priority tokens exist globally and the next token for this service is NOT priority, block it.
  if (anyPriorityWaiting && next && next.priority !== TOKEN_PRIORITY.PRIORITY) {
    const err = new Error('Priority customers are waiting. Please serve all priority tokens first before calling regular queue.');
    err.statusCode = 409;
    err.code = 'PRIORITY_BLOCKING';
    throw err;
  }

  const updates = {};
  let servedAt = null;

  if (previouslyCalled) {
    servedAt = Date.now();
    updates[`tokens/${previouslyCalled.id}/status`] = TOKEN_STATUS.SERVED;
    updates[`tokens/${previouslyCalled.id}/servedAt`] = servedAt;
  }

  if (!next) {
    if (Object.keys(updates).length > 0) {
      await db.ref('queue').update(updates);
      analytics.logEvent({
        event_type: 'token_served',
        token_id: previouslyCalled.id,
        token_number: previouslyCalled.number,
        service: previouslyCalled.service,
        timestamp: servedAt,
        service_duration_seconds: Math.round((servedAt - previouslyCalled.calledAt) / 1000),
      }).catch(err => console.error('[analytics]', err.message));
    }
    return { called: null, message: `No tokens waiting for ${service}.` };
  }

  const calledAt = Date.now();
  updates[`tokens/${next.id}/status`] = TOKEN_STATUS.CALLED;
  updates[`tokens/${next.id}/calledAt`] = calledAt;
  updates[`state/currentTokenNumber`] = next.number;
  updates[`state/lastCalledAt`] = calledAt;

  await db.ref('queue').update(updates);

  if (previouslyCalled) {
    analytics.logEvent({
      event_type: 'token_served',
      token_id: previouslyCalled.id,
      token_number: previouslyCalled.number,
      service: previouslyCalled.service,
      timestamp: servedAt,
      service_duration_seconds: Math.round((servedAt - previouslyCalled.calledAt) / 1000),
    }).catch(err => console.error('[analytics]', err.message));
  }

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

async function callNextPriorityToken() {
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

  const next = tokenList
    .filter(t => t.status === TOKEN_STATUS.WAITING && t.priority === TOKEN_PRIORITY.PRIORITY)
    .sort((a, b) => a.number - b.number)[0];

  if (!next) return { called: null, message: 'No priority tokens waiting.' };

  // Mark previously called token for this service as served
  const previouslyCalled = tokenList.find(t => t.status === TOKEN_STATUS.CALLED && t.service === next.service);
  const updates = {};
  let servedAt = null;

  if (previouslyCalled) {
    servedAt = Date.now();
    updates[`tokens/${previouslyCalled.id}/status`] = TOKEN_STATUS.SERVED;
    updates[`tokens/${previouslyCalled.id}/servedAt`] = servedAt;
  }

  const calledAt = Date.now();
  updates[`tokens/${next.id}/status`] = TOKEN_STATUS.CALLED;
  updates[`tokens/${next.id}/calledAt`] = calledAt;
  updates[`state/currentTokenNumber`] = next.number;
  updates[`state/lastCalledAt`] = calledAt;

  await db.ref('queue').update(updates);

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

async function skipToken(tokenId) {
  const tokenSnap = await refs.token(tokenId).once('value');
  if (!tokenSnap.exists()) {
    throw Object.assign(new Error('Token not found.'), { statusCode: 404 });
  }
  const token = tokenSnap.val();
  if (token.status !== 'called' && token.status !== 'waiting') {
    throw Object.assign(new Error('Only waiting or called tokens can be skipped.'), { statusCode: 400 });
  }
  const now = Date.now();
  await refs.token(tokenId).update({ status: TOKEN_STATUS.EXPIRED, expiredAt: now, skippedAt: now });
  analytics.logEvent({
    event_type: 'token_skipped',
    token_id: tokenId,
    token_number: token.number,
    service: token.service,
    timestamp: now,
  }).catch(() => {});
  return { skipped: token };
}

async function pauseQueue() {
  await refs.queueState().update({ status: QUEUE_STATUS.PAUSED, pausedAt: Date.now() });
  analytics.logEvent({ event_type: 'queue_paused', timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

async function resumeQueue() {
  await refs.queueState().update({ status: QUEUE_STATUS.RUNNING, pausedAt: null });
  analytics.logEvent({ event_type: 'queue_resumed', timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

async function getActiveQueue() {
  const [tokensSnap, stateSnap] = await Promise.all([
    refs.tokens().once('value'),
    refs.queueState().once('value'),
  ]);
  const all = Object.values(tokensSnap.val() || {});
  const waiting = all.filter(t => t.status === TOKEN_STATUS.WAITING).sort(sortByPriorityThenNumber);
  const calledTokens = all.filter(t => t.status === TOKEN_STATUS.CALLED);

  // Build dynamic nowServing map keyed by service
  const nowServing = {};
  calledTokens.forEach(t => { nowServing[t.service] = t; });

  return {
    state: stateSnap.val(),
    nowServing,
    waiting,
    metrics: {
      totalIssued: all.length,
      waitingCount: waiting.length,
      servedCount: all.filter(t => t.status === TOKEN_STATUS.SERVED).length,
      expiredCount: all.filter(t => t.status === TOKEN_STATUS.EXPIRED).length,
      priorityWaiting: waiting.filter(t => t.priority === 'priority').length,
      estimatedTotalWaitSeconds: waiting.length * config.queue.avgServiceTimeSeconds,
    },
  };
}

async function getWaitingCount() {
  const tokensSnap = await refs.tokens().once('value');
  const all = Object.values(tokensSnap.val() || {});
  return all.filter(t => t.status === TOKEN_STATUS.WAITING).length;
}

async function resetQueue() {
  await Promise.all([
    refs.tokens().remove(),
    refs.counter().set({ value: 0 }),
    refs.queueState().set({
      status: QUEUE_STATUS.RUNNING,
      currentTokenNumber: 0,
      lastCalledAt: null,
      pausedAt: null,
      autoMode: { enabled: false, intervalSeconds: 0 },
    }),
  ]);
  analytics.logEvent({ event_type: 'queue_reset', timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

module.exports = {
  TOKEN_STATUS, QUEUE_STATUS, TOKEN_PRIORITY,
  ensureInitialized,
  issueToken, getTokenStatus,
  callNextToken, callNextPriorityToken, skipToken,
  pauseQueue, resumeQueue,
  getActiveQueue, resetQueue,
};
