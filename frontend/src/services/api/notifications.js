import { api } from './client.js';

export const apiNotifications             = () => api.get('/notifications').then(r => r.data);
export const apiMarkNotificationRead      = (id) => api.put(`/notifications/${id}/read`).then(r => r.data);
export const apiMarkAllNotificationsRead  = () => api.put('/notifications/read-all').then(r => r.data);
