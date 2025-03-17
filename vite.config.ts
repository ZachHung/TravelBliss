/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // /esm/icons/index.mjs only exports the icons statically, so no separate chunks are created
      // fix https://github.com/tabler/tabler-icons/issues/1233
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  test: {
    reporters: ['default', 'html'],
    outputFile: 'generated/test/index.html',
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      all: true,
      enabled: true,
      reportsDirectory: './generated/test/coverage',
      include: ['src/**', '!src/main.tsx', '!src/**/*.story.tsx'],
      provider: 'v8',
      thresholds: {
        lines: 36.47,
        branches: 47.05,
        functions: 39.39,
        statements: 36.47,
        autoUpdate: true,
      },
    },
  },
});
