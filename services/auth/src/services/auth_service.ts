// What this file does:
// Contains all the business logic for authentication.
// No HTTP-specific code belongs here. Routes call these functions.
// This separation makes the logic easy to unit-test without starting a server.
//
// The full flow:
//   1. Register:  hash password -> store user in Redis -> return userId
//   2. Login:     verify password -> create JWT -> store session in Redis -> return token
//   3. Logout:    delete session from Redis (token is now dead even before it expires)
//   4. Validate:  verify JWT signature -> check session still exists in Redis
//   5. Get user:  retrieve user data from Redis

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid_v4 } from 'uuid';
import { redis_client } from './redis_service';
import { config } from '../config/config';
import { App_Error } from '../middleware/error_handler';
import { logger } from '../config/logger';

// How many rounds of bcrypt hashing to apply.
// 10 is the recommended default: strong enough to be slow for attackers,
// fast enough to not noticeably delay legitimate logins.
const BCRYPT_ROUNDS = 10;

// The JWT expiry in seconds (used for Redis key TTL matching)
// This converts '15m' to 900 seconds, '1h' to 3600, etc.
function parse_expiry_seconds(expiry: string): number {
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  return parseInt(match[1]) * (units[match[2]] ?? 60);
}

// =====================
// User data structure stored in Redis
// =====================
interface User_Record {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

// =====================
// REGISTER
// Creates a new user account. Fails if the email is already taken.
// =====================
export async function register_user(
  email: string,
  password: string
): Promise<{ user_id: string; email: string; created_at: string }> {

  // Check if this email is already registered.
  // We use a Redis string key as an index: email_index:{email} = userId
  const existing_id = await redis_client.get(`email_index:${email}`);
  if (existing_id) {
    throw new App_Error('Email address is already registered', 409);
  }

  const user_id = uuid_v4();
  const created_at = new Date().toISOString();

  // Hash the password. bcrypt adds a random salt automatically.
  // The hash includes the salt, so we do not need to store salt separately.
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Store the user as a Redis hash (like a small object in the database).
  // Key format: user:{userId}
  const user_key = `user:${user_id}`;
  await redis_client.hset(user_key, {
    id: user_id,
    email,
    password_hash,
    created_at
  });

  // Store the email-to-ID mapping so we can look up users by email during login
  await redis_client.set(`email_index:${email}`, user_id);

  logger.info({ user_id, email }, 'New user registered');

  return { user_id, email, created_at };
}

// =====================
// LOGIN
// Verifies credentials and creates a JWT session.
// =====================
export async function login_user(
  email: string,
  password: string
): Promise<{ access_token: string; expires_in: number }> {

  // Look up the user ID by email
  const user_id = await redis_client.get(`email_index:${email}`);
  if (!user_id) {
    // Use a generic message so we do not reveal whether the email exists
    throw new App_Error('Invalid email or password', 401);
  }

  // Retrieve the full user record from Redis
  const user_data = await redis_client.hgetall(`user:${user_id}`);
  if (!user_data || !user_data.password_hash) {
    throw new App_Error('Invalid email or password', 401);
  }

  // Compare the provided password against the stored hash.
  // bcrypt.compare is safe against timing attacks.
  const password_matches = await bcrypt.compare(password, user_data.password_hash);
  if (!password_matches) {
    throw new App_Error('Invalid email or password', 401);
  }

  // Create a unique token ID (jti). This is stored in Redis so we can
  // invalidate a specific token without waiting for it to expire naturally.
  const jti = uuid_v4();

  // Sign the JWT. The payload includes userId and email.
  // The secret comes from environment (Secrets Manager in production).
  const access_token = jwt.sign(
    { user_id, email, jti },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );

  // Store the session in Redis. We use the jti as part of the key.
  // TTL matches the token expiry so Redis auto-cleans expired sessions.
  const expiry_seconds = parse_expiry_seconds(config.JWT_EXPIRES_IN);
  await redis_client.setex(
    `session:${user_id}:${jti}`,
    expiry_seconds,
    '1'
  );

  logger.info({ user_id }, 'User logged in');

  return { access_token, expires_in: expiry_seconds };
}

// =====================
// LOGOUT
// Deletes the session from Redis so the token is immediately invalid.
// This is why we store sessions in Redis: JWT tokens cannot be "cancelled"
// by themselves (they are valid until they expire). Redis lets us cancel them.
// =====================
export async function logout_user(user_id: string, jti: string): Promise<void> {
  await redis_client.del(`session:${user_id}:${jti}`);
  logger.info({ user_id }, 'User logged out');
}

// =====================
// VALIDATE TOKEN
// Verifies the JWT signature and checks the session is still active in Redis.
// Returns the decoded payload or throws if invalid.
// =====================
export async function validate_token(
  token: string
): Promise<{ user_id: string; email: string; jti: string }> {

  let decoded: jwt.JwtPayload;

  try {
    // jwt.verify throws if the signature is wrong or the token is expired
    decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
  } catch (err) {
    throw new App_Error('Token is invalid or expired', 401);
  }

  const { user_id, email, jti } = decoded;

  if (!user_id || !email || !jti) {
    throw new App_Error('Token payload is incomplete', 401);
  }

  // Check that the session still exists in Redis.
  // If the user logged out, this key was deleted so we return 401.
  const session_exists = await redis_client.exists(`session:${user_id}:${jti}`);
  if (!session_exists) {
    throw new App_Error('Session has expired or was revoked', 401);
  }

  return { user_id, email, jti };
}

// =====================
// GET USER
// Retrieves user profile data from Redis.
// =====================
export async function get_user(
  user_id: string
): Promise<{ user_id: string; email: string; created_at: string } | null> {

  const user_data = await redis_client.hgetall(`user:${user_id}`);
  if (!user_data || !user_data.id) return null;

  return {
    user_id: user_data.id,
    email: user_data.email,
    created_at: user_data.created_at
  };
}
