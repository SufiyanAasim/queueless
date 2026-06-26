import { useState, useEffect } from 'react';

/**
 * Live-updating elapsed-time display. Ticks every second without any manual
 * refresh, so "Serving for: 2 minutes 34 seconds" stays accurate on screen.
 */
function format(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} second${s !== 1 ? 's' : ''}`;
  return `${m} minute${m !== 1 ? 's' : ''} ${s} second${s !== 1 ? 's' : ''}`;
}

export default function LiveTimer({ since, className = '' }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!since) return null;
  return <span className={className}>{format(now - since)}</span>;
}
