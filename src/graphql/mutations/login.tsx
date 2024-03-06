import { graphql } from '../codegen';

export const LOGIN = graphql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      refreshToken
      accessToken
    }
  }
`);
