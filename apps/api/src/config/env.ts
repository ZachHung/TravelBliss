import ms from 'ms';

// What the API reads with no default. .env.example says what each one is for; add a new one here too (#215).
const REQUIRED = [
  'NODE_ENV',
  'API_PORT',
  'API_POSTGRES_HOST',
  'API_POSTGRES_PORT',
  'API_POSTGRES_USER',
  'API_POSTGRES_PASSWORD',
  'API_POSTGRES_DB',
  'API_REDIS_URI',
  'API_SALT_ROUND',
  'API_ENCRYPTION_KEY',
  'API_SECRET_JWT',
  'API_JWT_EXPIRED',
  'API_SECRET_REFRESH',
  'API_REFRESH_EXPIRED',
  'API_SESSION_MAX_AGE',
  'API_COOKIE_NAME',
];
// Their localhost defaults would send browsers and sign-in providers to the wrong place on a public host
const REQUIRED_IN_PRODUCTION = ['API_CORS_ORIGIN', 'API_PUBLIC_URL'];
const DURATIONS = ['API_JWT_EXPIRED', 'API_REFRESH_EXPIRED', 'API_SESSION_MAX_AGE'];

/** Every reason this environment can't run the API, so one failed start or deploy names them all. */
export const envProblems = (env: NodeJS.ProcessEnv = process.env): string[] => {
  const required =
    env.NODE_ENV === 'production' ? [...REQUIRED, ...REQUIRED_IN_PRODUCTION] : REQUIRED;
  const problems = required.filter((name) => !env[name]).map((name) => `missing ${name}`);
  for (const name of DURATIONS) {
    const value = env[name];
    if (value && !Number.isFinite(ms(value as ms.StringValue))) {
      problems.push(`${name} is not a duration: '${value}'`);
    }
  }
  const key = env.API_ENCRYPTION_KEY;
  // aes-256 takes exactly 32 bytes; anything else fails only on the first refresh
  if (key && Buffer.byteLength(key) !== 32) {
    problems.push(`API_ENCRYPTION_KEY must be 32 bytes, not ${Buffer.byteLength(key)}`);
  }
  return problems;
};

export const assertEnv = (env: NodeJS.ProcessEnv = process.env): void => {
  const problems = envProblems(env);
  if (problems.length) {
    throw new Error(`The environment can't run the API: ${problems.join('; ')}`);
  }
};
