import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { staff, logout: staffLogout } = useStaff();
  const { dark, toggle: toggleTheme } = useTheme();
  const loc = useLocation();
  const onDisplay = loc.pathname === '/display';
  const onAdmin = loc.pathname.startsWith('/admin');
  const onStaff = loc.pathname.startsWith('/staff');
  const [mobileOpen, setMobileOpen] = useState(false);

  // TV display — no chrome at all
  if (onDisplay) return <>{children}</>;

  const adminLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/analytics', label: 'Analytics' },
    { to: '/admin/staff', label: 'Staff' },
    { to: '/admin/feedback', label: 'Feedback' },
    { to: '/admin/setup', label: 'Settings' },
    { to: '/admin/change-password', label: 'Password' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/svg/queueless-wordmark-light.svg" alt="QueueLess" className="h-6 sm:h-7 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {!onAdmin && !onStaff && !user && !staff && (
              <>
                <Link to="/history" className="text-graphite hover:text-ink transition-colors">My tokens</Link>
                <Link to="/staff/login" className="text-graphite hover:text-ink transition-colors">Staff</Link>
                <Link to="/admin/login" className="text-graphite hover:text-ink transition-colors">Admin</Link>
              </>
            )}
            {user && adminLinks.map(l => (
              <Link key={l.to} to={l.to} className="text-graphite hover:text-ink transition-colors font-medium">{l.label}</Link>
            ))}
            {user && (
              <>
                <span className="label hidden lg:inline ml-2 border-l border-rule pl-4">{user.username}</span>
                <button onClick={logout} className="text-graphite hover:text-accent transition-colors">Sign out</button>
              </>
            )}
            {staff && !user && (
              <>
                <Link to="/staff" className="text-graphite hover:text-ink transition-colors font-medium">My Queue</Link>
                <span className="label border-l border-rule pl-4">{staff.displayName || staff.username}</span>
                <button onClick={staffLogout} className="text-graphite hover:text-accent transition-colors">Sign out</button>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-graphite hover:text-ink transition-colors"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? '☀' : '◑'}
            </button>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-graphite hover:text-ink"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-rule bg-paper">
            <nav className="flex flex-col px-4 py-3 gap-1 text-sm">
              {!onAdmin && !onStaff && !user && !staff && (
                <>
                  <Link to="/history" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink">My tokens</Link>
                  <Link to="/staff/login" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink">Staff portal</Link>
                  <Link to="/admin/login" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink">Admin portal</Link>
                </>
              )}
              {user && adminLinks.map(l => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink font-medium">{l.label}</Link>
              ))}
              {user && (
                <button onClick={() => { setMobileOpen(false); logout(); }} className="text-left py-2 text-graphite hover:text-accent">Sign out</button>
              )}
              {staff && !user && (
                <>
                  <Link to="/staff" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink font-medium">My Queue</Link>
                  <button onClick={() => { setMobileOpen(false); staffLogout(); }} className="text-left py-2 text-graphite hover:text-accent">Sign out</button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-rule mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row gap-2 sm:gap-6 items-start sm:items-center justify-between text-xs text-graphite">
          <span className="font-semibold tracking-wide">Karachi, Pakistan</span>
          <span className="font-mono">v1.2.0 · cloud-native queue management</span>
        </div>
      </footer>
    </div>
  );
}
