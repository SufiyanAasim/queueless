import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiAdminProfile, apiUpdateAdminProfile } from '../services/api.js';

export default function AdminProfile() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!user) return <Navigate to="/admin/login" replace />;

  useEffect(() => {
    apiAdminProfile()
      .then(p => { setDisplayName(p.displayName || ''); setLoading(false); })
      .catch(() => { setDisplayName(user.username || ''); setLoading(false); });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!displayName.trim()) { setError('Display name cannot be empty.'); return; }
    setSaving(true);
    try {
      await apiUpdateAdminProfile({ displayName: displayName.trim() });
      updateUser({ displayName: displayName.trim() });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
      <div className="label mb-2">Admin · Account</div>
      <h1 className="font-display text-4xl tracking-tightest leading-none mb-8">My profile</h1>

      {/* Info card */}
      <div className="bg-cream border border-rule p-5 mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="label mb-1">Username</div>
          <div className="font-medium">{user.username}</div>
        </div>
        <div>
          <div className="label mb-1">Role</div>
          <div className="font-medium capitalize">{user.role || 'Admin'}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-graphite text-sm animate-pulse">Loading…</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label block mb-1.5">Display name</label>
            <p className="text-xs text-graphite mb-2">Shown in the navigation header instead of your username.</p>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={50}
              required
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
              placeholder={user.username}
            />
          </div>

          {error && (
            <div className="p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 border border-success bg-success/5 text-success text-sm">Profile updated successfully.</div>
          )}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}
    </div>
  );
}
