import { cookieOptions } from './helpers';

describe('cookieOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('makes production cookies Lax, Secure and httpOnly: web and API share one origin (ADR 0006)', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(cookieOptions({ path: '/auth' })).toEqual({
      path: '/auth',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    });
  });

  it('drops Secure off production, where the API is plain http on localhost', () => {
    vi.stubEnv('NODE_ENV', 'local');

    expect(cookieOptions({})).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: false });
  });
});
