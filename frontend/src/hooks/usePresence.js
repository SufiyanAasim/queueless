import { useEffect } from 'react';
import { db, ref, onValue, set, onDisconnect } from '../firebase.js';

export function usePresence(username, service) {
  useEffect(() => {
    if (!username) return;

    const presenceRef = ref(db, `presence/${username}`);
    const connectedRef = ref(db, '.info/connected');

    const unsub = onValue(connectedRef, (snap) => {
      if (!snap.val()) return;
      // Register offline state on disconnect before going online — avoids a race if tab crashes.
      onDisconnect(presenceRef).set({ online: false, lastSeen: Date.now(), service, username });
      set(presenceRef, { online: true, lastSeen: Date.now(), service, username });
    });

    return () => {
      unsub();
      set(presenceRef, { online: false, lastSeen: Date.now(), service, username });
    };
  }, [username, service]);
}
