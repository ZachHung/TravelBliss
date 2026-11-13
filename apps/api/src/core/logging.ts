import { randomUUID } from 'crypto';
import { type ApolloServerPlugin } from '@apollo/server';
import { unwrapResolverError } from '@apollo/server/errors';
import { type RequestHandler } from 'express';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import logger from '@/config/logger';
import { type Context } from '@/types';

export const CORRELATION_HEADER = 'x-correlation-id';

// The incoming id ends up in log lines, so only short, plain ids are trusted
const SAFE_ID = /^[\w-]{1,64}$/;

/** Reuses a safe incoming x-correlation-id or makes one, and echoes it on the response. */
export const assignCorrelationId: RequestHandler = (req, res, next) => {
  const incoming = req.get(CORRELATION_HEADER);
  res.locals.correlationId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(CORRELATION_HEADER, res.locals.correlationId);
  next();
};

/** Expected errors are thrown on purpose (BaseException, auth, validation); anything else is a bug. */
const isUnexpected = (error: unknown) => !(unwrapResolverError(error) instanceof GraphQLError);

const levelFor = (errorCount: number, unexpectedCount: number, isIntrospection: boolean) => {
  if (unexpectedCount) {
    return 'error';
  }
  if (errorCount) {
    return 'warn';
  }
  return isIntrospection ? 'debug' : 'info';
};

const describe = (error: unknown) => {
  const original = unwrapResolverError(error);
  return original instanceof Error
    ? { message: original.message, stack: original.stack }
    : { message: String(original) };
};

/** In production, unexpected errors reach clients without their internal message. */
export const formatError =
  (isProduction: boolean) =>
  (formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError =>
    isProduction && isUnexpected(error)
      ? { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }
      : formatted;

/**
 * One log line per operation: info when it succeeds, warn for expected errors, error (with stack)
 * for unexpected ones. Introspection (Sandbox polls it) logs at debug. Variables are never logged:
 * they carry passwords and tokens.
 */
export const loggingPlugin: ApolloServerPlugin<Context> = {
  async requestDidStart() {
    const startedAt = Date.now();

    return {
      // operationName is resolved from the document, so it is set even when the client omits it
      async willSendResponse({ contextValue, errors = [], response, operationName }) {
        const correlationId: string | undefined = contextValue.res?.locals.correlationId;
        const unexpected = errors.filter(isUnexpected);
        const level = levelFor(
          errors.length,
          unexpected.length,
          operationName === 'IntrospectionQuery'
        );

        logger.log(level, operationName ?? 'anonymous operation', {
          correlationId,
          durationMs: Date.now() - startedAt,
          userId: contextValue.auth?.user.id,
          outcome: errors.length
            ? errors.map((e) =>
                isUnexpected(e) ? 'INTERNAL_SERVER_ERROR' : (e.extensions?.code ?? 'UNKNOWN')
              )
            : 'ok',
          ...(unexpected.length && { errors: unexpected.map(describe) }),
        });

        // Lets a user report the id from an error, and you find its log line
        if (response.body.kind === 'single' && response.body.singleResult.errors) {
          response.body.singleResult.errors = response.body.singleResult.errors.map((e) => ({
            ...e,
            extensions: { ...e.extensions, correlationId },
          }));
        }
      },
    };
  },
};
