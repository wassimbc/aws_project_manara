// Unit tests for the Orders microservice.
// Mocks Redis, Auth client, and Notifications client.

import request from 'supertest';
import { app } from '../src/app';

jest.mock('../src/services/redis_service', () => {
  const mock_store: Record<string, any> = {};
  return {
    redis_client: {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn().mockImplementation((k: string) => Promise.resolve(mock_store[k] || null)),
      setex: jest.fn().mockImplementation((k: string, _ttl: number, v: string) => {
        mock_store[k] = v;
        return Promise.resolve('OK');
      }),
      hset: jest.fn().mockResolvedValue(1),
      hgetall: jest.fn().mockResolvedValue({
        id: 'order_123',
        user_id: 'user_123',
        items: JSON.stringify([{ name: 'Test Item', quantity: 1, price: 10 }]),
        status: 'pending',
        total: '10',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }),
      lpush: jest.fn().mockResolvedValue(1),
      lrange: jest.fn().mockResolvedValue(['order_123']),
      del: jest.fn().mockResolvedValue(1),
      lrem: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn()
    }
  };
});

jest.mock('../src/services/auth_client', () => ({
  validate_auth_token: jest.fn().mockImplementation((token: string) => {
    if (token === 'valid_token') {
      return Promise.resolve({ user_id: 'user_123', email: 'user@example.com' });
    }
    return Promise.resolve(null);
  })
}));

jest.mock('../src/services/notifications_client', () => ({
  send_notification: jest.fn().mockResolvedValue(undefined)
}));

process.env.NODE_ENV = 'test';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('orders');
  });
});

describe('GET /api/orders', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('returns 200 with orders list when authenticated', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', 'Bearer valid_token');

    expect(res.status).toBe(200);
    expect(res.body.orders).toBeDefined();
  });
});

describe('POST /api/orders', () => {
  it('returns 201 when creating order with valid items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid_token')
      .send({
        items: [{ name: 'Laptop', quantity: 1, price: 999 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.total).toBe(999);
  });

  it('returns 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid_token')
      .send({ items: [] });

    expect(res.status).toBe(400);
  });
});
