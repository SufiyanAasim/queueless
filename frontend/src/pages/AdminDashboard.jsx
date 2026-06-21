import { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useQueueState } from '../hooks/useQueueState.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServices, getServiceLabel } from '../utils/industry.js';
import { apiCallNext, apiCallNextPriority, apiSkipToken, apiPause, apiResume, apiReset, apiStartAutoMode, apiStopAutoMode, apiActiveQueue, apiSetAnnouncement, apiClearAnnouncement, apiSetAdminTokenNote, apiPauseService, apiResumeService } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Stat from '../components/Stat.jsx';

function ServingNowCard({ token, industry, onSkip, skipBusy }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <span className="label">Now serving</span>
        {token && <StatusBadge status="called" />}
      </div>
      {token ? (
        <>
          <div className="font-display text-token-lg leading-none tracking-tightest text-accent num">
            {String(token.number).padStart(2, '0')}
          </div>
          {token.priority === 'priority' && (
            <span className="mt-2 inline-block text-xs px-2 py-0.5 bg-warn/10 text-warn border border-warn/30 font-medium">Priority</span>
          )}
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="label block">Service</span>
              <span>{getServiceLabel(token.service, industry)}</span>
            </div>
            <div>
              <span className="label block">Called</span>
              <span>{new Date(token.calledAt).toLocaleTimeString()}</span>
            </div>
          </div>
          <button
            onClick={() => onSkip(token.id)}
            disabled={skipBusy}
            className="mt-4 text-xs text-graphite hover:text-accent underline underline-offset-2 disabled:opacity-40"
          >
            {skipBusy ? 'Marking…' : 'No-show / skip this token'}
          </button>
        </>
      ) : (
        <div className="py-12 text-center text-graphite">
          <div className="font-display text-6xl tracking-tightest text-ash">—</div>
          <div className="mt-4 text-sm">No token currently being served.</div>
        </div>
      )}
    </div>
  );
}

function WaitingList({ tokens, industry }) {
  if (tokens.length === 0) {
    return (
      <div className="card text-center py-12 text-graphite">
        <div className="font-display text-3xl text-ash">No one waiting</div>
        <div className="mt-2 text-sm">The queue is empty.</div>
      </div>
    );
  }
  return (
    <div className="border border-rule">
      <div className="px-4 py-3 bg-ink text-paper text-xs tracking-[0.18em] uppercase font-medium grid grid-cols-12 gap-3">
        <div className="col-span-2">#</div>
        <div className="col-span-5">Service</div>
        <div className="col-span-3">Issued</div>
        <div className="col-span-2 text-right">Pos</div>
      </div>
      <div className="divide-y divide-rule bg-cream max-h-[360px] overflow-y-auto">
        {tokens.map((t, i) => (
          <div
            key={t.id}
            className={`px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm hover:bg-paper transition-colors ${t.priority === 'priority' ? 'bg-warn/5' : ''}`}
          >
            <div className="col-span-2 font-display text-2xl num">{String(t.number).padStart(2, '0')}</div>
            <div className="col-span-5 text-graphite flex items-center gap-1.5">
              {t.priority === 'priority' && (
                <span className="text-xs text-warn font-bold" title="Priority">P</span>
              )}
              {getServiceLabel(t.service, industry)}
            </div>
            <div className="col-span-3 font-mono text-xs text-graphite">
              {new Date(t.issuedAt).toLocaleTimeString()}
            </div>
            <div className="col-span-2 text-right font-medium">{i + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriorityQueueSection({ tokens, calledByService, industry, onCallNextPriority, onSkip, busy, skipBusy, isPaused }) {
  const priorityCalled = Object.values(calledByService).find(t => t?.priority === 'priority') || null;
  return (
    <div className="mb-8 border-2 border-warn bg-warn/5 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-warn font-medium text-sm tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-warn animate-pulse" />
            Priority Queue
          </span>
          <span className="text-xs text-warn/70 border border-warn/30 px-2 py-0.5">
            {tokens.length} waiting · General queues paused
          </span>
        </div>
        <button
          onClick={onCallNextPriority}
          disabled={busy || isPaused || tokens.length === 0}
          className="px-5 py-2 text-sm font-medium bg-warn text-paper border border-warn hover:bg-warn/90 disabled:opacity-40 transition-colors"
        >
          {busy ? 'Working…' : 'Call Next Priority'}
        </button>
      </div>

      {priorityCalled && (
        <div className="mb-4 p-4 bg-warn/10 border border-warn/30 flex items-center gap-4">
          <div>
            <span className="label text-xs text-warn/70">Now serving (priority)</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-display text-4xl num text-warn">{String(priorityCalled.number).padStart(2, '0')}</span>
              <div className="text-sm">
                <div className="font-medium">{getServiceLabel(priorityCalled.service, industry)}</div>
                <div className="text-xs text-graphite">Called {new Date(priorityCalled.calledAt).toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => onSkip(priorityCalled.id)}
            disabled={skipBusy}
            className="ml-auto text-xs text-graphite hover:text-accent underline underline-offset-2 disabled:opacity-40"
          >
            {skipBusy ? 'Marking…' : 'No-show / skip'}
          </button>
        </div>
      )}

      {tokens.length > 0 ? (
        <div className="border border-warn/30">
          <div className="px-4 py-2.5 bg-warn/10 text-warn text-xs tracking-[0.18em] uppercase font-medium grid grid-cols-12 gap-3">
            <div className="col-span-2">#</div>
            <div className="col-span-5">Service</div>
            <div className="col-span-3">Issued</div>
            <div className="col-span-2 text-right">Pos</div>
          </div>
          <div className="divide-y divide-warn/20 max-h-[240px] overflow-y-auto">
            {tokens.map((t, i) => (
              <div key={t.id} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm bg-paper hover:bg-warn/5 transition-colors">
                <div className="col-span-2 font-display text-2xl num text-warn">{String(t.number).padStart(2, '0')}</div>
                <div className="col-span-5 font-medium">{getServiceLabel(t.service, industry)}</div>
                <div className="col-span-3 font-mono text-xs text-graphite">{new Date(t.issuedAt).toLocaleTimeString()}</div>
                <div className="col-span-2 text-right font-medium text-warn">{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-warn/60 text-sm border border-warn/20">
          No priority tokens in queue.
        </div>
      )}
    </div>
  );
}

function QueueColumn({ service, called, waiting, onCallNext, onSkip, busy, skipBusy, isPaused, industry, priorityBlocked, isServicePaused, onPauseService, onResumeService, pausingService }) {
  const title = getServiceLabel(service.id, industry);
  const toggling = pausingService === service.id;
  return (
    <div className={`flex flex-col gap-4 ${priorityBlocked ? 'opacity-60' : ''}`}>
      <div className={`flex items-center justify-between border-b pb-2 ${isServicePaused ? 'border-warn/40' : 'border-rule'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className={`font-display text-xl ${isServicePaused ? 'text-graphite' : ''}`}>{title}</h2>
          {isServicePaused && (
            <span className="text-xs px-1.5 py-0.5 border border-warn/50 text-warn bg-warn/5 shrink-0">PAUSED</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-graphite">{waiting.length} waiting</span>
          <button
            onClick={isServicePaused ? onResumeService : onPauseService}
            disabled={toggling}
            className="text-xs px-2 py-0.5 border border-rule text-graphite hover:border-ink hover:text-ink transition-colors disabled:opacity-40"
          >
            {toggling ? '…' : isServicePaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
      <ServingNowCard token={called} industry={industry} onSkip={onSkip} skipBusy={skipBusy} />
      {isServicePaused ? (
        <div className="w-full text-center py-2.5 text-xs text-warn border border-warn/40 bg-warn/5">
          This service is paused
        </div>
      ) : priorityBlocked ? (
        <div className="w-full text-center py-2.5 text-xs text-warn border border-warn/40 bg-warn/5">
          Paused — serve priority customers first
        </div>
      ) : (
        <button
          onClick={onCallNext}
          disabled={busy || isPaused || waiting.length === 0}
          className="btn-primary w-full"
        >
          {busy ? 'Working…' : `Call Next`}
        </button>
      )}
      <WaitingList tokens={waiting} industry={industry} />
    </div>
  );
}

function AutoModePanel({ services, isPaused, queueState }) {
  const [autoOn, setAutoOn] = useState(false);
  const [intervalSecs, setIntervalSecs] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const am = queueState?.autoMode;
    if (am?.enabled && !autoOn) {
      setAutoOn(true);
      setIntervalSecs(am.intervalSeconds);
    } else if (!am?.enabled && autoOn) {
      setAutoOn(false);
      clearInterval(countdownRef.current);
      setCountdown(null);
    }
  }, [queueState, autoOn]);

  useEffect(() => {
    if (autoOn && intervalSecs) {
      setCountdown(intervalSecs);
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) return intervalSecs;
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [autoOn, intervalSecs]);

  const toggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (autoOn) {
        await apiStopAutoMode();
        setAutoOn(false);
        setIntervalSecs(null);
        clearInterval(countdownRef.current);
        setCountdown(null);
      } else {
        const serviceIds = services.map(s => s.id);
        const result = await apiStartAutoMode(serviceIds);
        setAutoOn(true);
        setIntervalSecs(result.intervalSeconds);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to toggle auto mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-5 border transition-colors ${autoOn ? 'border-success bg-success/5' : 'border-rule bg-cream'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-sm">AI Auto Mode</div>
          <p className="text-xs text-graphite mt-1 max-w-xs">
            {autoOn
              ? `Automatically calling the next token every ${intervalSecs}s — optimised from your historical data.`
              : 'Let the system call tokens automatically using ML-predicted intervals from your traffic history.'}
          </p>
          {autoOn && countdown !== null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-24 h-1.5 bg-rule rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all duration-1000"
                  style={{ width: `${((intervalSecs - countdown) / intervalSecs) * 100}%` }}
                />
              </div>
              <span className="text-xs text-graphite font-mono">next call in {countdown}s</span>
            </div>
          )}
        </div>
        <button
          onClick={toggle}
          disabled={loading || isPaused}
          className={`shrink-0 px-4 py-2 text-sm border transition-colors ${
            autoOn
              ? 'border-accent text-accent hover:bg-accent hover:text-paper'
              : 'border-success text-success hover:bg-success hover:text-paper'
          } disabled:opacity-40`}
        >
          {loading ? '…' : autoOn ? 'Stop Auto' : 'Enable Auto Mode'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
      {isPaused && <p className="mt-2 text-xs text-warn">Resume the queue to use Auto Mode.</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { state: fbState, tokens: fbTokens, announcement: fbAnnouncement, error: fbError, loading: fbLoading } = useQueueState();
  const cfg = useAppConfig();
  const [busy, setBusy] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [pausingService, setPausingService] = useState(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementBusy, setAnnouncementBusy] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // REST API fallback: if Firebase returns a permission error (rules not yet deployed)
  // or returns no data, poll the backend directly every 4 seconds.
  const [restData, setRestData] = useState(null);
  // Firebase is working once it finishes loading AND has no error.
  // During the initial load (fbLoading true) we don't switch to REST yet.
  const firebaseWorking = fbLoading || (!fbError && fbState !== null);

  useEffect(() => {
    if (firebaseWorking) return; // Firebase is fine, no need to poll
    const poll = async () => {
      try {
        const data = await apiActiveQueue();
        setRestData(data);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [firebaseWorking]);

  // Use Firebase data when available, fall back to REST poll
  const state  = firebaseWorking ? fbState  : restData?.state  ?? null;
  const tokensObj = firebaseWorking ? fbTokens : (() => {
    const all = [...(restData?.waiting || []), ...(restData ? Object.values(restData.nowServing || {}) : [])];
    return all.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
  })();

  if (!user) return <Navigate to="/admin/login" replace />;

  const services = getServices(cfg.industry);
  const tokenList = Object.values(tokensObj || {});
  const isPaused = state?.status === 'paused';
  const servedCount = tokenList.filter(t => t.status === 'served').length;
  const expiredCount = tokenList.filter(t => t.status === 'expired').length;
  const priorityWaitingTokens = tokenList
    .filter(t => t.status === 'waiting' && t.priority === 'priority')
    .sort((a, b) => a.number - b.number);
  const priorityWaiting = priorityWaitingTokens.length;
  // When any priority token is waiting, general (non-priority) queues are blocked.
  const priorityBlocked = priorityWaiting > 0;

  const waitingByService = {};
  const calledByService = {};
  services.forEach(s => {
    waitingByService[s.id] = tokenList
      .filter(t => t.status === 'waiting' && t.service === s.id)
      .sort((a, b) => {
        if (a.priority === 'priority' && b.priority !== 'priority') return -1;
        if (a.priority !== 'priority' && b.priority === 'priority') return 1;
        return a.number - b.number;
      });
    calledByService[s.id] = tokenList.find(t => t.status === 'called' && t.service === s.id) || null;
  });

  const totalWaiting = Object.values(waitingByService).reduce((s, arr) => s + arr.length, 0);

  const run = async (fn, confirm) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setErr(null);
    try { await fn(); }
    catch (e) { setErr(e.response?.data?.error || 'Action failed.'); }
    finally { setBusy(false); }
  };

  const handleSkip = async (tokenId) => {
    if (!window.confirm('Mark this token as no-show and remove it from the queue?')) return;
    setSkipBusy(true);
    setErr(null);
    try { await apiSkipToken(tokenId); }
    catch (e) { setErr(e.response?.data?.error || 'Could not skip token.'); }
    finally { setSkipBusy(false); }
  };

  const handleSetAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setAnnouncementBusy(true);
    try { await apiSetAnnouncement(announcementText.trim()); }
    catch {}
    finally { setAnnouncementBusy(false); }
  };

  const handleClearAnnouncement = async () => {
    setAnnouncementBusy(true);
    try { await apiClearAnnouncement(); setAnnouncementText(''); }
    catch {}
    finally { setAnnouncementBusy(false); }
  };

  const handleSaveNote = async () => {
    if (!noteTarget || !noteText.trim()) return;
    setNoteBusy(true);
    try {
      await apiSetAdminTokenNote(noteTarget, noteText.trim());
      setNoteSaved(true);
      setTimeout(() => { setNoteSaved(false); setNoteTarget(null); setNoteText(''); }, 1500);
    } catch {}
    finally { setNoteBusy(false); }
  };

  const handlePauseService = async (serviceId) => {
    setPausingService(serviceId);
    try { await apiPauseService(serviceId); }
    catch (e) { setErr(e.response?.data?.error || 'Could not pause service.'); }
    finally { setPausingService(null); }
  };

  const handleResumeService = async (serviceId) => {
    setPausingService(serviceId);
    try { await apiResumeService(serviceId); }
    catch (e) { setErr(e.response?.data?.error || 'Could not resume service.'); }
    finally { setPausingService(null); }
  };

  // SLA alert: tokens waiting longer than cfg.slaMinutes
  const pausedServices = state?.pausedServices || [];
  const slaOverdueTokens = cfg.slaMinutes
    ? tokenList.filter(t => t.status === 'waiting' && (Date.now() - t.issuedAt) / 60000 > cfg.slaMinutes)
    : [];

  // Token lookup — filter all tokens by number or partial ID
  const lookupResults = lookupQuery.trim()
    ? tokenList.filter(t => {
        const q = lookupQuery.trim().toLowerCase();
        return String(t.number).includes(q) || t.id.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q);
      }).sort((a, b) => b.issuedAt - a.issuedAt).slice(0, 10)
    : [];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <div className="label">{cfg.orgName} · Admin dashboard</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Queue control</h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/admin/appointments" className="btn-secondary text-sm">Appointments</Link>
          <Link to="/admin/feedback" className="btn-secondary text-sm">Feedback</Link>
          <Link to="/admin/report" className="btn-secondary text-sm">Report</Link>
          <StatusBadge status={state?.status || 'running'} />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule mb-6">
        <div className="bg-paper p-5"><Stat label="Waiting" value={totalWaiting} /></div>
        <div className="bg-paper p-5"><Stat label="Now serving" value={state?.currentTokenNumber || '—'} accent /></div>
        <div className="bg-paper p-5"><Stat label="Served today" value={servedCount} /></div>
        <div className="bg-paper p-5"><Stat label="Priority waiting" value={priorityWaiting} /></div>
      </div>

      {/* SLA alert bar */}
      {slaOverdueTokens.length > 0 && (
        <div className="mb-6 px-4 py-3 border border-warn/60 bg-warn/10 text-warn text-sm flex items-center gap-2">
          <span>&#9888;</span>
          <span>{slaOverdueTokens.length} token{slaOverdueTokens.length !== 1 ? 's' : ''} have exceeded the {cfg.slaMinutes}-minute wait target</span>
        </div>
      )}

      {/* Auto Mode */}
      <div className="mb-6">
        <AutoModePanel services={services} isPaused={isPaused} queueState={state} />
      </div>

      {/* Action bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        {!isPaused ? (
          <button onClick={() => run(apiPause)} disabled={busy} className="btn-secondary">Pause queue</button>
        ) : (
          <button onClick={() => run(apiResume)} disabled={busy} className="btn-secondary">Resume queue</button>
        )}
        <button
          onClick={() => run(apiReset, 'Reset the entire queue? This permanently clears all tokens and stops auto mode.')}
          disabled={busy}
          className="btn-danger ml-auto"
        >
          Reset queue
        </button>
      </div>

      {/* Announcement panel */}
      <div className="mb-6 border border-rule bg-cream p-4">
        <div className="label mb-3">Live announcement</div>
        {fbAnnouncement?.message && (
          <div className="mb-3 flex items-start gap-3 p-3 border border-warn bg-warn/5 text-warn text-sm">
            <span className="w-2 h-2 rounded-full bg-warn animate-pulse mt-0.5 shrink-0" />
            <span className="flex-1">{fbAnnouncement.message}</span>
            <button onClick={handleClearAnnouncement} disabled={announcementBusy} className="text-xs underline underline-offset-2 shrink-0 disabled:opacity-40">
              Clear
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={announcementText}
            onChange={e => setAnnouncementText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetAnnouncement()}
            placeholder="Broadcast a message to the display board and customer screens…"
            maxLength={200}
            className="flex-1 border border-rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-ink"
          />
          <button
            onClick={handleSetAnnouncement}
            disabled={announcementBusy || !announcementText.trim()}
            className="btn-primary text-sm px-4 disabled:opacity-40"
          >
            Broadcast
          </button>
        </div>
      </div>

      {/* Token lookup */}
      <div className="mb-8 border border-rule bg-cream p-4">
        <div className="label mb-3">Token lookup</div>
        <input
          type="text"
          value={lookupQuery}
          onChange={e => setLookupQuery(e.target.value)}
          placeholder="Search by token #, ID, or note…"
          className="w-full border border-rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-ink"
        />
        {lookupResults.length > 0 && (
          <div className="mt-3 border border-rule divide-y divide-rule">
            {lookupResults.map(t => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-4 text-sm bg-paper hover:bg-cream transition-colors">
                <span className="font-display text-2xl num w-10">{String(t.number).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 border ${t.status === 'waiting' ? 'border-rule text-graphite' : t.status === 'called' ? 'border-accent text-accent' : t.status === 'served' ? 'border-success text-success' : 'border-rule text-ash'}`}>{t.status}</span>
                    <span className="text-graphite">{getServiceLabel(t.service, cfg.industry)}</span>
                    {t.priority === 'priority' && <span className="text-warn text-xs font-bold">Priority</span>}
                  </div>
                  {t.note && <p className="text-xs text-graphite mt-1 italic truncate">{t.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-graphite font-mono">{new Date(t.issuedAt).toLocaleTimeString()}</div>
                  {t.status === 'waiting' && (
                    <button
                      onClick={() => { setNoteTarget(t.id); setNoteText(t.note || ''); }}
                      className="text-xs underline underline-offset-2 text-graphite hover:text-ink mt-1"
                    >
                      Add note
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {lookupQuery.trim() && lookupResults.length === 0 && (
          <p className="mt-3 text-sm text-graphite">No tokens match "{lookupQuery}".</p>
        )}
        {/* Inline note editor */}
        {noteTarget && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
              placeholder="Note for this token…"
              maxLength={120}
              className="flex-1 border border-rule bg-paper px-3 py-2 text-sm focus:outline-none focus:border-ink"
            />
            <button onClick={handleSaveNote} disabled={noteBusy || !noteText.trim()} className="btn-primary text-sm px-3 disabled:opacity-40">
              {noteSaved ? 'Saved!' : noteBusy ? '…' : 'Save'}
            </button>
            <button onClick={() => { setNoteTarget(null); setNoteText(''); }} className="btn-secondary text-sm px-3">Cancel</button>
          </div>
        )}
      </div>

      {/* Priority Queue Section — shown whenever any priority token is waiting */}
      {priorityWaiting > 0 && (
        <PriorityQueueSection
          tokens={priorityWaitingTokens}
          calledByService={calledByService}
          industry={cfg.industry}
          onCallNextPriority={() => run(() => apiCallNextPriority(user?.sub))}
          onSkip={handleSkip}
          busy={busy}
          skipBusy={skipBusy}
          isPaused={isPaused}
        />
      )}

      {!firebaseWorking && (
        <div className="mb-6 p-4 border border-warn bg-warn/5 text-warn text-sm">
          Live updates are limited — Firebase security rules have not been deployed yet.
          Run <code className="font-mono bg-warn/10 px-1">firebase deploy --only database</code> from the <code className="font-mono bg-warn/10 px-1">firebase/</code> folder to enable real-time queue sync.
          Dashboard is currently polling every 4s via REST API as a fallback.
        </div>
      )}
      {err && (
        <div className="mb-6 p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{err}</div>
      )}
      {isPaused && (
        <div className="mb-6 p-4 border border-warn bg-warn/5 text-warn text-sm">
          The queue is paused. Users cannot take new tokens until you resume.
        </div>
      )}

      {/* Mobile service tabs */}
      {services.length > 1 && (
        <div className="flex overflow-x-auto gap-1 mb-6 pb-1 lg:hidden scrollbar-hide">
          {services.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 px-4 py-2 text-sm border transition-colors ${
                activeTab === i ? 'bg-ink text-paper border-ink' : 'border-rule text-graphite hover:border-ink hover:text-ink'
              }`}
            >
              {getServiceLabel(s.id, cfg.industry)}
              {(waitingByService[s.id]?.length > 0) && (
                <span className={`ml-1.5 text-xs px-1.5 rounded-full ${activeTab === i ? 'bg-paper/20 text-paper' : 'bg-rule text-graphite'}`}>
                  {waitingByService[s.id].length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: single service view */}
      <div className="lg:hidden">
        {services[activeTab] && (
          <QueueColumn
            service={services[activeTab]}
            called={calledByService[services[activeTab].id]}
            waiting={waitingByService[services[activeTab].id]}
            onCallNext={() => run(() => apiCallNext(services[activeTab].id, user?.sub))}
            onSkip={handleSkip}
            busy={busy}
            skipBusy={skipBusy}
            isPaused={isPaused}
            industry={cfg.industry}
            priorityBlocked={priorityBlocked && !waitingByService[services[activeTab].id]?.some(t => t.priority === 'priority')}
            isServicePaused={pausedServices.includes(services[activeTab].id)}
            onPauseService={() => handlePauseService(services[activeTab].id)}
            onResumeService={() => handleResumeService(services[activeTab].id)}
            pausingService={pausingService}
          />
        )}
      </div>

      {/* Desktop: all service columns */}
      <div className={`hidden lg:grid gap-8 ${services.length <= 3 ? 'lg:grid-cols-3' : services.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-5'}`}>
        {services.map(s => (
          <QueueColumn
            key={s.id}
            service={s}
            called={calledByService[s.id]}
            waiting={waitingByService[s.id]}
            onCallNext={() => run(() => apiCallNext(s.id, user?.sub))}
            onSkip={handleSkip}
            busy={busy}
            skipBusy={skipBusy}
            isPaused={isPaused}
            industry={cfg.industry}
            priorityBlocked={priorityBlocked && !waitingByService[s.id]?.some(t => t.priority === 'priority')}
            isServicePaused={pausedServices.includes(s.id)}
            onPauseService={() => handlePauseService(s.id)}
            onResumeService={() => handleResumeService(s.id)}
            pausingService={pausingService}
          />
        ))}
      </div>
    </div>
  );
}
