import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStaff } from '../context/StaffContext.jsx';
import { apiStaffChangePassword } from '../services/api.js';

export default function StaffChangePassword() {
  const { staff } = useStaff();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!staff) return <Navigate to="/staff/login" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirm) { setError('New passwords do not match.'); return; }
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await apiStaffChangePassword(form.currentPassword, form.newPassword);
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      setError(e.response?.data?.error || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 sm:px-6 py-12">
      <div className="label mb-2">Staff · Security</div>
      <h1 className="font-display text-4xl tracking-tightest leading-none mb-8">Change password</h1>

      {success && (
        <div className="mb-6 p-4 border border-success bg-success/5 text-success text-sm">
          Password updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label block mb-1.5">Current password</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            autoComplete="current-password"
            required
            className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="label block mb-1.5">New password</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="label block mb-1.5">Confirm new password</label>
          <input
            type="password"
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
            required
            className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
          />
        </div>

        {error && (
          <div className="p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
