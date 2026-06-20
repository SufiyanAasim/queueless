const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function buildApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin.split(',').map(s => s.trim()),
    credentials: false,
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  if (!config.isProduction) app.use(morgan('dev'));
  else app.use(morgan('combined'));

  // Brute-force protection for the login endpoint.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please retry in 15 minutes.' },
  });
  app.use('/api/v1/auth/login', loginLimiter);

  const takeTokenLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Slow down - too many token requests from this address.' },
  });
  app.use('/api/v1/tokens', takeTokenLimiter);

  app.use('/api/v1', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = buildApp;
