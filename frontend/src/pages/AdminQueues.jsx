import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiQueuesOverview, apiSetQueueEnabled, apiReorderQueues } from '../services/api.js';

function fmtWait(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.round(seconds / 60);
  return m < 60 ? `~${m}m` : `~${Math.floor(m / 60)}h ${m % 60}m`;
}

function QueueCard({ q, index, total, onToggle, onMove, busyId }) {
  const busy = busyId === q.id;
  const statusBadge = q.archived
    ? { text: 'Archived', cls: 'border-rule text-ash bg-cream' }
    : q.enabled
      ? { text: 'Active', cls: 'border-success/40 text-success bg-success/5' }
      : { text: 'Disabled', cls: 'border-warn/40 text-warn bg-warn/5' };

  return (
    <div className={`border p-4 bg-paper ${q.archived ? 'border-rule opacity-70' : 'border-rule'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-xl truncate">{q.label}</h3>
            <span className={`text-xs px-2 py-0.5 border ${statusBadge.cls}`}>{statusBadge.text}</span>
            {q.atCapacity && <span className="text-xs px-2 py-0.5 border border-accent/40 text-accent bg-accent/5">At capacity</span>}
          </div>
          <div className="mt-1 text-xs text-graphite font-mono">key: {q.key}{q.prefix ? ` · ${q.prefix}` : ''}</div>
        </div>
        {!q.archived && (
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => onMove(index, -1)} disabled={index === 0 || busy} className="text-xs px-1.5 border border-rule text-graphite hover:border-ink disabled:opacity-30" title="Move up">↑</button>
            <button onClick={() => onMove(index, 1)} disabled={index === total - 1 || busy} className="text-xs px-1.5 border border-rule text-graphite hover:border-ink disabled:opacity-30" title="Move down">↓</button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px bg-rule">
        <div className="bg-paper p-2 text-center">
          <div className="font-display text-2xl num">{q.waitingCount ?? 0}</div>
          <div className="label text-[10px]">Waiting</div>
        </div>
        <div className="bg-paper p-2 text-center">
          <div className="font-display text-2xl num text-accent">{q.nowServing != null ? String(q.nowServing).padStart(2, '0') : '—'}</div>
          <div className="label text-[10px]">Serving</div>
        </div>
        <div className="bg-paper p-2 text-center">
          <div className="font-display text-2xl num">{fmtWait(q.estimatedWaitSeconds)}</div>
          <div className="label text-[10px]">Est. wait</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!q.archived && (
          <button onClick={() => onToggle(q)} disabled={busy} className="btn-secondary text-xs px-3 disabled:opacity-40">
            {q.enabled ? 'Disable' : 'Enable'}
          </button>
        )}
        <Link to={`/admin/queues/${q.id}`} className="btn-primary text-xs px-3">Manage →</Link>
      </div>
    </div>
  );
}

export default function AdminQueues() {
  const { user } = useAuth();
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try { setQueues(await apiQueuesOverview()); setLoading(false); }
    catch (e) { setErr(e.response?.data?.error || 'Could not load queues.'); setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  if (!user) return <Navigate to="/admin/login" replace />;

  const run = async (fn, id = null) => {
    setBusyId(id);
    setErr(null);
    try { await fn(); await load(); }
    catch (e) { setErr(e.response?.data?.error || 'Action failed.'); }
    finally { setBusyId(null); }
  };

  const handleMove = async (index, dir) => {
    const active = queues.filter(q => !q.archived);
    const target = index + dir;
    if (target < 0 || target >= active.length) return;
    const reordered = [...active];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setQueues([...reordered, ...queues.filter(q => q.archived)]);
    await run(() => apiReorderQueues(reordered.map(q => q.id)));
  };

  const active = queues.filter(q => !q.archived);
  const archived = queues.filter(q => q.archived);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="label">Admin · Queue management</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Queues</h1>
          <p className="text-sm text-graphite mt-2 max-w-xl">
            The counters customers can take a token for. Create and manage them here — they live alongside your Industry Type.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="btn-secondary text-sm">← Dashboard</Link>
          <Link to="/admin/queues/new" className="btn-primary text-sm">+ New queue</Link>
        </div>
      </div>

      {err && <div className="mb-6 p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{err}</div>}

      {loading ? (
        <div className="py-20 text-center text-graphite animate-pulse">Loading queues…</div>
      ) : active.length === 0 && archived.length === 0 ? (
        <div className="py-16 text-center border border-rule bg-cream">
          <div className="font-display text-3xl text-ash">No custom queues yet</div>
          <p className="mt-2 text-sm text-graphite">Until you add one, customers see your Industry Type's default counters.</p>
          <Link to="/admin/queues/new" className="btn-primary text-sm mt-4 inline-block">Create your first queue</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((q, i) => (
              <QueueCard
                key={q.id} q={q} index={i} total={active.length}
                onToggle={(x) => run(() => apiSetQueueEnabled(x.id, !x.enabled), x.id)}
                onMove={handleMove}
                busyId={busyId}
              />
            ))}
          </div>

          {archived.length > 0 && (
            <div className="mt-10">
              <div className="label mb-3">Archived ({archived.length})</div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {archived.map((q, i) => (
                  <QueueCard key={q.id} q={q} index={i} total={archived.length} onToggle={() => {}} onMove={() => {}} busyId={busyId} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
