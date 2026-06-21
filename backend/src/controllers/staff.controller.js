const staffService = require('../services/staff.service');
const queueService = require('../services/queue.service');
const { refs } = require('../config/firebase');

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
  const result = await queueService.callNextToken(service, req.user.sub);
  res.json(result);
}

async function getProfile(req, res) {
  const profile = await staffService.getStaffProfile(req.user.sub);
  res.json(profile);
}

async function updateProfile(req, res) {
  const result = await staffService.updateStaffProfile(req.user.sub, req.body);
  res.json({ message: 'Profile updated.', ...result });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  await staffService.changeStaffPassword(req.user.sub, currentPassword, newPassword);
  res.json({ message: 'Password updated successfully.' });
}

async function setTokenNote(req, res) {
  const { tokenId } = req.params;
  const { note } = req.body;
  const snap = await refs.token(tokenId).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Token not found.'), { statusCode: 404 });
  await refs.token(tokenId).update({ note: note?.trim() || null });
  res.json({ message: 'Note saved.' });
}

module.exports = { login, loginPin, getQueue, callNext, getProfile, updateProfile, changePassword, setTokenNote };
