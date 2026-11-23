import { spawn, type ChildProcess } from 'node:child_process';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * `pnpm dev` (`vite build --watch`): restart the API once each rebuild is fully written. One process, so
 * stopping the watcher stops the server; the old server exits before the new one binds its port.
 */
const runApiAfterBuild = (): Plugin => {
  let server: ChildProcess | undefined;
  const stop = async () => {
    if (!server || server.exitCode !== null) {
      return;
    }
    const exited = new Promise((done) => server!.once('exit', done));
    server.kill('SIGTERM');
    await exited;
  };
  // A signal kills Vite without running 'exit' handlers, which would orphan the server (`pnpm dev:stop`, turbo)
  const stopWithVite = () => {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => void stop().finally(() => process.exit(0)));
    }
  };
  return {
    name: 'run-api-after-build',
    apply: 'build',
    async closeBundle() {
      if (!this.meta.watchMode) {
        return;
      }
      if (!server) {
        stopWithVite();
      }
      await stop();
      server = spawn(process.execPath, ['--enable-source-maps', 'dist/index.js'], {
        stdio: 'inherit',
      });
    },
  };
};

// One entry per source file, so dist/ mirrors src/: TypeORM finds migrations by a __dirname glob.
// shortcut: read once when Vite starts, so `pnpm dev` picks up a new file only after a restart; fine for now.
const entries = Object.fromEntries(
  globSync('src/**/*.ts')
    .filter((file) => !file.endsWith('.test.ts'))
    .map((file) => [file.slice('src/'.length, -'.ts'.length), resolve(file)])
);

export default defineConfig({
  // @/ imports are resolved at build time, so dist/ keeps plain relative requires
  resolve: { tsconfigPaths: true },
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
    runApiAfterBuild(),
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
    setupFiles: './vitest.setup.ts',
    coverage: {
      enabled: true,
      reportsDirectory: './generated/test/coverage',
      include: ['src/**', '!src/migration/**'],
      provider: 'v8',
      // Today's numbers: raise them as tests are added, never lower them
      thresholds: {
        lines: 69,
        branches: 76,
        functions: 61,
        statements: 70,
      },
    },
    exclude: ['dist/**', 'node_modules/**'],
  },
});
