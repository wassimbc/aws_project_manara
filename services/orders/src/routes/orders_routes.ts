// What this file does:
// Express routes for the Orders microservice.
// All order endpoints are protected by the require_auth middleware.
// Cloud Map DNS enables service discovery when Orders calls Auth or Notifications.

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { redis_client } from '../services/redis_service';
import { logger } from '../config/logger';
import { require_auth } from '../middleware/require_auth';
import {
  create_order,
  get_order,
  list_orders,
  update_order,
  delete_order
} from '../services/orders_service';
import { App_Error } from '../middleware/error_handler';
import { config } from '../config/config';

const router = Router();

// GET /health and GET /api/orders/health - ALB health check endpoints (no auth required)
// These must return 200 immediately. Do NOT ping Redis here.
// Redis reconnection retries can take longer than the ALB's 5-second health check timeout,
// causing "request aborted" even when the container is fully functional.
router.get(['/health', '/api/orders/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: config.SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// Apply require_auth middleware to all /api/orders endpoints
router.use('/api/orders', require_auth);

// GET /api/orders - List user orders
router.get('/api/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user_id!;
    const orders = await list_orders(user_id);
    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - Get single order
router.get('/api/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user_id!;
    const order = await get_order(req.params.id, user_id);
    if (!order) {
      throw new App_Error('Order not found', 404);
    }
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
});

// POST /api/orders - Create new order
const create_order_schema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })).min(1, 'At least one item is required')
});

router.post('/api/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user_id!;
    const { items } = create_order_schema.parse(req.body);
    const order = await create_order(user_id, items);
    res.status(201).json(order);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new App_Error(err.errors.map(e => e.message).join(', '), 400));
    } else {
      next(err);
    }
  }
});

// PUT /api/orders/:id - Update order status or items
const update_order_schema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive()
  })).optional()
});

router.put('/api/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user_id!;
    const updates = update_order_schema.parse(req.body);
    const updated = await update_order(req.params.id, user_id, updates);
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new App_Error(err.errors.map(e => e.message).join(', '), 400));
    } else {
      next(err);
    }
  }
});

// DELETE /api/orders/:id - Delete / cancel order
router.delete('/api/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user_id!;
    await delete_order(req.params.id, user_id);
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export { router as orders_router };
