/**
 * Auth middleware - guards admin-only routes.
 *
 * Expected header: `Authorization: Bearer <jwt>`
 * On success, attaches req.user = { sub, role, ... } and calls next().
 * On failure, responds 401 (missing/malformed) or 403 (wrong role).
 */
const authService = require('../services/auth.service');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Missing or malformed Authorization header. Expected: Bearer <token>.',
    });
  }

  let payload;
  try {
    payload = authService.verifyToken(token);
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    return res.status(401).json({ error: reason });
  }

  if (payload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - admin role required.' });
  }

  req.user = payload;
  next();
}

module.exports = { requireAdmin };
