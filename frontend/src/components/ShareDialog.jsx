import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { apiCreateShare } from '../services/api.js';

/**
 * Creates a secure share on open and presents the capability link + QR code.
 * `payload` = { type, title, data }.
 */
export default function ShareDialog({ payload, onClose }) {
  const [share, setShare] = useState(null);
  const [qr, setQr] = useState(null);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(false);
  // Snapshot the payload once; the dialog must create exactly ONE share even if
  // the parent re-renders (e.g. polling) and hands us a fresh payload object.
  const payloadRef = useRef(payload);
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    let active = true;
    apiCreateShare(payloadRef.current)
      .then(s => {
        if (!active) return;
        setShare(s);
        QRCode.toDataURL(s.url, { margin: 1, width: 220 }).then(d => active && setQr(d)).catch(() => {});
      })
      .catch(e => active && setErr(e.response?.data?.error || 'Could not create share link.'));
    return () => { active = false; };
  }, []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(share.url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper border border-rule shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl">Share</h3>
          <button onClick={onClose} className="text-graphite hover:text-ink" aria-label="Close">✕</button>
        </div>

        {err ? (
          <p className="text-sm text-accent">{err}</p>
        ) : !share ? (
          <p className="text-sm text-graphite animate-pulse py-8 text-center">Creating secure link…</p>
        ) : (
          <>
            <p className="text-sm text-graphite mb-4">Anyone with this link can view <span className="font-medium text-ink">{share.title}</span> until {new Date(share.expiresAt).toLocaleDateString()}.</p>
            {qr && <img src={qr} alt="QR code" className="mx-auto mb-4 border border-rule" />}
            <div className="flex gap-2">
              <input readOnly value={share.url} className="flex-1 border border-rule bg-cream px-3 py-2 text-xs focus:outline-none" onFocus={e => e.target.select()} />
              <button onClick={copy} className="btn-primary text-sm px-4">{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div className="mt-3 flex justify-end">
              <a href={share.url} target="_blank" rel="noreferrer" className="text-xs text-graphite hover:text-ink underline underline-offset-2">Open printable view →</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
