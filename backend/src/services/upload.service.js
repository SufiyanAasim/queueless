/**
 * Shared files (v1.4.5 Phase 5c) — Spark-plan friendly.
 *
 * Files are stored in the Realtime Database via the Admin SDK (no Cloud Storage /
 * Blaze plan required), with metadata indexed separately so listings never pull
 * the blobs. Content is served only through the JWT API. Bounded to 2 MB/file.
 */
const crypto = require('crypto');
const { refs } = require('../config/firebase');

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf', 'text/csv', 'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', 'application/x-zip-compressed',
];

function badRequest(msg) { return Object.assign(new Error(msg), { statusCode: 400 }); }

function validate({ name, type, dataUrl }) {
  if (!type || !ALLOWED_TYPES.includes(type)) {
    throw badRequest('Unsupported file type. Allowed: images, PDF, CSV, Excel, Word, ZIP, text.');
  }
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw badRequest('Invalid file payload.');
  }
  const b64 = dataUrl.split(',')[1] || '';
  const bytes = Math.floor(b64.length * 0.75);
  if (bytes <= 0) throw badRequest('Empty file.');
  if (bytes > MAX_BYTES) throw badRequest('File too large (max 2 MB on the free plan).');
  return { name: String(name || 'file').slice(0, 160), type, size: bytes };
}

async function createUpload({ name, type, dataUrl, owner }) {
  const meta = validate({ name, type, dataUrl });
  const id = crypto.randomUUID();
  const now = Date.now();
  const record = { id, ...meta, owner, createdAt: now, dataUrl };
  await refs.upload(id).set(record);
  await refs.uploadIndexEntry(owner, id).set({ id, name: meta.name, type: meta.type, size: meta.size, createdAt: now });
  const { dataUrl: _omit, ...summary } = record;
  return summary;
}

async function listFor(owner) {
  const snap = await refs.uploadIndex(owner).once('value');
  return Object.values(snap.val() || {}).sort((a, b) => b.createdAt - a.createdAt);
}

// Any authenticated admin/staff can download by id (internal sharing capability).
async function getUpload(id) {
  const snap = await refs.upload(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('File not found.'), { statusCode: 404 });
  return snap.val();
}

async function deleteUpload(id, requester) {
  const snap = await refs.upload(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('File not found.'), { statusCode: 404 });
  if (snap.val().owner !== requester) {
    throw Object.assign(new Error('Only the uploader can delete this file.'), { statusCode: 403 });
  }
  await refs.upload(id).remove();
  await refs.uploadIndexEntry(requester, id).remove();
  return { id, deleted: true };
}

module.exports = { createUpload, listFor, getUpload, deleteUpload, MAX_BYTES, ALLOWED_TYPES };
