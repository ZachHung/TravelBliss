import { render, screen, userEvent } from '@test-utils';
import { LINKED_SIGN_IN_PROVIDERS } from '@/graphql/queries/linkedSignIn';
import { LinkedSignInAlert, LinkedSignInButtons } from './LinkedSignIn';

const offering = (linkedSignInProviders: string[]) => ({
  request: { query: LINKED_SIGN_IN_PROVIDERS },
  result: { data: { linkedSignInProviders } },
});

describe('LinkedSignInButtons', () => {
  it('shows one button per provider the API offers', async () => {
    render(<LinkedSignInButtons />, { mocks: [offering(['GOOGLE', 'FACEBOOK'])] });

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeInTheDocument();
  });
});

describe('LinkedSignInAlert', () => {
  it('explains the error the API redirected back with, until dismissed', async () => {
    render(<LinkedSignInAlert />, { route: '/sign-in?error=EMAIL_TAKEN_SIGN_IN_TO_LINK' });

    expect(screen.getByText(/an account with this email already exists/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falls back to a generic message for an unknown code', () => {
    render(<LinkedSignInAlert />, { route: '/sign-in?error=made-up' });

    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});
