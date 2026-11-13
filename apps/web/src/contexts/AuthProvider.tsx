import { createContext, useMemo, useState, type ReactNode } from 'react';
import { useMutation } from '@apollo/client/react';
import { type GetMeQuery, type LoginMutation } from '@generated/codegen/graphql';
import { setAccessToken } from '@/authLink';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';
import { LOGOUT } from '@/graphql/mutations/logout';
import useGetMe from '@/hooks/graphql/useGetMe';
import useLogin from '@/hooks/graphql/useLogin';

export type CurrentUser = GetMeQuery['me'];

export type AuthContextValue = {
  info: readonly [CurrentUser | undefined];
  onLogin: readonly [
    (phoneNumber: string, password: string, hasRefresh?: boolean) => Promise<void>,
    useMutation.Result<LoginMutation>,
    ReturnType<typeof useGetMe>['refetch'],
  ];
  onLogout: readonly [() => void];
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: me, refetch: refetchGetUserInfo, isLoading, isRefetching } = useGetMe();
  // The query keeps the last user after logout, so a flag hides it until the next login
  const [isSignedOut, setIsSignedOut] = useState(false);
  // Derived, not copied in an effect: a copy lags one render, and guards redirect in that gap
  const user = isSignedOut ? undefined : me?.me;

  const { login, result } = useLogin({
    // No navigate here: once the user loads, PublicRoute sends them back where they came from
    onCompleted: async (data) => {
      setAccessToken(data.login.accessToken);
      // Unhide only once the new user is loaded, so the previous user's data never flashes
      await refetchGetUserInfo();
      setIsSignedOut(false);
    },
  });

  const [logout] = useMutation(LOGOUT, {
    onCompleted: () => {
      setAccessToken(null);
      setIsSignedOut(true);
    },
  });

  const onLogin = async (phoneNumber: string, password: string, hasRefresh?: boolean) => {
    await login({
      variables: { input: { usernameOrEmailOrPhone: phoneNumber, password, hasRefresh } },
    });
  };

  const onLogout = () => {
    logout();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      info: [user],
      onLogin: [onLogin, result, refetchGetUserInfo],
      onLogout: [onLogout],
    }),
    [user, result, refetchGetUserInfo]
  );

  // Until the first session check settles (including the refresh-cookie exchange), nothing renders: the
  // header and route guards would otherwise show the guest UI for a moment on every reload
  if (isLoading && !isRefetching) {
    return <FullscreenLoader />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export default AuthProvider;
