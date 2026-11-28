import { env, envProblems } from './env';

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

  it('names every missing setting, an empty one included', () => {
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

  it('names malformed values alongside missing ones', () => {
    const { API_COOKIE_NAME: _, ...rest } = complete;

    expect(
      envProblems({
        ...rest,
        API_SESSION_MAX_AGE: 'ninety days',
        API_ENCRYPTION_KEY: 'short',
        API_PORT: 'eighty',
      })
    ).toEqual([
      expect.stringMatching(/^API_PORT: /),
      'API_ENCRYPTION_KEY: must be 32 bytes, not 5',
      "API_SESSION_MAX_AGE: not a duration of at least 1s ('ninety days')",
      'missing API_COOKIE_NAME',
    ]);
  });

  it.each(['0', '-5m', '500ms', '30'])(
    'rejects %s as a duration, since it would mean already expired',
    (value) => {
      expect(envProblems({ ...complete, API_JWT_EXPIRED: value })).toEqual([
        `API_JWT_EXPIRED: not a duration of at least 1s ('${value}')`,
      ]);
    }
  );
});

describe('env', () => {
  it('converts the settings and fills the defaults', () => {
    expect(env(complete)).toMatchObject({
      API_PORT: 8000,
      API_POSTGRES_PORT: 5432,
      API_POSTGRES_SSL: false,
      API_SALT_ROUND: 4,
      API_JWT_EXPIRED: 300,
      API_REFRESH_EXPIRED: 30 * 24 * 60 * 60,
      API_SESSION_MAX_AGE: 90 * 24 * 60 * 60,
      API_CORS_ORIGIN: 'http://localhost:5173',
      API_PUBLIC_URL: 'http://localhost:8000',
      GIT_SHA: 'dev',
    });
  });

  it('keeps the values that are set', () => {
    expect(
      env({
        ...complete,
        NODE_ENV: 'production',
        API_POSTGRES_SSL: 'true',
        API_CORS_ORIGIN: 'https://travelbliss.example',
        API_PUBLIC_URL: 'https://travelbliss.example',
        GIT_SHA: 'abc123',
      })
    ).toMatchObject({
      API_POSTGRES_SSL: true,
      API_CORS_ORIGIN: 'https://travelbliss.example',
      API_PUBLIC_URL: 'https://travelbliss.example',
      GIT_SHA: 'abc123',
    });
  });

  it('throws with every problem in one message', () => {
    expect(() => env({ ...complete, API_PORT: '', API_REDIS_URI: '' })).toThrow(
      "The environment can't run the API: missing API_PORT; missing API_REDIS_URI"
    );
  });
});
