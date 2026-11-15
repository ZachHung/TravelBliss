import { render, screen, userEvent } from '@test-utils';
import { waitFor } from '@testing-library/react';
import { SET_PASSWORD } from '@/graphql/mutations/linkedSignIn';
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

  it('hides the set-password form and allows disconnecting once the password is set', async () => {
    const password = 'x'.repeat(10);
    render(<AccountPage />, {
      route: '/account',
      mocks: [
        ...mocks({ hasPassword: false, linkedSignIns: [{ id: 'l1', provider: 'GOOGLE' }] }),
        {
          request: { query: SET_PASSWORD, variables: { input: { password } } },
          result: { data: { setPassword: { __typename: 'User', id: 'u1', hasPassword: true } } },
        },
      ],
    });

    await userEvent.type(await screen.findByLabelText(/new password/i), password);
    await userEvent.type(screen.getByLabelText(/confirm password/i), password);
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Set a password' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Disconnect Google' })).toBeEnabled();
  });
});
