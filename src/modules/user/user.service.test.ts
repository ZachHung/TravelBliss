import 'reflect-metadata';

import { hash } from 'bcrypt';
import { validate } from 'class-validator';
import dayjs from 'dayjs';

import { Context } from '../../types';

import { User } from './user.entity';
import { UserErrorCodes } from './user.exception';
import { EditInfoInput } from './user.input';
import { UserService } from './user.service';

Object.assign(process.env, {
  SECRET_JWT: 'jwt-secret',
  JWT_EXPIRED: '15m',
  SECRET_REFRESH: 'refresh-secret',
  REFRESH_EXPIRED: '7d',
  COOKIE_NAME: 'tb',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  SALT_ROUND: '4',
});

// Just enough Redis: keys with get/set/del/unlink and a scanStream that yields matching keys.
const fakeRedis = () => {
  const data = new Map<string, string>();
  return {
    data,
    set: async (key: string, value: string) => data.set(key, value),
    del: async (key: string) => Number(data.delete(key)),
    unlink: async (...keys: string[]) => keys.forEach((key) => data.delete(key)),
    scanStream: ({ match }: { match: string }) =>
      (async function* () {
        const prefix = match.replace(/\*/g, '');
        yield [...data.keys()].filter((key) => key.startsWith(prefix));
      })(),
  };
};

const setup = async () => {
  const store = fakeRedis();
  const user = { id: 'u1', username: 'x', password: await hash('secret123', 4) } as User;
  const repo = {
    findOneBy: async (where: Partial<User> | Partial<User>[]) =>
      [where]
        .flat()
        .some((cond) =>
          Object.entries(cond).every(([key, value]) => user[key as keyof User] === value),
        )
        ? user
        : null,
    save: jest.fn(),
  };
  const service = new UserService(repo as never, store as never);
  return { store, repo, service };
};

// Records the cookie the service sets, so it can be sent back on the next request.
const fakeRes = () => {
  const res = { cookies: {} as Record<string, string>, cleared: [] as string[] } as Record<
    string,
    unknown
  > & { cookies: Record<string, string>; cleared: string[] };
  res.cookie = (name: string, value: string) => (res.cookies[name] = value);
  res.clearCookie = (name: string) => res.cleared.push(name);
  return res;
};
const ctx = (res: ReturnType<typeof fakeRes>, cookies = {}) =>
  ({ res, req: { cookies } }) as unknown as Context;

describe('UserService auth', () => {
  it('rotates the refresh token, and rejects and revokes it when used twice', async () => {
    const { service, store } = await setup();
    const loginRes = fakeRes();
    await service.login(
      { usernameOrEmailOrPhone: 'x', password: 'secret123', hasRefresh: true } as never,
      ctx(loginRes),
    );
    const cookies = loginRes.cookies;

    const firstRes = fakeRes();
    const first = await service.refreshToken(ctx(firstRes, cookies));
    expect(first.accessToken).toBeTruthy();
    expect(Object.keys(firstRes.cookies)).toEqual(['tb:rf']);

    // The old cookie is now a used token.
    await expect(service.refreshToken(ctx(fakeRes(), cookies))).rejects.toMatchObject({
      extensions: { code: UserErrorCodes.INVALID_TOKEN },
    });
    // ...and reuse revoked the new token as well.
    expect([...store.data.keys()].filter((key) => key.startsWith('refreshToken:'))).toEqual([]);
  });

  it('logout blocks the access token even without a refresh cookie', async () => {
    const { service, store } = await setup();
    const res = fakeRes();

    const ok = await service.logout({
      auth: { userId: 'u1', token: 'access-token', exp: dayjs().add(1, 'hour').unix() },
      req: { cookies: {} },
      res,
    } as never);

    expect(ok).toBe(true);
    expect(store.data.has('blacklist:access-token')).toBe(true);
  });

  it('turns a database unique violation into USER_EXISTED with the column', async () => {
    const { service, repo } = await setup();
    repo.findOneBy = async () => null;
    repo.save.mockRejectedValue({
      driverError: { code: '23505', detail: 'Key ("phoneNumber")=(0912345678) already exists.' },
    });

    await expect(
      service.register({
        username: 'a',
        email: 'a@b.c',
        phoneNumber: '1',
        password: 'secret123',
      } as never),
    ).rejects.toMatchObject({
      extensions: { code: UserErrorCodes.USER_EXISTED, where: 'phoneNumber' },
    });
  });
});

describe('User', () => {
  it('age counts only full years', () => {
    const user = Object.assign(new User(), {
      birthday: dayjs().subtract(25, 'year').add(1, 'day').toDate(),
    });
    expect(user.age()).toBe(24);
  });
});

describe('EditInfoInput', () => {
  it('accepts a partial update', async () => {
    const input = Object.assign(new EditInfoInput(), { fullName: 'An Nguyen' });
    expect(await validate(input)).toEqual([]);
  });
});
