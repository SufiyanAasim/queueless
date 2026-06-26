import { api } from './client.js';

// Public, unauthenticated endpoints (customer-facing).
export const apiTakeToken = (service, email, priority, groupSize, patientName) =>
  api.post('/tokens', {
    service,
    email: email || undefined,
    priority: priority || undefined,
    groupSize: groupSize > 1 ? groupSize : undefined,
    patientName: patientName?.trim() || undefined,
  }).then(r => r.data.token);

export const apiTokenStatus    = (id) => api.get(`/tokens/${id}`).then(r => r.data);
export const apiRequeueToken   = (id) => api.post(`/tokens/${id}/requeue`).then(r => r.data);
export const apiPublicConfig   = () => api.get('/config').then(r => r.data);
export const apiSubmitFeedback = (tokenId, rating, comment) =>
  api.post('/feedback', { tokenId, rating, comment }).then(r => r.data);
export const apiGetAnnouncement = () => api.get('/announcement').then(r => r.data);
export const apiBookAppointment = (data) => api.post('/appointments', data).then(r => r.data);
