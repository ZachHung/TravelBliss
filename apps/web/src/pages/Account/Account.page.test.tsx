import { render, screen } from '@test-utils';
import { LINKED_SIGN_IN_PROVIDERS, SIGN_IN_METHODS } from '@/graphql/queries/linkedSignIn';
import AccountPage from './Account.page';

const mocks = (me: { hasPassword: boolean; linkedSignIns: { id: string; provider: string }[] }) => [
  {
    request: { query: SIGN_IN_METHODS },
    result: {
      data: {
        me: {
          __typename: 'User',
          id: 'u1',
          ...me,
          linkedSignIns: me.linkedSignIns.map((link) => ({ __typename: 'LinkedSignIn', ...link })),
        },
      },
    },
  },
  {
    request: { query: LINKED_SIGN_IN_PROVIDERS },
    result: { data: { linkedSignInProviders: ['GOOGLE', 'FACEBOOK'] } },
  },
];

describe('Account page', () => {
  it('keeps the only way to sign in, and offers to set a password', async () => {
    render(<AccountPage />, {
      route: '/account',
      mocks: mocks({ hasPassword: false, linkedSignIns: [{ id: 'l1', provider: 'GOOGLE' }] }),
    });

    expect(await screen.findByRole('button', { name: 'Disconnect Google' })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Connect Facebook' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Set a password' })).toBeInTheDocument();
  });

  it('lets a user with a password disconnect, and hides the set-password form', async () => {
    render(<AccountPage />, {
      route: '/account',
      mocks: mocks({ hasPassword: true, linkedSignIns: [{ id: 'l1', provider: 'GOOGLE' }] }),
    });

    expect(await screen.findByRole('button', { name: 'Disconnect Google' })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Set a password' })).not.toBeInTheDocument();
  });
});
