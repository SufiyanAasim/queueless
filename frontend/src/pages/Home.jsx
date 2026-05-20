import { Link } from 'react-router-dom';
import { useQueueState } from '../hooks/useQueueState.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Home() {
  const { state, tokens, loading } = useQueueState();
  const tokenList = Object.values(tokens || {});
  const waiting = tokenList.filter(t => t.status === 'waiting').length;
  const nowServing = state?.currentTokenNumber || 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
      {/* Hero */}
      <div className="grid lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-7">
          <img src="/svg/queueless-lockup.svg" alt="QueueLess - Smart Queue Management" className="h-16 sm:h-20 w-auto mb-8" />
          <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl tracking-tightest leading-[0.95]">
            Take a digital<br />
            <em className="text-accent">token.</em> Watch<br />
            your position live.
          </h1>
          <p className="mt-8 text-lg text-graphite max-w-xl leading-relaxed">
            QueueLess replaces paper slips and crowded waiting rooms with a real-time, browser-based queue.
            Pull a token from anywhere — a phone in a parking lot, a laptop across town — and arrive at the
            counter only when the screen says it's your turn.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/take" className="btn-primary">Take a token →</Link>
            <Link to="/lookup" className="btn-secondary">I already have a token</Link>
          </div>
        </div>

        {/* Live status panel */}
        <aside className="lg:col-span-5">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <span className="label">Right now</span>
              {!loading && <StatusBadge status={state?.status || 'running'} />}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="label">Now serving</div>
                <div className="mt-3 font-display text-7xl tracking-tightest leading-none num text-accent">
                  {nowServing > 0 ? String(nowServing).padStart(2, '0') : '—'}
                </div>
              </div>
              <div>
                <div className="label">Waiting</div>
                <div className="mt-3 font-display text-7xl tracking-tightest leading-none num">
                  {String(waiting).padStart(2, '0')}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-rule">
              <p className="text-xs text-graphite leading-relaxed">
                Updates push live from the cloud — there's nothing to refresh.
                {state?.status === 'paused' && (
                  <span className="block mt-2 text-warn">
                    The queue is currently paused. New tokens will resume shortly.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-6 grid grid-cols-3 text-center text-[10px] tracking-[0.2em] uppercase text-graphite">
            <div className="border-r border-rule py-3">No app needed</div>
            <div className="border-r border-rule py-3">Free to use</div>
            <div className="py-3">No login</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
