import { AuthenticationError, type ResolverData } from 'type-graphql';
import { type Context } from '@/types';

/**
 * Reads the user SessionService.authenticate loaded for this request: no database access here.
 * A guest always gets UNAUTHENTICATED, even on a role-gated field: left to type-graphql it would be UNAUTHORIZED
 * there (it picks the error by whether roles are listed), and the web app only refreshes on UNAUTHENTICATED, so a
 * signed-in admin with an expired token was told "not allowed" instead of being refreshed.
 */
export const authChecker = ({ context: { auth } }: ResolverData<Context>, roles: string[]) => {
  if (!auth) {
    throw new AuthenticationError();
  }
  return roles.length === 0 || roles.includes(auth.user.role);
};
