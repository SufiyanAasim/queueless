import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { db, ref, onValue, off } from '../firebase.js';
import { apiNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead } from '../services/api.js';

const TYPE_ICON = { queue: '🎫', message: '💬', system: '🔔', ml: '📈' };
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'queue', label: 'Queues' },
  { key: 'message', label: 'Messages' },
  { key: 'system', label: 'System' },
];

function fullTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Notifications() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const navigate = useNavigate();
  const me = user?.username || staff?.username || null;

  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiNotifications();
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!me) return;
    load();
    const r = ref(db, `notificationSignals/${me}`);
    const cb = () => load();
    onValue(r, cb);
    return () => off(r, 'value', cb);
  }, [me, load]);

  if (!user && !staff) return <Navigate to="/admin/login" replace />;

  const filtered = items.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.read : n.type === filter);

  const openItem = async (n) => {
    if (!n.read) { try { await apiMarkNotificationRead(n.id); } catch { /* noop */ } load(); }
    if (n.link && n.link.startsWith('/')) navigate(n.link);
  };

  const markAll = async () => { try { await apiMarkAllNotificationsRead(); } catch { /* noop */ } load(); };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label">Notification Center</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Notifications</h1>
          <p className="text-sm text-graphite mt-2">{unread > 0 ? `${unread} unread` : 'You’re all caught up.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={user ? '/admin' : '/staff'} className="btn-secondary text-sm">← Back</Link>
          {unread > 0 && <button onClick={markAll} className="btn-primary text-sm">Mark all read</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-sm px-3 py-1.5 border transition-colors ${filter === f.key ? 'bg-ink text-paper border-ink' : 'border-rule text-graphite hover:border-ink hover:text-ink'}`}>
            {f.label}
            {f.key === 'unread' && unread > 0 && <span className="ml-1.5 text-xs">({unread})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-graphite animate-pulse">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-rule bg-cream">
          <div className="font-display text-3xl text-ash">Nothing here</div>
          <p className="mt-2 text-sm text-graphite">No {filter === 'all' ? '' : filter} notifications.</p>
        </div>
      ) : (
        <div className="border border-rule divide-y divide-rule">
          {filtered.map(n => (
            <button key={n.id} onClick={() => openItem(n)}
              className={`w-full text-left px-4 py-4 flex gap-4 hover:bg-cream transition-colors ${n.read ? '' : 'bg-accent/5'}`}>
              <span className="text-xl leading-none mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm ${n.read ? 'text-graphite' : 'font-semibold text-ink'}`}>{n.title}</span>
                  <span className="text-[11px] text-graphite shrink-0">{fullTime(n.createdAt)}</span>
                </div>
                {n.body && <p className="text-sm text-graphite mt-0.5">{n.body}</p>}
                <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide text-graphite border border-rule px-1.5 py-0.5">{n.type}</span>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
