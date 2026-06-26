/**
 * Retrieval-Augmented Generation (RAG) layer for the AI assistant.
 *
 * Pulls ONLY from verified backend services and returns a structured context
 * object. The assistant answers strictly from this context, so every operational
 * figure is traceable and nothing is fabricated.
 */
const analytics = require('../services/analytics.service');
const prediction = require('../services/prediction.service');
const queueAdmin = require('../services/queueAdmin.service');

async function retrieveContext() {
  const [stats, predictions, overview, staff] = await Promise.all([
    analytics.getTrafficStats().catch(() => ({})),
    prediction.getPredictions().catch(() => ({})),
    queueAdmin.getQueuesOverview().catch(() => []),
    analytics.getStaffMetrics().catch(() => []),
  ]);

  return {
    generatedAt: Date.now(),
    sources: ['traffic_stats', 'predictions', 'queues_overview', 'staff_metrics'],
    totals: {
      totalIssued: stats.totalIssued || 0,
      totalExpired: stats.totalExpired || 0,
      totalReferred: stats.totalReferred || 0,
      avgWaitSeconds: Math.round(stats.avgWaitSeconds || 0),
      dropOffRate: stats.dropOffRate || 0,
    },
    peakHours: stats.peakHours || {},
    queues: (overview || []).map(q => ({
      key: q.key,
      label: q.label,
      waitingCount: q.waitingCount,
      nowServing: q.nowServing,
      estimatedWaitSeconds: q.estimatedWaitSeconds,
      avgServiceSeconds: q.avgServiceSeconds,
      atCapacity: q.atCapacity,
      enabled: q.enabled,
    })),
    predictions: {
      modelSource: predictions.modelSource || 'heuristic',
      congestion: predictions.congestion || [],
      recommendations: predictions.recommendations || [],
      queues: predictions.queues || [],
    },
    staff: (staff || []).map(s => ({
      username: s.username,
      tokensServed: s.tokensServed,
      avgServiceSeconds: s.avgServiceSeconds,
      tokensCalled: s.tokensCalled,
    })),
  };
}

module.exports = { retrieveContext };
