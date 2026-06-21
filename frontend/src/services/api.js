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

// Public
export const apiTakeToken    = (service, email, priority) =>
  api.post('/tokens', { service, email: email || undefined, priority: priority || undefined }).then(r => r.data.token);
export const apiTokenStatus  = (id) => api.get(`/tokens/${id}`).then(r => r.data);
export const apiPublicConfig = () => api.get('/config').then(r => r.data);
export const apiSubmitFeedback = (tokenId, rating, comment) =>
  api.post('/feedback', { tokenId, rating, comment }).then(r => r.data);

// Auth
export const apiLogin = (u, p) => api.post('/auth/login', { username: u, password: p }).then(r => r.data);

// Admin queue
export const apiActiveQueue = () => api.get('/admin/queue').then(r => r.data);
export const apiCallNext         = (service) => api.post('/admin/queue/call-next', { service }).then(r => r.data);
export const apiCallNextPriority = () => api.post('/admin/queue/call-next-priority').then(r => r.data);
export const apiSkipToken        = (tokenId) => api.post(`/admin/queue/skip/${tokenId}`).then(r => r.data);
export const apiPause       = () => api.post('/admin/queue/pause').then(r => r.data);
export const apiResume      = () => api.post('/admin/queue/resume').then(r => r.data);
export const apiReset       = () => api.post('/admin/queue/reset').then(r => r.data);

// Admin auto mode
export const apiStartAutoMode = (services) => api.post('/admin/auto-mode/start', { services }).then(r => r.data);
export const apiStopAutoMode  = () => api.post('/admin/auto-mode/stop').then(r => r.data);

// Admin analytics + config + feedback + staff
export const apiAnalytics    = () => api.get('/admin/analytics').then(r => r.data);
export const apiAdminConfig  = () => api.get('/admin/config').then(r => r.data);
export const apiUpdateConfig = (industry, orgName, location) => api.put('/admin/config', { industry, orgName, location }).then(r => r.data);
export const apiFeedback     = () => api.get('/admin/feedback').then(r => r.data);
export const apiListStaff    = () => api.get('/admin/staff').then(r => r.data);
export const apiCreateStaff  = (data) => api.post('/admin/staff', data).then(r => r.data);
export const apiDeleteStaff  = (username) => api.delete(`/admin/staff/${username}`).then(r => r.data);

// Admin profile
export const apiAdminProfile       = () => api.get('/admin/profile').then(r => r.data);
export const apiUpdateAdminProfile = (data) => api.put('/admin/profile', data).then(r => r.data);

// Staff portal
export const apiStaffQueue          = () => api.get('/staff/queue').then(r => r.data);
export const apiStaffCallNext       = () => api.post('/staff/queue/call-next', {}).then(r => r.data);
export const apiStaffPinLogin       = (pin) => api.post('/staff/login/pin', { pin }).then(r => r.data);
export const apiStaffProfile        = () => api.get('/staff/profile').then(r => r.data);
export const apiUpdateStaffProfile  = (data) => api.put('/staff/profile', data).then(r => r.data);
export const apiStaffChangePassword = (currentPassword, newPassword) =>
  api.post('/staff/change-password', { currentPassword, newPassword }).then(r => r.data);

// Announcements
export const apiSetAnnouncement   = (message) => api.put('/admin/announcement', { message }).then(r => r.data);
export const apiClearAnnouncement = () => api.delete('/admin/announcement').then(r => r.data);
export const apiGetAnnouncement   = () => api.get('/announcement').then(r => r.data);

// Token notes
export const apiSetAdminTokenNote = (tokenId, note) => api.put(`/admin/queue/tokens/${tokenId}/note`, { note }).then(r => r.data);
export const apiSetStaffTokenNote = (tokenId, note) => api.put(`/staff/queue/tokens/${tokenId}/note`, { note }).then(r => r.data);

// Appointments
export const apiBookAppointment       = (data) => api.post('/appointments', data).then(r => r.data);
export const apiListAppointments      = () => api.get('/admin/appointments').then(r => r.data);
export const apiConfirmAppointment    = (id) => api.put(`/admin/appointments/${id}/confirm`).then(r => r.data);
export const apiCancelAppointment     = (id) => api.put(`/admin/appointments/${id}/cancel`).then(r => r.data);
