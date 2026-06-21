const { refs } = require('../config/firebase');
const queueService = require('./queue.service');

const INTERVAL_MS = 60 * 1000;
let timer = null;
let lastAutoResetDate = null;

function getCurrentHHMM() {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    return `${hour}:${minute}`;
  } catch {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

function getCurrentDateStr() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function tick() {
  try {
    const cfgSnap = await refs.appConfig().once('value');
    const cfg = cfgSnap.val() || {};
    const autoResetTime = cfg.autoResetTime;
    if (!autoResetTime) return;

    const currentTime = getCurrentHHMM();
    const today = getCurrentDateStr();

    if (currentTime === autoResetTime && lastAutoResetDate !== today) {
      console.log(`[scheduler] Auto-reset triggered at ${currentTime} on ${today}.`);
      lastAutoResetDate = today;
      await queueService.resetQueue();
      console.log('[scheduler] Auto-reset completed.');
    }
  } catch (err) {
    console.error('[scheduler] tick error (non-fatal):', err.message);
  }
}

function startScheduler() {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  tick();
  console.log('[scheduler] Auto-reset scheduler started (checks every minute).');
}

function stopScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { startScheduler, stopScheduler };
