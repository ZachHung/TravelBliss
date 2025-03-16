import { createContext, PropsWithChildren, useState } from 'react';
import { ApolloQueryResult, MutationResult, useMutation } from '@apollo/client';
import { Exact, GetMeQuery, LoginMutation, User } from '@generated/codegen/graphql';
import { useLocation, useNavigate } from 'react-router-dom';
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
    MutationResult<LoginMutation>,
    (
      variables?:
        | Partial<
            Exact<{
              [key: string]: never;
            }>
          >
        | undefined
    ) => Promise<ApolloQueryResult<GetMeQuery>>,
  ];
  onLogout: readonly [() => void];
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const AuthProvider = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refetch: refetchGetUserInfo } = useGetMe({
    onCompleted: (data) => {
      setUser((prev) => ({ prev, ...data.me }));
    },
  });

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

  const [user, setUser] = useState<Serialized<User>>();

  const onLogin = async (phoneNumber: string, password: string, hasRefresh?: boolean) => {
    await login({
      variables: { input: { usernameOrEmailOrPhone: phoneNumber, password, hasRefresh } },
    });
  };

  const onLogout = () => {
    logout();
  };

  const value: AuthContextValue = {
    info: [user, setUser],
    onLogin: [onLogin, result, refetchGetUserInfo],
    onLogout: [onLogout],
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export default AuthProvider;
