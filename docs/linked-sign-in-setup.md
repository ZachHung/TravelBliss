# Linked sign-in setup (local)

How to make "Continue with Google / Facebook" work on your machine. Why it works this way:
[ADR 0005](adr/0005-linked-sign-in.md).

Neither provider has a sandbox. Both have a test mode on a real app registration that works from `localhost` with no
review: only the accounts you list can sign in. Keep the apps in that mode; you never need to publish them.

## No registration: the Dev provider

`pnpm dev:local` runs with `NODE_ENV=local` (and `pnpm e2e` with `NODE_ENV=e2e`), which offers a **Continue with Dev
test user** button. It opens a form
on the API where you choose the provider user id, name and email, then follows the same callback as a real provider.
Use it to try:

- a new user: any new id
- a returning user: the same id again
- an email clash: the email of a user who registered with a password (expect the "sign in with your password" error)
- a provider that shares no email: leave the email empty
- connecting: sign in with a password first, then Connect on the account page

## Google

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create a project (e.g. `travelbliss-local`).
2. **Google Auth Platform → Branding**: set the app name and your email as the support and developer contact.
3. **Audience**: keep the publishing status at **Testing**, then under **Test users** add each Google account
   that should be able to sign in.
4. **Data access**: add the scopes `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
5. **Clients → Create client**: type **Web application**. Under **Authorized redirect URIs** add exactly
   `http://localhost:8000/auth/google/callback` (your `API_PUBLIC_URL`, or `http://localhost:<API_PORT>`).
6. Copy the client id and secret into `.env.local`:

   ```sh
   API_GOOGLE_CLIENT_ID=<client id>
   API_GOOGLE_CLIENT_SECRET=<client secret>
   ```

## Facebook

1. Open [Meta for Developers](https://developers.facebook.com/apps/) and **Create app**, with the use case
   **Authenticate and request data from users with Facebook Login**.
2. The app starts in **Development** mode: keep it there. Only people with a role on the app can sign in. You have
   one as its admin; add others under **App roles → Roles** as testers.
3. **Use cases → Authenticate… → Customize**: make sure the `email` permission is added (`public_profile` is
   there by default).
4. **Facebook Login → Settings**: under **Valid OAuth Redirect URIs** add exactly
   `http://localhost:8000/auth/facebook/callback`. Meta allows `http://localhost` while the app is in Development
   mode.
5. **App settings → Basic**: copy the App ID and App secret into `.env.local`:

   ```sh
   API_FACEBOOK_APP_ID=<app id>
   API_FACEBOOK_APP_SECRET=<app secret>
   ```

## Check it

Restart `pnpm dev:local`. The sign-in page shows one button per provider whose two values are set. A provider error
page that mentions `redirect_uri` means the URL registered in step 5 differs from `API_PUBLIC_URL`'s callback, port
included.

If Google shows "400. The server cannot process the request because it is malformed" after you pick an account, the
request was fine (a bad client id or redirect URI fails earlier, with a named error) but the browser's Google
session is not. Try a private window. If that works, a browser extension is rewriting Google's URLs: ClearURLs
strips parameters Google's consent step needs. Disable it for `accounts.google.com`, or use an extension that leaves
Google's sign-in alone.
