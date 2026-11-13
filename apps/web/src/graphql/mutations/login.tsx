import { graphql } from '@generated/codegen';

export const LOGIN = graphql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`);
