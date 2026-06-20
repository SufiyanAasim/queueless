import { useEffect, useState } from 'react';
import { useQueueState } from '../hooks/useQueueState.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServices, getServiceLabel } from '../utils/industry.js';

export default function Display() {
  const { state, tokens } = useQueueState();
  const cfg = useAppConfig();
  const services = getServices(cfg.industry);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tokenList = Object.values(tokens || {});
  const isPaused = state?.status === 'paused';

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-paper/10">
        <div>
          <span className="text-xs tracking-[0.18em] uppercase text-paper/50">
            {cfg.orgName}
          </span>
          <span className="ml-3 text-xs text-paper/30">· Queue Display</span>
        </div>
        <div className="flex items-center gap-4">
          {isPaused && (
            <span className="text-xs px-3 py-1 border border-warn/50 text-warn">Queue paused</span>
          )}
          <span className="font-mono text-paper/50 text-sm">
            {time.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Service cards */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={`grid gap-6 w-full max-w-6xl ${
          services.length === 1 ? 'grid-cols-1 max-w-sm' :
          services.length === 2 ? 'grid-cols-2' :
          services.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' :
          'grid-cols-2 lg:grid-cols-3'
        }`}>
          {services.map(s => {
            const called = tokenList.find(t => t.status === 'called' && t.service === s.id);
            const waiting = tokenList.filter(t => t.status === 'waiting' && t.service === s.id);

            return (
              <div
                key={s.id}
                className={`border p-6 flex flex-col transition-colors ${
                  called ? 'border-accent bg-accent/10' : 'border-paper/10 bg-paper/5'
                }`}
              >
                <div className="text-xs tracking-[0.15em] uppercase text-paper/50 mb-4">{s.title}</div>

                <div className={`font-display num leading-none tracking-tightest flex-1 flex items-center ${
                  called ? 'text-accent' : 'text-paper/20'
                }`}
                  style={{ fontSize: 'clamp(4rem, 10vw, 10rem)' }}
                >
                  {called ? `#${String(called.number).padStart(2, '0')}` : '—'}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className={called ? 'text-accent font-medium' : 'text-paper/30'}>
                    {called ? 'Now serving' : 'No one called'}
                  </span>
                  <span className="text-paper/40">
                    {waiting.length} waiting
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom ticker */}
      <div className="px-8 py-4 border-t border-paper/10 flex items-center justify-between text-xs text-paper/30">
        <span>Scan QR on your device or ask staff for your token number</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>
    </div>
  );
}
