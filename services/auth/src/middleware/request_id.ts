// This middleware generates a unique ID for every incoming HTTP request.
// The ID is attached to the request object and to every log line written during that request.
// This makes it possible to find all logs belonging to a single request in CloudWatch,
// even when hundreds of requests are handled at the same time.

import { Request, Response, NextFunction } from 'express';
import { v4 as uuid_v4 } from 'uuid';

// Extend the Express Request type so TypeScript knows about our custom fields
declare global {
  namespace Express {
    interface Request {
      // Unique identifier for this HTTP request
      request_id: string;
    }
  }
}

// This function runs before every route handler.
// It stamps each request with a UUID so we can trace it through all our logs.
export function request_id_middleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Check if the upstream load balancer or API Gateway already sent a request ID.
  // If they did, reuse it so the ID is consistent across multiple services.
  const existing_id = req.headers['x-request-id'];

  // Attach the ID to the request object so route handlers can read it
  req.request_id =
    typeof existing_id === 'string' ? existing_id : uuid_v4();

  // Pass the request on to the next middleware or route handler
  next();
}
