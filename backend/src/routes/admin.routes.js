const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/admin.controller');

// All routes here require an admin JWT. Apply middleware once at the router level.
router.use(requireAdmin);

router.get('/queue', asyncHandler(controller.activeQueue));
router.post('/queue/call-next', asyncHandler(controller.callNext));
router.post('/queue/pause', asyncHandler(controller.pause));
router.post('/queue/resume', asyncHandler(controller.resume));
router.post('/queue/reset', asyncHandler(controller.reset));

module.exports = router;
