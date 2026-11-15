import { Facebook } from 'arctic';
import { LinkedSignInFailedException } from '@/modules/linked-sign-in/linked-sign-in.exception';
import { callbackUrl, SignInProviderName, type SignInProvider } from './sign-in-provider';

type FacebookMe = { id: string; name: string; email?: string };

export const facebook = (appId: string, appSecret: string): SignInProvider => {
  const client = new Facebook(appId, appSecret, callbackUrl(SignInProviderName.FACEBOOK));
  return {
    name: SignInProviderName.FACEBOOK,
    authorizationUrl: (state) => client.createAuthorizationURL(state, ['email', 'public_profile']),
    fetchProfile: async (code) => {
      const tokens = await client.validateAuthorizationCode(code);
      const response = await fetch('https://graph.facebook.com/me?fields=id,name,email', {
        headers: { authorization: `Bearer ${tokens.accessToken()}` },
      });
      if (!response.ok) {
        throw new LinkedSignInFailedException();
      }
      // No email for accounts registered by phone, or when the user declines to share it
      const { id, name, email } = (await response.json()) as FacebookMe;
      return { providerUserId: id, email: email ?? null, fullName: name };
    },
  };
};
