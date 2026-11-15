import { type RequestHandler } from 'express';
import { LinkedSignInFailedException } from '@/modules/linked-sign-in/linked-sign-in.exception';
import { apiPublicUrl } from '@/utils/helpers';
import { SignInProviderName, type ProviderProfile, type SignInProvider } from './sign-in-provider';

/**
 * A fake provider for a local machine (NODE_ENV=local, see providers/index.ts): its "consent page" is a form on this
 * API, and the code it hands back is the chosen profile itself. Lets every linking rule be tried without registering
 * an app with Google or Facebook.
 */
export const dev = (): SignInProvider => ({
  name: SignInProviderName.DEV,
  authorizationUrl: (state) => {
    const url = new URL(`${apiPublicUrl()}/auth/dev/authorize`);
    url.searchParams.set('state', state);
    return url;
  },
  fetchProfile: async (code) => {
    const profile = JSON.parse(
      Buffer.from(code, 'base64url').toString()
    ) as Partial<ProviderProfile>;
    if (typeof profile.providerUserId !== 'string' || typeof profile.fullName !== 'string') {
      throw new LinkedSignInFailedException();
    }
    return {
      providerUserId: profile.providerUserId,
      email: profile.email || null,
      fullName: profile.fullName,
    };
  },
});

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** The dev provider's consent page: pick who to be, then go to the callback as a real provider would. */
export const devAuthorizePage: RequestHandler = (req, res) => {
  const { state, providerUserId, email, fullName } = req.query;
  if (typeof state !== 'string') {
    res.status(400).send('Missing state');
    return;
  }
  if (typeof providerUserId === 'string') {
    const profile = { providerUserId, email, fullName: fullName || email || 'Dev user' };
    const code = Buffer.from(JSON.stringify(profile)).toString('base64url');
    res.redirect(`/auth/dev/callback?${new URLSearchParams({ state, code })}`);
    return;
  }
  res.send(`<!doctype html>
<meta charset="utf-8"><title>Dev sign-in</title>
<form style="font-family:sans-serif;display:grid;gap:8px;max-width:320px;margin:48px auto">
  <h1>Dev sign-in</h1>
  <p>Signing in again with the same id is a returning user. Use the email of an existing user to try a clash.</p>
  <input type="hidden" name="state" value="${escapeHtml(state)}">
  <label>Provider user id <input name="providerUserId" value="dev-user-1" required></label>
  <label>Full name <input name="fullName" value="Dev User"></label>
  <label>Email (empty: provider shares none) <input name="email" type="email"></label>
  <button>Continue</button>
</form>`);
};
