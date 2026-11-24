import { type AddressInfo } from 'net';
import express from 'express';
import { healthRoutes } from './health.routes';

const serve = async (...args: Parameters<typeof healthRoutes>) => {
  const server = express()
    .use(healthRoutes(...args))
    .listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const response = await fetch(`http://localhost:${port}/health`);
  server.close();
  return {
    status: response.status,
    cache: response.headers.get('cache-control'),
    body: (await response.json()) as {
      status: string;
      version: string;
      checks: Record<string, string>;
    },
  };
};

const ok = () => Promise.resolve();

describe('GET /health', () => {
  it('passes with the version when every dependency answers', async () => {
    expect(await serve({ postgres: ok, redis: ok }, 'abc123')).toEqual({
      status: 200,
      cache: 'no-store',
      body: { status: 'pass', version: 'abc123', checks: { postgres: 'pass', redis: 'pass' } },
    });
  });

  it('fails with 503 and names the dependency, without its error', async () => {
    const { status, body } = await serve(
      {
        postgres: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432')),
        redis: ok,
      },
      'abc123'
    );
    expect(status).toBe(503);
    expect(body).toEqual({
      status: 'fail',
      version: 'abc123',
      checks: { postgres: 'fail', redis: 'pass' },
    });
  });

  it('fails a dependency that hangs instead of hanging itself', async () => {
    const { status, body } = await serve({ postgres: ok, redis: () => new Promise(() => {}) });
    expect(status).toBe(503);
    expect(body.checks.redis).toBe('fail');
  });

  it('reports "dev" when the image has no GIT_SHA', async () => {
    vi.stubEnv('GIT_SHA', '');
    expect((await serve({ postgres: ok })).body.version).toBe('dev');
    vi.unstubAllEnvs();
  });
});
