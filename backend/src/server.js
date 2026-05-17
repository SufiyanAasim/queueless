/**
 * Server entry point.
 *
 * Boot sequence:
 *   1. Load + validate env (happens at require time of config/env)
 *   2. Initialize Firebase (happens at require time of config/firebase)
 *   3. Bootstrap admin account (idempotent)
 *   4. Initialize queue state (idempotent)
 *   5. Start HTTP listener
 *
 * Any failure in 1-4 should crash the process so Render restarts it cleanly,
 * rather than leaving the API up with broken state.
 */
const config = require('./config/env');
const buildApp = require('./app');
const queueService = require('./services/queue.service');
const authService = require('./services/auth.service');
const analyticsService = require('./services/analytics.service');

async function main() {
  console.log(`[boot] Starting QueueLess backend in ${config.nodeEnv} mode...`);

  await authService.bootstrapAdmin();
  await queueService.ensureInitialized();
  console.log('[boot] Firebase state initialized.');

  const app = buildApp();
  const server = app.listen(config.port, () => {
    console.log(`[boot] API listening on port ${config.port}`);
    console.log(`[boot] CORS origin: ${config.corsOrigin}`);
    console.log(`[boot] Analytics sink: ${config.analytics.sink}`);
  });

  // Graceful shutdown - drains in-flight requests before exit. Render sends
  // SIGTERM on redeploy; respecting it avoids dropped requests during deploys.
  const shutdown = async (signal) => {
    console.log(`[shutdown] ${signal} received - closing server...`);
    server.close(async () => {
      try {
        await analyticsService.close();
      } catch (e) {
        console.error('[shutdown] analytics close error:', e.message);
      }
      console.log('[shutdown] Goodbye.');
      process.exit(0);
    });
    // Force exit if anything hangs longer than 10s.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('[boot] Fatal error:', err);
  process.exit(1);
});
