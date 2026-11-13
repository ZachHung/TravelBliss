import { render, screen, userEvent } from '@test-utils';
import { GraphQLError } from 'graphql';
import { LOGIN } from '@/graphql/mutations/login';
import { GET_ME } from '@/graphql/queries/me';
import { SessionProvider } from '@/session';
import SignInPage from './SignIn.page';

const getMeUnauthenticated = {
  request: { query: GET_ME },
  result: { errors: [new GraphQLError('Unauthenticated')] },
};

const renderPage = (mocks: NonNullable<Parameters<typeof render>[1]>['mocks']) =>
  render(
    <SessionProvider>
      <SignInPage />
    </SessionProvider>,
    { route: '/sign-in', mocks }
  );

describe('SignIn page', () => {
  it('asks for the required fields', async () => {
    renderPage([getMeUnauthenticated]);

    await userEvent.click(await screen.findByRole('button', { name: 'Sign In' }));

    expect(await screen.findAllByText('This field is required')).toHaveLength(2);
  });

  it('shows the server error next to the password field', async () => {
    renderPage([
      getMeUnauthenticated,
      {
        request: { query: LOGIN, variables: () => true },
        result: {
          errors: [new GraphQLError('Wrong password', { extensions: { code: 'WRONG_PASSWORD' } })],
        },
      },
    ]);

    await userEvent.type(await screen.findByLabelText(/phone number/i), '0123456789');
    await userEvent.type(
      screen.getByLabelText(/^password/i, { selector: 'input' }),
      'wrong-password'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Wrong password')).toBeInTheDocument();
  });
});
