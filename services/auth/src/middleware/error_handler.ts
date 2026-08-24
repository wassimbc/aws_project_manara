// This file defines a centralized error handler for Express.
// Instead of writing try-catch blocks in every route, we throw errors and
// this middleware catches them all in one place and returns a consistent JSON response.
// This keeps route code clean and makes error responses predictable for API consumers.

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { is_production } from '../config/config';

// A custom error class that lets us attach an HTTP status code to any error.
// For example: throw new App_Error('Email already exists', 409)
export class App_Error extends Error {
  public readonly status_code: number;

  constructor(message: string, status_code = 500) {
    super(message);
    this.name = 'App_Error';
    this.status_code = status_code;

    // This line is needed in TypeScript when extending built-in classes like Error
    Object.setPrototypeOf(this, App_Error.prototype);
  }
}

// This is the Express error handler. Express recognises it as an error handler
// because it has four parameters (err, req, res, next).
// It must be registered AFTER all other middleware and routes in app.ts.
export function error_handler(
  err: Error,
  req: Request,
  res: Response,
  // next is required by Express's error handler signature even if unused
  _next: NextFunction
): void {
  // Determine the HTTP status code.
  // If someone threw an App_Error we use their code; otherwise default to 500.
  const status_code = err instanceof App_Error ? err.status_code : 500;

  // Log the full error so we can investigate in CloudWatch
  logger.error({
    request_id: req.request_id,
    err_message: err.message,
    err_name: err.name,
    // Only include the stack trace in non-production environments to avoid leaking internals
    stack: is_production ? undefined : err.stack
  }, 'Request error');

  // Build the response body.
  // We always include the requestId so the client can report it in a support ticket.
  const response_body: Record<string, unknown> = {
    error: err.message,
    request_id: req.request_id,
    status_code
  };

  // Never expose internal stack traces to outside callers in production
  if (!is_production && err.stack) {
    response_body['stack'] = err.stack;
  }

  res.status(status_code).json(response_body);
}
