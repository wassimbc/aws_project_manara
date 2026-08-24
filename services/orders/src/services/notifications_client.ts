// What this file does:
// HTTP client that sends order notifications to the Notifications microservice.
// It calls http://notifications.project6.local:3003/api/notifications via Cloud Map DNS.
// Uses an internal secret header (INTERNAL_SERVICE_SECRET from Secrets Manager) for protection.

import axios from 'axios';
import { config } from '../config/config';
import { logger } from '../config/logger';

export async function send_notification(
  type: 'order_created' | 'order_updated' | 'order_cancelled',
  user_id: string,
  order_id: string,
  message: string
): Promise<void> {
  try {
    const payload = {
      type,
      user_id,
      order_id,
      message
    };

    // Call Notifications service via Cloud Map DNS endpoint
    await axios.post(`${config.NOTIFICATIONS_SERVICE_URL}/api/notifications`, payload, {
      headers: {
        'x_internal_secret': config.INTERNAL_SERVICE_SECRET
      },
      timeout: 3000
    });

    logger.info({ order_id, type }, 'Notification dispatched successfully');
  } catch (err: unknown) {
    const err_msg = err instanceof Error ? err.message : String(err);
    // Non-blocking log: notification failure should not cause order creation to fail
    logger.error({ err_msg, order_id }, 'Failed to dispatch notification to Notifications service');
  }
}
