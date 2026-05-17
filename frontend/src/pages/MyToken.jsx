import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueueState, useTokenLive } from '../hooks/useQueueState.js';
import { apiTokenStatus } from '../services/api.js';
import StatusBadge from '../components/StatusBadge.jsx';

const AVG_SECONDS_PER_TOKEN = 180; // mirrors backend default; could be fetched

function formatWait(seconds) {
  if (seconds <= 0) return 'Almost up';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (m < 60) return `${m} min${m === 1 ? '' : 's'}`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function MyToken() {
  const { id } = useParams();
  const liveToken = useTokenLive(id);
  const { state, tokens } = useQueueState();
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState(null);

  // First load - call REST API for the canonical record (so we have number + service even before Firebase first push).
  useEffect(() => {
    apiTokenStatus(id).then(setBootstrap).catch(e => {
      if (e.response?.status === 404) setError('We could not find this token. It may have expired or the link is wrong.');
      else setError('Could not load your token. Please retry.');
    });
  }, [id]);

  const token = liveToken || bootstrap;

  // Recompute position from live tokens snapshot - this is what makes the position update without polling.
  const position = (() => {
    if (!token || token.status !== 'waiting') return 0;
    return Object.values(tokens || {})
      .filter(t => t.status === 'waiting' && t.number < token.number).length + 1;
  })();
  const peopleAhead = Math.max(0, position - 1);
  const etaSeconds = peopleAhead * AVG_SECONDS_PER_TOKEN;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Token not found</h1>
        <p className="mt-4 text-graphite">{error}</p>
        <Link to="/take" className="btn-primary mt-8">Take a new token</Link>
      </div>
    );
  }

  if (!token) {
    return <div className="max-w-2xl mx-auto px-6 py-24 text-center text-graphite">Loading your token…</div>;
  }

  const isCalled = token.status === 'called';
  const isWaiting = token.status === 'waiting';
  const isServed = token.status === 'served';
  const isExpired = token.status === 'expired';

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
      {/* Status row */}
      <div className="flex items-center justify-between mb-12">
        <span className="label">Your token</span>
        <StatusBadge status={token.status} />
      </div>

      {/* The number — the hero of this page */}
      <div className="text-center">
        <div className="label mb-4">{token.service?.toUpperCase() || 'GENERAL'}</div>
        <div
          className={`font-display num leading-none tracking-tightest text-token sm:text-token-lg
                      ${isCalled ? 'text-accent animate-pulse-slow' : 'text-ink'}`}
        >
          {String(token.number).padStart(2, '0')}
        </div>
      </div>

      {/* Status messaging */}
      {isCalled && (
        <div className="mt-12 text-center">
          <div className="font-display text-3xl text-accent">Please proceed to the counter.</div>
          <p className="mt-3 text-graphite">Your number has just been called.</p>
        </div>
      )}

      {isWaiting && (
        <div className="mt-12 grid grid-cols-2 gap-px bg-rule border border-rule">
          <div className="bg-cream p-6 text-center">
            <div className="label">Position</div>
            <div className="mt-2 font-display text-5xl num tracking-tightest">{position}</div>
            <div className="mt-1 text-xs text-graphite">in line</div>
          </div>
          <div className="bg-cream p-6 text-center">
            <div className="label">Approx. wait</div>
            <div className="mt-2 font-display text-5xl num tracking-tightest">{formatWait(etaSeconds)}</div>
            <div className="mt-1 text-xs text-graphite">based on recent service times</div>
          </div>
        </div>
      )}

      {isWaiting && peopleAhead === 0 && (
        <p className="mt-6 text-center text-accent">You're next! Stay close.</p>
      )}

      {isServed && (
        <div className="mt-12 text-center text-success">
          <div className="font-display text-3xl">Thank you.</div>
          <p className="mt-3 text-graphite">Your visit is complete.</p>
        </div>
      )}

      {isExpired && (
        <div className="mt-12 text-center text-graphite">
          <div className="font-display text-3xl">This token has expired.</div>
          <p className="mt-3">It was not called within the time window. Please take a new one if you still need service.</p>
          <Link to="/take" className="btn-primary mt-6 inline-flex">Take a new token</Link>
        </div>
      )}

      {state?.status === 'paused' && isWaiting && (
        <div className="mt-8 p-4 border border-warn bg-warn/5 text-warn text-sm text-center">
          The queue is paused right now. Your position is saved — we'll resume soon.
        </div>
      )}

      {/* Live updating note */}
      <div className="mt-16 pt-8 border-t border-rule text-center text-xs text-graphite">
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Updating live from the cloud · no refresh needed
        </span>
      </div>
    </div>
  );
}
