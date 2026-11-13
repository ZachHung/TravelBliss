import { buildSchema, GraphQLEnumType, printSchema } from 'graphql';
import { ErrorCode, withErrorCodes } from './error-code';

describe('withErrorCodes', () => {
  it('adds every ErrorCode to the schema and keeps the existing types', () => {
    const schema = withErrorCodes(buildSchema('type Query { ok: String }'));

    expect(printSchema(schema)).toContain('type Query');
    const errorCode = schema.getType('ErrorCode');
    expect(errorCode).toBeInstanceOf(GraphQLEnumType);
    expect((errorCode as GraphQLEnumType).getValues().map((v) => v.value)).toEqual(
      Object.values(ErrorCode)
    );
  });
});
