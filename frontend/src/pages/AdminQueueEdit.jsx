import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  apiGetQueue, apiUpdateQueue, apiSetQueueEnabled, apiArchiveQueue, apiDeleteQueue,
  apiListStaff, apiAssignStaffQueue, apiQueueAnalytics,
} from '../services/api.js';
import QueueForm, { formToPayload } from '../components/QueueForm.jsx';
import ShareDialog from '../components/ShareDialog.jsx';

function QueueAnalytics({ queueId }) {
  const [data, setData] = useState(null);
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    let active = true;
    apiQueueAnalytics(queueId).then(d => { if (active) setData(d); }).catch(() => {});
    return () => { active = false; };
  }, [queueId]);

  if (!data) return null;
  const hours = Object.entries(data.peakHours || {}).map(([h, n]) => ({ h: Number(h), n })).sort((a, b) => a.h - b.h);
  const max = Math.max(...hours.map(x => x.n), 1);
  const fmt12 = (h) => h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-2xl tracking-tightest">Queue analytics</h2>
        <button onClick={() => setSharing(true)} className="btn-secondary text-xs">Share snapshot</button>
      </div>
      <p className="text-sm text-graphite mb-4">Lifetime activity for this counter.</p>
      {sharing && (
        <ShareDialog
          payload={{ type: 'analytics', title: `${data.label} — snapshot`, data: {
            label: data.label, totalIssued: data.totalIssued, waitingCount: data.waitingCount,
            nowServing: data.nowServing, avgWaitSeconds: data.avgWaitSeconds, estimatedWaitSeconds: data.estimatedWaitSeconds,
          } }}
          onClose={() => setSharing(false)}
        />
      )}
      <div className="grid grid-cols-3 gap-px bg-rule mb-5">
        <div className="bg-paper p-4 text-center"><div className="font-display text-2xl num">{data.totalIssued}</div><div className="label text-[10px] mt-1">Total issued</div></div>
        <div className="bg-paper p-4 text-center"><div className="font-display text-2xl num">{data.waitingCount}</div><div className="label text-[10px] mt-1">Waiting now</div></div>
        <div className="bg-paper p-4 text-center"><div className="font-display text-2xl num">{Math.round((data.avgWaitSeconds || 0) / 60)}m</div><div className="label text-[10px] mt-1">Avg wait</div></div>
      </div>
      {hours.length > 0 ? (
        <div className="border border-rule bg-cream p-4">
          <div className="label mb-3">Peak hours</div>
          <div className="flex items-end gap-1 h-28">
            {hours.map(({ h, n }) => (
              <div key={h} className="flex-1 flex flex-col items-center justify-end" title={`${fmt12(h)}: ${n}`}>
                <div className="w-full bg-accent/70" style={{ height: `${(n / max) * 100}%` }} />
                <span className="text-[9px] text-graphite mt-1">{fmt12(h)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-graphite">No activity recorded for this queue yet.</p>
      )}
    </div>
  );
}

function StaffAssignment({ queue }) {
  const [staff, setStaff] = useState([]);
  const [assignUser, setAssignUser] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try { setStaff(await apiListStaff()); } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const assigned = staff.filter(m => m.service === queue.key);
  const others = staff.filter(m => m.service !== queue.key);

  const assign = async (username) => {
    if (!username) return;
    setBusy(true); setErr(null);
    try { await apiAssignStaffQueue(username, queue.key); setAssignUser(''); await load(); }
    catch (e) { setErr(e.response?.data?.error || 'Could not assign staff.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-10">
      <h2 className="font-display text-2xl tracking-tightest mb-1">Assigned staff</h2>
      <p className="text-sm text-graphite mb-4">Operators who serve this queue. A staff member serves one queue at a time.</p>

      <div className="border border-rule bg-cream divide-y divide-rule">
        {assigned.length === 0 ? (
          <div className="px-4 py-4 text-sm text-graphite">No staff assigned to this queue yet.</div>
        ) : assigned.map(m => (
          <div key={m.username} className="px-4 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${m.online ? 'bg-success' : 'bg-rule'}`} />
              <span className="font-medium">{m.displayName || m.username}</span>
              <span className="text-graphite text-xs">@{m.username}</span>
            </div>
            <span className="text-xs text-graphite">{m.online ? 'Online' : 'Offline'}</span>
          </div>
        ))}
      </div>

      {/* Assign another staff member to this queue */}
      <div className="mt-3 flex gap-2">
        <select
          value={assignUser}
          onChange={e => setAssignUser(e.target.value)}
          className="flex-1 border border-rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-ink"
        >
          <option value="">Assign another staff member…</option>
          {others.map(m => (
            <option key={m.username} value={m.username}>
              {(m.displayName || m.username)} — currently: {m.service || 'unassigned'}
            </option>
          ))}
        </select>
        <button onClick={() => assign(assignUser)} disabled={busy || !assignUser} className="btn-primary text-sm px-4 disabled:opacity-40">
          {busy ? 'Assigning…' : 'Assign'}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-accent">{err}</p>}
    </div>
  );
}

function fmtWait(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.round(seconds / 60);
  return m < 60 ? `~${m}m` : `~${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function AdminQueueEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try { setQueue(await apiGetQueue(id)); }
    catch (e) { setError(e.response?.data?.error || 'Queue not found.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (!user) return <Navigate to="/admin/login" replace />;

  const act = async (fn, after) => {
    setBusy(true);
    setError(null);
    try { const r = await fn(); after?.(r); return true; }
    catch (e) { setError(e.response?.data?.error || 'Action failed.'); return false; }
    finally { setBusy(false); }
  };

  const handleSave = async (form) => {
    const ok = await act(() => apiUpdateQueue(id, formToPayload(form)), () => { setSaved(true); setTimeout(() => setSaved(false), 1800); load(); });
    return ok;
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${queue.label}" permanently? Queues with active tokens are protected — archive instead.`)) return;
    const ok = await act(() => apiDeleteQueue(id));
    if (ok) navigate('/admin/queues');
  };

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-20 text-center text-graphite animate-pulse">Loading queue…</div>;
  if (!queue) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="text-warn text-sm mb-4">{error || 'Queue not found.'}</div>
      <Link to="/admin/queues" className="btn-secondary text-sm">← Back to Queues</Link>
    </div>
  );

  const statusBadge = queue.archived
    ? { text: 'Archived', cls: 'border-rule text-ash bg-cream' }
    : queue.enabled
      ? { text: 'Active', cls: 'border-success/40 text-success bg-success/5' }
      : { text: 'Disabled', cls: 'border-warn/40 text-warn bg-warn/5' };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="label mb-3">
        <Link to="/admin/queues" className="hover:text-ink">Queues</Link> · Manage
      </div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-5xl tracking-tightest leading-none">{queue.label}</h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 border ${statusBadge.cls}`}>{statusBadge.text}</span>
            {queue.atCapacity && <span className="text-xs px-2 py-0.5 border border-accent/40 text-accent bg-accent/5">At capacity</span>}
            <span className="text-xs text-graphite font-mono">key: {queue.key}{queue.prefix ? ` · ${queue.prefix}` : ''}</span>
          </div>
        </div>
        <Link to="/admin/queues" className="btn-secondary text-sm">← All queues</Link>
      </div>

      {/* Live stats */}
      <div className="mt-8 grid grid-cols-3 gap-px bg-rule">
        <div className="bg-paper p-5 text-center">
          <div className="font-display text-3xl num">{queue.waitingCount ?? 0}</div>
          <div className="label text-[10px] mt-1">Waiting</div>
        </div>
        <div className="bg-paper p-5 text-center">
          <div className="font-display text-3xl num text-accent">{queue.nowServing != null ? String(queue.nowServing).padStart(2, '0') : '—'}</div>
          <div className="label text-[10px] mt-1">Now serving</div>
        </div>
        <div className="bg-paper p-5 text-center">
          <div className="font-display text-3xl num">{fmtWait(queue.estimatedWaitSeconds)}</div>
          <div className="label text-[10px] mt-1">Est. wait</div>
        </div>
      </div>

      {/* Quick actions */}
      {!queue.archived && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => act(() => apiSetQueueEnabled(id, !queue.enabled), load)} disabled={busy} className="btn-secondary text-sm disabled:opacity-40">
            {queue.enabled ? 'Disable queue' : 'Enable queue'}
          </button>
          <button onClick={() => act(() => apiArchiveQueue(id), load)} disabled={busy} className="btn-secondary text-sm disabled:opacity-40">
            Archive
          </button>
        </div>
      )}

      {/* Edit form */}
      {!queue.archived && (
        <div className="mt-10">
          <h2 className="font-display text-2xl tracking-tightest mb-1">Settings</h2>
          {saved && <p className="text-success text-sm mb-3">Saved.</p>}
          <div className="mt-4 border border-rule bg-cream p-6">
            <QueueForm
              initial={{
                label: queue.label,
                prefix: queue.prefix || '',
                capacity: queue.capacity ?? '',
                avgServiceSeconds: queue.avgServiceSeconds ?? '',
                open: queue.workingHours?.open || '',
                close: queue.workingHours?.close || '',
              }}
              onSubmit={handleSave}
              onCancel={() => navigate('/admin/queues')}
              busy={busy}
              submitLabel="Save changes"
              error={error}
            />
          </div>
        </div>
      )}

      {/* Per-queue analytics */}
      <QueueAnalytics queueId={id} />

      {/* Assigned staff */}
      {!queue.archived && <StaffAssignment queue={queue} />}

      {/* Danger zone */}
      <div className="mt-12 border border-accent/40 bg-accent/5 p-6">
        <h2 className="font-display text-xl text-accent-deep">Danger zone</h2>
        <p className="text-sm text-graphite mt-2">
          Deleting a queue is permanent. Queues that still have waiting or in-service tokens are protected —
          archive them instead, which hides the queue while preserving history.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {!queue.archived && (
            <button onClick={() => act(() => apiArchiveQueue(id), load)} disabled={busy} className="btn-secondary text-sm disabled:opacity-40">
              Archive instead
            </button>
          )}
          <button onClick={handleDelete} disabled={busy} className="btn-danger text-sm disabled:opacity-40">
            {busy ? 'Working…' : 'Delete this queue'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
      </div>
    </div>
  );
}
