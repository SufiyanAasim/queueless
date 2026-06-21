import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useStaff } from '../context/StaffContext.jsx';

export default function StaffLogin() {
  const { login, error, loading } = useStaff();
  const navigate = useNavigate();
  const location = useLocation();
  const justSignedOut = location.state?.signedOut === true;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) navigate('/staff');
  };

  return (
    <div className="max-w-sm mx-auto px-6 py-24">
      {justSignedOut && (
        <div className="mb-6 p-3 border border-success/30 bg-success/10 text-success text-sm">
          You have been signed out successfully.
        </div>
      )}
      <div className="label mb-4">Staff portal</div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95] mb-10">
        Staff sign in
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label block mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="label block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
          />
        </div>

        {error && (
          <div className="p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-2 text-xs text-graphite">
        <span>
          Admin?{' '}
          <Link to="/admin/login" className="underline hover:text-ink">Admin sign in</Link>
        </span>
        <span>
          Shared device?{' '}
          <Link to="/kiosk" className="underline hover:text-ink">Use PIN kiosk</Link>
        </span>
      </div>
    </div>
  );
}
