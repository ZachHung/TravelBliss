import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'http://localhost:5000/graphql',
  documents: 'src/graphql/**/*.tsx',
  generates: {
    'src/graphql/codegen/': {
      preset: 'client',
      plugins: [],
    },
  },
};

export default config;
