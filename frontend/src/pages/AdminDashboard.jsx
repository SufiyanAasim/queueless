import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useQueueState } from '../hooks/useQueueState.js';
import { apiCallNext, apiPause, apiResume, apiReset } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Stat from '../components/Stat.jsx';

function ServingNowCard({ token }) {
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
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="label block">Service</span>
              <span className="capitalize">{token.service}</span>
            </div>
            <div>
              <span className="label block">Called</span>
              <span>{new Date(token.calledAt).toLocaleTimeString()}</span>
            </div>
          </div>
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

function WaitingList({ tokens }) {
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
        <div className="col-span-2 text-right">Position</div>
      </div>
      <div className="divide-y divide-rule bg-cream max-h-[420px] overflow-y-auto">
        {tokens.map((t, i) => (
          <div key={t.id} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm hover:bg-paper transition-colors">
            <div className="col-span-2 font-display text-2xl num">{String(t.number).padStart(2, '0')}</div>
            <div className="col-span-5 capitalize text-graphite">{t.service}</div>
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { state, tokens } = useQueueState();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!user) return <Navigate to="/admin/login" replace />;

  const tokenList = Object.values(tokens || {});
  const waiting = tokenList.filter(t => t.status === 'waiting').sort((a, b) => a.number - b.number);
  const called = tokenList.find(t => t.status === 'called') || null;
  const servedCount = tokenList.filter(t => t.status === 'served').length;
  const expiredCount = tokenList.filter(t => t.status === 'expired').length;
  const isPaused = state?.status === 'paused';

  const run = async (fn, confirm) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e.response?.data?.error || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <div className="label">Admin dashboard</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">
            Queue control
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={state?.status || 'running'} />
          <span className="label">Auto-updating live</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule mb-10">
        <div className="bg-paper p-5"><Stat label="Waiting" value={waiting.length} /></div>
        <div className="bg-paper p-5"><Stat label="Now serving" value={state?.currentTokenNumber || '—'} accent /></div>
        <div className="bg-paper p-5"><Stat label="Served today" value={servedCount} /></div>
        <div className="bg-paper p-5"><Stat label="Expired" value={expiredCount} /></div>
      </div>

      {/* Action bar */}
      <div className="mb-10 flex flex-wrap gap-3">
        <button
          onClick={() => run(apiCallNext)}
          disabled={busy || isPaused || waiting.length === 0}
          className="btn-primary"
        >
          {busy ? 'Working…' : 'Call next token →'}
        </button>
        {!isPaused ? (
          <button onClick={() => run(apiPause)} disabled={busy} className="btn-secondary">
            Pause queue
          </button>
        ) : (
          <button onClick={() => run(apiResume)} disabled={busy} className="btn-secondary">
            Resume queue
          </button>
        )}
        <button
          onClick={() => run(apiReset, 'Reset the entire queue? This permanently clears all tokens.')}
          disabled={busy}
          className="btn-danger ml-auto"
        >
          Reset queue
        </button>
      </div>

      {err && (
        <div className="mb-6 p-3 border border-accent bg-accent/5 text-accent-deep text-sm">
          {err}
        </div>
      )}

      {isPaused && (
        <div className="mb-6 p-4 border border-warn bg-warn/5 text-warn text-sm">
          The queue is paused. Users cannot take new tokens until you resume.
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <ServingNowCard token={called} />
        </div>
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <span className="label">Waiting in line</span>
            <span className="text-xs text-graphite">{waiting.length} token{waiting.length === 1 ? '' : 's'}</span>
          </div>
          <WaitingList tokens={waiting} />
        </div>
      </div>
    </div>
  );
}
