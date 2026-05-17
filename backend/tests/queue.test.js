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
    db: {},
    refs: {
      queueState: () => makeRef('queue/state'),
      tokens: () => makeRef('queue/tokens'),
      token: (id) => makeRef(`queue/tokens/${id}`),
      counter: () => makeRef('queue/counter'),
      admins: () => makeRef('admins'),
      admin: (u) => makeRef(`admins/${u}`),
    },
    __resetStore: () => Object.keys(store).forEach(k => delete store[k]),
  };
});

const request = require('supertest');
const buildApp = require('../src/app');
const queueService = require('../src/services/queue.service');
const authService = require('../src/services/auth.service');
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
