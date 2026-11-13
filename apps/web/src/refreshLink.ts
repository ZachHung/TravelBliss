import { CombinedGraphQLErrors } from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';
import { ErrorCode } from '@generated/codegen/enums';
import { from, mergeMap, throwError } from 'rxjs';

const REFRESH_QUERY = 'mutation RefreshToken { refreshToken { accessToken } }';

/**
 * On an expired-token error, asks the API for a new cookie once, then retries the operation.
 * Tokens live in httpOnly cookies, so the browser stores them; no JWT handling here.
 */
export const createRefreshLink = (uri: string | undefined) => {
  // One shared request, so parallel failures do not each rotate the refresh token.
  let pending: Promise<boolean> | null = null;

  const refresh = () =>
    (pending ??= fetch(uri ?? '/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operationName: 'RefreshToken', query: REFRESH_QUERY }),
    })
      .then(async (res) => res.ok && !(await res.json()).errors)
      .catch(() => false)
      .finally(() => {
        pending = null;
      }));

  return new ErrorLink(({ error, operation, forward }) => {
    const expired =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((e) => e.extensions?.code === ErrorCode.INVALID_TOKEN);

    // Never retry the refresh itself, and retry each operation only once.
    if (!expired || operation.operationName === 'RefreshToken' || operation.getContext().retried) {
      return;
    }
    operation.setContext({ retried: true });

    return from(refresh()).pipe(
      mergeMap((ok) => (ok ? forward(operation) : throwError(() => error)))
    );
  });
};
