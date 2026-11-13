import 'reflect-metadata';

import dayjs from 'dayjs';
import { sign } from 'jsonwebtoken';

import { Context } from '../../types';

import { SessionErrorCodes } from './session.exception';
import { SessionService } from './session.service';

Object.assign(process.env, {
  SECRET_JWT: 'jwt-secret',
  JWT_EXPIRED: '15m',
  SECRET_REFRESH: 'refresh-secret',
  REFRESH_EXPIRED: '7d',
  COOKIE_NAME: 'tb',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
});

// Just enough Redis: keys with get/set/del/unlink and a scanStream that yields matching keys.
const fakeRedis = () => {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key: string) => data.get(key) ?? null,
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

const setup = () => {
  const store = fakeRedis();
  const users = { findById: vi.fn().mockResolvedValue({ id: 'u1' }) };
  const service = new SessionService(users as never, store as never);
  return { store, users, service };
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

describe('SessionService', () => {
  it('rotates the refresh token, and rejects and revokes it when used twice', async () => {
    const { service, store } = setup();
    const startRes = fakeRes();
    await service.start('u1', { remember: true }, ctx(startRes));
    const cookies = startRes.cookies;

    const firstRes = fakeRes();
    const first = await service.refresh(ctx(firstRes, cookies));
    expect(first.accessToken).toBeTruthy();
    expect(Object.keys(firstRes.cookies)).toEqual(['tb:rf']);

    // The old cookie is now a used token.
    await expect(service.refresh(ctx(fakeRes(), cookies))).rejects.toMatchObject({
      extensions: { code: SessionErrorCodes.INVALID_TOKEN },
    });
    // ...and reuse revoked the new token as well.
    expect([...store.data.keys()].filter((key) => key.startsWith('refreshToken:'))).toEqual([]);
  });

  it('sets no refresh cookie unless the user asked to be remembered', async () => {
    const { service } = setup();
    const res = fakeRes();

    await service.start('u1', { remember: false }, ctx(res));

    expect(res.cookies).toEqual({});
  });

  it('refuses to refresh without a cookie, or for a user that no longer exists', async () => {
    const { service, users } = setup();
    await expect(service.refresh(ctx(fakeRes()))).rejects.toMatchObject({
      extensions: { code: SessionErrorCodes.INVALID_COOKIES },
    });

    const startRes = fakeRes();
    await service.start('u1', { remember: true }, ctx(startRes));
    users.findById.mockRejectedValue(new Error('gone'));
    await expect(service.refresh(ctx(fakeRes(), startRes.cookies))).rejects.toThrow('gone');
  });

  it('authenticate accepts a valid access token, and rejects it after end()', async () => {
    const { service } = setup();
    const { accessToken } = await service.start('u1', { remember: false }, ctx(fakeRes()));
    const header = `Bearer ${accessToken}`;

    const auth = await service.authenticate(header);
    expect(auth).toMatchObject({ userId: 'u1', token: accessToken });

    await service.end({ auth, req: { cookies: {} }, res: fakeRes() } as never);

    expect(await service.authenticate(header)).toBeUndefined();
  });

  it('authenticate rejects a token whose blacklist key is set', async () => {
    const { service, store } = setup();
    const { accessToken } = await service.start('u1', { remember: false }, ctx(fakeRes()));
    store.data.set(`blacklist:${accessToken}`, accessToken);

    expect(await service.authenticate(`Bearer ${accessToken}`)).toBeUndefined();
  });

  it('authenticate rejects a missing, malformed or wrongly signed token', async () => {
    const { service } = setup();
    const forged = sign({ userId: 'u1' }, 'other-secret');

    expect(await service.authenticate(undefined)).toBeUndefined();
    expect(await service.authenticate('Bearer nonsense')).toBeUndefined();
    expect(await service.authenticate(`Bearer ${forged}`)).toBeUndefined();
    expect(await service.authenticate(forged)).toBeUndefined();
  });

  it('end blocks the access token even without a refresh cookie', async () => {
    const { service, store } = setup();

    const ok = await service.end({
      auth: { userId: 'u1', token: 'access-token', exp: dayjs().add(1, 'hour').unix() },
      req: { cookies: {} },
      res: fakeRes(),
    } as never);

    expect(ok).toBe(true);
    expect(store.data.has('blacklist:access-token')).toBe(true);
  });
});
