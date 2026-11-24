import { CombinedGraphQLErrors } from '@apollo/client';
import { ErrorCode } from '@generated/codegen/enums';
import { render, screen, userEvent } from '@test-utils';
import { TextInput } from '@mantine/core';
import Form, { type FormError } from './Form';

const initialValues = { first: '', second: '' };

const formErrors: FormError<typeof initialValues> = {
  [ErrorCode.USER_EXISTED]: [
    { fieldName: 'first', message: 'First is taken' },
    { fieldName: 'second', message: 'Second is taken' },
  ],
};

const renderFailingForm = (extensions: Record<string, unknown>) =>
  render(
    <Form
      initialValues={initialValues}
      formErrors={formErrors}
      onSubmit={() =>
        Promise.reject(new CombinedGraphQLErrors({ errors: [{ message: 'taken', extensions }] }))
      }
    >
      {(form) => (
        <>
          <TextInput label="First" key={form.key('first')} {...form.getInputProps('first')} />
          <TextInput label="Second" key={form.key('second')} {...form.getInputProps('second')} />
        </>
      )}
    </Form>
  );

describe('Form', () => {
  it('shows only the message for the field the error names, on that field', async () => {
    // The first entry, not the last: writing every message to `where` would leave the last one there
    renderFailingForm({ code: ErrorCode.USER_EXISTED, where: 'first' });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('First is taken')).toBeInTheDocument();
    expect(screen.getByLabelText('First')).toHaveAccessibleDescription('First is taken');
    expect(screen.getByLabelText('Second')).not.toHaveAccessibleDescription();
    expect(screen.queryByText('Second is taken')).not.toBeInTheDocument();
  });

  it('shows every message for the code, each on its own field, when the error names no field', async () => {
    renderFailingForm({ code: ErrorCode.USER_EXISTED });

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('First is taken')).toBeInTheDocument();
    expect(screen.getByLabelText('First')).toHaveAccessibleDescription('First is taken');
    expect(screen.getByLabelText('Second')).toHaveAccessibleDescription('Second is taken');
  });
});
