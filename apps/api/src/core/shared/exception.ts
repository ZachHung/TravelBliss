import { GraphQLError } from 'graphql';

import { BaseEntity } from './entity';

export class BaseException<TEntity extends BaseEntity> extends GraphQLError {
  constructor(message?: string, code?: string, where?: keyof TEntity) {
    const extensions: Record<string, unknown> = { code: code || 'SOMETHING_WENT_WRONG' };
    if (where) extensions.where = where;
    super(message || 'Something went wrong', {
      extensions,
    });
  }
}
