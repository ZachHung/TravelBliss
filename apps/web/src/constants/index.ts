export const ROUTES = {
  ROOT: '/',
  SIGN_IN: '/sign-in',
  REGISTER: '/register',
  PROTECTED: '/protected',
  // The API's linked sign-in callback redirects here too (apps/api linked-sign-in.routes.ts)
  ACCOUNT: '/account',
} as const;
