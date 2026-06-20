const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/admin.controller');

router.use(requireAdmin);

router.get('/queue',                    asyncHandler(controller.activeQueue));
router.post('/queue/call-next',         asyncHandler(controller.callNext));
router.post('/queue/pause',             asyncHandler(controller.pause));
router.post('/queue/resume',            asyncHandler(controller.resume));
router.post('/queue/reset',             asyncHandler(controller.reset));

router.get('/analytics',                asyncHandler(controller.getAnalytics));
router.get('/analytics/export',         asyncHandler(controller.exportAnalyticsCsv));

router.get('/auto-mode',                asyncHandler(controller.getAutoModeStatus));
router.post('/auto-mode/start',         asyncHandler(controller.startAutoMode));
router.post('/auto-mode/stop',          asyncHandler(controller.stopAutoMode));

router.get('/config',                   asyncHandler(controller.getAppConfig));
router.put('/config',                   asyncHandler(controller.updateAppConfig));

router.get('/feedback',                 asyncHandler(controller.getFeedback));

router.get('/staff',                    asyncHandler(controller.listStaff));
router.post('/staff',                   asyncHandler(controller.createStaff));
router.delete('/staff/:username',       asyncHandler(controller.removeStaff));

router.post('/queue/skip/:tokenId',     asyncHandler(controller.skipToken));
router.post('/change-password',         asyncHandler(controller.changePassword));

module.exports = router;
