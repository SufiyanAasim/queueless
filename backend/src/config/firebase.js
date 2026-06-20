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

const refs = {
  queueState: () => db.ref('queue/state'),
  tokens: () => db.ref('queue/tokens'),
  token: (id) => db.ref(`queue/tokens/${id}`),
  counter: () => db.ref('queue/counter'),
  admins: () => db.ref('admins'),
  admin: (username) => db.ref(`admins/${username}`),
  staff: () => db.ref('staff'),
  staffMember: (username) => db.ref(`staff/${username}`),
  presence: () => db.ref('presence'),
  presenceMember: (username) => db.ref(`presence/${username}`),
  appConfig: () => db.ref('config'),
  feedback: () => db.ref('feedback'),
  feedbackEntry: (tokenId) => db.ref(`feedback/${tokenId}`),
};

module.exports = { admin, db, refs };
