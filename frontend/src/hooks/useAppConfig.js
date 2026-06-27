import { useEffect, useState } from 'react';
import { apiPublicConfig } from '../services/api.js';
import { setCustomQueues } from '../utils/queueRegistry.js';

export function useAppConfig() {
  const [cfg, setCfg] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('queueless.appConfig') || 'null');
      if (cached?.queues) setCustomQueues(cached.queues);
      return cached;
    } catch { return null; }
  });

  useEffect(() => {
    apiPublicConfig().then(data => {
      setCfg(data);
      setCustomQueues(Array.isArray(data.queues) ? data.queues : []);
      localStorage.setItem('queueless.appConfig', JSON.stringify(data));
    }).catch(() => {});
  }, []);

  // Live-update every consumer (e.g. the footer status bar) when settings are
  // saved, without a full page reload.
  useEffect(() => {
    const onUpdate = (e) => {
      const data = e.detail;
      if (!data) return;
      setCfg(data);
      setCustomQueues(Array.isArray(data.queues) ? data.queues : []);
    };
    window.addEventListener('queueless:config', onUpdate);
    return () => window.removeEventListener('queueless:config', onUpdate);
  }, []);

  return cfg || { industry: 'general', orgName: 'QueueLess' };
}
