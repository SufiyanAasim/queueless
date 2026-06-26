const authService = require('../services/auth.service');
const { isAdminTier, atLeast } = require('../config/roles');

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

// Admin area: any admin-tier role (superadmin / admin / manager).
function requireAdmin(req, res, next) {
  const payload = extractPayload(req, res);
  if (!payload) return;
  if (!isAdminTier(payload.role)) return res.status(403).json({ error: 'Forbidden - admin access required.' });
  req.user = payload;
  next();
}

// Admin-tier OR staff (used for shared features like messaging and the assistant).
function requireStaff(req, res, next) {
  const payload = extractPayload(req, res);
  if (!payload) return;
  if (!(isAdminTier(payload.role) || payload.role === 'staff')) return res.status(403).json({ error: 'Forbidden.' });
  req.user = payload;
  next();
}

// Require a minimum admin-tier role (e.g. 'admin' for account management,
// 'superadmin' for role changes).
function requireRole(minRole) {
  return (req, res, next) => {
    const payload = extractPayload(req, res);
    if (!payload) return;
    if (!isAdminTier(payload.role) || !atLeast(payload.role, minRole)) {
      return res.status(403).json({ error: `Forbidden - ${minRole} role or higher required.` });
    }
    req.user = payload;
    next();
  };
}

module.exports = { requireAdmin, requireStaff, requireRole };
