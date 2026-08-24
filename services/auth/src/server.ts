// What this file does:
// Starts the HTTP server and handles graceful shutdown.
//
// Graceful shutdown is important in ECS Fargate:
// When you deploy a new version or ECS needs to stop a task,
// it sends a SIGTERM signal to the container.
// If we just exit immediately, any in-progress requests get dropped.
// Instead, we:
//   1. Stop accepting new connections (the ALB will stop routing to this task)
//   2. Wait for existing requests to finish (up to 30 seconds)
//   3. Close the Redis connection cleanly
//   4. Exit with code 0 (success)

import { app } from './app';
import { redis_client } from './services/redis_service';
import { config } from './config/config';
import { logger } from './config/logger';

// Start listening for HTTP connections
const server = app.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV },
    `${config.SERVICE_NAME} service started`
  );
});

// =====================
// Graceful shutdown handler
// This function is called when ECS sends SIGTERM (task is being stopped).
// We have approximately 30 seconds before ECS sends SIGKILL (force kill).
// =====================
function graceful_shutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

  // Stop accepting new connections from the load balancer
  server.close(async () => {
    logger.info('HTTP server closed. Closing Redis connection...');

    try {
      // Disconnect Redis cleanly
      await redis_client.quit();
      logger.info('Redis connection closed. Shutdown complete.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error closing Redis connection during shutdown');
      process.exit(1);
    }
  });

  // Safety timeout: if graceful shutdown takes more than 25 seconds, force exit.
  // ECS will force-kill after ~30 seconds anyway, but this ensures a clean log message.
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 25 seconds. Forcing exit.');
    process.exit(1);
  }, 25000);
}

// Listen for the signal ECS sends when stopping a task
process.on('SIGTERM', () => graceful_shutdown('SIGTERM'));

// Also handle CTRL+C during local development
process.on('SIGINT', () => graceful_shutdown('SIGINT'));
