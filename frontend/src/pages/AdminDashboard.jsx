import { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useQueueState } from '../hooks/useQueueState.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServices, getServiceLabel } from '../utils/industry.js';
import { apiCallNext, apiSkipToken, apiPause, apiResume, apiReset, apiStartAutoMode, apiStopAutoMode } from '../services/api.js';
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

function QueueColumn({ service, called, waiting, onCallNext, onSkip, busy, skipBusy, isPaused, industry }) {
  const title = getServiceLabel(service.id, industry);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <h2 className="font-display text-xl">{title}</h2>
        <span className="text-xs text-graphite">{waiting.length} waiting</span>
      </div>
      <ServingNowCard token={called} industry={industry} onSkip={onSkip} skipBusy={skipBusy} />
      <button
        onClick={onCallNext}
        disabled={busy || isPaused || waiting.length === 0}
        className="btn-primary w-full"
      >
        {busy ? 'Working…' : `Call Next`}
      </button>
      <WaitingList tokens={waiting} industry={industry} />
    </div>
  );
}

function AutoModePanel({ services, isPaused, queueState }) {
  const [autoOn, setAutoOn] = useState(false);
  const [interval, setIntervalSecs] = useState(null);
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
  }, [queueState]);

  useEffect(() => {
    if (autoOn && interval) {
      setCountdown(interval);
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) return interval;
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [autoOn, interval]);

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
              ? `Automatically calling the next token every ${interval}s — optimised from your historical data.`
              : 'Let the system call tokens automatically using ML-predicted intervals from your traffic history.'}
          </p>
          {autoOn && countdown !== null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-24 h-1.5 bg-rule rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all duration-1000"
                  style={{ width: `${((interval - countdown) / interval) * 100}%` }}
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
  const { state, tokens } = useQueueState();
  const cfg = useAppConfig();
  const [busy, setBusy] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  if (!user) return <Navigate to="/admin/login" replace />;

  const services = getServices(cfg.industry);
  const tokenList = Object.values(tokens || {});
  const isPaused = state?.status === 'paused';
  const servedCount = tokenList.filter(t => t.status === 'served').length;
  const expiredCount = tokenList.filter(t => t.status === 'expired').length;
  const priorityWaiting = tokenList.filter(t => t.status === 'waiting' && t.priority === 'priority').length;

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <div className="label">{cfg.orgName} · Admin dashboard</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Queue control</h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Link to="/admin/setup" className="btn-secondary text-sm">Settings</Link>
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

      {/* Auto Mode */}
      <div className="mb-6">
        <AutoModePanel services={services} isPaused={isPaused} queueState={state} />
      </div>

      {/* Action bar */}
      <div className="mb-8 flex flex-wrap gap-3">
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
            onCallNext={() => run(() => apiCallNext(services[activeTab].id))}
            onSkip={handleSkip}
            busy={busy}
            skipBusy={skipBusy}
            isPaused={isPaused}
            industry={cfg.industry}
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
            onCallNext={() => run(() => apiCallNext(s.id))}
            onSkip={handleSkip}
            busy={busy}
            skipBusy={skipBusy}
            isPaused={isPaused}
            industry={cfg.industry}
          />
        ))}
      </div>
    </div>
  );
}
