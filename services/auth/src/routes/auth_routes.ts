// What this file does:
// Defines all the HTTP routes for the Auth service.
// Routes are thin: they parse the request, call a service function, and return the response.
// All business logic lives in auth_service.ts, not here.
//
// Endpoints:
//   GET  /health                 Check if service is running and Redis is reachable
//   POST /api/auth/register      Create a new user account
//   POST /api/auth/login         Get a JWT access token
//   POST /api/auth/logout        Invalidate the current token
//   GET  /api/auth/me            Get the current user's profile

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { redis_client } from '../services/redis_service';
import {
  register_user,
  login_user,
  logout_user,
  validate_token,
  get_user
} from '../services/auth_service';
import { App_Error } from '../middleware/error_handler';
import { config } from '../config/config';

const router = Router();

// =====================
// Helper: Extract Bearer token from Authorization header
// The Authorization header format is: "Bearer <token>"
// This helper strips the "Bearer " prefix and returns just the token string.
// =====================
function extract_bearer_token(req: Request): string | null {
  const auth_header = req.headers.authorization;
  if (!auth_header || !auth_header.startsWith('Bearer ')) {
    return null;
  }
  return auth_header.slice(7);
}

// =====================
// GET /health
// Returns 200 if the service is running and Redis is reachable.
// The ALB calls this endpoint every 10 seconds to decide if the task is healthy.
// If this returns a non-200 status, the ALB stops sending traffic to this task.
// =====================
router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Ping Redis to verify the connection is alive.
    // If Redis is down, we return 503 so the ALB removes this task from rotation.
    await redis_client.ping();

    res.status(200).json({
      status: 'ok',
      service: config.SERVICE_NAME,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// =====================
// POST /api/auth/register
// Creates a new user account.
// Body must include email (valid format) and password (at least 8 characters).
// Returns 409 if the email is already taken.
// =====================

// Define the expected request body shape using zod.
// zod will reject any request that does not match this shape.
const register_schema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

router.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate the request body. If invalid, zod throws a ZodError.
    const { email, password } = register_schema.parse(req.body);

    const result = await register_user(email, password);

    res.status(201).json({
      user_id: result.user_id,
      email: result.email,
      created_at: result.created_at
    });
  } catch (err) {
    // If it is a zod validation error, turn it into a 400 with details
    if (err instanceof z.ZodError) {
      next(new App_Error(err.errors.map(e => e.message).join(', '), 400));
    } else {
      next(err);
    }
  }
});

// =====================
// POST /api/auth/login
// Checks credentials and returns a JWT access token.
// The token is valid for 15 minutes (configurable via JWT_EXPIRES_IN env var).
// =====================
const login_schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

router.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = login_schema.parse(req.body);
    const result = await login_user(email, password);

    res.status(200).json({
      access_token: result.access_token,
      expires_in: result.expires_in,
      token_type: 'Bearer'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new App_Error(err.errors.map(e => e.message).join(', '), 400));
    } else {
      next(err);
    }
  }
});

// =====================
// POST /api/auth/logout
// Invalidates the current JWT session in Redis.
// After this, the token is rejected even if it has not expired yet.
// Requires: Authorization: Bearer <token>
// =====================
router.post('/api/auth/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extract_bearer_token(req);
    if (!token) {
      throw new App_Error('Authorization header with Bearer token is required', 401);
    }

    // validate_token verifies the JWT and returns the payload
    const payload = await validate_token(token);

    // Delete the session from Redis
    await logout_user(payload.user_id, payload.jti);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// =====================
// GET /api/auth/me
// Returns the current user's profile.
// This endpoint is also called by the Orders service to validate tokens.
// The Orders service sends the user's Bearer token to this endpoint.
// If we return 200, the token is valid and Orders gets the userId.
// If we return 401, Orders rejects the user's request.
// =====================
router.get('/api/auth/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extract_bearer_token(req);
    if (!token) {
      throw new App_Error('Authorization header with Bearer token is required', 401);
    }

    // Validate the token against both JWT and Redis session
    const payload = await validate_token(token);

    // Retrieve and return the user profile
    const user = await get_user(payload.user_id);
    if (!user) {
      throw new App_Error('User not found', 404);
    }

    res.status(200).json({
      user_id: user.user_id,
      email: user.email,
      created_at: user.created_at
    });
  } catch (err) {
    next(err);
  }
});

export { router as auth_router };
