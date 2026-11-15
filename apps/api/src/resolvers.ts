import { LinkedSignInResolver } from './modules/linked-sign-in/linked-sign-in.resolver';
import { UserResolver } from './modules/user/user.resolver';

export const resolvers = [UserResolver, LinkedSignInResolver] as const;
