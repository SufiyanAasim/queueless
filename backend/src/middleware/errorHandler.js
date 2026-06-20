const config = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;

  if (status >= 500 || !config.isProduction) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${status}`);
    console.error(err.stack || err.message);
  }

  const payload = { error: err.message || 'Internal server error.' };
  if (!config.isProduction && status >= 500) payload.stack = err.stack;
  res.status(status).json(payload);
}

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
