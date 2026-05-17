/**
 * Firebase Admin SDK initialization.
 *
 * Initialized exactly once and reused across the application. The Admin SDK
 * uses a service account credential and bypasses the database security rules,
 * so we treat this client as the trusted server-side identity.
 */
const admin = require('firebase-admin');
const config = require('./env');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
    databaseURL: config.firebase.databaseURL,
  });
}

const db = admin.database();

// Reference helpers - centralizing path strings here keeps the schema
// documented in one place and avoids typos scattered across services.
const refs = {
  // Active queue state - the single source of truth the frontend listens to.
  queueState: () => db.ref('queue/state'),       // { status: "running"|"paused", currentTokenNumber, lastCalledAt }
  tokens: () => db.ref('queue/tokens'),          // { [tokenId]: { number, status, ... } }
  token: (id) => db.ref(`queue/tokens/${id}`),
  counter: () => db.ref('queue/counter'),        // monotonically increasing token number

  // Admin accounts - written via bootstrap, read on login.
  admins: () => db.ref('admins'),
  admin: (username) => db.ref(`admins/${username}`),
};

module.exports = { admin, db, refs };
