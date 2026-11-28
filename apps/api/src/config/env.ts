import { resolve } from 'path';
import { config } from 'dotenv';
import ms from 'ms';
import { z } from 'zod';

// One file per environment at the repo root: .env.local (docker on this machine, the default), .env.e2e, and on the
// VM .env.production (ADR 0006).
// src/config and dist/config are both 4 levels deep. A missing file is skipped, so deploys can use real env vars.
// Unset, .env.local is read but NODE_ENV stays unset: the app refuses to start and the Dev provider stays off, so a
// host that forgets NODE_ENV fails closed.
config({
  path: resolve(__dirname, '../../../..', `.env.${process.env.NODE_ENV || 'local'}`),
  quiet: true,
});

const text = z.string();
const port = z.coerce.number().int().positive().max(65535);
// Compared with the browser's Origin and joined with paths, so no scheme or a trailing slash would fail only at runtime
const origin = text.refine(
  (url) => URL.canParse(url) && new URL(url).origin === url,
  'must be an origin like https://host, without a path or trailing slash'
);
// "30d", "5minutes": parsed once here, so a typo fails at boot instead of meaning "already expired". Under 1s is
// rejected too: "0", "-5m" or a bare "30" (ms reads it as 30ms) would floor to 0 seconds and sign expired tokens.
const seconds = text.transform((value, ctx) => {
  const millis = ms(value as ms.StringValue);
  if (!Number.isFinite(millis) || millis < 1000) {
    ctx.addIssue({ code: 'custom', message: `not a duration of at least 1s ('${value}')` });
    return z.NEVER;
  }
  return Math.floor(millis / 1000);
});

// Every setting the API reads. .env.example says what each one is for; a new one goes in both (#215).
const schema = z.object({
  // Closed list: a typo like 'prod' would otherwise pass and switch off every production-only check
  NODE_ENV: z.enum(['local', 'e2e', 'production', 'test']),
  API_PORT: port,
  API_CORS_ORIGIN: origin.optional(),
  API_PUBLIC_URL: origin.optional(),
  // The commit the image was built from, a build arg (#201)
  GIT_SHA: text.default('dev'),

  API_POSTGRES_HOST: text,
  API_POSTGRES_PORT: port,
  API_POSTGRES_USER: text,
  API_POSTGRES_PASSWORD: text,
  API_POSTGRES_DB: text,
  API_POSTGRES_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((ssl) => ssl === 'true'),
  API_REDIS_URI: text,

  API_SALT_ROUND: z.coerce.number().int().positive(),
  // aes-256 takes exactly 32 bytes; anything else would fail only on the first refresh
  API_ENCRYPTION_KEY: text.refine((key) => Buffer.byteLength(key) === 32, {
    error: (issue) => `must be 32 bytes, not ${Buffer.byteLength(String(issue.input))}`,
  }),
  API_SECRET_JWT: text,
  API_JWT_EXPIRED: seconds,
  API_SECRET_REFRESH: text,
  API_REFRESH_EXPIRED: seconds,
  API_SESSION_MAX_AGE: seconds,
  API_COOKIE_NAME: text,

  // A provider is offered only when both of its values are set
  API_GOOGLE_CLIENT_ID: text.optional(),
  API_GOOGLE_CLIENT_SECRET: text.optional(),
  API_FACEBOOK_APP_ID: text.optional(),
  API_FACEBOOK_APP_SECRET: text.optional(),
});

// Their localhost defaults would send browsers and sign-in providers to the wrong place on a public host. Presence
// only: schema checks the shape, and checking it here too would report a bad value twice.
const inProduction = z.object({ API_CORS_ORIGIN: text, API_PUBLIC_URL: text });

export type Env = ReturnType<typeof withDefaults>;

const withDefaults = (parsed: z.output<typeof schema>) => ({
  ...parsed,
  API_CORS_ORIGIN: parsed.API_CORS_ORIGIN ?? 'http://localhost:5173',
  API_PUBLIC_URL: parsed.API_PUBLIC_URL ?? `http://localhost:${parsed.API_PORT}`,
});

// An empty value (KEY= in an env file) counts as unset
const withoutEmpty = (raw: NodeJS.ProcessEnv) =>
  Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ''));

const toProblems = (issues: z.core.$ZodIssue[], set: Record<string, unknown>) =>
  issues.map(({ path: [name], message }) =>
    String(name) in set ? `${String(name)}: ${message}` : `missing ${String(name)}`
  );

const parse = (raw: NodeJS.ProcessEnv) => {
  const set = withoutEmpty(raw);
  const result = schema.safeParse(set);
  const problems = toProblems(
    [
      ...(result.error?.issues ?? []),
      ...((set.NODE_ENV === 'production' && inProduction.safeParse(set).error?.issues) || []),
    ],
    set
  );
  return { problems, parsed: result.success && !problems.length ? result.data : undefined };
};

/** Every reason this environment can't run the API, so one failed start or deploy names them all. */
export const envProblems = (raw: NodeJS.ProcessEnv = process.env): string[] => parse(raw).problems;

/**
 * The API's settings, typed and converted (ports and salt rounds as numbers, durations in seconds, defaults filled).
 * Parsed on every call, so a test's vi.stubEnv applies at once; that's microseconds, next to bcrypt or a query.
 */
export const env = (raw: NodeJS.ProcessEnv = process.env): Env => {
  const { problems, parsed } = parse(raw);
  if (!parsed) {
    throw new Error(`The environment can't run the API: ${problems.join('; ')}`);
  }
  return withDefaults(parsed);
};

const postgres = schema.pick({
  API_POSTGRES_HOST: true,
  API_POSTGRES_PORT: true,
  API_POSTGRES_USER: true,
  API_POSTGRES_PASSWORD: true,
  API_POSTGRES_DB: true,
  API_POSTGRES_SSL: true,
});

/**
 * Only the Postgres settings: the TypeORM CLI loads data-source.ts, and a migration, a rollback above all, must not
 * need the app's secrets or URLs. The API itself still checks everything through env() at boot.
 */
export const postgresEnv = (raw: NodeJS.ProcessEnv = process.env): z.output<typeof postgres> => {
  const set = withoutEmpty(raw);
  const result = postgres.safeParse(set);
  if (!result.success) {
    throw new Error(
      `The environment can't reach Postgres: ${toProblems(result.error.issues, set).join('; ')}`
    );
  }
  return result.data;
};
