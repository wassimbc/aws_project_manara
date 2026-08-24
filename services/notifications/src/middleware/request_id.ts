import { Request, Response, NextFunction } from 'express';
import { v4 as uuid_v4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      request_id: string;
    }
  }
}

export function request_id_middleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const existing_id = req.headers['x-request-id'];
  req.request_id = typeof existing_id === 'string' ? existing_id : uuid_v4();
  next();
}
