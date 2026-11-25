import { type CookieOptions } from 'express';
import { type DeleteResult, type InsertResult, type UpdateResult } from 'typeorm';
import { env } from '@/config/env';

// Credit: https://stackoverflow.com/questions/47792808/typeorm-update-item-and-return-it
export const mutationReturn = async <T>(
  mutation: Promise<UpdateResult | DeleteResult | InsertResult>
): Promise<T> => {
  const result = await mutation;
  return result.raw[0];
};

/** The web app's origin: CORS allows it, and linked sign-in sends the browser back to it. */
export const webOrigin = (): string => env().API_CORS_ORIGIN;

/** Where browsers reach this API; providers redirect back to it, so it must match their registered callback URL. */
export const apiPublicUrl = (): string => env().API_PUBLIC_URL;

/**
 * For every cookie the API sets: httpOnly, SameSite=Lax, and Secure in production. The web app and the API share one
 * origin there (ADR 0006), and localhost ports are one site, so no cookie needs to travel cross-site. Lax, not Strict:
 * a provider's redirect back to /auth/<provider>/callback is a cross-site navigation that must carry the state cookie.
 */
export const cookieOptions = (options: CookieOptions): CookieOptions => ({
  ...options,
  httpOnly: true,
  sameSite: 'lax',
  secure: env().NODE_ENV === 'production',
});
