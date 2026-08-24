import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: config.SERVICE_NAME, env: config.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime
});
