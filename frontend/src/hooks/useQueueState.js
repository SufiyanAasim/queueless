/**
 * Live queue state subscription.
 *
 * Returns the current { state, tokens } and updates automatically whenever
 * Firebase pushes a change. This is the cloud-real-time-sync feature in
 * action - no polling, no manual refresh.
 */
import { useEffect, useState } from 'react';
import { db, ref, onValue } from '../firebase.js';

export function useQueueState() {
  const [data, setData] = useState({ state: null, tokens: {}, announcement: null, loading: true, error: null });

  useEffect(() => {
    const stateRef        = ref(db, 'queue/state');
    const tokensRef       = ref(db, 'queue/tokens');
    const announcementRef = ref(db, 'queue/announcement');

    const stateUnsub = onValue(
      stateRef,
      (snap) => setData(d => ({ ...d, state: snap.val(), loading: false })),
      (err)  => setData(d => ({ ...d, error: err.message, loading: false }))
    );
    const tokensUnsub = onValue(
      tokensRef,
      (snap) => setData(d => ({ ...d, tokens: snap.val() || {}, loading: false })),
      (err)  => setData(d => ({ ...d, error: err.message, loading: false }))
    );
    const announcementUnsub = onValue(
      announcementRef,
      (snap) => setData(d => ({ ...d, announcement: snap.val() })),
      () => {}
    );

    return () => {
      stateUnsub();
      tokensUnsub();
      announcementUnsub();
    };
  }, []);

  return data;
}

/**
 * Live status for a single token. Listens to that token's node directly so
 * we get push updates the moment its status changes (e.g., when an admin
 * calls it).
 */
export function useTokenLive(tokenId) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (!tokenId) return;
    const tokenRef = ref(db, `queue/tokens/${tokenId}`);
    const unsub = onValue(tokenRef, (snap) => setToken(snap.val()));
    return () => unsub();
  }, [tokenId]);

  return token;
}
