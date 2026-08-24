// This file creates a shared pino logger that all other files import.
// Using one shared logger means every log line has the same format and service name,
// making it easy to search logs in CloudWatch.

import pino from 'pino';
import { config } from '../config/config';

// Create the logger with structured JSON output.
// Every log line will include the service name and the current environment.
// In local dev, we use pino-pretty-style output; in production, raw JSON goes to CloudWatch.
export const logger = pino({
  // Only emit logs at or above this level (e.g. 'info' suppresses 'debug' and 'trace')
  level: config.LOG_LEVEL,

  // These fields appear on every single log line so you always know which service wrote it
  base: {
    service: config.SERVICE_NAME,
    env: config.NODE_ENV
  },

  // Use ISO timestamp strings instead of epoch milliseconds for human readability
  timestamp: pino.stdTimeFunctions.isoTime
});
