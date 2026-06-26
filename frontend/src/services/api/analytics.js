import { api } from './client.js';

export const apiAnalytics    = () => api.get('/admin/analytics').then(r => r.data);
export const apiStaffMetrics = () => api.get('/admin/analytics/staff').then(r => r.data);
export const apiFeedback     = () => api.get('/admin/feedback').then(r => r.data);

// Predictive insights (queue-load forecast + explainable recommendations).
export const apiPredictions = () => api.get('/admin/predictions').then(r => r.data);
