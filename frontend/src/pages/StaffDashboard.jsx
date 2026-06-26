import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useStaff } from '../context/StaffContext.jsx';
import { useQueueState } from '../hooks/useQueueState.js';
import { usePresence } from '../hooks/usePresence.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel, getServices } from '../utils/industry.js';
import { apiStaffCallNext, apiSkipToken, apiSetStaffTokenNote, apiStaffReferToken } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import LiveTimer from '../components/LiveTimer.jsx';

export default function StaffDashboard() {
  const { staff, logout } = useStaff();
  const cfg = useAppConfig();
  const { state, tokens, announcement } = useQueueState();
  const [busy, setBusy] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [showRefer, setShowRefer] = useState(false);
  const [referTo, setReferTo] = useState('');
  const [referReason, setReferReason] = useState('');
  const [referBusy, setReferBusy] = useState(false);

  usePresence(staff?.username, staff?.service);

  if (!staff) return <Navigate to="/staff/login" replace />;

  const myService = staff.service;
  const serviceLabel = getServiceLabel(myService, cfg.industry);
  const tokenList = Object.values(tokens || {});
  const isPriorityTier = (t) => t.priority === 'priority' || t.referred === true;

  // Counters this staff member can refer a patient to (everything except their own).
  const referOptions = getServices(cfg.industry).filter(s => s.id !== myService);

  const called = tokenList.find(t => t.status === 'called' && t.service === myService) || null;
  const waiting = tokenList
    .filter(t => t.status === 'waiting' && t.service === myService)
    .sort((a, b) => {
      const ap = isPriorityTier(a), bp = isPriorityTier(b);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return a.number - b.number;
    });

  const priorityWaiting = tokenList.filter(
    t => t.status === 'waiting' && isPriorityTier(t) && t.service !== myService
  );

  const isPaused = state?.status === 'paused';

  const handleCallNext = async () => {
    setBusy(true);
    setErr(null);
    setNote('');
    setNoteSaved(false);
    try {
      await apiStaffCallNext();
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === 'PRIORITY_BLOCKING') {
        setErr('Priority customers are waiting across other counters. Serve them first.');
      } else {
        setErr(e.response?.data?.error || 'Action failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    if (!called) return;
    if (!window.confirm('Mark this token as no-show?')) return;
    setSkipBusy(true);
    setErr(null);
    try {
      await apiSkipToken(called.id);
      setNote('');
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not skip.');
    } finally {
      setSkipBusy(false);
    }
  };

  const handleRefer = async () => {
    if (!called || !referTo) return;
    setReferBusy(true);
    setErr(null);
    try {
      await apiStaffReferToken(called.id, referTo, referReason.trim() || null);
      setShowRefer(false);
      setReferTo('');
      setReferReason('');
      setNote('');
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not refer this patient.');
    } finally {
      setReferBusy(false);
    }
  };

  const handleSaveNote = async () => {
    if (!called || !note.trim()) return;
    setNoteSaving(true);
    try {
      await apiSetStaffTokenNote(called.id, note.trim());
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch {
      // silently fail — note is non-critical
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Announcement */}
      {announcement?.message && (
        <div className="mb-6 p-4 border border-warn bg-warn/5 text-warn text-sm font-medium">
          {announcement.message}
        </div>
      )}

      {/* Priority alert from other services */}
      {priorityWaiting.length > 0 && (
        <div className="mb-6 p-4 border border-warn bg-warn/5 text-warn text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warn animate-pulse shrink-0" />
          {priorityWaiting.length} priority customer{priorityWaiting.length > 1 ? 's' : ''} waiting at other counters.
        </div>
      )}

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
          <Link to="/staff/profile" className="btn-secondary text-xs">Profile</Link>
          <button onClick={logout} className="btn-secondary text-xs">Sign out</button>
        </div>
      </div>

      {isPaused && (
        <div className="mb-6 p-4 border border-warn bg-warn/5 text-warn text-sm">
          Queue is paused. Contact admin to resume.
        </div>
      )}

      {/* Now serving */}
      <div className="border border-rule bg-cream p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="label">Now serving</div>
          {called && (
            <button
              onClick={handleSkip}
              disabled={skipBusy}
              className="text-xs text-graphite hover:text-accent underline underline-offset-2 disabled:opacity-40"
            >
              {skipBusy ? 'Marking…' : 'No-show / skip'}
            </button>
          )}
        </div>
        {called ? (
          <>
            <div className="flex items-center gap-6">
              <div className="font-display text-token leading-none tracking-tightest text-accent num">
                {String(called.number).padStart(2, '0')}
              </div>
              <div className="text-sm text-graphite">
                <span className="flex gap-1.5 mb-1">
                  {called.priority === 'priority' && (
                    <span className="text-xs text-warn font-medium">Priority</span>
                  )}
                  {called.referred && (
                    <span className="text-xs text-accent font-medium">Referred</span>
                  )}
                </span>
                {called.patientName && (
                  <span className="block text-ink font-medium mb-1">{called.patientName}</span>
                )}
                Called at {new Date(called.calledAt).toLocaleTimeString()}
                <div className="mt-1">
                  <span className="label block text-[10px]">Serving for</span>
                  <LiveTimer since={called.calledAt} className="text-ink font-medium" />
                </div>
                {called.referralReason && (
                  <div className="mt-1 text-xs text-graphite italic">Referral note: {called.referralReason}</div>
                )}
                {called.note && (
                  <div className="mt-1 text-xs text-graphite italic">Note: {called.note}</div>
                )}
              </div>
            </div>

            {/* Note input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
                placeholder="Add a note for this customer…"
                maxLength={120}
                className="flex-1 border border-rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-ink"
              />
              <button
                onClick={handleSaveNote}
                disabled={noteSaving || !note.trim()}
                className="btn-secondary text-xs px-3 disabled:opacity-40"
              >
                {noteSaved ? 'Saved!' : noteSaving ? '…' : 'Save'}
              </button>
            </div>

            {/* Refer / transfer this patient to another counter */}
            {referOptions.length > 0 && (
              <div className="mt-3">
                {!showRefer ? (
                  <button
                    onClick={() => setShowRefer(true)}
                    className="text-xs px-3 py-1.5 border border-accent/40 text-accent hover:bg-accent hover:text-paper transition-colors"
                  >
                    Refer to another counter →
                  </button>
                ) : (
                  <div className="border border-accent/30 bg-accent/5 p-3 space-y-2">
                    <span className="label block">Refer this patient to</span>
                    <select
                      value={referTo}
                      onChange={e => setReferTo(e.target.value)}
                      className="w-full border border-rule bg-paper px-2 py-1.5 text-sm focus:outline-none focus:border-ink"
                    >
                      <option value="">Select counter…</option>
                      {referOptions.map(s => (
                        <option key={s.id} value={s.id}>{getServiceLabel(s.id, cfg.industry)}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={referReason}
                      onChange={e => setReferReason(e.target.value)}
                      placeholder="Reason (optional) — e.g. needs eye exam"
                      maxLength={300}
                      className="w-full border border-rule bg-paper px-2 py-1.5 text-sm focus:outline-none focus:border-ink"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRefer}
                        disabled={referBusy || !referTo}
                        className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
                      >
                        {referBusy ? 'Referring…' : 'Refer'}
                      </button>
                      <button
                        onClick={() => { setShowRefer(false); setReferTo(''); setReferReason(''); }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-graphite text-center py-6">
            <div className="font-display text-5xl text-ash">—</div>
            <div className="mt-2 text-sm">No token currently called</div>
          </div>
        )}
      </div>

      {/* Next in queue */}
      {waiting.length > 0 && (
        <div className="mb-3 flex items-center justify-between px-4 py-3 border border-accent/30 bg-accent/5">
          <div>
            <span className="label block text-[10px] text-accent">Next in Queue</span>
            <span className="font-display text-2xl num">
              {getServiceLabel(myService, cfg.industry).slice(0, 1).toUpperCase()}-{String(waiting[0].number).padStart(3, '0')}
            </span>
          </div>
          <div className="text-right text-xs text-graphite">
            {waiting[0].patientName && <div className="text-ink font-medium">{waiting[0].patientName}</div>}
            {(waiting[0].priority === 'priority' || waiting[0].referred) && (
              <span className="text-accent font-medium">{waiting[0].referred ? 'Referred' : 'Priority'}</span>
            )}
          </div>
        </div>
      )}

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
              <div key={t.id} className={`px-4 py-3 flex items-center justify-between text-sm ${t.referred ? 'bg-accent/5' : t.priority === 'priority' ? 'bg-warn/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl num">{String(t.number).padStart(2, '0')}</span>
                  {t.priority === 'priority' && <span className="text-xs text-warn font-bold">P</span>}
                  {t.referred && <span className="text-xs text-accent font-bold" title="Referred">R</span>}
                  {t.patientName && <span className="text-xs text-ink truncate max-w-[120px]">{t.patientName}</span>}
                  {t.note && <span className="text-xs text-graphite italic truncate max-w-[120px]">{t.note}</span>}
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
