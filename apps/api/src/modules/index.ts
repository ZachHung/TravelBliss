import { linkedSignInModule } from './linked-sign-in';
import { sessionModule } from './session';
import { userModule } from './user';

/** Every API module: the container, the GraphQL schema and the Express routes are all built from this list. */
export const modules = [userModule, sessionModule, linkedSignInModule];
