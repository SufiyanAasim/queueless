const queueService = require('../services/queue.service');

async function takeToken(req, res) {
  const { service, email, priority } = req.body || {};
  const token = await queueService.issueToken({
    service,
    email: email || null,
    priority: priority || 'normal',
  });
  res.status(201).json({ message: 'Token issued successfully.', token });
}

async function getTokenStatus(req, res) {
  const { id } = req.params;
  const status = await queueService.getTokenStatus(id);
  res.json(status);
}

module.exports = { takeToken, getTokenStatus };
