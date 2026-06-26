import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { apiAssistant } from '../services/api.js';

const SUGGESTIONS = [
  'Which queue has the longest wait?',
  "Generate today's summary",
  'Predict remaining traffic',
  'Suggest ways to reduce waiting',
  'How is staff performance?',
];

/** Minimal, safe Markdown-ish renderer (bold, bullets, line breaks). No HTML injection. */
function renderText(text) {
  const lines = String(text || '').split('\n');
  return lines.map((line, i) => {
    const isBullet = /^\s*[-*]\s+/.test(line);
    const content = line.replace(/^\s*[-*]\s+/, '');
    const parts = content.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean).map((seg, j) => {
      if (/^\*\*[^*]+\*\*$/.test(seg)) return <strong key={j}>{seg.slice(2, -2)}</strong>;
      if (/^_[^_]+_$/.test(seg)) return <em key={j}>{seg.slice(1, -1)}</em>;
      return <span key={j}>{seg}</span>;
    });
    if (isBullet) return <li key={i} className="ml-4 list-disc">{parts}</li>;
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="mb-1">{parts}</p>;
  });
}

export default function AssistantDock() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  // The assistant requires an authenticated admin or staff session.
  if (!user && !staff) return null;

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput('');
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(m => [...m, { role: 'user', content: question }]);
    setBusy(true);
    try {
      const res = await apiAssistant(question, history);
      setMessages(m => [...m, { role: 'assistant', content: res.answer, provider: res.provider }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ I could not reach the operational data just now. Please try again.', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating launcher — present on every screen */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 left-5 z-[60] w-14 h-14 rounded-full bg-ink text-paper shadow-lg flex items-center justify-center hover:bg-accent transition-colors print:hidden"
        aria-label={open ? 'Close assistant' : 'Open AI assistant'}
        title="AI assistant"
      >
        <span className="text-xl leading-none">{open ? '✕' : '✦'}</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 left-5 z-[60] w-[min(calc(100vw-2.5rem),24rem)] h-[min(calc(100vh-9rem),32rem)] bg-paper border border-rule shadow-2xl flex flex-col print:hidden">
          <div className="px-4 py-3 border-b border-rule flex items-center justify-between bg-ink text-paper">
            <div className="flex items-center gap-2">
              <span className="text-base">✦</span>
              <div>
                <div className="text-sm font-medium leading-none">QueueLess Assistant</div>
                <div className="text-[10px] opacity-70 mt-0.5">Answers from live queue data only</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/assistant" onClick={() => setOpen(false)} className="text-[10px] opacity-70 hover:opacity-100 underline underline-offset-2" title="Open full workspace">Workspace ⤢</Link>
              <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100" aria-label="Close">✕</button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="text-graphite">
                <p className="mb-3">Ask me about your queues — I only report verified figures and never make numbers up.</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1.5 border border-rule hover:border-ink hover:bg-cream transition-colors text-left">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] px-3 py-2 ${m.role === 'user' ? 'bg-ink text-paper' : m.error ? 'bg-accent/5 border border-accent/30 text-accent-deep' : 'bg-cream border border-rule'}`}>
                  {m.role === 'assistant' ? <div className="leading-snug">{renderText(m.content)}</div> : m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-graphite text-xs animate-pulse">Assistant is checking the data…</div>}
          </div>

          <div className="border-t border-rule p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about queues, waits, predictions…"
              className="flex-1 border border-rule bg-cream px-3 py-2 text-sm focus:outline-none focus:border-ink"
            />
            <button onClick={() => send()} disabled={busy || !input.trim()} className="btn-primary text-sm px-3 disabled:opacity-40">
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
