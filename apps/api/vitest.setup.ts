// Decorated classes (type-graphql, TypeORM, inversify) need the metadata polyfill before they load.
import 'reflect-metadata';

// Fixed test values, so tests never depend on the root .env.* files.
// Every required setting, as env() parses them all at once; nothing connects to these hosts in unit tests.
Object.assign(process.env, {
  API_PORT: '8000',
  API_POSTGRES_HOST: 'localhost',
  API_POSTGRES_PORT: '5432',
  API_POSTGRES_USER: 'test',
  API_POSTGRES_PASSWORD: 'test',
  API_POSTGRES_DB: 'test',
  API_REDIS_URI: 'redis://localhost:6379',
  // Required once a test stubs NODE_ENV=production; the same values the local defaults give
  API_CORS_ORIGIN: 'http://localhost:5173',
  API_PUBLIC_URL: 'http://localhost:8000',
  API_SALT_ROUND: '4',
  API_SECRET_JWT: 'jwt-secret',
  API_JWT_EXPIRED: '15m',
  API_SECRET_REFRESH: 'refresh-secret',
  API_REFRESH_EXPIRED: '7d',
  API_SESSION_MAX_AGE: '20d',
  API_COOKIE_NAME: 'tb',
  API_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
});
