const queueService = require('./queue.service');
const analytics = require('./analytics.service');
const config = require('../config/env');
const { refs } = require('../config/firebase');

let autoInterval = null;
let activeServices = [];

async function getOptimalIntervalSeconds() {
  const stats = await analytics.getTrafficStats();
  const base = stats.avgWaitSeconds > 0 ? stats.avgWaitSeconds : config.queue.avgServiceTimeSeconds;

  // Time-of-day weighting: during peak hours call faster, off-peak call slower.
  const hour = new Date().getHours();
  const peakLoad = stats.peakHours[hour] || 0;
  const maxLoad = Math.max(...Object.values(stats.peakHours || {}), 1);
  const factor = 1 - 0.3 * (peakLoad / maxLoad); // 0.7–1.0 range

  return Math.max(20, Math.round(base * factor));
}

async function tick() {
  for (const service of activeServices) {
    try {
      await queueService.callNextToken(service);
    } catch {
      // Queue paused or empty — not an error, just skip this tick.
    }
  }
}

async function startAutoMode(services) {
  stop();

  const intervalSeconds = await getOptimalIntervalSeconds();

  // If no services passed, derive from the configured industry profile in Firebase.
  if (!services || services.length === 0) {
    try {
      const snap = await refs.appConfig().once('value');
      const cfg = snap.val() || {};
      const PROFILES = {
        general:    ['general', 'consultation', 'transaction'],
        bank:       ['new_account', 'loan', 'forex', 'card_services', 'general'],
        medical:    ['opd', 'lab', 'pharmacy', 'radiology', 'emergency'],
        restaurant: ['table_small', 'table_medium', 'table_large', 'takeaway'],
      };
      services = PROFILES[cfg.industry] || PROFILES.general;
    } catch {
      services = ['general', 'consultation', 'transaction'];
    }
  }
  activeServices = services;

  await refs.queueState().update({
    autoMode: { enabled: true, intervalSeconds, startedAt: Date.now() },
  });

  autoInterval = setInterval(async () => {
    await tick();
    // Dynamically recalculate interval each cycle and restart if it changed significantly.
    const newInterval = await getOptimalIntervalSeconds();
    if (Math.abs(newInterval - intervalSeconds) > 10) {
      await startAutoMode(activeServices);
    }
  }, intervalSeconds * 1000);

  console.log(`[autoMode] Started — interval ${intervalSeconds}s, services: ${activeServices.join(', ')}`);
  return { intervalSeconds, services: activeServices };
}

function stop() {
  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = null;
  }
}

async function stopAutoMode() {
  stop();
  await refs.queueState().update({
    autoMode: { enabled: false, intervalSeconds: 0, startedAt: null },
  });
  console.log('[autoMode] Stopped.');
}

function isRunning() {
  return autoInterval !== null;
}

module.exports = { startAutoMode, stopAutoMode, isRunning, getOptimalIntervalSeconds };
