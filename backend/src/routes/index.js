const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/tokens', require('./token.routes'));
router.use('/admin', require('./admin.routes'));

// Health endpoint - used by Render's health checks and CI smoke tests.
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'queueless-backend',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
