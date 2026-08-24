// What this file does:
// Business logic for Order operations stored in Redis.
// Order hashes are stored at key order:{order_id}
// User order indexes are stored at key orders_user:{user_id}

import { v4 as uuid_v4 } from 'uuid';
import { redis_client } from './redis_service';
import { send_notification } from './notifications_client';
import { App_Error } from '../middleware/error_handler';
import { logger } from '../config/logger';

export interface Order_Item {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  items: Order_Item[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  created_at: string;
  updated_at: string;
}

export async function create_order(
  user_id: string,
  items: Order_Item[]
): Promise<Order> {
  const id = uuid_v4();
  const created_at = new Date().toISOString();
  const updated_at = created_at;

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const order: Order = {
    id,
    user_id,
    items,
    status: 'pending',
    total,
    created_at,
    updated_at
  };

  // Save order object as JSON string in Redis hash
  await redis_client.hset(`order:${id}`, {
    id,
    user_id,
    items: JSON.stringify(items),
    status: 'pending',
    total: total.toString(),
    created_at,
    updated_at
  });

  // Track order in user's order list
  await redis_client.lpush(`orders_user:${user_id}`, id);

  logger.info({ order_id: id, user_id }, 'Order created successfully');

  // Trigger notification via Cloud Map call to Notifications microservice
  send_notification(
    'order_created',
    user_id,
    id,
    `Order ${id} created with total $${total}`
  );

  return order;
}

export async function get_order(id: string, user_id: string): Promise<Order | null> {
  const data = await redis_client.hgetall(`order:${id}`);
  if (!data || !data.id) {
    return null;
  }

  if (data.user_id !== user_id) {
    throw new App_Error('Not authorized to access this order', 403);
  }

  return {
    id: data.id,
    user_id: data.user_id,
    items: JSON.parse(data.items || '[]'),
    status: data.status as Order['status'],
    total: parseFloat(data.total || '0'),
    created_at: data.created_at,
    updated_at: data.updated_at
  };
}

export async function list_orders(user_id: string): Promise<Order[]> {
  const order_ids = await redis_client.lrange(`orders_user:${user_id}`, 0, 49);
  const orders: Order[] = [];

  for (const id of order_ids) {
    const data = await redis_client.hgetall(`order:${id}`);
    if (data && data.id) {
      orders.push({
        id: data.id,
        user_id: data.user_id,
        items: JSON.parse(data.items || '[]'),
        status: data.status as Order['status'],
        total: parseFloat(data.total || '0'),
        created_at: data.created_at,
        updated_at: data.updated_at
      });
    }
  }

  return orders;
}

export async function update_order(
  id: string,
  user_id: string,
  updates: { status?: Order['status']; items?: Order_Item[] }
): Promise<Order> {
  const existing = await get_order(id, user_id);
  if (!existing) {
    throw new App_Error('Order not found', 404);
  }

  const updated_at = new Date().toISOString();
  const status = updates.status || existing.status;
  const items = updates.items || existing.items;
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  await redis_client.hset(`order:${id}`, {
    status,
    items: JSON.stringify(items),
    total: total.toString(),
    updated_at
  });

  const updated_order: Order = {
    ...existing,
    status,
    items,
    total,
    updated_at
  };

  send_notification(
    'order_updated',
    user_id,
    id,
    `Order ${id} status updated to ${status}`
  );

  return updated_order;
}

export async function delete_order(id: string, user_id: string): Promise<void> {
  const existing = await get_order(id, user_id);
  if (!existing) {
    throw new App_Error('Order not found', 404);
  }

  await redis_client.del(`order:${id}`);
  await redis_client.lrem(`orders_user:${user_id}`, 0, id);

  send_notification(
    'order_cancelled',
    user_id,
    id,
    `Order ${id} was cancelled`
  );
}
