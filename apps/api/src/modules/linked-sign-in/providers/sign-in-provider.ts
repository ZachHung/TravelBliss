import { registerEnumType } from 'type-graphql';
import { apiPublicUrl } from '@/utils/helpers';

export enum SignInProviderName {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  /** A fake provider for local development, see dev.ts */
  DEV = 'DEV',
}
registerEnumType(SignInProviderName, { name: 'SignInProviderName' });

/** Who the provider says signed in. */
export interface ProviderProfile {
  /** The provider's stable id for this person: the only thing a linked sign-in is matched on. */
  providerUserId: string;
  email: string | null;
  fullName: string;
}

/**
 * One outside provider. Adding a provider is one file implementing this, one entry in providers/index.ts and a
 * SignInProviderName value; the linking rules live in LinkedSignInService and never change for it.
 */
export interface SignInProvider {
  name: SignInProviderName;
  /** The provider's consent page. Providers without PKCE ignore the verifier; state still binds the flow. */
  authorizationUrl: (state: string, codeVerifier: string) => URL;
  /** Exchanges the code from the callback. Rejects with arctic's errors or LinkedSignInFailedException. */
  fetchProfile: (code: string, codeVerifier: string) => Promise<ProviderProfile>;
}

/** The URL a provider sends the browser back to; register exactly this with the provider. */
export const callbackUrl = (name: SignInProviderName): string =>
  `${apiPublicUrl()}/auth/${name.toLowerCase()}/callback`;
