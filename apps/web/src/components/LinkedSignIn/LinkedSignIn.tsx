import { useState } from 'react';
import { CombinedGraphQLErrors } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { ErrorCode } from '@generated/codegen/enums';
import { type SignInProviderName } from '@generated/codegen/graphql';
import {
  IconAlertCircle,
  IconBrandFacebook,
  IconBrandGoogle,
  IconFlask,
  type Icon,
} from '@tabler/icons-react';
import { useSearchParams } from 'react-router';
import { Alert, Button, Divider, Stack, Text, type ButtonProps } from '@mantine/core';
import { START_LINKED_SIGN_IN } from '@/graphql/mutations/linkedSignIn';
import { LINKED_SIGN_IN_PROVIDERS } from '@/graphql/queries/linkedSignIn';

/** How each provider shows in the UI: a new provider adds one entry here. */
export const providerDetails: Record<SignInProviderName, { label: string; icon: Icon }> = {
  GOOGLE: { label: 'Google', icon: IconBrandGoogle },
  FACEBOOK: { label: 'Facebook', icon: IconBrandFacebook },
  DEV: { label: 'Dev test user', icon: IconFlask },
};

const errorMessages: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.LINKED_SIGN_IN_FAILED]:
    'Signing in with the provider did not complete. Please try again.',
  [ErrorCode.EMAIL_TAKEN_SIGN_IN_TO_LINK]:
    'An account with this email already exists. Sign in with your password, then connect the provider from your account page.',
  [ErrorCode.LINKED_SIGN_IN_TAKEN]:
    'That provider account is already linked to another TravelBliss user.',
  [ErrorCode.LAST_SIGN_IN_METHOD]: 'Set a password before disconnecting your only way to sign in.',
};

export const linkedSignInErrorMessage = (code: unknown) =>
  errorMessages[code as ErrorCode] ?? 'Something went wrong. Please try again.';

/** The ErrorCode of a failed mutation, for linkedSignInErrorMessage. */
export const errorCodeOf = (error: unknown) =>
  CombinedGraphQLErrors.is(error) ? error.errors[0]?.extensions?.code : undefined;

/** The reason a provider redirect failed, sent back by the API as `?error=<ErrorCode>`. Dismissing it clears it. */
export const LinkedSignInAlert = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get('error');
  if (!code) {
    return null;
  }
  return (
    <Alert
      color="red"
      variant="light"
      icon={<IconAlertCircle />}
      title="Could not use that sign-in"
      withCloseButton
      closeButtonLabel="Dismiss"
      onClose={() =>
        setSearchParams((params) => {
          params.delete('error');
          return params;
        })
      }
    >
      {linkedSignInErrorMessage(code)}
    </Alert>
  );
};

/** Starts a provider flow and sends the browser to the provider. Signed in, the API connects instead of signing in. */
export const useStartLinkedSignIn = () => {
  const [startLinkedSignIn, { error }] = useMutation(START_LINKED_SIGN_IN);
  // Stays set while the browser leaves for the provider, so the button keeps spinning until the page unloads
  const [pending, setPending] = useState<SignInProviderName>();

  const start = async (provider: SignInProviderName) => {
    setPending(provider);
    try {
      const { data } = await startLinkedSignIn({ variables: { provider } });
      window.location.assign(data!.startLinkedSignIn);
    } catch {
      setPending(undefined); // shown through `error`
    }
  };

  return { start, pending, error };
};

type ProviderButtonProps = {
  provider: SignInProviderName;
  onClick: () => void;
  children: string;
} & Pick<ButtonProps, 'loading' | 'disabled' | 'fullWidth' | 'variant'>;

export const ProviderButton = ({ provider, children, ...props }: ProviderButtonProps) => {
  const { icon: ProviderIcon } = providerDetails[provider];
  return (
    <Button variant="default" fw="normal" leftSection={<ProviderIcon size={18} />} {...props}>
      {children}
    </Button>
  );
};

/** One "Continue with …" button per provider the API offers; nothing when it offers none. */
export const LinkedSignInButtons = () => {
  const { data } = useQuery(LINKED_SIGN_IN_PROVIDERS);
  const { start, pending, error } = useStartLinkedSignIn();
  const providers = data?.linkedSignInProviders ?? [];
  if (!providers.length) {
    return null;
  }

  return (
    <Stack gap="xs">
      <Divider label="or" labelPosition="center" />
      {providers.map((provider) => (
        <ProviderButton
          key={provider}
          provider={provider}
          fullWidth
          loading={pending === provider}
          disabled={!!pending && pending !== provider}
          onClick={() => start(provider)}
        >
          {`Continue with ${providerDetails[provider].label}`}
        </ProviderButton>
      ))}
      {error && (
        <Text c="red" size="sm" role="alert">
          {linkedSignInErrorMessage(errorCodeOf(error))}
        </Text>
      )}
    </Stack>
  );
};
