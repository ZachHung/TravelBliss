import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation } from '@apollo/client/react';
import { type GetMeQuery, type LoginMutation } from '@generated/codegen/graphql';
import { setAccessToken } from '@/authLink';
import { LOGOUT } from '@/graphql/mutations/logout';
import useGetMe from '@/hooks/graphql/useGetMe';
import useLogin from '@/hooks/graphql/useLogin';

export type CurrentUser = GetMeQuery['me'];

export type AuthContextValue = {
  info: readonly [
    CurrentUser | undefined,
    React.Dispatch<React.SetStateAction<CurrentUser | undefined>>,
    /** True until the first "who am I" request settles; guards must not redirect before that. */
    boolean,
  ];
  onLogin: readonly [
    (phoneNumber: string, password: string, hasRefresh?: boolean) => Promise<void>,
    useMutation.Result<LoginMutation>,
    ReturnType<typeof useGetMe>['refetch'],
  ];
  onLogout: readonly [() => void];
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CurrentUser>();
  const { data: me, refetch: refetchGetUserInfo, isLoading, isRefetching } = useGetMe();
  const isResolving = isLoading && !isRefetching;

  useEffect(() => {
    if (me) {
      setUser((prev) => ({ ...prev, ...me.me }));
    }
  }, [me]);

  const { login, result } = useLogin({
    // No navigate here: once the user loads, PublicRoute sends them back where they came from
    onCompleted: (data) => {
      setAccessToken(data.login.accessToken);
      refetchGetUserInfo();
    },
  });

  const [logout] = useMutation(LOGOUT, {
    onCompleted: () => {
      setAccessToken(null);
      setUser(undefined);
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
      info: [user, setUser, isResolving],
      onLogin: [onLogin, result, refetchGetUserInfo],
      onLogout: [onLogout],
    }),
    [user, isResolving, result, refetchGetUserInfo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export default AuthProvider;
