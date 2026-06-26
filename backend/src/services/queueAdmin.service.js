/**
 * Queue management service (v1.4.0).
 *
 * Lets administrators define their own queues/counters within an Industry Type
 * instead of being limited to the static industry profiles. Each queue's `key`
 * is what a token's `service` field references, so created queues flow straight
 * into the existing token engine with zero changes to issue/call/refer logic.
 *
 * Stored under the RTDB `queues` node. Industry profiles (frontend) remain as
 * sensible defaults/seeds for organisations that never define custom queues.
 */
const crypto = require('crypto');
const { refs } = require('../config/firebase');
const queueService = require('./queue.service');
const { emit, EVENTS } = require('../events/bus');

const KEY_RE = /^[a-z0-9_]{1,40}$/;
const PREFIX_RE = /^[A-Z0-9]{1,4}$/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function badRequest(msg) {
  return Object.assign(new Error(msg), { statusCode: 400 });
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function parseWorkingHours(wh) {
  if (wh === null || wh === undefined) return null;
  if (typeof wh !== 'object' || !wh.open || !wh.close) {
    throw badRequest('workingHours must be { open: "HH:MM", close: "HH:MM" } or null.');
  }
  if (!HHMM_RE.test(wh.open) || !HHMM_RE.test(wh.close)) {
    throw badRequest('workingHours open/close must be in HH:MM (24h) format.');
  }
  return { open: wh.open, close: wh.close };
}

function parseCapacity(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 0) throw badRequest('capacity must be a non-negative integer or null.');
  return n;
}

function parseAvgService(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  if (isNaN(n) || n <= 0) throw badRequest('avgServiceSeconds must be a positive integer or null.');
  return n;
}

function validateLabel(label) {
  const l = String(label || '').trim();
  if (l.length < 1 || l.length > 50) throw badRequest('label is required (1–50 characters).');
  return l;
}

function validatePrefix(prefix, fallback) {
  const p = String(prefix || fallback || '').trim().toUpperCase();
  if (!PREFIX_RE.test(p)) throw badRequest('prefix must be 1–4 uppercase letters/digits.');
  return p;
}

async function listQueues({ includeArchived = true } = {}) {
  const snap = await refs.queues().once('value');
  const all = Object.values(snap.val() || {});
  const rows = includeArchived ? all : all.filter(q => !q.archived);
  return rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

async function getActiveQueues() {
  return (await listQueues({ includeArchived: false })).filter(q => q.enabled !== false);
}

async function createQueue(input = {}) {
  const label = validateLabel(input.label);
  const key = input.key ? slugify(input.key) : slugify(label);
  if (!KEY_RE.test(key)) throw badRequest('Could not derive a valid key. Use letters, numbers, or underscores.');

  const existing = await listQueues();
  if (existing.some(q => q.key === key && !q.archived)) {
    throw Object.assign(new Error(`A queue with key "${key}" already exists.`), { statusCode: 409 });
  }

  const prefix = validatePrefix(input.prefix, label.slice(0, 1).toUpperCase());
  const now = Date.now();
  const record = {
    id: crypto.randomUUID(),
    key,
    label,
    prefix,
    enabled: input.enabled !== false,
    archived: false,
    capacity: parseCapacity(input.capacity),
    avgServiceSeconds: parseAvgService(input.avgServiceSeconds),
    workingHours: parseWorkingHours(input.workingHours),
    order: existing.length,
    createdAt: now,
    updatedAt: now,
  };
  await refs.queueDef(record.id).set(record);
  emit(EVENTS.QUEUE_CREATED, { id: record.id, key: record.key, label: record.label });
  return record;
}

async function getQueueOr404(id) {
  const snap = await refs.queueDef(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Queue not found.'), { statusCode: 404 });
  return snap.val();
}

async function updateQueue(id, patch = {}) {
  const current = await getQueueOr404(id);
  const updates = { updatedAt: Date.now() };

  if (patch.label !== undefined) updates.label = validateLabel(patch.label);
  if (patch.prefix !== undefined) updates.prefix = validatePrefix(patch.prefix, current.prefix);
  if (patch.enabled !== undefined) updates.enabled = !!patch.enabled;
  if (patch.capacity !== undefined) updates.capacity = parseCapacity(patch.capacity);
  if (patch.avgServiceSeconds !== undefined) updates.avgServiceSeconds = parseAvgService(patch.avgServiceSeconds);
  if (patch.workingHours !== undefined) updates.workingHours = parseWorkingHours(patch.workingHours);

  // `key` is intentionally immutable after creation: tokens reference it.
  await refs.queueDef(id).update(updates);
  return { ...current, ...updates };
}

async function setEnabled(id, enabled) {
  await getQueueOr404(id);
  await refs.queueDef(id).update({ enabled: !!enabled, updatedAt: Date.now() });
  return { id, enabled: !!enabled };
}

async function archiveQueue(id) {
  const queue = await getQueueOr404(id);
  await refs.queueDef(id).update({ archived: true, enabled: false, updatedAt: Date.now() });
  emit(EVENTS.QUEUE_ARCHIVED, { id, label: queue.label });
  return { id, archived: true };
}

async function activeTokenCountForKey(key) {
  const snap = await refs.tokens().once('value');
  const all = Object.values(snap.val() || {});
  return all.filter(t => t.service === key && (t.status === 'waiting' || t.status === 'called')).length;
}

async function deleteQueue(id) {
  const queue = await getQueueOr404(id);
  // Safeguard: never delete a queue that still has people in it.
  const active = await activeTokenCountForKey(queue.key);
  if (active > 0) {
    throw badRequest(`Cannot delete "${queue.label}" — ${active} active token(s) still in this queue. Archive it instead.`);
  }
  await refs.queueDef(id).remove();
  return { id, deleted: true };
}

async function reorderQueues(orderedIds = []) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw badRequest('orderedIds must be a non-empty array of queue ids.');
  }
  const updates = {};
  orderedIds.forEach((qid, index) => {
    updates[`${qid}/order`] = index;
    updates[`${qid}/updatedAt`] = Date.now();
  });
  await refs.queues().update(updates);
  return { reordered: orderedIds.length };
}

/** Single queue with its live snapshot (for the Manage screen). */
async function getQueueOverviewById(id) {
  const overview = await getQueuesOverview();
  const found = overview.find(q => q.id === id);
  if (!found) throw Object.assign(new Error('Queue not found.'), { statusCode: 404 });
  return found;
}

/** Per-queue live snapshot for the management dashboard (cards). */
async function getQueuesOverview() {
  const [queues, active] = await Promise.all([
    listQueues({ includeArchived: true }),
    queueService.getActiveQueue(),
  ]);
  const tokens = [...(active.waiting || []), ...Object.values(active.nowServing || {})];

  return queues.map(q => {
    const waiting = (active.waiting || []).filter(t => t.service === q.key);
    const serving = (active.nowServing || {})[q.key] || null;
    const avg = q.avgServiceSeconds || 180;
    return {
      ...q,
      waitingCount: waiting.length,
      nowServing: serving ? serving.number : null,
      estimatedWaitSeconds: waiting.length * avg,
      atCapacity: q.capacity != null && waiting.length >= q.capacity,
    };
  });
}

module.exports = {
  slugify,
  listQueues,
  getActiveQueues,
  getQueuesOverview,
  getQueueOverviewById,
  createQueue,
  updateQueue,
  setEnabled,
  archiveQueue,
  deleteQueue,
  reorderQueues,
};
