import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { db, ref, onValue, off } from '../firebase.js';
import { apiNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead } from '../services/api.js';

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(ts).toLocaleDateString();
}

const TYPE_ICON = { queue: '🎫', message: '💬', system: '🔔', ml: '📈' };

export default function NotificationBell() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const navigate = useNavigate();
  const me = user?.username || staff?.username || null;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await apiNotifications();
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch { /* noop */ }
  }, []);

  // Initial load + real-time refresh via the content-free signal node.
  useEffect(() => {
    if (!me) return;
    load();
    const r = ref(db, `notificationSignals/${me}`);
    const cb = () => load();
    onValue(r, cb);
    return () => off(r, 'value', cb);
  }, [me, load]);

  // Close on outside click.
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!me) return null;

  const openItem = async (n) => {
    if (!n.read) {
      try { await apiMarkNotificationRead(n.id); } catch { /* noop */ }
      load();
    }
    if (n.link && n.link.startsWith('/')) { setOpen(false); navigate(n.link); }
  };

  const markAll = async () => {
    try { await apiMarkAllNotificationsRead(); } catch { /* noop */ }
    load();
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-graphite hover:text-ink transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <span className="text-base leading-none">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-paper text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] bg-paper border border-rule shadow-lg z-50">
          <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
            <span className="label">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs underline underline-offset-2 text-graphite hover:text-ink">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-rule">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-graphite text-center">You're all caught up.</p>
            ) : items.slice(0, 30).map(n => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-cream transition-colors ${n.read ? '' : 'bg-accent/5'}`}
              >
                <span className="text-base leading-none mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${n.read ? 'text-graphite' : 'font-medium text-ink'}`}>{n.title}</span>
                    <span className="text-[10px] text-graphite shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="text-xs text-graphite truncate mt-0.5">{n.body}</p>}
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="w-full px-4 py-2.5 text-xs text-center text-graphite hover:text-ink hover:bg-cream border-t border-rule transition-colors"
          >
            View all notifications →
          </button>
        </div>
      )}
    </div>
  );
}
