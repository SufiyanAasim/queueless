import { useAppConfig } from './useAppConfig.js';
import { getServices } from '../utils/industry.js';
import { hasCustomQueues } from '../utils/queueRegistry.js';

/**
 * Resolves the active list of queues/counters for the current organisation.
 *
 * Delegates to getServices(), which is now custom-queue aware (admin-defined
 * queues take precedence over the static industry profile). Returns the legacy
 * { id, title, desc } shape plus a `labelOf` / `prefixOf` resolver.
 */
function humanize(key) {
  return String(key || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function useQueues() {
  const cfg = useAppConfig();
  const services = getServices(cfg.industry);

  const labelOf = (key) => services.find(s => s.id === key)?.title || humanize(key);
  const prefixOf = (key) => services.find(s => s.id === key)?.prefix || null;

  return { services, labelOf, prefixOf, hasCustom: hasCustomQueues(), industry: cfg.industry };
}
