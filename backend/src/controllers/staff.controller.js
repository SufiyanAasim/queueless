const staffService = require('../services/staff.service');
const queueService = require('../services/queue.service');

async function login(req, res) {
  const { username, password } = req.body;
  const result = await staffService.loginStaff(username, password);
  res.json(result);
}

async function loginPin(req, res) {
  const { pin } = req.body;
  const result = await staffService.loginByPin(pin);
  res.json(result);
}

async function getQueue(req, res) {
  const data = await queueService.getActiveQueue();
  res.json(data);
}

async function callNext(req, res) {
  const service = req.user.service;
  if (!service) {
    return res.status(400).json({ error: 'No service assigned to this account.' });
  }
  const result = await queueService.callNextToken(service);
  res.json(result);
}

module.exports = { login, loginPin, getQueue, callNext };
