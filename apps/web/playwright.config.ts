import { defineConfig, devices } from '@playwright/test';
import { compose, down } from './e2e/stack';

// End-to-end against a throwaway stack of its own (.env.e2e: other ports, other containers), so it runs beside
// `pnpm dev:local`. The web servers start in order, then the tests; e2e/stack.ts removes the containers afterwards.
export default defineConfig({
  testDir: 'e2e',
  // *.e2e.ts, so vitest's *.test / *.spec globs never pick these up
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalTeardown: './e2e/stack.ts',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // A failed start never reaches globalTeardown, so a failing step takes the stack down itself; `down` first
      // also clears one a killed run left behind
      command: `{ ${[
        'pnpm turbo run codegen --output-logs=errors-only',
        down,
        `${compose} up -d --wait db cache`,
        // migration:up builds dist; run that build, not the restarting `dev` watcher
        'NODE_ENV=e2e pnpm --filter @travelbliss/api migration:up',
        'NODE_ENV=e2e pnpm --filter @travelbliss/api start',
      ].join(' && ')}; } || { ${down}; exit 1; }`,
      cwd: '../..',
      // Apollo answers a bare GET with 400, which Playwright counts as up
      url: 'http://localhost:8001/',
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      command: 'pnpm exec vite --mode e2e --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
