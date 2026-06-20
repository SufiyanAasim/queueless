import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStaff } from '../context/StaffContext.jsx';

export default function StaffLogin() {
  const { login, error, loading } = useStaff();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) navigate('/staff');
  };

  return (
    <div className="max-w-sm mx-auto px-6 py-24">
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
