import { useEffect, useState } from 'react';
import { apiPublicConfig } from '../services/api.js';

export function useAppConfig() {
  const [cfg, setCfg] = useState(() => {
    try { return JSON.parse(localStorage.getItem('queueless.appConfig') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    apiPublicConfig().then(data => {
      setCfg(data);
      localStorage.setItem('queueless.appConfig', JSON.stringify(data));
    }).catch(() => {});
  }, []);

  return cfg || { industry: 'general', orgName: 'QueueLess' };
}
