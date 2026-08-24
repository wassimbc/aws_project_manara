import Redis from 'ioredis';
import { config } from '../config/config';
import { logger } from '../config/logger';

function build_redis_url(): string {
  if (config.REDIS_PASSWORD) {
    return `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`;
  }
  return `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;
}

const redis_client = new Redis(build_redis_url(), {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 200, 2000),
  name: 'notifications_service'
});

redis_client.on('connect', () => {
  logger.info({ redis_host: config.REDIS_HOST }, 'Connected to Redis in Notifications service');
});

redis_client.on('error', (err: Error) => {
  logger.error({ err: err.message }, 'Redis connection error in Notifications service');
});

export { redis_client };
