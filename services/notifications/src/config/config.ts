// Configuration settings for the Notifications microservice loaded from environment variables.

import { z } from 'zod';

const config_schema = z.object({
  PORT: z.string().default('3003').transform(Number),
  NODE_ENV: z.string().default('local'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().default(''),
  INTERNAL_SERVICE_SECRET: z.string().default('local_dev_internal_secret'),
  SERVICE_NAME: z.string().default('notifications'),
  LOG_LEVEL: z.string().default('info')
});

const parsed = config_schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export const is_production = config.NODE_ENV === 'production';
export const is_tracing_disabled =
  config.NODE_ENV === 'local' || config.NODE_ENV === 'test';
