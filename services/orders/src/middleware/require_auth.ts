// What this file does:
// Middleware that validates authentication by calling the Auth service.
//
// WHY call Auth instead of verifying the JWT ourselves?
// The Auth service is the single source of truth for sessions.
// Even if a JWT has a valid signature, the user might have logged out
// and the session deleted from Redis. By calling Auth, we always check
// the CURRENT session state, not just the cryptographic signature.
//
// Optimization: cache the validation result in Redis for 30 seconds.
// This avoids making an HTTP call to Auth for every single order request.
// After 30 seconds, the cache expires and we re-validate with Auth.

import { Request, Response, NextFunction } from 'express';
import { App_Error } from './error_handler';
import { validate_auth_token } from '../services/auth_client';

// This middleware runs before every protected route.
// It reads the Bearer token, calls Auth to validate it, and attaches userId to the request.
export async function require_auth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract the Bearer token from the Authorization header
    const auth_header = req.headers.authorization;
    if (!auth_header || !auth_header.startsWith('Bearer ')) {
      throw new App_Error('Authorization header with Bearer token is required', 401);
    }

    const token = auth_header.slice(7);

    // Call Auth service to validate the token (with Redis caching)
    const user_info = await validate_auth_token(token);
    if (!user_info) {
      throw new App_Error('Invalid or expired token', 401);
    }

    // Attach userId to the request so route handlers know who is making the request
    req.user_id = user_info.user_id;

    next();
  } catch (err) {
    next(err);
  }
}
