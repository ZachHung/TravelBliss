import { render, screen } from '@test-utils';
import App from './App';

describe('App component', () => {
  // The router loads these lazily, so the first render also transforms and imports them (Mantine, the icons):
  // that took up to ~4.8 s of the test's 5 s on a cold or busy machine (#191). Load them here, so the test times only
  // the render it asserts on. Loading scales with machine load (up to ~30 s during a no-cache Docker build), hence 60 s.
  beforeAll(async () => {
    await Promise.all([
      import('@/session/SessionProvider'),
      import('@/layouts/Root.layout'),
      import('@/pages/Home.page'),
    ]);
  }, 60_000);

  beforeEach(() => {
    // App owns its ApolloClient, so keep the "me" query away from the network
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errors: [{ message: 'Unauthenticated' }] }), {
          headers: { 'content-type': 'application/json' },
        })
      )
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the home page inside the app shell', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /welcome to travelbliss/i })
    ).toBeInTheDocument();
  });
});
