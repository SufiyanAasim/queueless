const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const config = require('../config/env');
const { refs } = require('../config/firebase');

let mongoClient = null;
let mongoCollection = null;
let mongoTokensCollection = null;

// Column order is the contract with the DM pipeline — keep stable.
const CSV_COLUMNS = [
  'event_type',
  'token_id',
  'token_number',
  'service',
  'timestamp',
  'iso_timestamp',
  'queue_length',
  'wait_duration_seconds',
  'service_duration_seconds',
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function ensureCsvHeader(filepath) {
  const dir = path.dirname(filepath);
  await fsp.mkdir(dir, { recursive: true });
  try {
    await fsp.access(filepath, fs.constants.F_OK);
  } catch {
    await fsp.writeFile(filepath, CSV_COLUMNS.join(',') + '\n', 'utf8');
  }
}

async function appendCsv(event) {
  const filepath = path.resolve(__dirname, '..', '..', config.analytics.csvPath);
  await ensureCsvHeader(filepath);
  const row = CSV_COLUMNS.map(col => csvEscape(event[col])).join(',') + '\n';
  await fsp.appendFile(filepath, row, 'utf8');
}

async function getMongoDb() {
  if (!mongoClient) {
    const { MongoClient } = require('mongodb');
    mongoClient = new MongoClient(config.analytics.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
  }
  return mongoClient.db(config.analytics.mongo.db);
}

async function getMongoCollection() {
  if (mongoCollection) return mongoCollection;
  const db = await getMongoDb();
  mongoCollection = db.collection(config.analytics.mongo.collection);
  return mongoCollection;
}

async function getMongoTokensCollection() {
  if (mongoTokensCollection) return mongoTokensCollection;
  const db = await getMongoDb();
  mongoTokensCollection = db.collection(config.analytics.mongo.tokensCollection);
  return mongoTokensCollection;
}

async function appendMongo(event) {
  const col = await getMongoCollection();
  await col.insertOne(event);
}

/**
 * Mirror a complete token record into MongoDB (the `tokens` collection), keyed by
 * the token's own id. Called at every lifecycle transition (issued / called /
 * served / referred / expired) so Mongo holds the full, current state of every
 * token alongside the append-only `queue_events` log. Firebase RTDB remains the
 * live operational store; this is a durable analytical mirror. Non-fatal on error.
 */
async function upsertTokenRecord(token) {
  if (!config.analytics.mongo.uri || !token || !token.id) return;
  try {
    const col = await getMongoTokensCollection();
    const { id, ...rest } = token;
    await col.updateOne(
      { _id: id },
      { $set: { ...rest, id, updatedAt: Date.now() } },
      { upsert: true }
    );
  } catch (err) {
    console.error('[analytics] upsertTokenRecord failed (non-fatal):', err.message);
  }
}

async function logEvent(event) {
  const enriched = {
    event_type: event.event_type,
    token_id: event.token_id || null,
    token_number: event.token_number || null,
    service: event.service || null,
    timestamp: event.timestamp || Date.now(),
    iso_timestamp: new Date(event.timestamp || Date.now()).toISOString(),
    queue_length: event.queue_length ?? null,
    wait_duration_seconds: event.wait_duration_seconds ?? null,
    service_duration_seconds: event.service_duration_seconds ?? null,
    staff_username: event.staff_username || null,
  };

  const writes = [];
  if (config.analytics.mongo.uri) {
    writes.push(appendMongo(enriched));
  }
  writes.push(appendCsv(enriched));

  await Promise.allSettled(writes);
}

const CSV_CACHE = {
  data: null,
  timestamp: 0,
  TTL_MS: 30 * 1000,
};

async function getTrafficStats() {
  if (CSV_CACHE.data && Date.now() - CSV_CACHE.timestamp < CSV_CACHE.TTL_MS) {
    return CSV_CACHE.data;
  }

  try {
    let events = [];

    // Collect wait-time stats from event log (only source for wait durations)
    let sumWait = 0;
    let waitCount = 0;

    if (config.analytics.sink === 'mongo') {
      const col = await getMongoCollection();
      const callEvents = await col.find({ event_type: 'token_called' }).toArray();
      for (const ev of callEvents) {
        const waitSecs = ev.wait_duration_seconds;
        if (waitSecs !== null && waitSecs !== undefined && !isNaN(waitSecs)) {
          sumWait += waitSecs;
          waitCount++;
        }
      }
    } else {
      const filepath = path.resolve(__dirname, '..', '..', config.analytics.csvPath);
      try {
        const content = await fsp.readFile(filepath, 'utf8');
        const lines = content.trim().split('\n');
        // Build column-name → index map from the header row
        const headerCols = lines[0].split(',').map(c => c.trim());
        const colIdx = {};
        headerCols.forEach((c, i) => { colIdx[c] = i; });
        const dataLines = lines.slice(1);
        dataLines.filter(l => l).forEach(line => {
          const parts = line.split(',');
          const eventType = parts[colIdx['event_type']] || '';
          if (eventType === 'token_called') {
            const waitSecs = parseInt(parts[colIdx['wait_duration_seconds']], 10);
            if (!isNaN(waitSecs)) { sumWait += waitSecs; waitCount++; }
          }
        });
      } catch { /* CSV not yet written */ }
    }

    // Use Firebase RTDB as the authoritative source for token counts
    // (covers all historical tokens, including any issued before event-log setup)
    const peakHours = {};
    const peakHoursByService = {};
    const serviceDistribution = {};
    let totalIssued = 0;
    let totalExpired = 0;
    let totalReferred = 0;

    const now = Date.now();
    const dailyTrend = {};
    for (let i = 6; i >= 0; i--) {
      const key = new Date(now - i * 86400000).toISOString().slice(0, 10);
      dailyTrend[key] = 0;
    }

    try {
      const fbSnap = await refs.tokens().once('value');
      const fbTokens = Object.values(fbSnap.val() || {});
      totalIssued = fbTokens.length;

      for (const token of fbTokens) {
        if (token.status === 'expired') totalExpired++;
        if (token.referred === true) totalReferred++;
        const ts = token.issuedAt;
        if (!ts) continue;
        const svc = token.service || 'general';
        const hour = new Date(ts).getHours();
        const dayKey = new Date(ts).toISOString().slice(0, 10);

        peakHours[hour] = (peakHours[hour] || 0) + 1;
        if (!peakHoursByService[svc]) peakHoursByService[svc] = {};
        peakHoursByService[svc][hour] = (peakHoursByService[svc][hour] || 0) + 1;
        serviceDistribution[svc] = (serviceDistribution[svc] || 0) + 1;
        if (dayKey in dailyTrend) dailyTrend[dayKey]++;
      }
    } catch (fbErr) {
      console.error('[analytics] Firebase token read failed, falling back to event log:', fbErr.message);
    }

    const dropOffRate = totalIssued > 0 ? (totalExpired / totalIssued) : 0;
    const avgWaitSeconds = waitCount > 0 ? (sumWait / waitCount) : 0;
    const staffingRecommendation = [];
    for (let h = 0; h < 24; h++) {
      if ((peakHours[h] || 0) > 10) staffingRecommendation.push(h);
    }

    CSV_CACHE.data = {
      peakHours,
      peakHoursByService,
      totalIssued,
      totalExpired,
      totalReferred,
      dropOffRate,
      avgWaitSeconds,
      staffingRecommendation,
      serviceDistribution,
      dailyTrend,
    };
    CSV_CACHE.timestamp = Date.now();
    return CSV_CACHE.data;
  } catch (err) {
    console.error('[analytics] Failed to get traffic stats:', err.message);
    return {
      peakHours: {},
      peakHoursByService: {},
      totalIssued: 0,
      totalExpired: 0,
      totalReferred: 0,
      dropOffRate: 0,
      avgWaitSeconds: 0,
      staffingRecommendation: [],
      serviceDistribution: {},
      dailyTrend: {}
    };
  }
}

async function getStaffMetrics() {
  try {
    if (!config.analytics.mongo.uri) return [];
    const col = await getMongoCollection();

    const pipeline = [
      {
        $match: {
          event_type: { $in: ['token_called', 'token_served'] },
          staff_username: { $ne: null, $exists: true },
        },
      },
      {
        $group: {
          _id: { username: '$staff_username', event_type: '$event_type' },
          count: { $sum: 1 },
          totalSeconds: { $sum: { $ifNull: ['$service_duration_seconds', 0] } },
        },
      },
      {
        $group: {
          _id: '$_id.username',
          events: {
            $push: {
              event_type: '$_id.event_type',
              count: '$count',
              totalSeconds: '$totalSeconds',
            },
          },
        },
      },
    ];

    const results = await col.aggregate(pipeline).toArray();

    return results.map(doc => {
      const servedEvent = doc.events.find(e => e.event_type === 'token_served');
      const calledEvent = doc.events.find(e => e.event_type === 'token_called');
      const tokensServed = servedEvent ? servedEvent.count : 0;
      const totalServiceSeconds = servedEvent ? servedEvent.totalSeconds : 0;
      const avgServiceSeconds = tokensServed > 0 ? Math.round(totalServiceSeconds / tokensServed) : 0;
      return {
        username: doc._id,
        tokensServed,
        avgServiceSeconds,
        tokensCalled: calledEvent ? calledEvent.count : 0,
      };
    }).sort((a, b) => b.tokensServed - a.tokensServed);
  } catch (err) {
    console.error('[analytics] getStaffMetrics failed (non-fatal):', err.message);
    return [];
  }
}

async function close() {
  if (mongoClient) await mongoClient.close();
  mongoClient = null;
  mongoCollection = null;
  mongoTokensCollection = null;
}

module.exports = { logEvent, close, CSV_COLUMNS, getTrafficStats, getStaffMetrics, upsertTokenRecord };
