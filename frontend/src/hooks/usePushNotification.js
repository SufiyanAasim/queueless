import { useState } from 'react';

export function usePushNotification() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const request = async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const notify = (title, body, options = {}) => {
    if (permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon: '/svg/queueless-wordmark-light.svg',
        tag: 'queueless-token',
        requireInteraction: true,
        ...options,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  };

  return { permission, request, notify };
}
