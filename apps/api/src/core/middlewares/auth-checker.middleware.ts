import { type ResolverData } from 'type-graphql';
import { type Context } from '@/types';

/** Reads the user SessionService.authenticate loaded for this request: no database access here. */
export const authChecker = ({ context: { auth } }: ResolverData<Context>, roles: string[]) =>
  !!auth && (roles.length === 0 || roles.includes(auth.user.role));
