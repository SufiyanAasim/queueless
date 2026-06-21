import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useQueueState, useTokenLive } from '../hooks/useQueueState.js';
import { usePushNotification } from '../hooks/usePushNotification.js';
import { apiTokenStatus } from '../services/api.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel } from '../utils/industry.js';
import StatusBadge from '../components/StatusBadge.jsx';

// Save token to local history so the customer can review past tokens.
function saveToHistory(token, serviceLabel) {
  try {
    const key = 'queueless.tokenHistory';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const already = existing.find(t => t.id === token.id);
    if (!already) {
      existing.unshift({ id: token.id, number: token.number, service: token.service, serviceLabel, issuedAt: token.issuedAt });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
    }
  } catch {}
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {}
}

function fireConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#C84B26', '#3F6F4F', '#B8881C', '#F7F3EC'] });
}

function formatWait(seconds) {
  if (seconds <= 0) return 'Almost up';
  const m = Math.floor(seconds / 60);
  if (m === 0) return `${seconds % 60}s`;
  if (m < 60) return `${m} min${m === 1 ? '' : 's'}`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function PrintableToken({ token, serviceLabel }) {
  const issuedAt = token.issuedAt ? new Date(token.issuedAt).toLocaleString() : '';
  const tokenNum = String(token.number).padStart(2, '0');
  const url = typeof window !== 'undefined' ? window.location.href : '';
  return (
    <div className="hidden print:flex print:items-center print:justify-center print:min-h-screen print:bg-white"
      style={{ fontFamily: '"Georgia", serif' }}>
      <div style={{
        width: '340px', border: '1.5px solid #1A1714',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Ticket header stripe */}
        <div style={{ background: '#1A1714', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#F7F3EC', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>QueueLess</span>
          {token.priority === 'priority' && (
            <span style={{ color: '#F59E0B', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 'bold', border: '1px solid #F59E0B', padding: '2px 6px' }}>Priority</span>
          )}
        </div>

        {/* Token number — hero */}
        <div style={{ padding: '32px 24px 20px', borderBottom: '1px dashed #D4CFC8', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8278', marginBottom: '8px' }}>{serviceLabel}</div>
          <div style={{ fontSize: '96px', fontWeight: '700', lineHeight: 1, letterSpacing: '-0.04em', color: '#1A1714' }}>#{tokenNum}</div>
        </div>

        {/* Details */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px dashed #D4CFC8' }}>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A8278', marginBottom: '3px' }}>Status</div>
            <div style={{ fontSize: '12px', color: '#1A1714', fontWeight: '600', textTransform: 'capitalize' }}>{token.status}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A8278', marginBottom: '3px' }}>Issued</div>
            <div style={{ fontSize: '11px', color: '#4A4542' }}>{issuedAt}</div>
          </div>
        </div>

        {/* Track URL footer */}
        <div style={{ padding: '12px 24px', background: '#F7F3EC' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A8278', marginBottom: '4px' }}>Track your position</div>
          <div style={{ fontSize: '9px', color: '#5C5854', wordBreak: 'break-all' }}>{url}</div>
        </div>
      </div>
    </div>
  );
}

export default function MyToken() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cfg = useAppConfig();
  const liveToken = useTokenLive(id);
  const { state, tokens } = useQueueState();
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const prevStatusRef = useRef(null);
  const { permission: notifPermission, request: requestNotif, notify } = usePushNotification();
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(
    () => localStorage.getItem('queueless.notifDismissed') === '1'
  );

  useEffect(() => {
    apiTokenStatus(id).then(setBootstrap).catch(e => {
      if (e.response?.status === 404) setError('We could not find this token. It may have expired or the link is wrong.');
      else setError('Could not load your token. Please retry.');
    });
  }, [id]);

  const token = liveToken || bootstrap;

  // Save to local history once we have the token.
  const serviceLabel = token ? getServiceLabel(token.service, cfg.industry) : '';
  useEffect(() => {
    if (token) saveToHistory(token, serviceLabel);
  }, [token?.id]);

  // Confetti + sound + push notification when this token transitions to called.
  useEffect(() => {
    if (!token) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = token.status;
    if (prev && prev !== 'called' && token.status === 'called') {
      fireConfetti();
      playAlertSound();
      notify(
        `Token #${String(token.number).padStart(2, '0')} — your turn!`,
        `Please proceed to the ${serviceLabel} counter now.`
      );
    }
  }, [token?.status]);

  useEffect(() => {
    if (token && showQr && !qrDataUrl) {
      QRCode.toDataURL(window.location.href, { width: 200, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [token, showQr, qrDataUrl]);

  const position = (() => {
    if (!token || token.status !== 'waiting') return 0;
    return Object.values(tokens || {})
      .filter(t => t.status === 'waiting' && t.service === token.service && t.number < token.number).length + 1;
  })();
  const peopleAhead = Math.max(0, position - 1);
  const etaSeconds = token?.estimatedWaitSeconds || 0;

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareWhatsApp = () => {
    const text = `Track my queue token #${String(token?.number).padStart(2, '0')} (${serviceLabel}): ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

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

  const isCalled  = token.status === 'called';
  const isWaiting = token.status === 'waiting';
  const isServed  = token.status === 'served';
  const isExpired = token.status === 'expired';
  const isPriority = token.priority === 'priority';

  return (
    <>
    {/* PrintableToken MUST be outside print:hidden so it renders when printing */}
    <PrintableToken token={token} serviceLabel={serviceLabel} />
    <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16 print:hidden">

      {/* Header row */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <span className="label">Your token</span>
        <div className="flex items-center gap-2 flex-wrap">
          {isPriority && (
            <span className="text-xs px-2 py-0.5 bg-warn/10 text-warn border border-warn/30 font-medium">Priority</span>
          )}
          <StatusBadge status={token.status} />
          <button onClick={() => window.print()} className="btn-secondary text-xs px-3 py-1.5">Print</button>
        </div>
      </div>

      {/* Token number */}
      <div className="text-center">
        <div className="label mb-4">{serviceLabel}</div>
        <div className={`font-display num leading-none tracking-tightest text-token sm:text-token-lg ${isCalled ? 'text-accent animate-pulse-slow' : 'text-ink'}`}>
          {String(token.number).padStart(2, '0')}
        </div>
      </div>

      {/* Share row */}
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={copyLink} className="btn-secondary text-xs px-3 py-1.5">
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button onClick={shareWhatsApp} className="btn-secondary text-xs px-3 py-1.5">
          Share on WhatsApp
        </button>
        <button onClick={() => setShowQr(v => !v)} className="btn-secondary text-xs px-3 py-1.5">
          {showQr ? 'Hide QR' : 'Show QR code'}
        </button>
      </div>

      {showQr && (
        <div className="mt-4 flex justify-center">
          {qrDataUrl
            ? <img src={qrDataUrl} alt="QR code for this token" className="border border-rule p-2 bg-paper" />
            : <div className="text-graphite text-sm">Generating QR code…</div>
          }
        </div>
      )}

      {/* Push notification opt-in banner — only show while waiting and permission not yet granted */}
      {isWaiting && notifPermission === 'default' && !notifBannerDismissed && (
        <div className="mt-6 flex items-start gap-4 p-4 border border-rule bg-cream text-sm">
          <div className="flex-1">
            <p className="font-medium">Get notified when it's your turn</p>
            <p className="text-graphite text-xs mt-0.5">We'll send a browser alert even if this tab is in the background.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => requestNotif()}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Enable
            </button>
            <button
              onClick={() => { setNotifBannerDismissed(true); localStorage.setItem('queueless.notifDismissed', '1'); }}
              className="text-graphite hover:text-ink text-xs px-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {isWaiting && notifPermission === 'granted' && (
        <p className="mt-4 text-center text-xs text-success">Notifications on — we'll alert you when called.</p>
      )}

      {/* Status messaging */}
      {isCalled && (
        <div className="mt-10 text-center">
          <div className="font-display text-3xl text-accent">Please proceed to the counter.</div>
          <p className="mt-3 text-graphite">Your number has just been called.</p>
        </div>
      )}

      {isWaiting && (
        <div className="mt-10 grid grid-cols-2 gap-px bg-rule border border-rule">
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

      {isServed && !feedbackDismissed && (
        <div className="mt-10 text-center">
          <div className="font-display text-3xl text-success">Thank you.</div>
          <p className="mt-3 text-graphite">Your visit is complete.</p>
          <div className="mt-6 p-6 border border-rule bg-cream">
            <p className="text-sm font-medium mb-4">How was your experience?</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button onClick={() => navigate(`/feedback/${id}`)} className="btn-primary">
                Leave feedback
              </button>
              <button onClick={() => setFeedbackDismissed(true)} className="btn-secondary text-xs">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {isServed && feedbackDismissed && (
        <div className="mt-10 text-center text-success">
          <div className="font-display text-3xl">Thank you.</div>
          <p className="mt-3 text-graphite">Your visit is complete.</p>
        </div>
      )}

      {isExpired && (
        <div className="mt-10 text-center text-graphite">
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

      <div className="mt-16 pt-8 border-t border-rule text-center text-xs text-graphite">
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          Updating live from the cloud · no refresh needed
        </span>
      </div>
    </div>
    </>
  );
}
