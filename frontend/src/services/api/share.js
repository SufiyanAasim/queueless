import { api } from './client.js';

// Secure sharing (capability links).
export const apiCreateShare = (data) => api.post('/shares', data).then(r => r.data);
export const apiListShares  = () => api.get('/shares').then(r => r.data);
export const apiGetShare    = (id) => api.get(`/share/${id}`).then(r => r.data); // public
export const apiRevokeShare = (id) => api.delete(`/shares/${id}`).then(r => r.data);

// Audit log (admin only).
export const apiAuditLog    = () => api.get('/admin/audit').then(r => r.data);
