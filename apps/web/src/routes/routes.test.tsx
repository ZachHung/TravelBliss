import { render, screen } from '@test-utils';
import { Route, Routes, useLocation } from 'react-router';
import { ROUTES } from '@/constants';
import { AuthContext, type AuthContextValue, type CurrentUser } from '@/contexts/AuthProvider';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const user = { id: '1', firstName: 'An' } as CurrentUser;

const withUser = (current?: CurrentUser, isResolving = false) =>
  ({
    info: [current, vi.fn(), isResolving],
    onLogin: [],
    onLogout: [vi.fn()],
  }) as unknown as AuthContextValue;

const LocationState = () => {
  const { pathname, state } = useLocation();
  return (
    <p>
      at {pathname} from {state?.from?.pathname ?? 'nowhere'}
    </p>
  );
};

const renderRoutes = (
  current: CurrentUser | undefined,
  route: string | { pathname: string; state: unknown },
  isResolving = false
) =>
  render(
    <AuthContext.Provider value={withUser(current, isResolving)}>
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

  it('waits for the session check instead of redirecting', () => {
    renderRoutes(undefined, ROUTES.PROTECTED, true);

    expect(screen.queryByText('Sign in page')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument();
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

  it('sends a user who just signed in back to the page they came from', () => {
    renderRoutes(user, { pathname: ROUTES.SIGN_IN, state: { from: { pathname: '/somewhere' } } });

    expect(screen.getByText('at /somewhere from nowhere')).toBeInTheDocument();
  });
});
