const crypto = require('crypto');
const { refs, db } = require('../config/firebase');
const config = require('../config/env');
const analytics = require('./analytics.service');
const emailService = require('./email.service');
const { emit, EVENTS } = require('../events/bus');

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
      pausedServices: [],
      autoMode: { enabled: false, intervalSeconds: 0 },
    });
  }
  const counterSnap = await refs.counter().once('value');
  if (!counterSnap.exists()) {
    await refs.counter().set({ value: 0 });
  }
  const cfgSnap = await refs.appConfig().once('value');
  if (!cfgSnap.exists()) {
    await refs.appConfig().set({ industry: 'general', orgName: 'QueueLess' });
  }
}

async function pauseService(service) {
  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val() || {};
  const paused = Array.isArray(state.pausedServices) ? state.pausedServices : [];
  if (!paused.includes(service)) {
    paused.push(service);
    await refs.queueState().update({ pausedServices: paused });
  }
  analytics.logEvent({ event_type: 'service_paused', service, timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

async function resumeService(service) {
  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val() || {};
  const paused = Array.isArray(state.pausedServices) ? state.pausedServices : [];
  const updated = paused.filter(s => s !== service);
  await refs.queueState().update({ pausedServices: updated });
  analytics.logEvent({ event_type: 'service_resumed', service, timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

async function issueToken({ service = 'general', email = null, priority = 'normal', groupSize = 1, patientName = null, note = null } = {}) {
  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val();
  const isPriorityToken = priority === 'priority';

  if (state.status === QUEUE_STATUS.PAUSED && !isPriorityToken) {
    const err = new Error('Queue is currently paused. Please try again later.');
    err.statusCode = 423;
    throw err;
  }

  if (!isPriorityToken) {
    const pausedServices = Array.isArray(state.pausedServices) ? state.pausedServices : [];
    if (pausedServices.includes(service)) {
      throw Object.assign(
        new Error(`Service "${service}" is currently paused. Please try again later.`),
        { statusCode: 423 }
      );
    }
  }

  const parsedGroupSize = parseInt(groupSize, 10);
  const safeGroupSize = (!isNaN(parsedGroupSize) && parsedGroupSize >= 1 && parsedGroupSize <= 10)
    ? parsedGroupSize
    : 1;

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
    groupSize: safeGroupSize,
    patientName: patientName ? String(patientName).trim().slice(0, 100) : null,
    note: note ? String(note).trim().slice(0, 500) : null,
    referred: false,
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
  analytics.upsertTokenRecord(tokenRecord).catch(() => {});

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

  const tokensSnap = await refs.tokens().once('value');
  const all = tokensSnap.val() || {};
  const ahead = Object.values(all).filter(
    t => t.status === TOKEN_STATUS.WAITING && t.service === token.service &&
         (t.number < token.number || (isPriorityTier(t) && !isPriorityTier(token)))
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

// A token is "priority tier" if it was issued as priority OR it was referred in
// from another counter. Referred patients have already waited once, so they slot
// in ahead of fresh walk-ins at the destination counter.
function isPriorityTier(t) {
  return t.priority === TOKEN_PRIORITY.PRIORITY || t.referred === true;
}

function sortByPriorityThenNumber(a, b) {
  const ap = isPriorityTier(a);
  const bp = isPriorityTier(b);
  if (ap && !bp) return -1;
  if (!ap && bp) return 1;
  return a.number - b.number;
}

async function callNextToken(service = 'general', staffUsername = null) {
  const stateSnap = await refs.queueState().once('value');
  const state = stateSnap.val();
  if (state.status === QUEUE_STATUS.PAUSED) {
    const err = new Error('Cannot advance queue while paused. Resume first.');
    err.statusCode = 423;
    throw err;
  }

  const pausedServices = Array.isArray(state.pausedServices) ? state.pausedServices : [];
  if (pausedServices.includes(service)) {
    throw Object.assign(
      new Error(`Service "${service}" is currently paused. Resume it before calling tokens.`),
      { statusCode: 423 }
    );
  }

  const tokensSnap = await refs.tokens().once('value');
  const all = tokensSnap.val() || {};
  const tokenList = Object.values(all);

  const anyPriorityWaiting = tokenList.some(
    t => t.status === TOKEN_STATUS.WAITING && isPriorityTier(t)
  );

  const previouslyCalled = tokenList.find(t => t.status === TOKEN_STATUS.CALLED && t.service === service);
  const waitingForService = tokenList
    .filter(t => t.status === TOKEN_STATUS.WAITING && t.service === service)
    .sort(sortByPriorityThenNumber);

  const next = waitingForService[0];

  if (anyPriorityWaiting && next && !isPriorityTier(next)) {
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
        staff_username: staffUsername || null,
      }).catch(err => console.error('[analytics]', err.message));
      analytics.upsertTokenRecord({ ...previouslyCalled, status: TOKEN_STATUS.SERVED, servedAt }).catch(() => {});
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
      staff_username: staffUsername || null,
    }).catch(err => console.error('[analytics]', err.message));
    analytics.upsertTokenRecord({ ...previouslyCalled, status: TOKEN_STATUS.SERVED, servedAt }).catch(() => {});
  }

  analytics.logEvent({
    event_type: 'token_called',
    token_id: next.id,
    token_number: next.number,
    service: next.service,
    timestamp: calledAt,
    wait_duration_seconds: Math.round((calledAt - next.issuedAt) / 1000),
    staff_username: staffUsername || null,
  }).catch(err => console.error('[analytics]', err.message));
  analytics.upsertTokenRecord({ ...next, status: TOKEN_STATUS.CALLED, calledAt }).catch(() => {});

  return { called: { ...next, status: TOKEN_STATUS.CALLED, calledAt } };
}

async function callNextPriorityToken(staffUsername = null) {
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
    .filter(t => t.status === TOKEN_STATUS.WAITING && isPriorityTier(t))
    .sort((a, b) => a.number - b.number)[0];

  if (!next) return { called: null, message: 'No priority tokens waiting.' };

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

  if (previouslyCalled) {
    analytics.logEvent({
      event_type: 'token_served',
      token_id: previouslyCalled.id,
      token_number: previouslyCalled.number,
      service: previouslyCalled.service,
      timestamp: servedAt,
      service_duration_seconds: Math.round((servedAt - previouslyCalled.calledAt) / 1000),
      staff_username: staffUsername || null,
    }).catch(err => console.error('[analytics]', err.message));
    analytics.upsertTokenRecord({ ...previouslyCalled, status: TOKEN_STATUS.SERVED, servedAt }).catch(() => {});
  }

  analytics.logEvent({
    event_type: 'token_called',
    token_id: next.id,
    token_number: next.number,
    service: next.service,
    timestamp: calledAt,
    wait_duration_seconds: Math.round((calledAt - next.issuedAt) / 1000),
    staff_username: staffUsername || null,
  }).catch(err => console.error('[analytics]', err.message));
  analytics.upsertTokenRecord({ ...next, status: TOKEN_STATUS.CALLED, calledAt }).catch(() => {});

  return { called: { ...next, status: TOKEN_STATUS.CALLED, calledAt } };
}

async function skipToken(tokenId) {
  const tokenSnap = await refs.token(tokenId).once('value');
  if (!tokenSnap.exists()) {
    throw Object.assign(new Error('Token not found.'), { statusCode: 404 });
  }
  const token = tokenSnap.val();
  if (token.status !== TOKEN_STATUS.CALLED && token.status !== TOKEN_STATUS.WAITING) {
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
  analytics.upsertTokenRecord({ ...token, status: TOKEN_STATUS.EXPIRED, expiredAt: now, skippedAt: now }).catch(() => {});
  return { skipped: token };
}

/**
 * Refer (transfer) an active token to a different counter/service.
 *
 * Use case: a hospital patient takes a token at the OPD counter; the OPD doctor
 * decides they need the eye specialist. Referring the token moves it into the eye
 * specialist's queue (merged with that counter's waiting list), keeping the SAME
 * token number so the patient is traceable end-to-end. The token is flagged
 * `referred` so it is served ahead of fresh walk-ins, and its expiry clock is
 * reset so an in-facility patient is never auto-expired mid-transfer.
 */
async function referToken(tokenId, { toService, reason = null, byStaff = null } = {}) {
  const target = (toService || '').toString().trim();
  if (!target) {
    throw Object.assign(new Error('Destination service is required.'), { statusCode: 400 });
  }

  const tokenSnap = await refs.token(tokenId).once('value');
  if (!tokenSnap.exists()) {
    throw Object.assign(new Error('Token not found.'), { statusCode: 404 });
  }
  const token = tokenSnap.val();

  if (token.status !== TOKEN_STATUS.CALLED && token.status !== TOKEN_STATUS.WAITING) {
    throw Object.assign(
      new Error('Only an active (waiting or being-served) token can be referred.'),
      { statusCode: 400 }
    );
  }
  if (token.service === target) {
    throw Object.assign(new Error('Token is already at that counter.'), { statusCode: 400 });
  }

  const now = Date.now();
  const entry = {
    fromService: token.service,
    toService: target,
    reason: reason ? String(reason).trim().slice(0, 300) : null,
    byStaff: byStaff || null,
    at: now,
  };
  const history = Array.isArray(token.referralHistory) ? token.referralHistory : [];
  history.push(entry);

  const patch = {
    service: target,
    status: TOKEN_STATUS.WAITING,
    referred: true,
    referralReason: entry.reason,
    referralHistory: history,
    referredAt: now,
    calledAt: null,
    servedAt: null,
    // Fresh expiry window so a referred (physically present) patient is never swept.
    expiresAt: now + (config.queue.tokenExpirySeconds * 1000),
  };
  await refs.token(tokenId).update(patch);

  const merged = { ...token, ...patch };

  analytics.logEvent({
    event_type: 'token_referred',
    token_id: tokenId,
    token_number: token.number,
    service: target,
    from_service: entry.fromService,
    timestamp: now,
    staff_username: byStaff || null,
  }).catch(err => console.error('[analytics]', err.message));
  analytics.upsertTokenRecord(merged).catch(() => {});
  emit(EVENTS.TOKEN_REFERRED, { number: token.number, from: entry.fromService, to: target });

  return { referred: merged, from: entry.fromService, to: target };
}

async function pauseQueue() {
  const now = Date.now();
  await refs.queueState().update({ status: QUEUE_STATUS.PAUSED, pausedAt: now });
  analytics.logEvent({ event_type: 'queue_paused', timestamp: now })
    .catch(err => console.error('[analytics]', err.message));
}

async function resumeQueue() {
  const now = Date.now();
  await refs.queueState().update({ status: QUEUE_STATUS.RUNNING, pausedAt: null });
  analytics.logEvent({ event_type: 'queue_resumed', timestamp: now })
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

  const nowServing = {};
  calledTokens.forEach(t => { nowServing[t.service] = t; });

  const state = stateSnap.val();

  return {
    state: {
      ...state,
      pausedServices: Array.isArray(state.pausedServices) ? state.pausedServices : [],
    },
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
      pausedServices: [],
      autoMode: { enabled: false, intervalSeconds: 0 },
    }),
  ]);
  analytics.logEvent({ event_type: 'queue_reset', timestamp: Date.now() })
    .catch(err => console.error('[analytics]', err.message));
}

async function requeueToken(tokenId) {
  const tokenSnap = await refs.token(tokenId).once('value');
  if (!tokenSnap.exists()) {
    throw Object.assign(new Error('Token not found.'), { statusCode: 404 });
  }
  const token = tokenSnap.val();

  if (token.status !== TOKEN_STATUS.EXPIRED) {
    throw Object.assign(
      new Error('Only expired tokens can be re-queued.'),
      { statusCode: 400 }
    );
  }

  const twoHoursMs = 2 * 60 * 60 * 1000;
  if (Date.now() - token.issuedAt > twoHoursMs) {
    throw Object.assign(
      new Error('Token was issued more than 2 hours ago and cannot be re-queued.'),
      { statusCode: 400 }
    );
  }

  const newToken = await issueToken({
    service: token.service,
    priority: token.priority || 'normal',
    groupSize: token.groupSize || 1,
    patientName: token.patientName || null,
  });

  analytics.logEvent({
    event_type: 'token_requeued',
    token_id: newToken.id,
    token_number: newToken.number,
    service: newToken.service,
    timestamp: Date.now(),
    original_token_id: tokenId,
  }).catch(err => console.error('[analytics]', err.message));

  return newToken;
}

module.exports = {
  TOKEN_STATUS, QUEUE_STATUS, TOKEN_PRIORITY,
  ensureInitialized,
  issueToken, getTokenStatus,
  callNextToken, callNextPriorityToken, skipToken,
  referToken,
  pauseQueue, resumeQueue,
  pauseService, resumeService,
  requeueToken,
  getActiveQueue, resetQueue,
};
