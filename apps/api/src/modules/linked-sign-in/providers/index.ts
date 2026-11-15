import { dev } from './dev';
import { facebook } from './facebook';
import { google } from './google';
import { type SignInProvider } from './sign-in-provider';

/**
 * The providers this deployment offers: each one whose credentials are set, and the dev provider only on a local
 * machine or in e2e (never `development`, which is a hosted environment). The web app shows a button for each.
 */
export const configuredProviders = (env = process.env): SignInProvider[] =>
  [
    env.API_GOOGLE_CLIENT_ID &&
      env.API_GOOGLE_CLIENT_SECRET &&
      google(env.API_GOOGLE_CLIENT_ID, env.API_GOOGLE_CLIENT_SECRET),
    env.API_FACEBOOK_APP_ID &&
      env.API_FACEBOOK_APP_SECRET &&
      facebook(env.API_FACEBOOK_APP_ID, env.API_FACEBOOK_APP_SECRET),
    (env.NODE_ENV === 'local' || env.NODE_ENV === 'e2e') && dev(),
  ].filter((provider): provider is SignInProvider => !!provider);
