import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStaff } from '../context/StaffContext.jsx';
import { ADMIN_TOKEN_KEY, STAFF_TOKEN_KEY } from '../services/api.js';

const CHECK_INTERVAL_MS = 30_000;

/** Decode a JWT's expiry (seconds epoch) without verifying — display-only use. */
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Session expiry watchdog. Checks the stored admin/staff JWTs on mount and
 * every 30 s; when a token has expired it signs the user out immediately and
 * redirects to the matching login screen with a "session expired" notice —
 * instead of letting the user keep clicking until a request 401s.
 */
export function useSessionExpiry() {
  const { user, logout } = useAuth();
  const { staff, logout: staffLogout } = useStaff();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !staff) return;

    const check = () => {
      const now = Date.now();

      if (user) {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        const exp = token ? tokenExpiry(token) : 0;
        if (!token || (exp && exp <= now)) {
          logout();
          navigate('/admin/login', { replace: true, state: { sessionExpired: true } });
          return;
        }
      }

      if (staff) {
        const token = localStorage.getItem(STAFF_TOKEN_KEY);
        const exp = token ? tokenExpiry(token) : 0;
        if (!token || (exp && exp <= now)) {
          staffLogout();
          navigate('/staff/login', { replace: true, state: { sessionExpired: true } });
        }
      }
    };

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, staff, logout, staffLogout, navigate]);
}
