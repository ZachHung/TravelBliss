import {
  ApolloClient,
  ApolloLink,
  CombinedGraphQLErrors,
  gql,
  InMemoryCache,
} from '@apollo/client';
import { Observable } from 'rxjs';
import { createRefreshLink } from './refreshLink';

const query = gql`
  query Q {
    me {
      id
    }
  }
`;

const run = (link: ApolloLink) =>
  new ApolloClient({ cache: new InMemoryCache(), link })
    .query({ query, fetchPolicy: 'no-cache' })
    .catch((e: unknown) => e);

describe('createRefreshLink', () => {
  const expired = {
    errors: [{ message: 'expired', extensions: { code: 'INVALID_TOKEN' } }],
  };

  afterEach(() => vi.unstubAllGlobals());

  it('refreshes once and retries when the token expired', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: { refreshToken: {} } })));
    vi.stubGlobal('fetch', fetchMock);
    let calls = 0;
    const terminating = new ApolloLink(
      () =>
        new Observable((o) => {
          o.next(calls++ === 0 ? expired : { data: { me: { id: '1' } } });
          o.complete();
        })
    );

    const result = await run(createRefreshLink('/gql').concat(terminating));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
    expect(result).toMatchObject({ data: { me: { id: '1' } } });
  });

  it('gives up when the refresh fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    let calls = 0;
    const terminating = new ApolloLink(
      () =>
        new Observable((o) => {
          calls++;
          o.next(expired);
          o.complete();
        })
    );

    const result = await run(createRefreshLink('/gql').concat(terminating));

    expect(calls).toBe(1);
    expect(CombinedGraphQLErrors.is(result)).toBe(true);
  });
});
