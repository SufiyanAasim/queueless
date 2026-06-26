/**
 * Internal messaging (v1.4.5 Phase 2).
 *
 * Security model (no Firebase Auth in this app): message CONTENT is stored in
 * RTDB but is **never client-readable** — it is served only through the JWT API
 * after a server-side membership check, written via the Admin SDK. Real-time is
 * delivered by bumping a content-free `messageSignals/$id` node that clients may
 * subscribe to; on a bump they refetch via the authorized API. This keeps the
 * existing architecture and security intact while enabling 1:1 and group chat.
 */
const crypto = require('crypto');
const { refs } = require('../config/firebase');
const { emit, EVENTS } = require('../events/bus');

const MAX_LEN = 2000;
// Bounded inline attachments (kept small and served via the JWT API like all
// message content). Large-file object storage is a future enhancement.
const ATTACH_MAX_BYTES = 256 * 1024;
const ATTACH_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];

function badRequest(msg) { return Object.assign(new Error(msg), { statusCode: 400 }); }
function forbidden(msg) { return Object.assign(new Error(msg || 'Not a member of this conversation.'), { statusCode: 403 }); }

function isMember(meta, username) {
  return !!(meta && meta.members && meta.members[username]);
}

function validateAttachment(a) {
  if (!a) return null;
  const { name, type, dataUrl } = a;
  if (!type || !ATTACH_TYPES.includes(type)) throw badRequest('Unsupported attachment type. Allowed: PNG, JPEG, GIF, WebP, PDF.');
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) throw badRequest('Invalid attachment payload.');
  const b64 = dataUrl.split(',')[1] || '';
  const bytes = Math.floor(b64.length * 0.75);
  if (bytes <= 0) throw badRequest('Empty attachment.');
  if (bytes > ATTACH_MAX_BYTES) throw badRequest('Attachment too large (max 256 KB). Share a link for larger files.');
  return { name: String(name || 'file').slice(0, 120), type, size: bytes, dataUrl };
}

async function getMeta(id) {
  const snap = await refs.conversationMeta(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  return snap.val();
}

async function createConversation({ type = 'group', name = null, members = [], creator }) {
  const memberSet = {};
  [creator, ...(Array.isArray(members) ? members : [])].forEach(u => { if (u) memberSet[String(u)] = true; });
  const keys = Object.keys(memberSet);

  if (keys.length < 2) throw badRequest('A conversation needs at least two members.');
  if (type === 'direct' && keys.length !== 2) throw badRequest('A direct chat must have exactly two members.');
  if (type === 'group' && !String(name || '').trim()) throw badRequest('A group needs a name.');

  const id = crypto.randomUUID();
  const meta = {
    id,
    type: type === 'direct' ? 'direct' : 'group',
    name: type === 'direct' ? null : String(name).trim().slice(0, 80),
    members: memberSet,
    createdBy: creator,
    createdAt: Date.now(),
  };
  await refs.conversationMeta(id).set(meta);
  await refs.messageSignal(id).set({ updatedAt: Date.now() });
  return { ...meta, members: keys };
}

async function listFor(username) {
  const snap = await refs.conversations().once('value');
  const all = snap.val() || {};
  const out = [];
  for (const conv of Object.values(all)) {
    const meta = conv.meta;
    if (!isMember(meta, username)) continue;
    const msgs = conv.messages ? Object.values(conv.messages) : [];
    const sorted = msgs.sort((a, b) => a.createdAt - b.createdAt);
    const last = sorted.slice(-1)[0] || null;
    const reads = conv.reads || {};
    const lastRead = reads[username] || 0;
    const unread = sorted.filter(m => m.createdAt > lastRead && m.sender !== username).length;
    out.push({
      id: meta.id,
      type: meta.type,
      name: meta.name,
      members: Object.keys(meta.members),
      createdAt: meta.createdAt,
      reads,
      unread,
      lastMessage: last ? { text: last.text || (last.attachment ? `📎 ${last.attachment.name}` : ''), sender: last.sender, createdAt: last.createdAt } : null,
    });
  }
  return out.sort((a, b) => (b.lastMessage?.createdAt || b.createdAt) - (a.lastMessage?.createdAt || a.createdAt));
}

async function getMessages(id, username) {
  const meta = await getMeta(id);
  if (!isMember(meta, username)) throw forbidden();
  const snap = await refs.conversationMessages(id).once('value');
  return Object.values(snap.val() || {}).sort((a, b) => a.createdAt - b.createdAt);
}

async function sendMessage(id, sender, senderName, text, attachment) {
  const body = String(text || '').trim();
  const att = validateAttachment(attachment);
  if (!body && !att) throw badRequest('Message text or an attachment is required.');
  if (body.length > MAX_LEN) throw badRequest(`Message must be ${MAX_LEN} characters or fewer.`);

  const meta = await getMeta(id);
  if (!isMember(meta, sender)) throw forbidden();

  const mid = crypto.randomUUID();
  const message = { id: mid, sender, senderName: senderName || sender, text: body, createdAt: Date.now() };
  if (att) message.attachment = att;
  await refs.conversationMessage(id, mid).set(message);
  // The sender has implicitly read up to their own message.
  await refs.conversationRead(id, sender).set(message.createdAt);
  // Content-free real-time trigger (safe to be client-readable).
  await refs.messageSignal(id).set({ updatedAt: message.createdAt });
  emit(EVENTS.MESSAGE_SENT, {
    conversationId: id,
    sender,
    senderName: message.senderName,
    text: message.text,
    members: Object.keys(meta.members || {}),
  });
  return message;
}

async function markConversationRead(id, username) {
  const meta = await getMeta(id);
  if (!isMember(meta, username)) throw forbidden();
  const now = Date.now();
  await refs.conversationRead(id, username).set(now);
  // Bump the signal so other members' "seen" state updates in real time.
  await refs.messageSignal(id).set({ updatedAt: now });
  return { ok: true, readAt: now };
}

async function toggleReaction(id, mid, username, emoji) {
  const e = String(emoji || '').trim();
  if (!e || e.length > 8) throw badRequest('Invalid reaction.');
  const meta = await getMeta(id);
  if (!isMember(meta, username)) throw forbidden();

  const snap = await refs.conversationMessage(id, mid).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Message not found.'), { statusCode: 404 });

  const msg = snap.val();
  const reactions = msg.reactions || {};
  const users = reactions[e] || {};
  if (users[username]) delete users[username];
  else users[username] = true;
  if (Object.keys(users).length) reactions[e] = users;
  else delete reactions[e];

  await refs.conversationMessage(id, mid).update({ reactions });
  await refs.messageSignal(id).set({ updatedAt: Date.now() });
  return { messageId: mid, reactions };
}

module.exports = {
  createConversation, listFor, getMessages, sendMessage,
  markConversationRead, toggleReaction, getMeta, isMember,
};
