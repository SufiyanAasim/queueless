/**
 * QueueLess API client — barrel.
 *
 * Implementations are organised by domain under ./api/*. This file re-exports
 * everything so existing imports (`import { apiX } from '../services/api.js'`)
 * keep working unchanged. Prefer importing from the domain modules in new code.
 */
export { api, ADMIN_TOKEN_KEY, STAFF_TOKEN_KEY, TOKEN_KEY } from './api/client.js';
export * from './api/public.js';
export * from './api/auth.js';
export * from './api/queue.js';
export * from './api/queues.js';
export * from './api/staff.js';
export * from './api/analytics.js';
export * from './api/admin.js';
export * from './api/assistant.js';
export * from './api/messaging.js';
export * from './api/notifications.js';
export * from './api/share.js';
export * from './api/files.js';
