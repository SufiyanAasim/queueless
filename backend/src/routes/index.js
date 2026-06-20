const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { refs } = require('../config/firebase');

router.use('/auth',     require('./auth.routes'));
router.use('/tokens',   require('./token.routes'));
router.use('/admin',    require('./admin.routes'));
router.use('/staff',    require('./staff.routes'));

router.post('/feedback', asyncHandler(require('../controllers/feedback.controller').submitFeedback));

router.get('/config', asyncHandler(async (req, res) => {
  const snap = await refs.appConfig().once('value');
  res.json(snap.val() || { industry: 'general', orgName: 'QueueLess' });
}));

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'queueless-backend', timestamp: new Date().toISOString() });
});

module.exports = router;
