import { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLogin() {
  const { user, login, error, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const justSignedOut = location.state?.signedOut === true;

  if (user) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) navigate('/admin');
  };

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      {justSignedOut && (
        <div className="mb-8 p-3 border border-success/30 bg-success/10 text-success text-sm">
          You have been signed out successfully.
        </div>
      )}
      <div className="label mb-4">Admin access</div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95]">
        Sign in to manage<br/>the queue.
      </h1>
      <p className="mt-4 text-graphite text-sm">
        Admin-only — credentials are issued by the QueueLess team.
      </p>

      <form onSubmit={handleSubmit} className="mt-12 space-y-5">
        <div>
          <label htmlFor="username" className="label">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="mt-2 w-full px-4 py-3 bg-cream border border-rule
                       focus:outline-none focus:border-ink"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-2 w-full px-4 py-3 bg-cream border border-rule
                       focus:outline-none focus:border-ink"
          />
        </div>

        {error && (
          <div className="p-3 border border-accent bg-accent/5 text-accent-deep text-sm">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>
    </div>
  );
}
