import { api } from './client.js';

// Shared files (RTDB-backed; Spark-plan friendly).
export const apiUploadFile = (data) => api.post('/uploads', data).then(r => r.data);
export const apiListFiles  = () => api.get('/uploads').then(r => r.data);
export const apiGetFile    = (id) => api.get(`/uploads/${id}`).then(r => r.data);
export const apiDeleteFile = (id) => api.delete(`/uploads/${id}`).then(r => r.data);
