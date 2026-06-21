const bcrypt = require('bcryptjs');
const queueService = require('../services/queue.service');
const autoModeService = require('../services/autoMode.service');
const staffService = require('../services/staff.service');
const analyticsService = require('../services/analytics.service');
const authService = require('../services/auth.service');
const { refs } = require('../config/firebase');
const path = require('path');
const config = require('../config/env');

const BCRYPT_ROUNDS = 10;

async function callNext(req, res) {
  const result = await queueService.callNextToken(req.body.service, req.body.staffUsername || null);
  res.json(result);
}

async function callNextPriority(req, res) {
  const result = await queueService.callNextPriorityToken(req.body.staffUsername || null);
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

async function pauseService(req, res) {
  const { service } = req.body;
  if (!service || typeof service !== 'string' || !service.trim()) {
    throw Object.assign(new Error('service is required.'), { statusCode: 400 });
  }
  await queueService.pauseService(service.trim());
  res.json({ message: `Service "${service.trim()}" paused.` });
}

async function resumeService(req, res) {
  const { service } = req.body;
  if (!service || typeof service !== 'string' || !service.trim()) {
    throw Object.assign(new Error('service is required.'), { statusCode: 400 });
  }
  await queueService.resumeService(service.trim());
  res.json({ message: `Service "${service.trim()}" resumed.` });
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

async function getStaffMetrics(req, res) {
  const data = await analyticsService.getStaffMetrics();
  res.json(data);
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
const HH_MM_REGEX = /^\d{2}:\d{2}$/;

async function updateAppConfig(req, res) {
  const { industry, orgName, location, slaMinutes, displayMessage, autoResetTime } = req.body;
  if (industry && !VALID_INDUSTRIES.includes(industry)) {
    throw Object.assign(new Error(`Invalid industry. Must be one of: ${VALID_INDUSTRIES.join(', ')}.`), { statusCode: 400 });
  }
  if (slaMinutes !== undefined && slaMinutes !== null) {
    const parsed = parseInt(slaMinutes, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw Object.assign(new Error('slaMinutes must be a positive integer.'), { statusCode: 400 });
    }
  }
  if (autoResetTime !== undefined && autoResetTime !== null) {
    if (!HH_MM_REGEX.test(autoResetTime)) {
      throw Object.assign(new Error('autoResetTime must be in HH:MM format.'), { statusCode: 400 });
    }
  }

  const updates = {
    industry: industry ?? undefined,
    orgName: orgName ?? undefined,
    location: location ?? null,
    slaMinutes: slaMinutes !== undefined ? (slaMinutes === null ? null : parseInt(slaMinutes, 10)) : undefined,
    displayMessage: displayMessage !== undefined ? (displayMessage?.trim() || null) : undefined,
    autoResetTime: autoResetTime !== undefined ? (autoResetTime ?? null) : undefined,
  };

  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

  await refs.appConfig().update(updates);
  res.json({ message: 'Config updated.', ...updates });
}

async function getFeedback(req, res) {
  const snap = await refs.feedback().once('value');
  const all = Object.values(snap.val() || {});
  const avgRating = all.length > 0
    ? (all.reduce((s, f) => s + (f.rating || 0), 0) / all.length).toFixed(1)
    : null;
  res.json({ entries: all.sort((a, b) => b.submittedAt - a.submittedAt), avgRating, total: all.length });
}

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

async function listAdmins(req, res) {
  const snap = await refs.admins().once('value');
  const all = snap.val() || {};
  const admins = Object.values(all).map(({ username, displayName, role }) => ({
    username,
    displayName: displayName || username,
    role: role || 'admin',
  }));
  res.json(admins);
}

async function createAdmin(req, res) {
  const { username, password, displayName } = req.body;
  if (!username?.trim() || !password) {
    throw Object.assign(new Error('username and password are required.'), { statusCode: 400 });
  }
  if (password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters.'), { statusCode: 400 });
  }

  const allSnap = await refs.admins().once('value');
  const existing = allSnap.val() || {};
  if (Object.keys(existing).length >= 10) {
    throw Object.assign(new Error('Maximum of 10 admin accounts allowed.'), { statusCode: 400 });
  }

  const uname = username.trim();
  if (existing[uname]) {
    throw Object.assign(new Error(`Admin "${uname}" already exists.`), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const record = {
    username: uname,
    passwordHash,
    displayName: displayName?.trim() || uname,
    role: 'admin',
    createdAt: Date.now(),
  };
  await refs.admin(uname).set(record);

  res.status(201).json({
    username: record.username,
    displayName: record.displayName,
    role: record.role,
    createdAt: record.createdAt,
  });
}

async function deleteAdmin(req, res) {
  const { username } = req.params;
  if (username === req.user.sub) {
    throw Object.assign(new Error('Cannot delete your own admin account.'), { statusCode: 400 });
  }
  const snap = await refs.admin(username).once('value');
  if (!snap.exists()) {
    throw Object.assign(new Error(`Admin "${username}" not found.`), { statusCode: 404 });
  }
  await refs.admin(username).remove();
  res.json({ message: `Admin "${username}" deleted.` });
}

module.exports = {
  callNext, callNextPriority, pause, resume, activeQueue, reset,
  getAnalytics, exportAnalyticsCsv, getStaffMetrics,
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
  pauseService, resumeService,
  listAdmins, createAdmin, deleteAdmin,
};
