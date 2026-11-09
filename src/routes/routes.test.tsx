import { render, screen } from '@test-utils';
import { Route, Routes, useLocation } from 'react-router';
import { ROUTES } from '@/constants';
import { AuthContext, type AuthContextValue, type CurrentUser } from '@/contexts/AuthProvider';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const user = { id: '1', firstName: 'An' } as CurrentUser;

const withUser = (current?: CurrentUser) =>
  ({ info: [current, vi.fn()], onLogin: [], onLogout: [vi.fn()] }) as unknown as AuthContextValue;

const LocationState = () => {
  const { pathname, state } = useLocation();
  return (
    <p>
      at {pathname} from {state?.from?.pathname ?? 'nowhere'}
    </p>
  );
};

const renderRoutes = (current: CurrentUser | undefined, route: string) =>
  render(
    <AuthContext.Provider value={withUser(current)}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path={ROUTES.SIGN_IN} element={<p>Sign in page</p>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.PROTECTED} element={<p>Secret page</p>} />
        </Route>
        <Route path="*" element={<LocationState />} />
      </Routes>
    </AuthContext.Provider>,
    { route }
  );

describe('ProtectedRoute', () => {
  it('renders the nested route for a signed-in user', () => {
    renderRoutes(user, ROUTES.PROTECTED);

    expect(screen.getByText('Secret page')).toBeInTheDocument();
  });

  it('redirects guests to the sign in page', () => {
    renderRoutes(undefined, ROUTES.PROTECTED);

    expect(screen.getByText('Sign in page')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  it('renders the nested route for guests', () => {
    renderRoutes(undefined, ROUTES.SIGN_IN);

    expect(screen.getByText('Sign in page')).toBeInTheDocument();
  });

  it('redirects signed-in users to the home page', () => {
    renderRoutes(user, ROUTES.SIGN_IN);

    expect(screen.getByText('at / from nowhere')).toBeInTheDocument();
  });
});
