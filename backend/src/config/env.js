/**
 * Environment configuration & validation.
 *
 * Loaded once at startup. If any required variable is missing or malformed,
 * the process exits immediately - it is far better to fail at boot than to
 * have the API silently misbehave in production.
 */
require('dotenv').config();
const Joi = require('joi');

const envSchema = Joi.object({
  PORT: Joi.number().default(4000),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  CORS_ORIGIN: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required()
    .description('JWT signing secret - minimum 32 chars'),
  JWT_EXPIRES_IN: Joi.string().default('8h'),

  ADMIN_USERNAME: Joi.string().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),

  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_DATABASE_URL: Joi.string().uri().required(),

  AVG_SERVICE_TIME_SECONDS: Joi.number().integer().positive().default(180),
  TOKEN_EXPIRY_SECONDS: Joi.number().integer().positive().default(3600),

  ANALYTICS_SINK: Joi.string().valid('csv', 'mongo').default('csv'),
  ANALYTICS_CSV_PATH: Joi.string().default('../analytics/data/queue_events.csv'),

  MONGO_URI: Joi.string().when('ANALYTICS_SINK', {
    is: 'mongo', then: Joi.required(), otherwise: Joi.optional()
  }),
  MONGO_DB: Joi.string().default('queueless'),
  MONGO_COLLECTION: Joi.string().default('queue_events'),
}).unknown(true);

const { value: env, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  console.error('[env] Configuration validation failed:');
  error.details.forEach(d => console.error(`  - ${d.message}`));
  process.exit(1);
}

// Firebase private keys come from .env with literal \n sequences. Unescape them
// so the SDK can parse the PEM correctly.
const firebasePrivateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

module.exports = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  corsOrigin: env.CORS_ORIGIN,

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  bootstrapAdmin: {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  },

  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: firebasePrivateKey,
    databaseURL: env.FIREBASE_DATABASE_URL,
  },

  queue: {
    avgServiceTimeSeconds: env.AVG_SERVICE_TIME_SECONDS,
    tokenExpirySeconds: env.TOKEN_EXPIRY_SECONDS,
  },

  analytics: {
    sink: env.ANALYTICS_SINK,
    csvPath: env.ANALYTICS_CSV_PATH,
    mongo: {
      uri: env.MONGO_URI,
      db: env.MONGO_DB,
      collection: env.MONGO_COLLECTION,
    },
  },
};
