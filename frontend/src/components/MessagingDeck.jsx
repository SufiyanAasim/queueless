import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { db, ref, onValue, off } from '../firebase.js';
import {
  apiListConversations, apiCreateConversation, apiGetMessages, apiSendMessage,
  apiDirectory, apiMarkConversationRead, apiReactMessage,
} from '../services/api.js';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '✅'];
const ATTACH_MAX = 256 * 1024;
const ATTACH_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];
const OPEN_KEY = 'queueless.msgDeckOpen';

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(ts).toLocaleDateString();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * LinkedIn-style docked message tray: a bottom-anchored bar that slides a chat
 * panel up. Open/closed state persists in localStorage; an unread badge updates
 * live (even while collapsed) via the content-free messageSignals node.
 */
export default function MessagingDeck() {
  const { user } = useAuth();
  const { staff } = useStaff();
  const me = user?.username || staff?.username || null;

  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  const [view, setView] = useState('list');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [selected, setSelected] = useState({});
  const [groupName, setGroupName] = useState('');
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [reactFor, setReactFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try { setConversations(await apiListConversations()); } catch { /* noop */ }
  }, []);

  const loadMessages = useCallback(async (id) => {
    try { setMessages(await apiGetMessages(id)); } catch { /* noop */ }
  }, []);

  // Load + live-subscribe whenever signed in (badge stays live even when collapsed).
  useEffect(() => {
    if (!me) return;
    loadConversations();
    const r = ref(db, 'messageSignals');
    const cb = () => { loadConversations(); if (activeId) loadMessages(activeId); };
    onValue(r, cb);
    return () => off(r, 'value', cb);
  }, [me, activeId, loadConversations, loadMessages]);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const toggleOpen = () => setOpen(o => {
    const next = !o;
    try { localStorage.setItem(OPEN_KEY, next ? '1' : '0'); } catch { /* noop */ }
    return next;
  });

  if (!me) return null;

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  const openChat = async (id) => {
    setActiveId(id);
    setView('chat');
    await loadMessages(id);
    try { await apiMarkConversationRead(id); } catch { /* noop */ }
    loadConversations();
  };

  const openNew = async () => {
    setView('new'); setSelected({}); setGroupName('');
    try { setDirectory(await apiDirectory()); } catch { /* noop */ }
  };

  const createGroup = async () => {
    const members = Object.keys(selected).filter(u => selected[u]);
    if (members.length === 0) return;
    const isDirect = members.length === 1;
    setBusy(true);
    try {
      const conv = await apiCreateConversation({ type: isDirect ? 'direct' : 'group', name: isDirect ? null : (groupName.trim() || 'New group'), members });
      await loadConversations();
      await openChat(conv.id);
    } catch { /* noop */ } finally { setBusy(false); }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ATTACH_TYPES.includes(file.type)) return alert('Unsupported file type. Allowed: PNG, JPEG, GIF, WebP, PDF.');
    if (file.size > ATTACH_MAX) return alert('File too large (max 256 KB). Share a link for larger files.');
    const dataUrl = await readFileAsDataUrl(file);
    setPendingFile({ name: file.name, type: file.type, dataUrl });
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !pendingFile) || !activeId || busy) return;
    setText(''); const attachment = pendingFile; setPendingFile(null);
    setBusy(true);
    try {
      const msg = await apiSendMessage(activeId, body, attachment);
      setMessages(m => [...m, msg]);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send message.');
    } finally { setBusy(false); }
  };

  const react = async (mid, emoji) => {
    setReactFor(null);
    try { await apiReactMessage(activeId, mid, emoji); await loadMessages(activeId); } catch { /* noop */ }
  };

  const active = conversations.find(c => c.id === activeId);
  const convTitle = (c) => c.type === 'direct' ? (c.members.find(m => m !== me) || 'Direct') : (c.name || 'Group');
  const myLast = [...messages].reverse().find(m => m.sender === me);
  const seenByOther = myLast && active?.reads && Object.entries(active.reads).some(([u, ts]) => u !== me && ts >= myLast.createdAt);

  return (
    <div className="fixed bottom-0 right-4 z-[60] w-[min(calc(100vw-2rem),22rem)] print:hidden">
      {/* Slide-up panel */}
      <div
        className={`bg-paper border border-rule border-b-0 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out ${open ? 'h-[min(70vh,30rem)] opacity-100' : 'h-0 opacity-0'}`}
      >
        {/* Sub-header (back / title) */}
        <div className="px-4 py-2.5 border-b border-rule flex items-center justify-between bg-cream shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'list' && <button onClick={() => { setView('list'); setActiveId(null); }} className="text-graphite hover:text-ink" aria-label="Back">←</button>}
            <span className="text-sm font-medium">{view === 'list' ? 'Conversations' : view === 'new' ? 'New conversation' : (active ? convTitle(active) : 'Chat')}</span>
          </div>
        </div>

        {view === 'list' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3"><button onClick={openNew} className="btn-primary text-sm w-full">+ New conversation</button></div>
            {conversations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-graphite text-center">No conversations yet. Start one with a teammate.</p>
            ) : (
              <div className="divide-y divide-rule">
                {conversations.map(c => (
                  <button key={c.id} onClick={() => openChat(c.id)} className="w-full text-left px-4 py-3 hover:bg-cream transition-colors">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${c.unread ? 'font-semibold text-ink' : 'font-medium'}`}>{convTitle(c)}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {c.unread > 0 && <span className="min-w-[16px] h-4 px-1 rounded-full bg-accent text-paper text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                        <span className="text-[10px] text-graphite">{timeAgo(c.lastMessage?.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-graphite truncate mt-0.5">
                      {c.type === 'group' && <span className="text-ink/60">{c.members.length} members · </span>}
                      {c.lastMessage ? `${c.lastMessage.sender}: ${c.lastMessage.text}` : 'No messages yet'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'new' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-graphite">Pick one teammate for a direct chat, or several for a group.</p>
            <div className="border border-rule divide-y divide-rule max-h-56 overflow-y-auto">
              {directory.map(u => (
                <label key={u.username} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-cream">
                  <input type="checkbox" checked={!!selected[u.username]} onChange={e => setSelected(s => ({ ...s, [u.username]: e.target.checked }))} className="accent-ink" />
                  <span className={`w-2 h-2 rounded-full ${u.online ? 'bg-success' : 'bg-rule'}`} />
                  <span className="flex-1">{u.displayName}</span>
                  <span className="text-[10px] text-graphite uppercase">{u.role}</span>
                </label>
              ))}
              {directory.length === 0 && <p className="px-3 py-3 text-sm text-graphite">No teammates available.</p>}
            </div>
            {Object.values(selected).filter(Boolean).length > 1 && (
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name" maxLength={80}
                className="w-full border border-rule bg-cream px-3 py-2 text-sm focus:outline-none focus:border-ink" />
            )}
            <button onClick={createGroup} disabled={busy || Object.values(selected).filter(Boolean).length === 0} className="btn-primary text-sm w-full disabled:opacity-40">
              {busy ? 'Creating…' : 'Start conversation'}
            </button>
          </div>
        )}

        {view === 'chat' && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
              {messages.length === 0 ? (
                <p className="text-graphite text-center py-6">No messages yet — say hello.</p>
              ) : messages.map(m => {
                const mine = m.sender === me;
                const reactions = m.reactions || {};
                return (
                  <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%]">
                      <div className={`px-3 py-2 ${mine ? 'bg-ink text-paper' : 'bg-cream border border-rule'}`}>
                        {!mine && <div className="text-[10px] text-graphite mb-0.5">{m.senderName}</div>}
                        {m.text && <div className="leading-snug whitespace-pre-wrap break-words">{m.text}</div>}
                        {m.attachment && (
                          m.attachment.type.startsWith('image/')
                            ? <img src={m.attachment.dataUrl} alt={m.attachment.name} className="mt-1 max-h-40 rounded border border-rule/40" />
                            : <a href={m.attachment.dataUrl} download={m.attachment.name} className={`mt-1 inline-flex items-center gap-1 text-xs underline ${mine ? 'text-paper' : 'text-accent'}`}>📎 {m.attachment.name}</a>
                        )}
                        <div className={`text-[9px] mt-1 ${mine ? 'text-paper/60' : 'text-graphite'}`}>{timeAgo(m.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {Object.entries(reactions).map(([emoji, users]) => (
                          <button key={emoji} onClick={() => react(m.id, emoji)} title={Object.keys(users).join(', ')}
                            className={`text-xs px-1.5 py-0.5 border rounded-full ${users[me] ? 'border-accent bg-accent/10' : 'border-rule bg-paper'}`}>
                            {emoji} {Object.keys(users).length}
                          </button>
                        ))}
                        <div className="relative">
                          <button onClick={() => setReactFor(reactFor === m.id ? null : m.id)} className="text-xs text-graphite opacity-0 group-hover:opacity-100 hover:text-ink transition-opacity px-1">＋</button>
                          {reactFor === m.id && (
                            <div className="absolute z-10 bottom-full mb-1 flex gap-1 bg-paper border border-rule shadow p-1">
                              {QUICK_REACTIONS.map(e => <button key={e} onClick={() => react(m.id, e)} className="hover:scale-125 transition-transform">{e}</button>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {seenByOther && <div className="text-[10px] text-graphite text-right pr-1">Seen</div>}
            </div>

            {pendingFile && (
              <div className="px-3 pt-2 flex items-center gap-2 text-xs">
                <span className="px-2 py-1 border border-rule bg-cream truncate max-w-[200px]">📎 {pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)} className="text-graphite hover:text-accent">remove</button>
              </div>
            )}
            <div className="border-t border-rule p-3 flex gap-2 items-center shrink-0">
              <input ref={fileRef} type="file" accept={ATTACH_TYPES.join(',')} onChange={pickFile} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="text-graphite hover:text-ink px-1" title="Attach file">📎</button>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Message…" className="flex-1 border border-rule bg-cream px-3 py-2 text-sm focus:outline-none focus:border-ink" />
              <button onClick={send} disabled={busy || (!text.trim() && !pendingFile)} className="btn-primary text-sm px-3 disabled:opacity-40">Send</button>
            </div>
          </>
        )}
      </div>

      {/* Docked bar (always visible) */}
      <button
        onClick={toggleOpen}
        className="w-full bg-ink text-paper px-4 py-3 flex items-center justify-between shadow-lg hover:bg-ink/90 transition-colors"
        aria-expanded={open}
        aria-label="Team messaging"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="text-base leading-none">💬</span> Messaging
          {totalUnread > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-paper text-[10px] font-bold flex items-center justify-center">{totalUnread > 99 ? '99+' : totalUnread}</span>
          )}
        </span>
        <span className="text-xs opacity-80">{open ? '▾' : '▴'}</span>
      </button>
    </div>
  );
}
