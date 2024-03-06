import { ApolloQueryResult, MutationResult, useMutation, useQuery } from '@apollo/client';
import { ReactNode, createContext, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader';
import { ROUTES } from '@/constants';
import { Exact, GetMeQuery } from '@/graphql/codegen/graphql';
import { LOGIN, LOGOUT } from '@/graphql/mutations';
import { GET_ME } from '@/graphql/queries';
import { SerializedUser } from '@/types';

export type AuthContextValue = {
  info: readonly [
    SerializedUser | undefined,
    React.Dispatch<React.SetStateAction<SerializedUser | undefined>>,
  ];
  onLogin: readonly [
    (phoneNumber: string, password: string) => void,
    MutationResult<any>,
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

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, refetch } = useQuery(GET_ME, {
    onCompleted: (data) => {
      setUser((prev) => ({ prev, ...data.me }));
    },
    notifyOnNetworkStatusChange: true,
  });
  const [login, loginData] = useMutation(LOGIN, {
    onCompleted: () => {
      const origin = location.state?.from?.pathname || ROUTES.ROOT;
      refetch();
      navigate(origin);
      return <></>;
    },
  });

  const [logout] = useMutation(LOGOUT, {
    onCompleted: () => {
      setUser(undefined);
    },
  });

  const [user, setUser] = useState<SerializedUser>();

  const onLogin = (phoneNumber: string, password: string) => {
    login({ variables: { input: { usernameOrEmailOrPhone: phoneNumber, password } } });
  };

  const onLogout = () => {
    logout();
  };

  const value: AuthContextValue = {
    info: [user, setUser],
    onLogin: [onLogin, loginData, refetch],
    onLogout: [onLogout],
  };

  if (loading) {
    return <FullScreenLoader />;
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export default AuthProvider;
