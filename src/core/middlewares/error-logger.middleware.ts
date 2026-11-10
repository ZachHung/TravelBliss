import { GraphQLError } from 'graphql';
import { MiddlewareFn, MiddlewareInterface, NextFn, ResolverData } from 'type-graphql';

import logger from '../../config/logger';
import { Context } from '../../types';
import { Injectable } from '../../types/inversify';

@Injectable()
export class ErrorLoggerMiddleware implements MiddlewareInterface<Context> {
  public use: MiddlewareFn<Context> = async (
    { context, info }: ResolverData<Context>,
    next: NextFn,
  ) => {
    try {
      return await next();
    } catch (err) {
      if (err instanceof GraphQLError)
        logger.error(
          JSON.stringify({
            message: err.message,
            operation: info.operation.operation,
            fieldName: info.fieldName,
            userId: context.auth?.userId,
            stack: err.stack,
            locations: err.locations,
          }),
        );
      throw err;
    }
  };
}
