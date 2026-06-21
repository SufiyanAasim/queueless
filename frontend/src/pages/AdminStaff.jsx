import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServices, getServiceLabel } from '../utils/industry.js';
import { apiListStaff, apiCreateStaff, apiDeleteStaff } from '../services/api.js';
import { db, ref, onValue } from '../firebase.js';

function OnlineDot({ online }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-success animate-pulse' : 'bg-ash'}`} />
  );
}

export default function AdminStaff() {
  const { user } = useAuth();
  const cfg = useAppConfig();
  const services = getServices(cfg.industry);

  const [members, setMembers] = useState([]);
  const [presence, setPresence] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '', service: services[0]?.id || 'general', pin: '' });
  const [formError, setFormError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiListStaff().then(setMembers).finally(() => setLoading(false));

    // Live presence subscription via Firebase client SDK
    const presenceRef = ref(db, 'presence');
    const unsub = onValue(presenceRef, snap => setPresence(snap.val() || {}));
    return () => unsub();
  }, [user]);

  // Keep form default service in sync when the org's industry profile loads/changes
  useEffect(() => {
    setForm(f => ({ ...f, service: services[0]?.id || 'general' }));
  }, [cfg.industry]);

  if (!user) return <Navigate to="/admin/login" replace />;

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.username || !form.password) { setFormError('Username and password are required.'); return; }
    setCreating(true);
    try {
      const newMember = await apiCreateStaff(form);
      setMembers(m => [...m, newMember]);
      setForm({ username: '', password: '', displayName: '', service: services[0]?.id || 'general', pin: '' });
    } catch (e) {
      setFormError(e.response?.data?.error || 'Could not create staff member.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Remove staff member "${username}"?`)) return;
    setDeleting(username);
    try {
      await apiDeleteStaff(username);
      setMembers(m => m.filter(s => s.username !== username));
    } catch {
      alert('Could not remove staff member.');
    } finally {
      setDeleting(null);
    }
  };

  const onlineCount = Object.values(presence).filter(p => p.online).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-10 py-10">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="label">Admin · Staff</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Staff management</h1>
        </div>
        <Link to="/admin" className="btn-secondary text-sm">Back to dashboard</Link>
      </div>

      {/* Online summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-rule mb-8">
        <div className="bg-paper p-5">
          <div className="label">Total staff</div>
          <div className="font-display text-4xl tracking-tightest mt-1">{members.length}</div>
        </div>
        <div className="bg-paper p-5">
          <div className="label">Online now</div>
          <div className="font-display text-4xl tracking-tightest mt-1 text-success">{onlineCount}</div>
        </div>
        <div className="bg-paper p-5 col-span-2 sm:col-span-1">
          <div className="label mb-2">Live status</div>
          <div className="space-y-1">
            {members.length === 0 ? (
              <p className="text-xs text-graphite">No staff added yet.</p>
            ) : members.map(m => (
              <div key={m.username} className="flex items-center gap-2 text-xs">
                <OnlineDot online={presence[m.username]?.online} />
                <span className="font-medium">{m.displayName || m.username}</span>
                <span className="text-graphite">· {getServiceLabel(m.service, cfg.industry)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="text-graphite text-center py-10">Loading…</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 border border-rule text-graphite mb-8">
          <div className="font-display text-3xl text-ash">No staff yet</div>
          <p className="mt-2 text-sm">Add your first staff member below.</p>
        </div>
      ) : (
        <div className="border border-rule mb-8">
          <div className="px-4 py-3 bg-ink text-paper text-xs tracking-[0.18em] uppercase font-medium grid grid-cols-12 gap-3">
            <div className="col-span-1"></div>
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Username</div>
            <div className="col-span-3">Service</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <div className="divide-y divide-rule bg-cream">
            {members.map(m => {
              const p = presence[m.username];
              return (
                <div key={m.username} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm">
                  <div className="col-span-1"><OnlineDot online={p?.online} /></div>
                  <div className="col-span-3 font-medium">{m.displayName || m.username}</div>
                  <div className="col-span-3 text-graphite font-mono text-xs">{m.username}</div>
                  <div className="col-span-3 text-graphite">{getServiceLabel(m.service, cfg.industry)}</div>
                  <div className="col-span-2 text-right">
                    <button
                      onClick={() => handleDelete(m.username)}
                      disabled={deleting === m.username}
                      className="text-xs text-accent hover:underline"
                    >
                      {deleting === m.username ? '…' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="border border-rule p-6">
        <h2 className="font-display text-2xl mb-6">Add staff member</h2>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1">Username</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. ali123"
              className="w-full border border-rule bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="label block mb-1">Display name</label>
            <input
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="e.g. Ali Raza"
              className="w-full border border-rule bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="label block mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min 8 characters"
              className="w-full border border-rule bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="label block mb-1">PIN <span className="normal-case font-normal text-graphite">(optional — for kiosk)</span></label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g,'') }))}
              placeholder="4–6 digits"
              className="w-full border border-rule bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink font-mono tracking-widest"
            />
          </div>
          <div>
            <label className="label block mb-1">Assigned service</label>
            <select
              value={form.service}
              onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
              className="w-full border border-rule bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          {formError && (
            <div className="sm:col-span-2 p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{formError}</div>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Add staff member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
