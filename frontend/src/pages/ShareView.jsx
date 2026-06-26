import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiGetShare } from '../services/api.js';

function fmtWait(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.round(seconds / 60);
  return m < 60 ? `~${m}m` : `~${Math.floor(m / 60)}h ${m % 60}m`;
}

function Snapshot({ share }) {
  const d = share.data || {};
  if (share.type === 'analytics' || share.type === 'queue_snapshot') {
    const stats = [
      ['Total issued', d.totalIssued],
      ['Waiting now', d.waitingCount],
      ['Now serving', d.nowServing != null ? `#${d.nowServing}` : '—'],
      ['Est. wait', d.estimatedWaitSeconds != null ? fmtWait(d.estimatedWaitSeconds) : (d.avgWaitSeconds != null ? `${Math.round(d.avgWaitSeconds / 60)}m` : '—')],
    ].filter(([, v]) => v !== undefined);
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-paper p-5 text-center">
            <div className="font-display text-3xl num">{value ?? '—'}</div>
            <div className="label text-[10px] mt-1">{label}</div>
          </div>
        ))}
      </div>
    );
  }
  if (share.type === 'token') {
    return (
      <div className="text-center py-6">
        <div className="font-display text-7xl tracking-tightest num text-accent">{d.number != null ? String(d.number).padStart(2, '0') : '—'}</div>
        <div className="mt-3 text-sm text-graphite">{d.service || ''} · {d.status || ''}</div>
      </div>
    );
  }
  return <pre className="text-xs bg-cream border border-rule p-4 overflow-auto">{JSON.stringify(d, null, 2)}</pre>;
}

export default function ShareView() {
  const { id } = useParams();
  const [share, setShare] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetShare(id)
      .then(setShare)
      .catch(e => setErr(e.response?.status === 410 ? 'This shared link has expired.' : 'Shared item not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-20 text-center text-graphite animate-pulse">Loading…</div>;
  if (err) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="font-display text-3xl text-ash">{err}</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="label">QueueLess · Shared</div>
        <button onClick={() => window.print()} className="btn-secondary text-sm">Print</button>
      </div>
      <h1 className="font-display text-4xl tracking-tightest leading-none mb-2">{share.title}</h1>
      <p className="text-xs text-graphite mb-8">Snapshot · {new Date(share.createdAt).toLocaleString()}</p>
      <Snapshot share={share} />
      <p className="mt-8 text-[11px] text-graphite">Read-only snapshot shared via a secure link. Live data may differ.</p>
    </div>
  );
}
