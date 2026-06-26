const messaging = require('../services/messaging.service');
const staffService = require('../services/staff.service');
const { refs } = require('../config/firebase');

async function create(req, res) {
  const { type, name, members } = req.body || {};
  const conv = await messaging.createConversation({ type, name, members, creator: req.user.sub });
  res.status(201).json(conv);
}

async function list(req, res) {
  res.json(await messaging.listFor(req.user.sub));
}

async function messages(req, res) {
  res.json(await messaging.getMessages(req.params.id, req.user.sub));
}

async function send(req, res) {
  const msg = await messaging.sendMessage(
    req.params.id,
    req.user.sub,
    req.user.displayName || req.user.sub,
    req.body?.text,
    req.body?.attachment,
  );
  res.status(201).json(msg);
}

async function markRead(req, res) {
  res.json(await messaging.markConversationRead(req.params.id, req.user.sub));
}

async function react(req, res) {
  res.json(await messaging.toggleReaction(req.params.id, req.params.mid, req.user.sub, req.body?.emoji));
}

// Team directory — admins + staff, for starting chats / building groups.
async function directory(req, res) {
  const [adminsSnap, staff] = await Promise.all([
    refs.admins().once('value'),
    staffService.listStaff(),
  ]);
  const admins = Object.values(adminsSnap.val() || {}).map(a => ({
    username: a.username,
    displayName: a.displayName || a.username,
    role: 'admin',
  }));
  const staffList = (staff || []).map(s => ({
    username: s.username,
    displayName: s.displayName || s.username,
    role: 'staff',
    online: !!s.online,
  }));
  res.json([...admins, ...staffList].filter(u => u.username !== req.user.sub));
}

module.exports = { create, list, messages, send, markRead, react, directory };
