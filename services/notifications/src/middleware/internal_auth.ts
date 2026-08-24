// What this file does:
// Middleware that verifies the x_internal_secret header.
// This prevents unauthorized external requests from triggering internal notifications.

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { App_Error } from './error_handler';

export function internal_auth_middleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const secret_header = req.headers['x_internal_secret'];

  if (!secret_header || secret_header !== config.INTERNAL_SERVICE_SECRET) {
    throw new App_Error('Access denied: Invalid or missing internal service secret', 403);
  }

  next();
}
