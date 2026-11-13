import { type RegisterMutationVariables } from '@generated/codegen/graphql';
import { render, screen, userEvent } from '@test-utils';
import { REGISTER } from '@/graphql/mutations/register';
import RegisterPage from './Register.page';

const fillTextFields = async () => {
  await userEvent.type(screen.getByLabelText(/full name/i), 'Test User');
  await userEvent.type(screen.getByLabelText(/username/i), 'tester');
  await userEvent.type(screen.getByLabelText(/phone number/i), '0912345678');
  await userEvent.type(screen.getByLabelText(/email/i), 'tester@example.com');
  await userEvent.type(screen.getByLabelText(/^password/i, { selector: 'input' }), 'secret1234');
  await userEvent.type(
    screen.getByLabelText(/confirm password/i, { selector: 'input' }),
    'secret1234'
  );
};

describe('Register page', () => {
  it('asks for a birthday instead of failing on its type', async () => {
    render(<RegisterPage />, { route: '/register' });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Please pick your birthday')).toBeInTheDocument();
  });

  it('picks the birthday year first and sends it as a UTC timestamp of that day', async () => {
    let input: RegisterMutationVariables['input'] | undefined;
    render(<RegisterPage />, {
      route: '/register',
      mocks: [
        {
          request: {
            query: REGISTER,
            variables: (variables: RegisterMutationVariables) => {
              input = variables.input;
              return true;
            },
          },
          result: {
            data: {
              register: {
                __typename: 'User',
                id: 'u1',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                firstName: 'Test',
                lastName: 'User',
                age: 26,
                email: 'tester@example.com',
                phoneNumber: '0912345678',
                username: 'tester',
              },
            },
          },
        },
      ],
    });

    await fillTextFields();
    await userEvent.click(screen.getByRole('button', { name: /birthday/i }));
    // Opens on the year grid
    await userEvent.click(await screen.findByRole('button', { name: '2000' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mar' }));
    await userEvent.click(await screen.findByRole('button', { name: /^12 March 2000$/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await vi.waitFor(() => expect(input?.birthday).toBe('2000-03-12T00:00:00.000Z'));
    expect(input).not.toHaveProperty('confirmPassword');
  });
});
