import { api } from './client.js';

// Internal messaging — content served only via this JWT API (never client-read from RTDB).
export const apiDirectory             = () => api.get('/directory').then(r => r.data);
export const apiListConversations     = () => api.get('/conversations').then(r => r.data);
export const apiCreateConversation    = (data) => api.post('/conversations', data).then(r => r.data);
export const apiGetMessages           = (id) => api.get(`/conversations/${id}/messages`).then(r => r.data);
export const apiSendMessage           = (id, text, attachment) =>
  api.post(`/conversations/${id}/messages`, { text, attachment: attachment || undefined }).then(r => r.data);
export const apiMarkConversationRead  = (id) => api.put(`/conversations/${id}/read`).then(r => r.data);
export const apiReactMessage          = (id, mid, emoji) =>
  api.put(`/conversations/${id}/messages/${mid}/react`, { emoji }).then(r => r.data);
