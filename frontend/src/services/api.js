/**
 * Axios client for the QueueLess REST API.
 *
 * The interceptor below injects the admin JWT (if present in localStorage)
 * onto every request, and a response interceptor centralizes 401 handling
 * by clearing the stored token so the AuthContext picks up the change.
 */
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'queueless.adminToken';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(err);
  }
);

// --- Public ---
export const apiTakeToken    = (service)   => api.post('/tokens', { service }).then(r => r.data.token);
export const apiTokenStatus  = (id)        => api.get(`/tokens/${id}`).then(r => r.data);

// --- Auth ---
export const apiLogin        = (u, p)      => api.post('/auth/login', { username: u, password: p }).then(r => r.data);

// --- Admin (requires token in localStorage) ---
export const apiActiveQueue  = ()          => api.get('/admin/queue').then(r => r.data);
export const apiAnalytics    = ()          => api.get('/admin/analytics').then(r => r.data);
export const apiCallNext     = (service)   => api.post('/admin/queue/call-next', { service }).then(r => r.data);
export const apiPause        = ()          => api.post('/admin/queue/pause').then(r => r.data);
export const apiResume       = ()          => api.post('/admin/queue/resume').then(r => r.data);
export const apiReset        = ()          => api.post('/admin/queue/reset').then(r => r.data);

export { TOKEN_KEY };
