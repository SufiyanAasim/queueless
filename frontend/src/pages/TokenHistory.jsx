import { useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'queueless.tokenHistory';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export default function TokenHistory() {
  const [history, setHistory] = useState(loadHistory);

  const clear = () => {
    if (!window.confirm('Clear all token history from this device?')) return;
    localStorage.removeItem(KEY);
    setHistory([]);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="label">Your device</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Token history</h1>
        </div>
        {history.length > 0 && (
          <button onClick={clear} className="text-xs text-graphite hover:text-accent underline underline-offset-2">
            Clear history
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 border border-rule">
          <div className="font-display text-4xl text-ash">No history yet</div>
          <p className="mt-3 text-sm text-graphite">Tokens you take on this device will appear here.</p>
          <Link to="/take" className="btn-primary mt-8 inline-flex">Take a token</Link>
        </div>
      ) : (
        <div className="border border-rule divide-y divide-rule bg-cream">
          {history.map(t => (
            <Link
              key={t.id}
              to={`/token/${t.id}`}
              className="flex items-center gap-5 px-5 py-4 hover:bg-paper transition-colors group"
            >
              <div className="font-display text-4xl num tracking-tightest shrink-0 text-ink group-hover:text-accent transition-colors">
                {String(t.number).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">{t.serviceLabel || t.service}</div>
                <div className="text-xs text-graphite mt-0.5">
                  {t.issuedAt ? new Date(t.issuedAt).toLocaleString() : 'Unknown time'}
                </div>
              </div>
              <div className="text-graphite text-xs shrink-0">View →</div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-graphite text-center">
        History is stored only on this device. Clearing your browser data will remove it.
      </p>
    </div>
  );
}
