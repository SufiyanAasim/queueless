/**
 * Persistent AI conversation store (v1.4.5 Phase 5).
 *
 * Per-user AI chat history backed by RTDB and served only via the JWT API.
 * Powers the AI workspace: history, rename, pin, delete, export.
 */
const crypto = require('crypto');
const { refs } = require('../config/firebase');

function notFound() { return Object.assign(new Error('Conversation not found.'), { statusCode: 404 }); }

async function listConversations(username) {
  const snap = await refs.aiConversations(username).once('value');
  const all = snap.val() || {};
  return Object.values(all)
    .map(c => c.meta)
    .filter(Boolean)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
}

async function createConversation(username, title) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const meta = { id, title: String(title || 'New chat').slice(0, 80), pinned: false, createdAt: now, updatedAt: now };
  await refs.aiConversationMeta(username, id).set(meta);
  return meta;
}

async function getMeta(username, cid) {
  const snap = await refs.aiConversationMeta(username, cid).once('value');
  if (!snap.exists()) throw notFound();
  return snap.val();
}

async function getConversation(username, cid) {
  const meta = await getMeta(username, cid);
  const msgs = await refs.aiConversationMessages(username, cid).once('value');
  const messages = Object.values(msgs.val() || {}).sort((a, b) => a.createdAt - b.createdAt);
  return { ...meta, messages };
}

async function addTurn(username, cid, role, content) {
  const meta = await getMeta(username, cid);
  const mid = crypto.randomUUID();
  const now = Date.now();
  await refs.aiConversationMessage(username, cid, mid).set({ id: mid, role, content, createdAt: now });
  const update = { updatedAt: now };
  if (role === 'user' && (!meta.title || meta.title === 'New chat')) {
    update.title = String(content).slice(0, 60);
  }
  await refs.aiConversationMeta(username, cid).update(update);
  return { id: mid, role, content, createdAt: now };
}

async function updateConversation(username, cid, { title, pinned }) {
  await getMeta(username, cid);
  const update = { updatedAt: Date.now() };
  if (title !== undefined) update.title = String(title).trim().slice(0, 80) || 'Untitled';
  if (pinned !== undefined) update.pinned = !!pinned;
  await refs.aiConversationMeta(username, cid).update(update);
  return { id: cid, ...update };
}

async function deleteConversation(username, cid) {
  await getMeta(username, cid);
  await refs.aiConversation(username, cid).remove();
  return { id: cid, deleted: true };
}

module.exports = {
  listConversations, createConversation, getConversation, addTurn,
  updateConversation, deleteConversation,
};
