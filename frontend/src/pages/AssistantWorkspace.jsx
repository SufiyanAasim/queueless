import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import {
  apiAssistant, apiListAiConversations, apiCreateAiConversation,
  apiGetAiConversation, apiUpdateAiConversation, apiDeleteAiConversation,
} from '../services/api.js';

const SUGGESTIONS = [
  'Which queue has the longest wait?',
  "Generate today's summary",
  'Predict remaining traffic',
  'Suggest ways to reduce waiting',
  'How is staff performance?',
];

function renderText(text) {
  return String(text || '').split('\n').map((line, i) => {
    const isBullet = /^\s*[-*]\s+/.test(line);
    const content = line.replace(/^\s*[-*]\s+/, '');
    const parts = content.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean).map((seg, j) => {
      if (/^\*\*[^*]+\*\*$/.test(seg)) return <strong key={j}>{seg.slice(2, -2)}</strong>;
      if (/^_[^_]+_$/.test(seg)) return <em key={j}>{seg.slice(1, -1)}</em>;
      return <span key={j}>{seg}</span>;
    });
    if (isBullet) return <li key={i} className="ml-5 list-disc">{parts}</li>;
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i} className="mb-1">{parts}</p>;
  });
}

function exportConversation(conv) {
  const lines = [`# ${conv.title}`, ''];
  (conv.messages || []).forEach(m => {
    lines.push(`**${m.role === 'user' ? 'You' : 'Assistant'}:**`, m.content, '');
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conv.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AssistantWorkspace() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const me = user?.username || staff?.username || null;

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameText, setRenameText] = useState('');
  const scrollRef = useRef(null);

  const loadList = useCallback(async () => {
    try { setConversations(await apiListAiConversations()); } catch { /* noop */ }
  }, []);

  const loadConversation = useCallback(async (id) => {
    try { setActive(await apiGetAiConversation(id)); } catch { /* noop */ }
  }, []);

  useEffect(() => { if (me) loadList(); }, [me, loadList]);
  useEffect(() => { if (activeId) loadConversation(activeId); else setActive(null); }, [activeId, loadConversation]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [active, busy]);

  if (!user && !staff) return <Navigate to="/admin/login" replace />;

  const newChat = async () => {
    const meta = await apiCreateAiConversation();
    await loadList();
    setActiveId(meta.id);
  };

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput('');
    let cid = activeId;
    setBusy(true);
    try {
      if (!cid) { const meta = await apiCreateAiConversation(); cid = meta.id; setActiveId(cid); }
      // optimistic user bubble
      setActive(a => ({ ...(a || { messages: [] }), messages: [...((a && a.messages) || []), { id: 'tmp', role: 'user', content: question }] }));
      await apiAssistant(question, [], cid);
      await loadConversation(cid);
      await loadList();
    } catch { /* noop */ } finally { setBusy(false); }
  };

  const togglePin = async (c) => { await apiUpdateAiConversation(c.id, { pinned: !c.pinned }); loadList(); };
  const doRename = async (c) => {
    if (!renameText.trim()) { setRenaming(null); return; }
    await apiUpdateAiConversation(c.id, { title: renameText.trim() });
    setRenaming(null); loadList();
    if (c.id === activeId) loadConversation(c.id);
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete “${c.title}”?`)) return;
    await apiDeleteAiConversation(c.id);
    if (c.id === activeId) { setActiveId(null); setActive(null); }
    loadList();
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-8">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="label">AI Workspace</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Assistant</h1>
          <p className="text-sm text-graphite mt-2">Answers come only from live queue data — never fabricated.</p>
        </div>
        <Link to={user ? '/admin' : '/staff'} className="btn-secondary text-sm">← Back</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-px bg-rule border border-rule min-h-[60vh]">
        {/* History sidebar */}
        <div className="bg-paper flex flex-col">
          <div className="p-3 border-b border-rule">
            <button onClick={newChat} className="btn-primary text-sm w-full">+ New chat</button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-rule max-h-[60vh]">
            {conversations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-graphite text-center">No saved chats yet.</p>
            ) : conversations.map(c => (
              <div key={c.id} className={`group px-3 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-cream ${c.id === activeId ? 'bg-cream' : ''}`} onClick={() => setActiveId(c.id)}>
                <span className="text-xs">{c.pinned ? '📌' : '💬'}</span>
                {renaming === c.id ? (
                  <input autoFocus value={renameText} onChange={e => setRenameText(e.target.value)} onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.key === 'Enter' && doRename(c)} onBlur={() => doRename(c)}
                    className="flex-1 border border-rule bg-paper px-1.5 py-0.5 text-xs focus:outline-none focus:border-ink" />
                ) : (
                  <span className="flex-1 text-sm truncate">{c.title}</span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => togglePin(c)} title="Pin" className="text-xs text-graphite hover:text-ink">📌</button>
                  <button onClick={() => { setRenaming(c.id); setRenameText(c.title); }} title="Rename" className="text-xs text-graphite hover:text-ink">✎</button>
                  <button onClick={() => remove(c)} title="Delete" className="text-xs text-graphite hover:text-accent">🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-paper flex flex-col">
          <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
            <span className="text-sm font-medium truncate">{active?.title || 'New conversation'}</span>
            {active?.messages?.length > 0 && (
              <button onClick={() => exportConversation(active)} className="text-xs text-graphite hover:text-ink underline underline-offset-2">Export</button>
            )}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm max-h-[55vh]">
            {(!active || active.messages?.length === 0) ? (
              <div className="text-graphite">
                <p className="mb-3">Ask about your queues — I only report verified figures.</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1.5 border border-rule hover:border-ink hover:bg-cream transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            ) : active.messages.map(m => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[80%] px-3 py-2 ${m.role === 'user' ? 'bg-ink text-paper' : 'bg-cream border border-rule'}`}>
                  {m.role === 'assistant' ? <div className="leading-snug">{renderText(m.content)}</div> : m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-graphite text-xs animate-pulse">Assistant is checking the data…</div>}
          </div>
          <div className="border-t border-rule p-3 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about queues, waits, predictions…" className="flex-1 border border-rule bg-cream px-3 py-2 text-sm focus:outline-none focus:border-ink" />
            <button onClick={() => send()} disabled={busy || !input.trim()} className="btn-primary text-sm px-4 disabled:opacity-40">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
