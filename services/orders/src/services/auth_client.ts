// What this file does:
// HTTP client that calls the Auth microservice via AWS Cloud Map service discovery DNS.
// It sends the user's Bearer token to http://auth.project6.local:3001/api/auth/me
// To avoid calling Auth on every single order request, results are cached in Redis for 30 seconds.

import axios from 'axios';
import { config } from '../config/config';
import { redis_client } from './redis_service';
import { logger } from '../config/logger';

interface User_Payload {
  user_id: string;
  email: string;
}

export async function validate_auth_token(token: string): Promise<User_Payload | null> {
  // Generate a simple cache key based on the token string
  const cache_key = `auth_cache:${token}`;

  try {
    // 1. Check Redis cache first
    const cached = await redis_client.get(cache_key);
    if (cached) {
      return JSON.parse(cached) as User_Payload;
    }

    // 2. Call Auth service via Cloud Map DNS endpoint
    // In production, config.AUTH_SERVICE_URL is http://auth.project6.local:3001
    const response = await axios.get(`${config.AUTH_SERVICE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 3000
    });

    if (response.status === 200 && response.data?.user_id) {
      const user_payload: User_Payload = {
        user_id: response.data.user_id,
        email: response.data.email
      };

      // Cache validation result in Redis for 30 seconds
      await redis_client.setex(cache_key, 30, JSON.stringify(user_payload));

      return user_payload;
    }

    return null;
  } catch (err: unknown) {
    const err_msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err_msg, url: config.AUTH_SERVICE_URL }, 'Auth token validation call failed');
    return null;
  }
}
