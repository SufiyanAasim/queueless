import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiAuditLog } from '../services/api.js';

const ACTION_LABEL = {
  'admin.created': 'Admin created',
  'admin.deleted': 'Admin deleted',
  'staff.deleted': 'Staff removed',
  'queue.deleted': 'Queue deleted',
  'share.created': 'Share created',
  'share.revoked': 'Share revoked',
};

export default function AdminAudit() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiAuditLog()
      .then(setItems)
      .catch(e => setErr(e.response?.data?.error || 'Could not load activity.'))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label">Admin · Activity</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Audit log</h1>
          <p className="text-sm text-graphite mt-2">A record of sensitive actions across the workspace.</p>
        </div>
        <Link to="/admin" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      {err && <div className="mb-6 p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{err}</div>}

      {loading ? (
        <div className="py-16 text-center text-graphite animate-pulse">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center border border-rule bg-cream">
          <div className="font-display text-3xl text-ash">No activity yet</div>
        </div>
      ) : (
        <div className="border border-rule divide-y divide-rule">
          {items.map(e => (
            <div key={e.id} className="px-4 py-3 flex items-center gap-4 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{ACTION_LABEL[e.action] || e.action}</span>
                {e.target && <span className="text-graphite"> · {e.target}</span>}
                <div className="text-xs text-graphite mt-0.5">by {e.actor}</div>
              </div>
              <span className="text-xs text-graphite shrink-0 font-mono">{new Date(e.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
