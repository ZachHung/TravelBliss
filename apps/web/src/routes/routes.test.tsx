import { render, screen } from '@test-utils';
import { GraphQLError } from 'graphql';
import { Route, Routes, useLocation } from 'react-router';
import { ROUTES } from '@/constants';
import { GET_ME } from '@/graphql/queries/me';
import { SessionProvider } from '@/session';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

// The real session, fed by Apollo mocks: the guards are tested through the same seam the app uses
const signedIn = {
  request: { query: GET_ME },
  result: {
    data: {
      me: {
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
      },
    },
  },
};
const guest = {
  request: { query: GET_ME },
  result: { errors: [new GraphQLError('Unauthenticated')] },
};

const LocationState = () => {
  const { pathname, state } = useLocation();
  return (
    <p>
      at {pathname} from {state?.from?.pathname ?? 'nowhere'}
    </p>
  );
};

const renderRoutes = (
  session: typeof signedIn | typeof guest,
  route: string | { pathname: string; state: unknown }
) =>
  render(
    <SessionProvider>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path={ROUTES.SIGN_IN} element={<p>Sign in page</p>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.PROTECTED} element={<p>Secret page</p>} />
        </Route>
        <Route path="*" element={<LocationState />} />
      </Routes>
    </SessionProvider>,
    { route, mocks: [session] }
  );

describe('ProtectedRoute', () => {
  it('renders the nested route for a signed-in user', async () => {
    renderRoutes(signedIn, ROUTES.PROTECTED);

    expect(await screen.findByText('Secret page')).toBeInTheDocument();
  });

  it('redirects guests to the sign in page', async () => {
    renderRoutes(guest, ROUTES.PROTECTED);

    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  it('renders the nested route for guests', async () => {
    renderRoutes(guest, ROUTES.SIGN_IN);

    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
  });

  it('redirects signed-in users to the home page', async () => {
    renderRoutes(signedIn, ROUTES.SIGN_IN);

    expect(await screen.findByText('at / from nowhere')).toBeInTheDocument();
  });

  it('sends a user who just signed in back to the page they came from', async () => {
    renderRoutes(signedIn, {
      pathname: ROUTES.SIGN_IN,
      state: { from: { pathname: '/somewhere' } },
    });

    expect(await screen.findByText('at /somewhere from nowhere')).toBeInTheDocument();
  });
});
