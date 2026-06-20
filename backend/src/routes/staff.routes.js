const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const { requireStaff } = require('../middleware/auth');
const controller = require('../controllers/staff.controller');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please retry in 15 minutes.' },
});

router.post('/login',     loginLimiter, asyncHandler(controller.login));
router.post('/login/pin', loginLimiter, asyncHandler(controller.loginPin));
router.get('/queue',      requireStaff, asyncHandler(controller.getQueue));
router.post('/queue/call-next', requireStaff, asyncHandler(controller.callNext));

module.exports = router;
