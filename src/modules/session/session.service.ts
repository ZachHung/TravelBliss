import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'crypto';

import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { JwtPayload, sign, SignOptions, verify } from 'jsonwebtoken';

import logger from '../../config/logger';
import TOKEN from '../../core/container/types.container';
import { Context } from '../../types';
import { Inject, Injectable } from '../../types/inversify';
import { getEnv } from '../../utils/helpers';
import { UserService } from '../user/user.service';

import { InvalidCookiesException, InvalidTokenException } from './session.exception';
import { AuthContext, UserTokens } from './session.type';

const REDIS_KEY = {
  BLACK_LIST: 'blacklist:',
  REFRESH_TOKEN: 'refreshToken:',
} as const;

const refreshCookieName = (): string => `${getEnv('COOKIE_NAME')}:rf`;
const refreshKey = (userId: string, token: string): string =>
  `${REDIS_KEY.REFRESH_TOKEN}${userId}:${token}`;

const verifyToken = (token: string, secret: string): AuthContext | undefined => {
  if (!token) return;
  try {
    const { userId, exp } = verify(token, secret) as Required<JwtPayload> & { userId: string };
    return { userId, exp, token };
  } catch {
    return;
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
    @Inject(TOKEN.Store.Redis) private readonly store: Redis,
  ) {}

  /** The signed-in user behind an `Authorization: Bearer` header, or undefined. */
  public async authenticate(authorization?: string): Promise<AuthContext | undefined> {
    if (!authorization?.startsWith('Bearer ')) return;
    const auth = verifyToken(authorization.slice(7), getEnv('SECRET_JWT'));
    if (!auth) return;
    if (await this.store.get(REDIS_KEY.BLACK_LIST + auth.token)) return;
    return auth;
  }

  public async start(
    userId: string,
    { remember }: { remember: boolean },
    { res }: Context,
  ): Promise<UserTokens> {
    const { accessToken, refreshToken } = this.createTokens(userId);

    /*
      Best approach is to use a hash to save refresh token: https://redis.io/docs/latest/develop/data-types/hashes/,
      but unfortunately ioredis don't support HEXPIRE yet and we need it to set an expiration on a field in the hash.
      The next best approach is to store on on keys with format refreshToken:userId:Token
    */
    if (remember) await this.storeRefreshToken(userId, refreshToken, res);

    return { accessToken };
  }

  public async refresh({ res, req }: Context): Promise<UserTokens> {
    const refreshToken = this.requireCookie(req, refreshCookieName());

    const refreshTokenAuth = verifyToken(refreshToken, getEnv('SECRET_REFRESH'));
    if (!refreshTokenAuth) throw new InvalidTokenException();
    const { userId } = refreshTokenAuth;
    await this.users.findById(userId);

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
    auth: { exp, token: accessToken, userId },
    res,
    req,
  }: Required<Context>): Promise<boolean> {
    try {
      // Block the access token first: users without "remember me" have no refresh cookie.
      await this.store.set(REDIS_KEY.BLACK_LIST + accessToken, accessToken, 'EXAT', exp);

      const cookieName = refreshCookieName();
      const refreshToken = this.readCookie(req, cookieName);
      if (refreshToken) await this.store.del(refreshKey(userId, refreshToken));

      res.clearCookie(cookieName);
      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }

  private async storeRefreshToken(userId: string, refreshToken: string, res: Response) {
    const { exp } = verifyToken(refreshToken, getEnv('SECRET_REFRESH')) as AuthContext;
    await this.store.set(refreshKey(userId, refreshToken), refreshToken, 'EXAT', exp);
    this.setRefreshCookie(res, refreshToken);
  }

  private createTokens(userId: string): UserTokens & { refreshToken: string } {
    const accessToken = sign({ userId }, getEnv('SECRET_JWT'), {
      expiresIn: getEnv('JWT_EXPIRED') as SignOptions['expiresIn'],
    });
    const refreshToken = sign({ userId }, getEnv('SECRET_REFRESH'), {
      expiresIn: getEnv('REFRESH_EXPIRED') as SignOptions['expiresIn'],
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
    if (!cookieValue) return;
    try {
      return this.aesDecrypt(cookieValue);
    } catch {
      return;
    }
  }

  private requireCookie(req: Request, name: string): string {
    const value = this.readCookie(req, name);
    if (!value) throw new InvalidCookiesException();
    return value;
  }

  private aesEncrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(getEnv('ENCRYPTION_KEY')), iv);

    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private aesDecrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(getEnv('ENCRYPTION_KEY')), iv);

    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }

  private async deleteByPattern(match: string): Promise<void> {
    for await (const keys of this.store.scanStream({ match, count: 100 }) as AsyncIterable<
      string[]
    >) {
      if (keys.length) await this.store.unlink(...keys);
    }
  }
}
