process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_chars_long';
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.INTERNAL_SERVICE_SECRET = 'local_dev_internal_secret';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  moduleFileExtensions: ['ts', 'js', 'json']
};
