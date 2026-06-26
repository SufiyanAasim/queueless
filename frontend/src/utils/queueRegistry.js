/**
 * Lightweight in-memory registry of the organisation's admin-defined queues.
 *
 * Populated by useAppConfig() whenever /config loads. Because getServices() and
 * getServiceLabel() read from here, every page that resolves a token's `service`
 * to a human label automatically shows custom-queue names/prefixes — no per-page
 * wiring required. Falls back to the static industry profile when empty.
 */
let customQueues = [];
const listeners = new Set();

export function setCustomQueues(queues) {
  customQueues = Array.isArray(queues) ? queues : [];
  listeners.forEach(fn => { try { fn(customQueues); } catch { /* noop */ } });
}

export function getCustomQueues() {
  return customQueues;
}

export function hasCustomQueues() {
  return customQueues.length > 0;
}

export function subscribeCustomQueues(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
