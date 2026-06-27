const config = require('./config/env');
const buildApp = require('./app');
const queueService = require('./services/queue.service');
const authService = require('./services/auth.service');
const analyticsService = require('./services/analytics.service');
const expiryService = require('./services/expiry.service');
const schedulerService = require('./services/scheduler.service');
const appointmentMergeService = require('./services/appointmentMerge.service');
const { registerSubscribers } = require('./events');

async function main() {
  console.log(`[boot] Starting QueueLess backend in ${config.nodeEnv} mode...`);

  registerSubscribers();
  await authService.bootstrapAdmin();
  await queueService.ensureInitialized();
  expiryService.startExpirySweep();
  schedulerService.startScheduler();
  appointmentMergeService.startAppointmentMerge();
  console.log('[boot] Firebase state initialized.');

  const app = buildApp();
  const server = app.listen(config.port, () => {
    console.log(`[boot] API listening on port ${config.port}`);
    console.log(`[boot] CORS origin: ${config.corsOrigin}`);
    console.log(`[boot] Analytics sink: ${config.analytics.sink}`);
  });

  const shutdown = async (signal) => {
    console.log(`[shutdown] ${signal} received - closing server...`);
    server.close(async () => {
      expiryService.stopExpirySweep();
      schedulerService.stopScheduler();
      appointmentMergeService.stopAppointmentMerge();
      try {
        await analyticsService.close();
      } catch (e) {
        console.error('[shutdown] analytics close error:', e.message);
      }
      console.log('[shutdown] Goodbye.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('[boot] Fatal error:', err);
  process.exit(1);
});
