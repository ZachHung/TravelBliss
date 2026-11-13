import { ApolloLink, CombinedGraphQLErrors } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { from, mergeMap, throwError } from 'rxjs';

const REFRESH_QUERY = 'mutation RefreshToken { refreshToken { accessToken } }';

// Kept in memory only: the API reads it from the Authorization header, and the refresh token
// lives in an httpOnly cookie, so a page reload gets a new one through `refreshToken`.
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/**
 * Tabs share the refresh cookie. Two tabs refreshing with it at the same moment look like token reuse to the API,
 * which then revokes every session. A Web Lock (shared by all tabs of this origin) makes them take turns, so the
 * second tab sends the cookie the first one just received. Without Web Locks, refresh directly.
 */
const oneTabAtATime = <T>(refresh: () => Promise<T>): Promise<T> =>
  globalThis.navigator?.locks
    ? globalThis.navigator.locks.request('travelbliss-session-refresh', refresh)
    : refresh();

/** Adds the access token to every request, and on UNAUTHENTICATED refreshes it once and retries. */
export const createSessionLink = (uri: string | undefined) => {
  // One shared request per tab, so parallel failures do not each rotate the refresh cookie.
  let pending: Promise<string | null> | null = null;

  const refresh = () =>
    (pending ??= oneTabAtATime(() =>
      fetch(uri ?? '/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationName: 'RefreshToken', query: REFRESH_QUERY }),
      })
    )
      .then(async (res) => (await res.json()).data?.refreshToken?.accessToken ?? null)
      .catch(() => null)
      .then((token: string | null) => {
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        pending = null;
      }));

  const header = new SetContextLink(({ headers }) => ({
    headers: accessToken ? { ...headers, ...bearer(accessToken) } : headers,
  }));

  const retry = new ErrorLink(({ error, operation, forward }) => {
    const unauthenticated =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((e) => e.extensions?.code === 'UNAUTHENTICATED');

    // Never retry the refresh itself, and retry each operation only once.
    if (
      !unauthenticated ||
      operation.operationName === 'RefreshToken' ||
      operation.getContext().retried
    ) {
      return;
    }

    return from(refresh()).pipe(
      mergeMap((token) => {
        if (!token) {
          return throwError(() => error);
        }
        operation.setContext(({ headers }: { headers?: object }) => ({
          retried: true,
          headers: { ...headers, ...bearer(token) },
        }));
        return forward(operation);
      })
    );
  });

  return ApolloLink.from([header, retry]);
};
