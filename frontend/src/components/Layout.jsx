import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import AssistantDock from './AssistantDock.jsx';
import MessagingDeck from './MessagingDeck.jsx';
import NotificationBell from './NotificationBell.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { staff, logout: staffLogout } = useStaff();
  const { dark, toggle: toggleTheme } = useTheme();
  const loc = useLocation();
  const navigate = useNavigate();
  const onDisplay = loc.pathname === '/display';
  const onAdmin = loc.pathname.startsWith('/admin');
  const onStaff = loc.pathname.startsWith('/staff');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signedOutMsg, setSignedOutMsg] = useState(false);
  const [adminDropOpen, setAdminDropOpen] = useState(false);
  const dropRef = useRef(null);

  const cfg = useAppConfig();

  if (onDisplay) return <ErrorBoundary key={loc.pathname}>{children}</ErrorBoundary>;

  const logoTarget = user ? '/admin' : staff ? '/staff' : '/';
  const logoSrc = dark
    ? '/svg/queueless-wordmark-dark.svg'
    : '/svg/queueless-wordmark-light.svg';

  const handleLogout = async (isStaff = false) => {
    setMobileOpen(false);
    setAdminDropOpen(false);
    setSigningOut(true);
    await new Promise(r => setTimeout(r, 600));
    if (isStaff) {
      staffLogout();
      navigate('/staff/login', { replace: true, state: { signedOut: true } });
    } else {
      logout();
      navigate('/admin/login', { replace: true, state: { signedOut: true } });
    }
    setSigningOut(false);
    setSignedOutMsg(true);
    setTimeout(() => setSignedOutMsg(false), 3000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setAdminDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setAdminDropOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const adminNavLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/queues', label: 'Queues' },
    { to: '/admin/analytics', label: 'Analytics' },
    { to: '/admin/staff', label: 'Staff' },
    { to: '/files', label: 'Files' },
    { to: '/admin/manage', label: 'Admins' },
    { to: '/admin/audit', label: 'Activity' },
    { to: '/admin/setup', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <header className="border-b border-rule sticky top-0 z-40 bg-paper print:hidden">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-3 flex items-center justify-between gap-4">
          {/* Logo only — org identity lives in the footer status bar */}
          <Link to={logoTarget} className="flex items-center shrink-0 group">
            <img
              src={logoSrc}
              alt="QueueLess"
              className="h-6 sm:h-7 w-auto transition-opacity duration-200"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm flex-1 justify-center">
            {!onAdmin && !onStaff && !user && !staff && (
              <>
                <Link to="/history" className="px-3 py-1.5 text-graphite hover:text-ink transition-colors rounded">My tokens</Link>
                <Link to="/staff/login" className="px-3 py-1.5 text-graphite hover:text-ink transition-colors rounded">Staff</Link>
                <Link to="/admin/login" className="px-3 py-1.5 text-graphite hover:text-ink transition-colors rounded">Admin</Link>
              </>
            )}
            {user && adminNavLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 transition-colors rounded font-medium ${
                  loc.pathname === l.to
                    ? 'text-ink bg-ink/5'
                    : 'text-graphite hover:text-ink hover:bg-ink/5'
                }`}
              >
                {l.label}
              </Link>
            ))}
            {staff && !user && (
              <Link to="/staff" className="px-3 py-1.5 text-graphite hover:text-ink transition-colors rounded font-medium">My Queue</Link>
            )}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification center (self-hides unless an admin/staff is signed in) */}
            {(user || staff) && <NotificationBell />}

            {/* Public theme toggle (when not admin) */}
            {!user && (
              <button
                onClick={toggleTheme}
                className="p-2 text-graphite hover:text-ink transition-colors"
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? '☀' : '◑'}
              </button>
            )}

            {/* Staff dropdown (not admin) */}
            {staff && !user && (
              <div className="relative hidden md:block" ref={dropRef}>
                <button
                  onClick={() => setAdminDropOpen(o => !o)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border transition-colors text-xs font-medium tracking-wide ${
                    adminDropOpen
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule text-graphite hover:border-ink hover:text-ink'
                  }`}
                  aria-expanded={adminDropOpen}
                  aria-haspopup="true"
                >
                  <span>{(staff.displayName || staff.username || 'STAFF').toUpperCase()}</span>
                  <img
                    src="/svg/chevron-down.svg"
                    alt=""
                    aria-hidden="true"
                    className={`w-3 h-3 transition-transform ${adminDropOpen ? 'rotate-180 brightness-0 invert' : ''}`}
                  />
                </button>

                {adminDropOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-paper border border-rule shadow-lg z-50">
                    {/* Theme toggle */}
                    <div className="px-4 py-3 border-b border-rule">
                      <div className="label mb-2">Theme</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-graphite">{dark ? 'Dark mode' : 'Light mode'}</span>
                        <button
                          onClick={toggleTheme}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${dark ? 'bg-ink' : 'bg-rule'}`}
                          role="switch" aria-checked={dark} aria-label="Toggle dark mode"
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-paper shadow transition-transform ${dark ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link to="/staff" onClick={() => setAdminDropOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-graphite hover:text-ink hover:bg-cream transition-colors">
                        <span className="text-base leading-none">🖥</span>
                        <span>My queue</span>
                      </Link>
                      <Link to="/staff/profile" onClick={() => setAdminDropOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-graphite hover:text-ink hover:bg-cream transition-colors">
                        <span className="text-base leading-none">👤</span>
                        <span>My profile</span>
                      </Link>
                      <Link to="/staff/change-password" onClick={() => setAdminDropOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-graphite hover:text-ink hover:bg-cream transition-colors">
                        <span className="text-base leading-none">🔑</span>
                        <span>Change password</span>
                      </Link>
                    </div>
                    <div className="border-t border-rule py-1">
                      <button
                        onClick={() => handleLogout(true)}
                        disabled={signingOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-graphite hover:text-accent hover:bg-accent/5 transition-colors disabled:opacity-50"
                      >
                        <span className="text-base leading-none">↩</span>
                        <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin dropdown */}
            {user && (
              <div className="relative hidden md:block" ref={dropRef}>
                <button
                  onClick={() => setAdminDropOpen(o => !o)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border transition-colors text-xs font-medium tracking-wide ${
                    adminDropOpen
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule text-graphite hover:border-ink hover:text-ink'
                  }`}
                  aria-expanded={adminDropOpen}
                  aria-haspopup="true"
                >
                  <span>{user.username?.toUpperCase() || 'ADMIN'}</span>
                  <img
                    src="/svg/chevron-down.svg"
                    alt=""
                    aria-hidden="true"
                    className={`w-3 h-3 transition-transform ${adminDropOpen ? 'rotate-180 brightness-0 invert' : ''}`}
                  />
                </button>

                {adminDropOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-paper border border-rule shadow-lg z-50">
                    {/* Theme toggle row */}
                    <div className="px-4 py-3 border-b border-rule">
                      <div className="label mb-2">Theme</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-graphite">{dark ? 'Dark mode' : 'Light mode'}</span>
                        <button
                          onClick={toggleTheme}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            dark ? 'bg-ink' : 'bg-rule'
                          }`}
                          role="switch"
                          aria-checked={dark}
                          aria-label="Toggle dark mode"
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-paper shadow transition-transform ${
                              dark ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to="/admin/profile"
                        onClick={() => setAdminDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-graphite hover:text-ink hover:bg-cream transition-colors"
                      >
                        <span className="text-base leading-none">👤</span>
                        <span>My profile</span>
                      </Link>
                      <Link
                        to="/admin/change-password"
                        onClick={() => setAdminDropOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-graphite hover:text-ink hover:bg-cream transition-colors"
                      >
                        <span className="text-base leading-none">🔑</span>
                        <span>Change password</span>
                      </Link>
                    </div>

                    <div className="border-t border-rule py-1">
                      <button
                        onClick={() => handleLogout(false)}
                        disabled={signingOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-graphite hover:text-accent hover:bg-accent/5 transition-colors disabled:opacity-50"
                      >
                        <span className="text-base leading-none">↩</span>
                        <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              {user && adminNavLinks.map(l => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink font-medium">{l.label}</Link>
              ))}
              {user && (
                <>
                  <div className="py-2 flex items-center justify-between border-t border-rule mt-1">
                    <span className="text-graphite text-xs">{dark ? 'Dark mode' : 'Light mode'}</span>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${dark ? 'bg-ink' : 'bg-rule'}`}
                      aria-label="Toggle theme"
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-paper shadow transition-transform ${dark ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <Link to="/admin/profile" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink">My profile</Link>
                  <Link to="/admin/change-password" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink">Change password</Link>
                  <button
                    onClick={() => handleLogout(false)}
                    disabled={signingOut}
                    className="text-left py-2 text-graphite hover:text-accent disabled:opacity-50"
                  >
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </>
              )}
              {staff && !user && (
                <>
                  <Link to="/staff" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink font-medium">My Queue</Link>
                  <Link to="/staff/profile" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink">My profile</Link>
                  <Link to="/staff/change-password" onClick={() => setMobileOpen(false)} className="py-2 text-graphite hover:text-ink">Change password</Link>
                  <div className="py-2 flex items-center justify-between border-t border-rule mt-1">
                    <span className="text-graphite text-xs">{dark ? 'Dark mode' : 'Light mode'}</span>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${dark ? 'bg-ink' : 'bg-rule'}`}
                      aria-label="Toggle theme"
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-paper shadow transition-transform ${dark ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleLogout(true)}
                    disabled={signingOut}
                    className="text-left py-2 text-graphite hover:text-accent disabled:opacity-50"
                  >
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </>
              )}
              {/* Public theme toggle in mobile */}
              {!user && !staff && (
                <div className="py-2 flex items-center justify-between border-t border-rule mt-1">
                  <span className="text-graphite text-xs">{dark ? 'Dark mode' : 'Light mode'}</span>
                  <button
                    onClick={toggleTheme}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${dark ? 'bg-ink' : 'bg-rule'}`}
                    aria-label="Toggle theme"
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-paper shadow transition-transform ${dark ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Sign-out success banner */}
      {signedOutMsg && (
        <div className="bg-success/10 border-b border-success/30 text-success text-sm text-center py-2 px-4">
          You have been signed out successfully.
        </div>
      )}

      <main className="flex-1"><ErrorBoundary key={loc.pathname}>{children}</ErrorBoundary></main>

      <footer className="border-t border-rule mt-12 print:hidden">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-4 flex flex-col sm:flex-row gap-2 sm:gap-6 items-start sm:items-center justify-between text-xs text-graphite">
          <div className="flex items-center gap-2 min-w-0">
            {cfg?.orgName && cfg.orgName !== 'QueueLess' ? (
              <span
                className="flex items-center gap-1.5 min-w-0 truncate"
                title={cfg.location ? `${cfg.orgName} · ${cfg.location}` : cfg.orgName}
              >
                <img src="/svg/location-pin.svg" alt="" aria-hidden="true" className="w-3 h-3 shrink-0 opacity-70" />
                <span className="font-medium text-ink">{cfg.orgName}</span>
                {cfg.location && (
                  <>
                    <span className="text-rule">·</span>
                    <span className="text-graphite font-normal">{cfg.location}</span>
                  </>
                )}
              </span>
            ) : (
              <span className="font-medium text-ink">QueueLess</span>
            )}
          </div>
          <span className="flex items-center gap-3">
            <Link to="/credits" className="hover:text-ink transition-colors underline underline-offset-2">Credits</Link>
            <span className="font-mono">v1.4.5 “Zenith” · cloud-native token qms</span>
          </span>
        </div>
      </footer>

      {/* Global floating docks (self-hide unless an admin/staff is signed in) */}
      <AssistantDock />
      <MessagingDeck />
    </div>
  );
}
