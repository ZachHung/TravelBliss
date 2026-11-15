import { decodeIdToken, Google } from 'arctic';
import { callbackUrl, SignInProviderName, type SignInProvider } from './sign-in-provider';

type GoogleClaims = { sub: string; email?: string; name?: string };

export const google = (clientId: string, clientSecret: string): SignInProvider => {
  const client = new Google(clientId, clientSecret, callbackUrl(SignInProviderName.GOOGLE));
  return {
    name: SignInProviderName.GOOGLE,
    authorizationUrl: (state, codeVerifier) =>
      client.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']),
    fetchProfile: async (code, codeVerifier) => {
      const tokens = await client.validateAuthorizationCode(code, codeVerifier);
      // Received straight from Google's token endpoint over TLS, so the signature needs no check (OIDC Core 3.1.3.7)
      const { sub, email, name } = decodeIdToken(tokens.idToken()) as GoogleClaims;
      return {
        providerUserId: sub,
        email: email ?? null,
        fullName: name ?? email ?? 'Google user',
      };
    },
  };
};
