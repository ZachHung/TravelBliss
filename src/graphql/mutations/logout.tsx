import { graphql } from '../codegen';

export const LOGOUT = graphql(`
  mutation LogOut {
    logout
  }
`);
