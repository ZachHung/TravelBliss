import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/** The e2e stack's own Postgres + Redis: a separate compose project (from .env.e2e), so dev's data is never touched. */
export const compose = 'docker compose --env-file .env.e2e -f apps/api/infra/docker-compose.yml';

/** Removes the containers and their volumes, so the next run starts from an empty database. */
export const down = `${compose} down -v --remove-orphans`;

/** globalTeardown, run from the repo root wherever Playwright was started. */
export default function teardown() {
  execSync(down, { cwd: resolve(import.meta.dirname, '../../..'), stdio: 'inherit' });
}
