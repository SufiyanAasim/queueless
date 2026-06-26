const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAdmin, requireRole } = require('../middleware/auth');
const controller = require('../controllers/admin.controller');

router.use(requireAdmin);

router.get('/queue',                    asyncHandler(controller.activeQueue));
router.post('/queue/call-next',          asyncHandler(controller.callNext));
router.post('/queue/call-next-priority', asyncHandler(controller.callNextPriority));
router.post('/queue/pause',             asyncHandler(controller.pause));
router.post('/queue/resume',            asyncHandler(controller.resume));
router.post('/queue/reset',             asyncHandler(controller.reset));
router.post('/queue/pause-service',     asyncHandler(controller.pauseService));
router.post('/queue/resume-service',    asyncHandler(controller.resumeService));

router.get('/analytics',                asyncHandler(controller.getAnalytics));
router.get('/analytics/export',         asyncHandler(controller.exportAnalyticsCsv));
router.get('/analytics/staff',          asyncHandler(controller.getStaffMetrics));
router.get('/predictions',              asyncHandler(controller.getPredictions));
router.get('/audit',                    asyncHandler(controller.getAuditLog));

router.get('/auto-mode',                asyncHandler(controller.getAutoModeStatus));
router.post('/auto-mode/start',         asyncHandler(controller.startAutoMode));
router.post('/auto-mode/stop',          asyncHandler(controller.stopAutoMode));

router.get('/config',                   asyncHandler(controller.getAppConfig));
router.put('/config',                   asyncHandler(controller.updateAppConfig));

router.get('/feedback',                 asyncHandler(controller.getFeedback));

router.get('/staff',                    asyncHandler(controller.listStaff));
router.post('/staff',                   asyncHandler(controller.createStaff));
router.delete('/staff/:username',       asyncHandler(controller.removeStaff));
router.put('/staff/:username/service',  asyncHandler(controller.assignStaffQueue));

router.post('/queue/skip/:tokenId',          asyncHandler(controller.skipToken));
router.post('/queue/refer/:tokenId',         asyncHandler(controller.referToken));
router.put('/queue/tokens/:tokenId/note',    asyncHandler(controller.setTokenNote));
router.post('/change-password',              asyncHandler(controller.changePassword));
router.get('/profile',                       asyncHandler(controller.getProfile));
router.put('/profile',                       asyncHandler(controller.updateProfile));
router.put('/announcement',                  asyncHandler(controller.setAnnouncement));
router.delete('/announcement',               asyncHandler(controller.clearAnnouncement));
router.get('/appointments',                  asyncHandler(controller.listAppointments));
router.put('/appointments/:id/confirm',      asyncHandler(controller.confirmAppointment));
router.put('/appointments/:id/cancel',       asyncHandler(controller.cancelAppointment));

// Queue management (custom queues)
router.get('/queues',                   asyncHandler(controller.listQueues));
router.get('/queues/overview',          asyncHandler(controller.queuesOverview));
router.get('/queues/:id',               asyncHandler(controller.getQueue));
router.get('/queues/:id/staff',         asyncHandler(controller.queueStaff));
router.get('/queues/:id/analytics',     asyncHandler(controller.queueAnalytics));
router.post('/queues',                  asyncHandler(controller.createQueue));
router.put('/queues/reorder',           asyncHandler(controller.reorderQueues));
router.put('/queues/:id',               asyncHandler(controller.updateQueue));
router.put('/queues/:id/enabled',       asyncHandler(controller.setQueueEnabled));
router.put('/queues/:id/archive',       asyncHandler(controller.archiveQueue));
router.delete('/queues/:id',            asyncHandler(controller.deleteQueue));

router.get('/admins',                   asyncHandler(controller.listAdmins));
router.post('/admins',                  requireRole('admin'),      asyncHandler(controller.createAdmin));
router.put('/admins/:username/role',    requireRole('superadmin'), asyncHandler(controller.setAdminRole));
router.delete('/admins/:username',      requireRole('admin'),      asyncHandler(controller.deleteAdmin));

module.exports = router;
