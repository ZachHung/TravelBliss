import { assertEnv, envProblems } from './env';

const complete = {
  NODE_ENV: 'local',
  API_PORT: '8000',
  API_POSTGRES_HOST: 'localhost',
  API_POSTGRES_PORT: '5432',
  API_POSTGRES_USER: 'u',
  API_POSTGRES_PASSWORD: 'p',
  API_POSTGRES_DB: 'db',
  API_REDIS_URI: 'redis://localhost:6379',
  API_SALT_ROUND: '4',
  API_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  API_SECRET_JWT: 'j',
  API_JWT_EXPIRED: '5minutes',
  API_SECRET_REFRESH: 'r',
  API_REFRESH_EXPIRED: '30d',
  API_SESSION_MAX_AGE: '90d',
  API_COOKIE_NAME: 'c',
};

describe('envProblems', () => {
  it('accepts a complete environment', () => {
    expect(envProblems(complete)).toEqual([]);
  });

  it('names every missing variable, an empty one included', () => {
    const { API_COOKIE_NAME: _, ...rest } = complete;

    expect(envProblems({ ...rest, API_SECRET_JWT: '' })).toEqual([
      'missing API_SECRET_JWT',
      'missing API_COOKIE_NAME',
    ]);
  });

  it('needs the public URL and the web origin in production only', () => {
    expect(envProblems({ ...complete, NODE_ENV: 'production' })).toEqual([
      'missing API_CORS_ORIGIN',
      'missing API_PUBLIC_URL',
    ]);
  });

  it('rejects a malformed duration and an encryption key that is not 32 bytes', () => {
    expect(
      envProblems({ ...complete, API_SESSION_MAX_AGE: 'ninety days', API_ENCRYPTION_KEY: 'short' })
    ).toEqual([
      "API_SESSION_MAX_AGE is not a duration: 'ninety days'",
      'API_ENCRYPTION_KEY must be 32 bytes, not 5',
    ]);
  });
});

describe('assertEnv', () => {
  it('throws with every problem in one message', () => {
    expect(() => assertEnv({ ...complete, API_PORT: '', API_REDIS_URI: '' })).toThrow(
      "The environment can't run the API: missing API_PORT; missing API_REDIS_URI"
    );
  });
});
