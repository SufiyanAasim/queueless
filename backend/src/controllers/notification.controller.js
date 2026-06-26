const notifications = require('../services/notification.service');

async function list(req, res) {
  res.json(await notifications.listFor(req.user.sub));
}

async function markRead(req, res) {
  res.json(await notifications.markRead(req.user.sub, req.params.id));
}

async function markAllRead(req, res) {
  res.json(await notifications.markAllRead(req.user.sub));
}

module.exports = { list, markRead, markAllRead };
