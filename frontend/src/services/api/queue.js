import { api } from './client.js';

// Live queue control (admin) + token actions.
export const apiActiveQueue      = () => api.get('/admin/queue').then(r => r.data);
export const apiCallNext         = (service, staffUsername) => api.post('/admin/queue/call-next', { service, staffUsername: staffUsername || undefined }).then(r => r.data);
export const apiCallNextPriority = (staffUsername) => api.post('/admin/queue/call-next-priority', { staffUsername: staffUsername || undefined }).then(r => r.data);
export const apiSkipToken        = (tokenId) => api.post(`/admin/queue/skip/${tokenId}`).then(r => r.data);
export const apiPause            = () => api.post('/admin/queue/pause').then(r => r.data);
export const apiResume           = () => api.post('/admin/queue/resume').then(r => r.data);
export const apiReset            = () => api.post('/admin/queue/reset').then(r => r.data);

// Per-service pause / resume
export const apiPauseService  = (service) => api.post('/admin/queue/pause-service', { service }).then(r => r.data);
export const apiResumeService = (service) => api.post('/admin/queue/resume-service', { service }).then(r => r.data);

// Auto mode
export const apiStartAutoMode = (services) => api.post('/admin/auto-mode/start', { services }).then(r => r.data);
export const apiStopAutoMode  = () => api.post('/admin/auto-mode/stop').then(r => r.data);

// Token referral / transfer between counters
export const apiReferToken      = (tokenId, toService, reason) => api.post(`/admin/queue/refer/${tokenId}`, { toService, reason: reason || undefined }).then(r => r.data);
export const apiStaffReferToken = (tokenId, toService, reason) => api.post(`/staff/queue/refer/${tokenId}`, { toService, reason: reason || undefined }).then(r => r.data);

// Token notes
export const apiSetAdminTokenNote = (tokenId, note) => api.put(`/admin/queue/tokens/${tokenId}/note`, { note }).then(r => r.data);
export const apiSetStaffTokenNote = (tokenId, note) => api.put(`/staff/queue/tokens/${tokenId}/note`, { note }).then(r => r.data);
