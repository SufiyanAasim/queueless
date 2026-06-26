/**
 * Predictive queue assistance (v1.4.0).
 *
 * Deliberately practical and *explainable* rather than a black-box deep model:
 * every number it returns can be traced to observed data, and it falls back to
 * rule-based defaults during cold-start (insufficient history). This avoids
 * fabricated/hallucinated predictions and keeps behaviour deterministic.
 *
 * Signals used (all already collected by the analytics layer):
 *   - per-queue waiting counts + configured/observed average service time
 *   - historical hourly volume (peakHours) for short-horizon arrival forecasting
 *   - live capacity / load for actionable, explained recommendations
 *
 * The heavier statistical/ML models (gradient boosting, time-series forecasting,
 * isolation-forest anomaly detection) live in the Python `analytics/` pipeline,
 * which trains offline on the same event log and exports artefacts; this service
 * is the always-on, low-latency layer that serves predictions to the UI.
 */
const fs = require('fs');
const path = require('path');
const analytics = require('./analytics.service');
const queueAdmin = require('./queueAdmin.service');
const config = require('../config/env');

// ---- Trained-model artefact loader (exported by analytics/models/train_predictor.py) ----
// Loaded lazily and cached by file mtime so a freshly trained artefact is picked
// up without a restart. Absent/invalid artefact => null => heuristic fallback.
let _modelCache = { path: null, mtimeMs: 0, data: null };

function modelCandidatePaths() {
  return [
    // Freshly trained artefact from the analytics pipeline (dev / CI).
    path.resolve(__dirname, '..', '..', config.analytics.modelPath),
    // Artefact shipped with the backend for production (Render rootDir=backend).
    path.resolve(__dirname, '..', '..', 'models', 'predictions.json'),
  ];
}

function loadModel() {
  for (const filepath of modelCandidatePaths()) {
    try {
      const stat = fs.statSync(filepath);
      if (_modelCache.path === filepath && stat.mtimeMs === _modelCache.mtimeMs && _modelCache.data) {
        return _modelCache.data;
      }
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      _modelCache = { path: filepath, mtimeMs: stat.mtimeMs, data };
      return data;
    } catch {
      // try next candidate
    }
  }
  return null; // no artefact anywhere — heuristic mode
}

const MIN_SAMPLES = 5;     // below this we treat the system as cold-start
const HIGH_CONFIDENCE = 50;
const BUSY_THRESHOLD = 10;
const IMBALANCE_BUSY = 8;

function confidenceFromSamples(n) {
  if (n >= HIGH_CONFIDENCE) return 'high';
  if (n >= MIN_SAMPLES) return 'medium';
  return 'low';
}

async function getPredictions() {
  const [stats, overview] = await Promise.all([
    analytics.getTrafficStats(),
    queueAdmin.getQueuesOverview().catch(() => []),
  ]);

  const model = loadModel();
  const totalSamples = stats.totalIssued || 0;
  const coldStart = totalSamples < MIN_SAMPLES;
  const observedAvg = stats.avgWaitSeconds > 0 ? stats.avgWaitSeconds : null;
  const baseAvg = observedAvg || config.queue.avgServiceTimeSeconds;
  const currentHour = new Date().getHours();

  // Trained per-queue service time, if the artefact has it (hour grid preferred).
  const trainedServiceSeconds = (key) => {
    const st = model && model.serviceTime;
    if (!st) return null;
    const grid = st.byServiceHour && st.byServiceHour[key];
    if (grid && grid[String(currentHour)] != null) return grid[String(currentHour)];
    if (st.byService && st.byService[key]) return st.byService[key].avgSeconds;
    return null;
  };

  // ---- Per-queue wait-time prediction (queue length × service time) ----
  const queues = overview.map(q => {
    const trained = trainedServiceSeconds(q.key);
    const avg = trained != null ? trained : (q.avgServiceSeconds || baseAvg);
    const basis = trained != null
      ? `trained model (${model.models?.serviceTime || 'model'})`
      : q.avgServiceSeconds
        ? 'configured average service time'
        : observedAvg
          ? 'observed historical waits'
          : 'default service time (cold-start)';
    return {
      key: q.key,
      label: q.label,
      waitingCount: q.waitingCount,
      avgServiceSeconds: Math.round(avg),
      predictedWaitSeconds: Math.round(q.waitingCount * avg),
      confidence: trained != null ? (model.confidence || 'medium') : confidenceFromSamples(totalSamples),
      basis,
    };
  });

  // ---- Short-horizon arrival/congestion forecast ----
  // Prefer the trained seasonal arrival model; fall back to live hourly history.
  const trainedArrivals = model && model.arrivals && model.arrivals.byHour;
  const peak = trainedArrivals && Object.keys(trainedArrivals).length ? trainedArrivals : (stats.peakHours || {});
  const hourVals = Object.values(peak);
  const avgHourVol = hourVals.length ? hourVals.reduce((a, b) => a + b, 0) / hourVals.length : 0;
  const nextHour = (currentHour + 1) % 24;
  const nextHourVol = peak[nextHour] || peak[String(nextHour)] || 0;
  const forecastIsTrained = !!(trainedArrivals && Object.keys(trainedArrivals).length);

  const congestion = [];
  if ((!coldStart || forecastIsTrained) && avgHourVol > 0 && nextHourVol > avgHourVol * 1.5) {
    congestion.push({
      type: 'high_traffic_forecast',
      horizonHour: nextHour,
      message: `Higher traffic likely around ${String(nextHour).padStart(2, '0')}:00 — historically ~${Math.round(nextHourVol)} tokens vs ~${Math.round(avgHourVol)} on an average hour.`,
      recommendation: 'Open another counter or add staff before the rush builds.',
      confidence: confidenceFromSamples(totalSamples),
    });
  }

  // ---- Explainable, live recommendations ----
  const recommendations = [];
  for (const q of overview) {
    if (q.atCapacity) {
      recommendations.push({ queue: q.label, action: 'open_counter', reason: `${q.label} is at capacity (${q.waitingCount}/${q.capacity}).` });
    } else if (q.waitingCount >= BUSY_THRESHOLD) {
      recommendations.push({ queue: q.label, action: 'add_staff', reason: `${q.label} has ${q.waitingCount} waiting — above the comfortable threshold of ${BUSY_THRESHOLD}.` });
    }
  }
  const busy = overview.filter(q => q.waitingCount >= IMBALANCE_BUSY);
  const idle = overview.filter(q => q.waitingCount === 0 && q.enabled !== false);
  if (busy.length && idle.length) {
    recommendations.push({
      action: 'rebalance',
      reason: `${busy[0].label} is congested (${busy[0].waitingCount} waiting) while ${idle[0].label} is idle — redirect customers or reassign staff.`,
    });
  }

  return {
    generatedAt: Date.now(),
    coldStart,
    sampleSize: totalSamples,
    baseAvgServiceSeconds: Math.round(baseAvg),
    modelSource: model ? 'trained' : 'heuristic',
    trainedAt: model?.trainedAt || null,
    note: model
      ? `Using trained models (${model.models?.serviceTime || 'service-time'}, ${model.models?.anomaly || 'anomaly'}) from the analytics pipeline.`
      : coldStart
        ? 'Limited history so far — predictions use rule-based defaults and will sharpen as more tokens are processed.'
        : 'Predictions derived from this organisation’s historical queue events (heuristic; train models for sharper forecasts).',
    queues,
    congestion,
    recommendations,
  };
}

module.exports = { getPredictions };
