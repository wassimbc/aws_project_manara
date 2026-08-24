// Business logic for Notifications stored in Redis.

import { v4 as uuid_v4 } from 'uuid';
import { redis_client } from './redis_service';
import { logger } from '../config/logger';

export interface Notification {
  id: string;
  type: 'order_created' | 'order_updated' | 'order_cancelled';
  user_id: string;
  order_id: string;
  message: string;
  created_at: string;
}

export async function create_notification(
  type: Notification['type'],
  user_id: string,
  order_id: string,
  message: string
): Promise<Notification> {
  const id = uuid_v4();
  const created_at = new Date().toISOString();

  const notification: Notification = {
    id,
    type,
    user_id,
    order_id,
    message,
    created_at
  };

  await redis_client.hset(`notification:${id}`, {
    id,
    type,
    user_id,
    order_id,
    message,
    created_at
  });

  await redis_client.lpush(`notifications_user:${user_id}`, id);

  logger.info({ notification_id: id, user_id, order_id }, 'Notification created');

  return notification;
}

export async function get_notification(id: string): Promise<Notification | null> {
  const data = await redis_client.hgetall(`notification:${id}`);
  if (!data || !data.id) {
    return null;
  }

  return {
    id: data.id,
    type: data.type as Notification['type'],
    user_id: data.user_id,
    order_id: data.order_id,
    message: data.message,
    created_at: data.created_at
  };
}

export async function list_user_notifications(user_id: string): Promise<Notification[]> {
  const ids = await redis_client.lrange(`notifications_user:${user_id}`, 0, 19);
  const notifications: Notification[] = [];

  for (const id of ids) {
    const data = await redis_client.hgetall(`notification:${id}`);
    if (data && data.id) {
      notifications.push({
        id: data.id,
        type: data.type as Notification['type'],
        user_id: data.user_id,
        order_id: data.order_id,
        message: data.message,
        created_at: data.created_at
      });
    }
  }

  return notifications;
}
