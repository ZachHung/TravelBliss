import { env as settings, type Env } from '@/config/env';
import { dev } from './dev';
import { facebook } from './facebook';
import { google } from './google';
import { type SignInProvider } from './sign-in-provider';

/**
 * The providers this deployment offers: each one whose credentials are set, and the dev provider only on a local
 * machine or in e2e (never in production, the one hosted environment). The web app shows a button for each.
 */
export const configuredProviders = (env: Partial<Env> = settings()): SignInProvider[] =>
  [
    env.API_GOOGLE_CLIENT_ID &&
      env.API_GOOGLE_CLIENT_SECRET &&
      google(env.API_GOOGLE_CLIENT_ID, env.API_GOOGLE_CLIENT_SECRET),
    env.API_FACEBOOK_APP_ID &&
      env.API_FACEBOOK_APP_SECRET &&
      facebook(env.API_FACEBOOK_APP_ID, env.API_FACEBOOK_APP_SECRET),
    (env.NODE_ENV === 'local' || env.NODE_ENV === 'e2e') && dev(),
  ].filter((provider): provider is SignInProvider => !!provider);
