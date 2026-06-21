const queueService = require('../services/queue.service');
const autoModeService = require('../services/autoMode.service');
const staffService = require('../services/staff.service');
const analyticsService = require('../services/analytics.service');
const authService = require('../services/auth.service');
const { refs } = require('../config/firebase');
const path = require('path');
const config = require('../config/env');

async function callNext(req, res) {
  const result = await queueService.callNextToken(req.body.service);
  res.json(result);
}

async function callNextPriority(req, res) {
  const result = await queueService.callNextPriorityToken();
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
  await autoModeService.stopAutoMode();
  await queueService.resetQueue();
  res.json({ message: 'Queue reset.' });
}

async function getAnalytics(req, res) {
  const data = await analyticsService.getTrafficStats();
  res.json(data);
}

async function exportAnalyticsCsv(req, res) {
  const filepath = path.resolve(__dirname, '..', '..', config.analytics.csvPath);
  res.download(filepath, 'queue_events.csv', err => {
    if (err && !res.headersSent) res.status(404).json({ error: 'CSV file not found yet.' });
  });
}

async function startAutoMode(req, res) {
  const { services } = req.body;
  const result = await autoModeService.startAutoMode(services);
  res.json({ message: 'Auto mode started.', ...result });
}

async function stopAutoMode(req, res) {
  await autoModeService.stopAutoMode();
  res.json({ message: 'Auto mode stopped.' });
}

async function getAutoModeStatus(req, res) {
  res.json({ running: autoModeService.isRunning() });
}

async function getAppConfig(req, res) {
  const snap = await refs.appConfig().once('value');
  res.json(snap.val() || { industry: 'general', orgName: 'QueueLess' });
}

const VALID_INDUSTRIES = ['general', 'bank', 'medical', 'restaurant'];

async function updateAppConfig(req, res) {
  const { industry, orgName } = req.body;
  if (industry && !VALID_INDUSTRIES.includes(industry)) {
    throw Object.assign(new Error(`Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}.`), { statusCode: 400 });
  }
  await refs.appConfig().update({ industry, orgName });
  res.json({ message: 'Config updated.', industry, orgName });
}

async function getFeedback(req, res) {
  const snap = await refs.feedback().once('value');
  const all = Object.values(snap.val() || {});
  const avgRating = all.length > 0
    ? (all.reduce((s, f) => s + (f.rating || 0), 0) / all.length).toFixed(1)
    : null;
  res.json({ entries: all.sort((a, b) => b.submittedAt - a.submittedAt), avgRating, total: all.length });
}

// Staff management
async function listStaff(req, res) {
  const members = await staffService.listStaff();
  res.json(members);
}

async function createStaff(req, res) {
  const { username, password, service, displayName, pin } = req.body;
  const result = await staffService.createStaff({ username, password, service, displayName, pin });
  res.status(201).json(result);
}

async function removeStaff(req, res) {
  await staffService.deleteStaff(req.params.username);
  res.json({ message: 'Staff member removed.' });
}

async function skipToken(req, res) {
  const { tokenId } = req.params;
  const result = await queueService.skipToken(tokenId);
  res.json(result);
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.sub, currentPassword, newPassword);
  res.json({ message: 'Password updated successfully.' });
}

async function getProfile(req, res) {
  const profile = await authService.getAdminProfile(req.user.sub);
  res.json(profile);
}

async function updateProfile(req, res) {
  const result = await authService.updateAdminProfile(req.user.sub, req.body);
  res.json({ message: 'Profile updated.', ...result });
}

async function setAnnouncement(req, res) {
  const { message } = req.body;
  if (!message?.trim()) throw Object.assign(new Error('Message is required.'), { statusCode: 400 });
  await refs.announcement().set({ message: message.trim(), createdAt: Date.now() });
  res.json({ message: 'Announcement set.' });
}

async function clearAnnouncement(req, res) {
  await refs.announcement().remove();
  res.json({ message: 'Announcement cleared.' });
}

async function setTokenNote(req, res) {
  const { tokenId } = req.params;
  const { note } = req.body;
  const snap = await refs.token(tokenId).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Token not found.'), { statusCode: 404 });
  await refs.token(tokenId).update({ note: note?.trim() || null });
  res.json({ message: 'Note saved.' });
}

async function listAppointments(req, res) {
  const snap = await refs.appointments().once('value');
  const all = Object.values(snap.val() || {}).sort((a, b) => {
    const da = `${a.date}T${a.timeSlot}`;
    const db2 = `${b.date}T${b.timeSlot}`;
    return da < db2 ? -1 : da > db2 ? 1 : 0;
  });
  res.json(all);
}

async function cancelAppointment(req, res) {
  const { id } = req.params;
  const snap = await refs.appointment(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Appointment not found.'), { statusCode: 404 });
  await refs.appointment(id).update({ status: 'cancelled' });
  res.json({ message: 'Appointment cancelled.' });
}

async function confirmAppointment(req, res) {
  const { id } = req.params;
  const snap = await refs.appointment(id).once('value');
  if (!snap.exists()) throw Object.assign(new Error('Appointment not found.'), { statusCode: 404 });
  await refs.appointment(id).update({ status: 'confirmed' });
  res.json({ message: 'Appointment confirmed.' });
}

module.exports = {
  callNext, callNextPriority, pause, resume, activeQueue, reset,
  getAnalytics, exportAnalyticsCsv,
  startAutoMode, stopAutoMode, getAutoModeStatus,
  getAppConfig, updateAppConfig,
  getFeedback,
  listStaff, createStaff, removeStaff,
  skipToken,
  changePassword,
  getProfile, updateProfile,
  setAnnouncement, clearAnnouncement,
  setTokenNote,
  listAppointments, cancelAppointment, confirmAppointment,
};
