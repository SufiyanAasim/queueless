import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel } from '../utils/industry.js';
import { apiListAppointments, apiConfirmAppointment, apiCancelAppointment } from '../services/api.js';

const STATUS_STYLE = {
  pending:   'border-warn/40 text-warn bg-warn/5',
  confirmed: 'border-success/40 text-success bg-success/5',
  cancelled: 'border-rule text-ash bg-paper',
};

export default function AdminAppointments() {
  const { user } = useAuth();
  const cfg = useAppConfig();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);

  const reload = () => {
    apiListAppointments().then(data => { setAppointments(data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { if (user) reload(); }, [user]);

  if (!user) return <Navigate to="/admin/login" replace />;

  const filtered = appointments.filter(a => filter === 'all' || a.status === filter);
  const counts = { all: appointments.length, pending: 0, confirmed: 0, cancelled: 0 };
  appointments.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  const handleConfirm = async (id) => {
    setBusyId(id);
    try { await apiConfirmAppointment(id); reload(); } catch {} finally { setBusyId(null); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setBusyId(id);
    try { await apiCancelAppointment(id); reload(); } catch {} finally { setBusyId(null); }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 xl:px-10 py-10">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="label">Admin · Appointments</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Appointments</h1>
        </div>
        <Link to="/admin" className="btn-secondary text-sm">Back to dashboard</Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-rule pb-3">
        {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm capitalize transition-colors ${
              filter === f ? 'bg-ink text-paper' : 'text-graphite hover:text-ink'
            }`}
          >
            {f} <span className="ml-1 text-xs opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 text-center text-graphite">Loading appointments…</div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-rule">
          <div className="font-display text-3xl text-ash">No {filter !== 'all' ? filter : ''} appointments</div>
          <p className="mt-2 text-sm text-graphite">Customers can book at <code className="font-mono">/book</code>.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const isToday = a.date === today;
            const isPast = a.date < today;
            return (
              <div
                key={a.id}
                className={`border bg-paper p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  isToday ? 'border-accent/40' : 'border-rule'
                } ${a.status === 'cancelled' ? 'opacity-50' : ''}`}
              >
                {/* Date/time */}
                <div className="shrink-0 text-center sm:w-24">
                  <div className={`font-display text-2xl tracking-tightest ${isToday ? 'text-accent' : 'text-ink'}`}>
                    {a.timeSlot}
                  </div>
                  <div className={`text-xs mt-0.5 ${isToday ? 'text-accent font-medium' : 'text-graphite'}`}>
                    {isToday ? 'Today' : isPast ? 'Past · ' + a.date : a.date}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-graphite mt-0.5">
                    {getServiceLabel(a.service, cfg.industry)}
                    {a.phone && <span className="ml-3">{a.phone}</span>}
                    {a.email && <span className="ml-3">{a.email}</span>}
                  </div>
                </div>

                {/* Status + actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 border capitalize ${STATUS_STYLE[a.status] || ''}`}>
                    {a.status}
                  </span>
                  {a.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleConfirm(a.id)}
                        disabled={busyId === a.id}
                        className="text-xs text-success border border-success/40 px-3 py-1 hover:bg-success hover:text-paper transition-colors disabled:opacity-40"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleCancel(a.id)}
                        disabled={busyId === a.id}
                        className="text-xs text-graphite border border-rule px-3 py-1 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {a.status === 'confirmed' && !isPast && (
                    <button
                      onClick={() => handleCancel(a.id)}
                      disabled={busyId === a.id}
                      className="text-xs text-graphite border border-rule px-3 py-1 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
