import { graphql } from '@generated/codegen';

export const START_LINKED_SIGN_IN = graphql(`
  mutation StartLinkedSignIn($provider: SignInProviderName!) {
    startLinkedSignIn(provider: $provider)
  }
`);

// Returns the user with the same fields as SIGN_IN_METHODS, so Apollo's cache updates the list in place
export const DISCONNECT_LINKED_SIGN_IN = graphql(`
  mutation DisconnectLinkedSignIn($id: String!) {
    disconnectLinkedSignIn(id: $id) {
      id
      hasPassword
      linkedSignIns {
        id
        provider
      }
    }
  }
`);

export const SET_PASSWORD = graphql(`
  mutation SetPassword($input: SetPasswordInput!) {
    setPassword(input: $input) {
      id
      hasPassword
    }
  }
`);
