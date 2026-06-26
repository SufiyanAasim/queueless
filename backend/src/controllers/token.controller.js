const queueService = require('../services/queue.service');

async function takeToken(req, res) {
  const { service, email, priority, groupSize, patientName, note } = req.body || {};
  const token = await queueService.issueToken({
    service,
    email: email || null,
    priority: priority || 'normal',
    groupSize: groupSize || 1,
    patientName: patientName || null,
    note: note || null,
  });
  res.status(201).json({ message: 'Token issued successfully.', token });
}

async function getTokenStatus(req, res) {
  const { id } = req.params;
  const status = await queueService.getTokenStatus(id);
  res.json(status);
}

async function requeueToken(req, res) {
  const { id } = req.params;
  const newToken = await queueService.requeueToken(id);
  res.status(201).json({ message: 'Token re-queued successfully.', token: newToken });
}

module.exports = { takeToken, getTokenStatus, requeueToken };
