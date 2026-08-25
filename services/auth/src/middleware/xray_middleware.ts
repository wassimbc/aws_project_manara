// Wraps Express routes with AWS X-Ray tracing.
// X-Ray is only activated when ENABLE_XRAY=true is explicitly set.
// Without this guard, require('aws-xray-sdk') would attempt to connect
// to a daemon socket at startup and crash the process if no daemon is running.

import { Request, Response, NextFunction } from 'express';

// Only require aws-xray-sdk when explicitly enabled.
// Gating on the env var prevents the SDK from crashing at module load time
// when no X-Ray daemon is present (which is the case in ECS without a sidecar).
const xray_enabled = process.env.ENABLE_XRAY === 'true';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AWSXRay = xray_enabled ? require('aws-xray-sdk') : null;

export function xray_open(service_name: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!xray_enabled || !AWSXRay) {
      next();
      return;
    }
    try {
      AWSXRay.express.openSegment(service_name)(req, res, next);
    } catch (_err) {
      next();
    }
  };
}

export function xray_close() {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (!xray_enabled || !AWSXRay) {
      next();
      return;
    }
    try {
      AWSXRay.express.closeSegment()(_req, _res, next);
    } catch (_err) {
      next();
    }
  };
}
