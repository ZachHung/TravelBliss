import { createContext, ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { LoginMutation, User } from '@generated/codegen/graphql';
import { useLocation, useNavigate } from 'react-router';
import { ROUTES } from '@/constants';
import { LOGOUT } from '@/graphql/mutations/logout';
import useGetMe from '@/hooks/graphql/useGetMe';
import useLogin from '@/hooks/graphql/useLogin';
import { Serialized } from '@/types';

export type AuthContextValue = {
  info: readonly [
    Serialized<User> | undefined,
    React.Dispatch<React.SetStateAction<Serialized<User> | undefined>>,
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
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<Serialized<User>>();
  const { data: me, refetch: refetchGetUserInfo } = useGetMe();

  useEffect(() => {
    if (me) {
      setUser((prev) => ({ ...prev, ...me.me }));
    }
  }, [me]);

  const { login, result } = useLogin({
    onCompleted: () => {
      const origin = location.state?.from?.pathname || ROUTES.ROOT;
      refetchGetUserInfo();
      navigate(origin);
    },
  });

  const [logout] = useMutation(LOGOUT, {
    onCompleted: () => {
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
      info: [user, setUser],
      onLogin: [onLogin, result, refetchGetUserInfo],
      onLogout: [onLogout],
    }),
    [user, result, refetchGetUserInfo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export default AuthProvider;
