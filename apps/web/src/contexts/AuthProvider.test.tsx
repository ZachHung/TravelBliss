import { render, screen, userEvent, waitFor } from '@test-utils';
import { GraphQLError } from 'graphql';
import { Route, Routes, useLocation } from 'react-router';
import { LOGIN } from '@/graphql/mutations/login';
import { LOGOUT } from '@/graphql/mutations/logout';
import { GET_ME } from '@/graphql/queries/me';
import useAuth from '@/hooks/useAuth';
import ProtectedRoute from '@/routes/ProtectedRoute';
import PublicRoute from '@/routes/PublicRoute';
import AuthProvider from './AuthProvider';

const me = {
  __typename: 'User',
  id: '1',
  username: 'an',
  phoneNumber: '0123456789',
  lastName: 'Nguyen',
  firstName: 'An',
  email: 'an@example.com',
  age: 20,
  birthday: '2005-01-01',
  fullName: 'An Nguyen',
};

const getMeOk = { request: { query: GET_ME }, result: { data: { me } } };
const getMeUnauthenticated = {
  request: { query: GET_ME },
  result: { errors: [new GraphQLError('Unauthenticated')] },
};
const loginOk = {
  request: { query: LOGIN, variables: () => true },
  result: { data: { login: { __typename: 'AuthPayload', accessToken: 'token' } } },
};

const Consumer = () => {
  const {
    info: [user],
    onLogin: [login],
    onLogout: [logout],
  } = useAuth();
  const { pathname } = useLocation();

  return (
    <>
      <p>{user ? `Hello ${user.firstName}` : 'Guest'}</p>
      <p>path {pathname}</p>
      <button type="button" onClick={() => login('0123456789', 'secret', false)}>
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </>
  );
};

const renderProvider = (mocks: Parameters<typeof render>[1] extends infer O ? O : never) =>
  render(
    <Routes>
      <Route
        path="*"
        element={
          <AuthProvider>
            <Consumer />
          </AuthProvider>
        }
      />
    </Routes>,
    { route: '/sign-in', ...mocks }
  );

describe('AuthProvider', () => {
  it('loads the current user on mount', async () => {
    renderProvider({ mocks: [getMeOk] });

    expect(await screen.findByText('Hello An')).toBeInTheDocument();
  });

  it('starts as a guest when the user is not authenticated', async () => {
    renderProvider({ mocks: [getMeUnauthenticated] });

    await waitFor(() => expect(screen.getByText('Guest')).toBeInTheDocument());
  });

  it('logs in and fetches the user, leaving navigation to the route guards', async () => {
    renderProvider({ mocks: [getMeUnauthenticated, loginOk, getMeOk] });

    await userEvent.click(screen.getByRole('button', { name: 'login' }));

    expect(await screen.findByText('Hello An')).toBeInTheDocument();
    expect(screen.getByText('path /sign-in')).toBeInTheDocument();
  });

  it('clears the user on logout', async () => {
    renderProvider({
      mocks: [getMeOk, { request: { query: LOGOUT }, result: { data: { logout: true } } }],
    });
    await screen.findByText('Hello An');

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));

    expect(await screen.findByText('Guest')).toBeInTheDocument();
  });

  it('returns to the protected page it came from after login', async () => {
    render(
      <AuthProvider>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/sign-in" element={<Consumer />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<p>Secret page</p>} />
          </Route>
          <Route path="*" element={<Consumer />} />
        </Routes>
      </AuthProvider>,
      // The user query answers after login does, as it does over the network
      { route: '/protected', mocks: [getMeUnauthenticated, loginOk, { ...getMeOk, delay: 50 }] }
    );

    await userEvent.click(await screen.findByRole('button', { name: 'login' }));

    expect(await screen.findByText('Secret page')).toBeInTheDocument();
  });
});
