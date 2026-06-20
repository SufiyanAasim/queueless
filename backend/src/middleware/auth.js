const authService = require('../services/auth.service');

function extractPayload(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header. Expected: Bearer <token>.' });
    return null;
  }

  try {
    return authService.verifyToken(token);
  } catch (err) {
    const reason = err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    res.status(401).json({ error: reason });
    return null;
  }
}

function requireAdmin(req, res, next) {
  const payload = extractPayload(req, res);
  if (!payload) return;
  if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden - admin role required.' });
  req.user = payload;
  next();
}

function requireStaff(req, res, next) {
  const payload = extractPayload(req, res);
  if (!payload) return;
  if (!['admin', 'staff'].includes(payload.role)) return res.status(403).json({ error: 'Forbidden.' });
  req.user = payload;
  next();
}

module.exports = { requireAdmin, requireStaff };
