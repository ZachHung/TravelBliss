import { GraphQLEnumType, GraphQLSchema } from 'graphql';

/**
 * Every code a client may see in `errors[].extensions.code`. The web app maps these to form fields, so they are
 * part of the schema contract (see withErrorCodes), not just strings.
 */
export enum ErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_EXISTED = 'USER_EXISTED',
  WRONG_PASSWORD = 'WRONG_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_COOKIES = 'INVALID_COOKIES',
  SOMETHING_WENT_WRONG = 'SOMETHING_WENT_WRONG',
  // Sent by type-graphql and Apollo Server, listed so clients can rely on them too
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  BAD_USER_INPUT = 'BAD_USER_INPUT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

const errorCodeType = new GraphQLEnumType({
  name: 'ErrorCode',
  description: 'Values of errors[].extensions.code',
  values: Object.fromEntries(Object.values(ErrorCode).map((code) => [code, { value: code }])),
});

/** type-graphql only prints enums a field references; no field returns an error code, so add it here. */
export const withErrorCodes = (schema: GraphQLSchema): GraphQLSchema => {
  const config = schema.toConfig();
  return new GraphQLSchema({ ...config, types: [...config.types, errorCodeType] });
};
