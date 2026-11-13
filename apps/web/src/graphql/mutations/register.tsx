import { graphql } from '@generated/codegen';

export const REGISTER = graphql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      id
      createdAt
      updatedAt
      firstName
      lastName
      age
      email
      phoneNumber
      username
    }
  }
`);
