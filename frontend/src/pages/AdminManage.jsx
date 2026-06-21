import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiListAdmins, apiCreateAdmin, apiDeleteAdmin } from '../services/api.js';

export default function AdminManage() {
  const { user } = useAuth();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });
  const [formError, setFormError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiListAdmins().then(setAdmins).finally(() => setLoading(false));
  }, [user]);

  if (!user) return <Navigate to="/admin/login" replace />;

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.username || !form.password) { setFormError('Username and password are required.'); return; }
    setCreating(true);
    try {
      const newAdmin = await apiCreateAdmin(form);
      setAdmins(a => [...a, newAdmin]);
      setForm({ username: '', password: '', displayName: '' });
    } catch (e) {
      setFormError(e.response?.data?.error || 'Could not create admin account.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (username) => {
    if (username === user.username) return;
    if (!window.confirm(`Remove admin account "${username}"? This cannot be undone.`)) return;
    setDeleting(username);
    try {
      await apiDeleteAdmin(username);
      setAdmins(a => a.filter(adm => adm.username !== username));
    } catch {
      alert('Could not remove admin account.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-10 py-10">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="label">Admin · Accounts</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Admin accounts</h1>
        </div>
        <Link to="/admin" className="btn-secondary text-sm">Back to dashboard</Link>
      </div>

      <div className="grid grid-cols-2 gap-px bg-rule mb-8">
        <div className="bg-paper p-5">
          <div className="label">Total admins</div>
          <div className="font-display text-4xl tracking-tightest mt-1">{admins.length}</div>
        </div>
        <div className="bg-paper p-5">
          <div className="label">Signed in as</div>
          <div className="font-display text-2xl tracking-tightest mt-1">{user.username}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-graphite text-center py-10">Loading…</div>
      ) : admins.length === 0 ? (
        <div className="text-center py-12 border border-rule text-graphite mb-8">
          <div className="font-display text-3xl text-ash">No admins found</div>
          <p className="mt-2 text-sm">Add an admin account below.</p>
        </div>
      ) : (
        <div className="border border-rule mb-8">
          <div className="px-4 py-3 bg-ink text-paper text-xs tracking-[0.18em] uppercase font-medium grid grid-cols-12 gap-3">
            <div className="col-span-4">Name</div>
            <div className="col-span-4">Username</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2 text-right">Action</div>
          </div>
          <div className="divide-y divide-rule bg-cream">
            {admins.map(adm => (
              <div key={adm.username} className="px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm">
                <div className="col-span-4 font-medium flex items-center gap-2">
                  {adm.displayName || adm.username}
                  {adm.username === user.username && (
                    <span className="text-xs px-1.5 py-0.5 border border-success/50 text-success bg-success/5">You</span>
                  )}
                </div>
                <div className="col-span-4 text-graphite font-mono text-xs">{adm.username}</div>
                <div className="col-span-2 text-graphite text-xs">{adm.role || 'admin'}</div>
                <div className="col-span-2 text-right">
                  {adm.username === user.username ? (
                    <span className="text-xs text-ash">—</span>
                  ) : (
                    <button
                      onClick={() => handleDelete(adm.username)}
                      disabled={deleting === adm.username}
                      className="text-xs text-accent hover:underline disabled:opacity-40"
                    >
                      {deleting === adm.username ? '…' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-rule p-6">
        <h2 className="font-display text-2xl mb-6">Add admin account</h2>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1">Username</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. manager01"
              className="w-full border border-rule bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="label block mb-1">Display name <span className="normal-case font-normal text-graphite">(optional)</span></label>
            <input
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="e.g. Branch Manager"
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

          {formError && (
            <div className="sm:col-span-2 p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{formError}</div>
          )}

          <div className="sm:col-span-2">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Add admin account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
