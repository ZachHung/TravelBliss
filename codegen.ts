import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://raw.githubusercontent.com/ZachHung/TravelBliss-API/main/schema.graphql',
  documents: 'src/graphql/**/*.tsx',
  ignoreNoDocuments: true,
  generates: {
    'generated/codegen/': {
      preset: 'client',
      plugins: [],
      hooks: {
        afterOneFileWrite: ['prettier --write'],
      },
    },
  },
};

export default config;
