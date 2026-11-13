import { render, screen } from '@test-utils';
import App from './App';

describe('App component', () => {
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
