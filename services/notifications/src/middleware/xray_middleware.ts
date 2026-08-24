import { Request, Response, NextFunction } from 'express';
import { is_tracing_disabled } from '../config/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AWSXRay = is_tracing_disabled ? null : require('aws-xray-sdk');

export function xray_open(service_name: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (is_tracing_disabled || !AWSXRay) { next(); return; }
    AWSXRay.express.openSegment(service_name)(req, res, next);
  };
}

export function xray_close() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (is_tracing_disabled || !AWSXRay) { next(); return; }
    AWSXRay.express.closeSegment()(req, res, next);
  };
}
