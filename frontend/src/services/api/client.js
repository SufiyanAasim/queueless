import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

export const ADMIN_TOKEN_KEY = 'queueless.adminToken';
export const STAFF_TOKEN_KEY  = 'queueless.staffToken';
// Legacy alias kept for AuthContext compatibility
export const TOKEN_KEY = ADMIN_TOKEN_KEY;

api.interceptors.request.use((config) => {
  const url = config.url || '';
  // Staff routes must always use the staff JWT (it carries the service claim).
  // All other routes use the admin token first, falling back to staff token.
  const isStaffRoute = url.startsWith('/staff/');
  const token = isStaffRoute
    ? localStorage.getItem(STAFF_TOKEN_KEY)
    : (localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(STAFF_TOKEN_KEY));
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only force-logout on 401 from protected routes, not public endpoints.
    // This prevents a cold-start backend error from silently wiping the session.
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      const isProtected = url.startsWith('/admin/') || url.startsWith('/staff/');
      if (isProtected) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(STAFF_TOKEN_KEY);
        // Hard redirect so React state resets cleanly.
        const isStaff = url.startsWith('/staff/');
        window.location.href = isStaff ? '/staff/login' : '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);
