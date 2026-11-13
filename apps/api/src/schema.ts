import { buildSchema, emitSchemaDefinitionFileSync } from 'type-graphql';
import { withErrorCodes } from './core/shared/error-code';
import { resolvers } from './resolvers';

// Writes schema.graphql without Postgres or Redis, so web codegen can run in CI.
// authChecker only runs per request, so a stub is enough to emit the schema.
void buildSchema({ resolvers, authChecker: () => true }).then((schema) =>
  emitSchemaDefinitionFileSync('schema.graphql', withErrorCodes(schema))
);
