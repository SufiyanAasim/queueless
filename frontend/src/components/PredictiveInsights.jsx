import { useState, useEffect, useCallback } from 'react';
import { apiPredictions } from '../services/api.js';

function fmtWait(seconds) {
  if (!seconds || seconds <= 0) return 'no wait';
  const m = Math.round(seconds / 60);
  return m < 60 ? `~${m} min` : `~${Math.floor(m / 60)}h ${m % 60}m`;
}

const ACTION_LABEL = {
  open_counter: 'Open another counter',
  add_staff: 'Add staff',
  rebalance: 'Rebalance load',
};

/**
 * Predictive insights panel — surfaces the backend's explainable predictions:
 * per-queue wait forecasts, short-horizon congestion alerts, and actionable
 * recommendations. Every item is traceable and labelled with its confidence,
 * with a clear cold-start notice when history is thin.
 */
export default function PredictiveInsights() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try { setData(await apiPredictions()); }
    catch (e) { setErr(e.response?.data?.error || 'Predictions unavailable.'); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  if (err) return null;
  if (!data) return (
    <div className="card animate-pulse text-graphite text-sm">Loading predictive insights…</div>
  );

  const confColor = { high: 'text-success', medium: 'text-graphite', low: 'text-warn' };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display text-2xl">Predictive insights</h2>
        <div className="flex items-center gap-2">
          {data.modelSource === 'trained' && (
            <span className="text-xs px-2 py-0.5 border border-accent/40 text-accent bg-accent/5">Trained model</span>
          )}
          <span className={`text-xs px-2 py-0.5 border ${data.coldStart ? 'border-warn/40 text-warn bg-warn/5' : 'border-success/40 text-success bg-success/5'}`}>
            {data.coldStart ? 'Cold-start · rule-based' : `${data.sampleSize} events learned`}
          </span>
        </div>
      </div>

      <p className="text-xs text-graphite mb-4">{data.note}</p>

      {/* Congestion forecast */}
      {data.congestion.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.congestion.map((c, i) => (
            <div key={i} className="p-3 border border-accent/40 bg-accent/5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="font-medium text-accent-deep">{c.message}</span>
              </div>
              <div className="mt-1 text-xs text-graphite">Recommended: {c.recommendation} <span className={`ml-1 ${confColor[c.confidence]}`}>({c.confidence} confidence)</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 ? (
        <div className="mb-5 space-y-2">
          {data.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border border-rule bg-cream text-sm">
              <span className="text-xs px-2 py-0.5 border border-ink/30 bg-paper shrink-0 mt-0.5">{ACTION_LABEL[r.action] || r.action}</span>
              <span className="text-graphite">{r.reason}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-5 text-sm text-graphite">No action needed right now — queues are balanced.</p>
      )}

      {/* Per-queue wait predictions */}
      {data.queues.length > 0 && (
        <div className="border border-rule">
          <div className="px-4 py-2.5 bg-ink text-paper text-xs tracking-[0.18em] uppercase font-medium grid grid-cols-12 gap-2">
            <div className="col-span-5">Queue</div>
            <div className="col-span-2 text-right">Waiting</div>
            <div className="col-span-3 text-right">Predicted wait</div>
            <div className="col-span-2 text-right">Conf.</div>
          </div>
          <div className="divide-y divide-rule bg-cream">
            {data.queues.map(q => (
              <div key={q.key} className="px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm" title={`Basis: ${q.basis}`}>
                <div className="col-span-5 font-medium truncate">{q.label}</div>
                <div className="col-span-2 text-right">{q.waitingCount}</div>
                <div className="col-span-3 text-right font-medium">{fmtWait(q.predictedWaitSeconds)}</div>
                <div className={`col-span-2 text-right text-xs ${confColor[q.confidence]}`}>{q.confidence}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
