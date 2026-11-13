/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // One env file set for the whole repo; only VITE_* reaches the browser.
  envDir: '../..',
  resolve: {
    tsconfigPaths: true,
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
      enabled: true,
      reportsDirectory: './generated/test/coverage',
      include: ['src/**', '!src/main.tsx', '!src/**/*.story.tsx'],
      provider: 'v8',
      thresholds: {
        lines: 78,
        branches: 63,
        functions: 71,
        statements: 76,
      },
    },
  },
});
