// Express routes for Notifications microservice.
// Demonstrates service discovery when called internally by Orders service.

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { redis_client } from '../services/redis_service';
import { internal_auth_middleware } from '../middleware/internal_auth';
import {
  create_notification,
  get_notification,
  list_user_notifications
} from '../services/notifications_service';
import { App_Error } from '../middleware/error_handler';
import { config } from '../config/config';

const router = Router();

router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
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

// POST /api/notifications - Create notification (internal microservice call only)
const create_notification_schema = z.object({
  type: z.enum(['order_created', 'order_updated', 'order_cancelled']),
  user_id: z.string().min(1),
  order_id: z.string().min(1),
  message: z.string().min(1)
});

router.post('/api/notifications', internal_auth_middleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, user_id, order_id, message } = create_notification_schema.parse(req.body);
    const notification = await create_notification(type, user_id, order_id, message);
    res.status(201).json(notification);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new App_Error(err.errors.map(e => e.message).join(', '), 400));
    } else {
      next(err);
    }
  }
});

// GET /api/notifications/:id - Retrieve notification by ID
router.get('/api/notifications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await get_notification(req.params.id);
    if (!notification) {
      throw new App_Error('Notification not found', 404);
    }
    res.status(200).json(notification);
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/user/:userId - List notifications for a user
router.get('/api/notifications/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await list_user_notifications(req.params.userId);
    res.status(200).json({ notifications });
  } catch (err) {
    next(err);
  }
});

export { router as notifications_router };
