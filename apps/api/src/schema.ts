import { buildSchema } from 'type-graphql';
import { resolvers } from './resolvers';

// Writes schema.graphql without Postgres or Redis, so web codegen can run in CI.
// authChecker only runs per request, so a stub is enough to emit the schema.
void buildSchema({ resolvers, emitSchemaFile: true, authChecker: () => true });
