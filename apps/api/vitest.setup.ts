// Decorated classes (type-graphql, TypeORM, inversify) need the metadata polyfill before they load.
import 'reflect-metadata';

// Fixed test values, so tests never depend on the root .env.* files.
Object.assign(process.env, {
  API_SALT_ROUND: '4',
  API_SECRET_JWT: 'jwt-secret',
  API_JWT_EXPIRED: '15m',
  API_SECRET_REFRESH: 'refresh-secret',
  API_REFRESH_EXPIRED: '7d',
  API_COOKIE_NAME: 'tb',
  API_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
});
