/**
 * Public token operations - no auth required.
 * Anyone with a browser can take a token and check its status.
 */
const queueService = require('../services/queue.service');

async function takeToken(req, res) {
  const { service } = req.body || {};
  const token = await queueService.issueToken({ service });
  res.status(201).json({
    message: 'Token issued successfully.',
    token,
  });
}

async function getTokenStatus(req, res) {
  const { id } = req.params;
  const status = await queueService.getTokenStatus(id);
  res.json(status);
}

module.exports = { takeToken, getTokenStatus };
