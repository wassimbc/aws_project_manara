import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { is_production } from '../config/config';

export class App_Error extends Error {
  public readonly status_code: number;

  constructor(message: string, status_code = 500) {
    super(message);
    this.name = 'App_Error';
    this.status_code = status_code;
    Object.setPrototypeOf(this, App_Error.prototype);
  }
}

export function error_handler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status_code = err instanceof App_Error ? err.status_code : 500;

  logger.error({
    request_id: req.request_id,
    err_message: err.message,
    stack: is_production ? undefined : err.stack
  }, 'Request error');

  const body: Record<string, unknown> = {
    error: err.message,
    request_id: req.request_id,
    status_code
  };

  if (!is_production && err.stack) {
    body['stack'] = err.stack;
  }

  res.status(status_code).json(body);
}
