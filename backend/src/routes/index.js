const router = require('express').Router();
const crypto = require('crypto');
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

// Public: live announcement (used by display board + customer pages)
router.get('/announcement', asyncHandler(async (req, res) => {
  const snap = await refs.announcement().once('value');
  res.json(snap.val() || null);
}));

// Public: book appointment
router.post('/appointments', asyncHandler(async (req, res) => {
  const { name, service, date, timeSlot, phone, email } = req.body;
  if (!name?.trim() || !service || !date || !timeSlot) {
    return res.status(400).json({ error: 'name, service, date, and timeSlot are required.' });
  }
  const id = crypto.randomUUID();
  const record = {
    id, name: name.trim(), service, date, timeSlot,
    phone: phone?.trim() || null,
    email: email?.trim() || null,
    bookedAt: Date.now(),
    status: 'pending',
    note: null,
  };
  await refs.appointment(id).set(record);
  res.status(201).json(record);
}));

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'queueless-backend', timestamp: new Date().toISOString() });
});

module.exports = router;
