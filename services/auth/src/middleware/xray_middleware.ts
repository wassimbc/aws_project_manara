// What this file does:
// Wraps Express routes with AWS X-Ray tracing.
// X-Ray records how long each HTTP request takes, which services were called,
// and what the response code was. This creates the "service map" you see in the AWS console.
//
// When tracing is disabled (local development or tests), this middleware
// is replaced with a simple no-op so your local environment works without an X-Ray daemon.

import { Request, Response, NextFunction } from 'express';
import { is_tracing_disabled } from '../config/config';

// Only import X-Ray if we are in a traced environment.
// Importing it unconditionally would cause errors in local dev (no daemon to connect to).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AWSXRay = is_tracing_disabled ? null : require('aws-xray-sdk');

// Open a new X-Ray segment for each incoming request.
// A segment is a record of one unit of work (one HTTP request in this case).
export function xray_open(service_name: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (is_tracing_disabled || !AWSXRay) {
      next();
      return;
    }
    AWSXRay.express.openSegment(service_name)(req, res, next);
  };
}

// Close the X-Ray segment after the response is sent.
// This finalises the timing data and sends it to the X-Ray daemon.
export function xray_close() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (is_tracing_disabled || !AWSXRay) {
      next();
      return;
    }
    AWSXRay.express.closeSegment()(req, res, next);
  };
}
