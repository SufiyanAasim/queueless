const config = require('./config/env');
const buildApp = require('./app');
const queueService = require('./services/queue.service');
const authService = require('./services/auth.service');
const analyticsService = require('./services/analytics.service');
const expiryService = require('./services/expiry.service');

async function main() {
  console.log(`[boot] Starting QueueLess backend in ${config.nodeEnv} mode...`);

  await authService.bootstrapAdmin();
  await queueService.ensureInitialized();
  expiryService.startExpirySweep();
  console.log('[boot] Firebase state initialized.');

  const app = buildApp();
  const server = app.listen(config.port, () => {
    console.log(`[boot] API listening on port ${config.port}`);
    console.log(`[boot] CORS origin: ${config.corsOrigin}`);
    console.log(`[boot] Analytics sink: ${config.analytics.sink}`);
  });

  // Render sends SIGTERM on redeploy — drain in-flight requests before exiting.
  const shutdown = async (signal) => {
    console.log(`[shutdown] ${signal} received - closing server...`);
    server.close(async () => {
      expiryService.stopExpirySweep();
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
