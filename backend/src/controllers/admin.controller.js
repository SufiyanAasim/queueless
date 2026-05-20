/**
 * Admin operations - JWT-protected.
 * All handlers assume requireAdmin middleware has already run.
 */
const queueService = require('../services/queue.service');

async function callNext(req, res) {
  const result = await queueService.callNextToken(req.body.service);
  res.json(result);
}

async function pause(req, res) {
  await queueService.pauseQueue();
  res.json({ message: 'Queue paused.' });
}

async function resume(req, res) {
  await queueService.resumeQueue();
  res.json({ message: 'Queue resumed.' });
}

async function activeQueue(req, res) {
  const data = await queueService.getActiveQueue();
  res.json(data);
}

async function reset(req, res) {
  await queueService.resetQueue();
  res.json({ message: 'Queue reset.' });
}

async function getAnalytics(req, res) {
  const analyticsService = require('../services/analytics.service');
  const data = await analyticsService.getTrafficStats();
  res.json(data);
}

module.exports = { callNext, pause, resume, activeQueue, reset, getAnalytics };
