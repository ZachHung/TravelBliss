import { graphql } from '@generated/codegen';

export const REFRESH_TOKEN = graphql(`
  mutation RefreshToken {
    refreshToken {
      accessToken
    }
  }
`);
