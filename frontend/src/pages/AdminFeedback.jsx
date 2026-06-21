import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFeedback, apiSubmitFeedback } from '../services/api.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel, getServices } from '../utils/industry.js';

function Stars({ rating }) {
  return (
    <span className="text-warn">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className={`text-3xl transition-colors ${n <= (hovered || value) ? 'text-warn' : 'text-ash'}`}
        >★</button>
      ))}
    </div>
  );
}

export default function AdminFeedback() {
  const { user } = useAuth();
  const cfg = useAppConfig();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRecord, setShowRecord] = useState(false);
  const [form, setForm] = useState({ tokenId: '', rating: 0, comment: '' });
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState(null);
  const [recordSuccess, setRecordSuccess] = useState(false);

  const reload = () => apiFeedback().then(setData).finally(() => setLoading(false));

  useEffect(() => {
    if (!user) return;
    reload();
  }, [user]);

  const handleRecord = async (e) => {
    e.preventDefault();
    if (!form.tokenId.trim()) { setRecordError('Token ID is required.'); return; }
    if (!form.rating) { setRecordError('Please select a rating.'); return; }
    setRecording(true); setRecordError(null);
    try {
      await apiSubmitFeedback(form.tokenId.trim(), form.rating, form.comment.trim() || null);
      setRecordSuccess(true);
      setForm({ tokenId: '', rating: 0, comment: '' });
      setTimeout(() => { setRecordSuccess(false); setShowRecord(false); reload(); }, 1500);
    } catch (e) {
      setRecordError(e.response?.data?.error || 'Could not record feedback.');
    } finally {
      setRecording(false);
    }
  };

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
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => { setShowRecord(v => !v); setRecordError(null); }} className="btn-primary text-sm">
            {showRecord ? 'Cancel' : '+ Record feedback'}
          </button>
          <Link to="/admin" className="btn-secondary text-sm">Back to dashboard</Link>
        </div>
      </div>

      {/* Record feedback panel */}
      {showRecord && (
        <div className="mb-10 border border-rule bg-cream p-6">
          <div className="label mb-4">Record verbal / in-person feedback</div>
          <form onSubmit={handleRecord} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1.5">Token ID</label>
                <input
                  type="text"
                  value={form.tokenId}
                  onChange={e => setForm(f => ({ ...f, tokenId: e.target.value }))}
                  placeholder="e.g. tok_abc123"
                  className="w-full border border-rule bg-paper px-4 py-2.5 text-sm focus:outline-none focus:border-ink"
                />
              </div>
              <div>
                <label className="label block mb-1.5">Rating</label>
                <StarPicker value={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
              </div>
            </div>
            <div>
              <label className="label block mb-1.5">Comment (optional)</label>
              <textarea
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                rows={3}
                maxLength={500}
                placeholder="Customer's verbal feedback…"
                className="w-full border border-rule bg-paper px-4 py-2.5 text-sm focus:outline-none focus:border-ink resize-none"
              />
            </div>
            {recordError && <div className="p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{recordError}</div>}
            {recordSuccess && <div className="p-3 border border-success bg-success/5 text-success text-sm">Feedback recorded successfully.</div>}
            <button type="submit" disabled={recording} className="btn-primary text-sm">
              {recording ? 'Recording…' : 'Save feedback'}
            </button>
          </form>
        </div>
      )}

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
