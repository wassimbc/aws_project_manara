// What this file does:
// Creates a shared Redis client connection for the Orders service.
// Orders are stored in Redis as hashes with keys like order:{order_id}.
// Storing orders in shared Redis ensures stateless ECS task execution.

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
  name: 'orders_service'
});

redis_client.on('connect', () => {
  logger.info({ redis_host: config.REDIS_HOST }, 'Connected to Redis in Orders service');
});

redis_client.on('error', (err: Error) => {
  logger.error({ err: err.message }, 'Redis connection error in Orders service');
});

export { redis_client };
