import { resolve } from 'path';
import { config } from 'dotenv';
import { type CookieOptions } from 'express';
import { type DeleteResult, type InsertResult, type UpdateResult } from 'typeorm';

// One file per environment at the repo root: .env.local (docker on this machine, the default), .env.e2e, and on the
// VM .env.production (ADR 0006).
// src/utils and dist/utils are both 4 levels deep. A missing file is skipped, so deploys can use real env vars.
// Unset, .env.local is read but NODE_ENV stays unset: the app refuses to start and the Dev provider stays off, so a
// host that forgets NODE_ENV fails closed. Migration and schema scripts only need the file.
config({
  path: resolve(__dirname, '../../../..', `.env.${process.env.NODE_ENV || 'local'}`),
  quiet: true,
});

export const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: '${name}`);
  }
  return value;
};

// Credit: https://stackoverflow.com/questions/47792808/typeorm-update-item-and-return-it
export const mutationReturn = async <T>(
  mutation: Promise<UpdateResult | DeleteResult | InsertResult>
): Promise<T> => {
  const result = await mutation;
  return result.raw[0];
};

/** The web app's origin: CORS allows it, and linked sign-in sends the browser back to it. */
export const webOrigin = (): string => process.env.API_CORS_ORIGIN || 'http://localhost:5173';

/** Where browsers reach this API; providers redirect back to it, so it must match their registered callback URL. */
export const apiPublicUrl = (): string =>
  process.env.API_PUBLIC_URL || `http://localhost:${getEnv('API_PORT')}`;

/**
 * For every cookie the API sets: httpOnly, and in production SameSite=None + Secure, because the web app calls the
 * API cross-site there.
 */
export const cookieOptions = (options: CookieOptions): CookieOptions => {
  const isProduction = getEnv('NODE_ENV') === 'production';
  return {
    ...options,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  };
};
