import {
  ApolloClient,
  ApolloLink,
  CombinedGraphQLErrors,
  gql,
  InMemoryCache,
} from '@apollo/client';
import { Observable } from 'rxjs';
import { createAuthLink, setAccessToken } from './authLink';

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
    link: createAuthLink('/gql').concat(server),
  });
  return {
    fetchMock,
    seen,
    run: () => client.query({ query, fetchPolicy: 'no-cache' }).catch((e) => e),
  };
};

describe('createAuthLink', () => {
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
});
