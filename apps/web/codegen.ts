import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  // Written by `pnpm --filter @travelbliss/api schema`; override with another path or URL if needed
  schema: process.env.GRAPHQL_SCHEMA ?? '../api/schema.graphql',
  documents: 'src/graphql/**/*.tsx',
  ignoreNoDocuments: true,
  generates: {
    // Every schema enum, including ErrorCode: the client preset only emits enums that operations use
    'generated/codegen/enums.ts': {
      plugins: ['typescript'],
      config: { onlyEnums: true, namingConvention: { enumValues: 'keep' } },
      hooks: {
        afterOneFileWrite: ['prettier --write'],
      },
    },
    'generated/codegen/': {
      preset: 'client',
      plugins: [],
      config: {
        useTypeImports: true,
      },
      hooks: {
        afterOneFileWrite: ['prettier --write'],
      },
    },
  },
};

export default config;
