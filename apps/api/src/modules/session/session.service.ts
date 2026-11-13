import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { JwtPayload, sign, SignOptions, verify } from 'jsonwebtoken';
import logger from '@/config/logger';
import TOKEN from '@/core/container/types.container';
import { UserNotFoundException } from '@/modules/user/user.exception';
import { UserService } from '@/modules/user/user.service';
import { Context } from '@/types';
import { Inject, Injectable } from '@/types/inversify';
import { getEnv } from '@/utils/helpers';
import { InvalidCookiesException, InvalidTokenException } from './session.exception';
import { AuthContext, UserTokens } from './session.type';

const REDIS_KEY = {
  BLACK_LIST: 'blacklist:',
  REFRESH_TOKEN: 'refreshToken:',
  // Unix seconds: tokens of this user issued before it are revoked (see endOtherSessions)
  VALID_FROM: 'sessionsValidFrom:',
} as const;

const refreshCookieName = (): string => `${getEnv('API_COOKIE_NAME')}_rf`; // ':' is not allowed in cookie names (cookie@0.7 throws)
const refreshKey = (userId: string, token: string): string =>
  `${REDIS_KEY.REFRESH_TOKEN}${userId}:${token}`;

type TokenClaims = { userId: string; token: string; iat: number; exp: number };

const verifyToken = (token: string, secret: string): TokenClaims | undefined => {
  if (!token) {
    return;
  }
  try {
    const { userId, iat, exp } = verify(token, secret) as Required<JwtPayload> & { userId: string };
    return { userId, iat, exp, token };
  } catch {
    // Invalid or expired token: treat as unauthenticated
  }
};

/**
 * Everything about who is signed in: access and refresh tokens, the encrypted `rf` cookie,
 * refresh rotation with reuse detection, and the access-token blacklist. Callers never see
 * JWTs, AES or Redis keys.
 */
@Injectable()
export class SessionService {
  constructor(
    @Inject(TOKEN.Services.User) private readonly users: UserService,
    @Inject(TOKEN.Store.Redis) private readonly store: Redis
  ) {}

  /**
   * The signed-in user behind an `Authorization: Bearer` header, or undefined for a guest. The one place that
   * decides who is signed in: the user is loaded here once per request, and everything else reads the context.
   */
  public async authenticate(authorization?: string): Promise<AuthContext | undefined> {
    if (!authorization?.startsWith('Bearer ')) {
      return;
    }
    const auth = verifyToken(authorization.slice(7), getEnv('API_SECRET_JWT'));
    if (!auth) {
      return;
    }
    // One round trip for both revocation checks: signed out (blacklist) or every session ended (valid-from)
    const [blacklisted, validFrom] = await this.store.mget(
      REDIS_KEY.BLACK_LIST + auth.token,
      REDIS_KEY.VALID_FROM + auth.userId
    );
    if (blacklisted || auth.iat < Number(validFrom ?? 0)) {
      return;
    }
    // A deleted user's token makes a guest; any other failure (e.g. the database is down) propagates
    const user = await this.users.findById(auth.userId).catch((error: unknown) => {
      if (error instanceof UserNotFoundException) {
        return undefined;
      }
      throw error;
    });
    return user && { user, token: auth.token, exp: auth.exp };
  }

  public async start(
    userId: string,
    { remember }: { remember: boolean },
    { res }: Context
  ): Promise<UserTokens> {
    const { accessToken, refreshToken } = this.createTokens(userId);

    /*
      Best approach is to use a hash to save refresh token: https://redis.io/docs/latest/develop/data-types/hashes/,
      but unfortunately ioredis don't support HEXPIRE yet and we need it to set an expiration on a field in the hash.
      The next best approach is to store on on keys with format refreshToken:userId:Token
    */
    if (remember) {
      await this.storeRefreshToken(userId, refreshToken, res);
    }

    return { accessToken };
  }

  public async refresh({ res, req }: Context): Promise<UserTokens> {
    const refreshToken = this.requireCookie(req, refreshCookieName());

    const refreshTokenAuth = verifyToken(refreshToken, getEnv('API_SECRET_REFRESH'));
    if (!refreshTokenAuth) {
      throw new InvalidTokenException();
    }
    const { userId, iat } = refreshTokenAuth;
    await this.users.findById(userId);
    if (iat < Number((await this.store.get(REDIS_KEY.VALID_FROM + userId)) ?? 0)) {
      throw new InvalidTokenException();
    }

    // DEL is atomic: only the first caller removes the key, so each refresh token works once.
    const used = await this.store.del(refreshKey(userId, refreshToken));
    if (!used) {
      // Reuse of a rotated or logged-out token: revoke every refresh token of this user.
      await this.deleteByPattern(`${REDIS_KEY.REFRESH_TOKEN}${userId}:*`);
      throw new InvalidTokenException();
    }

    const { accessToken, refreshToken: newRefreshToken } = this.createTokens(userId);
    await this.storeRefreshToken(userId, newRefreshToken, res);
    return { accessToken };
  }

  public async end({
    auth: {
      exp,
      token: accessToken,
      user: { id: userId },
    },
    res,
    req,
  }: Required<Context>): Promise<boolean> {
    try {
      // Block the access token first: users without "remember me" have no refresh cookie.
      await this.store.set(REDIS_KEY.BLACK_LIST + accessToken, accessToken, 'EXAT', exp);

      const cookieName = refreshCookieName();
      const refreshToken = this.readCookie(req, cookieName);
      if (refreshToken) {
        await this.store.del(refreshKey(userId, refreshToken));
      }

      res.clearCookie(cookieName);
      return true;
    } catch (error) {
      logger.error('Logout failed', error instanceof Error ? error : { error });
      return false;
    }
  }

  /**
   * Ends every session of the signed-in user except this one (e.g. after a password change): access tokens issued
   * before now stop authenticating, every refresh token is deleted, and this device gets fresh tokens. A refresh
   * cookie is only re-issued if this device had one (Remember Me).
   * shortcut: JWT iat has one-second resolution, so a token issued in this same second survives; store issue times in
   * ms (or a token version) if that ever matters.
   */
  public async endOtherSessions(ctx: Required<Context>): Promise<UserTokens> {
    const userId = ctx.auth.user.id;
    const remember = !!this.readCookie(ctx.req, refreshCookieName());
    await this.store.set(REDIS_KEY.VALID_FROM + userId, String(Math.floor(Date.now() / 1000)));
    await this.deleteByPattern(`${REDIS_KEY.REFRESH_TOKEN}${userId}:*`);
    return this.start(userId, { remember }, ctx);
  }

  private async storeRefreshToken(userId: string, refreshToken: string, res: Response) {
    const { exp } = verifyToken(refreshToken, getEnv('API_SECRET_REFRESH')) as TokenClaims;
    await this.store.set(refreshKey(userId, refreshToken), refreshToken, 'EXAT', exp);
    this.setRefreshCookie(res, refreshToken);
  }

  private createTokens(userId: string): UserTokens & { refreshToken: string } {
    const accessToken = sign({ userId }, getEnv('API_SECRET_JWT'), {
      expiresIn: getEnv('API_JWT_EXPIRED') as SignOptions['expiresIn'],
    });
    const refreshToken = sign({ userId }, getEnv('API_SECRET_REFRESH'), {
      expiresIn: getEnv('API_REFRESH_EXPIRED') as SignOptions['expiresIn'],
      // Unique id: two tokens signed in the same second must still differ for rotation to work.
      jwtid: randomUUID(),
    });

    return { accessToken, refreshToken };
  }

  private setRefreshCookie(res: Response, value: string): void {
    res.cookie(refreshCookieName(), this.aesEncrypt(value), {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: getEnv('NODE_ENV') === 'production' ? 'none' : 'lax',
      secure: getEnv('NODE_ENV') === 'production',
    });
  }

  private readCookie(req: Request, name: string): string | undefined {
    const cookieValue = req.cookies?.[name];
    if (!cookieValue) {
      return;
    }
    try {
      return this.aesDecrypt(cookieValue);
    } catch {
      // Tampered or undecryptable cookie: treat as absent
    }
  }

  private requireCookie(req: Request, name: string): string {
    const value = this.readCookie(req, name);
    if (!value) {
      throw new InvalidCookiesException();
    }
    return value;
  }

  private aesEncrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(getEnv('API_ENCRYPTION_KEY')), iv);

    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private aesDecrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(getEnv('API_ENCRYPTION_KEY')), iv);

    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }

  private async deleteByPattern(match: string): Promise<void> {
    for await (const keys of this.store.scanStream({ match, count: 100 }) as AsyncIterable<
      string[]
    >) {
      if (keys.length) {
        await this.store.unlink(...keys);
      }
    }
  }
}
