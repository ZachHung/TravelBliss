import {
  ApolloClient,
  ApolloLink,
  CombinedGraphQLErrors,
  gql,
  InMemoryCache,
} from '@apollo/client';
import { Observable } from 'rxjs';
import { createSessionLink, setAccessToken } from './link';

const query = gql`
  query Q {
    me {
      id
    }
  }
`;

const unauthenticated = {
  errors: [{ message: 'nope', extensions: { code: 'UNAUTHENTICATED' } }],
};

// Fails with UNAUTHENTICATED unless the request carries `Bearer good`.
const setup = (refreshResponse: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(refreshResponse);
  vi.stubGlobal('fetch', fetchMock);
  const seen: (string | undefined)[] = [];
  const server = new ApolloLink(
    (operation) =>
      new Observable((o) => {
        const auth = operation.getContext().headers?.authorization;
        seen.push(auth);
        o.next(auth === 'Bearer good' ? { data: { me: { id: '1' } } } : unauthenticated);
        o.complete();
      })
  );
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: createSessionLink('/gql').concat(server),
  });
  return {
    fetchMock,
    seen,
    run: () => client.query({ query, fetchPolicy: 'no-cache' }).catch((e) => e),
  };
};

describe('createSessionLink', () => {
  beforeEach(() => setAccessToken(null));
  afterEach(() => vi.unstubAllGlobals());

  it('sends the stored token without refreshing', async () => {
    setAccessToken('good');
    const { fetchMock, seen, run } = setup(new Response('{}'));

    await run();

    expect(seen).toEqual(['Bearer good']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes once and retries with the new token when unauthenticated', async () => {
    const { fetchMock, seen, run } = setup(
      new Response(JSON.stringify({ data: { refreshToken: { accessToken: 'good' } } }))
    );

    const result = await run();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([undefined, 'Bearer good']);
    expect(result).toMatchObject({ data: { me: { id: '1' } } });
  });

  it('surfaces the original error when the refresh fails', async () => {
    const { seen, run } = setup(
      new Response(JSON.stringify({ errors: [{ message: 'no cookie' }] }))
    );

    const result = await run();

    expect(seen).toHaveLength(1);
    expect(CombinedGraphQLErrors.is(result)).toBe(true);
  });

  it('lets one tab refresh at a time, so two tabs never spend the same refresh cookie', async () => {
    // A Web Lock stand-in: callbacks for the same lock run one after another
    let tail = Promise.resolve();
    const locks = {
      request: vi.fn((_name: string, run: () => Promise<unknown>) => {
        const result = tail.then(run);
        tail = result.then(
          () => undefined,
          () => undefined
        );
        return result;
      }),
    };
    vi.stubGlobal('navigator', { ...navigator, locks });
    let inFlight = 0;
    let maxInFlight = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        maxInFlight = Math.max(maxInFlight, ++inFlight);
        await new Promise((resolve) => setTimeout(resolve, 10));
        inFlight -= 1;
        return new Response(JSON.stringify({ data: { refreshToken: { accessToken: 'good' } } }));
      })
    );
    const server = new ApolloLink(
      (operation) =>
        new Observable((o) => {
          const ok = operation.getContext().headers?.authorization === 'Bearer good';
          o.next(ok ? { data: { me: { id: '1' } } } : unauthenticated);
          o.complete();
        })
    );
    // Two tabs: each has its own session link, so its own per-tab `pending`
    const tab = () =>
      new ApolloClient({
        cache: new InMemoryCache(),
        link: createSessionLink('/gql').concat(server),
      });

    const results = await Promise.all(
      [tab(), tab()].map((client) => client.query({ query, fetchPolicy: 'no-cache' }))
    );

    expect(maxInFlight).toBe(1);
    expect(locks.request).toHaveBeenCalledWith('travelbliss-session-refresh', expect.any(Function));
    expect(results.map((r) => r.data)).toEqual([{ me: { id: '1' } }, { me: { id: '1' } }]);
  });
});
