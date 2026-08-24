// Orders service server entrypoint.
// Handles graceful shutdown when receiving SIGTERM signal from ECS Fargate.

import { app } from './app';
import { redis_client } from './services/redis_service';
import { config } from './config/config';
import { logger } from './config/logger';

const server = app.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV },
    `${config.SERVICE_NAME} service started`
  );
});

function graceful_shutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown for Orders');

  server.close(async () => {
    logger.info('Orders HTTP server closed. Closing Redis connection...');
    try {
      await redis_client.quit();
      logger.info('Redis connection closed. Shutdown complete.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error closing Redis connection during shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 25 seconds. Forcing exit.');
    process.exit(1);
  }, 25000);
}

process.on('SIGTERM', () => graceful_shutdown('SIGTERM'));
process.on('SIGINT', () => graceful_shutdown('SIGINT'));
