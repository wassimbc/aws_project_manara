// What this file does:
// Creates and exports a single Redis client that all other files share.
// Redis is used to store:
//   1. User account data (as Redis hashes, key: user:{userId})
//   2. Session state (key: session:{userId}:{jti}, with expiry matching the JWT)
//   3. Email-to-ID index (key: email_index:{email} = userId)
//
// Why Redis instead of a relational database for this demo?
// The project spec requires Redis (ElastiCache) as a shared state store.
// Keeping state in Redis means any ECS task can handle any request,
// even if it was started seconds ago. This makes horizontal scaling trivial.
//
// If an ECS task is replaced (during a deployment or because of a crash),
// the new task connects to the same Redis and sees all the same data.
// No data is lost because nothing is stored inside the container.

import Redis from 'ioredis';
import { config } from '../config/config';
import { logger } from '../config/logger';

// Build the Redis connection URL.
// If a password is set, the URL format is: redis://:password@host:port
// If no password (local dev), the format is: redis://host:port
function build_redis_url(): string {
  if (config.REDIS_PASSWORD) {
    return `redis://:${config.REDIS_PASSWORD}@${config.REDIS_HOST}:${config.REDIS_PORT}`;
  }
  return `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`;
}

// Create the Redis client.
// ioredis automatically retries failed connections so temporary network blips
// do not crash the service.
const redis_client = new Redis(build_redis_url(), {
  // How many times to retry a failed command before giving up
  maxRetriesPerRequest: 3,

  // Wait 2 seconds between reconnection attempts
  retryStrategy: (times: number) => Math.min(times * 200, 2000),

  // Show a friendly name in Redis monitor output
  name: 'auth_service'
});

redis_client.on('connect', () => {
  logger.info({ redis_host: config.REDIS_HOST }, 'Connected to Redis');
});

redis_client.on('error', (err: Error) => {
  logger.error({ err: err.message }, 'Redis connection error');
});

// Export the client so auth_service.ts and health check can use it
export { redis_client };
