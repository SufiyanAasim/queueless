const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireStaff } = require('../middleware/auth'); // admin OR staff
const c = require('../controllers/messaging.controller');
const n = require('../controllers/notification.controller');

// requireStaff is applied per-route (not router-level) so this sub-router can be
// mounted at '/' without blocking public endpoints.
router.get('/directory',                   requireStaff, asyncHandler(c.directory));
router.get('/conversations',               requireStaff, asyncHandler(c.list));
router.post('/conversations',              requireStaff, asyncHandler(c.create));
router.get('/conversations/:id/messages',  requireStaff, asyncHandler(c.messages));
router.post('/conversations/:id/messages', requireStaff, asyncHandler(c.send));
router.put('/conversations/:id/read',       requireStaff, asyncHandler(c.markRead));
router.put('/conversations/:id/messages/:mid/react', requireStaff, asyncHandler(c.react));

// Notification center
router.get('/notifications',               requireStaff, asyncHandler(n.list));
router.put('/notifications/read-all',      requireStaff, asyncHandler(n.markAllRead));
router.put('/notifications/:id/read',      requireStaff, asyncHandler(n.markRead));

module.exports = router;
