import { graphql } from '@generated/codegen';

export const GET_ME = graphql(`
  query GetMe {
    me {
      id
      username
      phoneNumber
      lastName
      firstName
      email
      age
      birthday
      fullName
    }
  }
`);
