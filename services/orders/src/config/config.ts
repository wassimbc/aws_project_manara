// What this file does:
// Loads all configuration from environment variables for the Orders service.
// Key difference from Auth: Orders has two extra variables pointing to other services.
// In production on AWS, these resolve through Cloud Map DNS.
// In local Docker Compose, they resolve to container names.

import { z } from 'zod';

const config_schema = z.object({
  PORT: z.string().default('3002').transform(Number),
  NODE_ENV: z.string().default('local'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().default(''),

  // The internal secret sent to the Notifications service.
  // Both Orders and Notifications must share the same value.
  // In production, this comes from AWS Secrets Manager.
  INTERNAL_SERVICE_SECRET: z.string().default('local_dev_internal_secret'),

  SERVICE_NAME: z.string().default('orders'),
  LOG_LEVEL: z.string().default('info'),

  // URL of the Auth service.
  // In AWS production: http://auth.project6.local:3001 (Cloud Map DNS)
  // In local Docker Compose: http://auth:3001 (container name as hostname)
  // NEVER hardcode this. Use the environment variable.
  AUTH_SERVICE_URL: z.string().default('http://auth.project6.local:3001'),

  // URL of the Notifications service.
  // Same pattern as AUTH_SERVICE_URL.
  NOTIFICATIONS_SERVICE_URL: z.string().default('http://notifications.project6.local:3003')
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
