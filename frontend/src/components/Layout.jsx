import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const onAdmin = loc.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-3xl tracking-tightest leading-none">QueueLess</span>
            <span className="label hidden sm:inline">— Smart Queue Management</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {!onAdmin && !user && (
              <Link to="/admin/login" className="text-graphite hover:text-ink transition-colors">
                Admin
              </Link>
            )}
            {user && (
              <>
                <span className="label">{user.username}</span>
                <button onClick={logout} className="text-graphite hover:text-accent transition-colors">
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-rule mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row gap-2 sm:gap-6 items-start sm:items-center justify-between text-xs text-graphite">
          <span>QueueLess · Bahria University Karachi · Spring 2026</span>
          <span className="font-mono">v1.0.0 · cloud-native queue management</span>
        </div>
      </footer>
    </div>
  );
}
