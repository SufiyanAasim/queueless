import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFeedback } from '../services/api.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel } from '../utils/industry.js';

function Stars({ rating }) {
  return (
    <span className="text-warn">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

export default function AdminFeedback() {
  const { user } = useAuth();
  const cfg = useAppConfig();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiFeedback().then(setData).finally(() => setLoading(false));
  }, [user]);

  if (!user) return <Navigate to="/admin/login" replace />;

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-10 py-24 text-center text-graphite">Loading feedback…</div>;
  }

  const { entries = [], avgRating, total } = data || {};

  const byService = {};
  entries.forEach(e => {
    if (!byService[e.service]) byService[e.service] = { total: 0, sum: 0, count: 0 };
    byService[e.service].total++;
    byService[e.service].sum += e.rating;
    byService[e.service].count++;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-10 py-10">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="label">Admin · Feedback</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Customer feedback</h1>
        </div>
        <Link to="/admin" className="btn-secondary text-sm">Back to dashboard</Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-rule mb-10">
        <div className="bg-paper p-6">
          <div className="label">Total responses</div>
          <div className="font-display text-5xl tracking-tightest mt-2">{total}</div>
        </div>
        <div className="bg-paper p-6">
          <div className="label">Average rating</div>
          <div className="font-display text-5xl tracking-tightest mt-2">{avgRating || '—'}</div>
          {avgRating && <div className="mt-1 text-warn text-lg">{'★'.repeat(Math.round(avgRating))}</div>}
        </div>
        <div className="bg-paper p-6 col-span-2 sm:col-span-1">
          <div className="label mb-3">By service</div>
          {Object.keys(byService).length === 0 ? (
            <p className="text-xs text-graphite">No data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(byService).map(([svc, d]) => (
                <div key={svc} className="flex justify-between text-xs">
                  <span className="text-graphite">{getServiceLabel(svc, cfg.industry)}</span>
                  <span className="font-medium text-warn">{'★'.repeat(Math.round(d.sum / d.count))} {(d.sum / d.count).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-graphite border border-rule">
          <div className="font-display text-3xl text-ash">No feedback yet</div>
          <p className="mt-2 text-sm">Customers will see a feedback prompt after being served.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="label mb-2">{entries.length} response{entries.length !== 1 ? 's' : ''}</div>
          {entries.map(e => (
            <div key={e.tokenId} className="border border-rule bg-cream p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl num">#{String(e.tokenNumber).padStart(2, '0')}</span>
                  <div>
                    <div className="text-xs text-graphite">{getServiceLabel(e.service, cfg.industry)}</div>
                    <Stars rating={e.rating} />
                  </div>
                </div>
                <span className="text-xs text-graphite font-mono">
                  {new Date(e.submittedAt).toLocaleString()}
                </span>
              </div>
              {e.comment && (
                <p className="mt-3 text-sm text-ink border-t border-rule pt-3">{e.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
