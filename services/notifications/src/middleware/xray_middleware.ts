// X-Ray middleware for Notifications service.
// Only activates when ENABLE_XRAY=true is explicitly set.
// Without this guard, require('aws-xray-sdk') crashes the process at startup
// when no X-Ray daemon socket is present.
import { Request, Response, NextFunction } from 'express';

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
