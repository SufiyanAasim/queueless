import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useQueueState } from '../hooks/useQueueState.js';
import { useTheme } from '../context/ThemeContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Home() {
  const { state, tokens, announcement, loading } = useQueueState();
  const { dark } = useTheme();
  const tokenList = Object.values(tokens || {});
  const waiting = tokenList.filter(t => t.status === 'waiting').length;
  const nowServing = state?.currentTokenNumber || 0;
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    const takeUrl = `${window.location.origin}/take`;
    // QR foreground adapts to current theme
    const qrDark = dark ? '#F0EBE3' : '#171615';
    const qrLight = dark ? '#1C1A18' : '#FBF7F0';
    QRCode.toDataURL(takeUrl, { width: 160, margin: 1, color: { dark: qrDark, light: qrLight } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [dark]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 lg:py-16">
      {announcement?.message && (
        <div className="mb-8 p-4 border border-warn bg-warn/10 text-warn text-sm font-medium">
          {announcement.message}
        </div>
      )}
      {/* Hero */}
      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-6">
          <img
            src={dark ? '/svg/queueless-wordmark-dark.svg' : '/svg/queueless-lockup.svg'}
            alt="QueueLess - Smart Queue Management"
            className="h-12 sm:h-16 w-auto mb-6"
          />
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tightest leading-[0.95]">
            Take a digital<br />
            <em className="text-accent">token.</em> Watch<br />
            your position live.
          </h1>
          <p className="mt-6 text-base text-graphite max-w-lg leading-relaxed">
            QueueLess replaces paper slips and crowded waiting rooms with a real-time, browser-based queue.
            Pull a token from anywhere — a phone in a parking lot, a laptop across town — and arrive at the
            counter only when the screen says it's your turn.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link to="/take" className="btn-primary">Take a token →</Link>
            <Link to="/book" className="btn-secondary">Book an appointment</Link>
            <Link to="/lookup" className="btn-secondary">I already have a token</Link>
          </div>
        </div>

        {/* Live status panel - centered in its column */}
        <aside className="lg:col-span-6 flex flex-col items-center">
          <div className="card w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <span className="label">Right now</span>
              {!loading && <StatusBadge status={state?.status || 'running'} />}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="label">Now serving</div>
                <div className="mt-3 font-display text-6xl tracking-tightest leading-none num text-accent">
                  {nowServing > 0 ? String(nowServing).padStart(2, '0') : '—'}
                </div>
              </div>
              <div>
                <div className="label">Waiting</div>
                <div className="mt-3 font-display text-6xl tracking-tightest leading-none num">
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
          <div className="mt-6 grid grid-cols-3 text-center text-[10px] tracking-[0.2em] uppercase text-graphite w-full max-w-sm">
            <div className="border-r border-rule py-3">No app needed</div>
            <div className="border-r border-rule py-3">Free to use</div>
            <div className="py-3">No login</div>
          </div>

          {/* Scan-to-join QR */}
          {qrDataUrl && (
            <div className="mt-6 w-full max-w-sm border border-rule bg-cream p-4 flex items-center gap-4">
              <img src={qrDataUrl} alt="Scan to take a token" className="w-16 h-16 shrink-0" />
              <div>
                <div className="label">Scan to join queue</div>
                <p className="text-xs text-graphite mt-1">Point your phone camera here — no app needed.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
