import { useMutation, useQuery } from '@apollo/client/react';
import { ErrorCode } from '@generated/codegen/enums';
import { type SignInMethodsQuery, type SignInProviderName } from '@generated/codegen/graphql';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { z } from 'zod';
import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Form, { type FormError } from '@/components/Form/Form';
import {
  errorCodeOf,
  LinkedSignInAlert,
  linkedSignInErrorMessage,
  ProviderButton,
  providerDetails,
  useStartLinkedSignIn,
} from '@/components/LinkedSignIn/LinkedSignIn';
import { DISCONNECT_LINKED_SIGN_IN, SET_PASSWORD } from '@/graphql/mutations/linkedSignIn';
import { LINKED_SIGN_IN_PROVIDERS, SIGN_IN_METHODS } from '@/graphql/queries/linkedSignIn';
import createValidationSchema from '@/validations';

type Me = SignInMethodsQuery['me'];

const SignInMethods = ({ me }: { me: Me }) => {
  const offered = useQuery(LINKED_SIGN_IN_PROVIDERS).data?.linkedSignInProviders ?? [];
  const { start, pending, error: startError } = useStartLinkedSignIn();
  const [disconnect, { loading: disconnecting, error: disconnectError }] =
    useMutation(DISCONNECT_LINKED_SIGN_IN);
  // A provider no longer offered still shows while linked, so it can be disconnected
  const providers = [
    ...new Set<SignInProviderName>([...offered, ...me.linkedSignIns.map((link) => link.provider)]),
  ];
  const isOnlyWayIn = !me.hasPassword && me.linkedSignIns.length === 1;
  const error = startError ?? disconnectError;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack>
        <div>
          <Title order={2} size="h4">
            Sign-in methods
          </Title>
          <Text c="dimmed" size="sm">
            Connect a provider to sign in with it instead of your password.
          </Text>
        </div>

        {providers.map((provider) => {
          const link = me.linkedSignIns.find((linked) => linked.provider === provider);
          const { label } = providerDetails[provider];
          return (
            <Group key={provider} justify="space-between" wrap="nowrap">
              <Group gap="xs">
                <Text>{label}</Text>
                {link && (
                  <Badge variant="light" color="green">
                    Connected
                  </Badge>
                )}
              </Group>
              {link ? (
                <Button
                  variant="subtle"
                  color="red"
                  fw="normal"
                  loading={disconnecting}
                  disabled={isOnlyWayIn}
                  title={isOnlyWayIn ? 'Set a password first' : undefined}
                  // A failure shows through disconnectError
                  onClick={() => disconnect({ variables: { id: link.id } }).catch(() => {})}
                  aria-label={`Disconnect ${label}`}
                >
                  Disconnect
                </Button>
              ) : (
                <ProviderButton
                  provider={provider}
                  loading={pending === provider}
                  disabled={!offered.includes(provider) || (!!pending && pending !== provider)}
                  onClick={() => start(provider)}
                >
                  {`Connect ${label}`}
                </ProviderButton>
              )}
            </Group>
          );
        })}

        {isOnlyWayIn && (
          <Text c="dimmed" size="sm">
            This is your only way to sign in. Set a password below before disconnecting it.
          </Text>
        )}
        {error && (
          <Text c="red" size="sm" role="alert">
            {linkedSignInErrorMessage(errorCodeOf(error))}
          </Text>
        )}
      </Stack>
    </Paper>
  );
};

const initialValues = { password: '', confirmPassword: '' };

const validationSchema = createValidationSchema<typeof initialValues>({
  password: z.string().min(8, 'Password should have at least 8 characters'),
  confirmPassword: z.string().min(1, 'This field is required'),
}).refine((data) => data.confirmPassword === data.password, {
  message: 'Password did not match',
  path: ['confirmPassword'],
});

const formErrors: FormError<typeof initialValues> = {
  [ErrorCode.PASSWORD_ALREADY_SET]: [
    { fieldName: 'password', message: 'You already have a password' },
  ],
};

/** For users who joined through a provider; once set, it is changed like any password. */
const SetPasswordForm = () => {
  const [setPassword, { loading }] = useMutation(SET_PASSWORD);

  return (
    <Paper withBorder p="md" radius="md">
      <Title order={2} size="h4">
        Set a password
      </Title>
      <Text c="dimmed" size="sm">
        Sign in with your username, email or phone number as well as your providers.
      </Text>
      <Form
        onSubmit={async ({ password }) => {
          await setPassword({ variables: { input: { password } } });
        }}
        initialValues={initialValues}
        validate={zod4Resolver(validationSchema)}
        formErrors={formErrors}
        loading={loading}
        submitLabel="Set password"
        submitFullWidth
        w="100%"
      >
        {(form) => (
          <>
            <PasswordInput
              withAsterisk
              label="New password"
              key={form.key('password')}
              {...form.getInputProps('password')}
            />
            <PasswordInput
              withAsterisk
              label="Confirm password"
              key={form.key('confirmPassword')}
              {...form.getInputProps('confirmPassword')}
            />
          </>
        )}
      </Form>
    </Paper>
  );
};

const AccountPage = () => {
  const me = useQuery(SIGN_IN_METHODS).data?.me;

  return (
    <Container size="xs" py="xl">
      <Stack>
        <Title order={1} size="h2">
          Account
        </Title>
        <LinkedSignInAlert />
        {me && <SignInMethods me={me} />}
        {me && !me.hasPassword && <SetPasswordForm />}
      </Stack>
    </Container>
  );
};

export default AccountPage;
