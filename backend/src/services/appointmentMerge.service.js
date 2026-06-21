const { refs } = require('../config/firebase');
const queueService = require('./queue.service');
const analytics = require('./analytics.service');

const INTERVAL_MS = 60 * 1000;
const WINDOW_MINUTES = 5;
let timer = null;

function getCurrentMinutesSinceMidnight() {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
    return hour * 60 + minute;
  } catch {
    const now = new Date();
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

function getCurrentDateStr() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function timeSlotToMinutes(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 60 + mm;
}

async function mergeTick() {
  try {
    const snap = await refs.appointments().once('value');
    const all = snap.val() || {};
    const today = getCurrentDateStr();
    const nowMinutes = getCurrentMinutesSinceMidnight();

    const candidates = Object.values(all).filter(appt => {
      if (appt.status !== 'confirmed') return false;
      if (appt.tokenId) return false;
      if (appt.date !== today) return false;
      if (!appt.timeSlot || !/^\d{2}:\d{2}$/.test(appt.timeSlot)) return false;
      const slotMinutes = timeSlotToMinutes(appt.timeSlot);
      return nowMinutes >= slotMinutes && nowMinutes < slotMinutes + WINDOW_MINUTES;
    });

    for (const appt of candidates) {
      try {
        const token = await queueService.issueToken({
          service: appt.service || 'general',
          priority: 'priority',
        });
        await refs.appointment(appt.id).update({ tokenId: token.id, mergedAt: Date.now() });
        analytics.logEvent({
          event_type: 'appointment_merged',
          token_id: token.id,
          token_number: token.number,
          service: token.service,
          timestamp: Date.now(),
          appointment_id: appt.id,
        }).catch(err => console.error('[analytics]', err.message));
        console.log(`[appointmentMerge] Merged appointment ${appt.id} → token ${token.id} (#${token.number})`);
      } catch (err) {
        console.error(`[appointmentMerge] Failed to merge appointment ${appt.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[appointmentMerge] tick error (non-fatal):', err.message);
  }
}

function startAppointmentMerge() {
  if (timer) return;
  timer = setInterval(mergeTick, INTERVAL_MS);
  mergeTick();
  console.log('[appointmentMerge] Appointment merge service started (checks every minute).');
}

function stopAppointmentMerge() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { startAppointmentMerge, stopAppointmentMerge };
