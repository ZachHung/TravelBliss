import { ErrorCode } from '@/core/shared/error-code';
import { type User } from '@/modules/user/user.entity';
import { type Context } from '@/types';
import { type LinkedSignIn } from './linked-sign-in.entity';
import { LinkedSignInService } from './linked-sign-in.service';
import { dev } from './providers/dev';
import { SignInProviderName, type ProviderProfile } from './providers/sign-in-provider';

const { GOOGLE } = SignInProviderName;

// The fake provider's code is the profile it returns, so each test picks who signs in
const fakeProvider = {
  name: GOOGLE,
  authorizationUrl: (state: string) => new URL(`https://provider.test/auth?state=${state}`),
  fetchProfile: async (code: string) => JSON.parse(code) as ProviderProfile,
};
const code = (profile: Partial<ProviderProfile> = {}) =>
  JSON.stringify({ providerUserId: 'g-1', email: 'an@example.com', fullName: 'An', ...profile });

const setup = () => {
  const users: Partial<User>[] = [{ id: 'u-pass', email: 'taken@example.com', password: 'hash' }];
  const links: Partial<LinkedSignIn>[] = [];
  const store = new Map<string, string>();
  const matches = (where: object) => (row: object) =>
    Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value);
  // Postgres in miniature: (provider, providerUserId) is unique, and a transaction holds the row lock it takes, so
  // transactions run one at a time; its inserts apply only when the callback succeeds
  type Tx = { users: Partial<User>[]; links: Partial<LinkedSignIn>[] };
  const failNextLink = { value: false };
  let nextLinkId = 0;
  const insertLink = (target: Partial<LinkedSignIn>[], row: Partial<LinkedSignIn>) => {
    if (failNextLink.value) {
      throw new Error('insert failed');
    }
    if (links.some((l) => l.provider === row.provider && l.providerUserId === row.providerUserId)) {
      throw Object.assign(new Error('duplicate key'), { driverError: { code: '23505' } });
    }
    target.push({ id: `l${nextLinkId++}`, ...row });
  };
  let lock = Promise.resolve();
  const transaction = <T>(work: (manager: unknown) => Promise<T>): Promise<T> => {
    const run = lock.then(async () => {
      const tx: Tx = { users: [], links: [] };
      const result = await work({
        tx,
        insert: async (_entity: unknown, row: Partial<LinkedSignIn>) => insertLink(tx.links, row),
        findOne: async (_entity: unknown, { where }: { where: object }) =>
          users.find(matches(where)) ?? null,
        find: async (_entity: unknown, { where }: { where: object }) =>
          links.filter(matches(where)),
        delete: async (_entity: unknown, where: object) =>
          links.splice(links.findIndex(matches(where)), 1),
      });
      users.push(...tx.users);
      links.push(...tx.links);
      return result;
    });
    lock = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
  const service = new LinkedSignInService(
    [fakeProvider],
    {
      find: async ({ where }: { where: object }) => links.filter(matches(where)),
      findOneBy: async (where: object) => links.find(matches(where)) ?? null,
      insert: async (row: Partial<LinkedSignIn>) => insertLink(links, row),
      delete: async (where: object) => links.splice(links.findIndex(matches(where)), 1),
      manager: { transaction },
    } as never,
    {
      findById: async (id: string) => users.find((user) => user.id === id),
      findByEmail: async (email: string) => users.find((user) => user.email === email) ?? null,
      createWithoutPassword: async (profile: ProviderProfile, manager?: { tx: Tx }) => {
        const user = { id: `u${users.length}`, email: profile.email, password: null };
        (manager?.tx.users ?? users).push(user);
        return user;
      },
    } as never,
    { start: vi.fn() } as never,
    {
      set: async (key: string, value: string) => store.set(key, value),
      getdel: async (key: string) => {
        const value = store.get(key) ?? null;
        store.delete(key);
        return value;
      },
    } as never
  );
  const sessions = (service as unknown as { sessions: { start: ReturnType<typeof vi.fn> } })
    .sessions;
  return { service, users, links, sessions, store, failNextLink };
};

// A browser: keeps the state cookie from start and sends it back on the callback
const browser = () => {
  const cookies: Record<string, string> = {};
  const res = {
    cookie: (name: string, value: string) => (cookies[name] = value),
    clearCookie: vi.fn(),
  };
  return { res, ctx: { req: { cookies }, res } as unknown as Context };
};

const signIn = async (
  service: LinkedSignInService,
  profileCode: string,
  userId?: string,
  tamper = (state: string) => state
) => {
  const { res, ctx } = browser();
  const url = new URL(await service.start(GOOGLE, userId, res as never));
  const state = url.searchParams.get('state')!;
  return {
    state,
    ctx,
    result: await service.finish(GOOGLE, { code: profileCode, state: tamper(state) }, ctx),
  };
};

describe('LinkedSignInService', () => {
  it('creates a user on first sign-in, finds the same user next time, and starts remembered sessions', async () => {
    const { service, users, links, sessions } = setup();

    expect((await signIn(service, code())).result).toEqual({ connecting: false });
    expect((await signIn(service, code({ email: 'changed@example.com' }))).result).toEqual({
      connecting: false,
    });

    expect(users).toHaveLength(2);
    expect(links).toMatchObject([{ provider: GOOGLE, providerUserId: 'g-1', userId: 'u1' }]);
    expect(sessions.start).toHaveBeenCalledTimes(2);
    expect(sessions.start).toHaveBeenLastCalledWith('u1', { remember: true }, expect.anything());
  });

  it('never links by email: an existing email must sign in with its password and connect', async () => {
    const { service, links, sessions } = setup();

    const { result } = await signIn(service, code({ email: 'taken@example.com' }));

    expect(result).toEqual({ connecting: false, error: ErrorCode.EMAIL_TAKEN_SIGN_IN_TO_LINK });
    expect(links).toEqual([]);
    expect(sessions.start).not.toHaveBeenCalled();
  });

  it('connects to the signed-in user without starting a session, but not a provider account linked elsewhere', async () => {
    const { service, links, sessions } = setup();

    expect((await signIn(service, code({ email: 'taken@example.com' }), 'u-pass')).result).toEqual({
      connecting: true,
    });
    expect(links).toMatchObject([{ userId: 'u-pass' }]);
    expect(sessions.start).not.toHaveBeenCalled();

    expect((await signIn(service, code(), 'someone-else')).result).toEqual({
      connecting: true,
      error: ErrorCode.LINKED_SIGN_IN_TAKEN,
    });
  });

  it('refuses a callback whose state is forged or replayed', async () => {
    const { service, sessions } = setup();

    const forged = await signIn(service, code(), undefined, () => 'attacker-state');
    expect(forged.result.error).toBe(ErrorCode.LINKED_SIGN_IN_FAILED);

    const { state, ctx } = await signIn(service, code());
    expect(await service.finish(GOOGLE, { code: code(), state }, ctx)).toMatchObject({
      error: ErrorCode.LINKED_SIGN_IN_FAILED,
    });
    expect(sessions.start).toHaveBeenCalledTimes(1);
  });

  it('reports a cancelled consent as a failure', async () => {
    const { service } = setup();

    expect((await signIn(service, '')).result).toEqual({
      connecting: false,
      error: ErrorCode.LINKED_SIGN_IN_FAILED,
    });
  });

  it('creates no user when linking it fails: both happen in one transaction', async () => {
    const { service, users, failNextLink } = setup();
    failNextLink.value = true;

    expect((await signIn(service, code())).result.error).toBe(ErrorCode.SOMETHING_WENT_WRONG);
    expect(users).toHaveLength(1);
  });

  it('sends a failed connect back to the account page, even when its flow is gone', async () => {
    const { service, store } = setup();

    const expired = await signIn(service, code(), 'u-pass', (state) => {
      store.clear();
      return state;
    });

    expect(expired.result).toEqual({ connecting: true, error: ErrorCode.LINKED_SIGN_IN_FAILED });
  });

  it('answers a second callback racing the first for the same provider account as if the link existed', async () => {
    const { service, links } = setup();

    const [first, second] = await Promise.all([
      signIn(service, code(), 'u-pass'),
      signIn(service, code(), 'u-pass'),
    ]);

    expect([first.result, second.result]).toEqual([{ connecting: true }, { connecting: true }]);
    expect(links).toHaveLength(1);
  });

  it('returns an unexpected failure during a connect to the account page', async () => {
    const { service } = setup();

    // The fake provider cannot parse this code: an error no rule expects
    const { result } = await signIn(service, 'not json', 'u-pass');

    expect(result).toEqual({ connecting: true, error: ErrorCode.SOMETHING_WENT_WRONG });
  });

  it('keeps the last way in when two disconnects race', async () => {
    const { service, links } = setup();
    await signIn(service, code());
    await signIn(service, code({ email: null, providerUserId: 'g-2' }), 'u1');

    const results = await Promise.allSettled([
      service.disconnect('l0', 'u1'),
      service.disconnect('l1', 'u1'),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(links).toHaveLength(1);
  });

  it('keeps the last way to sign in', async () => {
    const { service, links } = setup();
    await signIn(service, code());
    await signIn(service, code({ email: null, providerUserId: 'g-2' }), 'u-pass');

    await expect(service.disconnect('l0', 'u1')).rejects.toMatchObject({
      extensions: { code: ErrorCode.LAST_SIGN_IN_METHOD },
    });
    // Has a password, so the linked sign-in can go
    await service.disconnect('l1', 'u-pass');
    expect(links).toMatchObject([{ id: 'l0' }]);
  });
});

describe('dev provider', () => {
  it('returns the profile picked on its consent page', async () => {
    const profile = { providerUserId: 'd-1', email: '', fullName: 'Dev' };
    const devCode = Buffer.from(JSON.stringify(profile)).toString('base64url');

    expect(await dev().fetchProfile(devCode, '')).toEqual({ ...profile, email: null });
  });
});
