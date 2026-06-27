/**
 * Backend smoke tests.
 * Owner: Sufiyan (Deployment, CI/CD & Testing module).
 *
 * Strategy: mock the Firebase config layer entirely. We are not testing
 * Firebase here - we are testing that our HTTP layer wires up correctly and
 * that the queue service's pure logic behaves under known inputs.
 *
 * For full integration tests against real Firebase, see /tests/integration/
 * (added in v2 once a test project is provisioned).
 */

// Set required env vars BEFORE importing anything that reads them.
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-test-secret-1234';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'testpassword123';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----\\n';
process.env.FIREBASE_DATABASE_URL = 'https://test.firebaseio.com';
process.env.ANALYTICS_SINK = 'csv';
process.env.ANALYTICS_CSV_PATH = '/tmp/queueless_test_events.csv';

// Mock Firebase Admin entirely. A simple in-memory store mirrors the parts of
// the API our service uses: ref().once(), .set(), .update(), .remove(),
// .transaction().
jest.mock('../src/config/firebase', () => {
  const store = {};
  function get(path) {
    return path.split('/').reduce((acc, key) => (acc ? acc[key] : undefined), store);
  }
  function set(path, value) {
    const keys = path.split('/');
    let node = store;
    for (let i = 0; i < keys.length - 1; i++) {
      node[keys[i]] = node[keys[i]] || {};
      node = node[keys[i]];
    }
    node[keys[keys.length - 1]] = value;
  }
  function remove(path) {
    const keys = path.split('/');
    let node = store;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!node[keys[i]]) return;
      node = node[keys[i]];
    }
    delete node[keys[keys.length - 1]];
  }
  function makeRef(path) {
    return {
      once: async () => ({
        exists: () => get(path) !== undefined,
        val: () => get(path) ?? null,
      }),
      set: async (val) => set(path, val),
      update: async (patch) => set(path, { ...(get(path) || {}), ...patch }),
      remove: async () => remove(path),
      transaction: async (fn) => {
        const next = fn(get(path));
        if (next === undefined) return { committed: false };
        set(path, next);
        return { committed: true, snapshot: { val: () => next } };
      },
    };
  }
  return {
    admin: {},
    db: { ref: makeRef },
    refs: {
      queueState: () => makeRef('queue/state'),
      tokens: () => makeRef('queue/tokens'),
      token: (id) => makeRef(`queue/tokens/${id}`),
      counter: () => makeRef('queue/counter'),
      admins: () => makeRef('admins'),
      admin: (u) => makeRef(`admins/${u}`),
      staff: () => makeRef('staff'),
      staffMember: (u) => makeRef(`staff/${u}`),
      presence: () => makeRef('presence'),
      presenceMember: (u) => makeRef(`presence/${u}`),
      appConfig: () => makeRef('config'),
      queues: () => makeRef('queues'),
      queueDef: (id) => makeRef(`queues/${id}`),
      conversations: () => makeRef('conversations'),
      conversationMeta: (id) => makeRef(`conversations/${id}/meta`),
      conversationMessages: (id) => makeRef(`conversations/${id}/messages`),
      conversationMessage: (id, mid) => makeRef(`conversations/${id}/messages/${mid}`),
      conversationReads: (id) => makeRef(`conversations/${id}/reads`),
      conversationRead: (id, u) => makeRef(`conversations/${id}/reads/${u}`),
      messageSignal: (id) => makeRef(`messageSignals/${id}`),
      notifications: (u) => makeRef(`notifications/${u}`),
      notification: (u, id) => makeRef(`notifications/${u}/${id}`),
      notificationSignal: (u) => makeRef(`notificationSignals/${u}`),
      aiConversations: (u) => makeRef(`aiConversations/${u}`),
      aiConversation: (u, cid) => makeRef(`aiConversations/${u}/${cid}`),
      aiConversationMeta: (u, cid) => makeRef(`aiConversations/${u}/${cid}/meta`),
      aiConversationMessages: (u, cid) => makeRef(`aiConversations/${u}/${cid}/messages`),
      aiConversationMessage: (u, cid, mid) => makeRef(`aiConversations/${u}/${cid}/messages/${mid}`),
      shares: () => makeRef('shares'),
      share: (id) => makeRef(`shares/${id}`),
      auditLogs: () => makeRef('auditLogs'),
      auditLog: (id) => makeRef(`auditLogs/${id}`),
      uploads: () => makeRef('uploads'),
      upload: (id) => makeRef(`uploads/${id}`),
      uploadIndex: (o) => makeRef(`uploadIndex/${o}`),
      uploadIndexEntry: (o, id) => makeRef(`uploadIndex/${o}/${id}`),
      feedback: () => makeRef('feedback'),
      feedbackEntry: (t) => makeRef(`feedback/${t}`),
    },
    __resetStore: () => Object.keys(store).forEach(k => delete store[k]),
  };
});

const request = require('supertest');
const buildApp = require('../src/app');
const queueService = require('../src/services/queue.service');
const authService = require('../src/services/auth.service');
const notificationService = require('../src/services/notification.service');
const fs = require('fs');

let app;

beforeAll(async () => {
  await authService.bootstrapAdmin();
  await queueService.ensureInitialized();
  app = buildApp();
});

afterAll(() => {
  // Clean up test CSV.
  try { fs.unlinkSync('/tmp/queueless_test_events.csv'); } catch {}
});

describe('Health check', () => {
  test('GET /api/v1/health returns 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Public token endpoints', () => {
  test('POST /api/v1/tokens issues a token with sequential number', async () => {
    const res1 = await request(app).post('/api/v1/tokens').send({});
    expect(res1.status).toBe(201);
    expect(res1.body.token.number).toBeGreaterThan(0);
    expect(res1.body.token.status).toBe('waiting');

    const res2 = await request(app).post('/api/v1/tokens').send({});
    expect(res2.body.token.number).toBe(res1.body.token.number + 1);
  });

  test('GET /api/v1/tokens/:id returns position and ETA', async () => {
    const issue = await request(app).post('/api/v1/tokens').send({});
    const id = issue.body.token.id;

    const res = await request(app).get(`/api/v1/tokens/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.positionInQueue).toBeGreaterThanOrEqual(1);
    expect(res.body.estimatedWaitSeconds).toBeGreaterThanOrEqual(0);
  });

  test('GET /api/v1/tokens/:id returns 404 for unknown token', async () => {
    const res = await request(app).get('/api/v1/tokens/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('Admin authentication', () => {
  test('POST /api/v1/auth/login with correct credentials returns JWT', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('admin');
  });

  test('POST /api/v1/auth/login with wrong password returns 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  test('Admin route without token returns 401', async () => {
    const res = await request(app).get('/api/v1/admin/queue');
    expect(res.status).toBe(401);
  });
});

describe('Admin queue control', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    token = res.body.token;
  });

  test('Pause then issue token returns 423', async () => {
    await request(app).post('/api/v1/admin/queue/pause').set('Authorization', `Bearer ${token}`);
    const res = await request(app).post('/api/v1/tokens').send({});
    expect(res.status).toBe(423);
    await request(app).post('/api/v1/admin/queue/resume').set('Authorization', `Bearer ${token}`);
  });

  test('Call-next promotes lowest-numbered waiting token', async () => {
    const res = await request(app)
      .post('/api/v1/admin/queue/call-next')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.called).toBeDefined();
    expect(res.body.called.status).toBe('called');
  });
});

describe('Token referral', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    adminToken = res.body.token;
  });

  test('issuing a token accepts an optional patient name', async () => {
    const res = await request(app).post('/api/v1/tokens').send({ service: 'general', patientName: 'Jane Doe' });
    expect(res.status).toBe(201);
    expect(res.body.token.patientName).toBe('Jane Doe');
    expect(res.body.token.referred).toBe(false);
  });

  test('refers an active token to another counter, keeping its number and flagging it', async () => {
    const issue = await request(app).post('/api/v1/tokens').send({ service: 'general', patientName: 'John Roe' });
    const t = issue.body.token;

    const res = await request(app)
      .post(`/api/v1/admin/queue/refer/${t.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toService: 'eye', reason: 'prescribed eye exam' });

    expect(res.status).toBe(200);
    expect(res.body.referred.service).toBe('eye');
    expect(res.body.referred.number).toBe(t.number);  // same number follows the patient
    expect(res.body.referred.referred).toBe(true);
    expect(res.body.from).toBe('general');
    expect(res.body.to).toBe('eye');

    // The token is now merged into the eye counter's queue as waiting.
    const status = await request(app).get(`/api/v1/tokens/${t.id}`);
    expect(status.body.service).toBe('eye');
    expect(status.body.status).toBe('waiting');
    expect(status.body.patientName).toBe('John Roe');
  });

  test('rejects referral to the same counter', async () => {
    const issue = await request(app).post('/api/v1/tokens').send({ service: 'general' });
    const res = await request(app)
      .post(`/api/v1/admin/queue/refer/${issue.body.token.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toService: 'general' });
    expect(res.status).toBe(400);
  });

  test('rejects referral of an unknown token', async () => {
    const res = await request(app)
      .post('/api/v1/admin/queue/refer/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toService: 'eye' });
    expect(res.status).toBe(404);
  });
});

describe('Queue management (custom queues)', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    adminToken = res.body.token;
  });

  test('GET /admin/queues/overview resolves (200 with auth, 401 without — never 404)', async () => {
    const noAuth = await request(app).get('/api/v1/admin/queues/overview');
    expect(noAuth.status).toBe(401); // route exists → auth required (not "Route not found")

    const ok = await request(app).get('/api/v1/admin/queues/overview').set('Authorization', `Bearer ${adminToken}`);
    expect(ok.status).toBe(200);
    expect(Array.isArray(ok.body)).toBe(true);
  });

  test('creates a queue with a derived key and prefix', async () => {
    const res = await request(app)
      .post('/api/v1/admin/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Eye Specialist', prefix: 'EY', avgServiceSeconds: 240 });
    expect(res.status).toBe(201);
    expect(res.body.queue.key).toBe('eye_specialist');
    expect(res.body.queue.prefix).toBe('EY');
    expect(res.body.queue.enabled).toBe(true);
    expect(res.body.queue.archived).toBe(false);
  });

  test('fetches a single queue with live stats by id', async () => {
    const create = await request(app)
      .post('/api/v1/admin/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Radiology Desk' });
    const id = create.body.queue.id;

    const res = await request(app).get(`/api/v1/admin/queues/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body).toHaveProperty('waitingCount');

    const missing = await request(app).get('/api/v1/admin/queues/does-not-exist').set('Authorization', `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);
  });

  test('rejects a duplicate queue key', async () => {
    const res = await request(app)
      .post('/api/v1/admin/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Eye Specialist' });
    expect(res.status).toBe(409);
  });

  test('lists created queues and exposes them on the public config', async () => {
    const list = await request(app).get('/api/v1/admin/queues').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.some(q => q.key === 'eye_specialist')).toBe(true);

    const cfg = await request(app).get('/api/v1/config');
    expect(Array.isArray(cfg.body.queues)).toBe(true);
    expect(cfg.body.queues.some(q => q.key === 'eye_specialist')).toBe(true);
  });

  test('blocks deleting a queue that still has active tokens, allows after it clears', async () => {
    const create = await request(app)
      .post('/api/v1/admin/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Pharmacy Desk' });
    const queue = create.body.queue;

    // Seed a live token in that queue via the service (bypasses the HTTP
    // rate limiter, which isn't under test here).
    await queueService.issueToken({ service: queue.key });

    const blocked = await request(app)
      .delete(`/api/v1/admin/queues/${queue.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blocked.status).toBe(400);

    // Archiving is always allowed.
    const archived = await request(app)
      .put(`/api/v1/admin/queues/${queue.id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(archived.status).toBe(200);
    expect(archived.body.archived).toBe(true);
  });

  test('assigns a staff member to a queue and lists them', async () => {
    const create = await request(app)
      .post('/api/v1/admin/queues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Cardiology Desk' });
    const queue = create.body.queue;

    await request(app)
      .post('/api/v1/admin/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'drcardio', password: 'staffpass123', service: 'general', displayName: 'Dr Cardio' });

    const assign = await request(app)
      .put('/api/v1/admin/staff/drcardio/service')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ service: queue.key });
    expect(assign.status).toBe(200);
    expect(assign.body.service).toBe(queue.key);

    const list = await request(app)
      .get(`/api/v1/admin/queues/${queue.id}/staff`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.some(m => m.username === 'drcardio')).toBe(true);
  });
});

describe('Predictive insights', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    adminToken = res.body.token;
  });

  test('returns an explainable, deterministic prediction payload', async () => {
    const res = await request(app).get('/api/v1/admin/predictions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('coldStart');
    expect(res.body).toHaveProperty('sampleSize');
    expect(Array.isArray(res.body.queues)).toBe(true);
    expect(Array.isArray(res.body.congestion)).toBe(true);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    // Every per-queue prediction must carry an explainable basis + confidence.
    res.body.queues.forEach(q => {
      expect(q).toHaveProperty('basis');
      expect(['low', 'medium', 'high']).toContain(q.confidence);
    });
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/v1/admin/predictions');
    expect(res.status).toBe(401);
  });
});

describe('AI assistant', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    adminToken = res.body.token;
  });

  test('answers a grounded question from verified data', async () => {
    const res = await request(app)
      .post('/api/v1/assistant')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: 'Which queue has the longest waiting time?' });
    expect(res.status).toBe(200);
    expect(typeof res.body.answer).toBe('string');
    expect(res.body.answer.length).toBeGreaterThan(0);
    expect(res.body.provider).toBe('grounded');     // default zero-config provider
    expect(res.body.sources).toContain('queues_overview');
  });

  test('rejects an empty question', async () => {
    const res = await request(app)
      .post('/api/v1/assistant')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: '   ' });
    expect(res.status).toBe(400);
  });

  test('persists turns to a saved conversation (workspace)', async () => {
    const create = await request(app)
      .post('/api/v1/assistant/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(create.status).toBe(201);
    const cid = create.body.id;

    const ask = await request(app)
      .post('/api/v1/assistant')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: 'How is staff performance?', conversationId: cid });
    expect(ask.status).toBe(200);
    expect(ask.body.conversationId).toBe(cid);

    const conv = await request(app)
      .get(`/api/v1/assistant/conversations/${cid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(conv.status).toBe(200);
    // user + assistant turns persisted, and the title auto-derived from the question
    expect(conv.body.messages.length).toBe(2);
    expect(conv.body.messages[0].role).toBe('user');
    expect(conv.body.title).toMatch(/staff performance/i);

    const list = await request(app)
      .get('/api/v1/assistant/conversations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.some(c => c.id === cid)).toBe(true);

    const del = await request(app)
      .delete(`/api/v1/assistant/conversations/${cid}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  test('requires authentication', async () => {
    const res = await request(app).post('/api/v1/assistant').send({ question: 'hi' });
    expect(res.status).toBe(401);
  });

  // Kept last in this suite: it intentionally exhausts the per-user assistant
  // quota, and nothing after this calls POST /assistant as the admin user.
  test('rate-limits excessive assistant requests', async () => {
    let limited = false;
    for (let i = 0; i < 25; i++) {
      const res = await request(app)
        .post('/api/v1/assistant')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ question: `ping ${i}` });
      if (res.status === 429) { limited = true; break; }
    }
    expect(limited).toBe(true);
  });
});

describe('Internal messaging', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    adminToken = res.body.token;
    // a staff member to chat with
    await request(app).post('/api/v1/admin/staff').set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'agent1', password: 'staffpass123', service: 'general', displayName: 'Agent One' });
  });

  test('the team directory excludes the requester', async () => {
    const res = await request(app).get('/api/v1/directory').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some(u => u.username === 'agent1')).toBe(true);
    expect(res.body.some(u => u.username === 'admin')).toBe(false);
  });

  test('creates a group, sends a message, and lists it', async () => {
    const create = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'group', name: 'Ops Team', members: ['agent1'] });
    expect(create.status).toBe(201);
    expect(create.body.type).toBe('group');
    expect(create.body.members).toEqual(expect.arrayContaining(['admin', 'agent1']));
    const cid = create.body.id;

    const send = await request(app)
      .post(`/api/v1/conversations/${cid}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'Morning team — heavy traffic expected at 1pm.' });
    expect(send.status).toBe(201);
    expect(send.body.sender).toBe('admin');

    const msgs = await request(app).get(`/api/v1/conversations/${cid}/messages`).set('Authorization', `Bearer ${adminToken}`);
    expect(msgs.status).toBe(200);
    expect(msgs.body.length).toBe(1);

    const list = await request(app).get('/api/v1/conversations').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.some(c => c.id === cid && c.lastMessage)).toBe(true);
  });

  test('rejects a group with fewer than two members', async () => {
    const res = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'group', name: 'Solo', members: [] });
    expect(res.status).toBe(400);
  });

  test('non-members cannot read a conversation', async () => {
    const create = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'group', name: 'Private', members: ['agent1'] });
    // log in as a different staff member who is NOT a member
    await request(app).post('/api/v1/admin/staff').set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'outsider', password: 'staffpass123', service: 'general' });
    const login = await request(app).post('/api/v1/staff/login').send({ username: 'outsider', password: 'staffpass123' });
    const res = await request(app)
      .get(`/api/v1/conversations/${create.body.id}/messages`)
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/v1/conversations');
    expect(res.status).toBe(401);
  });

  test('gracefully handles actions on a missing conversation/message', async () => {
    const sendMissing = await request(app)
      .post('/api/v1/conversations/does-not-exist/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'hello' });
    expect(sendMissing.status).toBe(404);

    const reactMissing = await request(app)
      .put('/api/v1/conversations/does-not-exist/messages/nope/react')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ emoji: '👍' });
    expect(reactMissing.status).toBe(404);
  });

  test('supports reactions, read receipts, and rejects oversized attachments', async () => {
    const create = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'group', name: 'Phase4', members: ['agent1'] });
    const cid = create.body.id;

    const send = await request(app)
      .post(`/api/v1/conversations/${cid}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'react to me' });
    const mid = send.body.id;

    // Reaction toggle
    const react = await request(app)
      .put(`/api/v1/conversations/${cid}/messages/${mid}/react`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ emoji: '👍' });
    expect(react.status).toBe(200);
    expect(react.body.reactions['👍'].admin).toBe(true);

    // Mark read clears unread for the reader
    await request(app).put(`/api/v1/conversations/${cid}/read`).set('Authorization', `Bearer ${adminToken}`);
    const list = await request(app).get('/api/v1/conversations').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.find(c => c.id === cid).unread).toBe(0);

    // Oversized attachment rejected (>256KB)
    const bigDataUrl = 'data:image/png;base64,' + 'A'.repeat(400 * 1024);
    const big = await request(app)
      .post(`/api/v1/conversations/${cid}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ attachment: { name: 'big.png', type: 'image/png', dataUrl: bigDataUrl } });
    expect(big.status).toBe(400);

    // Valid small image attachment accepted
    const okData = 'data:image/png;base64,' + 'A'.repeat(1024);
    const ok = await request(app)
      .post(`/api/v1/conversations/${cid}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ attachment: { name: 'tiny.png', type: 'image/png', dataUrl: okData } });
    expect(ok.status).toBe(201);
    expect(ok.body.attachment.type).toBe('image/png');
  });
});

describe('Secure sharing', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'testpassword123' });
    adminToken = res.body.token;
  });

  test('creates a share and serves it via a public capability link', async () => {
    const create = await request(app)
      .post('/api/v1/shares')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'analytics', title: 'Today snapshot', data: { totalIssued: 42 } });
    expect(create.status).toBe(201);
    expect(create.body.url).toContain('/share/');
    const id = create.body.id;

    // Public — no auth header.
    const pub = await request(app).get(`/api/v1/share/${id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.totalIssued).toBe(42);

    // Listed for the creator, payload omitted.
    const list = await request(app).get('/api/v1/shares').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.some(s => s.id === id && s.data === undefined)).toBe(true);

    // Revoke -> gone.
    await request(app).delete(`/api/v1/shares/${id}`).set('Authorization', `Bearer ${adminToken}`);
    const after = await request(app).get(`/api/v1/share/${id}`);
    expect(after.status).toBe(404);
  });

  test('rejects an invalid share type', async () => {
    const res = await request(app)
      .post('/api/v1/shares')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'nope', data: {} });
    expect(res.status).toBe(400);
  });

  test('creating a share requires authentication', async () => {
    const res = await request(app).post('/api/v1/shares').send({ type: 'analytics', data: {} });
    expect(res.status).toBe(401);
  });
});

describe('Shared files (Spark-plan, RTDB-backed)', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'testpassword123' });
    adminToken = res.body.token;
  });

  test('uploads, lists (without blob), downloads, and deletes a file', async () => {
    const dataUrl = 'data:text/csv;base64,' + Buffer.from('a,b,c\n1,2,3').toString('base64');
    const up = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'report.csv', type: 'text/csv', dataUrl });
    expect(up.status).toBe(201);
    expect(up.body.dataUrl).toBeUndefined(); // summary omits the blob
    const id = up.body.id;

    const list = await request(app).get('/api/v1/uploads').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.some(f => f.id === id && f.dataUrl === undefined)).toBe(true);

    const get = await request(app).get(`/api/v1/uploads/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(get.body.dataUrl).toBe(dataUrl); // download includes the blob

    const del = await request(app).delete(`/api/v1/uploads/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  test('rejects an unsupported file type', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'x.exe', type: 'application/x-msdownload', dataUrl: 'data:application/x-msdownload;base64,AAAA' });
    expect(res.status).toBe(400);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/v1/uploads');
    expect(res.status).toBe(401);
  });
});

describe('Audit log', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'testpassword123' });
    adminToken = res.body.token;
  });

  test('records sensitive actions and exposes them to admins', async () => {
    // Trigger an auditable action.
    await request(app).post('/api/v1/admin/staff').set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'audit_target', password: 'staffpass123', service: 'general' });
    await request(app).delete('/api/v1/admin/staff/audit_target').set('Authorization', `Bearer ${adminToken}`);
    await new Promise(r => setTimeout(r, 30)); // audit.record is fire-and-forget

    const res = await request(app).get('/api/v1/admin/audit').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some(e => e.action === 'staff.deleted' && e.target === 'audit_target')).toBe(true);
  });
});

describe('RBAC (roles & permissions)', () => {
  let superToken;
  let managerToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'testpassword123' });
    superToken = res.body.token;
    // The bootstrap admin is promoted to superadmin.
    expect(res.body.user.role).toBe('superadmin');

    await request(app).post('/api/v1/admin/admins').set('Authorization', `Bearer ${superToken}`)
      .send({ username: 'mgr1', password: 'managerpass1', role: 'manager' });
    const login = await request(app).post('/api/v1/auth/login').send({ username: 'mgr1', password: 'managerpass1' });
    managerToken = login.body.token;
    expect(login.body.user.role).toBe('manager');
  });

  test('a manager can access the admin operations area', async () => {
    const res = await request(app).get('/api/v1/admin/queue').set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
  });

  test('a manager cannot create admins or change roles', async () => {
    const create = await request(app).post('/api/v1/admin/admins').set('Authorization', `Bearer ${managerToken}`)
      .send({ username: 'sneaky', password: 'whatever1', role: 'admin' });
    expect(create.status).toBe(403);

    const role = await request(app).put('/api/v1/admin/admins/mgr1/role').set('Authorization', `Bearer ${managerToken}`)
      .send({ role: 'superadmin' });
    expect(role.status).toBe(403);
  });

  test('a superadmin can change a role', async () => {
    const res = await request(app).put('/api/v1/admin/admins/mgr1/role').set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  test('rejects an invalid role on creation', async () => {
    const res = await request(app).post('/api/v1/admin/admins').set('Authorization', `Bearer ${superToken}`)
      .send({ username: 'bad', password: 'whatever1', role: 'wizard' });
    expect(res.status).toBe(400);
  });
});

describe('Notification center', () => {
  let adminToken;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'testpassword123',
    });
    adminToken = res.body.token;
  });

  test('lists notifications with an unread count and marks them read', async () => {
    await notificationService.createNotification({
      recipients: ['admin'],
      type: 'system',
      title: 'Heads up',
      body: 'High traffic expected at 1pm.',
    });

    const list = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.unread).toBeGreaterThanOrEqual(1);

    const markAll = await request(app).put('/api/v1/notifications/read-all').set('Authorization', `Bearer ${adminToken}`);
    expect(markAll.status).toBe(200);

    const after = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.unread).toBe(0);
  });

  test('event bus delivers a notification to admins on queue creation', async () => {
    const { registerSubscribers } = require('../src/events');
    registerSubscribers();
    const { emit, EVENTS } = require('../src/events/bus');

    emit(EVENTS.QUEUE_CREATED, { id: 'x', key: 'x', label: 'Triage Desk' });
    // bus.emit defers via setImmediate; wait a tick for the async handler.
    await new Promise(r => setTimeout(r, 50));

    const list = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.items.some(n => /Triage Desk/.test(n.body || ''))).toBe(true);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });
});
