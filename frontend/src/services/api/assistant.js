import { api } from './client.js';

// AI operational assistant — grounded in verified backend data (RAG).
// `conversationId` (optional) persists the turn to the saved workspace history.
export const apiAssistant = (question, history, conversationId) =>
  api.post('/assistant', { question, history: history || [], conversationId: conversationId || undefined }).then(r => r.data);

// AI conversation workspace (persistent history).
export const apiListAiConversations  = () => api.get('/assistant/conversations').then(r => r.data);
export const apiCreateAiConversation = (title) => api.post('/assistant/conversations', { title }).then(r => r.data);
export const apiGetAiConversation    = (id) => api.get(`/assistant/conversations/${id}`).then(r => r.data);
export const apiUpdateAiConversation = (id, data) => api.put(`/assistant/conversations/${id}`, data).then(r => r.data);
export const apiDeleteAiConversation = (id) => api.delete(`/assistant/conversations/${id}`).then(r => r.data);
