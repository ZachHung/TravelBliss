import dayjs from 'dayjs';
import { sign } from 'jsonwebtoken';
import { ErrorCode } from '@/core/shared/error-code';
import { UserNotFoundException } from '@/modules/user/user.exception';
import { type Context } from '@/types';
import { SessionService } from './session.service';

// Just enough Redis: keys with get/mget/set/del/unlink and a scanStream that yields matching keys.
const fakeRedis = () => {
  const data = new Map<string, string>();
  return {
    data,
    get: async (key: string) => data.get(key) ?? null,
    mget: async (...keys: string[]) => keys.map((key) => data.get(key) ?? null),
    expiresAt: new Map<string, number>(),
    async set(key: string, value: string, mode?: string, at?: number) {
      if (mode === 'EXAT' && at) {
        this.expiresAt.set(key, at);
      }
      return data.set(key, value);
    },
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
  res.options = {} as Record<string, { expires?: Date }>;
  res.cookie = (name: string, value: string, options: { expires?: Date }) => {
    (res.options as Record<string, { expires?: Date }>)[name] = options;
    res.cookies[name] = value;
  };
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
    expect(Object.keys(firstRes.cookies)).toEqual(['tb_rf']);

    // The old cookie is now a used token.
    await expect(service.refresh(ctx(fakeRes(), cookies))).rejects.toMatchObject({
      extensions: { code: ErrorCode.INVALID_TOKEN },
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
      extensions: { code: ErrorCode.INVALID_COOKIES },
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
    expect(auth).toMatchObject({ user: { id: 'u1' }, token: accessToken });

    await service.end({ auth, req: { cookies: {} }, res: fakeRes() } as never);

    expect(await service.authenticate(header)).toBeUndefined();
  });

  it('authenticate rejects a token whose blacklist key is set', async () => {
    const { service, store } = setup();
    const { accessToken } = await service.start('u1', { remember: false }, ctx(fakeRes()));
    store.data.set(`blacklist:${accessToken}`, accessToken);

    expect(await service.authenticate(`Bearer ${accessToken}`)).toBeUndefined();
  });

  it('authenticate treats a deleted user as a guest, but lets a database failure through', async () => {
    const { service, users } = setup();
    const { accessToken } = await service.start('u1', { remember: false }, ctx(fakeRes()));
    const header = `Bearer ${accessToken}`;

    users.findById.mockRejectedValueOnce(new UserNotFoundException());
    expect(await service.authenticate(header)).toBeUndefined();

    const outage = new Error('connect ECONNREFUSED');
    users.findById.mockRejectedValueOnce(outage);
    await expect(service.authenticate(header)).rejects.toBe(outage);
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
      auth: { user: { id: 'u1' }, token: 'access-token', exp: dayjs().add(1, 'hour').unix() },
      req: { cookies: {} },
      res: fakeRes(),
    } as never);

    expect(ok).toBe(true);
    expect(store.data.has('blacklist:access-token')).toBe(true);
  });

  describe('endOtherSessions', () => {
    // Token times have one-second resolution, so the clock moves between "before" and "after"
    beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-14T10:00:00Z') }));
    afterEach(() => vi.useRealTimers());

    const signIn = async (service: SessionService) => {
      const res = fakeRes();
      const { accessToken } = await service.start('u1', { remember: true }, ctx(res));
      return { accessToken, cookies: res.cookies };
    };

    it('revokes every other device, access and refresh tokens alike, and keeps this one signed in', async () => {
      const { service } = setup();
      const phone = await signIn(service);
      const laptop = await signIn(service);
      vi.advanceTimersByTime(2000);

      const laptopRes = fakeRes();
      const fresh = await service.endOtherSessions({
        ...ctx(laptopRes, laptop.cookies),
        auth: { user: { id: 'u1' }, token: laptop.accessToken, exp: 0 },
      } as never);

      // The phone: its unexpired access token stops working, and so does its refresh cookie
      expect(await service.authenticate(`Bearer ${phone.accessToken}`)).toBeUndefined();
      await expect(service.refresh(ctx(fakeRes(), phone.cookies))).rejects.toMatchObject({
        extensions: { code: ErrorCode.INVALID_TOKEN },
      });
      // The laptop's old token too; the fresh pair works, and the refresh cookie was re-issued
      expect(await service.authenticate(`Bearer ${laptop.accessToken}`)).toBeUndefined();
      expect(await service.authenticate(`Bearer ${fresh.accessToken}`)).toMatchObject({
        user: { id: 'u1' },
      });
      await expect(service.refresh(ctx(fakeRes(), laptopRes.cookies))).resolves.toMatchObject({
        accessToken: expect.any(String),
      });
    });

    it('re-issues no refresh cookie when this device was not remembered', async () => {
      const { service } = setup();
      const { accessToken } = await service.start('u1', { remember: false }, ctx(fakeRes()));
      vi.advanceTimersByTime(2000);

      const res = fakeRes();
      await service.endOtherSessions({
        ...ctx(res),
        auth: { user: { id: 'u1' }, token: accessToken, exp: 0 },
      } as never);

      expect(res.cookies).toEqual({});
    });
  });

  describe('session lifetime (idle 7d, absolute cap 20d in tests)', () => {
    // (idle timeout) nothing for longer than 7 days: the refresh token has expired
    it('ends an idle session after 7 days without a refresh', async () => {
      const { service } = setup();
      const res = fakeRes();
      await service.start('u1', { remember: true }, ctx(res));

      vi.setSystemTime(start.getTime() + 8 * day);
      await expect(service.refresh(ctx(fakeRes(), res.cookies))).rejects.toMatchObject({
        extensions: { code: ErrorCode.INVALID_TOKEN },
      });
    });

    const day = 24 * 60 * 60 * 1000;
    const start = new Date('2026-11-14T10:00:00Z');
    beforeEach(() => vi.useFakeTimers({ now: start }));
    afterEach(() => vi.useRealTimers());

    const cookieExpiry = (res: ReturnType<typeof fakeRes>) =>
      (res.options as Record<string, { expires: Date }>).tb_rf.expires.getTime();
    const refreshKeyExpiry = (store: ReturnType<typeof setup>['store']) =>
      [...store.expiresAt].find(([key]) => key.startsWith('refreshToken:'))![1] * 1000;

    it('expires the cookie, the refresh token and its Redis key together', async () => {
      const { service, store } = setup();
      const res = fakeRes();
      await service.start('u1', { remember: true }, ctx(res));

      expect(cookieExpiry(res)).toBe(start.getTime() + 7 * day);
      expect(refreshKeyExpiry(store)).toBe(cookieExpiry(res));
    });

    it('slides with activity but never past 20 days from the original sign-in', async () => {
      const { service } = setup();
      const first = fakeRes();
      await service.start('u1', { remember: true }, ctx(first));

      vi.setSystemTime(start.getTime() + 5 * day);
      const second = fakeRes();
      await service.refresh(ctx(second, first.cookies));
      expect(cookieExpiry(second)).toBe(start.getTime() + 12 * day);

      vi.setSystemTime(start.getTime() + 10 * day);
      const later = fakeRes();
      await service.refresh(ctx(later, second.cookies));
      expect(cookieExpiry(later)).toBe(start.getTime() + 17 * day);

      vi.setSystemTime(start.getTime() + 16 * day);
      const third = fakeRes();
      await service.refresh(ctx(third, later.cookies));
      // Idle would give day 23; the cap from the day-0 sign-in wins
      expect(cookieExpiry(third)).toBe(start.getTime() + 20 * day);

      vi.setSystemTime(start.getTime() + 21 * day);
      await expect(service.refresh(ctx(fakeRes(), third.cookies))).rejects.toMatchObject({
        extensions: { code: ErrorCode.INVALID_TOKEN },
      });
    });
  });
});
