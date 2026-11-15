import { buildSchema, emitSchemaDefinitionFileSync } from 'type-graphql';
import { resolversOf } from './core/module';
import { withErrorCodes } from './core/shared/error-code';
import { modules } from './modules';

// Writes schema.graphql without Postgres or Redis, so web codegen can run in CI.
// authChecker only runs per request, so a stub is enough to emit the schema.
void buildSchema({ resolvers: resolversOf(modules), authChecker: () => true }).then((schema) =>
  emitSchemaDefinitionFileSync('schema.graphql', withErrorCodes(schema))
);
