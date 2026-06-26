import { api } from './client.js';

// Queue management (custom queues within an Industry Type).
export const apiListQueues      = () => api.get('/admin/queues').then(r => r.data);
export const apiQueuesOverview  = () => api.get('/admin/queues/overview').then(r => r.data);
export const apiGetQueue        = (id) => api.get(`/admin/queues/${id}`).then(r => r.data);
export const apiCreateQueue     = (data) => api.post('/admin/queues', data).then(r => r.data);
export const apiUpdateQueue     = (id, data) => api.put(`/admin/queues/${id}`, data).then(r => r.data);
export const apiSetQueueEnabled = (id, enabled) => api.put(`/admin/queues/${id}/enabled`, { enabled }).then(r => r.data);
export const apiArchiveQueue    = (id) => api.put(`/admin/queues/${id}/archive`).then(r => r.data);
export const apiDeleteQueue     = (id) => api.delete(`/admin/queues/${id}`).then(r => r.data);
export const apiReorderQueues   = (orderedIds) => api.put('/admin/queues/reorder', { orderedIds }).then(r => r.data);
export const apiQueueStaff      = (id) => api.get(`/admin/queues/${id}/staff`).then(r => r.data);
export const apiQueueAnalytics  = (id) => api.get(`/admin/queues/${id}/analytics`).then(r => r.data);
