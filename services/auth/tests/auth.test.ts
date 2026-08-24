// What this file does:
// Contains automated tests for the Auth service.
// We use Jest as the test runner and supertest to send HTTP requests to the app
// without actually starting a network server.
//
// We mock Redis and JWT so tests run fast and do not need a real Redis instance.
// Mock = a fake version of a dependency that we control in tests.

import request from 'supertest';
import { app } from '../src/app';

// =====================
// Mock the Redis client
// We replace the real Redis connection with a fake one.
// This means tests run without Redis installed locally.
// =====================
jest.mock('../src/services/redis_service', () => {
  const mock_store: Record<string, Record<string, string> | string> = {};

  const mock_redis = {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockImplementation((key: string) => {
      const val = mock_store[key];
      return Promise.resolve(typeof val === 'string' ? val : null);
    }),
    set: jest.fn().mockImplementation((key: string, value: string) => {
      mock_store[key] = value;
      return Promise.resolve('OK');
    }),
    setex: jest.fn().mockImplementation((key: string, _ttl: number, value: string) => {
      mock_store[key] = value;
      return Promise.resolve('OK');
    }),
    hset: jest.fn().mockImplementation((key: string, fields: Record<string, string>) => {
      mock_store[key] = fields;
      return Promise.resolve(1);
    }),
    hgetall: jest.fn().mockImplementation((key: string) => {
      const val = mock_store[key];
      return Promise.resolve(typeof val === 'object' ? val : null);
    }),
    exists: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn()
  };

  return { redis_client: mock_redis };
});

// Set required environment variables so config.ts does not crash during tests
process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_chars_long';
process.env.NODE_ENV = 'test';

// =====================
// HEALTH CHECK
// =====================
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('auth');
  });
});

// =====================
// REGISTER
// =====================
describe('POST /api/auth/register', () => {
  it('returns 201 with userId and email when given valid data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'strongpassword123' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.user_id).toBeDefined();
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'strongpassword123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    // The mock redis.get returns a value for 'email_index:duplicate@example.com'
    // which simulates an already-registered email
    const { redis_client } = require('../src/services/redis_service');
    redis_client.get.mockResolvedValueOnce('existing_user_id');

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'duplicate@example.com', password: 'strongpassword123' });

    expect(res.status).toBe(409);
  });
});

// =====================
// LOGIN
// =====================
describe('POST /api/auth/login', () => {
  it('returns 200 with access_token when credentials are correct', async () => {
    // The bcrypt comparison will fail with a mock hash, so we spy on auth_service
    // and mock the login function directly
    const auth_service = require('../src/services/auth_service');
    const original = auth_service.login_user;
    auth_service.login_user = jest.fn().mockResolvedValueOnce({
      access_token: 'mock.jwt.token',
      expires_in: 900
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'strongpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();

    auth_service.login_user = original;
  });

  it('returns 400 when body is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});

// =====================
// GET /api/auth/me
// =====================
describe('GET /api/auth/me', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });
});
