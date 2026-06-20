import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStaff } from '../context/StaffContext.jsx';
import { useQueueState } from '../hooks/useQueueState.js';
import { usePresence } from '../hooks/usePresence.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel } from '../utils/industry.js';
import { apiStaffCallNext } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function StaffDashboard() {
  const { staff, logout } = useStaff();
  const cfg = useAppConfig();
  const { state, tokens } = useQueueState();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [lastCalled, setLastCalled] = useState(null);

  // Register presence so admin can see this staff member is online.
  usePresence(staff?.username, staff?.service);

  if (!staff) return <Navigate to="/staff/login" replace />;

  const myService = staff.service;
  const serviceLabel = getServiceLabel(myService, cfg.industry);
  const tokenList = Object.values(tokens || {});

  const called = tokenList.find(t => t.status === 'called' && t.service === myService) || null;
  const waiting = tokenList
    .filter(t => t.status === 'waiting' && t.service === myService)
    .sort((a, b) => {
      if (a.priority === 'priority' && b.priority !== 'priority') return -1;
      if (a.priority !== 'priority' && b.priority === 'priority') return 1;
      return a.number - b.number;
    });

  const isPaused = state?.status === 'paused';

  const handleCallNext = async () => {
    setBusy(true);
    setErr(null);
    try {
      const result = await apiStaffCallNext();
      if (result.called) setLastCalled(result.called);
      else setLastCalled(null);
    } catch (e) {
      setErr(e.response?.data?.error || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label">{cfg.orgName} · Staff</div>
          <h1 className="font-display text-4xl tracking-tightest leading-none mt-1">
            {staff.displayName || staff.username}
          </h1>
          <p className="text-sm text-graphite mt-1">Assigned: <span className="font-medium text-ink">{serviceLabel}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-success">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Online
          </span>
          <StatusBadge status={state?.status || 'running'} />
          <button onClick={logout} className="btn-secondary text-xs">Sign out</button>
        </div>
      </div>

      {isPaused && (
        <div className="mb-6 p-4 border border-warn bg-warn/5 text-warn text-sm">
          Queue is paused. Contact admin to resume.
        </div>
      )}

      {/* Now serving */}
      <div className="border border-rule bg-cream p-6 mb-6">
        <div className="label mb-4">Now serving</div>
        {called ? (
          <div className="flex items-center gap-6">
            <div className="font-display text-token leading-none tracking-tightest text-accent num">
              {String(called.number).padStart(2, '0')}
            </div>
            <div className="text-sm text-graphite">
              {called.priority === 'priority' && (
                <span className="block text-xs text-warn font-medium mb-1">Priority</span>
              )}
              Called at {new Date(called.calledAt).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="text-graphite text-center py-6">
            <div className="font-display text-5xl text-ash">—</div>
            <div className="mt-2 text-sm">No token currently called</div>
          </div>
        )}
      </div>

      {/* Call Next */}
      <button
        onClick={handleCallNext}
        disabled={busy || isPaused || waiting.length === 0}
        className="btn-primary w-full text-lg py-4 mb-2"
      >
        {busy ? 'Working…' : waiting.length === 0 ? 'No one waiting' : `Call Next — ${waiting.length} waiting`}
      </button>

      {err && <p className="text-accent text-sm mb-4">{err}</p>}

      {/* Waiting list */}
      <div className="mt-6">
        <div className="label mb-3">Waiting ({waiting.length})</div>
        {waiting.length === 0 ? (
          <div className="text-center py-10 text-graphite border border-rule">Queue is empty</div>
        ) : (
          <div className="border border-rule divide-y divide-rule bg-cream">
            {waiting.map((t, i) => (
              <div key={t.id} className={`px-4 py-3 flex items-center justify-between text-sm ${t.priority === 'priority' ? 'bg-warn/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl num">{String(t.number).padStart(2, '0')}</span>
                  {t.priority === 'priority' && <span className="text-xs text-warn font-bold">P</span>}
                </div>
                <span className="text-graphite font-mono text-xs">{new Date(t.issuedAt).toLocaleTimeString()}</span>
                <span className="font-medium">#{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
