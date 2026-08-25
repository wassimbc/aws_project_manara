import Redis from 'ioredis';
import { config } from '../config/config';
import { logger } from '../config/logger';

const options: any = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 200, 2000),
  name: 'auth_service'
};

if (config.REDIS_HOST.includes('amazonaws.com')) {
  options.tls = {};
}

if (config.REDIS_PASSWORD && !config.REDIS_PASSWORD.startsWith('arn:aws:secretsmanager')) {
  options.password = config.REDIS_PASSWORD;
}

const redis_client = new Redis(options);

redis_client.on('connect', () => {
  logger.info({ redis_host: config.REDIS_HOST }, 'Connected to Redis');
});

redis_client.on('error', (err: Error) => {
  logger.error({ err: err.message }, 'Redis connection error');
});

export { redis_client };
