/**
 * Analytics service - the bridge between the Cloud Computing project and
 * the Data Mining project.
 *
 * Every queue event the backend handles is appended here, so the DM pipeline
 * has a structured event log to mine. Two sinks are supported:
 *
 *   - "csv":   appends a row to a flat CSV file. Zero infra, fastest to set
 *              up, perfect for academic submission. The default.
 *   - "mongo": writes a document to MongoDB Atlas. Demonstrates a cloud NoSQL
 *              store and is the better choice if multiple backend instances
 *              run concurrently (CSV is a single-writer store).
 *
 * Failures here MUST NOT break user-facing requests. Callers should use
 * .catch() and log; the queue service does this.
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const config = require('../config/env');

let mongoClient = null;
let mongoCollection = null;

// CSV column order is the contract with the DM pipeline. Keep stable.
const CSV_COLUMNS = [
  'event_type',          // token_issued | token_called | token_served | token_expired | queue_paused | queue_resumed | queue_reset
  'token_id',
  'token_number',
  'service',
  'timestamp',           // ms since epoch
  'iso_timestamp',       // human-readable mirror, easier for pandas to parse
  'queue_length',        // tokens waiting at moment of event (if known)
  'wait_duration_seconds',     // for token_called events
  'service_duration_seconds',  // for token_served events
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote if contains comma, quote, or newline. Double internal quotes.
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

async function getMongoCollection() {
  if (mongoCollection) return mongoCollection;
  const { MongoClient } = require('mongodb');
  mongoClient = new MongoClient(config.analytics.mongo.uri, {
    serverSelectionTimeoutMS: 5000,
  });
  await mongoClient.connect();
  const db = mongoClient.db(config.analytics.mongo.db);
  mongoCollection = db.collection(config.analytics.mongo.collection);
  return mongoCollection;
}

async function appendMongo(event) {
  const col = await getMongoCollection();
  await col.insertOne(event);
}

/**
 * Public API: log a single queue event to the configured sink.
 */
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
  };

  if (config.analytics.sink === 'mongo') {
    return appendMongo(enriched);
  }
  return appendCsv(enriched);
}

const CSV_CACHE = {
  data: null,
  timestamp: 0,
  TTL_MS: 5 * 60 * 1000 // 5 minutes
};

async function getTrafficStats() {
  if (CSV_CACHE.data && Date.now() - CSV_CACHE.timestamp < CSV_CACHE.TTL_MS) {
    return CSV_CACHE.data;
  }

  try {
    let events = [];
    
    if (config.analytics.sink === 'mongo') {
      const col = await getMongoCollection();
      events = await col.find({}).toArray();
    } else {
      const filepath = path.resolve(__dirname, '..', '..', config.analytics.csvPath);
      const content = await fsp.readFile(filepath, 'utf8');
      const lines = content.trim().split('\n').slice(1);
      
      events = lines.filter(line => line).map(line => {
        const parts = line.split(',');
        return {
          event_type: parts[0],
          service: parts[3],
          timestamp: parseInt(parts[4]),
          wait_duration_seconds: parseInt(parts[7])
        };
      });
    }
    
    const peakHours = {};
    const peakHoursByService = { general: {}, consultation: {}, transaction: {} };
    let totalIssued = 0;
    let totalExpired = 0;
    let sumWait = 0;
    let waitCount = 0;

    for (const ev of events) {
      const eventType = ev.event_type;
      const service = ev.service;
      const timestamp = ev.timestamp;

      if (eventType === 'token_issued') {
        totalIssued++;
        const hour = new Date(timestamp).getHours();
        peakHours[hour] = (peakHours[hour] || 0) + 1;
        if (peakHoursByService[service]) {
           peakHoursByService[service][hour] = (peakHoursByService[service][hour] || 0) + 1;
        }
      } else if (eventType === 'token_expired') {
        totalExpired++;
      } else if (eventType === 'token_called') {
        const waitSecs = ev.wait_duration_seconds;
        if (waitSecs !== null && !isNaN(waitSecs)) {
          sumWait += waitSecs;
          waitCount++;
        }
      }
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
      dropOffRate,
      avgWaitSeconds,
      staffingRecommendation
    };
    CSV_CACHE.timestamp = Date.now();
    return CSV_CACHE.data;
  } catch (err) {
    return { peakHours: {}, peakHoursByService: {}, totalIssued: 0, totalExpired: 0, dropOffRate: 0, avgWaitSeconds: 0, staffingRecommendation: [] };
  }
}

async function close() {
  if (mongoClient) await mongoClient.close();
}

module.exports = { logEvent, close, CSV_COLUMNS, getTrafficStats };
