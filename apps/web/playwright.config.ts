import { defineConfig, devices } from '@playwright/test';

// End-to-end against the real stack: `pnpm dev:local` starts docker Postgres + Redis, migrations, the API and Vite
export default defineConfig({
  testDir: 'e2e',
  // *.e2e.ts, so vitest's *.test / *.spec globs never pick these up
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev:local',
    cwd: '../..',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
