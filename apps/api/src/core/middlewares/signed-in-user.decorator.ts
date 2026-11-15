import { AuthenticationError, createParamDecorator } from 'type-graphql';
import { type Context } from '@/types';

/**
 * The signed-in user of this request (GLOSSARY), as loaded by SessionService.authenticate. A guest gets
 * UNAUTHENTICATED, as from `@Authorized()`, so a resolver never sees a missing user.
 */
export const SignedInUser = () =>
  createParamDecorator<Context>(({ context: { auth } }) => {
    if (!auth) {
      throw new AuthenticationError();
    }
    return auth.user;
  });
