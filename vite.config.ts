import { globSync } from 'node:fs';
import { resolve } from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// One entry per source file, so dist/ mirrors src/: TypeORM finds migrations by a __dirname glob.
const entries = Object.fromEntries(
  globSync('src/**/*.ts')
    .filter((file) => !file.endsWith('.test.ts'))
    .map((file) => [file.slice('src/'.length, -'.ts'.length), resolve(file)]),
);

export default defineConfig({
  // esbuild cannot emit decorator metadata, which type-graphql, TypeORM and inversify read.
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          useDefineForClassFields: false,
        },
      },
    }),
  ],
  build: {
    ssr: true,
    target: 'node22',
    sourcemap: 'inline',
    rollupOptions: {
      input: entries,
      output: {
        format: 'cjs',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
  },
});
