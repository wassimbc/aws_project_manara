// This file loads all configuration from environment variables.
// We never hardcode secrets or hostnames here.
// Each variable has a plain explanation and a sensible default where safe.

import { z } from 'zod';

// Define the shape and types of all required configuration values.
// zod will throw an error at startup if a required value is missing,
// which is better than failing at runtime during an actual request.
const config_schema = z.object({
  // The TCP port this service listens on inside the container
  PORT: z.string().default('3001').transform(Number),

  // The runtime environment: 'local', 'test', 'staging', or 'production'
  NODE_ENV: z.string().default('local'),

  // Hostname or IP address of the Redis server
  REDIS_HOST: z.string().default('localhost'),

  // Port Redis is listening on (almost always 6379)
  REDIS_PORT: z.string().default('6379').transform(Number),

  // Password for Redis AUTH command. Can be empty string in local dev with no auth.
  REDIS_PASSWORD: z.string().default(''),

  // Secret key used to sign and verify JWT tokens. Keep this long and random in production.
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),

  // How long a JWT token is valid. Examples: '15m', '1h', '7d'.
  // Short expiry (15 minutes) is safer because stolen tokens expire quickly.
  JWT_EXPIRES_IN: z.string().default('15m'),

  // Friendly name for this service, used in log lines and health responses
  SERVICE_NAME: z.string().default('auth'),

  // Minimum log level to output. Options: 'trace', 'debug', 'info', 'warn', 'error', 'fatal'
  LOG_LEVEL: z.string().default('info'),

  // AWS Cloud Map namespace for service discovery between containers
  CLOUD_MAP_NAMESPACE: z.string().default('project6.local')
});

// Parse the real environment variables right now.
// If anything is missing or wrong, the process will crash with a clear message.
const parsed = config_schema.safeParse(process.env);

if (!parsed.success) {
  // Show exactly which environment variables are wrong so the developer knows what to fix
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

// Export the validated config so any file can import it safely
export const config = parsed.data;

// Export a helper that tells us if we are running in a production-like environment
export const is_production = config.NODE_ENV === 'production';

// Export a helper that tells us if X-Ray tracing should be skipped
// X-Ray needs a daemon running in the environment, which is not available locally
export const is_tracing_disabled =
  config.NODE_ENV === 'local' || config.NODE_ENV === 'test';
