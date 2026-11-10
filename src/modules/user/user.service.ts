import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'crypto';

import { compare, hash } from 'bcrypt';
import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { sign, SignOptions } from 'jsonwebtoken';

import logger from '../../config/logger';
import TOKEN from '../../core/container/types.container';
import Service from '../../core/shared/service';
import { AuthContext, Context, REDIS_KEY } from '../../types';
import { Inject, Injectable } from '../../types/inversify';
import { getEnv, mutationReturn, verifyToken } from '../../utils/helpers';

import { User } from './user.entity';
import {
  InvalidCookiesException,
  InvalidTokenException,
  UserExistException,
  UserNotFoundException,
  WrongPassException,
} from './user.exception';
import { ChangePasswordInput, LoginInput, RegisterInput } from './user.input';
import { UserRepository } from './user.repository';
import { UserTokens } from './user.type';

@Injectable()
export class UserService implements Service<User> {
  constructor(
    @Inject(TOKEN.Repositories.User) private readonly userRepository: UserRepository,
    @Inject(TOKEN.Store.Redis) private readonly store: Redis,
  ) {}

  public async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new UserNotFoundException();
    return user;
  }

  public async register(input: RegisterInput): Promise<User> {
    // Cheap checks first, so taken names do not cost a bcrypt hash.
    for (const column of ['username', 'email', 'phoneNumber'] as const) {
      if (await this.userRepository.findOneBy({ [column]: input[column] })) {
        throw new UserExistException(column);
      }
    }

    const hashedPassword = await hash(input.password, +getEnv('SALT_ROUND'));

    try {
      return await this.userRepository.save({ ...input, password: hashedPassword });
    } catch (error) {
      throw this.toUserExist(error);
    }
  }

  public async login(input: LoginInput, { res }: Context): Promise<UserTokens> {
    const { password, usernameOrEmailOrPhone, hasRefresh } = input;
    const user = await this.userRepository.findOneBy([
      { username: usernameOrEmailOrPhone },
      { email: usernameOrEmailOrPhone },
      { phoneNumber: usernameOrEmailOrPhone },
    ]);

    if (!user) throw new UserNotFoundException();
    const isValidPass = await compare(password, user.password);
    if (!isValidPass) throw new WrongPassException();

    const { accessToken, refreshToken } = this.createTokens(user.id);

    /*
      Best approach is to use a hash to save refresh token: https://redis.io/docs/latest/develop/data-types/hashes/,
      but unfortunately ioredis don't support HEXPIRE yet and we need it to set an expiration on a field in the hash.
      The next best approach is to store on on keys with format refreshToken:userId:Token
    */
    if (hasRefresh) {
      const key = `${REDIS_KEY.REFRESH_TOKEN}${user.id}:${refreshToken}`;
      const { exp } = (await verifyToken(refreshToken, getEnv('SECRET_REFRESH'))) as AuthContext;
      await this.store.set(key, refreshToken, 'EXAT', exp);
      this.setCookie(res, 'rf', refreshToken);
    }

    return {
      accessToken,
    };
  }

  public async logout({
    auth: { exp, token: accessToken, userId },
    res,
    req,
  }: Required<Context>): Promise<boolean> {
    try {
      // Block the access token first: users without "remember me" have no refresh cookie.
      await this.store.set(REDIS_KEY.BLACK_LIST + accessToken, accessToken, 'EXAT', exp);

      const cookieName = `${getEnv('COOKIE_NAME')}:rf`;
      const refreshToken = this.readCookie(req, cookieName);
      if (refreshToken) await this.store.del(`${REDIS_KEY.REFRESH_TOKEN}${userId}:${refreshToken}`);

      res.clearCookie(cookieName);
      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }

  public async refreshToken({ res, req }: Context): Promise<UserTokens> {
    const refreshToken = this.getCookie(req, `${getEnv('COOKIE_NAME')}:rf`);

    const refreshTokenAuth = await verifyToken(refreshToken, getEnv('SECRET_REFRESH'));
    if (!refreshTokenAuth) throw new InvalidTokenException();
    const { userId } = refreshTokenAuth;
    await this.findById(userId);

    // DEL is atomic: only the first caller removes the key, so each refresh token works once.
    const used = await this.store.del(`${REDIS_KEY.REFRESH_TOKEN}${userId}:${refreshToken}`);
    if (!used) {
      // Reuse of a rotated or logged-out token: revoke every refresh token of this user.
      await this.storeDelMulti(`${REDIS_KEY.REFRESH_TOKEN}${userId}:*`);
      throw new InvalidTokenException();
    }

    const { accessToken, refreshToken: newRefreshToken } = this.createTokens(userId);
    const { exp } = (await verifyToken(newRefreshToken, getEnv('SECRET_REFRESH'))) as AuthContext;

    const newRefreshTokenKey = `${REDIS_KEY.REFRESH_TOKEN}${userId}:${newRefreshToken}`;
    await this.store.set(newRefreshTokenKey, newRefreshToken, 'EXAT', exp);

    this.setCookie(res, 'rf', newRefreshToken);
    return {
      accessToken,
    };
  }

  public async getAll(): Promise<User[]> {
    const userList = await this.userRepository.find();
    return userList;
  }

  public async editInfo(input: Partial<User>, userId: string): Promise<User> {
    // GraphQL nullable inputs arrive as null; writing null would break NOT NULL columns.
    const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value != null));
    if (!Object.keys(changes).length) return this.findById(userId);

    try {
      return await mutationReturn<User>(
        // User query builder because of issue https://github.com/typeorm/typeorm/issues/2415
        this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({ ...changes, updatedAt: dayjs().toISOString() })
          .where('id = :id ', { id: userId })
          .returning('*')
          .execute(),
      );
    } catch (error) {
      throw this.toUserExist(error);
    }
  }

  public async changePassword(input: ChangePasswordInput, userId: string): Promise<User> {
    const user = await this.findById(userId);
    // Check password hash
    const isValidPass = await compare(input.oldPassword, user.password);
    if (!isValidPass) throw new WrongPassException();

    const newPassword = await hash(input.newPassword, +getEnv('SALT_ROUND'));
    return this.editInfo({ password: newPassword }, userId);
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

    return {
      accessToken,
      refreshToken,
    };
  }

  private setCookie(res: Response, name: string, value: string): void {
    res.cookie(`${getEnv('COOKIE_NAME')}:${name}`, this.aesEncrypt(value), {
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

  private getCookie(req: Request, name: string): string {
    const value = this.readCookie(req, name);
    if (!value) throw new InvalidCookiesException();
    return value;
  }

  // Postgres unique violation (23505) -> the same error the pre-check gives, with the column name.
  private toUserExist(error: unknown): unknown {
    const { code, detail } = (error as { driverError?: { code?: string; detail?: string } })
      .driverError ?? { code: undefined, detail: undefined };
    if (code !== '23505') return error;
    return new UserExistException(/Key \("?(\w+)"?\)/.exec(detail ?? '')?.[1] as keyof User);
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

    // By default node uses PKCS padding, but Python uses null-byte
    // padding instead. So calling cipher.setAutoPadding(false); after
    // you create the decipher instance will make it work as expected:
    //decipher.setAutoPadding(false);

    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }

  private async storeDelMulti(match: string): Promise<void> {
    for await (const keys of this.store.scanStream({ match, count: 100 }) as AsyncIterable<
      string[]
    >) {
      if (keys.length) await this.store.unlink(...keys);
    }
  }
}
