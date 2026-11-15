import { graphql } from '@generated/codegen';

export const LINKED_SIGN_IN_PROVIDERS = graphql(`
  query LinkedSignInProviders {
    linkedSignInProviders
  }
`);

export const SIGN_IN_METHODS = graphql(`
  query SignInMethods {
    me {
      id
      hasPassword
      linkedSignIns {
        id
        provider
      }
    }
  }
`);
