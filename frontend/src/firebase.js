/**
 * Firebase client SDK initialization.
 *
 * Uses Realtime Database for live queue state. Read access is governed by
 * the rules in /firebase/database.rules.json - clients can READ the queue
 * but not WRITE (writes go through our backend, which uses Admin SDK).
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, set, onDisconnect } from 'firebase/database';
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Analytics is browser-only and requires a valid measurementId. Initialize it
// lazily and defensively so a missing config value or unsupported environment
// (SSR, some browsers) never throws and breaks the app shell.
let analytics = null;
if (firebaseConfig.measurementId) {
  analyticsIsSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(() => { /* analytics unavailable - non-fatal */ });
}

export { db, ref, onValue, off, set, onDisconnect, app, analytics };
