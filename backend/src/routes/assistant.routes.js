const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const { requireStaff } = require('../middleware/auth'); // admin OR staff
const c = require('../controllers/assistant.controller');

router.use(requireStaff);

// Cap assistant questions per user to limit LLM spam / cost. Keyed by username
// (set by requireStaff above), so it's per-account rather than per-IP.
const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // requireStaff runs first, so req.user is always present here — key purely by
  // username (avoids the IP-based key path and its IPv6 validation warning).
  keyGenerator: (req) => req.user?.sub || 'anonymous',
  message: { error: 'Too many assistant requests. Please wait a moment and try again.' },
});

router.post('/', askLimiter, asyncHandler(c.ask));
router.get('/conversations', asyncHandler(c.listConversations));
router.post('/conversations', asyncHandler(c.createConversation));
router.get('/conversations/:id', asyncHandler(c.getConversation));
router.put('/conversations/:id', asyncHandler(c.updateConversation));
router.delete('/conversations/:id', asyncHandler(c.deleteConversation));

module.exports = router;
