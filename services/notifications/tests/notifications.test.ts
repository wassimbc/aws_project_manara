import request from 'supertest';
import { app } from '../src/app';

jest.mock('../src/services/redis_service', () => {
  const mock_store: Record<string, any> = {};
  return {
    redis_client: {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn().mockImplementation((k: string) => Promise.resolve(mock_store[k] || null)),
      hset: jest.fn().mockResolvedValue(1),
      hgetall: jest.fn().mockResolvedValue({
        id: 'notif_123',
        type: 'order_created',
        user_id: 'user_123',
        order_id: 'order_123',
        message: 'Order created',
        created_at: new Date().toISOString()
      }),
      lpush: jest.fn().mockResolvedValue(1),
      lrange: jest.fn().mockResolvedValue(['notif_123']),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn()
    }
  };
});

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_SECRET = 'local_dev_internal_secret';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('notifications');
  });
});

describe('POST /api/notifications', () => {
  it('returns 403 when internal secret header is missing', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({
        type: 'order_created',
        user_id: 'user_123',
        order_id: 'order_123',
        message: 'Order created'
      });

    expect(res.status).toBe(403);
  });

  it('returns 201 when internal secret is valid', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .set('x_internal_secret', 'local_dev_internal_secret')
      .send({
        type: 'order_created',
        user_id: 'user_123',
        order_id: 'order_123',
        message: 'Order created'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });
});

describe('GET /api/notifications/:id', () => {
  it('returns 200 with notification details', async () => {
    const res = await request(app).get('/api/notifications/notif_123');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('notif_123');
  });
});
