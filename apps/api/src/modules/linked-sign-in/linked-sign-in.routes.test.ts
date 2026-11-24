import { type AddressInfo } from 'net';
import express from 'express';
import { ErrorCode } from '@/core/shared/error-code';
import { linkedSignInRoutes } from './linked-sign-in.routes';
import { type LinkedSignInService } from './linked-sign-in.service';
import { configuredProviders } from './providers';
import { SignInProviderName } from './providers/sign-in-provider';

// A real server on a free port: the routes are tested by the redirects a browser would follow
const serve = async (finish: LinkedSignInService['finish']) => {
  const service = { has: (name: string) => name in SignInProviderName, finish } as never;
  const server = express().use(linkedSignInRoutes(service)).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const get = async (path: string) => {
    const response = await fetch(`http://localhost:${port}${path}`, { redirect: 'manual' });
    return { status: response.status, location: response.headers.get('location') };
  };
  return { get, close: () => server.close() };
};

describe('linked sign-in routes', () => {
  it('sends the browser home, to the sign-in page, or back to the account page', async () => {
    const finish = vi.fn();
    const { get, close } = await serve(finish);

    finish.mockResolvedValueOnce({ connecting: false });
    expect(await get('/auth/google/callback?code=c&state=s')).toEqual({
      status: 302,
      location: 'http://localhost:5173/',
    });
    expect(finish).toHaveBeenCalledWith(
      SignInProviderName.GOOGLE,
      { code: 'c', state: 's' },
      expect.anything()
    );

    finish.mockResolvedValueOnce({
      connecting: false,
      error: ErrorCode.EMAIL_TAKEN_SIGN_IN_TO_LINK,
    });
    expect((await get('/auth/google/callback')).location).toBe(
      'http://localhost:5173/sign-in?error=EMAIL_TAKEN_SIGN_IN_TO_LINK'
    );

    finish.mockResolvedValueOnce({ connecting: true, error: ErrorCode.LINKED_SIGN_IN_TAKEN });
    expect((await get('/auth/facebook/callback')).location).toBe(
      'http://localhost:5173/account?error=LINKED_SIGN_IN_TAKEN'
    );

    expect((await get('/auth/myspace/callback')).status).toBe(404);
    close();
  });

  it("serves the dev provider's consent page, which hands the chosen profile to the callback", async () => {
    const { get, close } = await serve(vi.fn());

    expect((await get('/auth/dev/authorize?state=s')).status).toBe(200);
    const { location } = await get('/auth/dev/authorize?state=s&providerUserId=d-1&email=a%40b.c');
    const code = new URL(location!, 'https://x').searchParams.get('code')!;
    expect(JSON.parse(Buffer.from(code, 'base64url').toString())).toEqual({
      providerUserId: 'd-1',
      email: 'a@b.c',
      fullName: 'a@b.c',
    });
    close();
  });
});

describe('configuredProviders', () => {
  const names = (env: Record<string, string>) => configuredProviders(env).map(({ name }) => name);

  it('offers each provider with credentials, and the dev provider only on a local machine or in e2e', () => {
    expect(names({ NODE_ENV: 'e2e' })).toEqual([SignInProviderName.DEV]);
    expect(names({ NODE_ENV: 'production' })).toEqual([]);
    expect(names({ NODE_ENV: 'development' })).toEqual([]);
    expect(
      names({
        NODE_ENV: 'local',
        API_GOOGLE_CLIENT_ID: 'id',
        API_GOOGLE_CLIENT_SECRET: 'secret',
        API_FACEBOOK_APP_ID: 'id',
      })
    ).toEqual([SignInProviderName.GOOGLE, SignInProviderName.DEV]);
  });
});
