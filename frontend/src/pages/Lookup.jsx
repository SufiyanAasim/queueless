import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel } from '../utils/industry.js';

export default function Lookup() {
  const cfg = useAppConfig();
  const [tokenId, setTokenId] = useState('');
  const navigate = useNavigate();

  // If a token is already stored from this device, offer one-click recovery.
  const [savedToken, setSavedToken] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('queueless.myToken');
      if (raw) setSavedToken(JSON.parse(raw));
    } catch {}
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tokenId.trim()) navigate(`/token/${tokenId.trim()}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      <div className="label mb-4">Recover your token</div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95]">
        Pick up where you left off.
      </h1>
      <p className="mt-4 text-graphite max-w-lg">
        If you took a token earlier on this device, we'll bring you right back to your live position.
        Otherwise, paste the token ID from the link you received.
      </p>

      {savedToken && (
        <div className="mt-10 card flex items-center justify-between">
          <div>
            <div className="label">Saved on this device</div>
            <div className="mt-1 font-display text-3xl">
              Token #{String(savedToken.number).padStart(2, '0')}
            </div>
            <div className="mt-1 text-xs text-graphite">{getServiceLabel(savedToken.service, cfg.industry)}</div>
          </div>
          <button
            onClick={() => navigate(`/token/${savedToken.id}`)}
            className="btn-primary"
          >
            Resume →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-10 pt-10 border-t border-rule">
        <label htmlFor="tokenId" className="label">Or enter a token ID</label>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input
            id="tokenId"
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="e.g. 7b3a4f8e-..."
            className="flex-1 px-4 py-3 bg-cream border border-rule font-mono text-sm
                       focus:outline-none focus:border-ink"
          />
          <button type="submit" className="btn-primary" disabled={!tokenId.trim()}>
            Look up →
          </button>
        </div>
      </form>
    </div>
  );
}
