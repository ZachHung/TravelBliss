import { createContext, useMemo, useState, type ReactNode } from 'react';
import { NetworkStatus } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { type GetMeQuery, type LoginInput } from '@generated/codegen/graphql';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';
import { LOGIN } from '@/graphql/mutations/login';
import { LOGOUT } from '@/graphql/mutations/logout';
import { GET_ME } from '@/graphql/queries/me';
import { setAccessToken } from './link';

export type Session = {
  /** The signed-in user, or undefined for a guest. */
  user: GetMeQuery['me'] | undefined;
  /** Resolves once the user is loaded; rejects with the GraphQL error (e.g. WRONG_PASSWORD) for forms to map. */
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** True from the login request until the signed-in user is loaded. */
  isSigningIn: boolean;
};

export const SessionContext = createContext<Session | null>(null);

/**
 * Owns who is signed in: loads the user (exchanging the refresh cookie on reload, see link.ts), signs in and out,
 * and holds the access token. Renders a loader until the first check settles, so nothing below it ever shows the
 * guest UI to a signed-in user.
 */
const SessionProvider = ({ children }: { children: ReactNode }) => {
  const me = useQuery(GET_ME, { notifyOnNetworkStatusChange: true });
  const isRefetching = me.networkStatus === NetworkStatus.refetch;
  const [login, { loading: isLoggingIn }] = useMutation(LOGIN);
  const [logout] = useMutation(LOGOUT);
  // The query keeps the last user after sign-out, so a flag hides it until the next sign-in
  const [isSignedOut, setIsSignedOut] = useState(false);
  // Derived, not copied in an effect: a copy lags one render, and guards redirect in that gap
  const user = isSignedOut ? undefined : me.data?.me;

  const session = useMemo<Session>(
    () => ({
      user,
      isSigningIn: isLoggingIn || isRefetching,
      signIn: async (input) => {
        const { data } = await login({ variables: { input } });
        setAccessToken(data?.login.accessToken ?? null);
        // Unhide only once the new user is loaded, so the previous user's data never flashes
        await me.refetch();
        setIsSignedOut(false);
      },
      signOut: async () => {
        await logout();
        setAccessToken(null);
        setIsSignedOut(true);
      },
    }),
    [user, isLoggingIn, isRefetching, login, logout, me.refetch]
  );

  if (me.loading && !isRefetching) {
    return <FullscreenLoader />;
  }

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
};

export default SessionProvider;
