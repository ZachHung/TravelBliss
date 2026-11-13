import { GraphQLError } from 'graphql';
import { type BaseEntity } from './entity';
import { ErrorCode } from './error-code';

export class BaseException<TEntity extends BaseEntity> extends GraphQLError {
  constructor(message?: string, code?: ErrorCode, where?: keyof TEntity) {
    const extensions: Record<string, unknown> = { code: code ?? ErrorCode.SOMETHING_WENT_WRONG };
    if (where) {
      extensions.where = where;
    }
    super(message || 'Something went wrong', {
      extensions,
    });
  }
}
